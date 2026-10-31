// ──────────────────────────────────────────────────────────────────────
//  apps/verifier/src/components/CommandSearch.tsx
// ──────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import type { ClaimSummary } from '@claimlens/shared/types';

export function CommandSearch({
  claims,
  onSelectClaim,
}: {
  claims: ClaimSummary[];
  onSelectClaim: (claimId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!open) return null;

  const filtered = query.trim()
    ? claims.filter(
        (c) =>
          c.id.toLowerCase().includes(query.toLowerCase()) ||
          c.claimantName.toLowerCase().includes(query.toLowerCase()) ||
          c.vehicle.registrationNumber.toLowerCase().includes(query.toLowerCase()) ||
          c.vehicle.make.toLowerCase().includes(query.toLowerCase())
      )
    : claims.slice(0, 6);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
      }}
      onClick={() => setOpen(false)}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 540,
          background: 'var(--color-surface-raised)',
          border: '1px solid var(--color-border-strong)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)', marginRight: 10 }}>🔍</span>
          <input
            autoFocus
            type="text"
            placeholder="Search claims by ID, claimant, vehicle, registration… (Esc to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: 'var(--text-sm)',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ maxHeight: 340, overflowY: 'auto', padding: '8px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              No matching claims found.
            </div>
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  onSelectClaim(c.id);
                  setOpen(false);
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'background var(--duration-fast)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 'var(--text-xs)', color: 'var(--color-primary-text)' }}>
                      {c.id}
                    </span>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>{c.claimantName}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {c.vehicle.make} {c.vehicle.model} ({c.vehicle.registrationNumber})
                  </div>
                </div>

                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', color: 'var(--color-text-muted)' }}>
                  {c.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

