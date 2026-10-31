import { HttpResponse } from 'msw';
import type { ErrorCode } from '../../shared/api/errors';
import { getDb, mutate, type UserRecord } from '../store';
import { getConfig } from '../scenarios/engine';

let reqSeq = 0;

export function apiError(status: number, code: ErrorCode, message: string, extra?: { fields?: Record<string, string>; details?: unknown }): Response {
  reqSeq += 1;
  return HttpResponse.json(
    { error: { code, message, ...(extra?.fields ? { fields: extra.fields } : {}), ...(extra?.details !== undefined ? { details: extra.details } : {}) }, requestId: `req_${reqSeq}` },
    { status },
  );
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    return typeof body === 'object' && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function bearerToken(request: Request): string | null {
  const h = request.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

export type AuthResult = { user: UserRecord; token: string } | { response: Response };

export function authenticate(request: Request): AuthResult {
  const token = bearerToken(request);
  if (!token) return { response: apiError(401, 'UNAUTHENTICATED', 'Faça login para continuar.') };
  const db = getDb();
  const session = db.sessions[token];
  if (!session) return { response: apiError(401, 'UNAUTHENTICATED', 'Sessão inválida.') };
  if (getConfig().expireNextAuthed) {
    getConfig().expireNextAuthed = false;
    mutate((d) => {
      const s = d.sessions[token];
      if (s) s.expired = true;
    });
    return { response: apiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente.') };
  }
  if (session.expired || new Date(session.expiresAt).getTime() < Date.now()) {
    return { response: apiError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente.') };
  }
  const user = db.users.find((u) => u.id === session.userId);
  if (!user) return { response: apiError(401, 'UNAUTHENTICATED', 'Sessão inválida.') };
  return { user, token };
}

export const SESSION_TTL_MS = 30 * 60 * 1000;

export function newId(prefix: string): string {
  return `${prefix}_${globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}
