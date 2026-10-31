import type { Network, Nft, Order, Quote } from '../../shared/api/schemas';
import { buildNfts } from '../fixtures/nfts';
import { fixtureUsers, type FixtureWallet } from '../fixtures/users';

export const SCHEMA_VERSION = 1;

export interface UserRecord {
  id: string;
  name: string;
  displayName: string;
  email: string;
  bio: string;
  avatarUrl: string | null;
  salt: string;
  passwordHash: string;
}

export interface SessionRecord {
  token: string;
  userId: string;
  expiresAt: string;
  expired: boolean;
}

export interface CartItemRecord {
  id: string;
  nftId: string;
  editionId: string;
  quantity: number;
}

export interface CartRecord {
  id: string;
  /** `user:<id>` ou `guest:<cartId>` */
  ownerKey: string;
  items: CartItemRecord[];
  couponCode: string | null;
  network: Network;
  version: number;
}

export interface OrderRecord extends Order {
  userId: string;
  /** Instante em que o processador simulado resolve o pedido. */
  resolveAt: string | null;
  /** Resultado decidido na criação (cenário vigente naquele momento). */
  outcome: 'confirmed' | 'declined';
  idempotencyKey: string;
}

export interface QuoteRecord extends Quote {
  userId: string;
  cartVersion: number;
}

export interface IdempotencyRecord {
  userId: string;
  fingerprint: string;
  orderId: string;
}

export interface MockDb {
  schemaVersion: number;
  users: UserRecord[];
  nfts: Nft[];
  favorites: Record<string, string[]>;
  wallets: Record<string, FixtureWallet[]>;
  carts: Record<string, CartRecord>;
  orders: Record<string, OrderRecord>;
  quotes: Record<string, QuoteRecord>;
  idempotency: Record<string, IdempotencyRecord>;
  sessions: Record<string, SessionRecord>;
  /** Maior versão emitida por recurso (`kind:id`). */
  versions: Record<string, number>;
  seq: number;
}

export function createDb(): MockDb {
  const users: UserRecord[] = fixtureUsers.map((u) => ({
    id: u.id,
    name: u.name,
    displayName: u.displayName,
    email: u.email,
    bio: u.bio,
    avatarUrl: u.avatarUrl,
    salt: u.salt,
    passwordHash: u.passwordHash,
  }));
  return {
    schemaVersion: SCHEMA_VERSION,
    users,
    nfts: buildNfts(),
    favorites: Object.fromEntries(fixtureUsers.map((u) => [u.id, [...u.favorites]])),
    wallets: Object.fromEntries(fixtureUsers.map((u) => [u.id, u.wallets.map((w) => ({ ...w }))])),
    carts: {},
    orders: {},
    quotes: {},
    idempotency: {},
    sessions: {},
    versions: {},
    seq: 0,
  };
}

const COLLECTIONS = ['users', 'nfts', 'favorites', 'wallets', 'carts', 'orders', 'quotes', 'idempotency', 'sessions', 'versions'] as const;

export function isMockDb(value: unknown): value is MockDb {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v['schemaVersion'] !== SCHEMA_VERSION || typeof v['seq'] !== 'number') return false;
  if (!Array.isArray(v['users']) || !Array.isArray(v['nfts'])) return false;
  return COLLECTIONS.filter((k) => k !== 'users' && k !== 'nfts').every((k) => typeof v[k] === 'object' && v[k] !== null && !Array.isArray(v[k]));
}
