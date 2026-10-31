import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';
import { useApp } from '../context.jsx';
import { Card, Spinner, Empty, Chip, StatusBadge } from '../ui.jsx';

export default function DashboardTab() {
  const { setSelectedClaimId } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api('GET', '/investigator/dashboard');
      setData(res);
    } catch (err) {
      console.warn('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spinner size={32} />
      </div>
    );
  }

  if (!data) return <Empty message="Dashboard data unavailable" />;

  const { totals = {}, completenessBands = {}, overTime = [], nextUp = [], recentActivity = [] } = data;

  const maxChartCount = Math.max(...overTime.map((d) => d.count), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Stat Cards - Huge Lime Numbers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <Card>
          <div className="label-caps">Total Claims</div>
          <div className="stat-number">{totals.total || 0}</div>
        </Card>

        <Card>
          <div className="label-caps">New Queue</div>
          <div className="stat-number" style={{ color: 'var(--primary-light)' }}>
            {totals.new || 0}
          </div>
        </Card>

        <Card>
          <div className="label-caps">In Review</div>
          <div className="stat-number">{totals.in_review || 0}</div>
        </Card>

        <Card>
          <div className="label-caps">Awaiting Info</div>
          <div className="stat-number" style={{ color: 'var(--text-muted)' }}>
            {totals.awaiting_claimant || 0}
          </div>
        </Card>

        <Card>
          <div className="label-caps">Decision Pending</div>
          <div className="stat-number">{totals.decision_pending || 0}</div>
        </Card>

        <Card>
          <div className="label-caps">Completed</div>
          <div className="stat-number">{totals.completed || 0}</div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16 }}>
        {/* Over Time Simple CSS Bar Chart (Div bars, no library) */}
        <Card title="Claims Inflow Over Time" subtitle="Distribution by intake registration date">
          {overTime.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No date records</div>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 12,
                height: 140,
                padding: '16px 0 0',
                borderBottom: '1px solid var(--surface-border)',
              }}
            >
              {overTime.map((item) => {
                const heightPct = Math.round((item.count / maxChartCount) * 100);
                return (
                  <div
                    key={item.date}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 700 }}>
                      {item.count}
                    </span>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: 36,
                        height: `${Math.max(10, heightPct)}%`,
                        background: 'var(--primary)',
                        borderRadius: '6px 6px 0 0',
                        transition: 'height 250ms var(--ease-spring)',
                      }}
                    />
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {item.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Completeness Bands */}
        <Card title="Documentation Completeness" subtitle="Evidence checklist submission ratio">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Complete (100%)</span>
                <span>{completenessBands.complete || 0} claims</span>
              </div>
              <div style={{ width: '100%', height: 8, background: 'var(--surface-raised)', borderRadius: 9999 }}>
                <div
                  style={{
                    width: `${Math.round(((completenessBands.complete || 0) / (totals.total || 1)) * 100)}%`,
                    height: '100%',
                    background: 'var(--accent)',
                    borderRadius: 9999,
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                <span style={{ color: 'var(--primary-light)', fontWeight: 600 }}>Partial (50-99%)</span>
                <span>{completenessBands.partial || 0} claims</span>
              </div>
              <div style={{ width: '100%', height: 8, background: 'var(--surface-raised)', borderRadius: 9999 }}>
                <div
                  style={{
                    width: `${Math.round(((completenessBands.partial || 0) / (totals.total || 1)) * 100)}%`,
                    height: '100%',
                    background: 'var(--primary-light)',
                    borderRadius: 9999,
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                <span style={{ color: 'var(--error)', fontWeight: 600 }}>Missing Critical (&lt;50%)</span>
                <span>{completenessBands.mostlyMissing || 0} claims</span>
              </div>
              <div style={{ width: '100%', height: 8, background: 'var(--surface-raised)', borderRadius: 9999 }}>
                <div
                  style={{
                    width: `${Math.round(((completenessBands.mostlyMissing || 0) / (totals.total || 1)) * 100)}%`,
                    height: '100%',
                    background: 'var(--error)',
                    borderRadius: 9999,
                  }}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Next Up List */}
        <Card title="Next Up Queue" subtitle="Oldest unassigned new claims awaiting triage">
          {nextUp.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No new claims in queue</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {nextUp.map((c) => (
                <div
                  key={c.id || c._id}
                  onClick={() => setSelectedClaimId(c.id || c._id)}
                  style={{
                    padding: '10px 14px',
                    background: 'var(--surface-raised)',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.88rem' }}>
                        {c.id || c._id}
                      </span>
                      <span style={{ fontSize: '0.82rem' }}>{c.vehicleRegistration || c.vehicle?.registrationNumber}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {typeof c.nextStep === 'object'
                        ? (c.nextStep.label || c.nextStep.description || 'Awaiting initial assessment')
                        : (c.nextStep || 'Awaiting initial assessment')}
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Activity */}
        <Card title="Recent Activity" subtitle="Real-time timeline events across active claims">
          {recentActivity.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No recent activity</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentActivity.map((a, i) => (
                <div
                  key={a.id || i}
                  style={{
                    padding: '8px 12px',
                    background: 'var(--surface-raised)',
                    borderRadius: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{a.summary}</span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {a.claimId} • {a.actor?.name || 'System'}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    {new Date(a.at || Date.now()).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

