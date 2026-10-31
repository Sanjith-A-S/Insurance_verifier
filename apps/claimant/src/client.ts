// ──────────────────────────────────────────────────────────────────────
//  apps/claimant/src/client.ts
// ──────────────────────────────────────────────────────────────────────
import { createClient } from '@claimlens/shared/api/client';
import { createHttpTransport } from '@claimlens/shared/api/httpTransport';
import { createMockTransport } from '@claimlens/shared/mock/mockTransport';
import { createQueryHooks } from '@claimlens/shared/hooks/queries';

const useMocks = import.meta.env.VITE_USE_MOCKS !== 'false';
const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

export const transport = useMocks ? createMockTransport() : createHttpTransport(baseUrl);
export const client = createClient(transport);
export const queryHooks = createQueryHooks(client);

