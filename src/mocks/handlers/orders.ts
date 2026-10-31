import { http, HttpResponse } from 'msw';
import { z } from 'zod';
import { networkSchema } from '../../shared/api/schemas';
import { isValidCpf } from '../../shared/validation/cpf';
import { parseEth, toDecimalString } from '../../shared/money/decimal';
import { orderView, paymentDelay, scheduleResolution, settleOrders } from '../domain/orders';
import { buildQuote, QUOTE_TTL_MS, quoteView, sameQuote, storeQuote } from '../domain/quote';
import { publish } from '../domain/events';
import { applyScenario, getConfig } from '../scenarios/engine';
import { getDb, mutate, type CartRecord, type OrderRecord, type UserRecord } from '../store';
import { fieldErrors } from './auth';
import { apiError, authenticate, newId, readJson } from './util';

const collectorSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome completo.'),
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
  document: z.string().trim().refine(isValidCpf, 'Informe um CPF válido.'),
});

const quoteInput = z.object({ network: networkSchema, walletId: z.string().min(1, 'Selecione uma carteira.') });
const orderInput = z.object({
  quoteId: z.string().min(1),
  walletId: z.string().min(1, 'Selecione uma carteira.'),
  network: networkSchema,
  collector: collectorSchema,
});

const userCart = (userId: string): CartRecord | undefined => Object.values(getDb().carts).find((c) => c.ownerKey === `user:${userId}`);

function checkWallet(user: UserRecord, walletId: string): Response | null {
  const wallet = (getDb().wallets[user.id] ?? []).find((w) => w.id === walletId);
  if (!wallet) return apiError(422, 'VALIDATION_ERROR', 'Selecione uma carteira válida.', { fields: { wallet: 'Selecione uma carteira válida.' } });
  if (!wallet.connected) return apiError(422, 'VALIDATION_ERROR', 'Conecte a carteira para continuar.', { fields: { wallet: 'Conecte a carteira para continuar.' } });
  return null;
}

const conflictResponse = (items: unknown) => apiError(409, 'AVAILABILITY_CONFLICT', 'Alguns itens não estão mais disponíveis na quantidade escolhida.', { details: { items } });

export const orderHandlers = [
  http.post('*/api/quotes', async ({ request }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    const auth = authenticate(request);
    if ('response' in auth) return auth.response;
    const parsed = quoteInput.safeParse(await readJson(request));
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Corrija os campos destacados.', { fields: fieldErrors(parsed.error) });
    const cart = userCart(auth.user.id);
    if (!cart || cart.items.length === 0) return apiError(422, 'VALIDATION_ERROR', 'Seu carrinho está vazio.');
    const walletProblem = checkWallet(auth.user, parsed.data.walletId);
    if (walletProblem) return walletProblem;
    const built = buildQuote(cart, parsed.data.network, parsed.data.walletId);
    if ('conflict' in built) return conflictResponse(built.conflict);
    return HttpResponse.json(quoteView(storeQuote(auth.user.id, cart, built.quote)), { status: 201 });
  }),

  http.post('*/api/orders', async ({ request }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    const auth = authenticate(request);
    if ('response' in auth) return auth.response;
    const key = request.headers.get('idempotency-key');
    if (!key) return apiError(422, 'VALIDATION_ERROR', 'Cabeçalho Idempotency-Key obrigatório.');
    const body = await readJson(request);
    const parsed = orderInput.safeParse(body);
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Corrija os campos destacados.', { fields: fieldErrors(parsed.error) });
    const { quoteId, walletId, network, collector } = parsed.data;
    const fingerprint = JSON.stringify([quoteId, walletId, network, collector]);

    // idempotência: mesma chave + mesmo conteúdo recupera o mesmo pedido; conteúdo diferente é conflito
    const prior = getDb().idempotency[`${auth.user.id}:${key}`];
    if (prior) {
      if (prior.fingerprint !== fingerprint) return apiError(409, 'IDEMPOTENCY_CONFLICT', 'Esta chave de idempotência já foi usada com outro conteúdo.');
      settleOrders();
      return HttpResponse.json(orderView(getDb().orders[prior.orderId]!), { status: 200 });
    }

    const cfg = getConfig();
    const cart = userCart(auth.user.id);
    if (!cart || cart.items.length === 0) return apiError(422, 'VALIDATION_ERROR', 'Seu carrinho está vazio.');

    // cenários: o catálogo muda durante a compra (uma única vez)
    if (cfg.priceChangeOnOrder) {
      cfg.priceChangeOnOrder = false;
      mutate((db) => {
        const item = cart.items[0]!;
        const nft = db.nfts.find((n) => n.id === item.nftId)!;
        const e = nft.editions.find((x) => x.id === item.editionId)!;
        e.priceEth = toDecimalString(parseEth(e.priceEth) + parseEth('0.01'));
        nft.priceFromEth = toDecimalString(nft.editions.map((x) => parseEth(x.priceEth)).reduce((a, b) => (a < b ? a : b)));
        nft.version += 1;
      });
      publish({ kind: 'nft', nftId: cart.items[0]!.nftId });
    }
    if (cfg.soldOutOnOrder) {
      cfg.soldOutOnOrder = false;
      mutate((db) => {
        const item = cart.items[0]!;
        const nft = db.nfts.find((n) => n.id === item.nftId)!;
        nft.editions.find((x) => x.id === item.editionId)!.available = 0;
        nft.availableTotal = nft.editions.reduce((a, x) => a + x.available, 0);
        nft.version += 1;
      });
      publish({ kind: 'nft', nftId: cart.items[0]!.nftId });
    }

    const stored = getDb().quotes[quoteId];
    if (!stored || stored.userId !== auth.user.id) return apiError(422, 'VALIDATION_ERROR', 'Cotação inválida. Revise o pedido.', { fields: { quote: 'Cotação inválida.' } });
    const walletProblem = checkWallet(auth.user, walletId);
    if (walletProblem) return walletProblem;

    const built = buildQuote(cart, network, walletId);
    if ('conflict' in built) return conflictResponse(built.conflict);
    const expired = new Date(stored.expiresAt).getTime() < Date.now();
    if (expired || !sameQuote(stored, { ...built.quote })) {
      const fresh = storeQuote(auth.user.id, cart, built.quote);
      return apiError(409, 'QUOTE_STALE', expired ? 'A cotação expirou. Revise os valores.' : 'Os valores mudaram desde a sua revisão.', { details: { quote: quoteView(fresh) } });
    }

    const wallet = (getDb().wallets[auth.user.id] ?? []).find((w) => w.id === walletId)!;
    const now = new Date().toISOString();
    const id = newId('ord');
    const record: OrderRecord = {
      id, status: 'pending', version: 1, createdAt: now, updatedAt: now, quoteId, network, walletId, collector, declineReason: null,
      receipt: { lines: stored.lines, summary: stored.summary, network, couponCode: stored.couponCode, walletAddress: wallet.address, snapshotAt: now, txHash: null, confirmedAt: null },
      userId: auth.user.id, resolveAt: new Date(Date.now() + paymentDelay()).toISOString(), outcome: cfg.payment, idempotencyKey: key,
    };
    mutate((db) => {
      db.orders[id] = record;
      db.idempotency[`${auth.user.id}:${key}`] = { userId: auth.user.id, fingerprint, orderId: id };
      delete db.quotes[quoteId];
    });
    scheduleResolution(getDb().orders[id]!);
    publish({ kind: 'order', orderId: id, userId: auth.user.id });

    if (cfg.orderTimeout) {
      // o pedido já existe; a resposta demora mais que o timeout do cliente (recuperação por idempotência)
      cfg.orderTimeout = false;
      await new Promise((r) => setTimeout(r, cfg.orderTimeoutDelayMs));
    }
    return HttpResponse.json(orderView(getDb().orders[id]!), { status: 201 });
  }),

  http.get('*/api/orders/:id', async ({ request, params }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    const auth = authenticate(request);
    if ('response' in auth) return auth.response;
    settleOrders();
    const order = getDb().orders[String(params['id'])];
    if (!order || order.userId !== auth.user.id) return apiError(404, 'NOT_FOUND', 'Pedido não encontrado.');
    return HttpResponse.json(orderView(order));
  }),
];

export { QUOTE_TTL_MS };
