import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { api, parse } from '../../shared/api/client';
import { toApiError } from '../../shared/api/errors';
import { queryKeys } from '../../shared/api/queryKeys';
import { authResponseSchema, sessionSchema } from '../../shared/api/schemas';
import { mergeGuestCart } from '../cart/merge';
import { beginSession, endSession, getToken, subscribeToken } from './session';

export const sessionQuery = queryOptions({
  queryKey: queryKeys.session(),
  queryFn: async ({ signal }) => parse(sessionSchema, (await api.get('/session', { signal })).data),
  retry: false,
  staleTime: 60_000,
});

export type SessionStatus = 'loading' | 'authenticated' | 'guest';

export function useToken(): string | null {
  return useSyncExternalStore(subscribeToken, getToken, () => null);
}

export function useSession() {
  const token = useToken();
  const query = useQuery({ ...sessionQuery, enabled: Boolean(token) });
  const status: SessionStatus = !token ? 'guest' : query.isPending ? 'loading' : query.data ? 'authenticated' : 'guest';
  return { status, user: status === 'authenticated' ? query.data?.user : undefined };
}

export interface Credentials { email: string; password: string }
export interface RegisterInput extends Credentials { name: string; displayName?: string }

function useAuthMutation<T>(path: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: T) => {
      try {
        return parse(authResponseSchema, (await api.post(path, input)).data);
      } catch (e) { throw toApiError(e); }
    },
    onSuccess: async (data) => {
      beginSession(qc, data.token, data.session.user.id);
      qc.setQueryData(queryKeys.session(), data.session);
      await mergeGuestCart(qc, data.session.user.id);
    },
  });
}

export const useLogin = () => useAuthMutation<Credentials>('/auth/login');
export const useRegister = () => useAuthMutation<RegisterInput>('/auth/register');

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => { try { await api.post('/auth/logout'); } catch { /* o logout local acontece de qualquer forma */ } },
    onSettled: () => endSession(qc),
  });
}
