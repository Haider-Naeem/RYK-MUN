import { uploadToR2 } from './r2';
import { v4 as uuidv4 } from 'uuid';

/* Upload any file to R2 — keeps the same call signature as the Firebase version */
export async function uploadImage(file, path) {
  return uploadToR2(file, path);
}

export function generateQRToken() {
  return uuidv4();
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