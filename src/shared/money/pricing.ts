import { MoneyError, mulInt, percentOf, type Wei } from './decimal';

export type Coupon =
  | { code: string; kind: 'percent'; bps: number }
  | { code: string; kind: 'fixed'; amount: Wei };

export interface SummaryInput {
  lines: { unitPrice: Wei; quantity: number }[];
  coupon: Coupon | null;
  networkFee: Wei;
}

export interface Summary {
  subtotal: Wei;
  discount: Wei;
  networkFee: Wei;
  total: Wei;
}

export function computeSummary(input: SummaryInput): Summary {
  if (input.networkFee < 0n) throw new MoneyError('Taxa negativa');
  const subtotal = input.lines.reduce((acc, l) => acc + mulInt(l.unitPrice, l.quantity), 0n);
  if (subtotal === 0n) return { subtotal: 0n, discount: 0n, networkFee: 0n, total: 0n };
  let discount = 0n;
  if (input.coupon) {
    discount = input.coupon.kind === 'percent' ? percentOf(subtotal, input.coupon.bps) : input.coupon.amount;
    if (discount > subtotal) discount = subtotal;
  }
  return { subtotal, discount, networkFee: input.networkFee, total: subtotal - discount + input.networkFee };
}
