import { HttpResponse } from 'msw';
import { createPrng } from '../fixtures/prng';
import { scenarios } from './presets';
import type { FailureResponse, LatencyRule, ScenarioConfig, ScenarioName } from './types';

let config: ScenarioConfig = structuredClone(scenarios.default);
let currentName: ScenarioName | 'custom' = 'default';
let failureCounts = new Map<number, number>();
let rng: () => number = createPrng(1);
const delayQueue: { matcher: string; ms: number }[] = [];
const failQueue: { matcher: string; response: FailureResponse }[] = [];

function seedRng(): void {
  rng = createPrng(typeof config.latency === 'object' ? config.latency.seed : 1);
}

export function getConfig(): ScenarioConfig {
  return config;
}

export function getScenarioName(): ScenarioName | 'custom' {
  return currentName;
}

export function setScenario(nameOrPatch: ScenarioName | Partial<ScenarioConfig>): void {
  if (typeof nameOrPatch === 'string') {
    config = structuredClone(scenarios[nameOrPatch]);
    currentName = nameOrPatch;
  } else {
    config = { ...config, ...nameOrPatch };
    currentName = 'custom';
  }
  failureCounts = new Map();
  delayQueue.length = 0;
  failQueue.length = 0;
  seedRng();
}

export function setLatency(rule: LatencyRule): void {
  config = { ...config, latency: rule };
  seedRng();
}

export function nextLatency(): number {
  const l = config.latency;
  if (typeof l === 'number') return l;
  return Math.round(l.min + rng() * (l.max - l.min));
}

export function delayNext(matcher: string, ms: number): void {
  delayQueue.push({ matcher, ms });
}

export function failNext(matcher: string, response: FailureResponse): void {
  failQueue.push({ matcher, response });
}

function matches(matcher: string, method: string, pathname: string): boolean {
  if (matcher === '*') return true;
  return `${method} ${pathname}`.startsWith(matcher) || pathname.startsWith(matcher);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function failureResponse(response: FailureResponse): Response {
  if (response === 'network-error') return HttpResponse.error();
  return HttpResponse.json(
    { error: { code: response.code, message: `Falha simulada (${response.status}).` }, requestId: 'req_sim' },
    { status: response.status },
  );
}

/** Aplica latência e falhas do cenário. Devolve uma resposta se a chamada deve falhar. */
export async function applyScenario(request: Request): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  const method = request.method.toUpperCase();

  let wait = nextLatency();
  const dq = delayQueue.findIndex((d) => matches(d.matcher, method, pathname));
  if (dq >= 0) wait += delayQueue.splice(dq, 1)[0]!.ms;
  if (wait > 0) await sleep(wait);

  if (config.offline) return HttpResponse.error();

  const fq = failQueue.findIndex((f) => matches(f.matcher, method, pathname));
  if (fq >= 0) return failureResponse(failQueue.splice(fq, 1)[0]!.response);

  for (const [i, rule] of config.failures.entries()) {
    if (!matches(rule.match, method, pathname)) continue;
    const used = failureCounts.get(i) ?? 0;
    if (rule.times !== 'always' && used >= rule.times) continue;
    failureCounts.set(i, used + 1);
    return failureResponse(rule.response);
  }
  return null;
}
