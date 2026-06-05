import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../supabase/config';
import Sidebar from '../Shared/Sidebar';
import { formatDate, getInitials } from '../../utils/helpers';
import { keysToCamel } from '../../utils/cache';
import bk from "../../Assets/bk.webp";

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
  const [events,        setEvents]        = useState([]);
  const [committees,    setCommittees]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selectedEventIds, setSelectedEventIds] = useState([]);
  const [selectedCommitteeKeys, setSelectedCommitteeKeys] = useState([]);
  const [filterType,    setFilterType]    = useState('all');
  const [filterStatus,  setFilterStatus]  = useState('all');
  const [search,        setSearch]        = useState('');
  const [selected,      setSelected]      = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [{ data: regs }, { data: evs }, { data: comms }] = await Promise.all([
          supabase.from('registrations').select('*').order('created_at', { ascending: false }),
          supabase.from('events').select('id, name'),
          supabase.from('committees').select('id, name'),
        ]);
        setRegistrations(keysToCamel(regs || []));
        setEvents(evs || []);
        setCommittees(keysToCamel(comms || []));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const committeeMap = useMemo(
    () => Object.fromEntries(committees.map(c => [c.id, c.name])),
    [committees],
  );

  function getCommitteeOrCategory(r) {
    if (r.type === 'sponsor') return r.category || '—';
    if (!r.committee) return '—';
    return committeeMap[r.committee] || r.committeeName || r.committee;
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
    const matchType   = filterType   === 'all' || r.type          === filterType;
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
                const typeLabel = r.type === 'delegate' ? '🧑‍💼 Delegate' : '🏢 Sponsor';
                
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

                    {/* Committee / Category */}
                    <div className="mb-3">
                      <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1 font-bold">Committee / Category</p>
                      <p className="text-sm text-[#F8F3EA]">{getCommitteeOrCategory(r)}</p>
                    </div>

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
                    ['Committee', selected.type === 'delegate' ? getCommitteeOrCategory(selected) : null],
                    ['Sponsor Level', selected.type === 'sponsor' ? selected.category : null],
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
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}