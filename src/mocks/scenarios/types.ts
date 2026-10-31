import type { ErrorCode } from '../../shared/api/errors';

export type ScenarioName =
  | 'default' | 'empty' | 'slow' | 'variable-latency' | 'network-error' | 'server-error' | 'flaky' | 'forbidden'
  | 'session-expired' | 'price-changed' | 'sold-out' | 'order-timeout' | 'payment-confirmed' | 'payment-declined'
  | 'wallet-refused' | 'offline';

export type LatencyRule = number | { min: number; max: number; seed: number };

export type FailureResponse = { status: number; code: ErrorCode } | 'network-error';

export interface FailureRule {
  /** `*`, um prefixo de caminho (`/api/nfts`) ou `METHOD /caminho`. */
  match: string;
  times: number | 'always';
  response: FailureResponse;
}

export interface ScenarioConfig {
  latency: LatencyRule;
  failures: FailureRule[];
  payment: 'confirmed' | 'declined';
  paymentDelayMs: number;
  orderTimeout: boolean;
  walletRefused: boolean;
  emptyCatalog: boolean;
  offline: boolean;
  expireNextAuthed: boolean;
  priceChangeOnOrder: boolean;
  soldOutOnOrder: boolean;
}
