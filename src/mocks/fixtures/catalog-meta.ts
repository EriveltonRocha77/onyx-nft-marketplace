import { parseEth, type Wei } from '../../shared/money/decimal';
import type { Coupon } from '../../shared/money/pricing';

export const fixtureCollections = [
  { id: 'neon-drift', name: 'Neon Drift', hue: 84 },
  { id: 'obsidian-garden', name: 'Obsidian Garden', hue: 150 },
  { id: 'pixel-tide', name: 'Pixel Tide', hue: 190 },
  { id: 'quiet-machines', name: 'Quiet Machines', hue: 40 },
  { id: 'lime-orbit', name: 'Lime Orbit', hue: 70 },
  { id: 'static-bloom', name: 'Static Bloom', hue: 320 },
] as const;

export const fixtureCategories = [
  { id: 'art', name: 'Arte' },
  { id: 'music', name: 'Música' },
  { id: 'collectibles', name: 'Colecionáveis' },
  { id: 'games', name: 'Jogos' },
] as const;

export interface FixtureNetwork {
  id: 'ethereum' | 'polygon' | 'base';
  label: string;
  feeEth: string;
}

export const fixtureNetworks: FixtureNetwork[] = [
  { id: 'ethereum', label: 'Ethereum', feeEth: '0.002100000000000000' },
  { id: 'polygon', label: 'Polygon', feeEth: '0.000400000000000000' },
  { id: 'base', label: 'Base', feeEth: '0.000200000000000000' },
];

export interface FixtureCoupon {
  coupon: Coupon;
  expiresAt: string | null;
}

export const fixtureCoupons: FixtureCoupon[] = [
  { coupon: { code: 'ONYX10', kind: 'percent', bps: 1000 }, expiresAt: null },
  { coupon: { code: 'WELCOME005', kind: 'fixed', amount: parseEth('0.05') as Wei }, expiresAt: null },
  { coupon: { code: 'EXPIRED20', kind: 'percent', bps: 2000 }, expiresAt: '2025-12-31T00:00:00.000Z' },
];
