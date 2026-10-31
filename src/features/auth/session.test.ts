import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { beginSession, clearDrafts, endSession, expireSession, getToken, loadDraft, registerSessionCleanup, safeRedirect, saveDraft, setToken } from './session';

let qc: QueryClient;
beforeEach(() => { qc = new QueryClient(); });

describe('ciclo de vida da sessão', () => {
  it('endSession remove token, cache privado, rascunhos e executa limpezas', () => {
    const cleanup = vi.fn();
    registerSessionCleanup(cleanup);
    setToken('tok');
    saveDraft('user-ana', 'checkout', { a: 1 });
    qc.setQueryData(['user', 'user-ana', 'favorites'], { nftIds: ['x'] });
    endSession(qc);
    expect(getToken()).toBeNull();
    expect(loadDraft('user-ana', 'checkout')).toBeNull();
    expect(qc.getQueryData(['user', 'user-ana', 'favorites'])).toBeUndefined();
    expect(cleanup).toHaveBeenCalled();
  });

  it('expireSession preserva rascunhos mas descarta token e cache privado', () => {
    setToken('tok');
    saveDraft('user-ana', 'checkout', { a: 1 });
    qc.setQueryData(['user', 'user-ana', 'cart'], { items: [] });
    expireSession(qc);
    expect(getToken()).toBeNull();
    expect(loadDraft('user-ana', 'checkout')).toEqual({ a: 1 });
    expect(qc.getQueryData(['user', 'user-ana', 'cart'])).toBeUndefined();
  });

  it('troca de usuário descarta cache e rascunhos do anterior', () => {
    beginSession(qc, 't1', 'user-ana');
    saveDraft('user-ana', 'checkout', { a: 1 });
    qc.setQueryData(['user', 'user-ana', 'favorites'], { nftIds: ['x'] });
    beginSession(qc, 't2', 'user-bruno');
    expect(loadDraft('user-ana', 'checkout')).toBeNull();
    expect(qc.getQueryData(['user', 'user-ana', 'favorites'])).toBeUndefined();
    expect(getToken()).toBe('t2');
  });

  it('o mesmo usuário voltando mantém o rascunho (retomada após expiração)', () => {
    beginSession(qc, 't1', 'user-ana');
    saveDraft('user-ana', 'checkout', { a: 1 });
    expireSession(qc);
    beginSession(qc, 't2', 'user-ana');
    expect(loadDraft('user-ana', 'checkout')).toEqual({ a: 1 });
  });

  it('rascunho de outro usuário não é lido', () => {
    saveDraft('user-ana', 'checkout', { a: 1 });
    expect(loadDraft('user-bruno', 'checkout')).toBeNull();
    clearDrafts();
    expect(loadDraft('user-ana', 'checkout')).toBeNull();
  });

  it.each([['/cart', '/cart'], ['//evil.com', '/'], ['https://evil.com', '/'], ['/\\evil', '/'], [undefined, '/'], ['/?q=a', '/?q=a']])(
    'safeRedirect(%j) = %j', (input, out) => expect(safeRedirect(input)).toBe(out),
  );
});
