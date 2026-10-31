import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { api } from '../../shared/api/client';
import type { ApiError } from '../../shared/api/errors';
import { server } from '../server';
import { auth, loginAs, resetMocks } from '../test-utils';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(resetMocks);

const fail = async (p: Promise<unknown>): Promise<ApiError> => (await p.catch((e: unknown) => e)) as ApiError;
const guest = (id: string) => ({ headers: { 'X-Cart-Id': id } });
const NFT = 'nft-001';
const edition = async (nftId = NFT) => (await api.get(`/nfts/${nftId}`)).data.editions[0] as { id: string; priceEth: string; available: number };

describe('carrinho do visitante', () => {
  it('exige X-Cart-Id', async () => {
    expect((await fail(api.get('/cart'))).status).toBe(400);
  });
  it('adiciona, soma quantidades da mesma edição e calcula o resumo', async () => {
    const e = await edition();
    await api.post('/cart/items', { nftId: NFT, editionId: e.id, quantity: 1 }, guest('g1'));
    const cart = (await api.post('/cart/items', { nftId: NFT, editionId: e.id, quantity: 1 }, guest('g1'))).data;
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(2);
    expect(cart.summary.subtotalEth).toBe(cart.items[0].lineTotalEth);
    expect(Number(cart.summary.networkFeeEth)).toBe(0.0021);
  });
  it('recusa acima do limite com AVAILABILITY_CONFLICT', async () => {
    const e = await edition();
    const err = await fail(api.post('/cart/items', { nftId: NFT, editionId: e.id, quantity: 11 }, guest('g2')));
    expect(err.status).toBe(409);
    expect(err.code).toBe('AVAILABILITY_CONFLICT');
  });
  it('recusa edição esgotada', async () => {
    const e = await edition('nft-004');
    expect(e.available).toBe(0);
    expect((await fail(api.post('/cart/items', { nftId: 'nft-004', editionId: e.id, quantity: 1 }, guest('g3')))).code).toBe('AVAILABILITY_CONFLICT');
  });
  it('altera quantidade, remove item e zera o resumo', async () => {
    const e = await edition();
    const added = (await api.post('/cart/items', { nftId: NFT, editionId: e.id, quantity: 1 }, guest('g4'))).data;
    const item = added.items[0].id;
    expect((await api.patch(`/cart/items/${item}`, { quantity: 3 }, guest('g4'))).data.items[0].quantity).toBe(3);
    const empty = (await api.delete(`/cart/items/${item}`, guest('g4'))).data;
    expect(empty.items).toHaveLength(0);
    expect(Number(empty.summary.totalEth)).toBe(0);
  });
  it('valida quantidade inteira mínima', async () => {
    const e = await edition();
    expect((await fail(api.post('/cart/items', { nftId: NFT, editionId: e.id, quantity: 0 }, guest('g5')))).status).toBe(422);
    expect((await fail(api.post('/cart/items', { nftId: NFT, editionId: e.id, quantity: 1.5 }, guest('g5')))).status).toBe(422);
  });
});

describe('cupons', () => {
  it('aplica ONYX10 (10%) e remove', async () => {
    const e = await edition();
    await api.post('/cart/items', { nftId: NFT, editionId: e.id, quantity: 1 }, guest('c1'));
    const base = (await api.get('/cart', guest('c1'))).data.summary;
    const applied = (await api.put('/cart/coupon', { code: 'onyx10' }, guest('c1'))).data;
    expect(applied.coupon.code).toBe('ONYX10');
    expect(Number(applied.summary.discountEth)).toBeGreaterThan(0);
    expect(Number(applied.summary.totalEth)).toBeLessThan(Number(base.totalEth));
    const removed = (await api.delete('/cart/coupon', guest('c1'))).data;
    expect(removed.coupon).toBeNull();
    expect(Number(removed.summary.discountEth)).toBe(0);
  });
  it('rejeita inválido e expirado com mensagem no campo', async () => {
    const bad = await fail(api.put('/cart/coupon', { code: 'NADA' }, guest('c2')));
    expect(bad.fields?.['coupon']).toBe('Cupom inválido.');
    const old = await fail(api.put('/cart/coupon', { code: 'EXPIRED20' }, guest('c2')));
    expect(old.fields?.['coupon']).toBe('Este cupom expirou.');
  });
  it('cupom fixo nunca deixa o desconto passar do subtotal', async () => {
    const e = await edition();
    await api.post('/cart/items', { nftId: NFT, editionId: e.id, quantity: 1 }, guest('c3'));
    const s = (await api.put('/cart/coupon', { code: 'WELCOME005' }, guest('c3'))).data.summary;
    expect(Number(s.discountEth)).toBeLessThanOrEqual(Number(s.subtotalEth));
  });
});

describe('mescla ao autenticar', () => {
  it('leva os itens do visitante para a conta somando e respeitando o limite', async () => {
    const e = await edition();
    const token = await loginAs('ana@onyx.test');
    await api.post('/cart/items', { nftId: NFT, editionId: e.id, quantity: 2 }, auth(token));
    await api.post('/cart/items', { nftId: NFT, editionId: e.id, quantity: 3 }, guest('m1'));
    await api.post('/cart/items', { nftId: 'nft-002', editionId: (await edition('nft-002')).id, quantity: 1 }, guest('m1'));
    const merged = (await api.post('/cart/merge', { guestCartId: 'm1' }, { headers: { ...auth(token).headers, 'X-Cart-Id': 'm1' } })).data;
    expect(merged.items.find((i: { nftId: string }) => i.nftId === NFT).quantity).toBe(Math.min(5, e.available, 10));
    expect(merged.items).toHaveLength(2);
    expect((await api.get('/cart', guest('m1'))).data.items).toHaveLength(0);
  });
  it('carrinhos de usuários diferentes são isolados', async () => {
    const e = await edition();
    const ana = await loginAs('ana@onyx.test');
    const bruno = await loginAs('bruno@onyx.test');
    await api.post('/cart/items', { nftId: NFT, editionId: e.id, quantity: 1 }, auth(ana));
    expect((await api.get('/cart', auth(bruno))).data.items).toHaveLength(0);
  });
  it('merge exige autenticação', async () => {
    expect((await fail(api.post('/cart/merge', { guestCartId: 'x' }))).status).toBe(401);
  });
});

describe('perfil', () => {
  it('atualiza dados, valida e impede displayName duplicado', async () => {
    const t = await loginAs('ana@onyx.test');
    const ok = (await api.patch('/profile', { name: 'Ana Maria', displayName: 'ana.m', bio: 'Oi' }, auth(t))).data;
    expect(ok.displayName).toBe('ana.m');
    expect((await api.get('/profile', auth(t))).data.name).toBe('Ana Maria');
    const dup = await fail(api.patch('/profile', { name: 'Ana', displayName: 'bruno.lima', bio: '' }, auth(t)));
    expect(dup.fields?.['displayName']).toMatch(/em uso/);
    const bad = await fail(api.patch('/profile', { name: 'A', displayName: 'x', bio: 'a'.repeat(200) }, auth(t)));
    expect(Object.keys(bad.fields ?? {}).sort()).toEqual(['bio', 'displayName', 'name']);
  });
  it('altera a senha e a nova funciona no login', async () => {
    const t = await loginAs('ana@onyx.test');
    const wrong = await fail(api.put('/profile/password', { currentPassword: 'errada1234', newPassword: 'Nova#2026a' }, auth(t)));
    expect(wrong.fields?.['currentPassword']).toBeDefined();
    expect((await api.put('/profile/password', { currentPassword: 'Onyx#2026', newPassword: 'Nova#2026a' }, auth(t))).status).toBe(204);
    const res = await api.post('/auth/login', { email: 'ana@onyx.test', password: 'Nova#2026a' });
    expect(res.data.token).toBeTruthy();
    expect((await fail(api.post('/auth/login', { email: 'ana@onyx.test', password: 'Onyx#2026' }))).status).toBe(422);
  });
  it('sem sessão devolve 401', async () => {
    expect((await fail(api.get('/profile'))).status).toBe(401);
  });
});
