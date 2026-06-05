import { useState, useRef, useCallback, useEffect } from "react";

// ─── colour tokens ────────────────────────────────────────────────────────────
const C = {
  gold: '#B79143', goldLight: '#D7B46A',
  textPrimary: '#F8F3EA', textSecondary: '#c9b29a', textMuted: '#b89b84', textDim: '#8c6d62',
  bgDark: 'rgba(15,5,10,0.97)',
  borderGold: 'rgba(183,145,67,0.25)', borderStrong: 'rgba(183,145,67,0.45)',
  glowGold: 'rgba(183,145,67,0.18)',
  gradBtn: 'linear-gradient(135deg,#8E6B2F,#B79143,#D7B46A)',
};

const labelCls = `mb-2 block text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[#B79143]`;

// ─── Inline Warning Panel ─────────────────────────────────────────────────────
function WarningPanel({ onContinue, onCancel }) {
  return (
    <div
      className="w-full rounded-2xl border animate-fadeIn overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(15,5,10,0.97), rgba(30,8,16,0.95))',
        borderColor: C.borderGold,
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 24px ${C.glowGold}`,
      }}
    >
      {/* accent bar */}
      <div className="h-0.5 w-full" style={{ background: C.gradBtn }} />

      <div className="p-5">
        {/* icon + heading */}
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5"
            style={{ background: 'rgba(183,145,67,0.1)', border: `1.5px solid ${C.borderStrong}` }}
          >
            <svg viewBox="0 0 32 32" fill="none" className="w-5 h-5">
              <circle cx="16" cy="16" r="13" stroke={C.gold} strokeWidth="1.8" />
              <path d="M16 10v7" stroke={C.goldLight} strokeWidth="2" strokeLinecap="round" />
              <circle cx="16" cy="22" r="1.2" fill={C.goldLight} />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-bold mb-0.5" style={{ color: C.textPrimary }}>
              Photo Requirement
            </h4>
            <p className="text-[0.7rem] leading-relaxed" style={{ color: C.textSecondary }}>
              Your photo must <strong style={{ color: C.goldLight }}>clearly show your face</strong>.
              Logos, group shots, or avatars are not accepted.
            </p>
          </div>
        </div>

        {/* warning */}
        <div
          className="rounded-xl border border-red-500/20 bg-red-950/20 px-3 py-2 mb-4 text-[0.68rem] leading-relaxed"
          style={{ color: '#fca5a5' }}
        >
          ⚠️ An unrecognisable photo means your entry{' '}
          <strong>will not be granted</strong> without a valid{' '}
          <strong>CNIC / B-Form</strong> on the day.
        </div>

        {/* actions */}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl text-[0.75rem] font-medium border transition-all hover:opacity-70"
            style={{ color: C.textDim, borderColor: C.borderGold }}
          >
            Cancel
          </button>
          <button
            onClick={onContinue}
            className="flex-[2] py-2 rounded-xl font-bold text-white text-[0.75rem] tracking-wide transition-all hover:-translate-y-0.5 active:scale-95"
            style={{ background: C.gradBtn, boxShadow: `0 3px 14px ${C.glowGold}` }}
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Inline Crop Panel ────────────────────────────────────────────────────────
function CropPanel({ imageSrc, onDone, onCancel }) {
  const canvasRef = useRef(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, size: 0 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [displayScale, setDisplayScale] = useState(1);
  const dragging = useRef(null);
  const [imgElement, setImgElement] = useState(null);
  const containerRef = useRef(null);

  // Load image, pick initial crop + display scale
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImgElement(img);
      const nat = { w: img.naturalWidth, h: img.naturalHeight };
      setImgSize(nat);

      // Fit inside the inline panel (max ~380px wide on mobile)
      const maxW = Math.min(380, window.innerWidth - 64);
      const maxH = 280;
      const scale = Math.min(maxW / nat.w, maxH / nat.h, 1);
      setDisplayScale(scale);

      const initSize = Math.round(Math.min(nat.w, nat.h) * 0.65);
      setCrop({
        x: Math.round((nat.w - initSize) / 2),
        y: Math.round((nat.h - initSize) / 2),
        size: initSize,
      });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Draw
  const drawCanvas = useCallback(
    (c) => {
      const canvas = canvasRef.current;
      if (!canvas || !imgElement) return;
      const s = displayScale;
      const dW = Math.round(imgSize.w * s);
      const dH = Math.round(imgSize.h * s);
      canvas.width = dW;
      canvas.height = dH;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, dW, dH);
      ctx.drawImage(imgElement, 0, 0, dW, dH);

      const cx = c.x * s, cy = c.y * s, cs = c.size * s;

      // Dim overlay
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, dW, dH);
      ctx.rect(cx, cy, cs, cs);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0,0,0,0.58)';
      ctx.fill('evenodd');
      ctx.restore();

      // Crop border
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 2;
      ctx.strokeRect(cx, cy, cs, cs);

      // Rule-of-thirds
      ctx.strokeStyle = 'rgba(183,145,67,0.35)';
      ctx.lineWidth = 1;
      for (let i = 1; i <= 2; i++) {
        ctx.beginPath(); ctx.moveTo(cx + (cs * i) / 3, cy); ctx.lineTo(cx + (cs * i) / 3, cy + cs); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy + (cs * i) / 3); ctx.lineTo(cx + cs, cy + (cs * i) / 3); ctx.stroke();
      }

      // Corner handles
      const h = 7;
      [{ x: cx, y: cy }, { x: cx + cs - h, y: cy }, { x: cx, y: cy + cs - h }, { x: cx + cs - h, y: cy + cs - h }]
        .forEach(({ x, y }) => {
          ctx.fillStyle = C.goldLight;
          ctx.fillRect(x, y, h, h);
        });

      // Size %
      const pct = Math.round((c.size / Math.min(imgSize.w, imgSize.h)) * 100);
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(cx + cs - 58, cy - 22, 54, 19);
      ctx.fillStyle = C.goldLight;
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${pct}%`, cx + cs - 31, cy - 8);
    },
    [imgElement, displayScale, imgSize]
  );

  useEffect(() => {
    if (imgSize.w && imgElement) drawCanvas(crop);
  }, [crop, imgSize, imgElement, drawCanvas]);

  // Pointer helpers
  const getPos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (cx - r.left) / displayScale, y: (cy - r.top) / displayScale };
  };

  const hitCorner = (px, py, c) => {
    const hw = 18 / displayScale;
    if (px < c.x + hw && py < c.y + hw) return 'tl';
    if (px > c.x + c.size - hw && py < c.y + hw) return 'tr';
    if (px < c.x + hw && py > c.y + c.size - hw) return 'bl';
    if (px > c.x + c.size - hw && py > c.y + c.size - hw) return 'br';
    return null;
  };

  const onDown = (e) => {
    e.preventDefault();
    const { x, y } = getPos(e);
    const corner = hitCorner(x, y, crop);
    const inside = x > crop.x && x < crop.x + crop.size && y > crop.y && y < crop.y + crop.size;
    if (corner || inside)
      dragging.current = { type: corner || 'move', startX: x, startY: y, startCrop: { ...crop } };
  };

  const onMove = (e) => {
    if (!dragging.current) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    const dx = x - dragging.current.startX;
    const dy = y - dragging.current.startY;
    const sc = dragging.current.startCrop;
    const nat = imgSize;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const MIN = 40, MAX = Math.floor(Math.min(nat.w, nat.h) * 0.9);
    let next = { ...sc };
    const { type } = dragging.current;

    if (type === 'move') {
      next.x = clamp(sc.x + dx, 0, nat.w - sc.size);
      next.y = clamp(sc.y + dy, 0, nat.h - sc.size);
    } else {
      const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      if (type === 'tl') {
        const s = clamp(sc.size - delta, MIN, Math.min(sc.x + sc.size, sc.y + sc.size));
        next = { x: sc.x + sc.size - s, y: sc.y + sc.size - s, size: s };
      } else if (type === 'tr') {
        const s = clamp(sc.size + delta, MIN, Math.min(nat.w - sc.x, sc.y + sc.size));
        next = { x: sc.x, y: sc.y + sc.size - s, size: s };
      } else if (type === 'bl') {
        const s = clamp(sc.size - delta, MIN, Math.min(sc.x + sc.size, nat.h - sc.y));
        next = { x: sc.x + sc.size - s, y: sc.y, size: s };
      } else if (type === 'br') {
        const s = clamp(sc.size + delta, MIN, Math.min(nat.w - sc.x, nat.h - sc.y));
        next = { x: sc.x, y: sc.y, size: s };
      }
      if (next.size > MAX) next.size = MAX;
      next.x = clamp(next.x, 0, nat.w - next.size);
      next.y = clamp(next.y, 0, nat.h - next.size);
    }
    setCrop(next);
  };

  const onUp = () => { dragging.current = null; };

  // Arrow-key precision
  useEffect(() => {
    const onKey = (e) => {
      if (!crop.size) return;
      const STEP = 5;
      let n = { ...crop };
      if (e.key === 'ArrowLeft') n.x = Math.max(0, n.x - STEP);
      else if (e.key === 'ArrowRight') n.x = Math.min(imgSize.w - n.size, n.x + STEP);
      else if (e.key === 'ArrowUp') n.y = Math.max(0, n.y - STEP);
      else if (e.key === 'ArrowDown') n.y = Math.min(imgSize.h - n.size, n.y + STEP);
      else if (e.key === '+' || e.key === '=') n.size = Math.min(n.size + STEP, Math.floor(Math.min(imgSize.w, imgSize.h) * 0.9));
      else if (e.key === '-') n.size = Math.max(40, n.size - STEP);
      else return;
      e.preventDefault();
      setCrop(n);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [crop, imgSize]);

  // Export
  const handleDone = () => {
    if (!imgElement) return;
    const out = document.createElement('canvas');
    out.width = out.height = 480;
    out.getContext('2d').drawImage(imgElement, crop.x, crop.y, crop.size, crop.size, 0, 0, 480, 480);
    out.toBlob((blob) => {
      if (!blob) return;
      onDone(new File([blob], 'profile.jpg', { type: 'image/jpeg' }), URL.createObjectURL(blob));
    }, 'image/jpeg', 0.92);
  };

  const dW = Math.round(imgSize.w * displayScale);
  const dH = Math.round(imgSize.h * displayScale);

  return (
    <div
      className="w-full rounded-2xl border animate-fadeIn overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(15,5,10,0.97), rgba(30,8,16,0.95))',
        borderColor: C.borderGold,
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 24px ${C.glowGold}`,
      }}
    >
      <div className="h-0.5 w-full" style={{ background: C.gradBtn }} />

      <div className="p-4">
        {/* header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-bold" style={{ color: C.textPrimary }}>Crop Your Photo</h4>
            <p className="text-[0.65rem]" style={{ color: C.textDim }}>
              Drag to move · Corners to resize
            </p>
          </div>
          <button
            onClick={onCancel}
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all hover:opacity-70"
            style={{ background: 'rgba(255,255,255,0.06)', color: C.textMuted }}
          >✕</button>
        </div>

        {/* canvas */}
        <div className="flex justify-center mb-3">
          <div
            ref={containerRef}
            className="rounded-xl overflow-hidden cursor-crosshair select-none"
            style={{ border: `1px solid ${C.borderGold}`, background: '#000', touchAction: 'none', maxWidth: '100%' }}
          >
            <canvas
              ref={canvasRef}
              style={{ display: 'block', width: dW, maxWidth: '100%', height: 'auto', touchAction: 'none' }}
              onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
              onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
            />
          </div>
        </div>

        <p className="text-center text-[0.65rem] mb-3" style={{ color: C.textDim }}>
          Keep your <span style={{ color: C.goldLight }}>face fully inside</span> the crop area
        </p>

        {/* actions */}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl text-[0.75rem] font-bold border transition-all hover:opacity-70"
            style={{ color: C.textMuted, borderColor: C.borderGold }}
          >← Back</button>
          <button
            onClick={handleDone}
            className="flex-[2] py-2 rounded-xl font-bold text-white text-[0.75rem] tracking-wide transition-all hover:-translate-y-0.5"
            style={{ background: C.gradBtn, boxShadow: `0 3px 14px ${C.glowGold}` }}
          >Use This Photo ✦</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main export — fully inline, no fixed overlays, no scroll lock
// ═══════════════════════════════════════════════════════════════════════════════
export default function ProfileImagePicker({ value, onChange }) {
  const [phase, setPhase] = useState('idle'); // idle | warning | crop
  const [rawSrc, setRawSrc] = useState(null);
  const fileInputRef = useRef(null);

  const onFileChosen = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawSrc(ev.target.result);
      setPhase('crop');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const onCropDone = (file, preview) => {
    setPhase('idle');
    setRawSrc(null);
    onChange?.(file, preview);
  };

  const reset = () => {
    setPhase('idle');
    setRawSrc(null);
  };

  // ── Idle: show upload button or preview ─────────────────────────────────────
  if (phase === 'idle') {
    return (
      <>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onFileChosen} />
        <label className={labelCls}>Profile Image *</label>

        {value?.preview ? (
          <div className="flex items-center gap-3">
            <div
              className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border-2"
              style={{ borderColor: C.borderStrong }}
            >
              <img src={value.preview} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setPhase('warning')}
                className="px-3 py-1.5 rounded-lg text-[0.72rem] font-bold border transition-all hover:opacity-80"
                style={{ color: C.gold, borderColor: C.borderStrong }}
              >✎ Change Photo</button>
              <button
                onClick={() => onChange?.(null, null)}
                className="px-3 py-1.5 rounded-lg text-[0.72rem] font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
              >✕ Remove</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setPhase('warning')}
            className="w-full h-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all hover:opacity-80"
            style={{ borderColor: C.borderStrong, background: 'rgba(183,145,67,0.04)' }}
          >
            <span className="text-2xl mb-1.5">📷</span>
            <span className="text-xs font-semibold" style={{ color: C.textSecondary }}>Upload Photo</span>
            <span className="text-[0.65rem] mt-0.5" style={{ color: C.textDim }}>Face must be clearly visible</span>
          </button>
        )}
      </>
    );
  }

  // ── Warning ─────────────────────────────────────────────────────────────────
  if (phase === 'warning') {
    return (
      <>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onFileChosen} />
        <label className={labelCls}>Profile Image *</label>
        <WarningPanel
          onContinue={() => { setPhase('idle'); fileInputRef.current?.click(); }}
          onCancel={reset}
        />
      </>
    );
  }

  // ── Crop ────────────────────────────────────────────────────────────────────
  if (phase === 'crop' && rawSrc) {
    return (
      <>
        <label className={labelCls}>Profile Image *</label>
        <CropPanel imageSrc={rawSrc} onDone={onCropDone} onCancel={reset} />
      </>
    );
  }

  return null;
}