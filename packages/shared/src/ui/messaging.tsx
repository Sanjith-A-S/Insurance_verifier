// ──────────────────────────────────────────────────────────────────────
//  @claimlens/shared · ui/messaging.tsx
// ──────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import type { Message, User } from '../types.js';
import { formatDateTime } from '../utils/format.js';
import { Button } from './primitives.js';

export function MessageThread({
  messages,
  currentUser,
  onSendMessage,
  onOpenRequest,
}: {
  messages: Message[];
  currentUser: User;
  onSendMessage: (body: string) => Promise<void>;
  onOpenRequest?: (requestId: string) => void;
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await onSendMessage(text.trim());
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 400,
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
      }}
    >
      {/* Messages Scroll Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              margin: 'auto',
              textAlign: 'center',
              color: 'var(--color-text-muted)',
              fontSize: 'var(--text-sm)',
            }}
          >
            No messages yet. Start a conversation below.
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender.id === currentUser.id;
            const isNotice = msg.kind === 'request_notice';

            return (
              <div
                key={msg.id}
                style={{
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    color: 'var(--color-text-muted)',
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{msg.sender.name}</span>
                  <span>·</span>
                  <span>{formatDateTime(msg.createdAt)}</span>
                </div>

                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: isMe
                      ? '18px 18px 4px 18px'
                      : '18px 18px 18px 4px',
                    background: isNotice
                      ? 'rgba(249,115,22,0.12)'
                      : isMe
                      ? 'var(--color-primary)'
                      : 'var(--color-surface-raised)',
                    border: isNotice
                      ? '1px solid rgba(249,115,22,0.3)'
                      : isMe
                      ? 'none'
                      : '1px solid var(--color-border)',
                    color: isMe ? '#ffffff' : 'var(--color-text)',
                    fontSize: 'var(--text-sm)',
                    lineHeight: 1.5,
                  }}
                >
                  {isNotice && (
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: isMe ? '#fff' : '#fb923c',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '4px',
                      }}
                    >
                      Action Required
                    </div>
                  )}

                  <div>{msg.body}</div>

                  {msg.requestId && onOpenRequest && (
                    <button
                      onClick={() => onOpenRequest(msg.requestId!)}
                      style={{
                        marginTop: '8px',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255,255,255,0.15)',
                        border: 'none',
                        color: isMe ? '#fff' : 'var(--color-primary-text)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      View Request Details →
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: '12px 16px',
          background: 'var(--color-surface-raised)',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          gap: '10px',
        }}
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            fontSize: 'var(--text-sm)',
          }}
        />
        <Button variant="filled" size="sm" type="submit" disabled={!text.trim() || sending}>
          Send
        </Button>
      </form>
    </div>
  );
}

