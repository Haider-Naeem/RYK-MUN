import { uploadToR2 } from './r2';
import { v4 as uuidv4 } from 'uuid';

/* Upload any file to R2 — keeps the same call signature as the Firebase version */
export async function uploadImage(file, path) {
  return uploadToR2(file, path);
}

export function generateQRToken() {
  return uuidv4();
}

/**
 * Safely convert any image URL (including cross-origin R2 URLs) to a Base64 data URL.
 * Routes R2 direct bucket URLs through the Worker proxy to ensure CORS compliance for html2canvas.
 */
export async function imageUrlToBase64(url) {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('data:image/')) return url;

  // 1. If it's an R2 direct URL, rewrite to worker proxy URL so CORS headers are returned
  let targetUrl = url;
  const workerUrl = import.meta.env.VITE_R2_WORKER_URL;
  if (workerUrl && (url.includes('.r2.dev') || url.includes('r2.cloudflarestorage.com'))) {
    try {
      const parsed = new URL(url);
      const path = parsed.pathname.replace(/^\/+/, '');
      targetUrl = `${workerUrl.replace(/\/+$/, '')}/${path}`;
    } catch (e) {}
  }

  // 2. Try fetch -> blob -> FileReader data URL
  try {
    const res = await fetch(targetUrl, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  } catch (err) {}

  // 3. Try with original URL if targetUrl was rewritten
  if (targetUrl !== url) {
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (res.ok) {
        const blob = await res.blob();
        return await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch (err) {}
  }

  // 4. Try Image + Canvas with crossOrigin
  try {
    const b64 = await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = reject;
      img.src = targetUrl;
    });
    if (b64) return b64;
  } catch (err) {}

  return null;
}

export function formatCurrency(amount) {
  if (!amount) return 'PKR 0';
  return `PKR ${Number(amount).toLocaleString('en-PK')}`;
}

export function formatDate(timestamp) {
  if (!timestamp) return '—';
  // Handles ISO strings (Supabase) and Firestore Timestamps
  const date = typeof timestamp === 'string'
    ? new Date(timestamp)
    : timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp);
  return date.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(timestamp) {
  if (!timestamp) return '—';
  const date = typeof timestamp === 'string'
    ? new Date(timestamp)
    : timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp);
  return date.toLocaleString('en-PK', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function seatPercent(filled, total) {
  if (!total) return 0;
  return Math.min(100, Math.round((filled / total) * 100));
}

export function statusColor(status) {
  switch (status) {
    case 'approved': return 'badge-approved';
    case 'rejected': return 'badge-rejected';
    case 'pending':  return 'badge-pending';
    default:         return 'badge-pending';
  }
}