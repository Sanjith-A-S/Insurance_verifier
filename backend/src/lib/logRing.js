class LogRingBuffer {
  constructor(capacity = 200) {
    this.capacity = capacity;
    this.buffer = [];
  }

  add(entry) {
    const sanitized = {
      timestamp: new Date().toISOString(),
      level: entry.level || 'info',
      message: entry.message || '',
      path: entry.path,
      method: entry.method,
      statusCode: entry.statusCode,
      requestId: entry.requestId,
      error: entry.error ? { code: entry.error.code, message: entry.error.message } : undefined,
    };
    if (this.buffer.length >= this.capacity) {
      this.buffer.shift();
    }
    this.buffer.push(sanitized);
  }

  getRecent(limit = 50) {
    return this.buffer.slice(-limit);
  }

  clear() {
    this.buffer = [];
  }
}

export const logRing = new LogRingBuffer();

