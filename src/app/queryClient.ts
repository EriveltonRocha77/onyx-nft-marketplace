import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../shared/api/errors';

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 400;

/** GET: repete só falhas transitórias (rede, timeout, 5xx), no máximo 2 vezes. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false;
  if (!(error instanceof ApiError)) return false;
  return error.code === 'NETWORK' || error.code === 'TIMEOUT' || error.code === 'TRANSIENT' || error.status >= 500;
}

export function retryDelay(attempt: number): number {
  return BASE_DELAY_MS * 2 ** attempt;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 300_000,
        retry: shouldRetry,
        retryDelay,
        refetchOnWindowFocus: true,
      },
      mutations: { retry: 0 },
    },
  });
}

export const queryClient = createQueryClient();
