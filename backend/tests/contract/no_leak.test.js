import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { seedDatabase } from '../../seed/loader.js';

describe('No-Leak Security Test (Spec §15.3)', () => {
  const SECRET_NOTE_TEXT = 'CONFIDENTIAL_VERIFIER_SECRET_NOTE_9921_DO_NOT_LEAK';
  const FORBIDDEN_CLAIMANT_KEYS = [
    'reviewNote',
    'duplicateOfIds',
    'similarToIds',
    'latestAnalysisVersion',
  ];

  function recursiveScanForLeaks(obj, path = '') {
    if (obj === null || obj === undefined) return;

    if (typeof obj === 'string') {
      if (obj.includes(SECRET_NOTE_TEXT)) {
        throw new Error(`Leak detected: secret private note text found in response at path '${path}'!`);
      }
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => recursiveScanForLeaks(item, `${path}[${index}]`));
      return;
    }

    if (typeof obj === 'object') {
      for (const [key, val] of Object.entries(obj)) {
        if (FORBIDDEN_CLAIMANT_KEYS.includes(key)) {
          // If duplicateOfIds or similarToIds, they must be empty array or absent
          if (['duplicateOfIds', 'similarToIds'].includes(key)) {
            if (Array.isArray(val) && val.length > 0) {
              throw new Error(`Leak detected: forbidden populated key '${key}' found at path '${path}.${key}'!`);
            }
          } else if (key === 'reviewNote' && val !== null && val !== undefined) {
            throw new Error(`Leak detected: forbidden key 'reviewNote' found at path '${path}.${key}'!`);
          }
        }
        recursiveScanForLeaks(val, `${path}.${key}`);
      }
    }
  }

  it('scans all claimant-accessible routes to ensure private notes and verifier signals are completely isolated', async () => {
    await seedDatabase();

    const claimantEndpoints = [
      '/api/v1/claims',
      '/api/v1/claims/CL-2041',
      '/api/v1/claims/CL-2041/checklist',
      '/api/v1/claims/CL-2041/evidence',
      '/api/v1/claims/CL-2041/messages',
      '/api/v1/claims/CL-2041/requests',
      '/api/v1/claims/CL-2041/timeline',
      '/api/v1/claims/CL-2041/recommendation',
    ];

    for (const endpoint of claimantEndpoints) {
      const res = await request(app)
        .get(endpoint)
        .set('X-Demo-User-Id', 'usr_aarav');

      expect([200, 404]).toContain(res.status);
      recursiveScanForLeaks(res.body, endpoint);
    }

    // Direct attempt to read private notes must return 403 FORBIDDEN
    const noteRes = await request(app)
      .get('/api/v1/claims/CL-2041/private-notes')
      .set('X-Demo-User-Id', 'usr_aarav');

    expect(noteRes.status).toBe(403);
    recursiveScanForLeaks(noteRes.body, '/private-notes-attempt');
  });
});
