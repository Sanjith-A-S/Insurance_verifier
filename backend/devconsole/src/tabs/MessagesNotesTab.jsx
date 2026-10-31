import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { useApp } from '../context.jsx';
import { Card, Button, Field, Spinner, Empty, Chip } from '../ui.jsx';

export default function MessagesNotesTab({ claim }) {
  const { identity } = useApp();
  const [messages, setMessages] = useState([]);
  const [privateNotes, setPrivateNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  // Message Send
  const [msgBody, setMsgBody] = useState('');

  // Private Note Form
  const [noteBody, setNoteBody] = useState('');

  // Leak Check Results
  const [leakChecking, setLeakChecking] = useState(false);
  const [leakResult, setLeakResult] = useState(null); // { passed: boolean, leaks: [] }

  const isVerifier = identity?.role === 'verifier';
  const claimId = claim?.id || claim?._id;

  const loadData = useCallback(async () => {
    if (!claimId) return;
    setLoading(true);
    try {
      const msgRes = await api('GET', `/claims/${claimId}/messages`);
      setMessages(Array.isArray(msgRes) ? msgRes : msgRes.items || []);

      if (isVerifier) {
        const notesRes = await api('GET', `/claims/${claimId}/private-notes`);
        setPrivateNotes(Array.isArray(notesRes) ? notesRes : notesRes.items || []);
      }
    } catch (err) {
      console.warn('Messages load error:', err);
    } finally {
      setLoading(false);
    }
  }, [claimId, isVerifier]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!msgBody.trim()) return;
    setBusy(true);

    try {
      await api('POST', `/claims/${claimId}/messages`, {
        body: { body: msgBody.trim() },
      });
      setMsgBody('');
      await loadData();
    } catch (err) {
      console.error('Send message failed:', err);
    } finally {
      setBusy(false);
    }
  };

  const handleMarkRead = async () => {
    setBusy(true);
    try {
      await api('POST', `/claims/${claimId}/messages/read`);
      await loadData();
    } catch (err) {
      console.error('Mark read failed:', err);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!noteBody.trim()) return;
    setBusy(true);

    try {
      await api('POST', `/claims/${claimId}/private-notes`, {
        body: { body: noteBody.trim() },
      });
      setNoteBody('');
      await loadData();
    } catch (err) {
      console.error('Create private note failed:', err);
    } finally {
      setBusy(false);
    }
  };

  // Leak check: fetches claim endpoints as claimant and scans for private note text
  const handleRunLeakCheck = async () => {
    if (!claim?.claimantId || privateNotes.length === 0) {
      alert('Need at least 1 private note to test leak check.');
      return;
    }

    setLeakChecking(true);
    setLeakResult(null);

    const claimantId = claim.claimantId;
    const testEndpoints = [
      `/claims/${claimId}`,
      `/claims/${claimId}/messages`,
      `/claims/${claimId}/timeline`,
      `/claims/${claimId}/requests`,
      `/claims/${claimId}/evidence`,
      `/claims/${claimId}/recommendations`,
      `/claims/${claimId}/decisions`,
    ];

    const leakedEndpoints = [];

    for (const ep of testEndpoints) {
      try {
        const data = await api('GET', ep, { customUserId: claimantId });
        const jsonString = JSON.stringify(data).toLowerCase();

        for (const note of privateNotes) {
          const noteText = (note.body || '').trim().toLowerCase();
          if (noteText.length > 5 && jsonString.includes(noteText)) {
            leakedEndpoints.push(`${ep} (leaked: "${note.body.slice(0, 30)}...")`);
          }
        }
      } catch (err) {
        // 404 or 403 are expected secure responses for verifier-only endpoints (e.g. decisions)
      }
    }

    setLeakChecking(false);
    if (leakedEndpoints.length === 0) {
      setLeakResult({ passed: true, leaks: [] });
    } else {
      setLeakResult({ passed: false, leaks: leakedEndpoints });
    }
  };

  if (!claim) return <Empty message="No claim selected" />;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isVerifier ? '1.2fr 0.8fr' : '1fr', gap: 16 }}>
      {/* Messages Thread Column */}
      <Card
        title="Claim Discussion Thread"
        subtitle="Direct channel between policyholder and assigned claims team"
        action={
          <Button variant="text" size="s" disabled={busy} onClick={handleMarkRead}>
            Mark All Read
          </Button>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: 24 }}><Spinner /></div>
        ) : messages.length === 0 ? (
          <Empty message="No messages exchanged yet" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto', paddingRight: 6 }}>
            {messages.map((m) => {
              const isMine = m.sender?.id === identity?.id || m.sender?.id === identity?._id;
              const isNotice = m.kind === 'request_notice';

              return (
                <div
                  key={m.id || m._id}
                  style={{
                    alignSelf: isMine ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    padding: '12px 16px',
                    borderRadius: '20px',
                    background: isMine
                      ? 'var(--primary)'
                      : isNotice
                      ? 'var(--surface-border)'
                      : 'var(--surface-raised)',
                    color: isMine ? '#fff' : 'var(--text)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 4, fontSize: '0.72rem', opacity: 0.8 }}>
                    <strong>{m.sender?.name || 'User'} ({m.sender?.role || 'role'})</strong>
                    <span>{new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ fontSize: '0.88rem', lineHeight: '1.4' }}>{m.body}</div>
                  {isNotice && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--accent)', marginTop: 4 }}>
                      • System Clarification Notice
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Send message box */}
        <form onSubmit={handleSendMessage} style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          <input
            className="m3-input"
            placeholder="Type your message here..."
            value={msgBody}
            onChange={(e) => setMsgBody(e.target.value)}
          />
          <Button type="submit" variant="filled" disabled={busy || !msgBody.trim()}>
            Send
          </Button>
        </form>
      </Card>

      {/* Verifier-only Private Notes Column */}
      {isVerifier && (
        <Card
          title="Internal Private Notes"
          subtitle="Strictly isolated from claimant view"
          action={
            <Button variant="outlined" size="s" disabled={leakChecking} onClick={handleRunLeakCheck}>
              {leakChecking ? 'Auditing...' : 'Security Leak Check'}
            </Button>
          }
        >
          {/* Leak Check Result Alert */}
          {leakResult && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '16px',
                marginBottom: 12,
                background: leakResult.passed ? 'var(--accent-tonal)' : 'var(--error-tonal)',
                border: leakResult.passed ? '1px solid var(--accent)' : '1px solid var(--error)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: leakResult.passed ? 'var(--accent)' : 'var(--error)' }}>
                {leakResult.passed ? '✓ No Leaks Found (Claimant isolated)' : '✗ Data Leakage Detected!'}
              </div>
              {!leakResult.passed && (
                <ul style={{ paddingLeft: 18, fontSize: '0.75rem', marginTop: 4, color: 'var(--text)' }}>
                  {leakResult.leaks.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Notes list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
            {privateNotes.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', padding: '10px 0' }}>
                No private investigation notes yet.
              </div>
            ) : (
              privateNotes.map((n) => (
                <div
                  key={n.id || n._id}
                  style={{
                    padding: '10px 14px',
                    background: 'var(--surface-raised)',
                    borderRadius: '16px',
                    border: '1px solid var(--surface-border)',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{n.body}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    By {n.author?.name || 'Investigator'} • {new Date(n.createdAt || Date.now()).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add private note */}
          <form onSubmit={handleCreateNote} style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <textarea
              className="m3-textarea"
              rows={2}
              placeholder="Record confidential verifier thoughts or investigation rationale..."
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" variant="tonal" size="s" disabled={busy || !noteBody.trim()}>
                Save Private Note
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

