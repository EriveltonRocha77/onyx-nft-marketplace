import axios, { type AxiosInstance } from 'axios';
import type { z } from 'zod';
import { ApiError, toApiError } from './errors';

export interface ApiConfig {
  getToken: () => string | null;
  getCartId: () => string | null;
  onSessionExpired: () => void;
}

const env = import.meta.env;

export const api: AxiosInstance = axios.create({
  baseURL: env.VITE_API_BASE_URL ?? '/api',
  timeout: Number(env.VITE_API_TIMEOUT_MS ?? 10_000),
});

let config: ApiConfig = { getToken: () => null, getCartId: () => null, onSessionExpired: () => {} };
let expiredHandled = false;

export function configureApi(next: ApiConfig): void {
  config = next;
  expiredHandled = false;
}

export function resetSessionExpiredGuard(): void {
  expiredHandled = false;
}

api.interceptors.request.use((request) => {
  const token = config.getToken();
  const cartId = config.getCartId();
  if (token) request.headers.set('Authorization', `Bearer ${token}`);
  if (cartId) request.headers.set('X-Cart-Id', cartId);
  return request;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error);
    if (apiError.code === 'SESSION_EXPIRED' && !expiredHandled) {
      expiredHandled = true;
      config.onSessionExpired();
    }
    return Promise.reject(apiError);
  },
);

export function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ApiError({ status: 0, code: 'UNKNOWN', message: 'Resposta fora do contrato esperado.', details: result.error.issues });
  }
  return result.data;
}
