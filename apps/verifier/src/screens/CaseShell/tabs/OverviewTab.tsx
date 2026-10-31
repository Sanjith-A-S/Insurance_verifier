// ──────────────────────────────────────────────────────────────────────
//  apps/verifier/src/screens/CaseShell/tabs/OverviewTab.tsx
// ──────────────────────────────────────────────────────────────────────
import React from 'react';
import type { ClaimDetail } from '@claimlens/shared/types';
import { StatusBadge, PriorityTag, ScallopProgress, FactTypeTag } from '@claimlens/shared/ui';
import { formatDate } from '@claimlens/shared/utils/format';

export function OverviewTab({ claim }: { claim: ClaimDetail }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Facts Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {/* Vehicle Identity */}
        <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', padding: '20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
            Vehicle Identity
          </div>
          <div style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>
            {claim.vehicle.make} {claim.vehicle.model} ({claim.vehicle.year})
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-text)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            Registration: {claim.vehicle.registrationNumber}
          </div>
          {claim.vehicle.vin && (
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              VIN: {claim.vehicle.vin}
            </div>
          )}
        </div>

        {/* Policy Summary */}
        <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', padding: '20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
            Policy Declaration
          </div>
          <div style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>
            {claim.policy?.policyNumber || 'No Policy Schedule Attached'}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Insurer: {claim.policy?.insurer || 'National Insurance'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Policyholder: {claim.claimantName}
          </div>
        </div>

        {/* Evidence Completeness */}
        <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Evidence Completeness
          </div>
          <ScallopProgress
            done={claim.checklistProgress?.done ?? 0}
            total={claim.checklistProgress?.applicable ?? 0}
            width={240}
          />
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            Missing mandatory items: {claim.missingEvidenceCount}
          </div>
        </div>
      </div>

      {/* Incident Details & Claimant Narrative */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>Claimant Incident Declaration</h3>
          <FactTypeTag type="claimant_says" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Incident Date & Time</div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginTop: '2px' }}>
              {formatDate(claim.incident.date)} {claim.incident.time ? `at ${claim.incident.time}` : ''}
              {claim.incident.timeUncertain ? ' (approximate)' : ''}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Location</div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginTop: '2px' }}>
              {claim.incident.location}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Type of Incident</div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginTop: '2px' }}>
              {claim.incident.type}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Damage Areas</div>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--color-primary-text)', marginTop: '2px' }}>
              {claim.incident.visibleDamageAreas?.join(', ') || 'None specified'}
            </div>
          </div>
        </div>

        {claim.narrative && (
          <div style={{ marginTop: '8px' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
              Claimant Narrative
            </div>
            <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.6, color: 'var(--color-text)', background: 'var(--color-surface-raised)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
              "{claim.narrative}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

