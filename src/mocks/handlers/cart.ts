import { http, HttpResponse } from 'msw';
import { z } from 'zod';
import { networkSchema } from '../../shared/api/schemas';
import { cartView, findCoupon, MAX_PER_LINE } from '../domain/cart';
import { applyScenario } from '../scenarios/engine';
import { getDb, mutate, type CartRecord } from '../store';
import { fieldErrors } from './auth';
import { apiError, bearerToken, newId, readJson } from './util';

type Resolved = { cart: CartRecord; ownerKey: string } | { response: Response };

/** Carrinho do usuário autenticado ou, na falta de token, do visitante identificado por X-Cart-Id. */
function resolveCart(request: Request, create = true): Resolved {
  const token = bearerToken(request);
  const db = getDb();
  let ownerKey: string;
  if (token) {
    const s = db.sessions[token];
    if (!s) return { response: apiError(401, 'UNAUTHENTICATED', 'Sessão inválida.') };
    if (s.expired || new Date(s.expiresAt).getTime() < Date.now()) return { response: apiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente.') };
    ownerKey = `user:${s.userId}`;
  } else {
    const cartId = request.headers.get('x-cart-id');
    if (!cartId) return { response: apiError(400, 'VALIDATION_ERROR', 'Identificador do carrinho ausente.') };
    ownerKey = `guest:${cartId}`;
  }
  const existing = Object.values(db.carts).find((c) => c.ownerKey === ownerKey);
  if (existing) return { cart: existing, ownerKey };
  if (!create) return { response: apiError(404, 'NOT_FOUND', 'Carrinho não encontrado.') };
  const created: CartRecord = { id: newId('cart'), ownerKey, items: [], couponCode: null, network: 'ethereum', version: 1 };
  mutate((d) => { d.carts[created.id] = created; });
  return { cart: getDb().carts[created.id]!, ownerKey };
}

const bump = (c: CartRecord) => { c.version += 1; };

function limitFor(nftId: string, editionId: string): { limit: number } | { error: Response } {
  const nft = getDb().nfts.find((n) => n.id === nftId);
  const edition = nft?.editions.find((e) => e.id === editionId);
  if (!nft || !edition) return { error: apiError(404, 'NOT_FOUND', 'NFT ou edição não encontrada.') };
  return { limit: Math.min(edition.available, MAX_PER_LINE) };
}

const addSchema = z.object({ nftId: z.string().min(1), editionId: z.string().min(1), quantity: z.number().int().min(1, 'A quantidade mínima é 1.') });
const qtySchema = z.object({ quantity: z.number().int().min(1, 'A quantidade mínima é 1.') });

export const cartHandlers = [
  http.get('*/api/cart', async ({ request }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    const r = resolveCart(request);
    if ('response' in r) return r.response;
    return HttpResponse.json(cartView(r.cart));
  }),

  http.post('*/api/cart/items', async ({ request }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    const r = resolveCart(request);
    if ('response' in r) return r.response;
    const parsed = addSchema.safeParse(await readJson(request));
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Dados inválidos.', { fields: fieldErrors(parsed.error) });
    const { nftId, editionId, quantity } = parsed.data;
    const lim = limitFor(nftId, editionId);
    if ('error' in lim) return lim.error;
    const current = r.cart.items.find((i) => i.nftId === nftId && i.editionId === editionId)?.quantity ?? 0;
    if (current + quantity > lim.limit) {
      return apiError(409, 'AVAILABILITY_CONFLICT', lim.limit === 0 ? 'Esta edição está esgotada.' : `Você pode ter no máximo ${lim.limit} unidades desta edição no carrinho.`, { details: { limit: lim.limit, inCart: current } });
    }
    mutate((d) => {
      const cart = d.carts[r.cart.id]!;
      const line = cart.items.find((i) => i.nftId === nftId && i.editionId === editionId);
      if (line) line.quantity += quantity;
      else cart.items.push({ id: newId('item'), nftId, editionId, quantity });
      bump(cart);
    });
    return HttpResponse.json(cartView(getDb().carts[r.cart.id]!), { status: 201 });
  }),

  http.patch('*/api/cart/items/:itemId', async ({ request, params }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    const r = resolveCart(request);
    if ('response' in r) return r.response;
    const item = r.cart.items.find((i) => i.id === params['itemId']);
    if (!item) return apiError(404, 'NOT_FOUND', 'Item não encontrado no carrinho.');
    const parsed = qtySchema.safeParse(await readJson(request));
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Dados inválidos.', { fields: fieldErrors(parsed.error) });
    const lim = limitFor(item.nftId, item.editionId);
    if ('error' in lim) return lim.error;
    if (parsed.data.quantity > lim.limit) {
      return apiError(409, 'AVAILABILITY_CONFLICT', lim.limit === 0 ? 'Esta edição está esgotada.' : `Disponível: ${lim.limit} unidade(s) por pedido.`, { details: { limit: lim.limit } });
    }
    mutate((d) => {
      const cart = d.carts[r.cart.id]!;
      cart.items.find((i) => i.id === item.id)!.quantity = parsed.data.quantity;
      bump(cart);
    });
    return HttpResponse.json(cartView(getDb().carts[r.cart.id]!));
  }),

  http.delete('*/api/cart/items/:itemId', async ({ request, params }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    const r = resolveCart(request);
    if ('response' in r) return r.response;
    mutate((d) => {
      const cart = d.carts[r.cart.id]!;
      cart.items = cart.items.filter((i) => i.id !== params['itemId']);
      if (cart.items.length === 0) cart.couponCode = null;
      bump(cart);
    });
    return HttpResponse.json(cartView(getDb().carts[r.cart.id]!));
  }),

  http.put('*/api/cart/coupon', async ({ request }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    const r = resolveCart(request);
    if ('response' in r) return r.response;
    const code = String((await readJson(request))['code'] ?? '').trim().toUpperCase();
    if (!code) return apiError(422, 'VALIDATION_ERROR', 'Informe um cupom.', { fields: { coupon: 'Informe o código do cupom.' } });
    const found = findCoupon(code);
    if (!found) return apiError(422, 'VALIDATION_ERROR', 'Cupom inválido.', { fields: { coupon: 'Cupom inválido.' } });
    if (found.expired) return apiError(422, 'VALIDATION_ERROR', 'Cupom expirado.', { fields: { coupon: 'Este cupom expirou.' } });
    mutate((d) => { const c = d.carts[r.cart.id]!; c.couponCode = found.coupon.code; bump(c); });
    return HttpResponse.json(cartView(getDb().carts[r.cart.id]!));
  }),

  http.delete('*/api/cart/coupon', async ({ request }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    const r = resolveCart(request);
    if ('response' in r) return r.response;
    mutate((d) => { const c = d.carts[r.cart.id]!; c.couponCode = null; bump(c); });
    return HttpResponse.json(cartView(getDb().carts[r.cart.id]!));
  }),

  http.put('*/api/cart/network', async ({ request }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    const r = resolveCart(request);
    if ('response' in r) return r.response;
    const parsed = z.object({ network: networkSchema }).safeParse(await readJson(request));
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Rede inválida.', { fields: { network: 'Selecione uma rede válida.' } });
    mutate((d) => { const c = d.carts[r.cart.id]!; c.network = parsed.data.network; bump(c); });
    return HttpResponse.json(cartView(getDb().carts[r.cart.id]!));
  }),

  /** Mescla o carrinho de visitante no do usuário autenticado (somas limitadas ao estoque). */
  http.post('*/api/cart/merge', async ({ request }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    if (!bearerToken(request)) return apiError(401, 'UNAUTHENTICATED', 'Faça login para continuar.');
    const r = resolveCart(request);
    if ('response' in r) return r.response;
    const guestId = String((await readJson(request))['guestCartId'] ?? '');
    const guest = Object.values(getDb().carts).find((c) => c.ownerKey === `guest:${guestId}`);
    if (guest && guest.id !== r.cart.id) {
      mutate((d) => {
        const user = d.carts[r.cart.id]!;
        for (const g of guest.items) {
          const lim = limitFor(g.nftId, g.editionId);
          if ('error' in lim) continue;
          const line = user.items.find((i) => i.nftId === g.nftId && i.editionId === g.editionId);
          const total = Math.min((line?.quantity ?? 0) + g.quantity, lim.limit);
          if (total < 1) continue;
          if (line) line.quantity = total;
          else user.items.push({ id: newId('item'), nftId: g.nftId, editionId: g.editionId, quantity: total });
        }
        if (!user.couponCode && guest.couponCode) user.couponCode = guest.couponCode;
        bump(user);
        delete d.carts[guest.id];
      });
    }
    return HttpResponse.json(cartView(getDb().carts[r.cart.id]!));
  }),
];
