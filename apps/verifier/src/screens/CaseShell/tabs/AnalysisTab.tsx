// ──────────────────────────────────────────────────────────────────────
//  apps/verifier/src/screens/CaseShell/tabs/AnalysisTab.tsx
// ──────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import type { Analysis, Finding, EvidenceFile } from '@claimlens/shared/types';
import { FactTypeTag, Button, LoadingState, EmptyState } from '@claimlens/shared/ui';
import { CELL_STATE_MAP } from '@claimlens/shared/constants';
import { queryHooks, client } from '../../../client';

export function AnalysisTab({
  claimId,
  onOpenSource,
  onCreateRequestFromFinding,
}: {
  claimId: string;
  onOpenSource: (evidenceId: string) => void;
  onCreateRequestFromFinding: (finding: Finding) => void;
}) {
  const { data: analysis, isLoading, refetch } = queryHooks.useAnalysis(claimId);
  const runMutation = queryHooks.useRunAnalysis(claimId);

  const [viewMode, setViewMode] = useState<'matrix' | 'findings'>('findings');
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({});

  if (isLoading) return <LoadingState message="Loading automated analysis…" />;

  const toggleExpand = (id: string) => {
    setExpandedFindings((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleReviewFinding = async (findingId: string, status: 'useful' | 'dismissed' | 'clarification_requested') => {
    if (!analysis) return;
    try {
      await client.reviewFinding(claimId, analysis.version, findingId, { status });
      await refetch();
    } catch (err: any) {
      alert(`Review failed: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Bar: Version, Run Analysis, View Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
            Analysis {analysis ? `Version ${analysis.version}` : 'Not Generated'}
          </span>
          {analysis && (
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Model: {analysis.model.name}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Matrix vs Findings Toggle */}
          <div style={{ display: 'flex', background: 'var(--color-surface)', borderRadius: 'var(--radius-full)', padding: '2px', border: '1px solid var(--color-border)' }}>
            <button
              onClick={() => setViewMode('findings')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                background: viewMode === 'findings' ? 'var(--color-primary)' : 'transparent',
                color: viewMode === 'findings' ? '#fff' : 'var(--color-text-muted)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Findings ({analysis?.findings.length || 0})
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                background: viewMode === 'matrix' ? 'var(--color-primary)' : 'transparent',
                color: viewMode === 'matrix' ? '#fff' : 'var(--color-text-muted)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Cross-Check Matrix
            </button>
          </div>

          <Button
            variant="tonal"
            size="sm"
            disabled={runMutation.isPending}
            onClick={() => runMutation.mutate()}
          >
            {runMutation.isPending ? 'Running Analysis…' : '⚡ Re-Run Analysis'}
          </Button>
        </div>
      </div>

      {!analysis ? (
        <EmptyState
          title="No Analysis Available"
          message="Run an investigation analysis to evaluate consistency, cross-check documents, and detect discrepancies."
          action={
            <Button variant="filled" size="md" onClick={() => runMutation.mutate()}>
              Run Initial Analysis
            </Button>
          }
        />
      ) : (
        <>
          {/* Analysis Summary */}
          {analysis.summary && (
            <div style={{ padding: '16px 20px', background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                Automated Synthesis
              </div>
              {analysis.summary}
            </div>
          )}

          {/* Mode: Matrix View */}
          {viewMode === 'matrix' && (
            <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-raised)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '12px 16px', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 600 }}>Fact Category</th>
                    {analysis.matrix.columns.map((col) => (
                      <th
                        key={col.id}
                        style={{
                          padding: '12px 16px',
                          fontSize: 'var(--text-xs)',
                          color: 'var(--color-text-muted)',
                          fontWeight: 600,
                          cursor: col.evidenceId ? 'pointer' : 'default',
                        }}
                        onClick={() => col.evidenceId && onOpenSource(col.evidenceId)}
                      >
                        {col.label}
                        {col.evidenceId && <span style={{ color: 'var(--color-primary-text)', marginLeft: 4 }}>↗</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analysis.matrix.rows.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 16px', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text)' }}>
                        {row.label}
                      </td>
                      {analysis.matrix.columns.map((col) => {
                        const cellState = row.cells[col.id] || 'unverified';
                        const meta = CELL_STATE_MAP[cellState] || { label: cellState, color: 'neutral' };

                        const colorStyles: Record<string, { bg: string; text: string }> = {
                          green:   { bg: 'rgba(34,197,94,0.15)', text: '#4ade80' },
                          red:     { bg: 'rgba(239,68,68,0.15)', text: '#f87171' },
                          orange:  { bg: 'rgba(249,115,22,0.15)', text: '#fb923c' },
                          neutral: { bg: 'rgba(255,255,255,0.06)', text: 'var(--color-text-muted)' },
                        };
                        const colStyle = colorStyles[meta.color] || colorStyles.neutral;

                        return (
                          <td
                            key={col.id}
                            style={{ padding: '12px 16px' }}
                            onClick={() => col.evidenceId && onOpenSource(col.evidenceId)}
                          >
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                background: colStyle.bg,
                                color: colStyle.text,
                                cursor: col.evidenceId ? 'pointer' : 'default',
                              }}
                            >
                              {meta.label}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Mode: Findings View */}
          {viewMode === 'findings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {analysis.findings.length === 0 ? (
                <EmptyState title="No Findings" message="No inconsistencies or policy exclusions identified in this version." />
              ) : (
                analysis.findings.map((f) => {
                  const isExpanded = Boolean(expandedFindings[f.id]);

                  return (
                    <div
                      key={f.id}
                      style={{
                        background: 'var(--color-surface)',
                        borderRadius: 'var(--radius-xl)',
                        border: f.lowEvidence
                          ? '1px dashed var(--color-border-strong)'
                          : '1px solid var(--color-border)',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        opacity: f.lowEvidence ? 0.85 : 1,
                      }}
                    >
                      {/* Finding Title & Badges */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--color-primary-text)' }}>
                              {f.id}
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: f.priority === 'high' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.08)',
                                color: f.priority === 'high' ? '#f87171' : 'var(--color-text-muted)',
                                textTransform: 'uppercase',
                                fontWeight: 600,
                              }}
                            >
                              {f.priority}
                            </span>
                            {f.lowEvidence && (
                              <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', color: 'var(--color-text-muted)' }}>
                                Low Evidence Hypothesis
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginTop: '6px' }}>
                            {f.title}
                          </div>
                        </div>

                        <button
                          onClick={() => toggleExpand(f.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-primary-text)',
                            fontSize: 'var(--text-xs)',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {isExpanded ? 'Collapse ▲' : 'Details ▼'}
                        </button>
                      </div>

                      {/* Fact Type Blocks */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: 'var(--text-xs)' }}>
                        {f.observed && f.observed.length > 0 && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                            <FactTypeTag type="observed_in_file" short />
                            <span style={{ color: 'var(--color-text)' }}>{f.observed.join('; ')}</span>
                          </div>
                        )}
                        {f.claimantAssertions && f.claimantAssertions.length > 0 && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                            <FactTypeTag type="claimant_says" short />
                            <span style={{ color: 'var(--color-text)' }}>{f.claimantAssertions.join('; ')}</span>
                          </div>
                        )}
                        {f.documentFacts && f.documentFacts.length > 0 && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                            <FactTypeTag type="document_shows" short />
                            <span style={{ color: 'var(--color-text)' }}>{f.documentFacts.join('; ')}</span>
                          </div>
                        )}
                        {f.calculations && f.calculations.length > 0 && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                            <FactTypeTag type="calculated" short />
                            <span style={{ color: 'var(--color-text)' }}>{f.calculations.join('; ')}</span>
                          </div>
                        )}
                      </div>

                      {/* Expanded Section: AI Inference, Uncertainty, Alternatives, Next Action */}
                      {isExpanded && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--color-border)', fontSize: 'var(--text-xs)' }}>
                          {f.aiInference && (
                            <div>
                              <span style={{ fontWeight: 600, color: '#c084fc' }}>AI Inference: </span>
                              <span style={{ color: 'var(--color-text)' }}>{f.aiInference}</span>
                            </div>
                          )}

                          {f.alternatives && f.alternatives.length > 0 && (
                            <div>
                              <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Alternative Explanations: </span>
                              <span style={{ color: 'var(--color-text)' }}>{f.alternatives.join('; ')}</span>
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: '16px' }}>
                            <div>
                              <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Uncertainty: </span>
                              <span>{f.uncertainty}</span>
                            </div>
                            <div>
                              <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Recommended Next Action: </span>
                              <span>{f.nextAction}</span>
                            </div>
                          </div>

                          {/* Source Chips */}
                          {f.sources && f.sources.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ color: 'var(--color-text-muted)' }}>Sources:</span>
                              {f.sources.map((s, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => onOpenSource(s.evidenceId)}
                                  style={{
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    background: 'var(--color-primary-tint)',
                                    color: 'var(--color-primary-text)',
                                    border: '1px solid rgba(26,110,245,0.3)',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    fontFamily: 'var(--font-mono)',
                                  }}
                                >
                                  {s.evidenceId} {s.quote ? `("${s.quote}")` : ''} ↗
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Verifier Review Dispositions */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          Status: <strong style={{ color: 'var(--color-text)' }}>{f.status}</strong>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => handleReviewFinding(f.id, 'useful')}
                            style={{ padding: '4px 10px', borderRadius: '4px', background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)', fontSize: '11px', cursor: 'pointer' }}
                          >
                            Mark Useful
                          </button>
                          <button
                            onClick={() => handleReviewFinding(f.id, 'dismissed')}
                            style={{ padding: '4px 10px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', fontSize: '11px', cursor: 'pointer' }}
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={() => onCreateRequestFromFinding(f)}
                            style={{ padding: '4px 10px', borderRadius: '4px', background: 'rgba(249,115,22,0.15)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.3)', fontSize: '11px', cursor: 'pointer' }}
                          >
                            Request Clarification →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

