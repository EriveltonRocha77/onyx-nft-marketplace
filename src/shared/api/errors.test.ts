import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import { ApiError, toApiError } from './errors';

function axiosError(status: number | null, data?: unknown, code?: string): AxiosError {
  const config = { headers: new AxiosHeaders() };
  const response = status === null ? undefined : ({ status, data, statusText: '', headers: {}, config } as AxiosResponse);
  return new AxiosError('boom', code, config, undefined, response);
}

describe('toApiError', () => {
  it('converte corpo de erro da API em ApiError com code', () => {
    const e = toApiError(axiosError(409, { error: { code: 'EMAIL_TAKEN', message: 'x' }, requestId: 'r1' }));
    expect(e).toBeInstanceOf(ApiError);
    expect(e.status).toBe(409);
    expect(e.code).toBe('EMAIL_TAKEN');
    expect(e.requestId).toBe('r1');
  });
  it('preserva fields de validação', () => {
    const e = toApiError(axiosError(422, { error: { code: 'VALIDATION_ERROR', message: 'x', fields: { email: 'inválido' } } }));
    expect(e.fields).toEqual({ email: 'inválido' });
  });
  it('erro sem resposta vira NETWORK', () => expect(toApiError(axiosError(null, undefined, 'ERR_NETWORK')).code).toBe('NETWORK'));
  it('ECONNABORTED vira TIMEOUT', () => expect(toApiError(axiosError(null, undefined, 'ECONNABORTED')).code).toBe('TIMEOUT'));
  it('503 sem corpo conhecido vira TRANSIENT', () => expect(toApiError(axiosError(503, 'oops')).code).toBe('TRANSIENT'));
  it('mantém ApiError existente', () => {
    const original = new ApiError({ status: 404, code: 'NOT_FOUND', message: 'n' });
    expect(toApiError(original)).toBe(original);
  });
});
