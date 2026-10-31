import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { nftSchema } from '@/shared/api/schemas';
import { fixtureCoupons, fixtureNetworks } from './catalog-meta';
import { buildNfts } from './nfts';
import { createPrng } from './prng';
import { PASSWORD, fixtureUsers, hashPassword } from './users';

describe('PRNG', () => {
  it('é determinístico por semente', () => {
    const a = createPrng(7);
    const b = createPrng(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(createPrng(7)()).not.toBe(createPrng(8)());
  });
});

describe('buildNfts', () => {
  const nfts = buildNfts();
  it('devolve 48 NFTs válidos com ids únicos', () => {
    expect(nfts).toHaveLength(48);
    expect(new Set(nfts.map((n) => n.id)).size).toBe(48);
    for (const n of nfts) expect(nftSchema.safeParse(n).success).toBe(true);
  });
  it('tem 6 coleções, 4 categorias, esgotados, edições múltiplas e destaques', () => {
    expect(new Set(nfts.map((n) => n.collection.id)).size).toBe(6);
    expect(new Set(nfts.map((n) => n.category.id)).size).toBe(4);
    expect(nfts.filter((n) => n.availableTotal === 0).length).toBeGreaterThanOrEqual(4);
    expect(nfts.filter((n) => n.editions.length > 1).length).toBeGreaterThanOrEqual(8);
    expect(nfts.filter((n) => n.featured).length).toBeGreaterThanOrEqual(4);
  });
  it('é idêntico a cada chamada', () => {
    expect(JSON.stringify(buildNfts())).toBe(JSON.stringify(nfts));
  });
  it('cada NFT referencia 3 a 4 imagens que existem em public/', () => {
    for (const n of nfts) {
      expect(n.images.length).toBeGreaterThanOrEqual(3);
      expect(n.images.length).toBeLessThanOrEqual(4);
      for (const img of n.images) expect(existsSync(`public${img}`), img).toBe(true);
    }
  });
  it('priceFromEth é o menor preço entre as edições', () => {
    for (const n of nfts) {
      const min = n.editions.map((e) => BigInt(e.priceEth.replace('.', ''))).reduce((a, b) => (a < b ? a : b));
      expect(BigInt(n.priceFromEth.replace('.', ''))).toBe(min);
    }
  });
});

describe('usuários e metadados', () => {
  it('tem ao menos 2 usuários e nenhuma senha em claro', () => {
    expect(fixtureUsers.length).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(fixtureUsers)).not.toContain(PASSWORD);
  });
  it('hashPassword confere com o hash guardado de cada usuário', async () => {
    for (const u of fixtureUsers) expect(await hashPassword(PASSWORD, u.salt)).toBe(u.passwordHash);
  });
  it('hash difere para senha errada', async () => {
    const u = fixtureUsers[0]!;
    expect(await hashPassword('errada123', u.salt)).not.toBe(u.passwordHash);
  });
  it('Ana tem duas carteiras, Bruno uma, e avatares existem', () => {
    const ana = fixtureUsers.find((u) => u.email === 'ana@onyx.test')!;
    const bruno = fixtureUsers.find((u) => u.email === 'bruno@onyx.test')!;
    expect(ana.wallets.map((w) => w.role).sort()).toEqual(['primary', 'secondary']);
    expect(bruno.wallets).toHaveLength(1);
    for (const u of fixtureUsers) if (u.avatarUrl) expect(existsSync(`public${u.avatarUrl}`)).toBe(true);
  });
  it('3 redes e 3 cupons com os valores definidos', () => {
    expect(fixtureNetworks.map((n) => [n.id, n.feeEth])).toEqual([
      ['ethereum', '0.002100000000000000'],
      ['polygon', '0.000400000000000000'],
      ['base', '0.000200000000000000'],
    ]);
    expect(fixtureCoupons.map((c) => c.coupon.code).sort()).toEqual(['EXPIRED20', 'ONYX10', 'WELCOME005']);
    expect(fixtureCoupons.find((c) => c.coupon.code === 'EXPIRED20')!.expiresAt!.localeCompare('2026-01-01')).toBeLessThan(0);
  });
  it('avatar é SVG', () => {
    expect(readFileSync('public/avatars/ana.svg', 'utf8').startsWith('<svg')).toBe(true);
  });
});
