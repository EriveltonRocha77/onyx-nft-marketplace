import type { Cart, CartItem, Network, SummaryDto } from '../../shared/api/schemas';
import { parseEth, toDecimalString, mulInt } from '../../shared/money/decimal';
import { computeSummary, type Coupon } from '../../shared/money/pricing';
import { fixtureCoupons, fixtureNetworks } from '../fixtures/catalog-meta';
import { getDb, type CartRecord, type MockDb } from '../store';

export const MAX_PER_LINE = 10;

export function findCoupon(code: string): { coupon: Coupon; expired: boolean } | null {
  const found = fixtureCoupons.find((c) => c.coupon.code === code.trim().toUpperCase());
  if (!found) return null;
  return { coupon: found.coupon, expired: found.expiresAt !== null && new Date(found.expiresAt).getTime() < Date.now() };
}

export function networkFee(network: Network): bigint {
  return parseEth(fixtureNetworks.find((n) => n.id === network)!.feeEth);
}

export function summaryFor(lines: { unitPriceEth: string; quantity: number }[], couponCode: string | null, network: Network): SummaryDto {
  const coupon = couponCode ? findCoupon(couponCode) : null;
  const s = computeSummary({
    lines: lines.map((l) => ({ unitPrice: parseEth(l.unitPriceEth), quantity: l.quantity })),
    coupon: coupon && !coupon.expired ? coupon.coupon : null,
    networkFee: networkFee(network),
  });
  return { subtotalEth: toDecimalString(s.subtotal), discountEth: toDecimalString(s.discount), networkFeeEth: toDecimalString(s.networkFee), totalEth: toDecimalString(s.total) };
}

export function itemView(db: MockDb, item: CartRecord['items'][number]): CartItem | null {
  const nft = db.nfts.find((n) => n.id === item.nftId);
  const edition = nft?.editions.find((e) => e.id === item.editionId);
  if (!nft || !edition) return null;
  return {
    id: item.id, nftId: nft.id, editionId: edition.id, quantity: item.quantity, name: nft.name, image: nft.images[0]!,
    editionLabel: edition.label, unitPriceEth: edition.priceEth, lineTotalEth: toDecimalString(mulInt(parseEth(edition.priceEth), item.quantity)),
    available: edition.available, nftVersion: nft.version,
  };
}

export function cartView(record: CartRecord): Cart {
  const db = getDb();
  const items = record.items.map((i) => itemView(db, i)).filter((i): i is CartItem => i !== null);
  return {
    id: record.id, items, coupon: record.couponCode ? { code: record.couponCode } : null, network: record.network,
    summary: summaryFor(items, record.couponCode, record.network), version: record.version,
  };
}
