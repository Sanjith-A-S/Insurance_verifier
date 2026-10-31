// ──────────────────────────────────────────────────────────────────────
//  apps/claimant/src/screens/ClaimDetail.tsx
// ──────────────────────────────────────────────────────────────────────
import React from 'react';
import type { ClaimDetail as IClaimDetail } from '@claimlens/shared/types';
import { StatusBadge, StageMarker, Button, LoadingState, ErrorState, ScallopProgress } from '@claimlens/shared/ui';
import { formatDate, formatDateTime } from '@claimlens/shared/utils/format';
import { queryHooks } from '../client';

export function ClaimDetail({
  claimId,
  onBack,
  onOpenChecklist,
  onOpenMessages,
  onOpenCamera,
  onOpenRequest,
  onOpenCoverage,
}: {
  claimId: string;
  onBack: () => void;
  onOpenChecklist: () => void;
  onOpenMessages: () => void;
  onOpenCamera: () => void;
  onOpenRequest: (requestId: string) => void;
  onOpenCoverage: () => void;
}) {
  const { data: claim, isLoading, error } = queryHooks.useClaim(claimId);
  const { data: requests = [] } = queryHooks.useRequests(claimId);
  const { data: timeline = [] } = queryHooks.useTimeline(claimId);
  const submitMutation = queryHooks.useSubmitClaim(claimId);

  if (isLoading) return <LoadingState message="Loading claim details…" />;
  if (error || !claim) return <ErrorState title="Failed to load claim" message={error?.message || 'Not found'} />;

  const isDraft = claim.status === 'draft';
  const openRequests = requests.filter((r) => r.status === 'sent');

  const nextStepText = typeof claim.nextStep === 'object' && claim.nextStep
    ? claim.nextStep.label || claim.nextStep.description
    : String(claim.nextStep || 'In progress');

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 120px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Back button & Title */}
      <div>
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
            marginBottom: '8px',
          }}
        >
          ← Back to Claims
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {claim.id}
              </h1>
              <StatusBadge status={claim.status} />
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Created: {formatDate(claim.createdAt)} · Submitted: {formatDate(claim.submittedAt)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="tonal" size="sm" onClick={onOpenMessages}>
              💬 Messages
            </Button>
            <Button variant="filled" size="sm" onClick={onOpenCamera}>
              📷 Camera
            </Button>
          </div>
        </div>
      </div>

      {/* Stage Marker */}
      <div style={{ background: 'var(--color-surface)', padding: '16px 20px', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)' }}>
        <StageMarker currentStage={claim.stage || (isDraft ? 'draft' : 'analysis')} />
      </div>

      {/* Next Step Banner */}
      <div
        style={{
          padding: '18px 20px',
          borderRadius: 'var(--radius-xl)',
          background: isDraft ? 'rgba(59,130,246,0.1)' : 'var(--color-surface-raised)',
          border: `1px solid ${isDraft ? 'rgba(59,130,246,0.3)' : 'var(--color-border)'}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary-text)' }}>
          Current Status & Next Step
        </div>
        <div style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>
          {nextStepText}
        </div>
        {typeof claim.nextStep === 'object' && claim.nextStep?.description && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            {claim.nextStep.description}
          </p>
        )}

        {isDraft && (
          <div style={{ marginTop: '8px' }}>
            <Button
              variant="filled"
              size="sm"
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? 'Submitting…' : 'Submit Claim Now'}
            </Button>
          </div>
        )}
      </div>

      {/* Open Requests Notification */}
      {openRequests.length > 0 && (
        <div
          style={{
            padding: '18px 20px',
            borderRadius: 'var(--radius-xl)',
            background: 'rgba(234,179,8,0.1)',
            border: '1px solid rgba(234,179,8,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: '#facc15' }}>
              Action Required: {openRequests.length} Investigator Request{openRequests.length > 1 ? 's' : ''}
            </span>
          </div>
          {openRequests.map((req) => (
            <div
              key={req.id}
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{req.title}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  {req.reason}
                </div>
              </div>
              <Button variant="filled" size="sm" onClick={() => onOpenRequest(req.id)}>
                Respond →
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Evidence Checklist Summary Card */}
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-border)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>Evidence Checklist</h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              {claim.checklistProgress?.done || 0} of {claim.checklistProgress?.applicable || 4} items submitted
            </p>
          </div>
          <Button variant="tonal" size="sm" onClick={onOpenChecklist}>
            Open Checklist →
          </Button>
        </div>

        <ScallopProgress
          done={claim.checklistProgress?.done || 0}
          total={claim.checklistProgress?.applicable || 4}
          width={280}
        />
      </div>

      {/* Incident & Vehicle Details */}
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-border)',
          padding: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Vehicle
          </div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginTop: '4px' }}>
            {claim.vehicle.make} {claim.vehicle.model} ({claim.vehicle.year})
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            Reg: {claim.vehicle.registrationNumber}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Incident Location & Date
          </div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginTop: '4px' }}>
            {claim.incident.location}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            {formatDate(claim.incident.date)} {claim.incident.time ? `at ${claim.incident.time}` : ''}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Policy
          </div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginTop: '4px' }}>
            {claim.policy?.policyNumber || 'Not specified'}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            {claim.policy?.insurer || 'Authorised Provider'}
          </div>
        </div>
      </div>

      {/* Narrative */}
      {claim.narrative && (
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-border)',
            padding: '20px',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
            Your Narrative
          </div>
          <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.6, color: 'var(--color-text)' }}>
            {claim.narrative}
          </p>
        </div>
      )}

      {/* Future Coverage Link */}
      <div
        onClick={onOpenCoverage}
        style={{
          padding: '16px 20px',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--color-surface-raised)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
        }}
      >
        <div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Coverage Education & Advice</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Learn how future endorsements can protect your vehicle
          </div>
        </div>
        <span style={{ color: 'var(--color-primary-text)', fontSize: '1.2rem' }}>→</span>
      </div>

      {/* Timeline */}
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-border)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>Activity Timeline</h3>
        {timeline.length === 0 ? (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            No timeline activity recorded yet.
          </div>
        ) : (
          timeline.map((event) => (
            <div
              key={event.id}
              style={{
                display: 'flex',
                gap: '12px',
                padding: '8px 0',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', marginTop: 6 }} />
              <div>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>{event.summary}</div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                  {formatDateTime(event.at)} · {event.actor.name}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

