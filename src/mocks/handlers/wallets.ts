import { http, HttpResponse } from 'msw';
import { z } from 'zod';
import { networkSchema } from '../../shared/api/schemas';
import { applyScenario, getConfig } from '../scenarios/engine';
import { getDb, mutate } from '../store';
import { fieldErrors } from './auth';
import { apiError, authenticate, newId, readJson } from './util';

export const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

const walletInput = z.object({
  label: z.string().trim().min(2, 'Informe um nome com ao menos 2 caracteres.').max(40, 'Use no máximo 40 caracteres.'),
  address: z.string().trim().regex(ADDRESS_RE, 'Endereço inválido. Use 0x seguido de 40 caracteres hexadecimais.'),
  network: networkSchema,
});
const createInput = walletInput.extend({ role: z.enum(['primary', 'secondary'], { error: 'Escolha principal ou secundária.' }) });

const list = (userId: string) => getDb().wallets[userId] ?? [];

export const walletHandlers = [
  http.get('*/api/wallets', async ({ request }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    const auth = authenticate(request);
    if ('response' in auth) return auth.response;
    return HttpResponse.json({ items: list(auth.user.id) });
  }),

  http.post('*/api/wallets', async ({ request }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    const auth = authenticate(request);
    if ('response' in auth) return auth.response;
    const parsed = createInput.safeParse(await readJson(request));
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Corrija os campos destacados.', { fields: fieldErrors(parsed.error) });
    const existing = list(auth.user.id);
    if (existing.some((w) => w.role === parsed.data.role)) {
      return apiError(409, 'VALIDATION_ERROR', 'Corrija os campos destacados.', { fields: { role: parsed.data.role === 'primary' ? 'Você já tem uma carteira principal.' : 'Você já tem uma carteira secundária.' } });
    }
    if (existing.some((w) => w.address.toLowerCase() === parsed.data.address.toLowerCase())) {
      return apiError(409, 'VALIDATION_ERROR', 'Corrija os campos destacados.', { fields: { address: 'Este endereço já está cadastrado.' } });
    }
    const wallet = { id: newId('wal'), ...parsed.data, connected: false };
    mutate((db) => { (db.wallets[auth.user.id] ??= []).push(wallet); });
    return HttpResponse.json(wallet, { status: 201 });
  }),

  http.patch('*/api/wallets/:id', async ({ request, params }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    const auth = authenticate(request);
    if ('response' in auth) return auth.response;
    const wallet = list(auth.user.id).find((w) => w.id === params['id']);
    if (!wallet) return apiError(404, 'NOT_FOUND', 'Carteira não encontrada.');
    const parsed = walletInput.safeParse(await readJson(request));
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Corrija os campos destacados.', { fields: fieldErrors(parsed.error) });
    if (list(auth.user.id).some((w) => w.id !== wallet.id && w.address.toLowerCase() === parsed.data.address.toLowerCase())) {
      return apiError(409, 'VALIDATION_ERROR', 'Corrija os campos destacados.', { fields: { address: 'Este endereço já está cadastrado.' } });
    }
    mutate((db) => {
      const w = db.wallets[auth.user.id]!.find((x) => x.id === wallet.id)!;
      // trocar o endereço invalida a conexão anterior
      if (w.address.toLowerCase() !== parsed.data.address.toLowerCase()) w.connected = false;
      Object.assign(w, parsed.data);
    });
    return HttpResponse.json(list(auth.user.id).find((w) => w.id === wallet.id));
  }),

  http.post('*/api/wallets/:id/connect', async ({ request, params }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    const auth = authenticate(request);
    if ('response' in auth) return auth.response;
    const wallet = list(auth.user.id).find((w) => w.id === params['id']);
    if (!wallet) return apiError(404, 'NOT_FOUND', 'Carteira não encontrada.');
    if (getConfig().walletRefused) return apiError(403, 'FORBIDDEN', 'A carteira recusou a conexão.');
    mutate((db) => { db.wallets[auth.user.id]!.find((x) => x.id === wallet.id)!.connected = true; });
    return HttpResponse.json(list(auth.user.id).find((w) => w.id === wallet.id));
  }),

  http.post('*/api/wallets/:id/disconnect', async ({ request, params }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    const auth = authenticate(request);
    if ('response' in auth) return auth.response;
    const wallet = list(auth.user.id).find((w) => w.id === params['id']);
    if (!wallet) return apiError(404, 'NOT_FOUND', 'Carteira não encontrada.');
    mutate((db) => { db.wallets[auth.user.id]!.find((x) => x.id === wallet.id)!.connected = false; });
    return HttpResponse.json(list(auth.user.id).find((w) => w.id === wallet.id));
  }),
];
