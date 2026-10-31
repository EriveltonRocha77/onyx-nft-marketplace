import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { api } from '../../shared/api/client';
import { ApiError } from '../../shared/api/errors';
import { PASSWORD } from '../fixtures/users';
import { mockControl } from '../control';
import { server } from '../server';
import { auth, loginAs, resetMocks } from '../test-utils';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(resetMocks);

const fail = async (p: Promise<unknown>): Promise<ApiError> => (await p.catch((e: unknown) => e)) as ApiError;

describe('handlers de sessão', () => {
  it('login de Ana devolve token e GET /session devolve o usuário dela', async () => {
    const token = await loginAs('ana@onyx.test');
    const res = await api.get('/session', auth(token));
    expect(res.data.user.id).toBe('user-ana');
  });

  it('senha errada devolve 422 com fields.password', async () => {
    const e = await fail(api.post('/auth/login', { email: 'ana@onyx.test', password: 'errada123' }));
    expect(e.status).toBe(422);
    expect(e.code).toBe('VALIDATION_ERROR');
    expect(e.fields?.['password']).toBeTruthy();
  });

  it('cadastro com e-mail existente devolve 409 EMAIL_TAKEN', async () => {
    const e = await fail(api.post('/auth/register', { name: 'Outra Ana', email: 'ana@onyx.test', password: PASSWORD }));
    expect(e.status).toBe(409);
    expect(e.code).toBe('EMAIL_TAKEN');
    expect(e.fields?.['email']).toBeTruthy();
  });

  it('cadastro com displayName em uso devolve 422 no campo', async () => {
    const e = await fail(api.post('/auth/register', { name: 'Nova Pessoa', displayName: 'ana.eth', email: 'nova@onyx.test', password: PASSWORD }));
    expect(e.status).toBe(422);
    expect(e.fields?.['displayName']).toBeTruthy();
  });

  it('cadastro com senha fraca devolve 422 e novo usuário entra e persiste', async () => {
    const weak = await fail(api.post('/auth/register', { name: 'Nova Pessoa', email: 'nova@onyx.test', password: 'abc' }));
    expect(weak.fields?.['password']).toBeTruthy();
    const ok = await api.post('/auth/register', { name: 'Nova Pessoa', email: 'nova@onyx.test', password: PASSWORD });
    expect(ok.status).toBe(201);
    expect(JSON.stringify(mockControl.getState())).not.toContain(PASSWORD);
    const again = await api.post('/auth/login', { email: 'nova@onyx.test', password: PASSWORD });
    expect(again.data.session.user.email).toBe('nova@onyx.test');
  });

  it('sem token GET /session devolve 401 UNAUTHENTICATED', async () => {
    const e = await fail(api.get('/session'));
    expect(e.status).toBe(401);
    expect(e.code).toBe('UNAUTHENTICATED');
  });

  it('expireSession faz a próxima chamada autenticada devolver SESSION_EXPIRED', async () => {
    const token = await loginAs('ana@onyx.test');
    mockControl.expireSession();
    const e = await fail(api.get('/session', auth(token)));
    expect(e.status).toBe(401);
    expect(e.code).toBe('SESSION_EXPIRED');
  });

  it('logout invalida o token', async () => {
    const token = await loginAs('bruno@onyx.test');
    await api.post('/auth/logout', null, auth(token));
    const e = await fail(api.get('/session', auth(token)));
    expect(e.code).toBe('UNAUTHENTICATED');
  });
});
