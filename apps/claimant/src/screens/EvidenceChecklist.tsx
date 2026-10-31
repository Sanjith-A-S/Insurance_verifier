// ──────────────────────────────────────────────────────────────────────
//  apps/claimant/src/screens/EvidenceChecklist.tsx
// ──────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import type { ChecklistItem } from '@claimlens/shared/types';
import { Button, StatusBadge, LoadingState, ErrorState, ScallopProgress } from '@claimlens/shared/ui';
import { CHECKLIST_CATEGORY_LABELS } from '@claimlens/shared/constants';
import { queryHooks, client } from '../client';

export function EvidenceChecklist({
  claimId,
  onBack,
  onOpenCamera,
}: {
  claimId: string;
  onBack: () => void;
  onOpenCamera: (itemId?: string) => void;
}) {
  const { data: claim, isLoading: claimLoading } = queryHooks.useClaim(claimId);
  const { data: checklist = [], isLoading, error, refetch } = queryHooks.useChecklist(claimId);
  const { data: evidence = [] } = queryHooks.useEvidence(claimId);
  const submitMutation = queryHooks.useSubmitClaim(claimId);

  const [activeItem, setActiveItem] = useState<ChecklistItem | null>(null);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);

  // Mark unavailable modal state
  const [unavItem, setUnavItem] = useState<ChecklistItem | null>(null);
  const [unavReason, setUnavReason] = useState('');
  const [submittingUnav, setSubmittingUnav] = useState(false);

  if (isLoading || claimLoading) return <LoadingState message="Loading checklist…" />;
  if (error) return <ErrorState title="Failed to load checklist" message={error.message} onRetry={refetch} />;

  // Group checklist items by category
  const categories: Record<string, ChecklistItem[]> = {};
  for (const item of checklist) {
    const cat = item.category || 'other';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(item);
  }

  // Precondition checks for submission
  const hasPhoto = evidence.some((e) => e.category === 'photos_video');
  const hasDoc = evidence.some((e) => e.category !== 'photos_video');
  const canSubmit = hasPhoto && hasDoc;
  const isDraft = claim?.status === 'draft';

  // Handle file upload for a specific checklist item
  const handleFileUpload = async (itemId: string, category: string, file: File) => {
    setUploadingItemId(itemId);
    setUploadPercent(0);
    try {
      await client.uploadEvidence({
        claimId,
        file,
        category,
        checklistItemId: itemId,
        source: 'uploaded_file',
        onProgress: (e) => setUploadPercent(e.percent),
      });
      await refetch();
    } catch (err: any) {
      alert(`Upload failed: ${err.message || 'Unknown error'}`);
    } finally {
      setUploadingItemId(null);
    }
  };

  const handleMarkUnavailable = async () => {
    if (!unavItem || !unavReason.trim()) return;
    setSubmittingUnav(true);
    try {
      await client.markUnavailable(claimId, unavItem.id, unavReason.trim());
      setUnavItem(null);
      setUnavReason('');
      await refetch();
    } catch (err: any) {
      alert(`Failed to update item: ${err.message}`);
    } finally {
      setSubmittingUnav(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 120px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>
              Evidence Checklist
            </h1>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              Upload required photos and supporting documents to proceed.
            </p>
          </div>
          <ScallopProgress
            done={checklist.filter((i) => i.status === 'received' || i.status === 'reviewed').length}
            total={checklist.length}
            width={140}
          />
        </div>
      </div>

      {/* Categories Accordions */}
      {Object.entries(categories).map(([catKey, items]) => {
        const catTitle = CHECKLIST_CATEGORY_LABELS[catKey] || catKey;

        return (
          <div
            key={catKey}
            style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--color-border)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '14px 20px',
                background: 'var(--color-surface-raised)',
                borderBottom: '1px solid var(--color-border)',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color: 'var(--color-text)',
              }}
            >
              {catTitle} ({items.length})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {items.map((item) => {
                const isItemUploading = uploadingItemId === item.id;
                const isComplete = item.status === 'received' || item.status === 'reviewed';
                const isUnavailable = item.status === 'unavailable';

                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '16px 20px',
                      borderBottom: '1px solid var(--color-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                            {item.label}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: item.requirement === 'required' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.08)',
                              color: item.requirement === 'required' ? '#f87171' : 'var(--color-text-muted)',
                            }}
                          >
                            {item.requirement}
                          </span>
                        </div>
                        {item.acceptableExamples && item.acceptableExamples.length > 0 && (
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                            {item.acceptableExamples[0]}
                          </div>
                        )}
                        {item.unavailableReason && (
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)', marginTop: '4px' }}>
                            Unavailable: {item.unavailableReason}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <StatusBadge status={item.status} />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* Hidden File Input */}
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--color-surface-raised)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text)',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        <span>📁 Choose file</span>
                        <input
                          type="file"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFileUpload(item.id, item.category, f);
                          }}
                        />
                      </label>

                      {/* Camera Button for photo categories */}
                      {item.category === 'photos_video' && (
                        <button
                          onClick={() => onOpenCamera(item.id)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--color-primary-tint)',
                            border: '1px solid rgba(26,110,245,0.3)',
                            color: 'var(--color-primary-text)',
                            fontSize: 'var(--text-xs)',
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          📷 Capture photo
                        </button>
                      )}

                      {!isComplete && !isUnavailable && (
                        <button
                          onClick={() => setUnavItem(item)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-text-muted)',
                            fontSize: 'var(--text-xs)',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          Mark unavailable
                        </button>
                      )}
                    </div>

                    {isItemUploading && (
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-text)' }}>
                        Uploading… {uploadPercent}%
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Submission Bar */}
      {isDraft && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(17,17,24,0.95)',
            backdropFilter: 'blur(16px)',
            borderTop: '1px solid var(--color-border-strong)',
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 35,
          }}
        >
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Ready to Submit?</div>
            <div style={{ fontSize: 'var(--text-xs)', color: canSubmit ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
              {canSubmit
                ? 'Preconditions met: ≥1 photo and ≥1 document present.'
                : 'Requires at least 1 photo and 1 supporting document.'}
            </div>
          </div>

          <Button
            variant="filled"
            size="md"
            disabled={!canSubmit || submitMutation.isPending}
            onClick={() => submitMutation.mutate()}
          >
            {submitMutation.isPending ? 'Submitting…' : 'Submit Claim'}
          </Button>
        </div>
      )}

      {/* Mark Unavailable Modal */}
      {unavItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border-strong)',
              borderRadius: 'var(--radius-xl)',
              padding: '24px',
              maxWidth: 480,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>
              Mark Item Unavailable
            </h3>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              Please provide a clear reason why <strong>{unavItem.label}</strong> cannot be provided.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Police did not register FIR as no third party or injury was involved…"
              value={unavReason}
              onChange={(e) => setUnavReason(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: '#fff',
                fontSize: 'var(--text-xs)',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="outlined" size="sm" onClick={() => setUnavItem(null)}>
                Cancel
              </Button>
              <Button
                variant="filled"
                size="sm"
                disabled={!unavReason.trim() || submittingUnav}
                onClick={handleMarkUnavailable}
              >
                {submittingUnav ? 'Saving…' : 'Confirm Unavailable'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

