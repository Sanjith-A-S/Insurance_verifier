import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { useApp } from '../context.jsx';
import { Card, Button, StatusBadge, Field, Spinner, Empty, Chip } from '../ui.jsx';

export default function RequestsTab({ claim }) {
  const { identity } = useApp();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  // New Request Form (Verifier)
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');

  const isVerifier = identity?.role === 'verifier';
  const isClaimant = identity?.role === 'claimant';
  const claimId = claim?.id || claim?._id;

  const loadRequests = useCallback(async () => {
    if (!claimId) return;
    setLoading(true);
    try {
      const res = await api('GET', `/claims/${claimId}/requests`);
      setRequests(Array.isArray(res) ? res : res.items || []);
    } catch (err) {
      console.warn('Requests load error:', err);
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!title || !reason) return;
    setBusy(true);

    try {
      await api('POST', `/claims/${claimId}/requests`, {
        body: { title, reason },
      });
      setTitle('');
      setReason('');
      setShowCreate(false);
      await loadRequests();
    } catch (err) {
      console.error('Create request failed:', err);
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async (reqId) => {
    setBusy(true);
    try {
      await api('POST', `/claims/${claimId}/requests/${reqId}/send`);
      await loadRequests();
    } finally {
      setBusy(false);
    }
  };

  const handleResolve = async (reqId) => {
    setBusy(true);
    try {
      await api('POST', `/claims/${claimId}/requests/${reqId}/resolve`);
      await loadRequests();
    } finally {
      setBusy(false);
    }
  };

  const handleMarkNA = async (reqId) => {
    setBusy(true);
    try {
      await api('POST', `/claims/${claimId}/requests/${reqId}/not-applicable`);
      await loadRequests();
    } finally {
      setBusy(false);
    }
  };

  const handleClaimantRespond = async (reqId) => {
    const message = window.prompt('Enter your response message:');
    if (message === null) return;
    setBusy(true);
    try {
      await api('POST', `/claims/${claimId}/requests/${reqId}/response`, {
        body: { message, unavailable: false },
      });
      await loadRequests();
    } finally {
      setBusy(false);
    }
  };

  const handleClaimantMarkUnavailable = async (reqId) => {
    const reason = window.prompt('Reason why this document/information is unavailable:');
    if (!reason) return;
    setBusy(true);
    try {
      await api('POST', `/claims/${claimId}/requests/${reqId}/response`, {
        body: { unavailable: true, reason },
      });
      await loadRequests();
    } finally {
      setBusy(false);
    }
  };

  if (!claim) return <Empty message="No claim selected" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card
        title="Evidence Clarification Requests"
        subtitle="Formal investigator requests for missing documents or conflicting information"
        action={
          isVerifier && (
            <Button variant="filled" size="s" onClick={() => setShowCreate(!showCreate)}>
              {showCreate ? 'Cancel' : '+ New Request'}
            </Button>
          )
        }
      >
        {/* Create Request Form */}
        {showCreate && (
          <form
            onSubmit={handleCreateRequest}
            style={{
              padding: '16px',
              background: 'var(--surface-raised)',
              borderRadius: '20px',
              marginBottom: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Draft Clarification Request</div>
            <Field label="Request Title">
              <input
                className="m3-input"
                placeholder="e.g. Police GD Log Entry / Station Diary"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </Field>

            <Field label="Reason & Instructions">
              <textarea
                className="m3-textarea"
                rows={2}
                placeholder="Explain why this evidence is requested and what details are needed..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </Field>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="text" size="s" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="filled" size="s" disabled={busy || !title || !reason}>
                Save Request Draft
              </Button>
            </div>
          </form>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 24 }}><Spinner /></div>
        ) : requests.length === 0 ? (
          <Empty message="No evidence requests on file for this claim" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {requests.map((r) => {
              const reqId = r.id || r._id;
              return (
                <div
                  key={reqId}
                  style={{
                    padding: '14px 18px',
                    background: 'var(--surface-raised)',
                    borderRadius: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{r.title}</span>
                        <StatusBadge status={r.status} />
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text)', marginTop: 4 }}>
                        {r.reason}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        Requested by {r.createdBy?.name || 'Verifier'} • {new Date(r.createdAt || Date.now()).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {/* Verifier controls */}
                      {isVerifier && (
                        <>
                          {r.status === 'draft' && (
                            <Button variant="filled" size="s" disabled={busy} onClick={() => handleSend(reqId)}>
                              Send
                            </Button>
                          )}
                          {['sent', 'response_submitted'].includes(r.status) && (
                            <Button variant="tonal" size="s" disabled={busy} onClick={() => handleResolve(reqId)}>
                              Resolve
                            </Button>
                          )}
                          {r.status !== 'resolved' && r.status !== 'not_applicable' && (
                            <Button variant="text" size="s" disabled={busy} onClick={() => handleMarkNA(reqId)}>
                              Mark N/A
                            </Button>
                          )}
                        </>
                      )}

                      {/* Claimant controls */}
                      {isClaimant && r.status === 'sent' && (
                        <>
                          <Button variant="filled" size="s" disabled={busy} onClick={() => handleClaimantRespond(reqId)}>
                            Respond
                          </Button>
                          <Button variant="outlined" size="s" disabled={busy} onClick={() => handleClaimantMarkUnavailable(reqId)}>
                            Unavailable
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Claimant Responses History */}
                  {r.responses?.length > 0 && (
                    <div style={{ marginTop: 8, padding: '10px 14px', background: '#050508', borderRadius: '14px' }}>
                      <div className="label-caps" style={{ marginBottom: 4 }}>Claimant Response</div>
                      {r.responses.map((resp, i) => (
                        <div key={i} style={{ fontSize: '0.82rem' }}>
                          {resp.unavailable ? (
                            <span style={{ color: 'var(--error)' }}>
                              Marked unavailable: {resp.reason || 'No reason specified'}
                            </span>
                          ) : (
                            <span>{resp.message}</span>
                          )}
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Submitted by {resp.by?.name} at {new Date(resp.at).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

