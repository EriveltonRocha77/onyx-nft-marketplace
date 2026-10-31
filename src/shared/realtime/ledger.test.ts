import { describe, expect, it } from 'vitest';
import { createLedger } from './ledger';

const ev = (id: string, version: number, rid = 'nft-1', kind: 'nft' | 'order' = 'nft') => ({ id, version, resource: { kind, id: rid } });

describe('ledger', () => {
  it('aceita versões crescentes', () => {
    const l = createLedger();
    expect(l.accept(ev('a', 2))).toBe(true);
    expect(l.accept(ev('b', 3))).toBe(true);
  });
  it('rejeita duplicatas pelo id', () => {
    const l = createLedger();
    expect(l.accept(ev('a', 2))).toBe(true);
    expect(l.accept(ev('a', 2))).toBe(false);
  });
  it('rejeita eventos antigos ou da mesma versão com id novo', () => {
    const l = createLedger();
    l.accept(ev('a', 5));
    expect(l.accept(ev('b', 4))).toBe(false);
    expect(l.accept(ev('c', 5))).toBe(false);
  });
  it('versões são independentes por recurso', () => {
    const l = createLedger();
    l.accept(ev('a', 9, 'nft-1'));
    expect(l.accept(ev('b', 1, 'nft-2'))).toBe(true);
    expect(l.accept(ev('c', 1, 'nft-1', 'order'))).toBe(true);
  });
  it('limita a memória de ids', () => {
    const l = createLedger(3);
    for (let i = 1; i <= 10; i++) l.accept(ev(`e${i}`, i));
    expect(l.size()).toBeLessThanOrEqual(3);
  });
});
