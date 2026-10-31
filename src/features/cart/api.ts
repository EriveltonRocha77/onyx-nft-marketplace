import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api, parse } from '../../shared/api/client';
import { toApiError, type ApiError } from '../../shared/api/errors';
import { queryKeys } from '../../shared/api/queryKeys';
import { cartSchema, type Cart, type Network } from '../../shared/api/schemas';
import { useSession } from '../auth/api';
import { ensureCartId } from './cartId';
import { fetchUserCart } from './merge';

/** Chave do carrinho atual: da conta quando autenticado; do visitante caso contrário. */
export function useCartScope(): { key: QueryKey; ready: boolean; userId?: string } {
  const { status, user } = useSession();
  return useMemo(() => {
    if (status === 'authenticated' && user) return { key: queryKeys.user(user.id).cart(), ready: true, userId: user.id };
    if (status === 'guest') return { key: queryKeys.guest.cart(ensureCartId()), ready: true };
    return { key: queryKeys.guest.cart('pending'), ready: false };
  }, [status, user]);
}

export function useCart() {
  const scope = useCartScope();
  const qc = useQueryClient();
  return useQuery({
    queryKey: scope.key,
    queryFn: async ({ signal }) => {
      if (scope.userId) return fetchUserCart(qc, scope.userId, signal);
      return parse(cartSchema, (await api.get('/cart', { signal })).data);
    },
    enabled: scope.ready,
  });
}

export function useCartCount(): number {
  const { data } = useCart();
  return data?.items.reduce((n, i) => n + i.quantity, 0) ?? 0;
}

/** Aplica a resposta do servidor ao cache sem permitir que uma resposta antiga sobrescreva uma mais nova. */
function applyCart(set: (fn: (old: Cart | undefined) => Cart) => void, next: Cart): void {
  set((old) => (old && old.id === next.id && old.version > next.version ? old : next));
}

function useCartMutation<V>(call: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  const scope = useCartScope();
  return useMutation<Cart, ApiError, V>({
    mutationFn: async (v) => {
      try { return parse(cartSchema, await call(v)); } catch (e) { throw toApiError(e); }
    },
    onMutate: async () => { await qc.cancelQueries({ queryKey: scope.key }); },
    onSuccess: (cart) => { applyCart((fn) => qc.setQueryData<Cart>(scope.key, fn), cart); },
    onError: () => { void qc.invalidateQueries({ queryKey: scope.key }); },
  });
}

export interface AddItemInput { nftId: string; editionId: string; quantity: number }

export const useAddToCart = () => useCartMutation<AddItemInput>(async (v) => (await api.post('/cart/items', v)).data);
export const useUpdateCartItem = () => useCartMutation<{ itemId: string; quantity: number }>(async (v) => (await api.patch(`/cart/items/${encodeURIComponent(v.itemId)}`, { quantity: v.quantity })).data);
export const useRemoveCartItem = () => useCartMutation<{ itemId: string }>(async (v) => (await api.delete(`/cart/items/${encodeURIComponent(v.itemId)}`)).data);
export const useApplyCoupon = () => useCartMutation<{ code: string }>(async (v) => (await api.put('/cart/coupon', v)).data);
export const useRemoveCoupon = () => useCartMutation<void>(async () => (await api.delete('/cart/coupon')).data);
export const useSetNetwork = () => useCartMutation<{ network: Network }>(async (v) => (await api.put('/cart/network', v)).data);
