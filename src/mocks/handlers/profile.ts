import { http, HttpResponse } from 'msw';
import { z } from 'zod';
import { hashPassword } from '../fixtures/users';
import { applyScenario } from '../scenarios/engine';
import { getDb, mutate, type UserRecord } from '../store';
import { fieldErrors } from './auth';
import { apiError, authenticate, newId, readJson } from './util';

export const AVATAR_MAX_BYTES = 1024 * 1024;
export const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const view = (u: UserRecord) => ({ id: u.id, name: u.name, displayName: u.displayName, email: u.email, bio: u.bio, avatarUrl: u.avatarUrl });

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome completo.').max(80, 'Use no máximo 80 caracteres.'),
  displayName: z.string().trim().min(2, 'O nome de exibição deve ter ao menos 2 caracteres.').max(30, 'Use no máximo 30 caracteres.').regex(/^[\w.-]+$/, 'Use apenas letras, números, ponto, hífen e sublinhado.'),
  bio: z.string().trim().max(160, 'A bio deve ter no máximo 160 caracteres.'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual.'),
  newPassword: z.string().min(8, 'A senha deve ter ao menos 8 caracteres.').regex(/[A-Za-z]/, 'A senha deve conter ao menos uma letra.').regex(/\d/, 'A senha deve conter ao menos um número.'),
});

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export const profileHandlers = [
  http.get('*/api/profile', async ({ request }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    const auth = authenticate(request);
    if ('response' in auth) return auth.response;
    return HttpResponse.json(view(auth.user));
  }),

  http.patch('*/api/profile', async ({ request }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    const auth = authenticate(request);
    if ('response' in auth) return auth.response;
    const parsed = profileSchema.safeParse(await readJson(request));
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Corrija os campos destacados.', { fields: fieldErrors(parsed.error) });
    const { name, displayName, bio } = parsed.data;
    if (getDb().users.some((u) => u.id !== auth.user.id && u.displayName.toLowerCase() === displayName.toLowerCase())) {
      return apiError(409, 'VALIDATION_ERROR', 'Corrija os campos destacados.', { fields: { displayName: 'Este nome de exibição já está em uso.' } });
    }
    mutate((db) => { Object.assign(db.users.find((u) => u.id === auth.user.id)!, { name, displayName, bio }); });
    return HttpResponse.json(view(getDb().users.find((u) => u.id === auth.user.id)!));
  }),

  http.put('*/api/profile/avatar', async ({ request }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    const auth = authenticate(request);
    if ('response' in auth) return auth.response;
    let file: unknown = null;
    try { file = (await request.formData()).get('file'); } catch { /* corpo inválido */ }
    if (!(file instanceof Blob)) return apiError(422, 'VALIDATION_ERROR', 'Envie uma imagem.', { fields: { avatar: 'Selecione uma imagem.' } });
    if (!AVATAR_TYPES.includes(file.type)) return apiError(422, 'VALIDATION_ERROR', 'Formato não suportado.', { fields: { avatar: 'Use uma imagem PNG, JPEG ou WebP.' } });
    if (file.size > AVATAR_MAX_BYTES) return apiError(422, 'VALIDATION_ERROR', 'Imagem muito grande.', { fields: { avatar: 'A imagem deve ter no máximo 1 MB.' } });
    const url = `data:${file.type};base64,${toBase64(new Uint8Array(await file.arrayBuffer()))}`;
    mutate((db) => { db.users.find((u) => u.id === auth.user.id)!.avatarUrl = url; });
    return HttpResponse.json(view(getDb().users.find((u) => u.id === auth.user.id)!));
  }),

  http.delete('*/api/profile/avatar', async ({ request }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    const auth = authenticate(request);
    if ('response' in auth) return auth.response;
    mutate((db) => { db.users.find((u) => u.id === auth.user.id)!.avatarUrl = null; });
    return HttpResponse.json(view(getDb().users.find((u) => u.id === auth.user.id)!));
  }),

  http.put('*/api/profile/password', async ({ request }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    const auth = authenticate(request);
    if ('response' in auth) return auth.response;
    const parsed = passwordSchema.safeParse(await readJson(request));
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Corrija os campos destacados.', { fields: fieldErrors(parsed.error) });
    const { currentPassword, newPassword } = parsed.data;
    if ((await hashPassword(currentPassword, auth.user.salt)) !== auth.user.passwordHash) {
      return apiError(422, 'VALIDATION_ERROR', 'Senha atual incorreta.', { fields: { currentPassword: 'A senha atual está incorreta.' } });
    }
    if (currentPassword === newPassword) {
      return apiError(422, 'VALIDATION_ERROR', 'Corrija os campos destacados.', { fields: { newPassword: 'A nova senha deve ser diferente da atual.' } });
    }
    const salt = newId('salt');
    const hash = await hashPassword(newPassword, salt);
    mutate((db) => { Object.assign(db.users.find((u) => u.id === auth.user.id)!, { salt, passwordHash: hash }); });
    return new HttpResponse(null, { status: 204 });
  }),
];
