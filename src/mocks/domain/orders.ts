import type { Order } from '../../shared/api/schemas';
import { getConfig } from '../scenarios/engine';
import { getDb, mutate, type OrderRecord } from '../store';
import { publish } from './events';

const hex = (seed: string, len: number): string => {
  let h = 2166136261;
  let out = '';
  for (let i = 0; out.length < len; i++) {
    h = Math.imul(h ^ (seed.charCodeAt(i % seed.length) + i), 16777619) >>> 0;
    out += h.toString(16).padStart(8, '0');
  }
  return out.slice(0, len);
};

export const txHashFor = (orderId: string): string => `0x${hex(orderId, 64)}`;

export function orderView(r: OrderRecord): Order {
  const { userId: _u, resolveAt: _r, outcome: _o, idempotencyKey: _k, ...order } = r;
  return order;
}

/** Aplica o resultado do processador simulado a um pedido pendente. Idempotente: estados terminais não mudam. */
export function resolveOrder(orderId: string): OrderRecord | null {
  const current = getDb().orders[orderId];
  if (!current || current.status !== 'pending') return current ?? null;
  const now = new Date().toISOString();
  const touchedNfts = new Set<string>();

  mutate((db) => {
    const o = db.orders[orderId]!;
    let outcome = o.outcome;
    let reason: string | null = null;

    if (outcome === 'confirmed') {
      const insufficient = o.receipt.lines.some((l) => {
        const e = db.nfts.find((n) => n.id === l.nftId)?.editions.find((x) => x.id === l.editionId);
        return !e || e.available < l.quantity;
      });
      if (insufficient) { outcome = 'declined'; reason = 'Estoque insuficiente no momento da confirmação.'; }
    } else {
      reason = 'Pagamento recusado pela operadora simulada.';
    }

    if (outcome === 'confirmed') {
      for (const l of o.receipt.lines) {
        const nft = db.nfts.find((n) => n.id === l.nftId)!;
        const e = nft.editions.find((x) => x.id === l.editionId)!;
        e.available -= l.quantity;
        nft.availableTotal = nft.editions.reduce((a, x) => a + x.available, 0);
        nft.version += 1;
        touchedNfts.add(nft.id);
      }
      // remove do carrinho só o que foi comprado
      const cart = Object.values(db.carts).find((c) => c.ownerKey === `user:${o.userId}`);
      if (cart) {
        for (const l of o.receipt.lines) {
          const item = cart.items.find((i) => i.nftId === l.nftId && i.editionId === l.editionId);
          if (item) item.quantity -= l.quantity;
        }
        cart.items = cart.items.filter((i) => i.quantity > 0);
        if (cart.items.length === 0) cart.couponCode = null;
        cart.version += 1;
      }
      o.receipt.txHash = txHashFor(o.id);
      o.receipt.confirmedAt = now;
    }
    o.status = outcome;
    o.declineReason = reason;
    o.updatedAt = now;
    o.version += 1;
    o.resolveAt = null;
  });

  for (const id of touchedNfts) publish({ kind: 'nft', nftId: id });
  publish({ kind: 'order', orderId, userId: current.userId });
  return getDb().orders[orderId]!;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

/** Agenda a resolução; se já venceu (ex.: após refresh), resolve na hora. */
export function scheduleResolution(order: OrderRecord): void {
  if (order.status !== 'pending' || !order.resolveAt) return;
  if (timers.has(order.id)) return;
  const wait = Math.max(0, new Date(order.resolveAt).getTime() - Date.now());
  timers.set(order.id, setTimeout(() => { timers.delete(order.id); resolveOrder(order.id); }, wait));
}

/** Resolve pedidos vencidos e reagenda os demais (chamado ao iniciar e a cada leitura). */
export function settleOrders(): void {
  for (const o of Object.values(getDb().orders)) {
    if (o.status !== 'pending' || !o.resolveAt) continue;
    if (new Date(o.resolveAt).getTime() <= Date.now()) resolveOrder(o.id);
    else scheduleResolution(o);
  }
}

export function clearOrderTimers(): void {
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
}

export const paymentDelay = (): number => getConfig().paymentDelayMs;
