// ──────────────────────────────────────────────────────────────────────
//  apps/verifier/src/screens/ClaimQueueView.tsx
// ──────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import type { ClaimSummary } from '@claimlens/shared/types';
import { DataTable, StatusBadge, PriorityTag, LoadingState, ErrorState, Button, type Column } from '@claimlens/shared/ui';
import { formatDate } from '@claimlens/shared/utils/format';
import { queryHooks } from '../client';

export function ClaimQueueView({
  initialStatus,
  onSelectClaim,
  onBackToDashboard,
}: {
  initialStatus?: string;
  onSelectClaim: (claimId: string) => void;
  onBackToDashboard: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus || '');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  const { data: claimsData, isLoading, error } = queryHooks.useClaims({
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
  });

  if (isLoading) return <LoadingState message="Loading claim queue…" />;
  if (error) return <ErrorState title="Failed to load claims" message={error.message} />;

  let claims = claimsData?.items || [];

  // Filter client-side by search query
  if (search.trim()) {
    const q = search.toLowerCase();
    claims = claims.filter(
      (c) =>
        c.id.toLowerCase().includes(q) ||
        c.claimantName.toLowerCase().includes(q) ||
        c.vehicle.registrationNumber.toLowerCase().includes(q) ||
        c.vehicle.make.toLowerCase().includes(q)
    );
  }

  const columns: Column<ClaimSummary>[] = [
    {
      id: 'id',
      header: 'Claim ID',
      width: '120px',
      cell: (row) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-primary-text)' }}>
          {row.id}
        </span>
      ),
    },
    {
      id: 'claimant',
      header: 'Claimant',
      cell: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.claimantName}</div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{row.claimantId}</div>
        </div>
      ),
    },
    {
      id: 'vehicle',
      header: 'Vehicle',
      cell: (row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{row.vehicle.make} {row.vehicle.model}</div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            {row.vehicle.registrationNumber}
          </div>
        </div>
      ),
    },
    {
      id: 'incidentDate',
      header: 'Incident',
      width: '130px',
      cell: (row) => (
        <div>
          <div>{formatDate(row.incident.date)}</div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{row.incident.type}</div>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: '150px',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'priority',
      header: 'Priority',
      width: '100px',
      cell: (row) => <PriorityTag priority={row.priority} />,
    },
    {
      id: 'evidenceProgress',
      header: 'Checklist',
      width: '110px',
      cell: (row) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
          {row.checklistProgress?.done ?? 0}/{row.checklistProgress?.applicable ?? 0}
        </span>
      ),
    },
    {
      id: 'assignee',
      header: 'Assignee',
      cell: (row) => (
        <span style={{ fontSize: 'var(--text-xs)', color: row.assigneeName ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
          {row.assigneeName || 'Unassigned'}
        </span>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 24px 80px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <button
          onClick={onBackToDashboard}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-primary-text)',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            marginBottom: '8px',
          }}
        >
          ← Back to Dashboard
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Claims Investigation Queue
            </h1>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Showing {claims.length} claims matching current filters.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search ID, claimant, vehicle…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: '#fff',
                fontSize: 'var(--text-xs)',
                width: 240,
              }}
            />
          </div>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600 }}>Status:</span>
        {[
          { label: 'All', value: '' },
          { label: 'New', value: 'new' },
          { label: 'In Review', value: 'in_review' },
          { label: 'Awaiting Claimant', value: 'awaiting_claimant' },
          { label: 'Decision Pending', value: 'decision_pending' },
          { label: 'Completed', value: 'completed' },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => setStatusFilter(item.value)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              background: statusFilter === item.value ? 'var(--color-primary)' : 'var(--color-surface)',
              color: statusFilter === item.value ? '#fff' : 'var(--color-text-muted)',
              border: '1px solid var(--color-border)',
              fontSize: 'var(--text-xs)',
              cursor: 'pointer',
              fontWeight: statusFilter === item.value ? 600 : 400,
            }}
          >
            {item.label}
          </button>
        ))}

        <div style={{ width: 1, height: 20, background: 'var(--color-border)', margin: '0 4px' }} />

        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600 }}>Priority:</span>
        {[
          { label: 'All', value: '' },
          { label: 'High', value: 'high' },
          { label: 'Medium', value: 'medium' },
          { label: 'Low', value: 'low' },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => setPriorityFilter(item.value)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              background: priorityFilter === item.value ? 'var(--color-primary-tint)' : 'var(--color-surface)',
              color: priorityFilter === item.value ? 'var(--color-primary-text)' : 'var(--color-text-muted)',
              border: `1px solid ${priorityFilter === item.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
              fontSize: 'var(--text-xs)',
              cursor: 'pointer',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Claims Table */}
      <DataTable
        columns={columns}
        data={claims}
        onRowClick={(row) => onSelectClaim(row.id)}
        emptyMessage="No claims match your search and filter criteria."
      />
    </div>
  );
}
