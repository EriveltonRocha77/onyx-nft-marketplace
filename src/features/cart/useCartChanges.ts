import { useEffect, useState } from 'react';
import type { Cart } from '../../shared/api/schemas';
import { formatEthDisplay } from '../../shared/money/decimal';
import { useAnnounce } from '../../shared/ui/live-announcer';

export interface CartChange { id: string; text: string }

/** Compara itens entre duas versões do carrinho e descreve preço/disponibilidade que mudaram. */
export function diffCart(prev: Cart, next: Cart): CartChange[] {
  const out: CartChange[] = [];
  for (const item of next.items) {
    const before = prev.items.find((i) => i.id === item.id);
    if (!before) continue;
    if (before.unitPriceEth !== item.unitPriceEth) {
      out.push({ id: `${item.id}:price:${item.unitPriceEth}`, text: `O preço de ${item.name} mudou de ${formatEthDisplay(before.unitPriceEth)} para ${formatEthDisplay(item.unitPriceEth)} ETH.` });
    }
    if (before.available !== item.available) {
      out.push({
        id: `${item.id}:avail:${item.available}`,
        text: item.available === 0 ? `${item.name} esgotou.` : `A disponibilidade de ${item.name} mudou para ${item.available} unidade(s).`,
      });
    }
  }
  return out;
}

/** Avisos de mudanças externas (eventos, revalidação) enquanto o carrinho está aberto. */
export function useCartChanges(cart: Cart | undefined) {
  const announce = useAnnounce();
  const [state, setState] = useState<{ prev: Cart | undefined; changes: CartChange[]; message: string }>({ prev: cart, changes: [], message: '' });

  if (state.prev !== cart) {
    const found = state.prev && cart && state.prev.id === cart.id ? diffCart(state.prev, cart) : [];
    setState({
      prev: cart,
      changes: found.length ? [...state.changes.filter((o) => !found.some((f) => f.id === o.id)), ...found] : state.changes,
      message: found.length ? found.map((f) => f.text).join(' ') : state.message,
    });
  }

  const { message } = state;
  useEffect(() => { if (message) announce(message, 'assertive'); }, [message, announce]);

  return { changes: state.changes, dismiss: () => setState((s) => ({ ...s, changes: [], message: '' })) };
}
