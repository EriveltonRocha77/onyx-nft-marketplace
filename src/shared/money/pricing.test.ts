import { describe, expect, it } from 'vitest';
import { parseEth, toDecimalString } from './decimal';
import { computeSummary, type Coupon } from './pricing';

const lines = [{ unitPrice: parseEth('0.125'), quantity: 2 }, { unitPrice: parseEth('0.5'), quantity: 1 }];
const fee = parseEth('0.0021');
const onyx10: Coupon = { code: 'ONYX10', kind: 'percent', bps: 1000 };
const welcome: Coupon = { code: 'WELCOME005', kind: 'fixed', amount: parseEth('0.05') };

describe('computeSummary', () => {
  it('ONYX10: subtotal 0.75, desconto 0.075, total 0.6771', () => {
    const s = computeSummary({ lines, coupon: onyx10, networkFee: fee });
    expect(toDecimalString(s.subtotal)).toBe('0.750000000000000000');
    expect(toDecimalString(s.discount)).toBe('0.075000000000000000');
    expect(toDecimalString(s.total)).toBe('0.677100000000000000');
  });
  it('WELCOME005: total 0.7021', () => {
    expect(toDecimalString(computeSummary({ lines, coupon: welcome, networkFee: fee }).total)).toBe('0.702100000000000000');
  });
  it('limita desconto fixo ao subtotal', () => {
    const s = computeSummary({ lines: [{ unitPrice: parseEth('0.01'), quantity: 1 }], coupon: welcome, networkFee: fee });
    expect(s.discount).toBe(parseEth('0.01'));
    expect(s.total).toBe(fee);
  });
  it('sem linhas a taxa é zero', () => {
    expect(computeSummary({ lines: [], coupon: null, networkFee: fee })).toEqual({ subtotal: 0n, discount: 0n, networkFee: 0n, total: 0n });
  });
});
