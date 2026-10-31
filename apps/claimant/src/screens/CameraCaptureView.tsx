// ──────────────────────────────────────────────────────────────────────
//  apps/claimant/src/screens/CameraCaptureView.tsx
// ──────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef } from 'react';
import { Button, LoadingState } from '@claimlens/shared/ui';
import { client } from '../client';

export function CameraCaptureView({
  claimId,
  checklistItemId,
  category = 'photos_video',
  onClose,
  onUploaded,
}: {
  claimId: string;
  checklistItemId?: string;
  category?: string;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraState, setCameraState] = useState<'requesting' | 'live' | 'error' | 'unsupported'>('requesting');
  const [errorMsg, setErrorMsg] = useState('');
  const [shots, setShots] = useState<Array<{ blob: Blob; url: string; uploading: boolean; done: boolean }>>([]);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  async function startCamera() {
    setCameraState('requesting');
    setErrorMsg('');
    stopCamera();

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unsupported');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraState('live');
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not access camera device');
      setCameraState('error');
    }
  }

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Flash animation
    setFlash(true);
    setTimeout(() => setFlash(false), 120);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        setShots((prev) => [...prev, { blob, url, uploading: false, done: false }]);
      },
      'image/jpeg',
      0.9
    );
  };

  const uploadShot = async (index: number) => {
    const item = shots[index];
    if (!item || item.uploading || item.done) return;

    setShots((prev) => prev.map((s, i) => (i === index ? { ...s, uploading: true } : s)));

    try {
      const file = new File([item.blob], `camera_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
      await client.uploadEvidence({
        claimId,
        file,
        category,
        checklistItemId,
        source: 'captured_in_app',
      });
      setShots((prev) => prev.map((s, i) => (i === index ? { ...s, uploading: false, done: true } : s)));
      onUploaded();
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
      setShots((prev) => prev.map((s, i) => (i === index ? { ...s, uploading: false } : s)));
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Top Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          zIndex: 10,
        }}
      >
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: '#fff' }}>
          Live Camera Capture
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: '#fff',
            borderRadius: '50%',
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          ✕
        </button>
      </div>

      {/* Main Viewfinder */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#09090f' }}>
        {cameraState === 'requesting' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LoadingState message="Accessing camera…" />
          </div>
        )}

        {cameraState === 'error' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px' }}>
            <div style={{ color: 'var(--color-error)', fontSize: 'var(--text-md)', fontWeight: 600 }}>Camera Access Denied or Error</div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', maxWidth: 400, textAlign: 'center' }}>{errorMsg}</p>
            <Button variant="outlined" size="sm" onClick={startCamera}>Try Again</Button>
          </div>
        )}

        {cameraState === 'unsupported' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Camera capture not supported in this browser.</p>
            <Button variant="tonal" size="sm" onClick={onClose} style={{ marginTop: '16px' }}>Return</Button>
          </div>
        )}

        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: cameraState === 'live' ? 'block' : 'none',
          }}
        />

        {/* Shutter flash effect */}
        {flash && (
          <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: 0.8, pointerEvents: 'none' }} />
        )}
      </div>

      {/* Shot Strip Preview */}
      {shots.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '10px',
            padding: '12px 20px',
            background: 'rgba(17,17,24,0.9)',
            overflowX: 'auto',
          }}
        >
          {shots.map((s, idx) => (
            <div
              key={idx}
              style={{
                position: 'relative',
                width: 72,
                height: 72,
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                flexShrink: 0,
                border: `2px solid ${s.done ? 'var(--color-success)' : 'var(--color-border)'}`,
              }}
            >
              <img src={s.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Shot thumbnail" />
              {!s.done && !s.uploading && (
                <button
                  onClick={() => uploadShot(idx)}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    color: '#fff',
                    border: 'none',
                    fontSize: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Upload
                </button>
              )}
              {s.uploading && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff' }}>
                  ⏳
                </div>
              )}
              {s.done && (
                <div style={{ position: 'absolute', bottom: 2, right: 2, background: 'var(--color-success)', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ✓
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Shutter Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px',
          background: 'rgba(0,0,0,0.9)',
        }}
      >
        <button
          onClick={takePhoto}
          disabled={cameraState !== 'live'}
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: '#ffffff',
            border: '4px solid rgba(255,255,255,0.4)',
            cursor: 'pointer',
            boxShadow: '0 0 0 3px rgba(26,110,245,0.6)',
            transition: 'transform var(--duration-fast)',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        />
      </div>
    </div>
  );
}

