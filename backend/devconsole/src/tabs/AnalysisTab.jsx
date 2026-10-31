import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api.js';
import { Card, Button, StatusBadge, Chip, Spinner, Empty, JsonView } from '../ui.jsx';

export default function AnalysisTab({ claim }) {
  const [analysis, setAnalysis] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [progressStatus, setProgressStatus] = useState(null);

  const claimId = claim?.id || claim?._id;
  const pollIntervalRef = useRef(null);

  const loadAnalysis = useCallback(async (version = null) => {
    if (!claimId) return;
    setLoading(true);
    try {
      const q = version ? `?version=${version}` : '';
      const data = await api('GET', `/claims/${claimId}/analysis${q}`);
      setAnalysis(data);
      if (data?.version) setSelectedVersion(data.version);
    } catch (err) {
      if (err.code === 'ANALYSIS_NOT_FOUND') {
        setAnalysis(null);
      } else {
        console.warn('Analysis load error:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    loadAnalysis();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [loadAnalysis]);

  const pollStatus = useCallback(async () => {
    try {
      const statusRes = await api('GET', `/claims/${claimId}/analysis/status`);
      setProgressStatus(statusRes);

      if (statusRes.state === 'ready' || statusRes.state === 'unavailable') {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setPolling(false);
        await loadAnalysis();
      }
    } catch (err) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setPolling(false);
    }
  }, [claimId, loadAnalysis]);

  const handleRunAnalysis = async () => {
    setPolling(true);
    try {
      const initRes = await api('POST', `/claims/${claimId}/analysis`);
      setProgressStatus({ state: 'running', percentComplete: 10 });
      pollIntervalRef.current = setInterval(pollStatus, 1500);
    } catch (err) {
      setPolling(false);
    }
  };

  const handleFindingReview = async (findingId, status) => {
    let reason = '';
    if (status === 'dismissed' || status === 'clarification_requested') {
      reason = window.prompt(`Reason for marking finding as ${status}:`) || '';
      if (!reason) return;
    }

    try {
      await api('PATCH', `/claims/${claimId}/analysis/findings/${findingId}`, {
        body: { status, reason },
      });
      await loadAnalysis(selectedVersion);
    } catch (err) {
      console.error('Finding review failed:', err);
    }
  };

  const handleAnnotateMatrix = async (rowId) => {
    const text = window.prompt(`Annotate matrix row '${rowId}':`);
    if (!text) return;

    try {
      await api('POST', `/claims/${claimId}/analysis/matrix/annotate`, {
        body: { rowId, text },
      });
      await loadAnalysis(selectedVersion);
    } catch (err) {
      console.error('Annotate failed:', err);
    }
  };

  if (!claim) return <Empty message="No claim selected" />;

  const versionsAvailable = [];
  const latestV = claim.latestAnalysisVersion || analysis?.version || 1;
  for (let v = latestV; v >= 1; v--) {
    versionsAvailable.push(v);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header & Trigger */}
      <Card
        title="Multi-Stage Investigation Analysis"
        subtitle="Extracts document facts, verifies deterministic rules, and evaluates evidence matrix"
        action={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {versionsAvailable.length > 0 && (
              <select
                className="m3-select"
                style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8rem' }}
                value={selectedVersion || ''}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setSelectedVersion(v);
                  loadAnalysis(v);
                }}
              >
                {versionsAvailable.map((v) => (
                  <option key={v} value={v}>
                    Version {v} {v === claim.latestAnalysisVersion ? '(Latest)' : ''}
                  </option>
                ))}
              </select>
            )}

            <Button variant="filled" disabled={polling} onClick={handleRunAnalysis}>
              {polling ? 'Analysis in Progress...' : 'Run Analysis'}
            </Button>
          </div>
        }
      >
        {polling && (
          <div style={{ padding: '16px', background: 'var(--surface-raised)', borderRadius: '18px', marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <Spinner size={18} />
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--primary-light)' }}>
                Running pipeline... {progressStatus?.activeStage ? `[${progressStatus.activeStage}]` : ''}
              </span>
            </div>
            {progressStatus?.stages && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {progressStatus.stages.map((s) => (
                  <Chip
                    key={s.name}
                    label={`${s.name}: ${s.status}`}
                    variant={s.status === 'completed' ? 'lime' : s.status === 'running' ? 'cobalt' : 'grey'}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 30 }}><Spinner /></div>
        ) : !analysis ? (
          <Empty
            message="No analysis generated yet for this claim"
            action={
              <Button variant="filled" onClick={handleRunAnalysis} style={{ marginTop: 10 }}>
                Run Initial Analysis
              </Button>
            }
          />
        ) : (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <StatusBadge status={analysis.state} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Model: {analysis.model?.name || 'Deterministic Rules Engine'}
              </span>
            </div>
            <p style={{ fontSize: '0.92rem', lineHeight: '1.5', color: 'var(--text)' }}>
              {analysis.summary}
            </p>
          </div>
        )}
      </Card>

      {analysis && (
        <>
          {/* Findings Section */}
          <Card
            title="Investigation Findings"
            subtitle={`${analysis.findings?.length || 0} findings evaluated across deterministic rules & observation`}
          >
            {(!analysis.findings || analysis.findings.length === 0) ? (
              <div style={{ color: 'var(--accent)', fontSize: '0.9rem', padding: '10px 0' }}>
                All documented facts and declarations are consistent without discrepancies.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {analysis.findings.map((f) => {
                  const isLowEvidence = f.lowEvidence === true;
                  return (
                    <div
                      key={f.id}
                      style={{
                        padding: '16px 18px',
                        background: 'var(--surface-raised)',
                        borderRadius: '20px',
                        border: isLowEvidence
                          ? '2px solid var(--accent)'
                          : '1px solid var(--surface-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{f.title}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {f.id} ({f.ruleId || 'Inference'})
                            </span>
                            {isLowEvidence && <Chip label="Low Evidence Hypothesis" variant="lime" />}
                          </div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                            <Chip label={f.priority || 'medium'} variant={f.priority === 'high' ? 'red' : f.priority === 'medium' ? 'cobalt' : 'grey'} />
                            <Chip label={f.type || 'inconsistency'} variant="grey" />
                            {f.blocksSettlement && <Chip label="Blocks Settlement" variant="red" />}
                          </div>
                        </div>

                        {/* Review Buttons */}
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Button variant="tonal" size="s" onClick={() => handleFindingReview(f.id, 'useful')}>
                            Useful
                          </Button>
                          <Button variant="outlined" size="s" onClick={() => handleFindingReview(f.id, 'dismissed')}>
                            Dismiss
                          </Button>
                          <Button variant="text" size="s" onClick={() => handleFindingReview(f.id, 'clarification_requested')}>
                            Clarify
                          </Button>
                        </div>
                      </div>

                      {f.uncertainty && (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text)' }}>
                          <strong>Uncertainty:</strong> {f.uncertainty}
                        </div>
                      )}

                      {f.alternatives?.length > 0 && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <strong>Neutral Alternatives:</strong>
                          <ul style={{ paddingLeft: 18, marginTop: 4 }}>
                            {f.alternatives.map((alt, i) => (
                              <li key={i}>{alt}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {f.sources?.length > 0 && (
                        <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          Sources: {f.sources.map((s) => `${s.evidenceId || 'claim'} ${s.quote ? `("${s.quote}")` : ''}`).join(', ')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Evidence Comparison Matrix */}
          {analysis.matrix && (
            <Card
              title="Multi-Column Evidence Comparison Matrix"
              subtitle="Reconciles claimant assertions against extracted document facts"
            >
              <div style={{ overflowX: 'auto' }}>
                <table className="m3-table">
                  <thead>
                    <tr>
                      <th>Attribute</th>
                      {(analysis.matrix.columns || []).map((col) => (
                        <th key={col.id}>{col.label}</th>
                      ))}
                      <th>Actions / Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analysis.matrix.rows || []).map((row) => (
                      <tr key={row.id}>
                        <td style={{ fontWeight: 600 }}>{row.attribute}</td>
                        {(analysis.matrix.columns || []).map((col) => {
                          const cell = row.cells?.[col.id] || { value: '—', state: 'missing' };
                          const isMatch = cell.state === 'match';
                          const isMismatch = cell.state === 'mismatch';

                          return (
                            <td key={col.id}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span>{cell.value || '—'}</span>
                                {cell.state && (
                                  <span style={{ fontSize: '0.7rem', color: isMatch ? 'var(--accent)' : isMismatch ? 'var(--error)' : 'var(--text-muted)' }}>
                                    {cell.state}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Button variant="text" size="s" onClick={() => handleAnnotateMatrix(row.id)}>
                              Annotate
                            </Button>
                            {row.annotation && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>
                                Note: {row.annotation.text}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Missing Evidence & Raw Payload */}
          {analysis.missingEvidence?.length > 0 && (
            <Card title="Missing Evidence Items">
              <ul style={{ paddingLeft: 20, fontSize: '0.85rem', color: 'var(--error)' }}>
                {analysis.missingEvidence.map((item, idx) => (
                  <li key={idx}>{item.title || item.reason || item.id}</li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="Raw Analysis Output">
            <JsonView data={analysis} title={`Analysis Version ${analysis.version}`} />
          </Card>
        </>
      )}
    </div>
  );
}

