// ──────────────────────────────────────────────────────────────────────
//  apps/verifier/src/screens/CaseShell/tabs/EvidenceTab.tsx
// ──────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import type { EvidenceFile } from '@claimlens/shared/types';
import { EvidenceCard, LoadingState, EmptyState } from '@claimlens/shared/ui';
import { CHECKLIST_CATEGORY_LABELS } from '@claimlens/shared/constants';
import { queryHooks, client } from '../../../client';

export function EvidenceTab({
  claimId,
  onSelectFile,
}: {
  claimId: string;
  onSelectFile: (file: EvidenceFile) => void;
}) {
  const { data: evidence = [], isLoading, refetch } = queryHooks.useEvidence(claimId);
  const [filterCat, setFilterCat] = useState<string>('');

  if (isLoading) return <LoadingState message="Loading evidence locker…" />;

  const filtered = filterCat
    ? evidence.filter((e) => e.category === filterCat)
    : evidence;

  const handleReview = async (eid: string, status: 'reviewed' | 'needs_replacement') => {
    try {
      await client.reviewEvidence(claimId, eid, status);
      await refetch();
    } catch (err: any) {
      alert(`Review failed: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Category Filter Bar */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilterCat('')}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            background: filterCat === '' ? 'var(--color-primary)' : 'var(--color-surface)',
            color: filterCat === '' ? '#fff' : 'var(--color-text-muted)',
            border: '1px solid var(--color-border)',
            fontSize: 'var(--text-xs)',
            cursor: 'pointer',
          }}
        >
          All Files ({evidence.length})
        </button>

        {Object.entries(CHECKLIST_CATEGORY_LABELS).map(([catKey, label]) => {
          const count = evidence.filter((e) => e.category === catKey).length;
          if (count === 0) return null;

          return (
            <button
              key={catKey}
              onClick={() => setFilterCat(catKey)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                background: filterCat === catKey ? 'var(--color-primary)' : 'var(--color-surface)',
                color: filterCat === catKey ? '#fff' : 'var(--color-text-muted)',
                border: '1px solid var(--color-border)',
                fontSize: 'var(--text-xs)',
                cursor: 'pointer',
              }}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState title="No Evidence Files" message="No evidence files found matching category filter." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
          {filtered.map((file) => (
            <EvidenceCard
              key={file.id}
              file={file}
              onClick={() => onSelectFile(file)}
              onReview={(status) => handleReview(file.id, status)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

