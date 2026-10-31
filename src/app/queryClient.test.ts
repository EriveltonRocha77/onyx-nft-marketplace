import { describe, expect, it } from 'vitest';
import { ApiError } from '../shared/api/errors';
import { queryKeys } from '../shared/api/queryKeys';
import { createQueryClient, retryDelay, shouldRetry } from './queryClient';

const err = (status: number, code: ApiError['code']) => new ApiError({ status, code, message: 'x' });

describe('política de retry', () => {
  it('repete erro transitório, de rede e timeout até 2 vezes', () => {
    expect(shouldRetry(0, err(503, 'TRANSIENT'))).toBe(true);
    expect(shouldRetry(1, err(0, 'NETWORK'))).toBe(true);
    expect(shouldRetry(0, err(0, 'TIMEOUT'))).toBe(true);
    expect(shouldRetry(2, err(503, 'TRANSIENT'))).toBe(false);
  });
  it('não repete 4xx nem erros desconhecidos', () => {
    expect(shouldRetry(0, err(404, 'NOT_FOUND'))).toBe(false);
    expect(shouldRetry(0, err(422, 'VALIDATION_ERROR'))).toBe(false);
    expect(shouldRetry(0, err(401, 'SESSION_EXPIRED'))).toBe(false);
    expect(shouldRetry(0, new Error('x'))).toBe(false);
  });
  it('backoff exponencial de 400 ms', () => {
    expect([retryDelay(0), retryDelay(1), retryDelay(2)]).toEqual([400, 800, 1600]);
  });
});

describe('createQueryClient', () => {
  it('usa os padrões documentados', () => {
    const qc = createQueryClient();
    const q = qc.getDefaultOptions().queries!;
    expect(q.staleTime).toBe(30_000);
    expect(q.gcTime).toBe(300_000);
    expect(qc.getDefaultOptions().mutations!.retry).toBe(0);
  });
});

describe('queryKeys', () => {
  it('chaves privadas começam por user + id e nunca coincidem entre usuários', () => {
    const a = queryKeys.user('user-ana').favorites();
    const b = queryKeys.user('user-bruno').favorites();
    expect(a.slice(0, 2)).toEqual(['user', 'user-ana']);
    expect(a).not.toEqual(b);
  });
  it('a chave da lista inclui os parâmetros', () => {
    expect(queryKeys.nfts.list({ page: '2' })).toEqual(['nfts', 'list', { page: '2' }]);
    expect(queryKeys.nfts.list({ page: '2' })).not.toEqual(queryKeys.nfts.list({ page: '3' }));
  });
});
