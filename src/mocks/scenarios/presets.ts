import type { ScenarioConfig, ScenarioName } from './types';

const base: ScenarioConfig = {
  latency: 80,
  failures: [],
  payment: 'confirmed',
  paymentDelayMs: 1500,
  orderTimeout: false,
  orderTimeoutDelayMs: 15_000,
  walletRefused: false,
  emptyCatalog: false,
  offline: false,
  expireNextAuthed: false,
  priceChangeOnOrder: false,
  soldOutOnOrder: false,
};

const make = (patch: Partial<ScenarioConfig>): ScenarioConfig => ({ ...base, ...patch, failures: [...(patch.failures ?? [])] });

export const scenarios: Record<ScenarioName, ScenarioConfig> = {
  default: make({}),
  empty: make({ emptyCatalog: true }),
  slow: make({ latency: 2500 }),
  'variable-latency': make({ latency: { min: 50, max: 2500, seed: 42 } }),
  'network-error': make({ failures: [{ match: 'GET /api/nfts', times: 'always', response: 'network-error' }] }),
  'server-error': make({
    failures: [
      { match: 'GET /api/nfts', times: 'always', response: { status: 500, code: 'TRANSIENT' } },
      { match: 'GET /api/cart', times: 'always', response: { status: 503, code: 'TRANSIENT' } },
    ],
  }),
  flaky: make({ failures: [{ match: 'GET /api/nfts', times: 2, response: { status: 503, code: 'TRANSIENT' } }] }),
  forbidden: make({
    failures: [
      { match: 'GET /api/wallets', times: 'always', response: { status: 403, code: 'FORBIDDEN' } },
      { match: 'GET /api/nfts/nft-013', times: 'always', response: { status: 404, code: 'NOT_FOUND' } },
    ],
  }),
  'session-expired': make({ expireNextAuthed: true }),
  'price-changed': make({ priceChangeOnOrder: true }),
  'sold-out': make({ soldOutOnOrder: true }),
  'order-timeout': make({ orderTimeout: true }),
  'payment-confirmed': make({ payment: 'confirmed' }),
  'payment-declined': make({ payment: 'declined' }),
  'wallet-refused': make({ walletRefused: true }),
  offline: make({ offline: true }),
};

export const scenarioNames = Object.keys(scenarios) as ScenarioName[];

export function isScenarioName(value: unknown): value is ScenarioName {
  return typeof value === 'string' && value in scenarios;
}
