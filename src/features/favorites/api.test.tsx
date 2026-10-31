import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { configureApi } from '../../shared/api/client';
import { queryKeys } from '../../shared/api/queryKeys';
import { mockControl } from '../../mocks/control';
import { server } from '../../mocks/server';
import { loginAs, resetMocks } from '../../mocks/test-utils';
import { useToggleFavorite, type FavoritesData } from './api';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

let qc: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
const key = queryKeys.user('user-ana').favorites();

beforeEach(async () => {
  resetMocks();
  qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const token = await loginAs('ana@onyx.test');
  configureApi({ getToken: () => token, getCartId: () => null, onSessionExpired: () => {} });
  qc.setQueryData<FavoritesData>(key, { nftIds: ['nft-002'] });
});

describe('useToggleFavorite (otimista)', () => {
  it('atualiza o cache antes da resposta do servidor', async () => {
    mockControl.delayNext('PUT /api/favorites', 300);
    const { result } = renderHook(() => useToggleFavorite('user-ana'), { wrapper });
    act(() => { result.current.mutate({ nftId: 'nft-010', next: true }); });
    await waitFor(() => expect(qc.getQueryData<FavoritesData>(key)?.nftIds).toContain('nft-010'));
    expect(result.current.isPending).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('em falha volta ao estado anterior (rollback)', async () => {
    mockControl.failNext('PUT /api/favorites', { status: 503, code: 'TRANSIENT' });
    const { result } = renderHook(() => useToggleFavorite('user-ana'), { wrapper });
    act(() => { result.current.mutate({ nftId: 'nft-010', next: true }); });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(qc.getQueryData<FavoritesData>(key)?.nftIds).toEqual(['nft-002']);
  });

  it('remove otimisticamente e confirma no servidor', async () => {
    const { result } = renderHook(() => useToggleFavorite('user-ana'), { wrapper });
    act(() => { result.current.mutate({ nftId: 'nft-002', next: false }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockControl.getState().favorites['user-ana']).not.toContain('nft-002');
  });
});
