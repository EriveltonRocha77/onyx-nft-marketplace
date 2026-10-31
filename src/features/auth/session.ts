import type { QueryClient } from '@tanstack/react-query';
import { resetSessionExpiredGuard } from '../../shared/api/client';

const TOKEN_KEY = 'onyx:token';
const LAST_USER_KEY = 'onyx:last-user';
const DRAFT_PREFIX = 'onyx:draft:';

const listeners = new Set<() => void>();

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* storage indisponível */ }
  listeners.forEach((l) => l());
}

export function subscribeToken(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const cleanups = new Set<() => void>();

/** Registra limpeza de recursos da sessão (ex.: encerrar o socket). Devolve o cancelamento. */
export function registerSessionCleanup(fn: () => void): () => void {
  cleanups.add(fn);
  return () => { cleanups.delete(fn); };
}

function runCleanups(): void {
  for (const fn of [...cleanups]) {
    try { fn(); } catch { /* uma limpeza não pode impedir as outras */ }
  }
}

export function draftKey(userId: string, key: string): string {
  return `${DRAFT_PREFIX}${userId}:${key}`;
}

export function saveDraft(userId: string, key: string, value: unknown): void {
  try { sessionStorage.setItem(draftKey(userId, key), JSON.stringify(value)); } catch { /* ignora */ }
}

export function loadDraft(userId: string, key: string): unknown {
  try {
    const raw = sessionStorage.getItem(draftKey(userId, key));
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch { return null; }
}

export function removeDraft(userId: string, key: string): void {
  try { sessionStorage.removeItem(draftKey(userId, key)); } catch { /* ignora */ }
}

export function clearDrafts(exceptUserId?: string): void {
  try {
    for (const k of Object.keys(sessionStorage)) {
      if (!k.startsWith(DRAFT_PREFIX)) continue;
      if (exceptUserId && k.startsWith(`${DRAFT_PREFIX}${exceptUserId}:`)) continue;
      sessionStorage.removeItem(k);
    }
  } catch { /* ignora */ }
}

/** Logout: apaga token, cache, rascunhos e encerra subscriptions. */
export function endSession(qc: QueryClient): void {
  setToken(null);
  try { localStorage.removeItem(LAST_USER_KEY); } catch { /* ignora */ }
  clearDrafts();
  runCleanups();
  qc.clear();
  resetSessionExpiredGuard();
}

/** Expiração: preserva rascunhos do usuário para retomada, mas descarta token e cache privado. */
export function expireSession(qc: QueryClient): void {
  setToken(null);
  runCleanups();
  qc.removeQueries({ queryKey: ['user'] });
  qc.removeQueries({ queryKey: ['session'] });
  resetSessionExpiredGuard();
}

/** Chamado após login/cadastro. Se o usuário mudou, nada do anterior sobrevive. */
export function beginSession(qc: QueryClient, token: string, userId: string): void {
  let previous: string | null = null;
  try { previous = localStorage.getItem(LAST_USER_KEY); } catch { /* ignora */ }
  if (previous && previous !== userId) {
    runCleanups();
    qc.removeQueries({ queryKey: ['user'] });
    clearDrafts(userId);
  }
  try { localStorage.setItem(LAST_USER_KEY, userId); } catch { /* ignora */ }
  setToken(token);
  resetSessionExpiredGuard();
}

/** Aceita só caminhos internos, evitando redirecionamento aberto. */
export function safeRedirect(value: unknown): string {
  if (typeof value !== 'string') return '/';
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/';
  return value;
}
