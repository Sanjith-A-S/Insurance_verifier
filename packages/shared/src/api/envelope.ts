// ──────────────────────────────────────────────────────────────────────
//  @claimlens/shared · api/envelope.ts
//  Parse the API envelope {ok,data,meta} | {ok:false,error}
// ──────────────────────────────────────────────────────────────────────
import type { ApiResponse, ApiErrorDetail } from '../types.js';

export class ApiError extends Error {
  readonly code: string;
  readonly fields?: ApiErrorDetail[];
  readonly status?: number;

  constructor(
    code: string,
    message: string,
    opts?: { fields?: ApiErrorDetail[]; status?: number }
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.fields = opts?.fields;
    this.status = opts?.status;
  }
}

/**
 * Parse a raw JSON body as an API envelope.
 * Throws ApiError if ok === false.
 */
export function parseEnvelope<T>(body: unknown, status?: number): ApiResponse<T> {
  if (typeof body !== 'object' || body === null) {
    throw new ApiError('INTERNAL', 'Unexpected response format', { status });
  }

  const env = body as Record<string, unknown>;

  if (env.ok === false) {
    const err = env.error as { code?: string; message?: string; fields?: ApiErrorDetail[] };
    throw new ApiError(
      err?.code ?? 'INTERNAL',
      err?.message ?? 'Something went wrong',
      { fields: err?.fields, status }
    );
  }

  if (env.ok === true) {
    return body as ApiResponse<T>;
  }

  throw new ApiError('INTERNAL', 'Response missing "ok" field', { status });
}

