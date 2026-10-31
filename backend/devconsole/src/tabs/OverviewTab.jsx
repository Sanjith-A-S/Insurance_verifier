import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { useApp } from '../context.jsx';
import { Card, Button, StatusBadge, ProgressBar, Spinner, Empty, Field } from '../ui.jsx';

export default function OverviewTab({ claim, onClaimUpdated }) {
  const { identity } = useApp();
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const isVerifier = identity?.role === 'verifier';
  const isClaimant = identity?.role === 'claimant';
  const claimId = claim?.id || claim?._id;

  const loadChecklist = useCallback(async () => {
    if (!claimId) return;
    setLoading(true);
    try {
      const res = await api('GET', `/claims/${claimId}/checklist`);
      setChecklist(Array.isArray(res) ? res : res.items || []);
    } catch (e) {
      console.warn('Checklist load error:', e);
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  // Actions
  const handleAssignToMe = async () => {
    setBusy(true);
    try {
      await api('POST', `/claims/${claimId}/assign`);
      onClaimUpdated();
    } finally {
      setBusy(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setBusy(true);
    try {
      await api('PATCH', `/claims/${claimId}/status`, { body: { status: newStatus } });
      onClaimUpdated();
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitDraft = async () => {
    setBusy(true);
    try {
      await api('POST', `/claims/${claimId}/submit`);
      onClaimUpdated();
      loadChecklist();
    } finally {
      setBusy(false);
    }
  };

  const handleMarkUnavailable = async (itemId) => {
    const reason = window.prompt('Please provide a reason why this item is unavailable:');
    if (!reason) return;
    setBusy(true);
    try {
      await api('PATCH', `/claims/${claimId}/checklist/${itemId}/unavailable`, { body: { reason } });
      loadChecklist();
      onClaimUpdated();
    } finally {
      setBusy(false);
    }
  };

  if (!claim) return <Empty message="No claim selected" />;

  const completedCount = checklist.filter((i) => ['received', 'reviewed'].includes(i.status)).length;
  const totalCount = checklist.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Claim Summary Card */}
      <Card
        title={`Claim ${claimId}`}
        subtitle={`Created on ${new Date(claim.createdAt || Date.now()).toLocaleDateString()}`}
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <StatusBadge status={claim.status} />
            {isClaimant && claim.status === 'draft' && (
              <Button variant="filled" disabled={busy} onClick={handleSubmitDraft}>
                Submit Claim
              </Button>
            )}
            {isVerifier && (
              <>
                <Button variant="tonal" size="s" disabled={busy} onClick={handleAssignToMe}>
                  Assign to Me
                </Button>
                <select
                  className="m3-select"
                  style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8rem' }}
                  value={claim.status}
                  disabled={busy}
                  onChange={(e) => handleStatusChange(e.target.value)}
                >
                  <option value="new">new</option>
                  <option value="in_review">in_review</option>
                  <option value="awaiting_claimant">awaiting_claimant</option>
                  <option value="decision_pending">decision_pending</option>
                  <option value="completed">completed</option>
                </select>
              </>
            )}
          </div>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 8 }}>
          <div>
            <div className="label-caps">Vehicle</div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
              {claim.vehicle?.registrationNumber || 'N/A'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {claim.vehicle?.make} {claim.vehicle?.model} ({claim.vehicle?.year || '—'})
            </div>
            {claim.vehicle?.vin && (
              <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                VIN: {claim.vehicle.vin}
              </div>
            )}
          </div>

          <div>
            <div className="label-caps">Incident</div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
              {claim.incident?.date || 'N/A'} {claim.incident?.time || ''}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {claim.incident?.location || 'Location not specified'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Type: {claim.incident?.type || 'collision'}
            </div>
          </div>

          <div>
            <div className="label-caps">Policy & Parties</div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
              {claim.policy?.policyNumber || 'POL-UNKNOWN'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Claimant: {claim.claimant?.name || claim.claimantId || 'Unknown'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Assignee: {claim.assignee?.name || claim.assigneeId || 'Unassigned'}
            </div>
          </div>
        </div>

        {claim.narrative && (
          <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--surface-raised)', borderRadius: '16px' }}>
            <div className="label-caps" style={{ marginBottom: 4 }}>Claimant Narrative</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{claim.narrative}</div>
          </div>
        )}
      </Card>

      {/* Checklist Card */}
      <Card
        title="Evidence Checklist"
        subtitle={`${completedCount} of ${totalCount} items completed`}
      >
        <ProgressBar value={completedCount} max={totalCount || 1} />

        {loading ? (
          <div style={{ textAlign: 'center', padding: 20 }}><Spinner /></div>
        ) : checklist.length === 0 ? (
          <Empty message="No checklist items generated for this claim" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {checklist.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--surface-raised)',
                  borderRadius: '16px',
                  gap: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{item.label}</span>
                    <span className="label-caps" style={{ color: item.requirement === 'required' ? 'var(--primary-light)' : 'var(--text-muted)' }}>
                      {item.requirement}
                    </span>
                  </div>
                  {item.reason && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {item.reason}
                    </div>
                  )}
                  {item.unavailableReason && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--error)', marginTop: 2 }}>
                      Unavailable: {item.unavailableReason}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StatusBadge status={item.status} />
                  {isClaimant && !['received', 'reviewed', 'unavailable'].includes(item.status) && (
                    <Button
                      variant="text"
                      size="s"
                      onClick={() => handleMarkUnavailable(item.id)}
                      disabled={busy}
                      style={{ fontSize: '0.75rem' }}
                    >
                      Mark Unavailable
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

