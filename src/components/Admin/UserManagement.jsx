import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../supabase/config';
import Sidebar from '../Shared/Sidebar';
import { formatDate, getInitials, imageUrlToBase64 } from '../../utils/helpers';
import { keysToCamel } from '../../utils/cache';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import bk from "../../Assets/bk.webp";
import toast from 'react-hot-toast';

// ── Constants (Matching your design system) ──
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

const inputCls = 'w-full rounded-xl border border-[rgba(183,145,67,0.25)] bg-[rgba(0,0,0,0.4)] backdrop-blur-sm px-4 py-3.5 text-sm text-[#F8F3EA] placeholder:text-[#b89b84] focus:border-[#B79143] focus:outline-none focus:ring-2 focus:ring-[#B79143]/20 transition-all duration-300';
const selectCls = inputCls + ' appearance-none';
const labelCls = 'mb-2 block text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[#B79143]';

function statusBadge(status) {
  const base = 'inline-block rounded-lg px-3 py-1 text-[10px] uppercase tracking-[0.15em] font-bold';
  if (status === 'approved') return `${base} bg-emerald-500/15 text-emerald-300 border border-emerald-400/30`;
  if (status === 'rejected') return `${base} bg-red-500/15 text-red-300 border border-red-400/30`;
  return `${base} bg-amber-500/15 text-amber-200 border border-amber-400/30`;
}

// ── Card Validity Helpers ──
function isCardValid(reg) {
  const endDate = reg.eventEndDate || reg.eventStartDate;
  if (!endDate) return true;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  return now <= end;
}

function formatDateStr(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    const sep = dateStr.includes('/') ? '/' : '-';
    const parts = dateStr.split(sep);
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  }
  return date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

function MultiSelectFilter({ label, options, selected, onToggle, onClear }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const summary = selected.length === 0 ? 'All' : `${selected.length} selected`;

  return (
    <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-[280px]" ref={ref}>
      <button
        type="button"
        className={`${inputCls} w-full flex items-center justify-between gap-2 text-left`}
        onClick={() => setOpen(o => !o)}
      >
        <span className="truncate">
          <span className="text-[#b89b84] text-xs font-semibold uppercase tracking-wider">{label}</span>
          <span className="text-[#F8F3EA] ml-2 text-sm">{summary}</span>
        </span>
        <span className="text-[#B79143] text-xs shrink-0">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div
          className="absolute z-[60] left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl border bg-[rgba(30,5,10,0.98)] backdrop-blur-xl shadow-2xl py-1"
          style={{ borderColor: BORDER_GOLD_STRONG }}
        >
          {selected.length > 0 && (
            <button
              type="button"
              className="w-full text-left px-4 py-2.5 text-xs font-semibold text-[#B79143] hover:bg-[rgba(183,145,67,0.08)] border-b transition"
              style={{ borderColor: BORDER_GOLD_LIGHT }}
              onClick={() => { onClear(); setOpen(false); }}
            >
              Clear selection
            </button>
          )}
          {options.length === 0 ? (
            <p className="px-4 py-2.5 text-xs text-[#b89b84]">No options</p>
          ) : (
            options.map(opt => (
              <label
                key={opt.value}
                className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[rgba(183,145,67,0.06)] text-sm text-[#F8F3EA] transition"
              >
                <input
                  type="checkbox"
                  className="accent-[#B79143] w-4 h-4 shrink-0 rounded"
                  checked={selected.includes(opt.value)}
                  onChange={() => onToggle(opt.value)}
                />
                <span className="truncate">{opt.label}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function UserManagement() {
  const [registrations, setRegistrations] = useState([]);
  const [events, setEvents] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventIds, setSelectedEventIds] = useState([]);
  const [selectedCommitteeKeys, setSelectedCommitteeKeys] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  // ── Digital Card Preview State ──
  const [qrData, setQrData] = useState(undefined);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState(null);
  const [b64Image, setB64Image] = useState(null);
  const [bgB64, setBgB64] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const cardRef = useRef();
  const hiddenQrRef = useRef();

  // Convert background image to base64 once
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      setBgB64(canvas.toDataURL('image/png'));
    };
    img.onerror = () => setBgB64(null);
    img.src = BG_SRC;
  }, []);

  // Convert selected profile image to base64
  useEffect(() => {
    const imageToUse = selected?.imageUrl || selected?.profileImage || selected?.profile_image;
    if (!imageToUse) {
      setB64Image(null);
      return;
    }
    let isMounted = true;
    imageUrlToBase64(imageToUse).then(b64 => {
      if (isMounted && b64) setB64Image(b64);
    }).catch(() => {});
    return () => { isMounted = false; };
  }, [selected?.imageUrl, selected?.profileImage, selected?.profile_image]);

  // Fetch QR code when selected registration changes
  useEffect(() => {
    if (!selected) {
      setQrData(undefined);
      setQrImageUrl(null);
      return;
    }
    async function fetchQr() {
      setQrLoading(true);
      try {
        let query = supabase.from('qr_codes').select('*');
        if (selected.type === 'pass') {
          query = query.eq('pass_registration_id', selected.id);
        } else {
          query = query.eq('registration_id', selected.id);
        }
        const { data, error } = await query;
        if (error) throw error;
        setQrData(data?.length > 0 ? keysToCamel(data[0]) : null);
      } catch (e) {
        console.error('Error fetching QR:', e);
        setQrData(null);
      } finally {
        setQrLoading(false);
      }
    }
    fetchQr();
  }, [selected]);

  // Generate QR base64 image for reliable html2canvas export on iOS
  useEffect(() => {
    if (!qrData?.qrToken || qrData.qrToken === 'MUNRYK-INVALID') {
      setQrImageUrl(null);
      return;
    }
    const timer = setTimeout(() => {
      const canvas = hiddenQrRef.current?.querySelector('canvas');
      if (canvas) {
        try {
          const url = canvas.toDataURL('image/png');
          setQrImageUrl(url);
        } catch (err) {
          console.error('QR toDataURL failed:', err);
          setQrImageUrl(null);
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [qrData]);

  // ── Data Loading ──
  useEffect(() => {
    async function load() {
      try {
        const [{ data: regs }, { data: evs }, { data: comms }, { data: passRegs }, { data: passes }] = await Promise.all([
          supabase.from('registrations').select('*').order('created_at', { ascending: false }),
          supabase.from('events').select('id, name, start_date, end_date, date'),
          supabase.from('committees').select('id, name, abbr'),
          supabase.from('pass_registrations').select('*').order('created_at', { ascending: false }),
          supabase.from('event_passes').select('id, name')
        ]);

        // Build event lookup map for date merging
        const eventMap = {};
        (evs || []).forEach(ev => {
          eventMap[ev.id] = {
            name: ev.name,
            startDate: ev.start_date || ev.date,
            endDate: ev.end_date,
          };
        });

        const passMap = {};
        (passes || []).forEach(p => {
          passMap[p.id] = p.name;
        });

        const commMap = {};
        (comms || []).forEach(c => {
          commMap[c.id] = c.abbr || c.name;
        });

        const enrichedPassRegs = (passRegs || []).map(pr => {
          const passName = passMap[pr.pass_id] || pr.pass_name || pr.committee_name || 'Event Pass';
          const ev = eventMap[pr.event_id];
          return {
            ...pr,
            type: 'pass',
            is_pass: true,
            isPass: true,
            pass_id: pr.pass_id,
            passId: pr.pass_id,
            pass_name: passName,
            passName: passName,
            event_name: pr.event_name || ev?.name || 'Unknown Event',
            event_start_date: pr.event_start_date || ev?.startDate,
            event_end_date: pr.event_end_date || ev?.endDate,
            committee_name: passName,
            committeeName: passName,
          };
        });

        const enrichedRegs = (regs || []).map(reg => {
          const commName = commMap[reg.committee] || reg.committee_name || reg.committee;
          const comm = (comms || []).find(c => c.id === reg.committee);
          return {
            ...reg,
            event_name: reg.event_name || eventMap[reg.event_id]?.name || 'Unknown Event',
            event_start_date: reg.event_start_date || eventMap[reg.event_id]?.startDate,
            event_end_date: reg.event_end_date || eventMap[reg.event_id]?.endDate,
            committee_name: commName || reg.committee_name,
            committeeName: commName || reg.committee_name,
            committee_abbr: comm?.abbr || reg.committee_abbr || reg.committeeabbr,
            committeeAbbr: comm?.abbr || reg.committee_abbr || reg.committeeabbr,
          };
        });

        const combined = [...enrichedRegs, ...enrichedPassRegs].sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));

        setRegistrations(keysToCamel(combined));
        setEvents(evs || []);
        setCommittees(keysToCamel(comms || []));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const committeeMap = useMemo(
    () => Object.fromEntries(committees.map(c => [c.id, c.abbr || c.name])),
    [committees],
  );

  function getCommitteeOrCategory(r) {
    if (!r) return '—';
    if (r.type === 'sponsor') return r.category || '—';
    if (r.type === 'pass') return r.passName || r.pass_name || r.committeeName || 'Event Pass';
    if (!r.committee) return r.committeeName || r.committee_name || '—';
    return committeeMap[r.committee] || r.committeeName || r.committee_name || r.committee;
  }

  function getCommitteeName(reg) {
    if (!reg) return null;
    if (reg.type === 'pass') return reg.passName || reg.pass_name || reg.committeeName || null;
    if (reg.type !== 'delegate' && reg.type !== 'delegation_member') return null;
    if (reg.committeeAbbr) return reg.committeeAbbr;
    if (reg.committeeabbr) return reg.committeeabbr;
    if (!reg.committee) return reg.committeeName || reg.committee_name || null;
    const found = committees.find(c => c.id === reg.committee);
    return found?.abbr || found?.name || reg.committeeName || reg.committee_name || reg.committee;
  }

  const committeeFilterOptions = useMemo(() => {
    const fromDb = committees.map(c => ({ value: `c:${c.id}`, label: c.name }));
    const cats = [...new Set(
      registrations.filter(r => r.type === 'sponsor' && r.category).map(r => r.category),
    )];
    const fromSponsors = cats.map(cat => ({ value: `s:${cat}`, label: `${cat} (Sponsor)` }));
    return [...fromDb, ...fromSponsors];
  }, [committees, registrations]);

  const eventFilterOptions = useMemo(
    () => events.map(ev => ({ value: String(ev.id), label: ev.name })),
    [events],
  );

  function toggleEvent(id) {
    setSelectedEventIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  }

  function toggleCommitteeKey(key) {
    setSelectedCommitteeKeys(prev =>
      prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key],
    );
  }

  function matchesCommitteeFilters(r) {
    if (selectedCommitteeKeys.length === 0) return true;
    return selectedCommitteeKeys.some(key => {
      if (key.startsWith('c:')) {
        const id = key.slice(2);
        return r.type === 'delegate' && String(r.committee) === id;
      }
      if (key.startsWith('s:')) {
        const cat = key.slice(2);
        return r.type === 'sponsor' && r.category === cat;
      }
      return false;
    });
  }

  const filtered = registrations.filter(r => {
    const matchEvent = selectedEventIds.length === 0 || selectedEventIds.includes(String(r.eventId));
    const matchType = filterType === 'all' || r.type === filterType;
    const matchStatus = filterStatus === 'all' || r.paymentStatus === filterStatus;
    const matchCommittee = matchesCommitteeFilters(r);

    const q = search.toLowerCase().trim();
    const haystack = [
      r.fullName, r.companyName, r.email, r.phone, r.eventName,
      getCommitteeOrCategory(r), r.type, r.paymentStatus, r.cnic, r.contactPerson,
    ].filter(Boolean).map(v => String(v).toLowerCase());
    const matchSearch = !q || haystack.some(s => s.includes(q));

    return matchEvent && matchType && matchStatus && matchCommittee && matchSearch;
  });

  // ── Digital Card Export Functions ──
  const displayName = selected?.fullName || selected?.companyName || 'Participant';
  const committeeName = selected ? getCommitteeName(selected) : null;
  const valid = selected ? isCardValid(selected) : true;
  const qrValue = qrData?.qrToken || 'MUNRYK-INVALID';

  async function saveAsImage() {
    if (!cardRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const imageToUse = selected?.imageUrl || selected?.profileImage || selected?.profile_image;
      let currentB64 = b64Image;
      if (!currentB64 && imageToUse) {
        currentB64 = await imageUrlToBase64(imageToUse);
        if (currentB64) setB64Image(currentB64);
      }

      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 500));
      const canvas = await html2canvas(cardRef.current, {
        scale: 4,
        backgroundColor: '#3A0810',
        useCORS: true,
        allowTaint: true,
        logging: false,
        onclone: function (clonedDoc, element) {
          if (currentB64) {
            const profileImgs = element.querySelectorAll('img[alt="' + displayName + '"]');
            profileImgs.forEach(img => { img.src = currentB64; });
          }
          const allElements = element.getElementsByTagName('*');
          for (let el of allElements) {
            const style = el.style;
            if (style.color && style.color.includes('oklch')) style.color = '#FFFFFF';
            if (style.backgroundColor && style.backgroundColor.includes('oklch')) style.backgroundColor = '#3A0810';
            if (style.borderColor && style.borderColor.includes('oklch')) style.borderColor = '#B79143';
          }
        }
      });
      const link = document.createElement('a');
      link.download = `MUNRYK-Card-${displayName.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Card saved as image!');
    } catch (error) {
      console.error('Save Image Error:', error);
      toast.error('Save failed: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  }

  async function saveAsPDF() {
    if (!cardRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const imageToUse = selected?.imageUrl || selected?.profileImage || selected?.profile_image;
      let currentB64 = b64Image;
      if (!currentB64 && imageToUse) {
        currentB64 = await imageUrlToBase64(imageToUse);
        if (currentB64) setB64Image(currentB64);
      }

      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 500));
      const canvas = await html2canvas(cardRef.current, {
        scale: 4,
        backgroundColor: '#3A0810',
        useCORS: true,
        allowTaint: true,
        logging: false,
        onclone: function (clonedDoc, element) {
          if (currentB64) {
            const profileImgs = element.querySelectorAll('img[alt="' + displayName + '"]');
            profileImgs.forEach(img => { img.src = currentB64; });
          }
          const allElements = element.getElementsByTagName('*');
          for (let el of allElements) {
            const style = el.style;
            if (style.color && style.color.includes('oklch')) style.color = '#FFFFFF';
            if (style.backgroundColor && style.backgroundColor.includes('oklch')) style.backgroundColor = '#3A0810';
            if (style.borderColor && style.borderColor.includes('oklch')) style.borderColor = '#B79143';
          }
        }
      });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [90, 145] });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 90, 145);
      pdf.save(`MUNRYK-Card-${displayName.replace(/\s+/g, '_')}.pdf`);
      toast.success('Card saved as PDF!');
    } catch (error) {
      console.error('Save PDF Error:', error);
      toast.error('Save failed: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  }

  // ── Card Component (Same as DigitalCard) ──
  const CardComponent = () => (
    <div
      ref={cardRef}
      style={{
        position: 'relative',
        width: '300px',
        minHeight: '480px',
        flexShrink: 0,
        overflow: 'hidden',
        borderRadius: '14px',
        border: `1.5px solid ${valid ? '#B79143' : '#525252'}`,
        padding: '20px',
        boxShadow: valid ? '0 16px 48px rgba(0,0,0,0.55)' : '0 16px 48px rgba(0,0,0,0.4)',
        backgroundImage: bgB64 ? `url(${bgB64})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: valid
            ? 'linear-gradient(160deg, rgba(58,8,16,0.85) 0%, rgba(107,15,26,0.8) 45%, rgba(74,10,18,0.85) 100%)'
            : 'linear-gradient(160deg, rgba(26,26,26,0.9) 0%, rgba(42,42,42,0.85) 45%, rgba(26,26,26,0.9) 100%)',
          borderRadius: '14px',
        }}
      />
      {/* Pattern overlay */}
      <div
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          inset: 0,
          borderRadius: '14px',
          background: 'repeating-linear-gradient(45deg, rgba(201,168,76,0.02) 0px, rgba(201,168,76,0.02) 1px, transparent 1px, transparent 10px)',
        }}
      />
      {/* Gold line top */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: '3px',
          background: valid
            ? 'linear-gradient(90deg, transparent, #C9A84C 30%, #FFD700 50%, #C9A84C 70%, transparent)'
            : 'linear-gradient(90deg, transparent, #666 50%, transparent)',
          zIndex: 1,
        }}
      />
      {/* EXPIRED overlay */}
      {!valid && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '14px',
          backgroundColor: 'rgba(0,0,0,0.55)',
        }}>
          <div style={{
            transform: 'rotate(-12deg)',
            borderRadius: '6px',
            border: '2px solid rgba(252,165,165,0.5)',
            padding: '12px 28px',
            fontFamily: 'Cinzel, serif',
            fontSize: '24px',
            fontWeight: 900,
            letterSpacing: '0.1em',
            color: '#FFFFFF',
            backgroundColor: 'rgba(192,57,43,0.9)',
            boxShadow: '0 10px 15px rgba(0,0,0,0.3)',
          }}>
            EXPIRED
          </div>
        </div>
      )}
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: '14px', textAlign: 'center' }}>
          <div style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '20px',
            fontWeight: 900,
            letterSpacing: '0.22em',
            color: valid ? '#D7B46A' : '#737373',
          }}>
            RYK MUN
          </div>
          <div style={{
            marginTop: '4px',
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${valid ? 'rgba(201,168,76,0.4)' : 'rgba(100,100,100,0.3)'}, transparent)`,
          }} />
        </div>
        {/* Profile Image */}
        <div style={{ marginBottom: '12px', textAlign: 'center' }}>
          {b64Image ? (
            <img
              src={b64Image}
              alt={displayName}
              style={{
                display: 'inline-block',
                width: '140px',
                height: '140px',
                borderRadius: '50%',
                border: `2px solid ${valid ? '#C9A84C' : '#555'}`,
                objectFit: 'cover',
              }}
            />
          ) : (selected?.imageUrl || selected?.profileImage) ? (
            <img
              src={selected.imageUrl || selected.profileImage}
              alt={displayName}
              style={{
                display: 'inline-block',
                width: '140px',
                height: '140px',
                borderRadius: '50%',
                border: `2px solid ${valid ? '#C9A84C' : '#555'}`,
                objectFit: 'cover',
              }}
            />
          ) : (
            <div style={{
              display: 'inline-flex',
              width: '140px',
              height: '140px',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              border: `2px solid ${valid ? '#B79143' : '#525252'}`,
              backgroundColor: valid ? 'rgba(183,145,67,0.1)' : 'rgba(38,38,38,0.3)',
              color: valid ? '#B79143' : '#737373',
              fontFamily: 'Cinzel, serif',
              fontSize: '48px',
            }}>
              {displayName[0]?.toUpperCase()}
            </div>
          )}
        </div>
        {/* Details Table */}
        <div style={{
          marginBottom: '14px',
          borderRadius: '6px',
          backgroundColor: 'rgba(0,0,0,0.25)',
          padding: '10px 12px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '8px',
            borderBottom: '1px solid rgba(183,145,67,0.1)',
            padding: '4px 0',
          }}>
            <span style={{
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '9px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: valid ? '#B79143' : '#525252',
            }}>
              NAME
            </span>
            <span style={{
              maxWidth: '165px',
              textAlign: 'right',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: '11px',
              fontWeight: 500,
              color: valid ? '#F8F3EA' : '#737373',
            }}>
              {displayName} ({selected?.type === 'delegate' ? 'Delegate' : selected?.type === 'sponsor' ? 'Sponsor' : selected?.type === 'pass' ? 'Pass' : 'Member'})
            </span>
          </div>
          {selected?.type === 'pass' ? (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '8px',
              padding: '4px 0',
            }}>
              <span style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '9px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: valid ? '#B79143' : '#525252',
              }}>
                PASS NAME
              </span>
              <span style={{
                maxWidth: '165px',
                textAlign: 'right',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '11px',
                fontWeight: 500,
                color: valid ? '#F8F3EA' : '#737373',
              }}>
                {selected?.passName || selected?.pass_name || selected?.committeeName || 'Event Pass'}
              </span>
            </div>
          ) : (committeeName || selected?.committeeName) ? (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '8px',
              padding: '4px 0',
            }}>
              <span style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '9px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: valid ? '#B79143' : '#525252',
              }}>
                COMMITTEE
              </span>
              <span style={{
                maxWidth: '165px',
                textAlign: 'right',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '11px',
                fontWeight: 500,
                color: valid ? '#F8F3EA' : '#737373',
              }}>
                {committeeName || selected?.committeeName}
              </span>
            </div>
          ) : null}
          {selected?.cnic && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '8px',
              padding: selected?.type === 'pass' || committeeName ? '4px 0 0 0' : '4px 0',
              borderTop: '1px solid rgba(183,145,67,0.1)',
              marginTop: '4px'
            }}>
              <span style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '9px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: valid ? '#B79143' : '#525252',
              }}>
                CNIC
              </span>
              <span style={{
                maxWidth: '165px',
                textAlign: 'right',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '11px',
                fontWeight: 500,
                color: valid ? '#F8F3EA' : '#737373',
              }}>
                {selected?.cnic}
              </span>
            </div>
          )}
        </div>
        {/* QR Code */}
        <div style={{ marginBottom: '10px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            borderRadius: '8px',
            backgroundColor: '#FFFFFF',
            padding: '10px',
            boxShadow: '0 10px 15px rgba(0,0,0,0.3)',
          }}>
            {qrImageUrl ? (
              <img
                src={qrImageUrl}
                alt="QR Code"
                style={{
                  width: '140px',
                  height: '140px',
                  display: 'inline-block',
                }}
                loading="eager"
              />
            ) : (
              <div style={{
                width: '140px',
                height: '140px',
                background: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
              }}>
                <span style={{ fontSize: '10px', color: '#999' }}>Loading…</span>
              </div>
            )}
          </div>
          <div style={{
            marginTop: '6px',
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '9px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: valid ? '#B79143' : '#525252',
          }}>
            {valid ? 'SCAN TO VERIFY' : 'CARD EXPIRED'}
          </div>
        </div>
        {/* Footer */}
        <div style={{
          borderTop: `1px solid ${valid ? 'rgba(183,145,67,0.2)' : '#404040'}`,
          paddingTop: '10px',
          textAlign: 'center',
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '9px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: valid ? '#B79143' : '#525252',
        }}>
          ◆ OFFICIAL DIGITAL PASS ◆
        </div>
      </div>
    </div>
  );

  // ── Background Components ──
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

  return (
    <div className="relative min-h-screen overflow-hidden md:pl-[272px]" style={{ backgroundColor: BG_COLOR }}>
      <BackgroundOverlay />
      <GlowEffects />
      <Sidebar />

      <div className="relative z-10 px-4 pb-12 pt-20 sm:px-6 md:px-8 md:pt-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[#B79143] uppercase tracking-[0.3em] text-[11px] mb-3">Admin</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#F8F3EA]">All Registrations</h1>
          <p className="text-sm text-[#b89b84] mt-2">View and filter all event registrations</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 mb-6">
          {/* Search */}
          <input
            className={inputCls}
            placeholder="🔍 Search by name, email, phone, event, committee, status…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            type="search"
            autoComplete="off"
          />

          {/* Filter Row */}
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <MultiSelectFilter
              label="Events"
              options={eventFilterOptions}
              selected={selectedEventIds}
              onToggle={toggleEvent}
              onClear={() => setSelectedEventIds([])}
            />
            <MultiSelectFilter
              label="Committee / Category"
              options={committeeFilterOptions}
              selected={selectedCommitteeKeys}
              onToggle={toggleCommitteeKey}
              onClear={() => setSelectedCommitteeKeys([])}
            />
            <select className={selectCls + ' w-full sm:w-[160px] min-w-0 shrink-0'} value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="delegate">Delegates</option>
              <option value="sponsor">Sponsors</option>
              <option value="delegation">Delegations</option>
              <option value="delegation_member">Delegation Members</option>
              <option value="pass">Passes</option>
            </select>
            <select className={selectCls + ' w-full sm:w-[160px] min-w-0 shrink-0'} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Results Panel */}
        <div className="rounded-2xl border backdrop-blur-xl p-4 sm:p-6" style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-[#b89b84]">
              Showing <strong className="text-[#B79143]">{filtered.length}</strong> of {registrations.length} registrations
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center min-h-[200px]">
              <div className="w-10 h-10 rounded-full border-2 border-[#B79143]/20 border-t-[#B79143] animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🔎</div>
              <p className="text-[#b89b84] text-sm">No registrations match your filters.</p>
            </div>
          ) : (
            /* ── Cards Grid ── */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(r => {
                const name = r.fullName || r.companyName || '—';
                const typeLabel = r.type === 'delegate' ? '🧑‍💼 Delegate' : r.type === 'delegation' ? '👥 Delegation' : r.type === 'delegation_member' ? '🧑‍💼 Delegation Member' : r.type === 'pass' ? '🎫 Pass' : '🏢 Sponsor';

                return (
                  <div
                    key={r.id}
                    className="rounded-2xl border backdrop-blur-sm p-4 sm:p-5 flex flex-col transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:shadow-[#B79143]/5"
                    style={{ borderColor: BORDER_GOLD, backgroundColor: CARD_BG }}
                  >
                    {/* Header - Avatar + Name */}
                    <div className="flex gap-3 pb-4 mb-4 border-b" style={{ borderColor: BORDER_GOLD_LIGHT }}>
                      {r.imageUrl ? (
                        <img
                          src={r.imageUrl}
                          alt=""
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 shrink-0"
                          style={{ borderColor: BORDER_GOLD_MEDIUM }}
                        />
                      ) : (
                        <div
                          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-[#B79143] font-bold text-base sm:text-lg shrink-0 border-2"
                          style={{ borderColor: BORDER_GOLD_MEDIUM, backgroundColor: 'rgba(183,145,67,0.1)' }}
                        >
                          {getInitials(name)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-[#F8F3EA] text-sm sm:text-base truncate">
                          {name}
                        </h3>
                        <p className="text-xs text-[#b89b84] mt-0.5 truncate">
                          {r.email || '—'}
                        </p>
                      </div>
                    </div>

                    {/* Event & Type Row */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1 font-bold">Event</p>
                        <p className="text-sm text-[#F8F3EA] font-medium truncate">{r.eventName || '—'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1 font-bold">Type</p>
                        <span className="inline-block rounded-lg border px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] text-[#B79143]" style={{ borderColor: BORDER_GOLD_MEDIUM, backgroundColor: 'rgba(183,145,67,0.08)' }}>
                          {typeLabel}
                        </span>
                      </div>
                    </div>

                    {/* Committee / Pass Name / Category */}
                    <div className="mb-3">
                      <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1 font-bold">
                        {r.type === 'pass' ? 'Pass Name' : r.type === 'sponsor' ? 'Category' : 'Committee'}
                      </p>
                      <p className="text-sm text-[#F8F3EA]">{getCommitteeOrCategory(r)}</p>
                    </div>

                    {r.type === 'delegate' && (
                      <div className="mb-3">
                        <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1 font-bold">Ambassador Code</p>
                        <p className="text-sm text-[#F8F3EA]">{r.ambassadorCode || '—'}</p>
                      </div>
                    )}

                    {/* Contact */}
                    <div className="mb-3">
                      <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1 font-bold">Contact</p>
                      <p className="text-sm text-[#b89b84]">{r.phone || '—'}</p>
                    </div>

                    {/* Date & Status Row */}
                    <div className="grid grid-cols-2 gap-3 mb-4 mt-auto">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1 font-bold">Date</p>
                        <p className="text-xs text-[#b89b84]">{formatDate(r.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1 font-bold">Payment</p>
                        <span className={statusBadge(r.paymentStatus || 'pending')}>
                          {r.paymentStatus || 'pending'}
                        </span>
                      </div>
                    </div>

                    {/* View Button */}
                    <div className="pt-4 border-t" style={{ borderColor: BORDER_GOLD_LIGHT }}>
                      <button
                        type="button"
                        className="w-full rounded-xl border px-4 py-2.5 text-xs font-semibold text-[#B79143] hover:bg-[rgba(183,145,67,0.08)] transition"
                        style={{ borderColor: BORDER_GOLD_MEDIUM }}
                        onClick={() => setSelected(r)}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Detail Modal ── */}
        {selected && (
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
            onClick={e => e.target === e.currentTarget && setSelected(null)}
          >
            <div
              className="w-full max-w-[500px] rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto"
              style={{ borderColor: BORDER_GOLD_STRONG, backgroundColor: BG_COLOR }}
            >
              {/* Modal Header */}
              <div
                className="sticky top-0 flex items-center justify-between px-6 py-5 border-b z-10"
                style={{ borderColor: BORDER_GOLD_STRONG, backgroundColor: BG_COLOR }}
              >
                <h3 className="text-lg font-bold text-[#F8F3EA]">Registration Details</h3>
                <button
                  className="rounded-lg border px-3 py-1.5 text-sm text-[#B79143] hover:bg-[#B79143]/10 transition"
                  style={{ borderColor: BORDER_GOLD_MEDIUM }}
                  onClick={() => setSelected(null)}
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                {/* Profile Header */}
                <div className="flex items-center gap-4 mb-6">
                  {selected.imageUrl ? (
                    <img
                      src={selected.imageUrl}
                      alt=""
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 shrink-0"
                      style={{ borderColor: BORDER_GOLD_STRONG }}
                    />
                  ) : (
                    <div
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-[#B79143] font-bold text-xl sm:text-2xl shrink-0 border-2"
                      style={{ borderColor: BORDER_GOLD_STRONG, backgroundColor: 'rgba(183,145,67,0.1)' }}
                    >
                      {getInitials(selected.fullName || selected.companyName)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="font-bold text-[#F8F3EA] text-base sm:text-lg truncate">
                      {selected.fullName || selected.companyName}
                    </h4>
                    <p className="text-sm text-[#b89b84] truncate">{selected.email}</p>
                    <span className="inline-block mt-1.5 rounded-lg border px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] text-[#B79143]" style={{ borderColor: BORDER_GOLD_MEDIUM, backgroundColor: 'rgba(183,145,67,0.08)' }}>
                      {selected.type}
                    </span>
                  </div>
                </div>

                {/* Detail Rows */}
                <div className="space-y-0">
                  {[
                    ['Event', selected.eventName],
                    ['Phone', selected.phone],
                    ['CNIC', selected.cnic || null],
                    ['Pass Name', selected.type === 'pass' ? (selected.passName || selected.pass_name || selected.committeeName || 'Event Pass') : null],
                    ['Committee', (selected.type === 'delegate' || selected.type === 'delegation_member') ? getCommitteeOrCategory(selected) : null],
                    ['Sponsor Level', selected.type === 'sponsor' ? selected.category : null],
                    ['Ambassador Code', selected.type === 'delegate' ? selected.ambassadorCode : null],
                    ['Contact Person', selected.contactPerson || null],
                    ['Registered', formatDate(selected.createdAt)],
                    ['Payment Status', selected.paymentStatus || 'pending'],
                  ].filter(([, v]) => v != null).map(([label, val]) => (
                    <div
                      key={label}
                      className="flex justify-between items-start py-3 px-1 gap-3 border-b last:border-b-0 transition hover:bg-[rgba(183,145,67,0.02)]"
                      style={{ borderColor: BORDER_GOLD_LIGHT }}
                    >
                      <span className="text-[10px] uppercase tracking-wider text-[#B79143] font-bold shrink-0 mt-0.5">
                        {label}
                      </span>
                      <span className="text-sm font-medium text-[#F8F3EA] text-right">
                        {label === 'Payment Status'
                          ? <span className={statusBadge(val)}>{val}</span>
                          : val}
                      </span>
                    </div>
                  ))}
                </div>

                {/* ── Digital Card Preview ── */}
                <div className="mt-6 pt-6 border-t" style={{ borderColor: BORDER_GOLD_LIGHT }}>
                  <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-4 font-bold text-center">
                    Digital Pass
                  </p>

                  {qrLoading ? (
                    <div className="flex flex-col items-center py-8">
                      <div className="w-8 h-8 rounded-full border-2 border-[#B79143]/20 border-t-[#B79143] animate-spin mb-3" />
                      <p className="text-xs text-[#b89b84]">Checking card status…</p>
                    </div>
                  ) : qrData === null ? (
                    <div className="text-center py-6">
                      <div className="text-3xl mb-2">⏳</div>
                      <p className="text-sm text-[#b89b84]">No digital pass generated yet</p>
                    </div>
                  ) : qrData ? (
                    <div className="flex flex-col items-center gap-4">
                      {/* Hidden off-screen QR canvas for base64 generation */}
                      <div
                        ref={hiddenQrRef}
                        style={{ position: 'fixed', left: '-9999px', top: '-9999px', visibility: 'hidden', zIndex: -1 }}
                      >
                        <QRCodeCanvas
                          value={qrValue}
                          size={280}
                          bgColor="#ffffff"
                          fgColor={valid ? '#3A0810' : '#666666'}
                          level="H"
                          includeMargin={false}
                        />
                      </div>

                      <CardComponent />

                      <div className="flex flex-wrap gap-3 justify-center">
                        <button
                          type="button"
                          className="rounded-xl bg-gradient-to-r from-[#8E6B2F] via-[#B79143] to-[#D7B46A] px-5 py-2.5 text-sm font-semibold text-[#2A0B12] transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#B79143]/20 disabled:opacity-50"
                          onClick={saveAsImage}
                          disabled={isExporting}
                        >
                          {isExporting ? '⏳ Saving...' : '📥 Save as Image'}
                        </button>
                        <button
                          type="button"
                          className="rounded-xl border px-5 py-2.5 text-sm font-semibold text-[#B79143] transition-all duration-300 hover:bg-[#B79143]/10 disabled:opacity-50"
                          style={{ borderColor: BORDER_GOLD_STRONG }}
                          onClick={saveAsPDF}
                          disabled={isExporting}
                        >
                          {isExporting ? '⏳ Saving...' : '📄 Save as PDF'}
                        </button>
                      </div>

                      <div className="w-full text-sm rounded-xl border backdrop-blur-xl p-4" style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
                        <div className="mb-1.5 flex items-center gap-2 justify-center">
                          <span>{valid ? '🟢' : '🔴'}</span>
                          <strong className={valid ? 'text-emerald-400' : 'text-red-400'}>
                            {valid ? 'Card Valid' : 'Card Expired'}
                          </strong>
                        </div>
                        <p className="mt-1.5 text-xs text-[#b89b84] text-center">
                          QR: {qrData.isUsed ? '🔴 Already scanned' : '🟢 Not yet scanned'}
                        </p>
                        {selected?.eventEndDate && (
                          <p className="mt-1 text-xs text-[#b89b84] text-center">
                            📅 Expires: {formatDateStr(selected.eventEndDate)}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}