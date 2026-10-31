import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../shared/api/client';
import type { ApiError } from '../../shared/api/errors';
import { clearOrderTimers } from '../domain/orders';
import { mockControl } from '../control';
import { server } from '../server';
import { auth, loginAs, resetMocks } from '../test-utils';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => { server.resetHandlers(); clearOrderTimers(); vi.useRealTimers(); });
afterAll(() => server.close());
beforeEach(resetMocks);

const fail = async (p: Promise<unknown>): Promise<ApiError> => (await p.catch((e: unknown) => e)) as ApiError;
const collector = { name: 'Ana Souza', email: 'ana@onyx.test', document: '529.982.247-25' };

async function setup(email = 'ana@onyx.test', walletIdx = 0) {
  const token = await loginAs(email);
  const a = auth(token);
  const nft = (await api.get('/nfts/nft-001')).data;
  const edition = nft.editions[0];
  await api.post('/cart/items', { nftId: nft.id, editionId: edition.id, quantity: 2 }, a);
  const wallets = (await api.get('/wallets', a)).data.items;
  const wallet = wallets[walletIdx];
  await api.post(`/wallets/${wallet.id}/connect`, null, a);
  return { a, token, nft, edition, wallet };
}
const quote = async (a: ReturnType<typeof auth>, walletId: string, network = 'ethereum') => (await api.post('/quotes', { network, walletId }, a)).data;
const place = (a: ReturnType<typeof auth>, key: string, body: object) => api.post('/orders', body, { headers: { ...a.headers, 'Idempotency-Key': key } });

describe('carteiras', () => {
  it('valida endereço, evita duplicidade de papel e endereço', async () => {
    const a = auth(await loginAs('bruno@onyx.test'));
    const bad = await fail(api.post('/wallets', { label: 'X', address: '0x123', role: 'secondary', network: 'base' }, a));
    expect(Object.keys(bad.fields ?? {}).sort()).toEqual(['address', 'label']);
    const addr = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';
    expect((await api.post('/wallets', { label: 'Secundária', address: addr, role: 'secondary', network: 'polygon' }, a)).status).toBe(201);
    expect((await fail(api.post('/wallets', { label: 'Outra', address: addr, role: 'primary', network: 'base' }, a))).fields?.['role']).toBeDefined();
    const dup = await fail(api.post('/wallets', { label: 'Terceira', address: addr.toLowerCase(), role: 'secondary', network: 'base' }, a));
    expect(dup.status).toBe(409);
  });
  it('conecta, recusa (cenário) e desconecta; troca de endereço desconecta', async () => {
    const a = auth(await loginAs('ana@onyx.test'));
    const [w] = (await api.get('/wallets', a)).data.items;
    expect((await api.post(`/wallets/${w.id}/connect`, null, a)).data.connected).toBe(true);
    const patched = (await api.patch(`/wallets/${w.id}`, { label: 'Nova', address: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30', network: 'base' }, a)).data;
    expect(patched.connected).toBe(false);
    mockControl.setScenario({ walletRefused: true, latency: 0 });
    expect((await fail(api.post(`/wallets/${w.id}/connect`, null, a))).status).toBe(403);
    mockControl.setScenario({ walletRefused: false, latency: 0 });
    await api.post(`/wallets/${w.id}/connect`, null, a);
    expect((await api.post(`/wallets/${w.id}/disconnect`, null, a)).data.connected).toBe(false);
  });
  it('carteiras de outro usuário são invisíveis', async () => {
    const ana = auth(await loginAs('ana@onyx.test'));
    const bruno = auth(await loginAs('bruno@onyx.test'));
    const [w] = (await api.get('/wallets', ana)).data.items;
    expect((await fail(api.patch(`/wallets/${w.id}`, { label: 'Hack', address: w.address, network: 'base' }, bruno))).status).toBe(404);
  });
});

describe('cotação', () => {
  it('exige carteira conectada e devolve linhas e totais da API', async () => {
    const s = await setup();
    await api.post(`/wallets/${s.wallet.id}/disconnect`, null, s.a);
    expect((await fail(api.post('/quotes', { network: 'ethereum', walletId: s.wallet.id }, s.a))).fields?.['wallet']).toBeDefined();
    await api.post(`/wallets/${s.wallet.id}/connect`, null, s.a);
    const q = await quote(s.a, s.wallet.id, 'polygon');
    expect(q.lines).toHaveLength(1);
    expect(Number(q.summary.networkFeeEth)).toBe(0.0004);
  });
  it('detecta indisponibilidade', async () => {
    const s = await setup();
    mockControl.getState().nfts.find((n) => n.id === 'nft-001')!.editions[0]!.available = 1;
    expect((await fail(api.post('/quotes', { network: 'ethereum', walletId: s.wallet.id }, s.a))).code).toBe('AVAILABILITY_CONFLICT');
  });
});

describe('pedidos', () => {
  it('cria pendente, confirma, baixa estoque e remove só o comprado do carrinho', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] });
    const s = await setup();
    const q = await quote(s.a, s.wallet.id);
    const before = s.edition.available;
    const res = await place(s.a, 'k1', { quoteId: q.quoteId, walletId: s.wallet.id, network: 'ethereum', collector });
    expect(res.status).toBe(201);
    expect(res.data.status).toBe('pending');
    expect(res.data.receipt.txHash).toBeNull();
    // enquanto pendente, o usuário adiciona mais uma unidade e outro NFT
    await api.post('/cart/items', { nftId: 'nft-001', editionId: s.edition.id, quantity: 1 }, s.a);
    await api.post('/cart/items', { nftId: 'nft-002', editionId: (await api.get('/nfts/nft-002')).data.editions[0].id, quantity: 1 }, s.a);
    await vi.advanceTimersByTimeAsync(2000);
    const done = (await api.get(`/orders/${res.data.id}`, s.a)).data;
    expect(done.status).toBe('confirmed');
    expect(done.receipt.txHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect((await api.get('/nfts/nft-001')).data.editions[0].available).toBe(before - 2);
    const cart = (await api.get('/cart', s.a)).data;
    expect(cart.items).toHaveLength(2);
    expect(cart.items.find((i: { nftId: string }) => i.nftId === 'nft-001').quantity).toBe(1);
    expect(cart.items.find((i: { nftId: string }) => i.nftId === 'nft-002').quantity).toBe(1);
  });
  it('mesma chave devolve o mesmo pedido; conteúdo diferente gera conflito', async () => {
    const s = await setup();
    const q = await quote(s.a, s.wallet.id);
    const body = { quoteId: q.quoteId, walletId: s.wallet.id, network: 'ethereum', collector };
    const first = await place(s.a, 'dup', body);
    const second = await place(s.a, 'dup', body);
    expect(second.status).toBe(200);
    expect(second.data.id).toBe(first.data.id);
    expect(Object.keys(mockControl.getState().orders)).toHaveLength(1);
    const err = await fail(place(s.a, 'dup', { ...body, network: 'base' }));
    expect(err.code).toBe('IDEMPOTENCY_CONFLICT');
  });
  it('valida o colecionador (CPF) com erros por campo', async () => {
    const s = await setup();
    const q = await quote(s.a, s.wallet.id);
    const err = await fail(place(s.a, 'v1', { quoteId: q.quoteId, walletId: s.wallet.id, network: 'ethereum', collector: { name: 'A', email: 'x', document: '111.111.111-11' } }));
    expect(err.status).toBe(422);
    expect(Object.keys(err.fields ?? {}).sort()).toEqual(['collector']);
  });
  it('preço alterado após a revisão devolve QUOTE_STALE com nova cotação e nada é criado', async () => {
    const s = await setup();
    const q = await quote(s.a, s.wallet.id);
    mockControl.setScenario({ priceChangeOnOrder: true, latency: 0 });
    const err = await fail(place(s.a, 'p1', { quoteId: q.quoteId, walletId: s.wallet.id, network: 'ethereum', collector }));
    expect(err.status).toBe(409);
    expect(err.code).toBe('QUOTE_STALE');
    const fresh = (err.details as { quote: { quoteId: string; summary: { totalEth: string } } }).quote;
    expect(fresh.quoteId).not.toBe(q.quoteId);
    expect(Number(fresh.summary.totalEth)).toBeGreaterThan(Number(q.summary.totalEth));
    expect(Object.keys(mockControl.getState().orders)).toHaveLength(0);
    const ok = await place(s.a, 'p2', { quoteId: fresh.quoteId, walletId: s.wallet.id, network: 'ethereum', collector });
    expect(ok.status).toBe(201);
  });
  it('edição esgotada durante a compra devolve conflito de disponibilidade', async () => {
    const s = await setup();
    const q = await quote(s.a, s.wallet.id);
    mockControl.setScenario({ soldOutOnOrder: true, latency: 0 });
    const err = await fail(place(s.a, 's1', { quoteId: q.quoteId, walletId: s.wallet.id, network: 'ethereum', collector }));
    expect(err.code).toBe('AVAILABILITY_CONFLICT');
    expect((await api.get('/cart', s.a)).data.items).toHaveLength(1);
  });
  it('pagamento recusado mantém o carrinho e estoque', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] });
    const s = await setup();
    mockControl.setScenario({ payment: 'declined', latency: 0 });
    const q = await quote(s.a, s.wallet.id);
    const res = await place(s.a, 'd1', { quoteId: q.quoteId, walletId: s.wallet.id, network: 'ethereum', collector });
    await vi.advanceTimersByTimeAsync(2000);
    const order = (await api.get(`/orders/${res.data.id}`, s.a)).data;
    expect(order.status).toBe('declined');
    expect(order.declineReason).toBeTruthy();
    expect(order.receipt.txHash).toBeNull();
    expect((await api.get('/cart', s.a)).data.items[0].quantity).toBe(2);
    expect((await api.get('/nfts/nft-001')).data.editions[0].available).toBe(s.edition.available);
  });
  it('recibo é um snapshot: mudar o preço depois não altera o pedido', async () => {
    const s = await setup();
    const q = await quote(s.a, s.wallet.id);
    const res = await place(s.a, 'r1', { quoteId: q.quoteId, walletId: s.wallet.id, network: 'ethereum', collector });
    mockControl.getState().nfts.find((n) => n.id === 'nft-001')!.editions[0]!.priceEth = '99.000000000000000000';
    const again = (await api.get(`/orders/${res.data.id}`, s.a)).data;
    expect(again.receipt.lines[0].unitPriceEth).toBe(s.edition.priceEth);
  });
  it('pedido de outro usuário é 404', async () => {
    const s = await setup();
    const q = await quote(s.a, s.wallet.id);
    const res = await place(s.a, 'o1', { quoteId: q.quoteId, walletId: s.wallet.id, network: 'ethereum', collector });
    const bruno = auth(await loginAs('bruno@onyx.test'));
    expect((await fail(api.get(`/orders/${res.data.id}`, bruno))).status).toBe(404);
  });
});
