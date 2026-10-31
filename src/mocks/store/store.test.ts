import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEY, createDb, getDb, loadDb, mutate, resetDb, saveDb } from './index';

describe('store de domínio dos mocks', () => {
  beforeEach(() => {
    localStorage.clear();
    resetDb();
  });

  it('createDb devolve instâncias independentes', () => {
    const a = createDb();
    const b = createDb();
    a.nfts[0]!.name = 'alterado';
    expect(b.nfts[0]!.name).not.toBe('alterado');
  });

  it('mutação seguida de loadDb preserva o dado', () => {
    mutate((db) => {
      db.favorites['user-ana'] = ['nft-009'];
    });
    expect(loadDb(localStorage).favorites['user-ana']).toEqual(['nft-009']);
  });

  it('resetDb restaura o estado idêntico a createDb, inclusive carrinhos, pedidos, idempotência e sessões', () => {
    mutate((db) => {
      db.carts['c1'] = { id: 'c1', ownerKey: 'guest:c1', items: [], couponCode: null, network: 'ethereum', version: 3 };
      db.idempotency['k'] = { userId: 'u', fingerprint: 'f', orderId: 'o' };
      db.sessions['t'] = { token: 't', userId: 'user-ana', expiresAt: 'x', expired: false };
      db.orders['o'] = { id: 'o' } as never;
    });
    resetDb();
    expect(JSON.stringify(getDb())).toBe(JSON.stringify(createDb()));
    expect(loadDb(localStorage)).toEqual(createDb());
  });

  it('JSON corrompido volta ao padrão sem lançar', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(() => loadDb(localStorage)).not.toThrow();
    expect(loadDb(localStorage)).toEqual(createDb());
  });

  it('schemaVersion diferente volta ao padrão', () => {
    saveDb(localStorage, { ...createDb(), schemaVersion: 999 });
    expect(loadDb(localStorage)).toEqual(createDb());
  });

  it('JSON válido mas com formato errado volta ao padrão', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, nfts: 'x' }));
    expect(loadDb(localStorage)).toEqual(createDb());
  });
});
