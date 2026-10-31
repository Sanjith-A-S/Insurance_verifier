import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { Card, Spinner, Empty, Chip } from '../ui.jsx';

export default function TimelineTab({ claim }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const claimId = claim?.id || claim?._id;

  const loadTimeline = useCallback(async () => {
    if (!claimId) return;
    setLoading(true);
    try {
      const res = await api('GET', `/claims/${claimId}/timeline`);
      setEvents(Array.isArray(res) ? res : res.items || []);
    } catch (err) {
      console.warn('Timeline load error:', err);
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  if (!claim) return <Empty message="No claim selected" />;

  return (
    <Card
      title="Audit Lifecycle Timeline"
      subtitle="Chronological sequence of all system, claimant and investigator events"
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}><Spinner /></div>
      ) : events.length === 0 ? (
        <Empty message="No timeline events recorded yet" />
      ) : (
        <div style={{ position: 'relative', paddingLeft: 24, marginTop: 12 }}>
          {/* Vertical line */}
          <div
            style={{
              position: 'absolute',
              left: 7,
              top: 6,
              bottom: 6,
              width: 2,
              background: 'var(--surface-border)',
            }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {events.map((ev, i) => (
              <div key={ev.id || i} style={{ position: 'relative' }}>
                {/* Bullet dot */}
                <div
                  style={{
                    position: 'absolute',
                    left: -21,
                    top: 4,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: ev.visibility === 'verifier' ? 'var(--primary-light)' : 'var(--accent)',
                    border: '2px solid var(--surface)',
                  }}
                />

                <div
                  style={{
                    background: 'var(--surface-raised)',
                    padding: '12px 16px',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{ev.summary}</span>
                      <Chip label={ev.kind?.replace(/_/g, ' ') || 'event'} variant="cobalt" />
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {new Date(ev.createdAt || Date.now()).toLocaleString()}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 10, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>Actor: <strong>{ev.actor?.name || 'System'}</strong> ({ev.actor?.role || 'system'})</span>
                    <span>Visibility: {ev.visibility || 'claimant'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

