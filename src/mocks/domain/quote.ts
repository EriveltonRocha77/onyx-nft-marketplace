import type { Network, Quote } from '../../shared/api/schemas';
import { cartView, findCoupon, summaryFor } from './cart';
import { getDb, mutate, type CartRecord, type QuoteRecord } from '../store';

export const QUOTE_TTL_MS = 10 * 60 * 1000;

export type QuoteBuild = { quote: Omit<Quote, 'quoteId' | 'version' | 'expiresAt'> } | { conflict: { nftId: string; editionId: string; name: string; requested: number; available: number }[] };

/** Monta os dados da cotação a partir do carrinho atual, verificando disponibilidade. */
export function buildQuote(cart: CartRecord, network: Network, walletId: string | null): QuoteBuild {
  const view = cartView(cart);
  const conflict = view.items
    .filter((i) => i.quantity > i.available)
    .map((i) => ({ nftId: i.nftId, editionId: i.editionId, name: i.name, requested: i.quantity, available: i.available }));
  if (conflict.length) return { conflict };
  const found = view.coupon ? findCoupon(view.coupon.code) : null;
  const couponOk = view.coupon && found && !found.expired ? view.coupon.code : null;
  const lines = view.items.map((i) => ({
    nftId: i.nftId, editionId: i.editionId, name: i.name, editionLabel: i.editionLabel,
    quantity: i.quantity, unitPriceEth: i.unitPriceEth, lineTotalEth: i.lineTotalEth,
  }));
  return { quote: { network, walletId, couponCode: couponOk, lines, summary: summaryFor(lines, couponOk, network) } };
}

export function storeQuote(userId: string, cart: CartRecord, data: Extract<QuoteBuild, { quote: unknown }>['quote']): QuoteRecord {
  const id = `quo_${getDb().seq + 1}`;
  const record: QuoteRecord = {
    ...data, quoteId: id, userId, cartVersion: cart.version,
    version: getDb().seq + 1, expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
  };
  mutate((db) => { db.seq += 1; db.quotes[id] = record; });
  return getDb().quotes[id]!;
}

export const quoteView = (q: QuoteRecord): Quote => ({
  quoteId: q.quoteId, version: q.version, network: q.network, walletId: q.walletId, couponCode: q.couponCode, lines: q.lines, summary: q.summary, expiresAt: q.expiresAt,
});

/** Duas cotações equivalem quando linhas, cupom, rede e totais coincidem. */
export function sameQuote(a: Pick<Quote, 'lines' | 'summary' | 'couponCode' | 'network'>, b: Pick<Quote, 'lines' | 'summary' | 'couponCode' | 'network'>): boolean {
  return JSON.stringify([a.network, a.couponCode, a.lines, a.summary]) === JSON.stringify([b.network, b.couponCode, b.lines, b.summary]);
}
