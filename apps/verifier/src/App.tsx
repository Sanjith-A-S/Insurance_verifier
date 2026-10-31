// ──────────────────────────────────────────────────────────────────────
//  apps/verifier/src/App.tsx
// ──────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { TopBar } from '@claimlens/shared/ui';
import { useDemoIdentity } from '@claimlens/shared/hooks/useDemoIdentity';
import { queryHooks } from './client';

// Screens
import { DashboardView } from './screens/DashboardView';
import { ClaimQueueView } from './screens/ClaimQueueView';
import { CaseShell } from './screens/CaseShell/CaseShell';
import { CommandSearch } from './components/CommandSearch';

export function App() {
  const { user, setUserId } = useDemoIdentity();

  const [view, setView] = useState<'dashboard' | 'queue' | 'case'>('dashboard');
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [queueStatusFilter, setQueueStatusFilter] = useState<string | undefined>(undefined);

  const { data: claimsData } = queryHooks.useClaims();
  const claims = claimsData?.items || [];

  const openClaim = (id: string) => {
    setSelectedClaimId(id);
    setView('case');
  };

  const openQueue = (filterStatus?: string) => {
    setQueueStatusFilter(filterStatus);
    setView('queue');
  };

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', color: 'var(--color-text)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar with Command Search shortcut */}
      <TopBar
        appName="Verifier Workbench"
        user={user}
        onSelectUser={setUserId}
        extra={
          <button
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
              window.dispatchEvent(event);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            <span>🔍 Search claims</span>
            <kbd style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 5px', borderRadius: '4px' }}>
              Ctrl K
            </kbd>
          </button>
        }
      />

      {/* Main Views */}
      <main style={{ flex: 1 }}>
        {view === 'dashboard' && (
          <DashboardView
            onSelectClaim={openClaim}
            onViewQueue={openQueue}
          />
        )}

        {view === 'queue' && (
          <ClaimQueueView
            initialStatus={queueStatusFilter}
            onSelectClaim={openClaim}
            onBackToDashboard={() => setView('dashboard')}
          />
        )}

        {view === 'case' && selectedClaimId && (
          <CaseShell
            claimId={selectedClaimId}
            user={user}
            onBack={() => setView('queue')}
          />
        )}
      </main>

      {/* Global Command Search Overlay */}
      <CommandSearch
        claims={claims}
        onSelectClaim={openClaim}
      />
    </div>
  );
}

