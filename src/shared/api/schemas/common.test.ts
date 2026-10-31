import { describe, expect, it } from 'vitest';
import { ethString } from './common';

describe('ethString', () => {
  it('aceita decimais canônicos', () => {
    expect(ethString.safeParse('0.125000000000000000').success).toBe(true);
    expect(ethString.safeParse('1').success).toBe(true);
  });
  it.each(['1e-3', '-1', '', '0.1234567890123456789', '1,5'])('rejeita %j', (v) => expect(ethString.safeParse(v).success).toBe(false));
});
