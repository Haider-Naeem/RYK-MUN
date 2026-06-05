import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/config';
import { useAuth } from '../../hooks/useAuth';
import Sidebar, { DelegateMobileBar, adminPadClass } from '../Shared/Sidebar';
import { getInitials } from '../../utils/helpers';
import { invalidateCollection as invalidateCache } from '../../utils/cache';
import { uploadToR2 } from '../../utils/r2';
import toast from 'react-hot-toast';
import bk from "../../Assets/bk.webp";

// ── Constants ──
const BG_SRC = bk;
const BG_COLOR = '#440713';
const BG_GRADIENT = 'linear-gradient(180deg, rgba(68,7,19,0.55) 0%, rgba(10,0,2,0.75) 100%)';
const GLOW_GOLD = 'radial-gradient(circle, rgba(183,145,67,0.18), transparent 70%)';
const GLOW_RED = 'radial-gradient(circle, rgba(120,18,30,0.18), transparent 70%)';
const PANEL_BG = 'rgba(68,7,19,0.58)';
const BORDER_GOLD = 'rgba(183,145,67,0.18)';
const BORDER_GOLD_STRONG = 'rgba(183,145,67,0.3)';

const inputCls =
  'w-full rounded-xl border border-[rgba(183,145,67,0.25)] bg-[rgba(0,0,0,0.4)] backdrop-blur-sm px-4 py-3.5 text-sm text-[#F8F3EA] placeholder:text-[#b89b84] focus:border-[#B79143] focus:outline-none focus:ring-2 focus:ring-[#B79143]/20 transition-all duration-300';
const labelCls = 'mb-2 block text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[#B79143]';
const cardCls = 'rounded-2xl border backdrop-blur-xl p-5 sm:p-6';

export default function UserProfile() {
  const { currentUser, userProfile, fetchUserProfile } = useAuth();
  const navigate = useNavigate();
  const padClass = adminPadClass(userProfile);

  const [form, setForm] = useState({ fullName: '', phone: '' });
  const [savedImageUrl, setSavedImageUrl] = useState(null);
  const [imgFile, setImgFile] = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const [rawImageFile, setRawImageFile] = useState(null);
  const [cropPreviewUrl, setCropPreviewUrl] = useState(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const cropAreaRef = useRef(null);
  const dragRef = useRef({ startX: 0, startY: 0, baseX: 0, baseY: 0 });

  // Check if user is a delegate (not admin)
  const isDelegate = userProfile?.role !== 'admin';

  useEffect(() => {
    if (!userProfile) return;
    setForm({
      fullName: userProfile.fullName || '',
      phone: userProfile.phone || '',
    });
    if (userProfile.profileImage && !savedImageUrl) {
      setSavedImageUrl(userProfile.profileImage);
    }
  }, [userProfile]);

  useEffect(() => {
    return () => {
      if (imgPreview) URL.revokeObjectURL(imgPreview);
    };
  }, [imgPreview]);

  useEffect(() => {
    if (!rawImageFile) {
      if (cropPreviewUrl) URL.revokeObjectURL(cropPreviewUrl);
      setCropPreviewUrl(null);
      return;
    }
    const nextUrl = URL.createObjectURL(rawImageFile);
    setCropPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [rawImageFile]);

  const displayImage = imgPreview ?? savedImageUrl ?? userProfile?.profileImage ?? null;

  function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      return;
    }
    setRawImageFile(file);
    setCropPos({ x: 0, y: 0 });
    setCropZoom(1);
    setCropModalOpen(true);
  }

  function clearSelection() {
    setImgFile(null);
    if (imgPreview) URL.revokeObjectURL(imgPreview);
    setImgPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function closeCropModal() {
    setCropModalOpen(false);
    setRawImageFile(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function createCroppedFile(file, { offsetX, offsetY, zoom, previewSize }) {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      const objectUrl = URL.createObjectURL(file);
      i.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(i);
      };
      i.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image'));
      };
      i.src = objectUrl;
    });

    const outputSize = 800;
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');

    const baseScale = Math.min(outputSize / img.width, outputSize / img.height);
    const drawW = img.width * baseScale * zoom;
    const drawH = img.height * baseScale * zoom;

    const ratio = outputSize / Math.max(previewSize, 1);
    const userOffsetX = offsetX * ratio;
    const userOffsetY = offsetY * ratio;

    const drawX = (outputSize - drawW) / 2 + userOffsetX;
    const drawY = (outputSize - drawH) / 2 + userOffsetY;

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, outputSize, outputSize);
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) throw new Error('Failed to crop image');
    return new File([blob], `profile_${Date.now()}.jpg`, { type: 'image/jpeg' });
  }

  async function handleConfirmCrop() {
    if (!rawImageFile) return;
    try {
      const previewSize = cropAreaRef.current?.clientWidth ?? 420;
      const cropped = await createCroppedFile(rawImageFile, {
        offsetX: cropPos.x,
        offsetY: cropPos.y,
        zoom: cropZoom,
        previewSize,
      });
      if (imgPreview) URL.revokeObjectURL(imgPreview);
      setImgFile(cropped);
      setImgPreview(URL.createObjectURL(cropped));
      setCropModalOpen(false);
      setRawImageFile(null);
    } catch (err) {
      console.error('Crop failed:', err);
      toast.error('Could not crop image. Please try another file.');
    }
  }

  function handleCropPointerDown(e) {
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: cropPos.x,
      baseY: cropPos.y,
    };
    setIsDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function handleCropPointerMove(e) {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setCropPos({
      x: dragRef.current.baseX + dx,
      y: dragRef.current.baseY + dy,
    });
  }

  function handleCropPointerUp(e) {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }

  async function handleSave() {
    if (!form.fullName.trim()) {
      toast.error('Full name is required');
      return;
    }
    setSaving(true);
    let profileImage = savedImageUrl ?? userProfile?.profileImage ?? '';

    try {
      if (imgFile) {
        setUploading(true);
        try {
          const ext = imgFile.type === 'image/png' ? 'png' : 'jpg';
          const uploadPath = `profiles/${currentUser.id}/profile_${Date.now()}.${ext}`;
          profileImage = await uploadToR2(imgFile, uploadPath);
          setSavedImageUrl(`${profileImage}${profileImage.includes('?') ? '&' : '?'}v=${Date.now()}`);
          clearSelection();
        } finally {
          setUploading(false);
        }
      }

      const { error } = await supabase
        .from('users')
        .update({
          full_name: form.fullName.trim(),
          phone: form.phone.trim(),
          profile_image: profileImage,
        })
        .eq('id', currentUser.id);

      if (error) throw error;
      invalidateCache('users');
      fetchUserProfile(currentUser.id).catch(console.error);
      toast.success('Profile updated successfully!');
    } catch (e) {
      console.error('Profile save error:', e);
      toast.error('Update failed: ' + (e.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }

  const roleBadge =
    userProfile?.role === 'admin'
      ? 'inline-block rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300'
      : 'inline-block rounded-lg border border-amber-400/30 bg-amber-500/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200';

  const roleLabel = userProfile?.role === 'admin' ? '🛡️ Admin' : '👤 Delegate';

  return (
    <div className={`relative min-h-screen overflow-hidden ${padClass}`} style={{ backgroundColor: BG_COLOR }}>
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <img src={BG_SRC} alt="" className="w-full h-full object-cover grayscale brightness-[0.15]" />
        <div className="absolute inset-0" style={{ background: BG_GRADIENT }} />
      </div>

      {/* Glow Effects */}
      <div
        className="fixed -top-32 -left-32 w-[420px] h-[420px] rounded-full blur-3xl opacity-40 pointer-events-none"
        style={{ background: GLOW_GOLD }}
      />
      <div
        className="fixed bottom-0 right-0 w-[420px] h-[420px] rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ background: GLOW_RED }}
      />

      <Sidebar />
      <DelegateMobileBar />

      {/* ── CENTERED MOBILE-FRIENDLY LAYOUT ── */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-2 sm:px-5 py-20 sm:py-10">
        <div className="w-full max-w-4xl">
          
          {/* ── BACK BUTTON (Only for Delegates) ── */}
          {isDelegate && (
            <>
              {/* Desktop Back Button (hidden on mobile) */}
              <button
                onClick={() => navigate("/")}
                className="hidden sm:flex items-center gap-2 text-[#B79143] hover:text-[#F8F3EA] transition text-sm font-medium mb-4"
              >
                ← Back to Home
              </button>

              {/* Mobile Back Button (hidden on desktop) */}
              <button
                onClick={() => navigate("/")}
                className="sm:hidden flex items-center gap-2 text-[#B79143] hover:text-[#F8F3EA] transition text-sm font-medium mb-4"
              >
                ← Back
              </button>
            </>
          )}

          {/* Profile heading */}
          <div className="mb-6 text-center sm:text-left">
            <p className="text-[#B79143] uppercase tracking-[0.3em] text-[11px] mb-2">Profile</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#F8F3EA]">My Profile</h1>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
            {/* LEFT COLUMN – Photo + Role + Email */}
            <div className="w-full shrink-0 lg:w-[280px]">
              <div className={cardCls} style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
                <div className="text-center">
                  {/* Profile image */}
                  <div className="relative mb-5 inline-block">
                    {displayImage ? (
                      <img
                        src={displayImage}
                        alt="Profile"
                        crossOrigin="anonymous"
                        className="block size-[120px] rounded-full border-[3px] object-cover shadow-lg shadow-[#B79143]/10 mx-auto"
                        style={{ borderColor: '#B79143' }}
                        onError={e => {
                          e.target.style.display = 'none';
                          const fb = e.target.parentNode?.querySelector('[data-profile-fallback]');
                          if (fb) fb.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div
                      data-profile-fallback
                      className={`flex size-[120px] items-center justify-center rounded-full border-[3px] shadow-lg shadow-[#B79143]/10 bg-[#B79143]/10 text-4xl text-[#B79143] mx-auto ${displayImage ? 'hidden' : 'flex'}`}
                      style={{ borderColor: '#B79143' }}
                    >
                      {getInitials(form.fullName || userProfile?.fullName)}
                    </div>
                    <button
                      type="button"
                      className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/60 text-3xl text-white opacity-0 transition-all duration-300 hover:opacity-100 hover:scale-105"
                      onClick={() => fileRef.current?.click()}
                      aria-label="Change photo"
                    >
                      📷
                    </button>
                  </div>

                  <input type="file" ref={fileRef} accept="image/*" onChange={handleImageSelect} className="hidden" />

                  <div className="flex flex-col gap-2.5 mb-5">
                    <button
                      type="button"
                      className="w-full rounded-xl border py-2.5 text-sm font-semibold text-[#B79143] transition-all duration-300 hover:bg-[#B79143]/10 disabled:opacity-50"
                      style={{ borderColor: BORDER_GOLD_STRONG }}
                      onClick={() => fileRef.current?.click()}
                      disabled={saving || uploading}
                    >
                      📷 {displayImage ? 'Change Photo' : 'Upload Photo'}
                    </button>
                    {imgFile && (
                      <button
                        type="button"
                        className="w-full rounded-xl border border-red-400/40 bg-red-500/15 py-2.5 text-sm font-semibold text-red-300 transition-all duration-300 hover:bg-red-500/25 disabled:opacity-50"
                        onClick={clearSelection}
                        disabled={saving || uploading}
                      >
                        Cancel Selection
                      </button>
                    )}
                  </div>

                  <p className="text-xs leading-relaxed text-[#b89b84]">JPG or PNG, max 5 MB.</p>

                  {/* Account Role */}
                  <div className="mt-6 pt-5 text-center" style={{ borderTop: `1px solid ${BORDER_GOLD_STRONG}` }}>
                    <div className={labelCls}>Account Role</div>
                    <span className={roleBadge}>{roleLabel}</span>
                  </div>

                  {/* Email */}
                  <div className="mt-5 pt-5 text-left" style={{ borderTop: `1px solid ${BORDER_GOLD_STRONG}` }}>
                    <div className={labelCls}>Email</div>
                    <div className="break-all text-sm text-[#b89b84]">{currentUser?.email}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN – Details Form */}
            <div className="min-w-0 flex-1">
              <div className={cardCls} style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
                <h2
                  className="mb-5 pb-3 text-sm font-bold uppercase tracking-[0.2em] text-[#B79143]"
                  style={{ borderBottom: '1px solid rgba(183,145,67,0.2)' }}
                >
                  Personal Details
                </h2>

                <div className="mb-5">
                  <label className={labelCls}>Full Name *</label>
                  <input
                    className={inputCls}
                    placeholder="John Smith"
                    value={form.fullName}
                    onChange={e => setForm({ ...form, fullName: e.target.value })}
                    disabled={saving}
                  />
                </div>

                <div className="mb-5">
                  <label className={labelCls}>Phone Number</label>
                  <input
                    className={inputCls}
                    placeholder="+92 300 0000000"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    disabled={saving}
                  />
                </div>

                {/* Divider */}
                <div
                  className="my-6 h-px"
                  style={{ background: 'linear-gradient(to right, transparent, #B79143, transparent)', opacity: 0.5 }}
                />

                {/* Info Box */}
                <div
                  className="mb-6 rounded-xl border p-4 text-sm text-[#F8F3EA]"
                  style={{ borderColor: 'rgba(183,145,67,0.2)', backgroundColor: 'rgba(183,145,67,0.08)' }}
                >
                  💡 Your name and photo appear on your digital pass and registrations.
                </div>

                {uploading && (
                  <div
                    className="mb-4 flex items-center gap-3 rounded-xl border p-4 text-sm"
                    style={{ borderColor: 'rgba(183,145,67,0.2)', backgroundColor: 'rgba(183,145,67,0.08)' }}
                  >
                    <div className="w-4 h-4 shrink-0 animate-spin rounded-full border-2 border-[#B79143]/30 border-t-[#B79143]" />
                    <span className="text-[#F8F3EA]">Uploading photo…</span>
                  </div>
                )}

                <button
                  type="button"
                  className="rounded-xl bg-gradient-to-r from-[#8E6B2F] via-[#B79143] to-[#D7B46A] px-8 py-3.5 text-sm font-semibold text-[#2A0B12] transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#B79143]/20 disabled:opacity-50 disabled:hover:scale-100 w-full sm:w-auto"
                  onClick={handleSave}
                  disabled={saving || uploading}
                >
                  {uploading ? '⬆️ Uploading…' : saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Crop Modal */}
      {cropModalOpen && rawImageFile && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-sm">
          <div
            className="flex max-h-[90vh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border shadow-2xl"
            style={{ borderColor: BORDER_GOLD_STRONG, backgroundColor: BG_COLOR }}
          >
            {/* Modal Header */}
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
              style={{ borderBottom: `1px solid ${BORDER_GOLD_STRONG}`, backgroundColor: BG_COLOR }}
            >
              <h3 className="text-lg font-bold text-[#F8F3EA]">Adjust Profile Photo</h3>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6">
              <div
                ref={cropAreaRef}
                className={`mx-auto mb-5 aspect-square max-w-[420px] cursor-grab overflow-hidden rounded-full border-2 bg-black/40 transition-all duration-200 ${
                  isDragging ? 'cursor-grabbing scale-[1.02]' : ''
                }`}
                style={{ touchAction: 'none', borderColor: '#B79143', boxShadow: '0 0 30px rgba(183,145,67,0.1)' }}
                onPointerDown={handleCropPointerDown}
                onPointerMove={handleCropPointerMove}
                onPointerUp={handleCropPointerUp}
                onPointerLeave={handleCropPointerUp}
              >
                <img
                  src={cropPreviewUrl}
                  alt="Crop preview"
                  className="size-full select-none object-contain pointer-events-none"
                  style={{ transform: `translate(${cropPos.x}px, ${cropPos.y}px) scale(${cropZoom})`, transformOrigin: 'center' }}
                />
              </div>

              <div className="mb-3">
                <label className={labelCls}>Zoom</label>
                <input
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: '#B79143', background: 'rgba(183,145,67,0.15)' }}
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.05"
                  value={cropZoom}
                  onChange={e => setCropZoom(Number(e.target.value))}
                />
              </div>
              <p className="text-xs text-[#b89b84]">Drag the image to position it perfectly.</p>
            </div>

            {/* Modal Footer */}
            <div
              className="sticky bottom-0 flex flex-col sm:flex-row justify-end gap-3 px-5 py-4"
              style={{ borderTop: `1px solid ${BORDER_GOLD_STRONG}`, backgroundColor: BG_COLOR }}
            >
              <button
                type="button"
                className="rounded-xl border px-5 py-2.5 text-sm font-semibold text-[#B79143] transition-all duration-300 hover:bg-[#B79143]/10 w-full sm:w-auto"
                style={{ borderColor: BORDER_GOLD_STRONG }}
                onClick={closeCropModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-xl bg-gradient-to-r from-[#8E6B2F] via-[#B79143] to-[#D7B46A] px-5 py-2.5 text-sm font-semibold text-[#2A0B12] transition-all duration-300 hover:scale-[1.02] w-full sm:w-auto"
                onClick={handleConfirmCrop}
              >
                Use This Crop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}