import { isAxiosError } from 'axios';
import { apiErrorBodySchema } from './schemas/common';

export type ErrorCode =
  | 'VALIDATION_ERROR' | 'UNAUTHENTICATED' | 'SESSION_EXPIRED' | 'FORBIDDEN' | 'NOT_FOUND' | 'EMAIL_TAKEN'
  | 'AVAILABILITY_CONFLICT' | 'QUOTE_STALE' | 'IDEMPOTENCY_CONFLICT' | 'TRANSIENT' | 'NETWORK' | 'TIMEOUT' | 'UNKNOWN';

export interface ApiErrorInit {
  status: number; code: ErrorCode; message: string; fields?: Record<string, string>; details?: unknown; requestId?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly fields?: Record<string, string>;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(init: ApiErrorInit) {
    super(init.message);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.fields = init.fields;
    this.details = init.details;
    this.requestId = init.requestId;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  if (isAxiosError(e)) {
    if (!e.response) {
      const timeout = e.code === 'ECONNABORTED' || e.code === 'ETIMEDOUT';
      return new ApiError({ status: 0, code: timeout ? 'TIMEOUT' : 'NETWORK', message: timeout ? 'A requisição demorou demais.' : 'Sem conexão com o servidor.' });
    }
    const parsed = apiErrorBodySchema.safeParse(e.response.data);
    if (parsed.success) {
      const { error, requestId } = parsed.data;
      return new ApiError({ status: e.response.status, code: error.code as ErrorCode, message: error.message, fields: error.fields, details: error.details, requestId });
    }
    const status = e.response.status;
    return new ApiError({ status, code: status >= 500 ? 'TRANSIENT' : 'UNKNOWN', message: 'Resposta inesperada do servidor.' });
  }
  return new ApiError({ status: 0, code: 'UNKNOWN', message: e instanceof Error ? e.message : 'Erro desconhecido.' });
}
