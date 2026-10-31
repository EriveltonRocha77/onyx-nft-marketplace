/**
 * Barramento de eventos de domínio do mock. As mutações de estado (preço, estoque, pedido) publicam aqui;
 * o handler Socket.IO assina e converte em eventos de rede. Assim REST e socket nunca divergem.
 */
export type DomainEvent =
  | { kind: 'nft'; nftId: string }
  | { kind: 'order'; orderId: string; userId: string };

type Listener = (event: DomainEvent) => void;
const listeners = new Set<Listener>();

export function onDomainEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function publish(event: DomainEvent): void {
  for (const l of [...listeners]) {
    try { l(event); } catch { /* um assinante com erro não afeta os demais */ }
  }
}
