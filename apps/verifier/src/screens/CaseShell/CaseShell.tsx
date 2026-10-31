// ──────────────────────────────────────────────────────────────────────
//  apps/verifier/src/screens/CaseShell/CaseShell.tsx
// ──────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import type { EvidenceFile, User, Finding } from '@claimlens/shared/types';
import { StatusBadge, PriorityTag, LoadingState, ErrorState } from '@claimlens/shared/ui';
import { queryHooks } from '../../client';

// Tabs
import { OverviewTab } from './tabs/OverviewTab';
import { EvidenceTab } from './tabs/EvidenceTab';
import { AnalysisTab } from './tabs/AnalysisTab';
import { PolicySettlementTab } from './tabs/PolicySettlementTab';
import { RequestsMessagesTab } from './tabs/RequestsMessagesTab';
import { DecisionTab } from './tabs/DecisionTab';
import { SourceDrawer } from './SourceDrawer';

export type CaseTab = 'overview' | 'evidence' | 'analysis' | 'settlement' | 'collaboration' | 'decision';

export function CaseShell({
  claimId,
  user,
  onBack,
}: {
  claimId: string;
  user: User;
  onBack: () => void;
}) {
  const { data: claim, isLoading, error } = queryHooks.useClaim(claimId);
  const { data: evidence = [] } = queryHooks.useEvidence(claimId);

  const [activeTab, setActiveTab] = useState<CaseTab>('overview');
  const [drawerFile, setDrawerFile] = useState<EvidenceFile | null>(null);

  if (isLoading) return <LoadingState message="Loading case details…" />;
  if (error || !claim) return <ErrorState title="Failed to load claim" message={error?.message || 'Not found'} />;

  const handleOpenSource = (evidenceId: string) => {
    const found = evidence.find((e) => e.id === evidenceId);
    if (found) {
      setDrawerFile(found);
    }
  };

  const handleCreateRequestFromFinding = (finding: Finding) => {
    setActiveTab('collaboration');
  };

  const handleCreateRequestFromBlocker = (blocker: { message: string; suggestedRequestTitle?: string | null }) => {
    setActiveTab('collaboration');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - var(--topbar-height))' }}>
      {/* Case Header Strip */}
      <div
        style={{
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primary-text)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ← Back to Queue
          </button>

          <div style={{ width: 1, height: 20, background: 'var(--color-border)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: 'var(--text-lg)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {claim.id}
            </span>
            <StatusBadge status={claim.status} />
            <PriorityTag priority={claim.priority} />
          </div>

          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            Claimant: <strong>{claim.claimantName}</strong> ({claim.claimantId}) · Vehicle: {claim.vehicle.make} {claim.vehicle.model}
          </div>
        </div>

        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          Assigned Investigator: <strong>{claim.assigneeName || user.name}</strong>
        </div>
      </div>

      {/* Folder Tabs */}
      <div
        style={{
          background: 'var(--color-surface-raised)',
          borderBottom: '1px solid var(--color-border)',
          padding: '0 24px',
          display: 'flex',
          gap: '4px',
          overflowX: 'auto',
        }}
      >
        {[
          { id: 'overview', label: '1. Case Overview' },
          { id: 'evidence', label: `2. Evidence Locker (${evidence.length})` },
          { id: 'analysis', label: '3. Investigation Analysis' },
          { id: 'settlement', label: '4. Policy & Settlement' },
          { id: 'collaboration', label: '5. Requests & Messages' },
          { id: 'decision', label: '6. Decision & Recommendation' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as CaseTab)}
            style={{
              padding: '12px 18px',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              border: 'none',
              background: activeTab === t.id ? 'var(--color-surface)' : 'transparent',
              color: activeTab === t.id ? 'var(--color-primary-text)' : 'var(--color-text-muted)',
              borderBottom: activeTab === t.id ? '2px solid var(--color-primary)' : 'none',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Body */}
      <div
        style={{
          flex: 1,
          padding: '24px',
          maxWidth: drawerFile ? 'calc(100% - var(--source-drawer-width))' : '100%',
          transition: 'max-width var(--duration-fast)',
        }}
      >
        {activeTab === 'overview' && <OverviewTab claim={claim} />}

        {activeTab === 'evidence' && (
          <EvidenceTab
            claimId={claim.id}
            onSelectFile={(file) => setDrawerFile(file)}
          />
        )}

        {activeTab === 'analysis' && (
          <AnalysisTab
            claimId={claim.id}
            onOpenSource={handleOpenSource}
            onCreateRequestFromFinding={handleCreateRequestFromFinding}
          />
        )}

        {activeTab === 'settlement' && (
          <PolicySettlementTab
            claimId={claim.id}
            onCreateRequestFromBlocker={handleCreateRequestFromBlocker}
          />
        )}

        {activeTab === 'collaboration' && (
          <RequestsMessagesTab
            claimId={claim.id}
            user={user}
          />
        )}

        {activeTab === 'decision' && <DecisionTab claim={claim} />}
      </div>

      {/* Source Drawer */}
      <SourceDrawer
        file={drawerFile}
        onClose={() => setDrawerFile(null)}
      />
    </div>
  );
}

