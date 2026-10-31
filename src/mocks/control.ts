import type { MockDb } from './store';
import { getDb, mutate, resetDb } from './store';
import { delayNext, failNext, setLatency, setScenario } from './scenarios/engine';
import type { FailureResponse, LatencyRule, ScenarioConfig, ScenarioName } from './scenarios/types';

export interface MockControl {
  setScenario(nameOrConfig: ScenarioName | Partial<ScenarioConfig>): void;
  reset(scenario?: ScenarioName): void;
  setLatency(rule: LatencyRule): void;
  delayNext(matcher: string, ms: number): void;
  failNext(matcher: string, response: FailureResponse): void;
  expireSession(): void;
  getState(): Readonly<MockDb>;
}

export const mockControl: MockControl = {
  setScenario,
  reset(scenario = 'default') {
    resetDb();
    setScenario(scenario);
  },
  setLatency,
  delayNext,
  failNext,
  expireSession() {
    mutate((db) => {
      for (const s of Object.values(db.sessions)) s.expired = true;
    });
  },
  getState: () => getDb(),
};
