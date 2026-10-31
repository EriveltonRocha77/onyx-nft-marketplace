import type { QueryClient } from '@tanstack/react-query';
import { api, parse } from '../../shared/api/client';
import { queryKeys } from '../../shared/api/queryKeys';
import { cartSchema } from '../../shared/api/schemas';
import { clearCartId, getCartId } from './cartId';

/**
 * Após autenticar, leva os itens do visitante para o carrinho da conta.
 * Falhas não bloqueiam o login: o id do visitante é mantido para nova tentativa.
 */
export async function mergeGuestCart(qc: QueryClient, userId: string): Promise<void> {
  const guestCartId = getCartId();
  try {
    const cart = parse(cartSchema, (await api.post('/cart/merge', { guestCartId: guestCartId ?? '' })).data);
    qc.setQueryData(queryKeys.user(userId).cart(), cart);
    if (guestCartId) {
      clearCartId();
      qc.removeQueries({ queryKey: queryKeys.guest.cart(guestCartId) });
    }
  } catch {
    void qc.invalidateQueries({ queryKey: queryKeys.user(userId).cart() });
  }
}

/**
 * Leitura do carrinho da conta. Se ainda existir um carrinho de visitante pendente
 * (login interrompido por refresh, falha de rede), ele é mesclado antes de devolver — a operação é idempotente.
 */
export async function fetchUserCart(qc: QueryClient, userId: string, signal?: AbortSignal) {
  const guestCartId = getCartId();
  if (!guestCartId) return parse(cartSchema, (await api.get('/cart', { signal })).data);
  const cart = parse(cartSchema, (await api.post('/cart/merge', { guestCartId })).data);
  clearCartId();
  qc.removeQueries({ queryKey: queryKeys.guest.cart(guestCartId) });
  void userId;
  return cart;
}
