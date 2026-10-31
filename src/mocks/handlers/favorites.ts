import { http, HttpResponse } from 'msw';
import { applyScenario } from '../scenarios/engine';
import { getDb, mutate } from '../store';
import { apiError, authenticate } from './util';

export const favoriteHandlers = [
  http.get('*/api/favorites', async ({ request }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    const auth = authenticate(request);
    if ('response' in auth) return auth.response;
    return HttpResponse.json({ nftIds: [...(getDb().favorites[auth.user.id] ?? [])] });
  }),

  http.put('*/api/favorites/:nftId', async ({ request, params }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    const auth = authenticate(request);
    if ('response' in auth) return auth.response;
    const id = String(params['nftId']);
    if (!getDb().nfts.some((n) => n.id === id)) return apiError(404, 'NOT_FOUND', 'NFT não encontrado.');
    mutate((db) => {
      const list = (db.favorites[auth.user.id] ??= []);
      if (!list.includes(id)) list.push(id);
    });
    return HttpResponse.json({ nftIds: getDb().favorites[auth.user.id] });
  }),

  http.delete('*/api/favorites/:nftId', async ({ request, params }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    const auth = authenticate(request);
    if ('response' in auth) return auth.response;
    const id = String(params['nftId']);
    mutate((db) => {
      db.favorites[auth.user.id] = (db.favorites[auth.user.id] ?? []).filter((f) => f !== id);
    });
    return HttpResponse.json({ nftIds: getDb().favorites[auth.user.id] });
  }),
];
