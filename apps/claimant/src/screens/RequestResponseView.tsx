// ──────────────────────────────────────────────────────────────────────
//  apps/claimant/src/screens/RequestResponseView.tsx
// ──────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { Button, LoadingState, ErrorState } from '@claimlens/shared/ui';
import { queryHooks, client } from '../client';

export function RequestResponseView({
  claimId,
  requestId,
  onBack,
  onSubmitted,
}: {
  claimId: string;
  requestId: string;
  onBack: () => void;
  onSubmitted: () => void;
}) {
  const { data: requests = [], isLoading, error } = queryHooks.useRequests(claimId);
  const req = requests.find((r) => r.id === requestId);

  const [message, setMessage] = useState('');
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState('');
  const [uploadedIds, setUploadedIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return <LoadingState message="Loading request details…" />;
  if (error || !req) return <ErrorState title="Request not found" message={error?.message} />;

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await client.uploadEvidence({
        claimId,
        file,
        category: 'other',
        checklistItemId: req.checklistItemId || undefined,
        source: 'uploaded_file',
      });
      setUploadedIds((prev) => [...prev, res.id]);
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await client.respondToRequest(claimId, requestId, {
        message: message.trim() || undefined,
        evidenceIds: uploadedIds,
        unavailable: isUnavailable,
        reason: isUnavailable ? unavailableReason.trim() : undefined,
      });
      onSubmitted();
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 100px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
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
          ← Back to Claim
        </button>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>
          Respond to Information Request
        </h1>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
          Provide the requested documents or clarification for the investigator.
        </p>
      </div>

      {/* Request Details Card */}
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
        <div style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--color-text)' }}>
          {req.title}
        </div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
          {req.reason}
        </div>

        {req.examples && req.examples.length > 0 && (
          <div style={{ marginTop: '6px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
              Acceptable Examples:
            </div>
            <ul style={{ listStyleType: 'disc', paddingLeft: '20px', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              {req.examples.map((ex, i) => (
                <li key={i}>{ex}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Response Form */}
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-border)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div>
          <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>
            Your Explanation / Clarification
          </label>
          <textarea
            rows={4}
            placeholder="Type your response or clarification here…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isUnavailable}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              color: '#fff',
              fontSize: 'var(--text-xs)',
              lineHeight: 1.5,
              opacity: isUnavailable ? 0.4 : 1,
            }}
          />
        </div>

        {/* Supporting File Attachments */}
        <div>
          <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px' }}>
            Attach Supporting Documents ({uploadedIds.length} attached)
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                fontSize: 'var(--text-xs)',
                fontWeight: 500,
                cursor: isUnavailable ? 'not-allowed' : 'pointer',
                opacity: isUnavailable ? 0.4 : 1,
              }}
            >
              <span>📁 Select file to upload</span>
              <input
                type="file"
                disabled={isUnavailable || uploading}
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                }}
              />
            </label>
            {uploading && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-text)' }}>Uploading…</span>}
          </div>
        </div>

        {/* Unavailable Option */}
        <div style={{ paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-xs)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isUnavailable}
              onChange={(e) => setIsUnavailable(e.target.checked)}
            />
            <span>I cannot provide this document or information</span>
          </label>

          {isUnavailable && (
            <div style={{ marginTop: '10px' }}>
              <input
                type="text"
                placeholder="Reason why this cannot be provided…"
                value={unavailableReason}
                onChange={(e) => setUnavailableReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)',
                  color: '#fff',
                  fontSize: 'var(--text-xs)',
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <Button variant="outlined" size="md" onClick={onBack}>
          Cancel
        </Button>
        <Button
          variant="filled"
          size="md"
          disabled={submitting || (isUnavailable ? !unavailableReason.trim() : !message.trim() && uploadedIds.length === 0)}
          onClick={handleSubmit}
        >
          {submitting ? 'Submitting…' : 'Submit Response'}
        </Button>
      </div>
    </div>
  );
}

