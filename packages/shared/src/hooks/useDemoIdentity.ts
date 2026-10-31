// ──────────────────────────────────────────────────────────────────────
//  @claimlens/shared · hooks/useDemoIdentity.ts
// ──────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { User, UserRole } from '../types.js';
import { DEMO_USERS } from '../constants.js';
import type { ApiClient } from '../api/client.js';

const STORAGE_KEY = 'claimlens_demo_user';

export interface DemoIdentityContextValue {
  user: User;
  users: typeof DEMO_USERS;
  setUserId: (id: string) => void;
  isVerifier: boolean;
  isClaimant: boolean;
}

export const DemoIdentityContext = createContext<DemoIdentityContextValue | null>(null);

export function useDemoIdentity(): DemoIdentityContextValue {
  const ctx = useContext(DemoIdentityContext);
  if (!ctx) {
    throw new Error('useDemoIdentity must be used within a DemoIdentityProvider');
  }
  return ctx;
}

export function createDemoIdentityState(
  client: ApiClient,
  defaultRole: UserRole = 'claimant'
) {
  const defaultUser = DEMO_USERS.find((u) => u.role === defaultRole) || DEMO_USERS[0];

  const getInitialUser = (): User => {
    if (typeof window !== 'undefined') {
      const storedId = window.localStorage.getItem(STORAGE_KEY);
      if (storedId) {
        const found = DEMO_USERS.find((u) => u.id === storedId);
        if (found) return found;
      }
    }
    return defaultUser;
  };

  return function useDemoIdentityInternal() {
    const [user, setUser] = useState<User>(getInitialUser);

    useEffect(() => {
      client.setIdentity(user.id);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, user.id);
      }
    }, [user.id]);

    const setUserId = useCallback((id: string) => {
      const found = DEMO_USERS.find((u) => u.id === id);
      if (found) {
        setUser(found);
      }
    }, []);

    return {
      user,
      users: DEMO_USERS,
      setUserId,
      isVerifier: user.role === 'verifier',
      isClaimant: user.role === 'claimant',
    };
  };
}

