import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api, uploadWithProgress, openFileInNewTab } from '../api.js';
import { useApp } from '../context.jsx';
import { Card, Button, StatusBadge, Chip, Field, ProgressBar, Spinner, Empty } from '../ui.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// CameraCapture component — live viewfinder + shutter + per-shot upload
// ─────────────────────────────────────────────────────────────────────────────
function CameraCapture({ claimId, category, checklistItemId, onUploaded }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraState, setCameraState] = useState('idle'); // idle|requesting|live|error|unsupported
  const [errorMsg, setErrorMsg] = useState('');
  const [facingMode, setFacingMode] = useState('environment');
  const [hasMultipleCams, setHasMultipleCams] = useState(false);
  const [shots, setShots] = useState([]); // [{blob, url, status:'preview'|'uploading'|'done'|'error', pct, evId}]
  const [flashFrame, setFlashFrame] = useState(false);

  /* ── detect multiple cameras once ── */
  useEffect(() => {
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoCams = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCams(videoCams.length > 1);
      });
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unsupported');
    }
  }, []);

  /* ── clean up stream on unmount ── */
  useEffect(() => {
    return () => stopStream();
  }, []);

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  async function startCamera(facing = facingMode) {
    setCameraState('requesting');
    setErrorMsg('');
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState('live');
    } catch (err) {
      setErrorMsg(err.name === 'NotAllowedError'
        ? 'Camera permission denied. Allow camera access in your browser and try again.'
        : err.name === 'NotFoundError'
        ? 'No camera found on this device.'
        : `Camera error: ${err.message}`);
      setCameraState('error');
    }
  }

  async function flipCamera() {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    await startCamera(next);
  }

  function takeShot() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    /* flash animation */
    setFlashFrame(true);
    setTimeout(() => setFlashFrame(false), 120);

    /* haptic */
    if (navigator.vibrate) navigator.vibrate(10);

    canvas.toBlob(
      (blob) => {
        const url = URL.createObjectURL(blob);
        const id = `shot-${Date.now()}`;
        setShots((prev) => [...prev, { id, blob, url, status: 'preview', pct: 0, evId: null }]);
      },
      'image/jpeg',
      0.92
    );
  }

  async function uploadShot(shotId) {
    const shot = shots.find((s) => s.id === shotId);
    if (!shot) return;

    setShots((prev) => prev.map((s) => s.id === shotId ? { ...s, status: 'uploading', pct: 0 } : s));

    const formData = new FormData();
    formData.append('file', shot.blob, `camera-capture-${Date.now()}.jpg`);
    formData.append('category', category || 'photos_video');
    formData.append('source', 'captured_in_app');
    if (checklistItemId) formData.append('checklistItemId', checklistItemId);

    try {
      const result = await uploadWithProgress(`/claims/${claimId}/evidence`, formData, {
        onProgress: (pct) => {
          setShots((prev) => prev.map((s) => s.id === shotId ? { ...s, pct } : s));
        },
      });
      const evId = result?.id || result?.data?.id || result?._id;
      setShots((prev) => prev.map((s) => s.id === shotId ? { ...s, status: 'done', pct: 100, evId } : s));
      if (onUploaded) onUploaded();
    } catch {
      setShots((prev) => prev.map((s) => s.id === shotId ? { ...s, status: 'error' } : s));
    }
  }

  function removeShot(shotId) {
    setShots((prev) => {
      const shot = prev.find((s) => s.id === shotId);
      if (shot?.url) URL.revokeObjectURL(shot.url);
      return prev.filter((s) => s.id !== shotId);
    });
  }

  function closeCamera() {
    stopStream();
    setCameraState('idle');
    setShots([]);
  }

  /* ── RENDER ── */

  if (cameraState === 'unsupported') {
    return (
      <div style={{ padding: '16px', background: 'var(--surface-raised)', borderRadius: 16, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Camera capture is not available in this browser. Use the file upload below.
      </div>
    );
  }

  if (cameraState === 'idle') {
    return (
      <button
        onClick={() => startCamera()}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 20px', borderRadius: 9999,
          background: 'var(--primary-tonal)', border: '1px dashed var(--primary-light)',
          color: 'var(--primary-light)', fontWeight: 600, cursor: 'pointer',
          fontSize: '0.9rem', width: '100%', justifyContent: 'center',
          transition: 'background 200ms',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,71,171,0.22)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary-tonal)'}
      >
        <span style={{ fontSize: '1.2rem' }}>📷</span> Open camera
      </button>
    );
  }

  if (cameraState === 'requesting') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 16, color: 'var(--text-muted)' }}>
        <Spinner size={18} /> Requesting camera access…
      </div>
    );
  }

  if (cameraState === 'error') {
    return (
      <div style={{ padding: 16, background: 'rgba(255,77,77,0.1)', border: '1px solid var(--error)', borderRadius: 16 }}>
        <div style={{ color: 'var(--error)', fontWeight: 600, marginBottom: 8 }}>⚠ Camera unavailable</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 12 }}>{errorMsg}</div>
        <Button variant="outlined" size="s" onClick={() => setCameraState('idle')}>Dismiss</Button>
      </div>
    );
  }

  /* cameraState === 'live' */
  const allDone = shots.length > 0 && shots.every((s) => s.status === 'done');
  const pendingShots = shots.filter((s) => s.status === 'preview');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Viewfinder */}
      <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', background: '#060a0b', aspectRatio: '16/9', maxHeight: 380 }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        {/* Flash overlay */}
        {flashFrame && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.55)', pointerEvents: 'none' }} />
        )}
        {/* Viewfinder grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px)',
          backgroundSize: '33.33% 33.33%',
        }} />
        {/* Controls bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'linear-gradient(transparent, rgba(6,10,11,0.85))',
        }}>
          {/* Close */}
          <button
            onClick={closeCamera}
            title="Close camera"
            style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1rem' }}
          >✕</button>

          {/* Shutter */}
          <button
            onClick={takeShot}
            title="Take photo"
            style={{
              width: 64, height: 64, borderRadius: '50%',
              background: '#fff', border: '4px solid rgba(255,255,255,0.4)',
              cursor: 'pointer', boxShadow: '0 0 0 3px rgba(0,71,171,0.6)',
              transition: 'transform 120ms cubic-bezier(0.34,1.56,0.64,1)',
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.88)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          />

          {/* Flip */}
          {hasMultipleCams ? (
            <button
              onClick={flipCamera}
              title="Flip camera"
              style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.1rem' }}
            >🔄</button>
          ) : <div style={{ width: 40 }} />}
        </div>
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Shot strip */}
      {shots.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {shots.length} photo{shots.length !== 1 ? 's' : ''} taken this session
          </div>
          {shots.map((shot) => (
            <div
              key={shot.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', background: 'var(--surface-raised)', borderRadius: 16,
              }}
            >
              <img
                src={shot.url}
                alt="capture"
                style={{ width: 56, height: 42, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                {shot.status === 'preview' && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ready to upload</div>
                )}
                {shot.status === 'uploading' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--primary-light)' }}>Uploading… {shot.pct}%</div>
                    <div style={{ height: 4, background: 'var(--surface-border)', borderRadius: 9999, overflow: 'hidden' }}>
                      <div style={{ width: `${shot.pct}%`, height: '100%', background: 'var(--primary-light)', borderRadius: 9999, transition: 'width 120ms' }} />
                    </div>
                  </div>
                )}
                {shot.status === 'done' && (
                  <div style={{ fontSize: '0.8rem', color: '#B6FF00', fontWeight: 600 }}>
                    ✓ Uploaded {shot.evId ? `· ${shot.evId}` : ''}
                  </div>
                )}
                {shot.status === 'error' && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--error)' }}>Upload failed</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {shot.status === 'preview' && (
                  <Button variant="filled" size="s" onClick={() => uploadShot(shot.id)}>Use photo</Button>
                )}
                {shot.status === 'error' && (
                  <Button variant="tonal" size="s" onClick={() => uploadShot(shot.id)}>Retry</Button>
                )}
                {(shot.status === 'preview' || shot.status === 'error') && (
                  <Button variant="text" size="s" onClick={() => removeShot(shot.id)} style={{ color: 'var(--text-muted)' }}>Retake</Button>
                )}
              </div>
            </div>
          ))}

          {/* Bulk upload all preview shots */}
          {pendingShots.length > 1 && (
            <Button
              variant="tonal"
              onClick={() => pendingShots.forEach((s) => uploadShot(s.id))}
              style={{ alignSelf: 'flex-start' }}
            >
              Upload all {pendingShots.length} photos
            </Button>
          )}

          {allDone && (
            <div style={{ padding: '10px 16px', background: 'rgba(182,255,0,0.08)', border: '1px solid rgba(182,255,0,0.3)', borderRadius: 12, fontSize: '0.85rem', color: '#B6FF00' }}>
              All photos uploaded successfully. You can take more or close the camera.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EvidenceTab({ claim }) {
  const { identity } = useApp();
  const [evidenceList, setEvidenceList] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);

  // Form
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('photos_video');
  const [checklistItemId, setChecklistItemId] = useState('');
  const [source, setSource] = useState('uploaded_file');
  const [requestId, setRequestId] = useState('');

  const isVerifier = identity?.role === 'verifier';
  const claimId = claim?.id || claim?._id;
  const pollTimerRef = useRef(null);

  const loadEvidence = useCallback(async () => {
    if (!claimId) return;
    try {
      const res = await api('GET', `/claims/${claimId}/evidence`);
      const items = Array.isArray(res) ? res : res.items || [];
      setEvidenceList(items);

      // Check if any items are in 'processing' status
      const hasProcessing = items.some((i) => i.processingStatus === 'processing');
      if (hasProcessing) {
        if (!pollTimerRef.current) {
          pollTimerRef.current = setTimeout(() => {
            pollTimerRef.current = null;
            loadEvidence();
          }, 3000);
        }
      }
    } catch (err) {
      console.warn('Error loading evidence:', err);
    }
  }, [claimId]);

  const loadChecklist = useCallback(async () => {
    if (!claimId) return;
    try {
      const res = await api('GET', `/claims/${claimId}/checklist`);
      setChecklist(Array.isArray(res) ? res : res.items || []);
    } catch (e) {
      // ignore
    }
  }, [claimId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadEvidence(), loadChecklist()]).finally(() => setLoading(false));

    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [loadEvidence, loadChecklist]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadPercent(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    formData.append('source', source);
    if (checklistItemId) formData.append('checklistItemId', checklistItemId);
    if (requestId) formData.append('requestId', requestId);

    try {
      await uploadWithProgress(`/claims/${claimId}/evidence`, formData, {
        onProgress: (pct) => setUploadPercent(pct),
      });
      setFile(null);
      // Reset input
      const fileInput = document.getElementById('evidence-file-input');
      if (fileInput) fileInput.value = '';
      await loadEvidence();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleReview = async (evidenceId, reviewStatus) => {
    const note = window.prompt(`Review note for ${reviewStatus}:`, reviewStatus === 'reviewed' ? 'Document verified' : 'Incomplete document');
    if (note === null) return;

    try {
      await api('PATCH', `/claims/${claimId}/evidence/${evidenceId}/review`, {
        body: { reviewStatus, reviewNote: note },
      });
      await loadEvidence();
    } catch (err) {
      console.error('Review failed:', err);
    }
  };

  if (!claim) return <Empty message="No claim selected" />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Upload Form */}
      <Card title="Upload New Evidence" subtitle="Accepted types: JPEG, PNG, PDF, HEIC up to 15MB">
        <div style={{ marginBottom: 16 }}>
          <CameraCapture
            claimId={claimId}
            category={category}
            checklistItemId={checklistItemId}
            onUploaded={loadEvidence}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0 16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span>or select from device</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <Field label="File Selection">
              <input
                id="evidence-file-input"
                type="file"
                className="m3-input"
                onChange={(e) => setFile(e.target.files[0] || null)}
                required
              />
            </Field>

            <Field label="Evidence Category">
              <select className="m3-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="photos_video">Damage Photographs / Video</option>
                <option value="policy">Policy Schedule Certificate</option>
                <option value="vehicle_identity">Registration Certificate (RC)</option>
                <option value="repair_loss">Workshop Repair Estimate / Invoice</option>
                <option value="driver">Driving License (DL)</option>
                <option value="incident">Police FIR / GD Entry</option>
                <option value="other">Other Document</option>
              </select>
            </Field>

            <Field label="Checklist Item (Optional)">
              <select
                className="m3-select"
                value={checklistItemId}
                onChange={(e) => setChecklistItemId(e.target.value)}
              >
                <option value="">— Link to checklist item —</option>
                {checklist.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} ({item.status})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Source Mechanism">
              <select className="m3-select" value={source} onChange={(e) => setSource(e.target.value)}>
                <option value="uploaded_file">Uploaded File (Gallery/Disk)</option>
                <option value="captured_in_app">Captured In-App (Camera)</option>
              </select>
            </Field>
          </div>

          {uploading && <ProgressBar value={uploadPercent} max={100} label={`Uploading ${file?.name || ''}...`} />}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" variant="filled" disabled={!file || uploading}>
              {uploading ? `Uploading (${uploadPercent}%)` : 'Upload File'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Evidence Files List */}
      <Card title="Submitted Evidence Files" subtitle={`${evidenceList.length} total files stored`}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 20 }}><Spinner /></div>
        ) : evidenceList.length === 0 ? (
          <Empty message="No evidence files submitted yet" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {evidenceList.map((item) => {
              const evId = item.id || item._id;
              const isProcessing = item.processingStatus === 'processing';

              return (
                <div
                  key={evId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--surface-raised)',
                    borderRadius: '18px',
                    gap: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {/* Thumbnail preview if decodable */}
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: '#040406',
                        border: '1px solid var(--surface-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {item.mimeType?.startsWith('image/') ? (
                        <img
                          src={`/api/v1/claims/${claimId}/evidence/${evId}/thumbnail`}
                          alt="thumb"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        'DOC'
                      )}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.fileName}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {evId}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 10 }}>
                        <span>{(item.sizeBytes / 1024).toFixed(1)} KB</span>
                        <span>{item.category}</span>
                        <span>Source: {item.source}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Provenance badges (Verifier only) */}
                    {isVerifier && item.provenance && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        {item.provenance.duplicateOfIds?.length > 0 && (
                          <Chip label="Duplicate" variant="red" />
                        )}
                        {item.provenance.similarToIds?.length > 0 && (
                          <Chip label="Similar" variant="grey" />
                        )}
                        {item.provenance.metadata?.present && (
                          <Chip label="EXIF" variant="cobalt" />
                        )}
                      </div>
                    )}

                    {/* Processing & Review Status */}
                    {isProcessing ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Spinner size={16} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--primary-light)' }}>Processing...</span>
                      </div>
                    ) : (
                      <StatusBadge status={item.reviewStatus || item.processingStatus} />
                    )}

                    {/* Open file link */}
                    <Button
                      variant="outlined"
                      size="s"
                      onClick={() => openFileInNewTab(`/claims/${claimId}/evidence/${evId}/file`)}
                    >
                      Open File
                    </Button>

                    {/* Review actions (Verifier only) */}
                    {isVerifier && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Button
                          variant="tonal"
                          size="s"
                          onClick={() => handleReview(evId, 'reviewed')}
                        >
                          Reviewed
                        </Button>
                        <Button
                          variant="text"
                          size="s"
                          onClick={() => handleReview(evId, 'needs_replacement')}
                          style={{ color: 'var(--error)' }}
                        >
                          Replace
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

