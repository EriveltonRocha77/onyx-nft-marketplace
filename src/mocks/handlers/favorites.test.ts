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

describe('favoritos', () => {
  it('Ana favorita um NFT e Bruno não o vê', async () => {
    const ana = await loginAs('ana@onyx.test');
    const bruno = await loginAs('bruno@onyx.test');
    await api.put('/favorites/nft-020', null, auth(ana));
    expect((await api.get('/favorites', auth(ana))).data.nftIds).toContain('nft-020');
    expect((await api.get('/favorites', auth(bruno))).data.nftIds).not.toContain('nft-020');
  });
  it('PUT repetido não duplica e DELETE de item ausente é 200', async () => {
    const t = await loginAs('ana@onyx.test');
    await api.put('/favorites/nft-030', null, auth(t));
    await api.put('/favorites/nft-030', null, auth(t));
    const ids: string[] = (await api.get('/favorites', auth(t))).data.nftIds;
    expect(ids.filter((i) => i === 'nft-030')).toHaveLength(1);
    expect((await api.delete('/favorites/nft-031', auth(t))).status).toBe(200);
  });
  it('NFT inexistente devolve 404 e sem sessão devolve 401', async () => {
    const t = await loginAs('ana@onyx.test');
    expect((await fail(api.put('/favorites/nft-999', null, auth(t)))).status).toBe(404);
    expect((await fail(api.get('/favorites'))).status).toBe(401);
  });
  it('failNext faz o PUT falhar uma vez', async () => {
    const t = await loginAs('ana@onyx.test');
    mockControl.failNext('PUT /api/favorites', { status: 503, code: 'TRANSIENT' });
    expect((await fail(api.put('/favorites/nft-040', null, auth(t)))).status).toBe(503);
    expect((await api.put('/favorites/nft-040', null, auth(t))).status).toBe(200);
  });
});
