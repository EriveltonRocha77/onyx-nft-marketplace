export const PASSWORD = 'Onyx#2026';
const ITERATIONS = 50_000;

export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  );
  return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, '0')).join('');
}

export interface FixtureWallet {
  id: string;
  label: string;
  address: string;
  role: 'primary' | 'secondary';
  network: 'ethereum' | 'polygon' | 'base';
  connected: boolean;
}

export interface FixtureUser {
  id: string;
  name: string;
  displayName: string;
  email: string;
  bio: string;
  avatarUrl: string | null;
  salt: string;
  passwordHash: string;
  wallets: FixtureWallet[];
  favorites: string[];
}

export const fixtureUsers: FixtureUser[] = [
  {
    id: 'user-ana',
    name: 'Ana Souza',
    displayName: 'ana.eth',
    email: 'ana@onyx.test',
    bio: 'Colecionadora de arte generativa.',
    avatarUrl: '/avatars/ana.svg',
    salt: 'onyx-salt-ana-7f3a',
    passwordHash: 'a0f5e1c38c90fc3f12764e8a87cd875c2db9c774a4f34bd8fa65a458ad2c59dc',
    wallets: [
      { id: 'wal-ana-1', label: 'Carteira principal', address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', role: 'primary', network: 'ethereum', connected: false },
      { id: 'wal-ana-2', label: 'Carteira secundária', address: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', role: 'secondary', network: 'polygon', connected: false },
    ],
    favorites: ['nft-002', 'nft-007'],
  },
  {
    id: 'user-bruno',
    name: 'Bruno Lima',
    displayName: 'bruno.lima',
    email: 'bruno@onyx.test',
    bio: 'Interessado em música e jogos.',
    avatarUrl: '/avatars/bruno.svg',
    salt: 'onyx-salt-bruno-b91c',
    passwordHash: '342fbf0821cf8beed64e549c24dcdae54939b29f0c613ccef666977a49e2ffa9',
    wallets: [
      { id: 'wal-bruno-1', label: 'Carteira principal', address: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30', role: 'primary', network: 'base', connected: false },
    ],
    favorites: ['nft-011'],
  },
];
