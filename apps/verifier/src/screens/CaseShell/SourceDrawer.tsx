// ──────────────────────────────────────────────────────────────────────
//  apps/verifier/src/screens/CaseShell/SourceDrawer.tsx
// ──────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import type { EvidenceFile } from '@claimlens/shared/types';
import { formatBytes, formatDate } from '@claimlens/shared/utils/format';
import { ProvenanceChip } from '@claimlens/shared/ui';
import { client } from '../../client';

export function SourceDrawer({
  file,
  onClose,
}: {
  file: EvidenceFile | null;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'preview' | 'metadata'>('preview');

  if (!file) return null;

  const isImage = file.mimeType.startsWith('image/');
  const isPdf = file.mimeType === 'application/pdf';

  const handleDownload = () => {
    client.openEvidenceFile(file.claimId, file.id);
  };

  return (
    <aside
      style={{
        position: 'fixed',
        top: 'var(--topbar-height)',
        right: 0,
        bottom: 0,
        width: 'var(--source-drawer-width)',
        maxWidth: '100vw',
        background: 'var(--color-surface-raised)',
        borderLeft: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-xl)',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: 'var(--color-primary-text)' }}>
            {file.id}
          </div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, maxWidth: 280 }} className="truncate">
            {file.fileName}
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted)',
            fontSize: '1.2rem',
            cursor: 'pointer',
            padding: 4,
          }}
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
        }}
      >
        <button
          onClick={() => setTab('preview')}
          style={{
            flex: 1,
            padding: '10px',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            border: 'none',
            background: tab === 'preview' ? 'var(--color-surface-raised)' : 'transparent',
            color: tab === 'preview' ? 'var(--color-primary-text)' : 'var(--color-text-muted)',
            borderBottom: tab === 'preview' ? '2px solid var(--color-primary)' : 'none',
            cursor: 'pointer',
          }}
        >
          Document Preview
        </button>
        <button
          onClick={() => setTab('metadata')}
          style={{
            flex: 1,
            padding: '10px',
            fontSize: 'var(--text-xs)',
            fontWeight: 600,
            border: 'none',
            background: tab === 'metadata' ? 'var(--color-surface-raised)' : 'transparent',
            color: tab === 'metadata' ? 'var(--color-primary-text)' : 'var(--color-text-muted)',
            borderBottom: tab === 'metadata' ? '2px solid var(--color-primary)' : 'none',
            cursor: 'pointer',
          }}
        >
          Provenance & EXIF
        </button>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {tab === 'preview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
            <div
              style={{
                width: '100%',
                height: 240,
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '3rem',
                color: 'var(--color-text-muted)',
              }}
            >
              {isImage ? '🖼️' : isPdf ? '📄' : '📁'}
            </div>

            <button
              onClick={handleDownload}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-primary)',
                color: '#fff',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Open Original File ↗
            </button>
          </div>
        )}

        {tab === 'metadata' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: 'var(--color-surface)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Integrity & Hash
              </div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', color: 'var(--color-text)' }}>
                SHA-256: {file.sha256}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                Size: {formatBytes(file.sizeBytes)} ({file.sizeBytes} bytes)
              </div>
            </div>

            <div style={{ background: 'var(--color-surface)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Capture Source
              </div>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                {file.source === 'captured_in_app' ? 'In-App Live Camera' : 'User Disk Upload'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                Uploaded by {file.uploadedBy.name} on {formatDate(file.receivedAt)}
              </div>
            </div>

            {file.provenance.metadata.present && (
              <div style={{ background: 'var(--color-surface)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Camera EXIF Header
                </div>
                <div style={{ fontSize: 'var(--text-xs)' }}>
                  Device: {file.provenance.metadata.cameraMake || 'Unknown'} {file.provenance.metadata.cameraModel || ''}
                </div>
                <div style={{ fontSize: 'var(--text-xs)' }}>
                  Capture Timestamp: {file.provenance.metadata.dateTaken ? formatDate(file.provenance.metadata.dateTaken) : 'Not recorded'}
                </div>
                <div style={{ fontSize: 'var(--text-xs)' }}>
                  GPS Coordinates: {file.provenance.metadata.gpsPresent ? 'Present in EXIF' : 'Omitted / Not present'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

