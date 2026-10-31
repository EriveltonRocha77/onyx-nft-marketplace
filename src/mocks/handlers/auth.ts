import { http, HttpResponse } from 'msw';
import { z } from 'zod';
import type { AuthResponse } from '../../shared/api/schemas';
import { hashPassword } from '../fixtures/users';
import { applyScenario } from '../scenarios/engine';
import { getDb, mutate, type UserRecord } from '../store';
import { SESSION_TTL_MS, apiError, authenticate, bearerToken, newId, readJson } from './util';

const passwordRule = z
  .string()
  .min(8, 'A senha deve ter ao menos 8 caracteres.')
  .regex(/[A-Za-z]/, 'A senha deve conter ao menos uma letra.')
  .regex(/\d/, 'A senha deve conter ao menos um número.');

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome completo.'),
  displayName: z.string().trim().min(2, 'O nome de exibição deve ter ao menos 2 caracteres.').optional(),
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
  password: passwordRule,
});

const loginSchema = z.object({ email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'), password: z.string().min(1, 'Informe a senha.') });

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!(key in fields)) fields[key] = issue.message;
  }
  return fields;
}

export function toSessionUser(u: UserRecord) {
  return { id: u.id, name: u.name, displayName: u.displayName, email: u.email, avatarUrl: u.avatarUrl };
}

function openSession(user: UserRecord): AuthResponse {
  const token = newId('tok');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  mutate((db) => {
    db.sessions[token] = { token, userId: user.id, expiresAt, expired: false };
  });
  return { token, session: { user: toSessionUser(user), expiresAt } };
}

function slug(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
}

export const authHandlers = [
  http.post('*/api/auth/register', async ({ request }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    const parsed = registerSchema.safeParse(await readJson(request));
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Corrija os campos destacados.', { fields: fieldErrors(parsed.error) });
    const { name, email, password } = parsed.data;
    const displayName = parsed.data.displayName ?? slug(name);
    const db = getDb();
    if (db.users.some((u) => u.email === email)) {
      return apiError(409, 'EMAIL_TAKEN', 'Já existe uma conta com este e-mail.', { fields: { email: 'Este e-mail já está cadastrado.' } });
    }
    if (db.users.some((u) => u.displayName.toLowerCase() === displayName.toLowerCase())) {
      return apiError(422, 'VALIDATION_ERROR', 'Corrija os campos destacados.', { fields: { displayName: 'Este nome de exibição já está em uso.' } });
    }
    const salt = newId('salt');
    const user: UserRecord = { id: newId('user'), name, displayName, email, bio: '', avatarUrl: null, salt, passwordHash: await hashPassword(password, salt) };
    mutate((d) => {
      d.users.push(user);
      d.favorites[user.id] = [];
      d.wallets[user.id] = [];
    });
    return HttpResponse.json(openSession(user), { status: 201 });
  }),

  http.post('*/api/auth/login', async ({ request }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    const parsed = loginSchema.safeParse(await readJson(request));
    if (!parsed.success) return apiError(422, 'VALIDATION_ERROR', 'Corrija os campos destacados.', { fields: fieldErrors(parsed.error) });
    const user = getDb().users.find((u) => u.email === parsed.data.email);
    const ok = user ? (await hashPassword(parsed.data.password, user.salt)) === user.passwordHash : false;
    if (!user || !ok) return apiError(422, 'VALIDATION_ERROR', 'E-mail ou senha incorretos.', { fields: { password: 'E-mail ou senha incorretos.' } });
    return HttpResponse.json(openSession(user));
  }),

  http.post('*/api/auth/logout', async ({ request }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    const token = bearerToken(request);
    if (token) mutate((db) => { delete db.sessions[token]; });
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('*/api/session', async ({ request }) => {
    const failed = await applyScenario(request);
    if (failed) return failed;
    const auth = authenticate(request);
    if ('response' in auth) return auth.response;
    const session = getDb().sessions[auth.token]!;
    return HttpResponse.json({ user: toSessionUser(auth.user), expiresAt: session.expiresAt });
  }),
];
