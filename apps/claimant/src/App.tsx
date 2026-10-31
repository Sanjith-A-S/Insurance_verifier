// ──────────────────────────────────────────────────────────────────────
//  apps/claimant/src/App.tsx
// ──────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { TopBar, Dock } from '@claimlens/shared/ui';
import { useDemoIdentity } from '@claimlens/shared/hooks/useDemoIdentity';
import { queryHooks } from './client';

// Screens
import { ClaimsHome } from './screens/ClaimsHome';
import { ClaimDetail } from './screens/ClaimDetail';
import { CreateClaimWizard } from './screens/CreateClaimWizard';
import { EvidenceChecklist } from './screens/EvidenceChecklist';
import { CameraCaptureView } from './screens/CameraCaptureView';
import { MessagesView } from './screens/MessagesView';
import { RequestResponseView } from './screens/RequestResponseView';
import { FutureCoverageView } from './screens/FutureCoverageView';

export function App() {
  const { user, setUserId } = useDemoIdentity();

  // Navigation state
  const [view, setView] = useState<'claims' | 'claim-detail' | 'new-claim' | 'checklist' | 'camera' | 'messages' | 'request-response' | 'coverage'>('claims');
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [cameraItemId, setCameraItemId] = useState<string | undefined>(undefined);

  // Queries
  const { data: claimsData, isLoading, error, refetch } = queryHooks.useClaims();
  const claims = claimsData?.items || [];

  // Calculate unread message badge count
  const unreadMessagesCount = claims.reduce((acc, c) => acc + (c.unreadMessageCount || 0), 0);

  const openClaim = (id: string) => {
    setSelectedClaimId(id);
    setView('claim-detail');
  };

  const openChecklist = (id?: string) => {
    if (id) setSelectedClaimId(id);
    setView('checklist');
  };

  const openCamera = (itemId?: string) => {
    setCameraItemId(itemId);
    setView('camera');
  };

  const openRequest = (requestId: string) => {
    setSelectedRequestId(requestId);
    setView('request-response');
  };

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', color: 'var(--color-text)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar */}
      <TopBar
        appName="Claimant Portal"
        user={user}
        onSelectUser={setUserId}
      />

      {/* Main View Router */}
      <main style={{ flex: 1 }}>
        {view === 'claims' && (
          <ClaimsHome
            claims={claims}
            loading={isLoading}
            error={error}
            user={user}
            onSelectClaim={openClaim}
            onCreateClaim={() => setView('new-claim')}
          />
        )}

        {view === 'claim-detail' && selectedClaimId && (
          <ClaimDetail
            claimId={selectedClaimId}
            onBack={() => setView('claims')}
            onOpenChecklist={() => openChecklist(selectedClaimId)}
            onOpenMessages={() => setView('messages')}
            onOpenCamera={() => openCamera()}
            onOpenRequest={openRequest}
            onOpenCoverage={() => setView('coverage')}
          />
        )}

        {view === 'new-claim' && (
          <CreateClaimWizard
            onCancel={() => setView('claims')}
            onCreated={(newId) => {
              refetch();
              openClaim(newId);
            }}
          />
        )}

        {view === 'checklist' && selectedClaimId && (
          <EvidenceChecklist
            claimId={selectedClaimId}
            onBack={() => setView('claim-detail')}
            onOpenCamera={(itemId) => openCamera(itemId)}
          />
        )}

        {view === 'camera' && selectedClaimId && (
          <CameraCaptureView
            claimId={selectedClaimId}
            checklistItemId={cameraItemId}
            onClose={() => setView(selectedRequestId ? 'request-response' : 'checklist')}
            onUploaded={() => refetch()}
          />
        )}

        {view === 'messages' && (
          <MessagesView
            claimId={selectedClaimId || claims[0]?.id || 'CL-2041'}
            user={user}
            onBack={() => setView(selectedClaimId ? 'claim-detail' : 'claims')}
            onOpenRequest={openRequest}
          />
        )}

        {view === 'request-response' && selectedClaimId && selectedRequestId && (
          <RequestResponseView
            claimId={selectedClaimId}
            requestId={selectedRequestId}
            onBack={() => setView('claim-detail')}
            onSubmitted={() => {
              refetch();
              setView('claim-detail');
            }}
          />
        )}

        {view === 'coverage' && selectedClaimId && (
          <FutureCoverageView
            claimId={selectedClaimId}
            onBack={() => setView('claim-detail')}
          />
        )}
      </main>

      {/* Floating Bottom Dock (Claimant Mobile-First) */}
      {view !== 'camera' && (
        <Dock
          activeTab={view === 'messages' ? 'messages' : 'claims'}
          onSelectTab={(tab) => {
            if (tab === 'claims') setView('claims');
            if (tab === 'messages') setView('messages');
          }}
          unreadMessages={unreadMessagesCount}
          onCreateClaim={() => setView('new-claim')}
        />
      )}
    </div>
  );
}

