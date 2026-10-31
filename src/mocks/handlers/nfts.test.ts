import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { api } from '../../shared/api/client';
import { ApiError } from '../../shared/api/errors';
import { mockControl } from '../control';
import { server } from '../server';
import { auth, loginAs, resetMocks } from '../test-utils';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(resetMocks);

const fail = async (p: Promise<unknown>): Promise<ApiError> => (await p.catch((e: unknown) => e)) as ApiError;
const list = async (qs: string) => (await api.get(`/nfts?${qs}`)).data;

describe('GET /nfts', () => {
  it('filtros combinados, ordenação e paginação batem com o total', async () => {
    const p1 = await list('collection=neon-drift&category=art&sort=price_asc&page=1&pageSize=1');
    const p2 = await list('collection=neon-drift&category=art&sort=price_asc&page=2&pageSize=1');
    expect(p1.total).toBe(2);
    expect(p1.totalPages).toBe(2);
    expect(p1.items).toHaveLength(1);
    expect(p2.items).toHaveLength(1);
    expect(BigInt(p1.items[0].priceFromEth.replace('.', ''))).toBeLessThanOrEqual(BigInt(p2.items[0].priceFromEth.replace('.', '')));
    for (const n of [...p1.items, ...p2.items]) {
      expect(n.collection.id).toBe('neon-drift');
      expect(n.category.id).toBe('art');
    }
  });

  it('facets listam coleções e categorias', async () => {
    const r = await list('');
    expect(r.facets.collections).toHaveLength(6);
    expect(r.facets.categories).toHaveLength(4);
    expect(r.total).toBe(48);
    expect(r.items).toHaveLength(12);
  });

  it('busca sem resultado devolve lista vazia', async () => {
    const r = await list('q=zzzzzz');
    expect(r.items).toEqual([]);
    expect(r.total).toBe(0);
  });

  it('busca ignora acentos e caixa', async () => {
    const r = await list('q=ELETRICO');
    expect(r.total).toBeGreaterThan(0);
  });

  it('availability=available exclui esgotados', async () => {
    const r = await list('availability=available&pageSize=48');
    expect(r.items.every((n: { availableTotal: number }) => n.availableTotal > 0)).toBe(true);
    expect(r.total).toBeLessThan(48);
  });

  it('faixa de preço inválida devolve 422', async () => {
    const e = await fail(api.get('/nfts?minPrice=1e-3'));
    expect(e.status).toBe(422);
  });

  it('cenário empty devolve lista vazia', async () => {
    mockControl.setScenario('empty');
    mockControl.setLatency(0);
    const r = await list('');
    expect(r.items).toEqual([]);
  });

  it('favorites=true exige sessão e devolve só os do usuário', async () => {
    expect((await fail(api.get('/nfts?favorites=true'))).status).toBe(401);
    const token = await loginAs('ana@onyx.test');
    const r = (await api.get('/nfts?favorites=true', auth(token))).data;
    expect(r.items.map((n: { id: string }) => n.id).sort()).toEqual(['nft-002', 'nft-007']);
  });
});

describe('GET /nfts/featured e /nfts/:id', () => {
  it('destaques vêm marcados como featured', async () => {
    const r = (await api.get('/nfts/featured')).data;
    expect(r.items.length).toBeGreaterThanOrEqual(4);
    expect(r.items.every((n: { featured: boolean }) => n.featured)).toBe(true);
  });
  it('NFT inexistente devolve 404 NOT_FOUND', async () => {
    const e = await fail(api.get('/nfts/inexistente'));
    expect(e.status).toBe(404);
    expect(e.code).toBe('NOT_FOUND');
  });
  it('detalhe devolve o NFT', async () => {
    expect((await api.get('/nfts/nft-001')).data.id).toBe('nft-001');
  });
});

describe('cenários de falha', () => {
  it('failNext falha uma vez e a segunda chamada funciona', async () => {
    mockControl.failNext('GET /api/nfts', { status: 503, code: 'TRANSIENT' });
    expect((await fail(api.get('/nfts'))).status).toBe(503);
    expect((await api.get('/nfts')).status).toBe(200);
  });
  it('flaky falha as 2 primeiras chamadas e depois funciona', async () => {
    mockControl.setScenario('flaky');
    mockControl.setLatency(0);
    expect((await fail(api.get('/nfts'))).status).toBe(503);
    expect((await fail(api.get('/nfts'))).status).toBe(503);
    expect((await api.get('/nfts')).status).toBe(200);
  });
  it('offline faz a requisição falhar como erro de rede', async () => {
    mockControl.setScenario('offline');
    mockControl.setLatency(0);
    expect((await fail(api.get('/nfts'))).code).toBe('NETWORK');
  });
  it('server-error devolve 500 TRANSIENT', async () => {
    mockControl.setScenario('server-error');
    mockControl.setLatency(0);
    const e = await fail(api.get('/nfts'));
    expect(e.status).toBe(500);
    expect(e.code).toBe('TRANSIENT');
  });
});
