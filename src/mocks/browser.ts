import { setupWorker } from 'msw/browser';
import { mockControl, type MockControl } from './control';
import { settleOrders } from './domain/orders';
import { handlers } from './handlers';
import { isScenarioName } from './scenarios/presets';
import { setScenario } from './scenarios/engine';

declare global {
  interface Window {
    __mock?: MockControl;
  }
}

const SCENARIO_KEY = 'onyx:mock:scenario';

function initialScenario() {
  const fromUrl = new URLSearchParams(window.location.search).get('scenario');
  if (isScenarioName(fromUrl)) {
    try { sessionStorage.setItem(SCENARIO_KEY, fromUrl); } catch { /* ignora */ }
    return fromUrl;
  }
  let stored: string | null = null;
  try { stored = sessionStorage.getItem(SCENARIO_KEY); } catch { /* ignora */ }
  if (isScenarioName(stored)) return stored;
  const fromEnv: unknown = import.meta.env.VITE_DEFAULT_SCENARIO;
  return isScenarioName(fromEnv) ? fromEnv : 'default';
}

export async function startMocks(): Promise<void> {
  setScenario(initialScenario());
  window.__mock = mockControl;
  settleOrders(); // pedidos pendentes de uma carga anterior continuam de onde pararam
  const worker = setupWorker(...handlers);
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true, serviceWorker: { url: '/mockServiceWorker.js' } });
}
