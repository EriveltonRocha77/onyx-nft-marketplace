import { useEffect, useState } from 'react';
import type { Nft } from '../../shared/api/schemas';
import { formatEthDisplay } from '../../shared/money/decimal';
import { useAnnounce } from '../../shared/ui/live-announcer';

/** Descreve o que mudou entre duas versões do mesmo NFT (preço e disponibilidade por edição). */
export function diffNft(prev: Nft, next: Nft): string[] {
  const out: string[] = [];
  for (const e of next.editions) {
    const before = prev.editions.find((x) => x.id === e.id);
    if (!before) continue;
    const label = next.editions.length > 1 ? ` (${e.label})` : '';
    if (before.priceEth !== e.priceEth) out.push(`O preço${label} mudou de ${formatEthDisplay(before.priceEth)} para ${formatEthDisplay(e.priceEth)} ETH.`);
    if (before.available !== e.available) out.push(e.available === 0 ? `A edição${label} esgotou.` : `A disponibilidade${label} mudou para ${e.available} unidade(s).`);
  }
  return out;
}

/** Avisos visíveis e anunciados quando o NFT aberto muda por evento em tempo real ou revalidação. */
export function useNftChanges(nft: Nft | undefined) {
  const announce = useAnnounce();
  const [state, setState] = useState<{ prev: Nft | undefined; notes: string[] }>({ prev: nft, notes: [] });
  if (state.prev !== nft) {
    const found = state.prev && nft && state.prev.id === nft.id ? diffNft(state.prev, nft) : [];
    setState({ prev: nft, notes: found.length ? found : state.notes });
  }
  const text = state.notes.join(' ');
  useEffect(() => { if (text) announce(text, 'assertive'); }, [text, announce]);
  return { notes: state.notes, dismiss: () => setState((s) => ({ ...s, notes: [] })) };
}
