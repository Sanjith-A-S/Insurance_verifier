// ──────────────────────────────────────────────────────────────────────
//  @claimlens/shared · ui/cards.tsx
// ──────────────────────────────────────────────────────────────────────
import React from 'react';
import type { EvidenceFile, User } from '../types.js';
import { formatBytes, formatDate } from '../utils/format.js';
import { ProvenanceChip } from './primitives.js';
import { DEMO_USERS } from '../constants.js';

// ── EvidenceCard ───────────────────────────────────────────────────────
export function EvidenceCard({
  file,
  onClick,
  onReview,
}: {
  file: EvidenceFile;
  onClick?: () => void;
  onReview?: (status: 'reviewed' | 'needs_replacement') => void;
}) {
  const isImage = file.mimeType.startsWith('image/');
  const isPdf = file.mimeType === 'application/pdf';

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color var(--duration-fast), transform var(--duration-fast)',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = 'var(--color-primary)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = 'var(--color-border)';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      {/* File Preview Thumbnail */}
      <div
        style={{
          height: 140,
          background: 'var(--color-surface-raised)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-muted)',
          fontSize: '2rem',
          position: 'relative',
        }}
      >
        {isImage ? '🖼️' : isPdf ? '📄' : '📁'}
        <span
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            padding: '2px 6px',
            background: 'rgba(0,0,0,0.6)',
            borderRadius: '4px',
            color: '#fff',
          }}
        >
          {formatBytes(file.sizeBytes)}
        </span>
      </div>

      {/* Meta Content */}
      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }} className="truncate">
          {file.fileName}
        </div>

        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          {formatDate(file.receivedAt)} · {file.source === 'captured_in_app' ? 'In-App Camera' : 'Uploaded File'}
        </div>

        {/* Provenance Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
          {file.provenance.metadata.present && (
            <ProvenanceChip label="EXIF" />
          )}
          {file.provenance.duplicateOfIds && file.provenance.duplicateOfIds.length > 0 && (
            <span
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(239,68,68,0.15)',
                color: '#f87171',
                border: '1px solid rgba(239,68,68,0.3)',
              }}
            >
              Duplicate
            </span>
          )}
        </div>

        {/* Verifier Actions */}
        {onReview && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReview('reviewed');
              }}
              style={{
                flex: 1,
                padding: '6px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '6px',
                background: 'rgba(34,197,94,0.15)',
                color: '#4ade80',
                border: '1px solid rgba(34,197,94,0.3)',
                cursor: 'pointer',
              }}
            >
              Mark Reviewed
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReview('needs_replacement');
              }}
              style={{
                flex: 1,
                padding: '6px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '6px',
                background: 'rgba(239,68,68,0.15)',
                color: '#f87171',
                border: '1px solid rgba(239,68,68,0.3)',
                cursor: 'pointer',
              }}
            >
              Replace
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── DemoIdentityMenu ───────────────────────────────────────────────────
export function DemoIdentityMenu({
  currentUser,
  onSelectUser,
}: {
  currentUser: User;
  onSelectUser: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--color-surface-raised)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text)',
          fontSize: 'var(--text-xs)',
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: currentUser.role === 'verifier' ? '#c084fc' : '#60a5fa',
          }}
        />
        <span>{currentUser.name}</span>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '10px' }}>({currentUser.role})</span>
        <span style={{ fontSize: '10px', opacity: 0.6 }}>▼</span>
      </button>

      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 50 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '6px',
              width: '220px',
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border-strong)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 51,
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <div
              style={{
                padding: '6px 10px',
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--color-text-faint)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Switch Demo Identity
            </div>
            {DEMO_USERS.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  onSelectUser(u.id);
                  setOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: u.id === currentUser.id ? 'var(--color-primary-tint)' : 'transparent',
                  color: u.id === currentUser.id ? 'var(--color-primary-text)' : 'var(--color-text)',
                  fontSize: 'var(--text-xs)',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{u.name}</div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{u.id}</div>
                </div>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: u.role === 'verifier' ? 'rgba(168,85,247,0.15)' : 'rgba(59,130,246,0.15)',
                    color: u.role === 'verifier' ? '#c084fc' : '#60a5fa',
                  }}
                >
                  {u.role}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── TopBar ─────────────────────────────────────────────────────────────
export function TopBar({
  appName,
  user,
  onSelectUser,
  extra,
}: {
  appName: string;
  user: User;
  onSelectUser: (id: string) => void;
  extra?: React.ReactNode;
}) {
  return (
    <header
      style={{
        height: 'var(--topbar-height)',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: 'var(--color-primary)',
            }}
          />
          <span style={{ fontWeight: 700, fontSize: 'var(--text-md)', letterSpacing: '-0.01em' }}>
            ClaimLens <span style={{ color: 'var(--color-primary-text)', fontWeight: 400 }}>AI</span>
          </span>
        </div>
        <span
          style={{
            fontSize: '10px',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(255,255,255,0.06)',
            color: 'var(--color-text-muted)',
            border: '1px solid var(--color-border)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {appName}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {extra}
        <DemoIdentityMenu currentUser={user} onSelectUser={onSelectUser} />
      </div>
    </header>
  );
}

// ── Dock (Claimant Mobile-First Floating Pill) ──────────────────────────
export function Dock({
  activeTab,
  onSelectTab,
  unreadMessages = 0,
  onCreateClaim,
}: {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  unreadMessages?: number;
  onCreateClaim?: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 14px',
        background: 'rgba(17,17,24,0.92)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--color-border-strong)',
        borderRadius: 'var(--radius-full)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}
    >
      <button
        onClick={() => onSelectTab('claims')}
        style={{
          padding: '8px 14px',
          borderRadius: 'var(--radius-full)',
          background: activeTab === 'claims' ? 'var(--color-primary)' : 'transparent',
          color: activeTab === 'claims' ? '#fff' : 'var(--color-text-muted)',
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Claims
      </button>

      {onCreateClaim && (
        <button
          onClick={onCreateClaim}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-primary)',
            color: '#fff',
            fontSize: 'var(--text-xs)',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>+</span> New Claim
        </button>
      )}

      <button
        onClick={() => onSelectTab('messages')}
        style={{
          padding: '8px 14px',
          borderRadius: 'var(--radius-full)',
          background: activeTab === 'messages' ? 'var(--color-primary)' : 'transparent',
          color: activeTab === 'messages' ? '#fff' : 'var(--color-text-muted)',
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
        }}
      >
        Messages
        {unreadMessages > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--color-error)',
            }}
          />
        )}
      </button>
    </div>
  );
}

