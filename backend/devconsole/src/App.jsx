import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from './context.jsx';
import { api } from './api.js';
import { StatusBadge, Button, Toast, Spinner, JsonView } from './ui.jsx';

import OverviewTab from './tabs/OverviewTab.jsx';
import NewClaimTab from './tabs/NewClaimTab.jsx';
import EvidenceTab from './tabs/EvidenceTab.jsx';
import AnalysisTab from './tabs/AnalysisTab.jsx';
import SettlementTab from './tabs/SettlementTab.jsx';
import RequestsTab from './tabs/RequestsTab.jsx';
import MessagesNotesTab from './tabs/MessagesNotesTab.jsx';
import TimelineTab from './tabs/TimelineTab.jsx';
import DecisionsRecommendationTab from './tabs/DecisionsRecommendationTab.jsx';
import DashboardTab from './tabs/DashboardTab.jsx';

export default function App() {
  const {
    identity,
    setIdentity,
    users,
    claims,
    claimsLoading,
    selectedClaimId,
    setSelectedClaimId,
    reloadClaims,
    health,
    toast,
    clearToast,
    lastResponse,
  } = useApp();

  const [activeTab, setActiveTab] = useState('overview');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedClaimDetail, setSelectedClaimDetail] = useState(null);
  const [claimDetailLoading, setClaimDetailLoading] = useState(false);

  const isVerifier = identity?.role === 'verifier';
  const isClaimant = identity?.role === 'claimant';

  // Group demo users by role
  const claimants = useMemo(() => users.filter((u) => u.role === 'claimant'), [users]);
  const verifiers = useMemo(() => users.filter((u) => u.role === 'verifier'), [users]);

  // Load detailed claim when selectedClaimId changes
  const loadSelectedClaimDetail = async () => {
    if (!selectedClaimId) {
      setSelectedClaimDetail(null);
      return;
    }
    setClaimDetailLoading(true);
    try {
      const data = await api('GET', `/claims/${selectedClaimId}`);
      setSelectedClaimDetail(data);
    } catch (err) {
      console.warn('Failed to fetch claim detail:', err);
      setSelectedClaimDetail(null);
    } finally {
      setClaimDetailLoading(false);
    }
  };

  useEffect(() => {
    loadSelectedClaimDetail();
  }, [selectedClaimId]);

  // Reset active tab if not applicable to current role
  useEffect(() => {
    if (isClaimant && ['analysis', 'settlement', 'dashboard'].includes(activeTab)) {
      setActiveTab('overview');
    }
    if (isVerifier && activeTab === 'new_claim') {
      setActiveTab('overview');
    }
  }, [identity?.role, activeTab, isClaimant, isVerifier]);

  // Filtered claims list
  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      const id = c.id || c._id || '';
      const reg = c.vehicleRegistration || c.vehicle?.registrationNumber || '';
      const matchesSearch =
        searchQuery.trim() === '' ||
        id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reg.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [claims, searchQuery, statusFilter]);

  // Reset Demo Data
  const handleResetDemoData = async () => {
    if (!window.confirm('Reset all demo claims, evidence, and messages back to baseline seed?')) {
      return;
    }
    try {
      await api('POST', '/demo/reset');
      await reloadClaims();
    } catch (err) {
      console.error('Reset failed:', err);
    }
  };

  // Tab definitions by role
  const tabs = useMemo(() => {
    if (isClaimant) {
      return [
        { id: 'overview', label: 'Overview' },
        { id: 'new_claim', label: '+ New Claim' },
        { id: 'evidence', label: 'Evidence' },
        { id: 'requests', label: 'Requests' },
        { id: 'messages', label: 'Messages' },
        { id: 'timeline', label: 'Timeline' },
        { id: 'recommendations', label: 'Guidance' },
      ];
    }
    return [
      { id: 'overview', label: 'Overview' },
      { id: 'evidence', label: 'Evidence' },
      { id: 'analysis', label: 'AI Analysis' },
      { id: 'settlement', label: 'Settlement' },
      { id: 'requests', label: 'Requests' },
      { id: 'messages_notes', label: 'Messages & Notes' },
      { id: 'timeline', label: 'Timeline' },
      { id: 'decisions_rec', label: 'Decisions & Guidance' },
      { id: 'dashboard', label: 'Dashboard' },
    ];
  }, [isClaimant]);

  return (
    <div className="app-container">
      {/* Toast Alert */}
      <Toast toast={toast} onDismiss={clearToast} />

      {/* Top Header */}
      <header className="app-header">
        <div className="app-brand">
          <div className={`health-dot ${health}`} title={`Health status: ${health}`} />
          <span className="logo-text">ClaimLens</span>
          <span className="logo-tag">Test Console</span>
        </div>

        <div className="header-actions">
          {/* Identity switcher */}
          <select
            className="m3-select"
            style={{ width: 'auto', padding: '6px 14px', fontSize: '0.85rem' }}
            value={identity?.id || identity?._id || ''}
            onChange={(e) => {
              const u = users.find((user) => (user.id || user._id) === e.target.value);
              if (u) setIdentity(u);
            }}
          >
            <optgroup label="Claimants">
              {claimants.map((u) => (
                <option key={u.id || u._id} value={u.id || u._id}>
                  {u.name} ({u.id || u._id})
                </option>
              ))}
            </optgroup>
            <optgroup label="Verifiers / Investigators">
              {verifiers.map((u) => (
                <option key={u.id || u._id} value={u.id || u._id}>
                  {u.name} ({u.id || u._id})
                </option>
              ))}
            </optgroup>
          </select>

          <Button variant="outlined" size="s" onClick={handleResetDemoData}>
            Reset Demo Data
          </Button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="workspace">
        {/* Left Column: Claims List */}
        <aside className="claims-sidebar">
          <div className="sidebar-header">
            <input
              type="text"
              className="search-input"
              placeholder="Search by claim ID or vehicle reg..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              className="m3-select"
              style={{ fontSize: '0.8rem', padding: '6px 10px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses ({claims.length})</option>
              <option value="draft">Draft</option>
              <option value="new">New</option>
              <option value="in_review">In Review</option>
              <option value="awaiting_claimant">Awaiting Claimant</option>
              <option value="decision_pending">Decision Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="claims-list">
            {claimsLoading ? (
              <div style={{ textAlign: 'center', padding: 30 }}><Spinner size={20} /></div>
            ) : filteredClaims.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No matching claims
              </div>
            ) : (
              filteredClaims.map((c) => {
                const cId = c.id || c._id;
                const isSelected = cId === selectedClaimId;

                return (
                  <div
                    key={cId}
                    className={`claim-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedClaimId(cId);
                      if (activeTab === 'new_claim') setActiveTab('overview');
                    }}
                  >
                    <div className="claim-row-header">
                      <span className="claim-id">{cId}</span>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="claim-row-sub">
                      <span>{c.vehicleRegistration || c.vehicle?.registrationNumber || 'No plate'}</span>
                      {c.unreadMessageCount > 0 && (
                        <span className="unread-badge">{c.unreadMessageCount}</span>
                      )}
                    </div>
                    {c.nextStep && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {typeof c.nextStep === 'object'
                          ? (c.nextStep.label || c.nextStep.description || '')
                          : c.nextStep}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Column: Tab Rail & Content */}
        <main className="content-area">
          {/* Navigation Tab Rail */}
          <nav className="tab-rail">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab-pill ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Active Tab Body */}
          <section className="tab-body">
            {activeTab === 'overview' && (
              <OverviewTab
                claim={selectedClaimDetail}
                onClaimUpdated={loadSelectedClaimDetail}
              />
            )}
            {activeTab === 'new_claim' && (
              <NewClaimTab
                onClaimCreated={(newId) => {
                  setSelectedClaimId(newId);
                  setActiveTab('overview');
                }}
              />
            )}
            {activeTab === 'evidence' && (
              <EvidenceTab claim={selectedClaimDetail} />
            )}
            {activeTab === 'analysis' && (
              <AnalysisTab claim={selectedClaimDetail} />
            )}
            {activeTab === 'settlement' && (
              <SettlementTab claim={selectedClaimDetail} />
            )}
            {activeTab === 'requests' && (
              <RequestsTab claim={selectedClaimDetail} />
            )}
            {(activeTab === 'messages' || activeTab === 'messages_notes') && (
              <MessagesNotesTab claim={selectedClaimDetail} />
            )}
            {activeTab === 'timeline' && (
              <TimelineTab claim={selectedClaimDetail} />
            )}
            {(activeTab === 'recommendations' || activeTab === 'decisions_rec') && (
              <DecisionsRecommendationTab
                claim={selectedClaimDetail}
                onClaimUpdated={loadSelectedClaimDetail}
              />
            )}
            {activeTab === 'dashboard' && <DashboardTab />}
          </section>
        </main>
      </div>

      {/* Bottom Drawer: Last Response Viewer */}
      <footer className="response-drawer">
        <div className="drawer-header" onClick={() => setDrawerOpen(!drawerOpen)}>
          <div className="drawer-title">
            <span style={{ color: lastResponse?.status >= 200 && lastResponse?.status < 300 ? 'var(--accent)' : 'var(--error)', fontWeight: 700 }}>
              {lastResponse ? `[${lastResponse.status || 0}]` : '[IDLE]'}
            </span>
            <span>{lastResponse ? `${lastResponse.method} ${lastResponse.path}` : 'No requests made yet'}</span>
            {lastResponse?.duration !== undefined && (
              <span style={{ color: 'var(--text-muted)' }}>({lastResponse.duration}ms)</span>
            )}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {drawerOpen ? '▼ Collapse Last Response' : '▲ Expand Last Response'}
          </span>
        </div>

        {drawerOpen && (
          <div className="drawer-body">
            {lastResponse ? (
              <JsonView data={lastResponse.body} title={`${lastResponse.method} ${lastResponse.path} (${lastResponse.duration}ms)`} />
            ) : (
              <div style={{ color: 'var(--text-muted)' }}>Make any request to view raw JSON response payload.</div>
            )}
          </div>
        )}
      </footer>
    </div>
  );
}
