import { beforeEach, describe, expect, it } from 'vitest';
import { delayNext, nextLatency, setScenario, applyScenario, getConfig } from './engine';
import { scenarioNames } from './presets';

beforeEach(() => setScenario('default'));

describe('motor de cenários', () => {
  it('existem os 16 cenários da especificação', () => {
    expect(scenarioNames).toHaveLength(16);
    expect(scenarioNames).toEqual(expect.arrayContaining(['default', 'empty', 'slow', 'variable-latency', 'network-error', 'server-error', 'flaky', 'forbidden', 'session-expired', 'price-changed', 'sold-out', 'order-timeout', 'payment-confirmed', 'payment-declined', 'wallet-refused', 'offline']));
  });

  it('variable-latency com a mesma semente reproduz a mesma sequência', () => {
    setScenario('variable-latency');
    const a = [nextLatency(), nextLatency(), nextLatency(), nextLatency()];
    setScenario('variable-latency');
    const b = [nextLatency(), nextLatency(), nextLatency(), nextLatency()];
    expect(a).toEqual(b);
    expect(new Set(a).size).toBeGreaterThan(1);
    for (const v of a) { expect(v).toBeGreaterThanOrEqual(50); expect(v).toBeLessThanOrEqual(2500); }
  });

  it('setScenario com patch preserva o resto da configuração', () => {
    setScenario('payment-declined');
    setScenario({ latency: 0 });
    expect(getConfig().payment).toBe('declined');
    expect(getConfig().latency).toBe(0);
  });

  it('delayNext adiciona atraso só uma vez', async () => {
    setScenario({ latency: 0 });
    delayNext('/api/x', 60);
    const t0 = Date.now();
    await applyScenario(new Request('http://localhost/api/x'));
    expect(Date.now() - t0).toBeGreaterThanOrEqual(50);
    const t1 = Date.now();
    await applyScenario(new Request('http://localhost/api/x'));
    expect(Date.now() - t1).toBeLessThan(40);
  });
});
