// ──────────────────────────────────────────────────────────────────────
//  @claimlens/shared · api/httpTransport.ts
//  Real HTTP transport using fetch + XMLHttpRequest for uploads.
// ──────────────────────────────────────────────────────────────────────
import type { Transport, RequestOptions, UploadOptions } from './transport.js';
import { parseEnvelope, ApiError } from './envelope.js';

export function createHttpTransport(baseUrl: string): Transport {
  let currentUserId: string | null = null;

  function getHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extra,
    };
    if (currentUserId) {
      headers['X-Demo-User-Id'] = currentUserId;
    }
    return headers;
  }

  return {
    setIdentity(userId: string) {
      currentUserId = userId;
    },

    getIdentity() {
      return currentUserId;
    },

    async request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
      const url = `${baseUrl}${path}`;
      const headers: Record<string, string> = {};

      if (currentUserId) headers['X-Demo-User-Id'] = currentUserId;

      let body: BodyInit | undefined;
      if (options.formData) {
        body = options.formData;
        // Don't set Content-Type — browser sets it with boundary
      } else if (options.body !== undefined) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(options.body);
      } else if (!['GET', 'HEAD'].includes(method.toUpperCase())) {
        headers['Content-Type'] = 'application/json';
      }

      const res = await fetch(url, {
        method,
        headers,
        body,
        signal: options.signal,
      });

      if (options.raw) {
        return res as unknown as T;
      }

      let json: unknown;
      try {
        json = await res.json();
      } catch {
        throw new ApiError('INTERNAL', `Non-JSON response (${res.status})`, { status: res.status });
      }

      const envelope = parseEnvelope<T>(json, res.status);
      return (envelope as { ok: true; data: T }).data;
    },

    async upload<T>(path: string, options: UploadOptions): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${baseUrl}${path}`);
        if (currentUserId) xhr.setRequestHeader('X-Demo-User-Id', currentUserId);

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && options.onProgress) {
            options.onProgress({
              loaded: e.loaded,
              total: e.total,
              percent: Math.round((e.loaded / e.total) * 100),
            });
          }
        });

        xhr.addEventListener('load', () => {
          let json: unknown;
          try {
            json = JSON.parse(xhr.responseText);
          } catch {
            reject(new ApiError('INTERNAL', `Non-JSON response (${xhr.status})`, { status: xhr.status }));
            return;
          }
          try {
            const envelope = parseEnvelope<T>(json, xhr.status);
            resolve((envelope as { ok: true; data: T }).data);
          } catch (err) {
            reject(err);
          }
        });

        xhr.addEventListener('error', () => {
          reject(new ApiError('INTERNAL', 'Network error during upload'));
        });

        if (options.signal) {
          options.signal.addEventListener('abort', () => {
            xhr.abort();
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }

        xhr.send(options.formData);
      });
    },

    async fetchBlob(path: string): Promise<string> {
      const url = `${baseUrl}${path}`;
      const headers: Record<string, string> = {};
      if (currentUserId) headers['X-Demo-User-Id'] = currentUserId;

      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new ApiError('NOT_FOUND', `Could not fetch file (${res.status})`, { status: res.status });
      }
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    },
  };
}

