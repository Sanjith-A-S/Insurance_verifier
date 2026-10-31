// ──────────────────────────────────────────────────────────────────────
//  apps/claimant/src/screens/MessagesView.tsx
// ──────────────────────────────────────────────────────────────────────
import React from 'react';
import type { User } from '@claimlens/shared/types';
import { MessageThread, LoadingState, ErrorState } from '@claimlens/shared/ui';
import { queryHooks } from '../client';

export function MessagesView({
  claimId,
  user,
  onBack,
  onOpenRequest,
}: {
  claimId: string;
  user: User;
  onBack?: () => void;
  onOpenRequest?: (requestId: string) => void;
}) {
  const { data: messages = [], isLoading, error } = queryHooks.useMessages(claimId);
  const sendMutation = queryHooks.useSendMessage(claimId);

  if (isLoading) return <LoadingState message="Loading messages…" />;
  if (error) return <ErrorState title="Failed to load messages" message={error.message} />;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 100px', display: 'flex', flexDirection: 'column', gap: '16px', height: 'calc(100vh - 120px)' }}>
      {onBack && (
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
            }}
          >
            ← Back to Claim
          </button>
        </div>
      )}

      <div>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>
          Investigation Communication
        </h1>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
          Direct channel with your assigned claims investigator.
        </p>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <MessageThread
          messages={messages}
          currentUser={user}
          onSendMessage={async (body) => {
            await sendMutation.mutateAsync({ body });
          }}
          onOpenRequest={onOpenRequest}
        />
      </div>
    </div>
  );
}

