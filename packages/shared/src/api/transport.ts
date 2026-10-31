// ──────────────────────────────────────────────────────────────────────
//  @claimlens/shared · api/transport.ts
//  Abstract transport interface — both httpTransport and mockTransport
//  implement this.
// ──────────────────────────────────────────────────────────────────────
import type { UploadProgressEvent } from '../types.js';

export interface RequestOptions {
  body?: unknown;
  formData?: FormData;
  raw?: boolean;
  signal?: AbortSignal;
}

export interface UploadOptions {
  formData: FormData;
  onProgress?: (event: UploadProgressEvent) => void;
  signal?: AbortSignal;
}

export interface Transport {
  /** JSON request — returns the parsed response body */
  request<T>(method: string, path: string, options?: RequestOptions): Promise<T>;

  /** File upload with progress */
  upload<T>(path: string, options: UploadOptions): Promise<T>;

  /** Fetch a file and return a Blob URL */
  fetchBlob(path: string): Promise<string>;

  /** Set the current identity (user id) */
  setIdentity(userId: string): void;

  /** Get the current identity */
  getIdentity(): string | null;
}

