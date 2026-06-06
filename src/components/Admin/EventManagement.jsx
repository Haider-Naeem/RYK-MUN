// src/components/Admin/EventManagement.jsx
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabase/config';
import { usePermissions } from '../../hooks/usePermissions';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import Sidebar from '../Shared/Sidebar';
import { formatDate, formatCurrency, getInitials, generateQRToken } from '../../utils/helpers';
import { uploadToR2 } from '../../utils/r2';
import { keysToCamel } from '../../utils/cache';
import toast from 'react-hot-toast';
import bk from "../../Assets/bk.webp";

// ── Constants ──
const BG_SRC = bk;
const BG_COLOR = '#440713';
const BG_GRADIENT = 'linear-gradient(180deg, rgba(68,7,19,0.55) 0%, rgba(10,0,2,0.75) 100%)';
const GLOW_GOLD = 'radial-gradient(circle, rgba(183,145,67,0.18), transparent 70%)';
const GLOW_RED = 'radial-gradient(circle, rgba(120,18,30,0.18), transparent 70%)';
const PANEL_BG = 'rgba(68,7,19,0.58)';
const CARD_BG = 'rgba(68,7,19,0.35)';
const BORDER_GOLD = 'rgba(183,145,67,0.18)';
const BORDER_GOLD_LIGHT = 'rgba(183,145,67,0.08)';
const BORDER_GOLD_MEDIUM = 'rgba(183,145,67,0.28)';
const BORDER_GOLD_STRONG = 'rgba(183,145,67,0.3)';

const WIZARD_STEPS = ['Event Details', 'Committees', 'Sponsor Packages', 'Payment Methods'];

const emptyDetails = {
  name: '',
  registrationStartDate: '',
  registrationEndDate: '',
  startDate: '',
  endDate: '',
  venue: '',
  venueLocation: '',
  venueIntro: '',
  venueLogoUrl: '',
  cardAllotmentDate: '',
  description: '',
  status: 'active',
  entryFees: '',
  currency: 'PKR',
  imageUrl: '',
};

const emptyCommittee = { name: '', abbr: '', seats: '', description: '', topic: '', logoUrl: '' };
const emptyPackage   = { name: '', details: '', amount: '' };
const emptyPayments  = { bankAccount: '', bankName: '', jazzCash: '', jazzCashName: '', easyPaisa: '', easyPaisaName: '' };

const DEFAULT_BANNER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect width='400' height='200' fill='%234A0A12'/%3E%3Ctext x='200' y='90' text-anchor='middle' fill='%23C9A84C' font-size='48' font-family='serif'%3E%F0%9F%8E%AA%3C/text%3E%3Ctext x='200' y='140' text-anchor='middle' fill='%23C9A84C40' font-size='16' font-family='sans-serif'%3EMODEL UNITED NATIONS%3C/text%3E%3C/svg%3E";

const inputCls = 'w-full rounded-xl border border-[rgba(183,145,67,0.25)] bg-[rgba(0,0,0,0.4)] backdrop-blur-sm px-4 py-3.5 text-sm text-[#F8F3EA] placeholder:text-[#b89b84] focus:border-[#B79143] focus:outline-none focus:ring-2 focus:ring-[#B79143]/20 transition-all duration-300';
const labelCls = 'mb-2 block text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[#B79143]';

function statusBadge(status) {
  const base = 'inline-block rounded-lg px-3 py-1 text-[10px] uppercase tracking-[0.15em] font-bold';
  if (status === 'approved')  return `${base} bg-emerald-500/15 text-emerald-300 border border-emerald-400/30`;
  if (status === 'rejected')  return `${base} bg-red-500/15 text-red-300 border border-red-400/30`;
  if (status === 'active')    return `${base} bg-emerald-500/15 text-emerald-300 border border-emerald-400/30`;
  if (status === 'upcoming')  return `${base} bg-amber-500/15 text-amber-200 border border-amber-400/30`;
  if (status === 'completed') return `${base} bg-[rgba(183,145,67,0.15)] text-[#D7B46A] border border-[rgba(183,145,67,0.3)]`;
  return `${base} bg-red-500/15 text-red-300 border border-red-400/30`;
}

function formatBookingTime(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  const date = d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${date} · ${time}`;
}

/* ── Image Crop Modal ── */
function ImageCropModal({ file, onCrop, onClose }) {
  const [cropPos,    setCropPos]    = useState({ x: 0, y: 0 });
  const [cropZoom,   setCropZoom]   = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const cropAreaRef = useRef(null);
  const dragRef     = useRef({ startX: 0, startY: 0, baseX: 0, baseY: 0 });

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handlePointerDown(e) {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: cropPos.x, baseY: cropPos.y };
    setIsDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function handlePointerMove(e) {
    if (!isDragging) return;
    setCropPos({ x: dragRef.current.baseX + (e.clientX - dragRef.current.startX), y: dragRef.current.baseY + (e.clientY - dragRef.current.startY) });
  }
  function handlePointerUp(e) {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }

  async function handleConfirm() {
    if (!file || !previewUrl) return;
    try {
      const img = await new Promise((resolve, reject) => {
        const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = previewUrl;
      });
      const outputSize = 1200;
      const canvas = document.createElement('canvas');
      canvas.width = outputSize; canvas.height = outputSize;
      const ctx = canvas.getContext('2d');
      const previewSize = cropAreaRef.current?.clientWidth ?? 420;
      const baseScale = Math.min(outputSize / img.width, outputSize / img.height);
      const drawW = img.width * baseScale * cropZoom;
      const drawH = img.height * baseScale * cropZoom;
      const ratio = outputSize / Math.max(previewSize, 1);
      const drawX = (outputSize - drawW) / 2 + cropPos.x * ratio;
      const drawY = (outputSize - drawH) / 2 + cropPos.y * ratio;
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, outputSize, outputSize);
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      const croppedFile = new File([blob], `cropped_${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCrop(croppedFile, URL.createObjectURL(croppedFile));
    } catch (err) { console.error('Crop failed:', err); toast.error('Failed to crop image'); }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="flex max-h-[90vh] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl border shadow-2xl" style={{ borderColor: BORDER_GOLD_STRONG, backgroundColor: BG_COLOR }}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${BORDER_GOLD_STRONG}`, backgroundColor: BG_COLOR }}>
          <h3 className="text-lg font-bold text-[#F8F3EA]">Crop & Zoom Image</h3>
          <button className="rounded-lg border px-2 py-1 text-sm text-[#B79143] hover:bg-[#B79143]/10 transition" style={{ borderColor: BORDER_GOLD_STRONG }} onClick={onClose}>✕</button>
        </div>
        <div className="overflow-y-auto p-6">
          <div
            ref={cropAreaRef}
            className={`mx-auto mb-5 aspect-square max-w-[420px] cursor-grab overflow-hidden rounded-xl border-2 bg-black/40 transition-all duration-200 ${isDragging ? 'cursor-grabbing scale-[1.02]' : ''}`}
            style={{ touchAction: 'none', borderColor: '#B79143', boxShadow: '0 0 30px rgba(183,145,67,0.1)' }}
            onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}
          >
            {previewUrl && (
              <img src={previewUrl} alt="Crop preview" className="size-full select-none object-contain pointer-events-none"
                style={{ transform: `translate(${cropPos.x}px, ${cropPos.y}px) scale(${cropZoom})`, transformOrigin: 'center' }} />
            )}
          </div>
          <div className="mb-3">
            <label className={labelCls}>Zoom</label>
            <input className="w-full h-2 rounded-full appearance-none cursor-pointer" style={{ accentColor: '#B79143', background: 'rgba(183,145,67,0.15)' }}
              type="range" min="0.5" max="3" step="0.05" value={cropZoom} onChange={e => setCropZoom(Number(e.target.value))} />
          </div>
          <p className="text-xs text-[#b89b84]">Drag to position, use slider to zoom.</p>
        </div>
        <div className="sticky bottom-0 flex justify-end gap-3 px-5 py-4" style={{ borderTop: `1px solid ${BORDER_GOLD_STRONG}`, backgroundColor: BG_COLOR }}>
          <button className="rounded-xl border px-5 py-2.5 text-sm font-semibold text-[#B79143] transition hover:bg-[#B79143]/10" style={{ borderColor: BORDER_GOLD_STRONG }} onClick={onClose}>Cancel</button>
          <button className="rounded-xl bg-gradient-to-r from-[#8E6B2F] via-[#B79143] to-[#D7B46A] px-5 py-2.5 text-sm font-semibold text-[#2A0B12] transition hover:scale-[1.02]" onClick={handleConfirm}>Use This Crop</button>
        </div>
      </div>
    </div>
  );
}

/* ── Wizard Step Bar ── */
function WizardBar({ current }) {
  return (
    <div className="flex items-center rounded-2xl border backdrop-blur-xl p-4 sm:p-6 mb-8 gap-0 overflow-x-auto" style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
      {WIZARD_STEPS.map((label, i) => (
        <div key={i} className="flex items-center" style={{ flex: i < WIZARD_STEPS.length - 1 ? 1 : 'none' }}>
          <div className="flex flex-col items-center gap-1.5 flex-1 min-w-[60px]">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all shrink-0 ${
              i < current ? 'bg-gradient-to-br from-[#8E6B2F] to-[#D7B46A] border-[#B79143] text-[#2A0B12] shadow-lg shadow-[#B79143]/20'
              : i === current ? 'border-[#B79143] text-[#B79143] bg-[rgba(183,145,67,0.1)]'
              : 'border-[rgba(183,145,67,0.25)] text-[#b89b84]'
            }`}>
              {i < current ? '✓' : i + 1}
            </div>
            <span className={`text-[0.6rem] font-bold uppercase tracking-[0.15em] text-center transition-colors ${
              i === current ? 'text-[#B79143]' : i < current ? 'text-[#D7B46A]' : 'text-[#b89b84]'
            }`}>{label}</span>
          </div>
          {i < WIZARD_STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 mb-5 min-w-[12px] transition-all rounded-full ${i < current ? 'bg-gradient-to-r from-[#B79143] to-[#D7B46A]' : 'bg-[rgba(183,145,67,0.12)]'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── PDF Generation ── */
function generateEventPDF(ev, delegates, sponsors, committees) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, margin = 18; let y = 0;
  const maroon = [74, 10, 18], gold = [201, 168, 76], cream = [245, 230, 192];
  const commMap = Object.fromEntries(committees.map(c => [c.id, c.name]));
  function resolveCommittee(reg) { return !reg.committee ? '—' : commMap[reg.committee] || reg.committeeName || reg.committee; }
  const sortedDelegates = [...delegates].sort((a, b) => {
    const commA = resolveCommittee(a).toLowerCase();
    const commB = resolveCommittee(b).toLowerCase();
    return commA < commB ? -1 : commA > commB ? 1 : 0;
  });
  pdf.setFillColor(...maroon); pdf.rect(0, 0, W, 297, 'F');
  pdf.setFillColor(...gold); pdf.rect(0, 0, W, 42, 'F');
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(22); pdf.setTextColor(...maroon);
  pdf.text('RYK MUN', W / 2, 16, { align: 'center' });
  pdf.setFontSize(11); pdf.text('Official Event Registration Report', W / 2, 25, { align: 'center' });
  pdf.setFontSize(14); pdf.text(ev.name || 'Untitled Event', W / 2, 36, { align: 'center' });
  y = 52;
  const formatDateForPDF = (dateStr) => {
    if (!dateStr) return 'TBD';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const s = ev.startDate || ev.date, e = ev.endDate;
  const dateLabel = !s ? 'TBD' : (e && e !== s) ? `${formatDateForPDF(s)} - ${formatDateForPDF(e)}` : formatDateForPDF(s);
  pdf.setFillColor(90, 15, 25); pdf.roundedRect(margin, y, W - margin * 2, 26, 2, 2, 'F');
  pdf.setDrawColor(...gold); pdf.setLineWidth(0.4); pdf.roundedRect(margin, y, W - margin * 2, 26, 2, 2, 'S');
  pdf.setFontSize(9);
  [['Date', dateLabel], ['Venue', ev.venue || 'TBD']].forEach(([label, val], i) => {
    const col = i % 2 === 0 ? margin + 5 : W / 2 + 5;
    pdf.setTextColor(...gold); pdf.setFont('helvetica', 'bold'); pdf.text(label.toUpperCase() + ':', col, y + 16);
    pdf.setTextColor(...cream); pdf.setFont('helvetica', 'normal'); pdf.text(String(val), col + 22, y + 16);
  });
  y += 34;
  function renderSection(title, rows, headers, colWidths) {
    if (rows.length === 0) return;
    pdf.setFillColor(...gold); pdf.rect(margin, y, W - margin * 2, 9, 'F');
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.setTextColor(...maroon);
    pdf.text(title, margin + 4, y + 6.5); pdf.setTextColor(...cream); pdf.text(`(${rows.length} registered)`, W - margin - 4, y + 6.5, { align: 'right' });
    y += 12;
    pdf.setFillColor(50, 8, 15); pdf.rect(margin, y, W - margin * 2, 9, 'F');
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(...gold);
    let xPos = margin + 3;
    headers.forEach((h, i) => { const width = colWidths[i]; pdf.text(h.toUpperCase(), xPos + width / 2, y + 6.5, { align: 'center' }); xPos += width; });
    y += 11;
    rows.forEach((row, idx) => {
      if (y > 270) { pdf.addPage(); pdf.setFillColor(...maroon); pdf.rect(0, 0, W, 297, 'F'); y = 16; }
      pdf.setFillColor(...(idx % 2 === 0 ? [60, 10, 18] : [70, 12, 22])); pdf.rect(margin, y, W - margin * 2, 10, 'F');
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(...cream);
      let cellX = margin + 3;
      row.forEach((cell, i) => {
        const width = colWidths[i]; const text = String(cell || '—'); const maxW = width - 4;
        const t = pdf.getTextWidth(text) > maxW ? pdf.splitTextToSize(text, maxW)[0] + '…' : text;
        pdf.text(t, cellX + width / 2, y + 6.8, { align: 'center' }); cellX += width;
      });
      y += 11;
    });
    y += 8;
  }
  const delegateColWidths = [12, 52, 40, 38, 32];
  renderSection('DELEGATE REGISTRATIONS',
    sortedDelegates.map((d, i) => [String(i + 1), d.fullName || '—', d.countryPersonality || '—', resolveCommittee(d), d.paymentStatus || 'pending']),
    ['#', 'Full Name', 'Country/Personality', 'Committee', 'Status'], delegateColWidths);
  const pageCount = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i); pdf.setFillColor(...gold); pdf.rect(0, 290, W, 7, 'F');
    pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(...maroon);
    pdf.text('RYK MUN — Confidential Event Report', margin, 295);
    pdf.text(`Page ${i} of ${pageCount}`, W - margin, 295, { align: 'right' });
  }
  pdf.save(`RYKMUN_${(ev.name || 'Event').replace(/\s+/g, '_')}_Report.pdf`);
}

/* ── Excel Generation ── */
function generateEventExcel(ev, delegates, sponsors, committees) {
  const commMap = Object.fromEntries(committees.map(c => [c.id, c.name]));
  function resolveCommittee(reg) { return !reg.committee ? '—' : commMap[reg.committee] || reg.committeeName || reg.committee; }
  const wb = XLSX.utils.book_new();
  const delegateData = delegates.map((d, i) => ({
    '#': i + 1, 'Full Name': d.fullName || '', 'Country/Personality': d.countryPersonality || '',
    'Committee': resolveCommittee(d), 'Email': d.email || '', 'Phone': d.phone || '',
    'Payment Status': d.paymentStatus || 'pending', 'Booking Time': formatBookingTime(d.createdAt),
  }));
  if (delegateData.length > 0) { const ws = XLSX.utils.json_to_sheet(delegateData); XLSX.utils.book_append_sheet(wb, ws, 'Delegates'); }
  const sponsorData = sponsors.map((s, i) => ({
    '#': i + 1, 'Company Name': s.companyName || s.fullName || '', 'Contact Person': s.contactPerson || '',
    'Email': s.email || '', 'Phone': s.phone || '', 'Package': s.category || '',
    'Payment Status': s.paymentStatus || 'pending', 'Registration Time': formatBookingTime(s.createdAt),
  }));
  if (sponsorData.length > 0) { const ws = XLSX.utils.json_to_sheet(sponsorData); XLSX.utils.book_append_sheet(wb, ws, 'Sponsors'); }
  const summaryData = [{ 'Event Name': ev.name || '', 'Start Date': ev.startDate || ev.date || '', 'End Date': ev.endDate || '', 'Venue': ev.venue || '', 'Total Delegates': delegates.length, 'Total Sponsors': sponsors.length, 'Total Registrations': delegates.length + sponsors.length, 'Approved Delegates': delegates.filter(d => d.paymentStatus === 'approved').length, 'Approved Sponsors': sponsors.filter(s => s.paymentStatus === 'approved').length, 'Status': ev.status || 'active' }];
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Event Summary');
  XLSX.writeFile(wb, `RYKMUN_${(ev.name || 'Event').replace(/\s+/g, '_')}_Export.xlsx`);
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export default function EventManagement() {
  const { canEdit } = usePermissions();

  const [events,        setEvents]        = useState([]);
  const [committees,    setCommittees]    = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [payments,      setPayments]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [view,          setView]          = useState('list');
  const [editingId,     setEditingId]     = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [wizStep,       setWizStep]       = useState(0);
  const [details,       setDetails]       = useState(emptyDetails);
  const [committeeRows, setCommitteeRows] = useState([{ ...emptyCommittee }]);
  const [packages,      setPackages]      = useState([
    { name: 'Gold',   details: 'Logo on banner, 2 VIP seats, social media mention', amount: '50000' },
    { name: 'Silver', details: 'Logo on banner, 1 VIP seat',                        amount: '30000' },
    { name: 'Bronze', details: 'Social media mention',                              amount: '15000' },
  ]);
  const [wizPayments,   setWizPayments]   = useState(emptyPayments);
  const [saving,        setSaving]        = useState(false);

  // ── Banner / Venue logo ──
  const [imageFile,     setImageFile]     = useState(null);
  const [imagePreview,  setImagePreview]  = useState(null);
  const [venueLogoFile,    setVenueLogoFile]    = useState(null);
  const [venueLogoPreview, setVenueLogoPreview] = useState(null);
  const [cropModal,     setCropModal]     = useState(null);
  const [cropFile,      setCropFile]      = useState(null);
  const imageRef     = useRef();
  const venueLogoRef = useRef();

  // ── Committee logos ──
  const committeeLogoRefs                               = useRef({});
  const [committeeLogoPreviews, setCommitteeLogoPreviews] = useState({});
  const [committeeLogoFiles,    setCommitteeLogoFiles]    = useState({});

  const [detailTab,         setDetailTab]         = useState('info');
  const [filterCommittee,   setFilterCommittee]   = useState('all');
  const [filterSponsorLvl,  setFilterSponsorLvl]  = useState('all');
  const [downloadingPdf,    setDownloadingPdf]    = useState(false);
  const [downloadingExcel,  setDownloadingExcel]  = useState(false);
  const [generatingCards,   setGeneratingCards]   = useState(false);
  const [reassignModal,     setReassignModal]     = useState(null);
  const [reassignTarget,    setReassignTarget]    = useState('');
  const [reassigning,       setReassigning]       = useState(false);
  const [editingCountryPersonality,  setEditingCountryPersonality]  = useState(null);
  const [countryPersonalityValue,    setCountryPersonalityValue]    = useState('');

  // ── Helpers ──
  function getCommSeats(c) { return c.totalSeats ?? c.seats ?? 0; }
  function eventSeatTotals(evId) {
    const ev = events.find(e => e.id === evId);
    const evComms = committees.filter(c => c.eventId === evId);
    if (ev?.totalSeats > 0) return { evComms, totalSeats: ev.totalSeats, totalFilled: ev.filledSeats || 0 };
    return { evComms, totalSeats: evComms.reduce((s, c) => s + (getCommSeats(c) || 0), 0), totalFilled: evComms.reduce((s, c) => s + (c.filledSeats || 0), 0) };
  }
  const committeeMap = Object.fromEntries(committees.map(c => [c.id, c.name]));
  function resolveCommitteeName(reg) {
    if (!reg.committee) return '—';
    return committeeMap[reg.committee] || reg.committeeName || reg.committee;
  }
  function eventDateRange(ev) {
    const s = ev.startDate || ev.date, e = ev.endDate;
    if (!s) return 'Date not set';
    if (e && e !== s) return `${s} → ${e}`;
    return s;
  }

  // ── Data Fetching ──
  async function refetchCommittees() {
    const { data } = await supabase.from('committees').select('*').order('created_at', { ascending: false });
    if (data) setCommittees(keysToCamel(data));
  }
  async function fetchAll() {
    try {
      const [{ data: evs }, { data: comms }, { data: regs }, { data: pays }] = await Promise.all([
        supabase.from('events').select('*').order('created_at', { ascending: false }),
        supabase.from('committees').select('*').order('created_at', { ascending: false }),
        supabase.from('registrations').select('*').order('created_at', { ascending: true }),
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
      ]);
      setEvents(keysToCamel(evs || []));
      setCommittees(keysToCamel(comms || []));
      setRegistrations(keysToCamel(regs || []));
      setPayments(keysToCamel(pays || []));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }
  useEffect(() => { fetchAll(); }, []);

  // ── Realtime: committees ──
  useEffect(() => {
    const channel = supabase.channel('em-committees-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'committees' }, payload => {
        setCommittees(prev => prev.map(c => c.id === payload.new.id ? keysToCamel(payload.new) : c));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'committees' }, payload => {
        setCommittees(prev => { const exists = prev.some(c => c.id === payload.new.id); return exists ? prev : [...prev, keysToCamel(payload.new)]; });
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // ── Realtime: registrations ──
  useEffect(() => {
    const channel = supabase.channel('em-registrations-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'registrations' }, payload => {
        setRegistrations(prev => { const exists = prev.some(r => r.id === payload.new.id); return exists ? prev : [...prev, keysToCamel(payload.new)]; });
        refetchCommittees();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'registrations' }, payload => {
        setRegistrations(prev => prev.map(r => r.id === payload.new.id ? keysToCamel(payload.new) : r));
        refetchCommittees();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // ── Realtime: events ──
  useEffect(() => {
    const channel = supabase.channel('em-events-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events' }, payload => {
        setEvents(prev => prev.map(e => e.id === payload.new.id ? keysToCamel(payload.new) : e));
        if (selectedEvent?.id === payload.new.id) setSelectedEvent(keysToCamel(payload.new));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [selectedEvent?.id]);

  // ── Update Country/Personality ──
  async function handleUpdateCountryPersonality(registrationId, value) {
    if (!canEdit) return;
    try {
      const { error } = await supabase.from('registrations').update({ countryPersonality: value }).eq('id', registrationId);
      if (error) throw error;
      setRegistrations(prev => prev.map(r => r.id === registrationId ? { ...r, countryPersonality: value } : r));
      toast.success('Country/Personality updated!');
      setEditingCountryPersonality(null);
    } catch (e) { toast.error('Update failed: ' + e.message); }
  }

  // ── Banner / Venue Logo Handling ──
  function handleImageSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
    setCropFile(file); setCropModal('banner');
  }
  function handleVenueLogoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
    setCropFile(file); setCropModal('venueLogo');
  }
  function handleCropComplete(croppedFile, previewUrl) {
    if (cropModal === 'banner') { setImageFile(croppedFile); setImagePreview(previewUrl); }
    else if (cropModal === 'venueLogo') { setVenueLogoFile(croppedFile); setVenueLogoPreview(previewUrl); }
    setCropModal(null); setCropFile(null);
  }
  function clearImage() {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null); setDetails(d => ({ ...d, imageUrl: '' }));
    if (imageRef.current) imageRef.current.value = '';
  }
  function clearVenueLogo() {
    setVenueLogoFile(null);
    if (venueLogoPreview) URL.revokeObjectURL(venueLogoPreview);
    setVenueLogoPreview(null); setDetails(d => ({ ...d, venueLogoUrl: '' }));
    if (venueLogoRef.current) venueLogoRef.current.value = '';
  }

  // ── Committee Logo Handling ──
  function handleCommitteeLogoSelect(e, index) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Logo must be under 2 MB'); return; }
    const preview = URL.createObjectURL(file);
    setCommitteeLogoFiles(prev  => ({ ...prev, [index]: file }));
    setCommitteeLogoPreviews(prev => ({ ...prev, [index]: preview }));
  }
  function clearCommitteeLogo(index) {
    const prev = committeeLogoPreviews[index];
    if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
    setCommitteeLogoFiles(p  => { const n = { ...p };  delete n[index]; return n; });
    setCommitteeLogoPreviews(p => { const n = { ...p }; delete n[index]; return n; });
    updateCommitteeRow(index, 'logoUrl', '');
    if (committeeLogoRefs.current[index]) committeeLogoRefs.current[index].value = '';
  }

  // ── View Openers ──
  function openCreate() {
    if (!canEdit) return;
    setEditingId(null); setDetails(emptyDetails);
    setCommitteeRows([{ ...emptyCommittee }]);
    setPackages([
      { name: 'Gold',   details: 'Logo on banner, 2 VIP seats, social media mention', amount: '50000' },
      { name: 'Silver', details: 'Logo on banner, 1 VIP seat',                        amount: '30000' },
      { name: 'Bronze', details: 'Social media mention',                              amount: '15000' },
    ]);
    setWizPayments(emptyPayments);
    clearImage(); clearVenueLogo();
    setCommitteeLogoFiles({});
    setCommitteeLogoPreviews({});
    setWizStep(0); setView('wizard');
  }

  function openEdit(ev) {
    if (!canEdit) return;
    setEditingId(ev.id);
    setDetails({
      name: ev.name || '',
      registrationStartDate: ev.registrationStartDate || '',
      registrationEndDate: ev.registrationEndDate || '',
      startDate: ev.startDate || ev.date || '',
      endDate: ev.endDate || ev.date || '',
      venue: ev.venue || '',
      venueLocation: ev.venueLocation || '',
      venueIntro: ev.venueIntro || '',
      venueLogoUrl: ev.venueLogoUrl || '',
      cardAllotmentDate: ev.cardAllotmentDate || '',
      description: ev.description || '',
      status: ev.status || 'active',
      entryFees: ev.entryFees || '',
      currency: ev.currency || 'PKR',
      imageUrl: ev.imageUrl || '',
    });
    const evComms = committees.filter(c => c.eventId === ev.id);
    setCommitteeRows(
      evComms.length
        ? evComms.map(c => ({
            id: c.id,
            name: c.name || '',
            abbr: c.abbr || '',
            topic: c.topic || '',
            seats: String(c.totalSeats ?? c.seats ?? ''),
            description: c.description || '',
            logoUrl: c.logoUrl || '',
          }))
        : [{ ...emptyCommittee }]
    );
    // Pre-populate committee logo previews from existing URLs
    const logoMap = {};
    evComms.forEach((c, i) => { if (c.logoUrl) logoMap[i] = c.logoUrl; });
    setCommitteeLogoPreviews(logoMap);
    setCommitteeLogoFiles({});

    setPackages(
      ev.sponsorPackages?.length
        ? ev.sponsorPackages.map(p => ({ name: p.name, details: p.details || '', amount: String(p.amount || '') }))
        : [{ ...emptyPackage }]
    );
    setWizPayments({
      bankAccount: ev.bankAccount || '',
      bankName: ev.bankName || '',
      jazzCash: ev.jazzCash || '',
      jazzCashName: ev.jazzCashName || '',
      easyPaisa: ev.easyPaisa || '',
      easyPaisaName: ev.easyPaisaName || '',
    });
    setImageFile(null); setImagePreview(ev.imageUrl || null);
    setVenueLogoFile(null); setVenueLogoPreview(ev.venueLogoUrl || null);
    setWizStep(0); setView('wizard');
  }

  function openDetail(ev) {
    setSelectedEvent(ev); setDetailTab('info'); setFilterCommittee('all'); setFilterSponsorLvl('all'); setView('detail');
  }

  // ── Wizard ──
  function nextStep() {
    if (!canEdit) return;
    if (wizStep === 0 && (!details.name || !details.startDate)) { toast.error('Event name and start date required'); return; }
    if (wizStep < 3) setWizStep(s => s + 1); else handleSave();
  }

  async function handleSave() {
    if (!canEdit) return;
    setSaving(true);
    try {
      let finalImageUrl     = details.imageUrl    || '';
      let finalVenueLogoUrl = details.venueLogoUrl || '';
      if (imageFile)     finalImageUrl     = await uploadToR2(imageFile,    `events/${Date.now()}_banner`);
      if (venueLogoFile) finalVenueLogoUrl = await uploadToR2(venueLogoFile, `events/${Date.now()}_venue_logo`);

      const sponsorPackages = packages
        .filter(p => p.name.trim())
        .map(p => ({ name: p.name.trim(), details: p.details.trim(), amount: parseFloat(p.amount) || 0 }));
      const totalSeatsForEvent = committeeRows
        .filter(c => c.name.trim())
        .reduce((s, c) => s + (parseInt(c.seats) || 0), 0);

      const eventRow = {
        name: details.name,
        registration_start_date: details.registrationStartDate || null,
        registration_end_date: details.registrationEndDate || null,
        start_date: details.startDate,
        end_date: details.endDate,
        venue: details.venue,
        venue_location: details.venueLocation || null,
        venue_intro: details.venueIntro || null,
        venue_logo_url: finalVenueLogoUrl || null,
        card_allotment_date: details.cardAllotmentDate || null,
        description: details.description,
        status: details.status,
        entry_fees: parseFloat(details.entryFees) || 0,
        currency: details.currency,
        image_url: finalImageUrl,
        sponsor_packages: sponsorPackages,
        bank_account: wizPayments.bankAccount,
        bank_name: wizPayments.bankName,
        jazz_cash: wizPayments.jazzCash,
        jazz_cash_name: wizPayments.jazzCashName,
        easy_paisa: wizPayments.easyPaisa,
        easy_paisa_name: wizPayments.easyPaisaName,
        total_seats: totalSeatsForEvent,
      };

      let eventId = editingId;
      if (editingId) {
        const { error } = await supabase.from('events').update(eventRow).eq('id', editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('events').insert({ ...eventRow, filled_seats: 0 }).select().single();
        if (error) throw error;
        eventId = data.id;
      }

      const validComms = committeeRows.filter(c => c.name.trim());
      for (let idx = 0; idx < validComms.length; idx++) {
        const c = validComms[idx];
        // Find the original index in committeeRows so logo maps correctly
        const originalIdx = committeeRows.indexOf(c);

        // Upload committee logo if a new file was selected
        let finalCommLogoUrl = c.logoUrl || '';
        if (committeeLogoFiles[originalIdx]) {
          finalCommLogoUrl = await uploadToR2(
            committeeLogoFiles[originalIdx],
            `committees/${Date.now()}_${originalIdx}_logo`
          );
        }

        const cd = {
          name: c.name.trim(),
          abbr: c.abbr?.trim() || '',
          topic: c.topic?.trim() || '',
          total_seats: parseInt(c.seats) || 0,
          description: c.description || '',
          event_id: eventId,
          logo_url: finalCommLogoUrl || null,
        };

        if (c.id) {
          const { error } = await supabase.from('committees').update(cd).eq('id', c.id);
          if (error) toast.error(`Failed to update committee "${c.name}": ${error.message}`);
        } else {
          const { error } = await supabase.from('committees').insert({ ...cd, filled_seats: 0 });
          if (error) toast.error(`Failed to create committee "${c.name}": ${error.message}`);
        }
      }

      toast.success(editingId ? 'Event updated!' : 'Event created!');
      setView('list');
      fetchAll();
    } catch (e) {
      toast.error('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id, e) {
    if (!canEdit) return;
    e?.stopPropagation();
    if (!window.confirm('Delete this event?')) return;
    try {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      setEvents(prev => prev.filter(ev => ev.id !== id));
      toast.success('Event deleted');
      if (view === 'detail') setView('list');
    } catch { toast.error('Delete failed'); }
  }

  async function handleGenerateCards() {
    if (!canEdit || !selectedEvent) return;
    setGeneratingCards(true);
    try {
      const { data: existing } = await supabase.from('qr_codes').select('registration_id').eq('event_id', selectedEvent.id);
      const existingRegIds = new Set((existing || []).map(q => q.registration_id));
      const evRegs = registrations.filter(r => r.eventId === selectedEvent.id && r.paymentStatus === 'approved');
      const toGenerate = evRegs.filter(r => !existingRegIds.has(r.id));
      if (toGenerate.length === 0) { toast.success('All approved registrations already have cards!'); return; }
      const paymentByReg = Object.fromEntries(payments.filter(p => p.eventId === selectedEvent.id).map(p => [p.registrationId, p.id]));
      const rows = toGenerate.map(reg => ({
        user_id: reg.userId,
        event_id: reg.eventId,
        registration_id: reg.id,
        payment_id: paymentByReg[reg.id] || null,
        qr_token: generateQRToken(),
        is_used: false,
      }));
      const { error } = await supabase.from('qr_codes').insert(rows);
      if (error) throw error;
      toast.success(`🎫 Generated ${toGenerate.length} digital card${toGenerate.length !== 1 ? 's' : ''}!`);
    } catch (e) { toast.error('Card generation failed: ' + e.message); } finally { setGeneratingCards(false); }
  }

  // ── Reassign ──
  async function handleReassign() {
    if (!canEdit || !reassignTarget || !reassignModal) return;
    setReassigning(true);
    try {
      const newComm = committees.find(c => c.id === reassignTarget);
      if (!newComm) { toast.error('Committee not found'); return; }
      const oldCommId = reassignModal.registration.committee || null;
      const { error } = await supabase.rpc('reassign_committee', {
        reg_id: reassignModal.registration.id,
        old_comm_id: oldCommId,
        new_comm_id: reassignTarget,
        new_comm_name: newComm.name,
      });
      if (error) throw error;
      setRegistrations(prev => prev.map(r =>
        r.id === reassignModal.registration.id ? { ...r, committee: reassignTarget, committeeName: newComm.name } : r
      ));
      setCommittees(prev => prev.map(c => {
        if (c.id === oldCommId)      return { ...c, filledSeats: Math.max(0, (c.filledSeats || 0) - 1) };
        if (c.id === reassignTarget) return { ...c, filledSeats: (c.filledSeats || 0) + 1 };
        return c;
      }));
      toast.success(`✅ Reassigned to ${newComm.name}`);
      setReassignModal(null); setReassignTarget('');
    } catch (e) { toast.error('Reassignment failed: ' + e.message); } finally { setReassigning(false); }
  }

  function handleDownloadPdf() {
    if (!selectedEvent) return;
    setDownloadingPdf(true);
    const evRegs  = registrations.filter(r => r.eventId === selectedEvent.id);
    const evComms = committees.filter(c => c.eventId === selectedEvent.id);
    try {
      generateEventPDF(selectedEvent, evRegs.filter(r => r.type === 'delegate'), evRegs.filter(r => r.type === 'sponsor'), evComms);
      toast.success('PDF downloaded!');
    } catch { toast.error('PDF generation failed'); } finally { setDownloadingPdf(false); }
  }
  function handleDownloadExcel() {
    if (!selectedEvent) return;
    setDownloadingExcel(true);
    const evRegs  = registrations.filter(r => r.eventId === selectedEvent.id);
    const evComms = committees.filter(c => c.eventId === selectedEvent.id);
    try {
      generateEventExcel(selectedEvent, evRegs.filter(r => r.type === 'delegate'), evRegs.filter(r => r.type === 'sponsor'), evComms);
      toast.success('Excel downloaded!');
    } catch { toast.error('Excel generation failed'); } finally { setDownloadingExcel(false); }
  }

  // ── Committee Row Helpers ──
  function addCommitteeRow() {
    setCommitteeRows(r => [...r, { ...emptyCommittee }]);
  }
  function removeCommitteeRow(i) {
    clearCommitteeLogo(i);
    setCommitteeRows(r => r.filter((_, idx) => idx !== i));
    // Shift logo maps down for rows after the removed one
    setCommitteeLogoFiles(prev => {
      const n = {};
      Object.entries(prev).forEach(([k, v]) => {
        const ki = parseInt(k);
        if (ki < i) n[ki] = v;
        else if (ki > i) n[ki - 1] = v;
      });
      return n;
    });
    setCommitteeLogoPreviews(prev => {
      const n = {};
      Object.entries(prev).forEach(([k, v]) => {
        const ki = parseInt(k);
        if (ki < i) n[ki] = v;
        else if (ki > i) n[ki - 1] = v;
      });
      return n;
    });
  }
  function updateCommitteeRow(i, k, v)  { setCommitteeRows(r => r.map((row, idx) => idx === i ? { ...row, [k]: v } : row)); }
  function addPackage()                  { setPackages(p => [...p, { ...emptyPackage }]); }
  function removePackage(i)              { setPackages(p => p.filter((_, idx) => idx !== i)); }
  function updatePackage(i, k, v)        { setPackages(p => p.map((pkg, idx) => idx === i ? { ...pkg, [k]: v } : pkg)); }

  const BackgroundOverlay = () => (
    <div className="fixed inset-0 z-0">
      <img src={BG_SRC} alt="" className="w-full h-full object-cover grayscale brightness-[0.15]" />
      <div className="absolute inset-0" style={{ background: BG_GRADIENT }} />
    </div>
  );
  const GlowEffects = () => (
    <>
      <div className="fixed -top-32 -left-32 w-[420px] h-[420px] rounded-full blur-3xl opacity-40 pointer-events-none" style={{ background: GLOW_GOLD }} />
      <div className="fixed bottom-0 right-0 w-[420px] h-[420px] rounded-full blur-3xl opacity-30 pointer-events-none" style={{ background: GLOW_RED }} />
    </>
  );

  /* ══════════════════════════════════════════════════════════════
     WIZARD VIEW
  ══════════════════════════════════════════════════════════════ */
  if (view === 'wizard') return (
    <div className="relative min-h-screen overflow-hidden md:pl-[272px]" style={{ backgroundColor: BG_COLOR }}>
      <BackgroundOverlay /><GlowEffects /><Sidebar />
      <div className="relative z-10 px-4 pb-12 pt-20 sm:px-6 md:px-8 md:pt-8">
        <button type="button" onClick={() => setView('list')} className="flex items-center gap-2 text-[#B79143] text-xs uppercase tracking-[0.2em] hover:text-[#D7B46A] transition-colors mb-6 font-bold">← Back to Events</button>
        <div className="mb-8">
          <p className="text-[#B79143] uppercase tracking-[0.3em] text-[11px] mb-3">Admin</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#F8F3EA]">{editingId ? 'Edit Event' : 'Create New Event'}</h1>
        </div>
        <WizardBar current={wizStep} />

        {/* ── Step 0 — Event Details ── */}
        {wizStep === 0 && (
          <div className="rounded-2xl border backdrop-blur-xl p-4 sm:p-6 max-w-3xl" style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
            <h3 className="text-lg font-bold text-[#F8F3EA] mb-6">Step 1 — Event Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-full">
                <label className={labelCls}>Event Name *</label>
                <input className={inputCls} placeholder="RYK MUN Annual Conference 2025" value={details.name} onChange={e => setDetails({ ...details, name: e.target.value })} />
              </div>
              <div><label className={labelCls}>Registration Start Date</label><input className={inputCls} type="date" value={details.registrationStartDate} onChange={e => setDetails({ ...details, registrationStartDate: e.target.value })} /></div>
              <div><label className={labelCls}>Registration Close Date</label><input className={inputCls} type="date" value={details.registrationEndDate} min={details.registrationStartDate || undefined} onChange={e => setDetails({ ...details, registrationEndDate: e.target.value })} /></div>
              <div><label className={labelCls}>Event Start Date *</label><input className={inputCls} type="date" value={details.startDate} onChange={e => setDetails({ ...details, startDate: e.target.value })} /></div>
              <div>
                <label className={labelCls}>Event End Date <span className="font-normal normal-case tracking-normal text-[#b89b84]">(blank = single-day)</span></label>
                <input className={inputCls} type="date" value={details.endDate} min={details.startDate} onChange={e => setDetails({ ...details, endDate: e.target.value })} />
              </div>
              <div><label className={labelCls}>Card Allotment Date</label><input className={inputCls} type="date" value={details.cardAllotmentDate} onChange={e => setDetails({ ...details, cardAllotmentDate: e.target.value })} /></div>

              {/* Venue block */}
              <div className="col-span-full mt-4">
                <div className="rounded-xl border p-4 space-y-4" style={{ borderColor: BORDER_GOLD, backgroundColor: CARD_BG }}>
                  <h4 className="text-sm font-bold text-[#B79143] uppercase tracking-wider">📍 Venue Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className={labelCls}>Venue Name</label><input className={inputCls} placeholder="e.g. Marriott Hotel" value={details.venue} onChange={e => setDetails({ ...details, venue: e.target.value })} /></div>
                    <div><label className={labelCls}>Venue Location / Address</label><input className={inputCls} placeholder="e.g. Karachi, Pakistan" value={details.venueLocation} onChange={e => setDetails({ ...details, venueLocation: e.target.value })} /></div>
                    <div className="col-span-full"><label className={labelCls}>Venue Introduction</label><textarea className={inputCls + ' resize-y'} rows={3} placeholder="Brief description of the venue…" value={details.venueIntro} onChange={e => setDetails({ ...details, venueIntro: e.target.value })} /></div>
                    <div className="col-span-full">
                      <label className={labelCls}>Venue Logo <span className="font-normal normal-case tracking-normal text-[#b89b84]">(optional)</span></label>
                      <input type="file" ref={venueLogoRef} accept="image/*" onChange={handleVenueLogoSelect} className="hidden" />
                      {venueLogoPreview ? (
                        <div className="flex items-center gap-4">
                          <img src={venueLogoPreview} alt="Venue logo" className="w-24 h-24 object-contain rounded-xl border bg-black/20" style={{ borderColor: BORDER_GOLD_STRONG }} />
                          <div className="flex flex-col gap-2">
                            <button type="button" className="rounded-lg border px-3 py-1.5 text-xs text-[#B79143] hover:bg-[#B79143]/10 transition" style={{ borderColor: BORDER_GOLD_MEDIUM }} onClick={() => venueLogoRef.current?.click()}>🔄 Change</button>
                            <button type="button" className="rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/25 transition" onClick={clearVenueLogo}>✕ Remove</button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all hover:border-[#B79143]/50 hover:bg-[rgba(183,145,67,0.04)]" style={{ borderColor: BORDER_GOLD_MEDIUM, backgroundColor: 'rgba(0,0,0,0.2)' }} onClick={() => venueLogoRef.current?.click()}>
                          <div className="text-2xl mb-1">🏛️</div>
                          <div className="text-sm font-semibold text-[#B79143]">Upload Venue Logo</div>
                          <div className="text-xs text-[#b89b84] mt-0.5">JPG, PNG, WebP, SVG — crop available</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className={labelCls}>Status</label>
                <select className={inputCls + ' appearance-none'} value={details.status} onChange={e => setDetails({ ...details, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div><label className={labelCls}>Delegate Entry Fee</label><input className={inputCls} type="number" placeholder="e.g. 5000" value={details.entryFees} onChange={e => setDetails({ ...details, entryFees: e.target.value })} /></div>
              <div>
                <label className={labelCls}>Currency</label>
                <select className={inputCls + ' appearance-none'} value={details.currency} onChange={e => setDetails({ ...details, currency: e.target.value })}>
                  <option value="PKR">PKR — Pakistani Rupee</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                </select>
              </div>
              <div className="col-span-full"><label className={labelCls}>Description</label><textarea className={inputCls + ' resize-y'} rows={4} placeholder="Event overview, theme…" value={details.description} onChange={e => setDetails({ ...details, description: e.target.value })} /></div>

              {/* Event Banner */}
              <div className="col-span-full">
                <label className={labelCls}>Event Banner <span className="font-normal normal-case tracking-normal text-[#b89b84]">(optional)</span></label>
                <input type="file" ref={imageRef} accept="image/*" onChange={handleImageSelect} className="hidden" />
                {imagePreview ? (
                  <div>
                    <img src={imagePreview} alt="Banner preview" className="w-full max-h-[220px] object-cover rounded-xl border" style={{ borderColor: BORDER_GOLD_STRONG }} />
                    <div className="flex gap-2 mt-3">
                      <button type="button" className="rounded-lg border px-3 py-1.5 text-xs text-[#B79143] hover:bg-[#B79143]/10 transition" style={{ borderColor: BORDER_GOLD_MEDIUM }} onClick={() => imageRef.current?.click()}>🔄 Change</button>
                      <button type="button" className="rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/25 transition" onClick={clearImage}>✕ Remove</button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all hover:border-[#B79143]/50 hover:bg-[rgba(183,145,67,0.04)]" style={{ borderColor: BORDER_GOLD_MEDIUM, backgroundColor: 'rgba(0,0,0,0.2)' }} onClick={() => imageRef.current?.click()}>
                    <div className="text-3xl mb-2">🖼️</div>
                    <div className="text-sm font-semibold text-[#B79143]">Click to upload event banner</div>
                    <div className="text-xs text-[#b89b84] mt-1">JPG, PNG, WebP — crop & zoom available</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 1 — Committees ── */}
        {wizStep === 1 && (
          <div className="rounded-2xl border backdrop-blur-xl p-4 sm:p-6 max-w-3xl" style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
            <h3 className="text-lg font-bold text-[#F8F3EA] mb-6">Step 2 — Committees & Seat Allocation</h3>
            <div className="rounded-xl border border-blue-400/30 bg-blue-500/10 p-4 text-sm text-blue-100 mb-6">
              💡 Set seat limit to <strong>0</strong> for unlimited seats.
            </div>
            <div className="space-y-4">
              {committeeRows.map((c, i) => (
                <div key={i} className="rounded-xl border p-4 space-y-3" style={{ borderColor: BORDER_GOLD, backgroundColor: CARD_BG }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#B79143] uppercase tracking-wider">Committee {i + 1}</span>
                    {committeeRows.length > 1 && (
                      <button type="button" className="rounded-lg border border-red-400/40 bg-red-500/15 px-2.5 py-1 text-xs text-red-300 hover:bg-red-500/25 transition" onClick={() => removeCommitteeRow(i)}>✕</button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="col-span-full">
                      <label className={labelCls}>Full Committee Name *</label>
                      <input className={inputCls} placeholder="e.g. United Nations Security Council" value={c.name} onChange={e => updateCommitteeRow(i, 'name', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>Abbreviation</label>
                      <input className={inputCls} placeholder="e.g. UNSC" value={c.abbr} onChange={e => updateCommitteeRow(i, 'abbr', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>Seats (0=∞)</label>
                      <input className={inputCls} type="number" min="0" placeholder="30" value={c.seats} onChange={e => updateCommitteeRow(i, 'seats', e.target.value)} />
                    </div>
                    <div className="col-span-full">
                      <label className={labelCls}>Topic / Agenda</label>
                      <input className={inputCls} placeholder="e.g. Addressing the Use of Autonomous Weapons" value={c.topic} onChange={e => updateCommitteeRow(i, 'topic', e.target.value)} />
                    </div>
                    <div className="col-span-full">
                      <label className={labelCls}>Description <span className="font-normal normal-case tracking-normal text-[#b89b84]">(optional)</span></label>
                      <textarea className={inputCls + ' resize-y'} rows={2} placeholder="Optional internal notes or public description" value={c.description} onChange={e => updateCommitteeRow(i, 'description', e.target.value)} />
                    </div>

                    {/* ── Committee Logo Upload ── */}
                    <div className="col-span-full">
                      <label className={labelCls}>
                        Committee Logo <span className="font-normal normal-case tracking-normal text-[#b89b84]">(optional, shown on public page)</span>
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        ref={el => (committeeLogoRefs.current[i] = el)}
                        onChange={e => handleCommitteeLogoSelect(e, i)}
                        className="hidden"
                      />
                      {committeeLogoPreviews[i] ? (
                        <div className="flex items-center gap-4">
                          <img
                            src={committeeLogoPreviews[i]}
                            alt="Committee logo preview"
                            className="w-16 h-16 object-contain rounded-xl border bg-black/20"
                            style={{ borderColor: BORDER_GOLD_STRONG }}
                          />
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              className="rounded-lg border px-3 py-1.5 text-xs text-[#B79143] hover:bg-[#B79143]/10 transition"
                              style={{ borderColor: BORDER_GOLD_MEDIUM }}
                              onClick={() => committeeLogoRefs.current[i]?.click()}
                            >
                              🔄 Change
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/25 transition"
                              onClick={() => clearCommitteeLogo(i)}
                            >
                              ✕ Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all hover:border-[#B79143]/50 hover:bg-[rgba(183,145,67,0.04)]"
                          style={{ borderColor: BORDER_GOLD_MEDIUM, backgroundColor: 'rgba(0,0,0,0.2)' }}
                          onClick={() => committeeLogoRefs.current[i]?.click()}
                        >
                          <div className="text-xl mb-1">🏛️</div>
                          <div className="text-xs font-semibold text-[#B79143]">Upload Committee Logo</div>
                          <div className="text-[10px] text-[#b89b84] mt-0.5">JPG, PNG, WebP, SVG — max 2 MB</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {(() => {
              const t = committeeRows.reduce((s, c) => s + (parseInt(c.seats) || 0), 0);
              return t > 0 ? (
                <div className="mt-4 rounded-xl border p-4 text-sm" style={{ borderColor: BORDER_GOLD, backgroundColor: 'rgba(183,145,67,0.08)' }}>
                  📊 Total event capacity: <strong className="text-[#D7B46A]">{t} seats</strong>
                </div>
              ) : null;
            })()}

            <button
              type="button"
              className="mt-4 rounded-xl border px-4 py-2.5 text-sm font-semibold text-[#B79143] hover:bg-[rgba(183,145,67,0.08)] transition w-full sm:w-auto"
              style={{ borderColor: BORDER_GOLD_MEDIUM }}
              onClick={addCommitteeRow}
            >
              + Add Committee
            </button>
          </div>
        )}

        {/* ── Step 2 — Sponsor Packages ── */}
        {wizStep === 2 && (
          <div className="rounded-2xl border backdrop-blur-xl p-4 sm:p-6 max-w-3xl" style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
            <h3 className="text-lg font-bold text-[#F8F3EA] mb-6">Step 3 — Sponsor Packages</h3>
            <div className="space-y-4">
              {packages.map((pkg, i) => (
                <div key={i} className="rounded-xl border p-4 space-y-3" style={{ borderColor: BORDER_GOLD, backgroundColor: CARD_BG }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#B79143] uppercase tracking-wider">Package {i + 1}</span>
                    {packages.length > 1 && (
                      <button type="button" className="rounded-lg border border-red-400/40 bg-red-500/15 px-2.5 py-1 text-xs text-red-300 hover:bg-red-500/25 transition" onClick={() => removePackage(i)}>✕</button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className={labelCls}>Package Name</label><input className={inputCls} placeholder="e.g. Gold" value={pkg.name} onChange={e => updatePackage(i, 'name', e.target.value)} /></div>
                    <div><label className={labelCls}>Amount ({details.currency || 'PKR'})</label><input className={inputCls} type="number" placeholder="e.g. 50000" value={pkg.amount} onChange={e => updatePackage(i, 'amount', e.target.value)} /></div>
                    <div className="col-span-full"><label className={labelCls}>Benefits</label><textarea className={inputCls + ' resize-y'} rows={2} placeholder="e.g. Logo on banner, 2 VIP seats…" value={pkg.details} onChange={e => updatePackage(i, 'details', e.target.value)} /></div>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="mt-4 rounded-xl border px-4 py-2.5 text-sm font-semibold text-[#B79143] hover:bg-[rgba(183,145,67,0.08)] transition w-full sm:w-auto"
              style={{ borderColor: BORDER_GOLD_MEDIUM }}
              onClick={addPackage}
            >
              + Add Package
            </button>
          </div>
        )}

        {/* ── Step 3 — Payment Methods ── */}
        {wizStep === 3 && (
          <div className="rounded-2xl border backdrop-blur-xl p-4 sm:p-6 max-w-3xl" style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
            <h3 className="text-lg font-bold text-[#F8F3EA] mb-6">Step 4 — Payment Methods</h3>
            <div className="space-y-4">
              {[
                { icon: '🏦', label: 'Bank Transfer', nameKey: 'bankName',      numKey: 'bankAccount', namePh: 'Bank name',       numPh: 'Account number' },
                { icon: '💛', label: 'JazzCash',      nameKey: 'jazzCashName',  numKey: 'jazzCash',    namePh: 'Account holder', numPh: '0300-1234567' },
                { icon: '💚', label: 'EasyPaisa',     nameKey: 'easyPaisaName', numKey: 'easyPaisa',   namePh: 'Account holder', numPh: '0311-1234567' },
              ].map(m => (
                <div key={m.label} className="rounded-xl border p-4 space-y-3" style={{ borderColor: BORDER_GOLD, backgroundColor: CARD_BG }}>
                  <h4 className="font-bold text-[#F8F3EA] text-sm">{m.icon} {m.label}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className={labelCls}>Account Name</label><input className={inputCls} placeholder={m.namePh} value={wizPayments[m.nameKey]} onChange={e => setWizPayments({ ...wizPayments, [m.nameKey]: e.target.value })} /></div>
                    <div><label className={labelCls}>Account Number</label><input className={inputCls} placeholder={m.numPh} value={wizPayments[m.numKey]} onChange={e => setWizPayments({ ...wizPayments, [m.numKey]: e.target.value })} /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wizard Nav Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          {wizStep > 0 && (
            <button type="button" className="rounded-xl border px-5 py-3 text-sm font-semibold text-[#B79143] transition hover:bg-[#B79143]/10" style={{ borderColor: BORDER_GOLD_MEDIUM }} onClick={() => setWizStep(s => s - 1)}>← Previous</button>
          )}
          <button
            type="button"
            className="rounded-xl bg-gradient-to-r from-[#8E6B2F] via-[#B79143] to-[#D7B46A] px-5 py-3 text-sm font-semibold text-[#2A0B12] transition hover:scale-[1.02] disabled:opacity-50"
            onClick={nextStep}
            disabled={saving}
          >
            {wizStep < 3 ? 'Continue →' : saving ? 'Saving…' : editingId ? 'Update Event ✓' : 'Create Event ✓'}
          </button>
          <button type="button" className="rounded-xl border px-5 py-3 text-sm font-semibold text-[#B79143] transition hover:bg-[#B79143]/10 sm:ml-auto" style={{ borderColor: BORDER_GOLD_MEDIUM }} onClick={() => setView('list')}>Cancel</button>
        </div>
      </div>

      {cropModal && cropFile && (
        <ImageCropModal file={cropFile} onCrop={handleCropComplete} onClose={() => { setCropModal(null); setCropFile(null); }} />
      )}
    </div>
  );

  /* ══════════════════════════════════════════════════════════════
     DETAIL VIEW
  ══════════════════════════════════════════════════════════════ */
  if (view === 'detail' && selectedEvent) {
    const ev = selectedEvent;
    const evComms     = committees.filter(c => c.eventId === ev.id);
    const evRegs      = registrations.filter(r => r.eventId === ev.id);
    const evDelegates = evRegs.filter(r => r.type === 'delegate');
    const evSponsors  = evRegs.filter(r => r.type === 'sponsor');
    const approvedCount = evRegs.filter(r => r.paymentStatus === 'approved').length;
    const filtDels    = evDelegates.filter(d => filterCommittee === 'all' || d.committee === filterCommittee);
    const filtSpons   = evSponsors.filter(s => filterSponsorLvl === 'all' || s.category === filterSponsorLvl);
    const detailTotalSeats  = evComms.reduce((s, c) => s + (getCommSeats(c) || 0), 0);
    const detailTotalFilled = evComms.reduce((s, c) => s + (c.filledSeats || 0), 0);
    const detailSeatPct     = detailTotalSeats > 0 ? Math.min(100, Math.round((detailTotalFilled / detailTotalSeats) * 100)) : 0;
    const isFull       = detailTotalSeats > 0 && detailTotalFilled >= detailTotalSeats;
    const isOverbooked = detailTotalSeats > 0 && detailTotalFilled > detailTotalSeats;

    const overbookedDelegateIds = new Set();
    evComms.forEach(c => {
      const totalSeats = getCommSeats(c);
      if (!totalSeats || totalSeats === 0) return;
      const commDels = evDelegates.filter(d => d.committee === c.id).slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      commDels.forEach((d, i) => { if (i >= totalSeats) overbookedDelegateIds.add(d.id); });
    });
    const overbookedCount = overbookedDelegateIds.size;

    const tabs = [
      { key: 'info',       label: 'Event Info' },
      { key: 'venue',      label: 'Venue' },
      { key: 'delegates',  label: `Delegates (${evDelegates.length})` },
      { key: 'sponsors',   label: `Sponsors (${evSponsors.length})` },
      { key: 'committees', label: `Committees (${evComms.length})` },
      { key: 'packages',   label: 'Packages' },
      { key: 'payments',   label: 'Payment Methods' },
    ];

    return (
      <div className="relative min-h-screen overflow-hidden md:pl-[272px]" style={{ backgroundColor: BG_COLOR }}>
        <BackgroundOverlay /><GlowEffects /><Sidebar />
        <div className="relative z-10 px-4 pb-12 pt-20 sm:px-6 md:px-8 md:pt-8">
          <button type="button" onClick={() => setView('list')} className="flex items-center gap-2 text-[#B79143] text-xs uppercase tracking-[0.2em] hover:text-[#D7B46A] transition-colors mb-6 font-bold">← Back to Events</button>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <p className="text-[#B79143] uppercase tracking-[0.3em] text-[11px] mb-3">Event Details</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#F8F3EA]">{ev.name}</h1>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className={statusBadge(ev.status || 'active')}>{ev.status || 'active'}</span>
                <span className="text-sm text-[#b89b84]">📅 {eventDateRange(ev)}</span>
                {ev.venue && <span className="text-sm text-[#b89b84]">📍 {ev.venue}</span>}
                {ev.cardAllotmentDate && <span className="text-sm text-[#D7B46A]">🎫 Cards: {ev.cardAllotmentDate}</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {canEdit && (
                <button
                  className="rounded-xl bg-gradient-to-r from-[#8E6B2F] via-[#B79143] to-[#D7B46A] px-4 py-2.5 text-xs font-semibold text-[#2A0B12] transition hover:scale-[1.02] disabled:opacity-50"
                  onClick={handleGenerateCards}
                  disabled={generatingCards || approvedCount === 0}
                >
                  {generatingCards ? '⏳…' : `🎫 Cards (${approvedCount})`}
                </button>
              )}
              <button className="rounded-xl border px-4 py-2.5 text-xs font-semibold text-[#B79143] transition hover:bg-[#B79143]/10 disabled:opacity-50" style={{ borderColor: BORDER_GOLD_MEDIUM }} onClick={handleDownloadPdf} disabled={downloadingPdf}>{downloadingPdf ? '⏳…' : '📄 PDF'}</button>
              <button className="rounded-xl border px-4 py-2.5 text-xs font-semibold text-[#B79143] transition hover:bg-[#B79143]/10 disabled:opacity-50" style={{ borderColor: BORDER_GOLD_MEDIUM }} onClick={handleDownloadExcel} disabled={downloadingExcel}>{downloadingExcel ? '⏳…' : '📊 Excel'}</button>
              {canEdit && (
                <>
                  <button className="rounded-xl border px-4 py-2.5 text-xs font-semibold text-[#B79143] transition hover:bg-[#B79143]/10" style={{ borderColor: BORDER_GOLD_MEDIUM }} onClick={() => openEdit(ev)}>✏️ Edit</button>
                  <button className="rounded-lg border border-red-400/40 bg-red-500/15 px-4 py-2.5 text-xs font-semibold text-red-300 hover:bg-red-500/25 transition" onClick={e => handleDelete(ev.id, e)}>Delete</button>
                </>
              )}
            </div>
          </div>

          {/* Capacity Bar */}
          {detailTotalSeats > 0 && (
            <div className="rounded-xl border p-4 mb-6" style={{ borderColor: isOverbooked ? 'rgba(251,146,60,0.4)' : BORDER_GOLD, backgroundColor: isOverbooked ? 'rgba(120,53,15,0.25)' : CARD_BG }}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-[#B79143] font-bold">🎯 Event Capacity (Live)</span>
                  {isOverbooked && <span className="inline-block rounded-lg px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] font-bold bg-orange-500/20 text-orange-300 border border-orange-400/40">⚠️ Overbooked</span>}
                </div>
                <span className={`text-sm font-bold ${isOverbooked ? 'text-orange-400' : isFull ? 'text-red-400' : 'text-[#D7B46A]'}`}>
                  {detailTotalFilled} / {detailTotalSeats} · {detailSeatPct}%
                  {isOverbooked && <span className="ml-1 text-orange-400">(+{detailTotalFilled - detailTotalSeats} over)</span>}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-[rgba(183,145,67,0.1)] overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${isOverbooked ? 'bg-orange-400/80' : isFull ? 'bg-red-400/80' : 'bg-gradient-to-r from-[#8E6B2F] via-[#B79143] to-[#D7B46A]'}`} style={{ width: `${Math.min(100, detailSeatPct)}%` }} />
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6">
            {[
              { label: 'Registered', value: evRegs.length,      icon: '👥' },
              { label: 'Delegates',  value: evDelegates.length,  icon: '🧑‍💼' },
              { label: 'Sponsors',   value: evSponsors.length,   icon: '🏢' },
              { label: 'Committees', value: evComms.length,      icon: '⭐' },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl border backdrop-blur-xl p-4 sm:p-5 transition-all duration-300 hover:scale-[1.02]" style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
                <div className="text-xl sm:text-2xl mb-2">{s.icon}</div>
                <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.25em] text-[#B79143] font-bold mb-2">{s.label}</div>
                <div className="text-3xl sm:text-4xl font-bold text-[#F8F3EA]">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="mb-6 flex gap-0 overflow-x-auto border-b pb-px" style={{ borderColor: 'rgba(183,145,67,0.25)' }}>
            {tabs.map(t => (
              <button key={t.key} type="button" onClick={() => setDetailTab(t.key)}
                className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide transition sm:px-5 sm:text-sm ${detailTab === t.key ? 'border-[#B79143] text-[#B79143]' : 'border-transparent text-[#b89b84] hover:text-[#F8F3EA]'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="rounded-2xl border backdrop-blur-xl p-4 sm:p-6" style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>

            {/* ── Info Tab ── */}
            {detailTab === 'info' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-xl border p-4 sm:p-5" style={{ borderColor: BORDER_GOLD, backgroundColor: CARD_BG }}>
                  <h3 className="text-lg font-bold text-[#F8F3EA] mb-4">Event Details</h3>
                  <div className="space-y-0">
                    {[
                      ['Name', ev.name],
                      ['Registration Opens', ev.registrationStartDate || '—'],
                      ['Registration Closes', ev.registrationEndDate || '—'],
                      ['Event Start', ev.startDate || ev.date],
                      ['Event End', ev.endDate || '—'],
                      ['Card Allotment Date', ev.cardAllotmentDate || '—'],
                      ['Venue', ev.venue || '—'],
                      ['Status', ev.status || 'active'],
                      ['Entry Fees', ev.entryFees ? `${ev.currency || 'PKR'} ${Number(ev.entryFees).toLocaleString()}` : 'Not set'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between items-start py-3 px-1 gap-3 border-b last:border-b-0" style={{ borderColor: BORDER_GOLD_LIGHT }}>
                        <span className="text-[10px] uppercase tracking-wider text-[#B79143] font-bold shrink-0 mt-0.5">{k}</span>
                        <span className="text-sm font-medium text-[#F8F3EA] text-right">{v || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border p-4 sm:p-5" style={{ borderColor: BORDER_GOLD, backgroundColor: CARD_BG }}>
                  <h3 className="text-lg font-bold text-[#F8F3EA] mb-4">Quick Stats</h3>
                  <div className="space-y-0">
                    {[
                      ['Approved Delegates', evDelegates.filter(d => d.paymentStatus === 'approved').length],
                      ['Pending Delegates',  evDelegates.filter(d => d.paymentStatus === 'pending').length],
                      ['Approved Sponsors',  evSponsors.filter(s => s.paymentStatus === 'approved').length],
                      ['Total Seats',        detailTotalSeats || '∞'],
                      ['Seats Filled',       detailTotalFilled],
                      ['Available',          detailTotalSeats > 0 ? Math.max(0, detailTotalSeats - detailTotalFilled) : '∞'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between items-start py-3 px-1 gap-3 border-b last:border-b-0" style={{ borderColor: BORDER_GOLD_LIGHT }}>
                        <span className="text-[10px] uppercase tracking-wider text-[#B79143] font-bold shrink-0 mt-0.5">{k}</span>
                        <span className="text-sm font-medium text-[#F8F3EA] text-right">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-xl border border-blue-400/30 bg-blue-500/10 p-3 text-xs text-blue-100">
                    💡 Seats reserved immediately on booking. Restored only on rejection.
                  </div>
                </div>
                {ev.description && (
                  <div className="lg:col-span-2">
                    <h4 className="text-xs uppercase tracking-wider text-[#B79143] font-bold mb-2">Description</h4>
                    <p className="text-sm text-[#b89b84] leading-relaxed">{ev.description}</p>
                  </div>
                )}
                {ev.imageUrl && (
                  <div className="lg:col-span-2">
                    <h4 className="text-xs uppercase tracking-wider text-[#B79143] font-bold mb-2">Banner</h4>
                    <img src={ev.imageUrl} alt="Banner" className="w-full max-h-[200px] object-cover rounded-xl border" style={{ borderColor: BORDER_GOLD_STRONG }} />
                  </div>
                )}
              </div>
            )}

            {/* ── Venue Tab ── */}
            {detailTab === 'venue' && (
              <div className="max-w-2xl space-y-6">
                <div className="rounded-xl border p-6" style={{ borderColor: BORDER_GOLD, backgroundColor: CARD_BG }}>
                  <div className="flex items-start gap-5 mb-6">
                    {ev.venueLogoUrl
                      ? <img src={ev.venueLogoUrl} alt="Venue logo" className="w-20 h-20 rounded-xl object-contain border shrink-0 bg-black/20" style={{ borderColor: BORDER_GOLD_STRONG }} />
                      : <div className="w-20 h-20 rounded-xl border flex items-center justify-center text-3xl shrink-0" style={{ borderColor: BORDER_GOLD_MEDIUM, backgroundColor: 'rgba(183,145,67,0.08)' }}>🏛️</div>
                    }
                    <div>
                      <h3 className="text-xl font-bold text-[#F8F3EA]">{ev.venue || 'Venue Name Not Set'}</h3>
                      {ev.venueLocation && <p className="text-sm text-[#B79143] mt-1">📍 {ev.venueLocation}</p>}
                    </div>
                  </div>
                  {ev.venueIntro
                    ? <div><h4 className="text-xs uppercase tracking-wider text-[#B79143] font-bold mb-2">About the Venue</h4><p className="text-sm text-[#b89b84] leading-relaxed">{ev.venueIntro}</p></div>
                    : <p className="text-sm text-[#b89b84] italic">No venue description added.</p>
                  }
                </div>
                <div className="rounded-xl border p-4 text-sm" style={{ borderColor: BORDER_GOLD, backgroundColor: 'rgba(183,145,67,0.06)' }}>
                  <p className="text-[#b89b84]">
                    {canEdit
                      ? <>To update venue details, click <strong className="text-[#B79143]">✏️ Edit</strong> and update the Venue Details section in Step 1.</>
                      : 'Only Super Admins can update venue details.'}
                  </p>
                </div>
              </div>
            )}

            {/* ── Delegates Tab ── */}
            {detailTab === 'delegates' && (() => {
              let displayDels;
              if (filterCommittee === 'overbooked') {
                displayDels = evDelegates.filter(d => overbookedDelegateIds.has(d.id)).slice().sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
              } else {
                displayDels = filtDels;
              }
              return (
                <div>
                  <div className="flex flex-col sm:flex-row gap-3 mb-4 items-start sm:items-center justify-between">
                    <select className={inputCls + ' sm:max-w-[280px] appearance-none'} value={filterCommittee} onChange={e => setFilterCommittee(e.target.value)}>
                      <option value="all">All Committees</option>
                      {overbookedCount > 0 && <option value="overbooked">⚠️ Overbooked ({overbookedCount})</option>}
                      {evComms.map(c => <option key={c.id} value={c.id}>{c.abbr ? `${c.abbr} — ` : ''}{c.name} ({c.filledSeats || 0}/{getCommSeats(c) || '∞'})</option>)}
                    </select>
                    <span className="text-xs text-[#b89b84]">🕐 Sorted by booking time — first come, first served</span>
                  </div>
                  {filterCommittee === 'overbooked' && overbookedCount > 0 && (
                    <div className="mb-4 rounded-xl border border-orange-400/30 bg-orange-500/10 p-3 text-xs text-orange-200">
                      ⚠️ <strong>{overbookedCount} delegate{overbookedCount !== 1 ? 's' : ''}</strong> registered after their committee's seat limit was reached.
                    </div>
                  )}
                  {displayDels.length === 0
                    ? <p className="text-[#b89b84] text-sm py-8 text-center">No delegates found.</p>
                    : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b" style={{ borderColor: 'rgba(183,145,67,0.12)' }}>
                              {['#', 'Delegate', 'Phone', 'Committee', 'Personality', 'Payment', 'Booked At', canEdit ? 'Actions' : ''].filter(Boolean).map(h => (
                                <th key={h} className="pb-4 text-[#B79143] uppercase tracking-[0.2em] text-[11px] font-bold pr-4 text-center">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {displayDels.map((d, idx) => {
                              const isDelegateOverbooked = overbookedDelegateIds.has(d.id);
                              const commObj = evComms.find(c => c.id === d.committee);
                              const isEditingCountry = editingCountryPersonality === d.id;
                              return (
                                <tr key={d.id} className={`border-b transition ${isDelegateOverbooked ? 'bg-orange-500/5 hover:bg-orange-500/10' : 'hover:bg-[rgba(183,145,67,0.04)]'}`} style={{ borderColor: BORDER_GOLD_LIGHT }}>
                                  <td className="py-4 pr-4 text-[#9A7B28] font-bold text-center w-10">{idx + 1}</td>
                                  <td className="py-4 pr-4 text-center">
                                    <div className="font-bold text-[#F8F3EA] text-sm">{d.fullName || '—'}</div>
                                    <div className="text-xs text-[#b89b84]">{d.email || ''}</div>
                                  </td>
                                  <td className="py-4 pr-4 text-[#b89b84] text-sm text-center">{d.phone || '—'}</td>
                                  <td className="py-4 pr-4 text-center">
                                    <div className="font-bold text-[#D7B46A] text-sm">{commObj?.abbr || resolveCommitteeName(d)}</div>
                                    {isDelegateOverbooked && <span className="inline-block mt-1 rounded-md px-1.5 py-0.5 text-[9px] uppercase tracking-[0.15em] font-bold bg-orange-500/20 text-orange-300 border border-orange-400/40">⚠️ Overbooked</span>}
                                  </td>
                                  <td className="py-4 pr-4 text-center">
                                    {canEdit && isEditingCountry ? (
                                      <div className="flex items-center justify-center gap-2">
                                        <input
                                          className={inputCls + ' !py-2 !text-xs min-w-[140px] text-center'}
                                          value={countryPersonalityValue}
                                          onChange={e => setCountryPersonalityValue(e.target.value)}
                                          onKeyDown={e => {
                                            if (e.key === 'Enter') handleUpdateCountryPersonality(d.id, countryPersonalityValue);
                                            else if (e.key === 'Escape') setEditingCountryPersonality(null);
                                          }}
                                          autoFocus
                                          placeholder="Enter country/personality"
                                        />
                                        <button className="text-emerald-400 hover:text-emerald-300 transition" onClick={() => handleUpdateCountryPersonality(d.id, countryPersonalityValue)} title="Save">✓</button>
                                        <button className="text-red-400 hover:text-red-300 transition" onClick={() => setEditingCountryPersonality(null)} title="Cancel">✕</button>
                                      </div>
                                    ) : (
                                      <div
                                        className={`group flex items-center justify-center gap-2 min-w-[140px] ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
                                        onClick={() => { if (!canEdit) return; setEditingCountryPersonality(d.id); setCountryPersonalityValue(d.countryPersonality || ''); }}
                                      >
                                        <span className="text-sm text-[#F8F3EA]">
                                          {d.countryPersonality || <span className="text-[#b89b84] italic">{canEdit ? 'Click to add' : '—'}</span>}
                                        </span>
                                        {canEdit && <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[#B79143] text-xs">✏️</span>}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-4 pr-4 text-center"><span className={statusBadge(d.paymentStatus || 'pending')}>{d.paymentStatus || 'pending'}</span></td>
                                  <td className="py-4 pr-4 text-center">
                                    <div className="text-xs text-[#b89b84]">{d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</div>
                                    <div className="text-xs text-[#b89b84] mt-0.5">{d.createdAt ? new Date(d.createdAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}</div>
                                  </td>
                                  {canEdit && (
                                    <td className="py-4 text-center">
                                      <button
                                        className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 transition"
                                        onClick={() => { setReassignModal({ registration: d }); setReassignTarget(''); }}
                                      >
                                        🔄 Reassign
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )
                  }
                </div>
              );
            })()}

            {/* ── Sponsors Tab ── */}
            {detailTab === 'sponsors' && (
              <div>
                <div className="flex flex-col sm:flex-row gap-3 mb-4 items-start sm:items-center justify-between">
                  <select className={inputCls + ' sm:max-w-[240px] appearance-none'} value={filterSponsorLvl} onChange={e => setFilterSponsorLvl(e.target.value)}>
                    <option value="all">All Sponsor Levels</option>
                    {(ev.sponsorPackages || []).map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                  </select>
                  <span className="text-xs text-[#b89b84]">🕐 Sorted by registration time</span>
                </div>
                {filtSpons.length === 0
                  ? <p className="text-[#b89b84] text-sm py-8 text-center">No sponsors found.</p>
                  : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b" style={{ borderColor: 'rgba(183,145,67,0.12)' }}>
                            {['#', 'Company', 'Email', 'Phone', 'Package', 'Payment', 'Registered At'].map(h => (
                              <th key={h} className="pb-4 text-[#B79143] uppercase tracking-[0.2em] text-[11px] font-bold pr-4 text-center">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filtSpons.map((s, idx) => (
                            <tr key={s.id} className="border-b hover:bg-[rgba(183,145,67,0.04)] transition" style={{ borderColor: BORDER_GOLD_LIGHT }}>
                              <td className="py-4 pr-4 text-[#9A7B28] font-bold text-center w-10">{idx + 1}</td>
                              <td className="py-4 pr-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-9 h-9 rounded-full border flex items-center justify-center text-[#B79143] font-bold text-xs shrink-0" style={{ borderColor: BORDER_GOLD_MEDIUM, backgroundColor: 'rgba(183,145,67,0.1)' }}>{getInitials(s.companyName || s.fullName)}</div>
                                  <div>
                                    <div className="font-bold text-[#F8F3EA] text-sm">{s.companyName || s.fullName || '—'}</div>
                                    {s.contactPerson && <div className="text-xs text-[#b89b84]">{s.contactPerson}</div>}
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 pr-4 text-[#b89b84] text-sm text-center">{s.email || '—'}</td>
                              <td className="py-4 pr-4 text-[#b89b84] text-sm text-center">{s.phone || '—'}</td>
                              <td className="py-4 pr-4 text-center">
                                <span className="inline-block rounded-lg border px-3 py-1.5 text-xs uppercase tracking-[0.15em] text-[#B79143] font-bold" style={{ borderColor: 'rgba(183,145,67,0.25)', backgroundColor: 'rgba(183,145,67,0.08)' }}>{s.category || s.committeeName || '—'}</span>
                              </td>
                              <td className="py-4 pr-4 text-center"><span className={statusBadge(s.paymentStatus || 'pending')}>{s.paymentStatus || 'pending'}</span></td>
                              <td className="py-4 pr-4 text-center">
                                <div className="text-xs text-[#b89b84]">{s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</div>
                                <div className="text-xs text-[#b89b84] mt-0.5">{s.createdAt ? new Date(s.createdAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                }
              </div>
            )}

            {/* ── Committees Tab ── */}
            {detailTab === 'committees' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {evComms.length === 0
                  ? <p className="text-[#b89b84] text-sm py-8 text-center col-span-full">No committees added.</p>
                  : evComms.map(c => {
                    const filled     = c.filledSeats || 0;
                    const total      = getCommSeats(c);
                    const pct        = total > 0 ? Math.min(100, Math.round((filled / total) * 100)) : 0;
                    const full       = total > 0 && filled >= total;
                    const overbooked = total > 0 && filled > total;
                    return (
                      <div
                        key={c.id}
                        className={`rounded-xl border p-4 transition-all ${overbooked ? 'border-orange-400/30 bg-[rgba(120,53,15,0.2)]' : ''}`}
                        style={!overbooked ? { borderColor: BORDER_GOLD, backgroundColor: CARD_BG } : {}}
                      >
                        {/* Header: logo + abbr */}
                        <div className="flex items-center gap-2 pb-3 mb-3" style={{ borderBottom: '2px solid #B79143' }}>
                          {c.logoUrl ? (
                            <img
                              src={c.logoUrl}
                              alt={`${c.name} logo`}
                              className="w-8 h-8 rounded-lg object-contain shrink-0 border"
                              style={{ background: 'rgba(183,145,67,0.1)', borderColor: 'rgba(183,145,67,0.3)' }}
                            />
                          ) : (
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 border"
                              style={{ color: '#B79143', background: 'rgba(183,145,67,0.1)', borderColor: 'rgba(183,145,67,0.3)' }}
                            >
                              {(c.abbr || c.name)?.slice(0, 2)?.toUpperCase()}
                            </div>
                          )}
                          <div className="flex items-start justify-between flex-1 min-w-0">
                            <div>
                              {c.abbr && <div className="text-xs font-bold text-[#B79143] uppercase tracking-wider">{c.abbr}</div>}
                            </div>
                            <div className="flex gap-1.5 flex-wrap justify-end ml-2">
                              {overbooked && <span className="inline-block rounded-lg px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] font-bold bg-orange-500/20 text-orange-300 border border-orange-400/40 whitespace-nowrap">⚠️ Over</span>}
                              {full && !overbooked && <span className="inline-block rounded-lg px-2 py-0.5 text-[9px] uppercase tracking-[0.15em] font-bold bg-red-500/15 text-red-300 border border-red-400/30">Full</span>}
                            </div>
                          </div>
                        </div>

                        <h4 className="font-bold text-[#F8F3EA] text-sm mb-1">{c.name}</h4>
                        {c.topic && <p className="text-xs text-[#D7B46A] mb-2 italic leading-snug">{c.topic}</p>}
                        {c.description && <p className="text-xs text-[#b89b84] mb-3">{c.description}</p>}

                        <div className="flex justify-between mb-2">
                          <span className="text-xs text-[#b89b84]">Filled</span>
                          <span className={`text-xs font-bold ${overbooked ? 'text-orange-400' : 'text-[#D7B46A]'}`}>
                            {filled} / {total || '∞'}
                            {overbooked && <span className="ml-1 text-orange-400 font-bold">(+{filled - total})</span>}
                          </span>
                        </div>
                        {total > 0 && (
                          <div className="h-1.5 w-full rounded-full bg-[rgba(183,145,67,0.1)] overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${overbooked ? 'bg-orange-400' : full ? 'bg-red-400' : 'bg-gradient-to-r from-[#8E6B2F] to-[#D7B46A]'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                        )}
                      </div>
                    );
                  })
                }
              </div>
            )}

            {/* ── Packages Tab ── */}
            {detailTab === 'packages' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {!(ev.sponsorPackages?.length)
                  ? <p className="text-[#b89b84] text-sm py-8 text-center col-span-full">No packages defined.</p>
                  : ev.sponsorPackages.map((pkg, i) => (
                    <div key={i} className="rounded-xl border p-4 relative overflow-hidden" style={{ borderColor: BORDER_GOLD, backgroundColor: CARD_BG }}>
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#8E6B2F] via-[#B79143] to-[#D7B46A]" />
                      <h4 className="font-bold text-[#F8F3EA] text-sm mt-1 mb-1">{pkg.name}</h4>
                      <p className="text-xl font-bold text-[#D7B46A] mb-2">{ev.currency || 'PKR'} {Number(pkg.amount || 0).toLocaleString()}</p>
                      {pkg.details && <p className="text-xs text-[#b89b84] leading-relaxed">{pkg.details}</p>}
                    </div>
                  ))
                }
              </div>
            )}

            {/* ── Payment Methods Tab ── */}
            {detailTab === 'payments' && (
              <div className="max-w-xl space-y-4">
                {[
                  { label: 'Bank Transfer', icon: '🏦', name: ev.bankName,      number: ev.bankAccount },
                  { label: 'JazzCash',      icon: '💛', name: ev.jazzCashName,  number: ev.jazzCash },
                  { label: 'EasyPaisa',     icon: '💚', name: ev.easyPaisaName, number: ev.easyPaisa },
                ].map(m => m.number ? (
                  <div key={m.label} className="rounded-xl border p-4" style={{ borderColor: BORDER_GOLD, backgroundColor: CARD_BG }}>
                    <h4 className="font-bold text-[#F8F3EA] text-sm mb-1">{m.icon} {m.label}</h4>
                    {m.name && <p className="text-sm text-[#b89b84]">{m.name}</p>}
                    <p className="font-mono text-base text-[#D7B46A] tracking-wider mt-1">{m.number}</p>
                  </div>
                ) : null)}
                {!ev.bankAccount && !ev.jazzCash && !ev.easyPaisa && <p className="text-[#b89b84] text-sm">No payment methods configured.</p>}
              </div>
            )}
          </div>

          {/* ── Reassign Modal ── */}
          {reassignModal && canEdit && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && setReassignModal(null)}>
              <div className="w-full max-w-md rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto" style={{ borderColor: BORDER_GOLD_STRONG, backgroundColor: BG_COLOR }}>
                <div className="sticky top-0 flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: BORDER_GOLD_STRONG, backgroundColor: BG_COLOR }}>
                  <h3 className="text-lg font-bold text-[#F8F3EA]">🔄 Reassign Committee</h3>
                  <button className="rounded-lg border px-3 py-1.5 text-sm text-[#B79143] hover:bg-[#B79143]/10 transition" style={{ borderColor: BORDER_GOLD_MEDIUM }} onClick={() => setReassignModal(null)}>✕</button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="rounded-xl border p-4 text-sm" style={{ borderColor: BORDER_GOLD, backgroundColor: 'rgba(183,145,67,0.08)' }}>
                    <p className="text-[#F8F3EA]"><strong className="text-[#B79143]">Delegate:</strong> {reassignModal.registration.fullName || '—'}</p>
                    <p className="text-[#F8F3EA] mt-1"><strong className="text-[#B79143]">Current:</strong> {resolveCommitteeName(reassignModal.registration)}</p>
                  </div>
                  <div>
                    <label className={labelCls}>Select New Committee</label>
                    <select className={inputCls + ' appearance-none'} value={reassignTarget} onChange={e => setReassignTarget(e.target.value)}>
                      <option value="">Choose a committee…</option>
                      {committees
                        .filter(c => c.eventId === selectedEvent?.id && c.id !== reassignModal.registration.committee)
                        .map(c => {
                          const filled = c.filledSeats || 0;
                          const total  = getCommSeats(c);
                          const isFull = total > 0 && filled >= total;
                          const isOverbookedComm = total > 0 && filled > total;
                          return (
                            <option key={c.id} value={c.id}>
                              {c.abbr ? `${c.abbr} — ` : ''}{c.name} — {filled}/{total || '∞'} seats
                              {isOverbookedComm ? ' ⚠️ OVERBOOKED' : isFull ? ' (FULL)' : ''}
                            </option>
                          );
                        })
                      }
                    </select>
                  </div>
                  {reassignTarget && (() => {
                    const tc = committees.find(c => c.id === reassignTarget);
                    if (!tc) return null;
                    const filled = tc.filledSeats || 0;
                    const total  = getCommSeats(tc);
                    const willOverbook = total > 0 && filled >= total;
                    return willOverbook ? (
                      <div className="rounded-xl border border-orange-400/30 bg-orange-500/10 p-3 text-xs text-orange-200">
                        ⚠️ This committee is full. Confirming will mark it as <strong>overbooked</strong>.
                      </div>
                    ) : null;
                  })()}
                </div>
                <div className="sticky bottom-0 flex gap-3 justify-end px-6 py-5 border-t" style={{ borderColor: BORDER_GOLD_STRONG, backgroundColor: BG_COLOR }}>
                  <button className="rounded-xl border px-5 py-2.5 text-sm font-semibold text-[#B79143] transition hover:bg-[#B79143]/10" style={{ borderColor: BORDER_GOLD_MEDIUM }} onClick={() => setReassignModal(null)}>Cancel</button>
                  <button
                    className="rounded-xl bg-gradient-to-r from-[#8E6B2F] via-[#B79143] to-[#D7B46A] px-5 py-2.5 text-sm font-semibold text-[#2A0B12] transition hover:scale-[1.02] disabled:opacity-50"
                    onClick={handleReassign}
                    disabled={!reassignTarget || reassigning}
                  >
                    {reassigning ? 'Reassigning…' : '✅ Confirm'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     LIST VIEW
  ══════════════════════════════════════════════════════════════ */
  return (
    <div className="relative min-h-screen overflow-hidden md:pl-[272px]" style={{ backgroundColor: BG_COLOR }}>
      <BackgroundOverlay /><GlowEffects /><Sidebar />
      <div className="relative z-10 px-4 pb-12 pt-20 sm:px-6 md:px-8 md:pt-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-[#B79143] uppercase tracking-[0.3em] text-[11px] mb-3">Admin</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#F8F3EA]">Event Management</h1>
            <p className="text-sm text-[#b89b84] mt-2">{events.length} event{events.length !== 1 ? 's' : ''} total</p>
          </div>
          {canEdit && (
            <button
              className="rounded-xl bg-gradient-to-r from-[#8E6B2F] via-[#B79143] to-[#D7B46A] px-5 py-3 text-sm font-semibold text-[#2A0B12] transition hover:scale-[1.02] w-full sm:w-auto"
              onClick={openCreate}
            >
              + Create Event
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center min-h-[300px]">
            <div className="w-10 h-10 rounded-full border-2 border-[#B79143]/20 border-t-[#B79143] animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl border backdrop-blur-xl p-8 sm:p-12 text-center" style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
            <div className="text-5xl mb-4">📅</div>
            <h3 className="text-xl font-bold text-[#F8F3EA] mb-2">No Events Yet</h3>
            <p className="text-[#b89b84] text-sm mb-6">{canEdit ? 'Create your first event to get started.' : 'No events have been created yet.'}</p>
            {canEdit && (
              <button className="rounded-xl bg-gradient-to-r from-[#8E6B2F] via-[#B79143] to-[#D7B46A] px-5 py-3 text-sm font-semibold text-[#2A0B12] transition hover:scale-[1.02]" onClick={openCreate}>Create Event</button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {events.map(ev => {
              const evRegs = registrations.filter(r => r.eventId === ev.id);
              const { evComms, totalSeats, totalFilled } = eventSeatTotals(ev.id);
              const seatPct      = totalSeats > 0 ? Math.min(100, Math.round((totalFilled / totalSeats) * 100)) : 0;
              const isFull       = totalSeats > 0 && totalFilled >= totalSeats;
              const isOverbooked = totalSeats > 0 && totalFilled > totalSeats;
              const banner       = ev.imageUrl || DEFAULT_BANNER;
              return (
                <div
                  key={ev.id}
                  className="rounded-2xl overflow-hidden border backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-[#B79143]/5 cursor-pointer flex flex-col"
                  style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}
                  onClick={() => openDetail(ev)}
                >
                  <div className="relative h-44 sm:h-48 overflow-hidden">
                    <img src={banner} alt={ev.name} className="w-full h-full object-cover transition-transform duration-500 hover:scale-110" onError={e => { e.target.src = DEFAULT_BANNER; }} />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[rgba(68,7,19,0.9)]" />
                    <div className="absolute top-3 right-3 flex gap-1.5">
                      {isOverbooked && <span className="rounded-lg px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider bg-orange-500/25 text-orange-300 border border-orange-400/35">⚠️ Overbooked</span>}
                      {isFull && !isOverbooked && <span className="rounded-lg px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider bg-red-500/25 text-red-300 border border-red-400/35">Full</span>}
                      <span className={statusBadge(ev.status || 'active')}>{ev.status || 'active'}</span>
                    </div>
                    <div className="absolute bottom-3 left-4 right-4">
                      <h3 className="text-lg font-bold text-[#F8F3EA] leading-tight drop-shadow-lg">{ev.name}</h3>
                    </div>
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3 text-xs text-[#b89b84]">
                      <span>📅 {eventDateRange(ev)}</span>
                      {ev.venue && <span>📍 {ev.venue}</span>}
                      {ev.entryFees > 0 && <span className="text-[#D7B46A] font-bold">🎟 {ev.currency || 'PKR'} {Number(ev.entryFees).toLocaleString()}</span>}
                      {ev.cardAllotmentDate && <span className="text-[#B79143]">🎫 {ev.cardAllotmentDate}</span>}
                    </div>
                    {totalSeats > 0 && (
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[0.6rem] uppercase tracking-[0.15em] text-[#B79143] font-bold">Capacity</span>
                          <span className={`text-xs font-bold ${isOverbooked ? 'text-orange-400' : isFull ? 'text-red-400' : 'text-[#D7B46A]'}`}>
                            {totalFilled}/{totalSeats}{isOverbooked && <span className="ml-1">(+{totalFilled - totalSeats})</span>}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-[rgba(183,145,67,0.1)] overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${isOverbooked ? 'bg-orange-400/70' : isFull ? 'bg-red-400/70' : 'bg-gradient-to-r from-[#8E6B2F] to-[#D7B46A]'}`} style={{ width: `${Math.min(100, seatPct)}%` }} />
                        </div>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="rounded-lg border px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.15em] text-[#B79143] font-bold" style={{ borderColor: BORDER_GOLD_MEDIUM, backgroundColor: 'rgba(183,145,67,0.08)' }}>👥 {evRegs.length}</span>
                      <span className="rounded-lg border px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.15em] text-[#B79143] font-bold" style={{ borderColor: BORDER_GOLD_MEDIUM, backgroundColor: 'rgba(183,145,67,0.08)' }}>⭐ {evComms.length}</span>
                      {ev.bankAccount && <span className="rounded-lg border px-2 py-1 text-[0.6rem] text-[#B79143]" style={{ borderColor: BORDER_GOLD_MEDIUM, backgroundColor: 'rgba(183,145,67,0.08)' }}>🏦</span>}
                      {ev.jazzCash    && <span className="rounded-lg border px-2 py-1 text-[0.6rem] text-[#B79143]" style={{ borderColor: BORDER_GOLD_MEDIUM, backgroundColor: 'rgba(183,145,67,0.08)' }}>💛</span>}
                      {ev.easyPaisa  && <span className="rounded-lg border px-2 py-1 text-[0.6rem] text-[#B79143]" style={{ borderColor: BORDER_GOLD_MEDIUM, backgroundColor: 'rgba(183,145,67,0.08)' }}>💚</span>}
                    </div>
                    <div className="flex-1" />
                    {canEdit && (
                      <div className="flex gap-2 pt-4 border-t" style={{ borderColor: BORDER_GOLD_LIGHT }} onClick={e => e.stopPropagation()}>
                        <button className="flex-1 rounded-xl border px-3 py-2 text-xs font-semibold text-[#B79143] hover:bg-[rgba(183,145,67,0.08)] transition" style={{ borderColor: BORDER_GOLD_MEDIUM }} onClick={() => openEdit(ev)}>✏️ Edit</button>
                        <button className="rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/25 transition" onClick={e => handleDelete(ev.id, e)}>Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}