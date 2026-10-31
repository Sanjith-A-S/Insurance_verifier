let globalResponseListener = null;
let globalErrorListener = null;
let currentIdentityId = null;

export function registerApiListeners({ onResponse, onError, getIdentityId }) {
  globalResponseListener = onResponse;
  globalErrorListener = onError;
  currentIdentityId = getIdentityId;
}

export const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';

/**
 * Universal API caller with request tracking, envelope parsing and error toasts.
 */
export async function api(method, path, options = {}) {
  const { body, formData, customUserId, headers = {} } = options;
  const start = Date.now();

  const activeUserId = customUserId || (typeof currentIdentityId === 'function' ? currentIdentityId() : null);

  const reqHeaders = {
    ...headers,
  };
  if (activeUserId) {
    reqHeaders['X-Demo-User-Id'] = activeUserId;
  }

  let reqBody = undefined;
  if (formData) {
    reqBody = formData;
  } else if (body !== undefined) {
    reqHeaders['Content-Type'] = 'application/json';
    reqBody = JSON.stringify(body);
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

  let res;
  let resJson = null;
  let status = 0;

  try {
    res = await fetch(url, {
      method: method.toUpperCase(),
      headers: reqHeaders,
      body: reqBody,
    });
    status = res.status;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      resJson = await res.json();
    } else {
      const text = await res.text();
      resJson = { raw: text };
    }
  } catch (netErr) {
    const duration = Date.now() - start;
    if (globalResponseListener) {
      globalResponseListener({
        method: method.toUpperCase(),
        path,
        status: 0,
        duration,
        body: { error: netErr.message },
        timestamp: new Date().toISOString(),
      });
    }
    if (globalErrorListener) {
      globalErrorListener({
        code: 'NETWORK_ERROR',
        message: netErr.message,
      });
    }
    throw netErr;
  }

  const duration = Date.now() - start;

  if (globalResponseListener) {
    globalResponseListener({
      method: method.toUpperCase(),
      path,
      status,
      duration,
      body: resJson,
      timestamp: new Date().toISOString(),
    });
  }

  // Handle Envelope check
  if (resJson && resJson.ok === false) {
    const err = resJson.error || { code: 'UNKNOWN_ERROR', message: 'Unknown error occurred' };
    if (globalErrorListener) {
      globalErrorListener(err);
    }
    const thrown = new Error(err.message || 'API call failed');
    thrown.code = err.code;
    thrown.fields = err.fields;
    throw thrown;
  }

  if (!res.ok) {
    const message = resJson?.error?.message || `HTTP ${res.status} ${res.statusText}`;
    const code = resJson?.error?.code || `HTTP_${res.status}`;
    if (globalErrorListener) {
      globalErrorListener({ code, message, fields: resJson?.error?.fields });
    }
    const thrown = new Error(message);
    thrown.code = code;
    throw thrown;
  }

  return resJson?.data !== undefined ? resJson.data : resJson;
}

/**
 * Upload with XMLHttpRequest for real progress tracking
 */
export function uploadWithProgress(path, formData, options = {}) {
  const { onProgress, customUserId } = options;
  const start = Date.now();
  const activeUserId = customUserId || (typeof currentIdentityId === 'function' ? currentIdentityId() : null);
  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    if (activeUserId) {
      xhr.setRequestHeader('X-Demo-User-Id', activeUserId);
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      const duration = Date.now() - start;
      let resJson = null;
      try {
        resJson = JSON.parse(xhr.responseText);
      } catch {
        resJson = { raw: xhr.responseText };
      }

      if (globalResponseListener) {
        globalResponseListener({
          method: 'POST',
          path,
          status: xhr.status,
          duration,
          body: resJson,
          timestamp: new Date().toISOString(),
        });
      }

      if (xhr.status >= 200 && xhr.status < 300 && resJson?.ok !== false) {
        resolve(resJson?.data !== undefined ? resJson.data : resJson);
      } else {
        const err = resJson?.error || {
          code: `HTTP_${xhr.status}`,
          message: xhr.statusText || 'Upload failed',
        };
        if (globalErrorListener) {
          globalErrorListener(err);
        }
        const thrown = new Error(err.message);
        thrown.code = err.code;
        thrown.fields = err.fields;
        reject(thrown);
      }
    };

    xhr.onerror = () => {
      const duration = Date.now() - start;
      const err = { code: 'UPLOAD_FAILED', message: 'Network error during upload' };
      if (globalResponseListener) {
        globalResponseListener({
          method: 'POST',
          path,
          status: 0,
          duration,
          body: err,
          timestamp: new Date().toISOString(),
        });
      }
      if (globalErrorListener) {
        globalErrorListener(err);
      }
      reject(new Error(err.message));
    };

    xhr.send(formData);
  });
}

/**
 * Fetches file with auth header, creates blob URL and opens in a new tab
 */
export async function openFileInNewTab(path, customUserId) {
  const activeUserId = customUserId || (typeof currentIdentityId === 'function' ? currentIdentityId() : null);
  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

  const res = await fetch(url, {
    headers: activeUserId ? { 'X-Demo-User-Id': activeUserId } : {},
  });

  if (!res.ok) {
    let errJson = null;
    try {
      errJson = await res.json();
    } catch {
      // ignore
    }
    const err = errJson?.error || { code: `HTTP_${res.status}`, message: `Failed to load file: ${res.statusText}` };
    if (globalErrorListener) globalErrorListener(err);
    throw new Error(err.message);
  }

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
}

