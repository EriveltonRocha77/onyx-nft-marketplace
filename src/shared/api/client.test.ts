import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, configureApi } from './client';
import { ApiError } from './errors';

const seen: Record<string, string | null>[] = [];
const server = setupServer(
  http.get('*/api/echo', ({ request }) => {
    seen.push({ auth: request.headers.get('authorization'), cart: request.headers.get('x-cart-id') });
    return HttpResponse.json({ ok: true });
  }),
  http.get('*/api/expired', () => HttpResponse.json({ error: { code: 'SESSION_EXPIRED', message: 'expirou' } }, { status: 401 })),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('cliente Axios', () => {
  const onSessionExpired = vi.fn();
  beforeEach(() => {
    seen.length = 0;
    onSessionExpired.mockReset();
    configureApi({ getToken: () => 'tok_123', getCartId: () => 'cart_9', onSessionExpired });
  });

  it('envia Authorization e X-Cart-Id a partir dos getters', async () => {
    await api.get('/echo');
    expect(seen[0]).toEqual({ auth: 'Bearer tok_123', cart: 'cart_9' });
  });
  it('duas respostas SESSION_EXPIRED simultâneas chamam onSessionExpired uma única vez', async () => {
    const results = await Promise.allSettled([api.get('/expired'), api.get('/expired')]);
    expect(results.every((r) => r.status === 'rejected')).toBe(true);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });
  it('rejeita com ApiError tipado', async () => {
    const err = await api.get('/expired').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('SESSION_EXPIRED');
  });
});
