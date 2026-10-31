// ──────────────────────────────────────────────────────────────────────
//  apps/verifier/src/screens/CaseShell/tabs/RequestsMessagesTab.tsx
// ──────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import type { EvidenceRequest, User, PrivateNote } from '@claimlens/shared/types';
import { Button, MessageThread, LoadingState } from '@claimlens/shared/ui';
import { formatDate } from '@claimlens/shared/utils/format';
import { queryHooks, client } from '../../../client';

export function RequestsMessagesTab({
  claimId,
  user,
}: {
  claimId: string;
  user: User;
}) {
  const { data: requests = [], isLoading: reqLoading, refetch: refetchReq } = queryHooks.useRequests(claimId);
  const { data: messages = [], isLoading: msgLoading, refetch: refetchMsg } = queryHooks.useMessages(claimId);
  const { data: notes = [], isLoading: notesLoading, refetch: refetchNotes } = queryHooks.usePrivateNotes(claimId);

  // Send message
  const sendMutation = queryHooks.useSendMessage(claimId);

  // New Request Form Modal
  const [createReqModal, setCreateReqModal] = useState(false);
  const [reqTitle, setReqTitle] = useState('');
  const [reqReason, setReqReason] = useState('');
  const [reqExamples, setReqExamples] = useState('');
  const [creatingReq, setCreatingReq] = useState(false);

  // Private note input
  const [noteBody, setNoteBody] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const handleCreateRequest = async () => {
    if (!reqTitle.trim() || !reqReason.trim()) return;
    setCreatingReq(true);
    try {
      const examples = reqExamples
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      await client.createRequest(claimId, {
        title: reqTitle.trim(),
        reason: reqReason.trim(),
        examples,
      });
      setCreateReqModal(false);
      setReqTitle('');
      setReqReason('');
      setReqExamples('');
      await refetchReq();
    } catch (err: any) {
      alert(`Failed to create request: ${err.message}`);
    } finally {
      setCreatingReq(false);
    }
  };

  const handleResolveRequest = async (rid: string) => {
    try {
      await client.resolveRequest(claimId, rid);
      await refetchReq();
    } catch (err: any) {
      alert(`Could not resolve request: ${err.message}`);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteBody.trim() || addingNote) return;
    setAddingNote(true);
    try {
      await client.addPrivateNote(claimId, noteBody.trim());
      setNoteBody('');
      await refetchNotes();
    } catch (err: any) {
      alert(`Failed to add note: ${err.message}`);
    } finally {
      setAddingNote(false);
    }
  };

  if (reqLoading || msgLoading || notesLoading) return <LoadingState message="Loading collaboration workspace…" />;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: '20px', minHeight: 600 }}>
      {/* Column 1: Formal Evidence Requests */}
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>Evidence Requests</h3>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Formal claimant information requests</div>
          </div>
          <Button variant="filled" size="sm" onClick={() => setCreateReqModal(true)}>
            + New Request
          </Button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {requests.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginTop: 40 }}>
              No requests issued yet.
            </div>
          ) : (
            requests.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>{r.title}</div>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: r.status === 'resolved' ? 'rgba(34,197,94,0.15)' : 'rgba(234,179,8,0.15)',
                      color: r.status === 'resolved' ? '#4ade80' : '#facc15',
                      fontWeight: 600,
                    }}
                  >
                    {r.status}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                  {r.reason}
                </div>

                {/* Responses */}
                {r.responses && r.responses.length > 0 && (
                  <div style={{ padding: '8px 10px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', fontSize: '11px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-primary-text)' }}>Claimant Response:</div>
                    <div style={{ color: 'var(--color-text)', marginTop: 2 }}>
                      {r.responses[0].message || (r.responses[0].unavailable ? `Unavailable: ${r.responses[0].reason}` : 'Attached documents')}
                    </div>
                  </div>
                )}

                {r.status !== 'resolved' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                    <button
                      onClick={() => handleResolveRequest(r.id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        background: 'rgba(34,197,94,0.15)',
                        color: '#4ade80',
                        border: '1px solid rgba(34,197,94,0.3)',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      Mark Resolved ✓
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Column 2: Claimant Message Thread */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <MessageThread
          messages={messages}
          currentUser={user}
          onSendMessage={async (body) => {
            await sendMutation.mutateAsync({ body });
          }}
        />
      </div>

      {/* Column 3: Private Notes Panel (Verifier Only) */}
      <div
        style={{
          background: 'rgba(234,179,8,0.05)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid rgba(234,179,8,0.25)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '1rem' }}>🔒</span>
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: '#facc15' }}>
              Internal Private Notes
            </h3>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Visible exclusively to verifiers. Never exposed to claimant or shared APIs.
          </div>
        </div>

        {/* Notes Feed */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {notes.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginTop: 40 }}>
              No private notes recorded.
            </div>
          ) : (
            notes.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface)',
                  border: '1px solid rgba(234,179,8,0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--color-text-muted)' }}>
                  <span style={{ fontWeight: 600, color: '#facc15' }}>{n.author.name}</span>
                  <span>{formatDate(n.createdAt)}</span>
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text)', lineHeight: 1.4 }}>
                  {n.body}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Note Input */}
        <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <textarea
            rows={3}
            placeholder="Record confidential observation or hypothesis…"
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: '#fff',
              fontSize: 'var(--text-xs)',
              resize: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="tonal" size="sm" type="submit" disabled={!noteBody.trim() || addingNote}>
              {addingNote ? 'Saving…' : 'Add Note'}
            </Button>
          </div>
        </form>
      </div>

      {/* Create Request Modal */}
      {createReqModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border-strong)', borderRadius: 'var(--radius-xl)', padding: '24px', maxWidth: 480, width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>Create Information Request</h3>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>Request Title</label>
              <input
                type="text"
                placeholder="e.g. Revised workshop repair estimate with tax breakdown"
                value={reqTitle}
                onChange={(e) => setReqTitle(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>Detailed Rationale / Reason</label>
              <textarea
                rows={3}
                placeholder="Explain what is required and why it is needed to complete assessment…"
                value={reqReason}
                onChange={(e) => setReqReason(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px' }}>Acceptable Examples (one per line)</label>
              <textarea
                rows={2}
                placeholder="Itemised PDF invoice&#10;Authorised garage tax receipt"
                value={reqExamples}
                onChange={(e) => setReqExamples(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: '#fff' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button variant="outlined" size="sm" onClick={() => setCreateReqModal(false)}>Cancel</Button>
              <Button variant="filled" size="sm" disabled={!reqTitle.trim() || !reqReason.trim() || creatingReq} onClick={handleCreateRequest}>
                {creatingReq ? 'Creating…' : 'Send Request'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

