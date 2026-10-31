import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api, registerApiListeners } from './api.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Identity: default to usr_meera (verifier) or usr_aarav (claimant)
  const [identity, setIdentityState] = useState(() => {
    try {
      const saved = localStorage.getItem('claimlens_devconsole_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [users, setUsers] = useState([]);
  const [claims, setClaims] = useState([]);
  const [selectedClaimId, setSelectedClaimId] = useState(null);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [health, setHealth] = useState('checking'); // 'ok' | 'down' | 'checking'
  const [toast, setToast] = useState(null);
  const [lastResponse, setLastResponse] = useState(null);

  const toastTimerRef = useRef(null);

  const showToast = useCallback((err) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(err);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 8000);
  }, []);

  const clearToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  }, []);

  // Register listeners with API helper
  useEffect(() => {
    registerApiListeners({
      onResponse: (record) => setLastResponse(record),
      onError: (err) => showToast(err),
      getIdentityId: () => identity?.id || identity?._id,
    });
  }, [identity, showToast]);

  const setIdentity = useCallback((user) => {
    setIdentityState(user);
    if (user) {
      localStorage.setItem('claimlens_devconsole_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('claimlens_devconsole_user');
    }
  }, []);

  // Load demo users
  const loadUsers = useCallback(async () => {
    try {
      const res = await api('GET', '/demo/users');
      const userList = Array.isArray(res) ? res : res.users || [];
      setUsers(userList);
      if (!identity && userList.length > 0) {
        // Default to first verifier if available, else first user
        const defaultUser = userList.find((u) => u.role === 'verifier') || userList[0];
        setIdentity(defaultUser);
      }
    } catch (e) {
      console.warn('Failed to fetch demo users:', e);
    }
  }, [identity, setIdentity]);

  // Health check polling
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/v1/health');
        if (res.ok) {
          setHealth('ok');
        } else {
          setHealth('down');
        }
      } catch {
        setHealth('down');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load claims when identity changes
  const reloadClaims = useCallback(async () => {
    if (!identity) return;
    setClaimsLoading(true);
    try {
      const res = await api('GET', '/claims');
      const list = Array.isArray(res) ? res : res.items || res.claims || [];
      setClaims(list);

      // Check if current selected claim is still in the visible list
      setSelectedClaimId((prev) => {
        if (!prev) return list[0]?.id || list[0]?._id || null;
        const exists = list.some((c) => (c.id || c._id) === prev);
        return exists ? prev : list[0]?.id || list[0]?._id || null;
      });
    } catch (e) {
      console.warn('Failed to load claims:', e);
    } finally {
      setClaimsLoading(false);
    }
  }, [identity]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    reloadClaims();
  }, [reloadClaims]);

  return (
    <AppContext.Provider
      value={{
        identity,
        setIdentity,
        users,
        claims,
        claimsLoading,
        selectedClaimId,
        setSelectedClaimId,
        reloadClaims,
        health,
        toast,
        showToast,
        clearToast,
        lastResponse,
        setLastResponse,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

