import { configureApi } from '../shared/api/client';
import { setScenario } from './scenarios/engine';
import { resetDb } from './store';
import { PASSWORD } from './fixtures/users';
import { api } from '../shared/api/client';
import type { AuthResponse } from '../shared/api/schemas';

export function resetMocks(): void {
  localStorage.clear();
  resetDb();
  setScenario('default');
  setScenario({ latency: 0 });
  configureApi({ getToken: () => null, getCartId: () => null, onSessionExpired: () => {} });
}

export async function loginAs(email: string): Promise<string> {
  const res = await api.post<AuthResponse>('/auth/login', { email, password: PASSWORD });
  return res.data.token;
}

export const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });
