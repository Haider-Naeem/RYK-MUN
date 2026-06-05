import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/config';
import { useAuth } from '../../hooks/useAuth';
import Sidebar, { DelegateMobileBar, adminPadClass } from '../Shared/Sidebar';
import { uploadToR2 } from '../../utils/r2';
import { cachedCollection, invalidateCollection, keysToCamel } from '../../utils/cache';
import toast from 'react-hot-toast';
import bk from "../../Assets/bk.webp";

// ── Constants ──
const BG_SRC = bk;
const BG_COLOR = '#440713';
const BG_GRADIENT = 'linear-gradient(180deg, rgba(68,7,19,0.55) 0%, rgba(10,0,2,0.75) 100%)';
const GLOW_GOLD = 'radial-gradient(circle, rgba(183,145,67,0.18), transparent 70%)';
const GLOW_RED = 'radial-gradient(circle, rgba(120,18,30,0.18), transparent 70%)';

const DEFAULT_BANNER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'%3E%3Crect width='400' height='200' fill='%234A0A12'/%3E%3Ctext x='200' y='90' text-anchor='middle' fill='%23C9A84C' font-size='48' font-family='serif'%3E🎪%3C/text%3E%3Ctext x='200' y='140' text-anchor='middle' fill='%23C9A84C40' font-size='16' font-family='sans-serif'%3EMODEL UNITED NATIONS%3C/text%3E%3C/svg%3E";

const inputCls =
  'w-full rounded-xl border border-[rgba(183,145,67,0.25)] bg-[rgba(0,0,0,0.4)] backdrop-blur-sm px-4 py-3 text-sm text-[#F8F3EA] placeholder:text-[#b89b84] focus:border-[#B79143] focus:outline-none focus:ring-2 focus:ring-[#B79143]/20 transition-all duration-300';
const selectCls =
  'w-full rounded-xl border border-[rgba(183,145,67,0.25)] bg-[rgba(0,0,0,0.4)] backdrop-blur-sm px-4 py-3 text-sm text-[#F8F3EA] placeholder:text-[#b89b84] focus:border-[#B79143] focus:outline-none focus:ring-2 focus:ring-[#B79143]/20 transition-all duration-300 appearance-none min-h-[50px]';
const labelCls = 'mb-2 block text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[#B79143]';
const labelCompactCls = 'mb-1 block text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[#B79143]';
const panelCls = 'rounded-2xl border border-[rgba(183,145,67,0.18)] bg-[rgba(68,7,19,0.58)] backdrop-blur-xl p-5 sm:p-6';
const btnPrimaryCls =
  'rounded-xl bg-gradient-to-r from-[#8E6B2F] via-[#B79143] to-[#D7B46A] px-5 py-3 text-sm font-semibold text-[#2A0B12] transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#B79143]/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100';
const btnSecondaryCls =
  'rounded-xl border border-[rgba(183,145,67,0.3)] px-5 py-3 text-sm font-semibold text-[#B79143] transition-all duration-300 hover:bg-[rgba(183,145,67,0.08)] hover:border-[#B79143]/50';
const infoBoxCls = 'rounded-xl border border-[rgba(183,145,67,0.2)] bg-[rgba(0,0,0,0.3)] backdrop-blur-sm px-4 py-3 text-sm text-[#F8F3EA]';
const warningBoxCls =
  'rounded-xl border border-amber-500/35 bg-amber-950/25 backdrop-blur-sm px-4 py-3 text-sm leading-relaxed text-amber-100/90';
const sectionCls = 'min-h-screen flex items-center justify-center px-4 py-20 sm:px-6 md:px-8';

// ── Helper: format date range compactly ──
function getRegistrationStatus(ev) {
  if (!ev) return { open: true };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (ev.registrationStartDate) {
    const start = new Date(ev.registrationStartDate + 'T00:00:00');
    if (today < start) return { open: false, message: 'Registration has not opened yet.' };
  }
  if (ev.registrationEndDate) {
    const end = new Date(ev.registrationEndDate + 'T23:59:59');
    if (today > end) return { open: false, message: 'Registration is closed.' };
  }
  return { open: true };
}

function formatDateRange(startDate, endDate) {
  if (!startDate) return 'TBD';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  const startDay = start.getDate();
  const startMonth = months[start.getMonth()];
  const startYear = start.getFullYear();
  if (!end || startDate === endDate) return `${startDay} ${startMonth} ${startYear}`;
  const endDay = end.getDate();
  const endMonth = months[end.getMonth()];
  const endYear = end.getFullYear();
  if (startYear === endYear) {
    if (startMonth === endMonth) return `${startDay} - ${endDay} ${startMonth} ${startYear}`;
    return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${startYear}`;
  }
  return `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`;
}

export default function EventRegistration() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const padClass = adminPadClass(userProfile);

  const [events, setEvents] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [regType, setRegType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submittedRegId, setSubmittedRegId] = useState(null);

  const [delegateForm, setDelegateForm] = useState({
    fullName: '', email: '', phone: '', cnic: '', committee: ''
  });
  const [sponsorForm, setSponsorForm] = useState({
    companyName: '', contactPerson: '', phone: '', email: '', category: ''
  });

  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const receiptRef = useRef();

  // ── Load events ──
  useEffect(() => {
    cachedCollection('events')
      .then(all => setEvents(all.filter(e => e.status === 'active' || e.status === 'upcoming')))
      .catch(console.error);
  }, []);

  // ── Load committees when event is selected ──
  useEffect(() => {
    if (!selectedEvent) return;
    if (userProfile) {
      setDelegateForm(f => ({
        ...f,
        fullName: f.fullName || userProfile.fullName || '',
        email: f.email || userProfile.email || '',
        phone: f.phone || userProfile.phone || '',
      }));
    }
    supabase
      .from('committees')
      .select('*')
      .eq('event_id', selectedEvent.id)
      .then(({ data }) => setCommittees(keysToCamel(data || [])))
      .catch(console.error);
  }, [selectedEvent, userProfile]);

  // ── Realtime: live seat updates ──
  useEffect(() => {
    if (!selectedEvent) return;
    const channel = supabase
      .channel('er-committees-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'committees' },
        payload => {
          const updated = keysToCamel(payload.new);
          if (updated.eventId !== selectedEvent.id) return;
          setCommittees(prev => prev.map(c => (c.id === updated.id ? updated : c)));
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [selectedEvent]);

  // ── Seat helpers ──
  function getSeats(c) { return c.totalSeats ?? c.seats ?? 0; }

  function eventSeatInfo(comms) {
    const totalSeats = comms.reduce((s, c) => s + (getSeats(c) || 0), 0);
    const totalFilled = comms.reduce((s, c) => s + (c.filledSeats || 0), 0);
    return { totalSeats, totalFilled };
  }

  const isEventFull = (comms) => {
    if (!comms?.length) return false;
    const { totalSeats, totalFilled } = eventSeatInfo(comms);
    return totalSeats > 0 && totalFilled >= totalSeats;
  };

  const paymentMethods = [];
  if (selectedEvent?.bankAccount) paymentMethods.push({ key: 'bank', label: 'Bank Transfer', icon: '🏦', detail: selectedEvent.bankAccount, name: selectedEvent.bankName });
  if (selectedEvent?.jazzCash) paymentMethods.push({ key: 'jazzcash', label: 'JazzCash', icon: '💛', detail: selectedEvent.jazzCash, name: selectedEvent.jazzCashName });
  if (selectedEvent?.easyPaisa) paymentMethods.push({ key: 'easypaisa', label: 'EasyPaisa', icon: '💚', detail: selectedEvent.easyPaisa, name: selectedEvent.easyPaisaName });

  function handleReceiptSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
  }

  // ── Validate details ──
  function validateDetails() {
    if (regType === 'delegate') {
      if (!delegateForm.fullName || !delegateForm.email || !delegateForm.phone) {
        toast.error('Name, email and phone are required'); return false;
      }
      if (!delegateForm.committee) {
        toast.error('Please select a committee'); return false;
      }
      const { totalSeats, totalFilled } = eventSeatInfo(committees);
      if (totalSeats > 0 && totalFilled >= totalSeats) {
        toast.error('This event is fully booked. No seats remaining.');
        return false;
      }
    } else {
      if (!sponsorForm.companyName || !sponsorForm.contactPerson || !sponsorForm.phone) {
        toast.error('Company, contact person and phone are required'); return false;
      }
      if (!sponsorForm.category) {
        toast.error('Please select a sponsor package'); return false;
      }
    }
    return true;
  }

  // ── Submit registration ──
  async function handleSubmit() {
    const regStatus = getRegistrationStatus(selectedEvent);
    if (!regStatus.open) { toast.error(regStatus.message || 'Registration is not available'); return; }
    if (!paymentMethod) { toast.error('Please select a payment method'); return; }
    if (!receiptFile) { toast.error('Payment screenshot is required'); return; }
    setLoading(true);
    try {
      const { data: freshCommsRaw } = await supabase
        .from('committees')
        .select('*')
        .eq('event_id', selectedEvent.id);
      const freshComms = keysToCamel(freshCommsRaw || []);

      if (regType === 'delegate') {
        const { totalSeats, totalFilled } = eventSeatInfo(freshComms);
        if (totalSeats > 0 && totalFilled >= totalSeats) {
          toast.error('Sorry, this event is fully booked! No seats remaining.');
          setLoading(false);
          return;
        }
      }

      let receiptUrl = '';
      if (receiptFile) {
        receiptUrl = await uploadToR2(
          receiptFile,
          `receipts/${currentUser.id}/${Date.now()}_receipt`
        );
      }

      const imageUrl = userProfile?.profileImage || '';
      const committee = freshComms.find(c => c.id === delegateForm.committee);
      const entryFee = regType === 'sponsor'
        ? (selectedEvent.sponsorPackages?.find(p => p.name === sponsorForm.category)?.amount || 0)
        : (selectedEvent.entryFees || 0);

      const regRow = {
        user_id: currentUser.id,
        event_id: selectedEvent.id,
        event_name: selectedEvent.name,
        event_start_date: selectedEvent.startDate || selectedEvent.date || '',
        event_end_date: selectedEvent.endDate || selectedEvent.startDate || selectedEvent.date || '',
        event_banner: selectedEvent.imageUrl || '',
        type: regType,
        payment_status: 'pending',
        image_url: imageUrl,
        ...(regType === 'delegate' ? {
          full_name: delegateForm.fullName,
          email: delegateForm.email,
          phone: delegateForm.phone,
          cnic: delegateForm.cnic,
          committee: delegateForm.committee || null,
          committee_name: committee?.name || '',
        } : {
          company_name: sponsorForm.companyName,
          contact_person: sponsorForm.contactPerson,
          phone: sponsorForm.phone,
          email: sponsorForm.email,
          category: sponsorForm.category,
          full_name: sponsorForm.companyName,
        }),
      };

      const { data: regData, error: regErr } = await supabase
        .from('registrations').insert(regRow).select().single();
      if (regErr) throw regErr;

      const { error: payErr } = await supabase.from('payments').insert({
        user_id: currentUser.id,
        registration_id: regData.id,
        event_id: selectedEvent.id,
        event_name: selectedEvent.name,
        registration_type: regType,
        payment_method: paymentMethod.label,
        receipt_url: receiptUrl,
        status: 'pending',
        amount: entryFee,
      });
      if (payErr) throw payErr;

      if (regType === 'delegate' && delegateForm.committee) {
        const { error: rpcErr } = await supabase.rpc('increment_filled_seats', {
          committee_id: delegateForm.committee
        });
        if (rpcErr) console.error('increment_filled_seats error:', rpcErr);

        setCommittees(prev =>
          prev.map(c =>
            c.id === delegateForm.committee
              ? { ...c, filledSeats: (c.filledSeats || 0) + 1 }
              : c
          )
        );
      }

      invalidateCollection('registrations');
      invalidateCollection('payments');
      setSubmittedRegId(regData.id);
      toast.success('Registration submitted!');
    } catch (e) {
      console.error(e);
      toast.error('Submission failed: ' + (e.message || 'Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setSelectedEvent(null);
    setRegType(null);
    setDelegateForm({ fullName: '', email: '', phone: '', cnic: '', committee: '' });
    setSponsorForm({ companyName: '', contactPerson: '', phone: '', email: '', category: '' });
    setReceiptFile(null);
    setReceiptPreview(null);
    setPaymentMethod(null);
    setSubmittedRegId(null);
    setCommittees([]);
  }

  function handleEventSelect(ev) {
    const regStatus = getRegistrationStatus(ev);
    if (!regStatus.open) {
      toast.error(regStatus.message || 'Registration is not available');
      return;
    }
    supabase
      .from('committees')
      .select('*')
      .eq('event_id', ev.id)
      .then(({ data }) => {
        setCommittees(keysToCamel(data || []));
        setSelectedEvent(ev);
      })
      .catch(console.error);
  }

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

  /* ── Success Screen ── */
  if (submittedRegId)
    return (
      <div className={`relative min-h-screen overflow-hidden ${padClass}`} style={{ backgroundColor: BG_COLOR }}>
        <BackgroundOverlay /><GlowEffects /><Sidebar /><DelegateMobileBar />
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 pb-8 pt-20">
          <div className={`${panelCls} max-w-md text-center`}>
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#8E6B2F]/20 to-[#D7B46A]/20 border border-[#B79143]/30 mb-4">
                <span className="text-4xl">🎉</span>
              </div>
              <h2 className="mb-3 text-2xl font-bold text-[#F8F3EA]">Registration Submitted!</h2>
              <p className="mb-6 text-sm leading-relaxed text-[#b89b84]">
                Your seat is reserved and pending admin approval. Your digital pass will be available once approved.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button type="button" className={btnPrimaryCls} onClick={reset}>Register Another</button>
              <button type="button" className={btnSecondaryCls} onClick={() => navigate('/my-payments')}>My Payments</button>
            </div>
          </div>
        </div>
      </div>
    );

  /* ── Event Selection Grid ── */
  if (!selectedEvent)
    return (
      <div className={`relative min-h-screen overflow-hidden ${padClass}`} style={{ backgroundColor: BG_COLOR }}>
        <BackgroundOverlay /><GlowEffects /><Sidebar /><DelegateMobileBar />
        <div className="relative z-10 px-4 pb-8 pt-20 sm:px-6 md:px-8 md:pt-8">
          <div className="mb-8">
            <p className="text-[#B79143] uppercase tracking-[0.3em] text-[11px] mb-3">Registration</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#F8F3EA]">Event Registration</h1>
          </div>

          <h3 className="mb-6 text-lg font-semibold text-[#F8F3EA]">Available Events</h3>
          {events.length === 0 ? (
            <div className={`${panelCls} text-center py-16`}>
              <div className="text-6xl mb-4">📅</div>
              <p className="text-[#b89b84]">No events available right now.</p>
            </div>
          ) : (
            <div className="grid max-w-5xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {events.map(ev => {
                const banner = ev.imageUrl || DEFAULT_BANNER;
                const dateRange = formatDateRange(ev.startDate || ev.date, ev.endDate);

                return (
                  <div
                    key={ev.id}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleEventSelect(ev); } }}
                    className="group cursor-pointer overflow-hidden rounded-2xl border border-[rgba(183,145,67,0.18)] bg-[rgba(68,7,19,0.58)] backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:border-[#B79143]/40 hover:shadow-[0_0_25px_rgba(183,145,67,0.15)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B79143]/50"
                    onClick={() => handleEventSelect(ev)}
                  >
                    <div className="relative h-44 overflow-hidden">
                      <img src={banner} alt={ev.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" onError={(e) => { e.target.src = DEFAULT_BANNER; }} />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[rgba(68,7,19,0.9)]" />
                      <div className="absolute top-3 right-3">
                        <span className={`rounded-lg px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider ${
                          ev.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                            : 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
                        }`}>
                          {ev.status}
                        </span>
                      </div>
                      <div className="absolute bottom-3 left-4 right-4">
                        <h3 className="text-lg font-bold leading-tight text-[#F8F3EA] drop-shadow-lg">{ev.name}</h3>
                        <p className="text-xs text-[#b89b84] mt-1">{dateRange}</p>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-xs text-[#b89b84]">
                          {ev.venue && <span>📍 {ev.venue}</span>}
                        </div>
                        {ev.entryFees > 0 && (
                          <span className="text-sm font-bold text-[#D7B46A]">
                            {ev.currency || 'PKR'} {Number(ev.entryFees).toLocaleString()}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1.5">
                          {ev.bankAccount && <span className="text-xs px-2 py-0.5 rounded bg-[#B79143]/10 text-[#B79143] border border-[#B79143]/20">🏦</span>}
                          {ev.jazzCash && <span className="text-xs px-2 py-0.5 rounded bg-[#B79143]/10 text-[#B79143] border border-[#B79143]/20">💛</span>}
                          {ev.easyPaisa && <span className="text-xs px-2 py-0.5 rounded bg-[#B79143]/10 text-[#B79143] border border-[#B79143]/20">💚</span>}
                        </div>
                        <span className="text-xs font-semibold text-[#B79143]">Select →</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );

  /* ── Event Landing Page ── */
  const banner = selectedEvent.imageUrl || DEFAULT_BANNER;
  const dateRange = formatDateRange(selectedEvent.startDate || selectedEvent.date, selectedEvent.endDate);
  const eventFull = isEventFull(committees);
  const { totalSeats, totalFilled } = eventSeatInfo(committees);
  const pct = totalSeats > 0 ? Math.min(100, Math.round((totalFilled / totalSeats) * 100)) : 0;

  return (
    <div className={`relative overflow-hidden ${padClass}`} style={{ backgroundColor: BG_COLOR }}>
      <BackgroundOverlay /><GlowEffects /><Sidebar /><DelegateMobileBar />

      {/* ═══ Section 1: Event Overview & Registration Type Selection ═══ */}
      <section className={sectionCls}>
        <div className="relative z-10 w-full max-w-6xl mx-auto">
          <button
            type="button"
            className="mb-6 text-sm text-[#b89b84] hover:text-[#B79143] transition-colors"
            onClick={reset}
          >
            ← Back to Events
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Event Info */}
            <div className="space-y-6">
              <div className="rounded-2xl overflow-hidden border border-[rgba(183,145,67,0.2)]">
                <img src={banner} alt={selectedEvent.name} className="w-full h-48 sm:h-64 object-cover" onError={(e) => { e.target.src = DEFAULT_BANNER; }} />
              </div>

              <div className={`${panelCls}`}>
                <div className="flex items-center gap-3 mb-4">
                  <span className={`rounded-lg px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider ${
                    selectedEvent.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
                  }`}>
                    {selectedEvent.status}
                  </span>
                  {eventFull && (
                    <span className="rounded-lg px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider bg-red-500/30 text-red-300 border border-red-400/40">
                      Full
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold text-[#F8F3EA] mb-4">{selectedEvent.name}</h1>
                {selectedEvent.description && (
                  <p className="text-sm leading-relaxed text-[#d8c2a8] mb-6">{selectedEvent.description}</p>
                )}

                <div className="space-y-3 text-sm">
                  {selectedEvent.venue && (
                    <div className="flex gap-3">
                      <span className="text-[#B79143] font-semibold min-w-[60px]">Venue</span>
                      <span className="text-[#F8F3EA]">📍 {selectedEvent.venue}</span>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <span className="text-[#B79143] font-semibold min-w-[60px]">Date</span>
                    <span className="text-[#F8F3EA]">{dateRange}</span>
                  </div>
                  {selectedEvent.entryFees > 0 && (
                    <div className="flex gap-3">
                      <span className="text-[#B79143] font-semibold min-w-[60px]">Fee</span>
                      <span className="text-[#D7B46A] font-bold">
                        {selectedEvent.currency || 'PKR'} {Number(selectedEvent.entryFees).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Event Capacity Bar */}
                {committees.length > 0 && totalSeats > 0 && (
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#b89b84]">Event Capacity</span>
                      <span className={`text-xs font-bold ${eventFull ? 'text-red-400' : 'text-[#B79143]'}`}>
                        {totalFilled} / {totalSeats}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[rgba(183,145,67,0.1)]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${eventFull ? 'bg-red-400/90' : 'bg-gradient-to-r from-[#8E6B2F] via-[#B79143] to-[#D7B46A]'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Payment Methods */}
                {(selectedEvent.bankAccount || selectedEvent.jazzCash || selectedEvent.easyPaisa) && (
                  <div className="mt-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#b89b84] mb-2">Payment Methods</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedEvent.bankAccount && <span className="rounded-lg border border-[#B79143]/30 bg-[#B79143]/10 px-3 py-1.5 text-xs text-[#B79143]">🏦 Bank</span>}
                      {selectedEvent.jazzCash && <span className="rounded-lg border border-[#B79143]/30 bg-[#B79143]/10 px-3 py-1.5 text-xs text-[#B79143]">💛 JazzCash</span>}
                      {selectedEvent.easyPaisa && <span className="rounded-lg border border-[#B79143]/30 bg-[#B79143]/10 px-3 py-1.5 text-xs text-[#B79143]">💚 EasyPaisa</span>}
                    </div>
                  </div>
                )}

                {/* Sponsor Packages */}
                {selectedEvent.sponsorPackages?.length > 0 && (
                  <div className="mt-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#b89b84] mb-2">Sponsor Packages</p>
                    <div className="space-y-2">
                      {selectedEvent.sponsorPackages.map((pkg) => (
                        <div key={pkg.name} className="rounded-lg border border-[#B79143]/20 bg-[#B79143]/5 px-3 py-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-[#D7B46A]">{pkg.name}</span>
                            {pkg.amount > 0 && (
                              <span className="text-xs font-bold text-[#B79143]">
                                {selectedEvent.currency || 'PKR'} {Number(pkg.amount).toLocaleString()}
                              </span>
                            )}
                          </div>
                          {pkg.details && (
                            <p className="text-xs text-[#b89b84] mt-1">{pkg.details}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Registration Type Selection */}
            <div className="flex flex-col justify-center">
              <div className={`${panelCls} h-full flex flex-col justify-center`}>
                <h2 className="text-xl font-bold text-[#F8F3EA] mb-6 text-center">Select Registration Type</h2>

                <div className="grid grid-cols-1 gap-4">
                  <button
                    type="button"
                    onClick={() => setRegType('delegate')}
                    disabled={eventFull}
                    className={`rounded-2xl border p-6 sm:p-8 text-center transition-all duration-300 relative ${
                      eventFull
                        ? 'border-red-500/20 bg-red-950/10 opacity-60 cursor-not-allowed'
                        : regType === 'delegate'
                        ? 'border-[#B79143] bg-gradient-to-br from-[#B79143]/10 to-[#D7B46A]/5 shadow-lg shadow-[#B79143]/10 scale-[1.02]'
                        : 'border-[rgba(183,145,67,0.2)] bg-[rgba(68,7,19,0.4)] hover:border-[#B79143]/40 hover:bg-[rgba(68,7,19,0.6)]'
                    }`}
                  >
                    {eventFull && (
                      <div className="absolute top-3 right-3">
                        <span className="rounded-lg px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider bg-red-500/30 text-red-300 border border-red-400/40">Full</span>
                      </div>
                    )}
                    <div className="text-5xl mb-4">🧑‍💼</div>
                    <div className="text-lg font-bold text-[#F8F3EA] mb-2">Delegate</div>
                    <div className="text-sm text-[#b89b84]">Join a committee and represent your position.</div>
                    {eventFull && <div className="mt-2 text-xs text-red-400">Event is fully booked</div>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegType('sponsor')}
                    className={`rounded-2xl border p-6 sm:p-8 text-center transition-all duration-300 ${
                      regType === 'sponsor'
                        ? 'border-[#B79143] bg-gradient-to-br from-[#B79143]/10 to-[#D7B46A]/5 shadow-lg shadow-[#B79143]/10 scale-[1.02]'
                        : 'border-[rgba(183,145,67,0.2)] bg-[rgba(68,7,19,0.4)] hover:border-[#B79143]/40 hover:bg-[rgba(68,7,19,0.6)]'
                    }`}
                  >
                    <div className="text-5xl mb-4">🏢</div>
                    <div className="text-lg font-bold text-[#F8F3EA] mb-2">Sponsor</div>
                    <div className="text-sm text-[#b89b84]">Support the event as a corporate sponsor.</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Section 2: Details & Payment (shown when regType is selected) ═══ */}
      {regType && (
        <section className={sectionCls}>
          <div className="relative z-10 w-full max-w-6xl mx-auto">
            <h2 className="text-xl font-bold text-[#F8F3EA] mb-8">
              {regType === 'delegate' ? '🧑‍💼 Delegate Registration' : '🏢 Sponsor Registration'}
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Details Form */}
              <div className={`${panelCls}`}>
                <h3 className="text-lg font-semibold text-[#F8F3EA] mb-6">Your Details</h3>

                {regType === 'delegate' ? (
                  <div className="space-y-4">
                    <div>
                      <label className={labelCls}>Full Name *</label>
                      <input className={inputCls} placeholder="John Smith" value={delegateForm.fullName} onChange={(e) => setDelegateForm({ ...delegateForm, fullName: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls}>Email *</label>
                      <input className={inputCls} type="email" placeholder="john@email.com" value={delegateForm.email} onChange={(e) => setDelegateForm({ ...delegateForm, email: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls}>Phone *</label>
                      <input className={inputCls} placeholder="+92 300 0000000" value={delegateForm.phone} onChange={(e) => setDelegateForm({ ...delegateForm, phone: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls}>CNIC <span className="font-normal text-[#b89b84] normal-case tracking-normal">(optional)</span></label>
                      <input className={inputCls} placeholder="XXXXX-XXXXXXX-X" value={delegateForm.cnic} onChange={(e) => setDelegateForm({ ...delegateForm, cnic: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls}>Committee *</label>
                      {committees.length === 0 ? (
                        <div className={warningBoxCls}>No committees available for this event yet.</div>
                      ) : (
                        <>
                          <select
                            className={selectCls}
                            value={delegateForm.committee}
                            onChange={(e) => setDelegateForm({ ...delegateForm, committee: e.target.value })}
                            style={{ minHeight: '50px' }}
                          >
                            <option value="">— Select a committee —</option>
                            {committees.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                          <p className="mt-2 text-[0.68rem] text-[#b89b84]">
                            All committees are open regardless of individual fill counts. Admin will manage allocations.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className={labelCls}>Company Name *</label>
                      <input className={inputCls} placeholder="Acme Corp" value={sponsorForm.companyName} onChange={(e) => setSponsorForm({ ...sponsorForm, companyName: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls}>Contact Person *</label>
                      <input className={inputCls} placeholder="Jane Doe" value={sponsorForm.contactPerson} onChange={(e) => setSponsorForm({ ...sponsorForm, contactPerson: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls}>Phone *</label>
                      <input className={inputCls} placeholder="+92 300 0000000" value={sponsorForm.phone} onChange={(e) => setSponsorForm({ ...sponsorForm, phone: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls}>Email</label>
                      <input className={inputCls} type="email" placeholder="contact@company.com" value={sponsorForm.email} onChange={(e) => setSponsorForm({ ...sponsorForm, email: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelCls}>Sponsorship Package *</label>
                      <select
                        className={selectCls}
                        value={sponsorForm.category}
                        onChange={(e) => setSponsorForm({ ...sponsorForm, category: e.target.value })}
                        style={{ minHeight: '50px' }}
                      >
                        <option value="">— Select a package —</option>
                        {(selectedEvent?.sponsorPackages || []).map((pkg) => (
                          <option key={pkg.name} value={pkg.name}>
                            {pkg.name}{pkg.amount > 0 ? ` — ${selectedEvent.currency || 'PKR'} ${Number(pkg.amount).toLocaleString()}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Payment */}
              <div className={`${panelCls}`}>
                <h3 className="text-lg font-semibold text-[#F8F3EA] mb-6">Payment</h3>

                {/* Fee Display */}
                {(() => {
                  const fee = regType === 'sponsor'
                    ? selectedEvent?.sponsorPackages?.find((p) => p.name === sponsorForm.category)?.amount || 0
                    : selectedEvent?.entryFees || 0;
                  return fee > 0 ? (
                    <div className="mb-6 rounded-2xl border border-[#B79143]/30 bg-gradient-to-br from-[#B79143]/10 to-[#D7B46A]/5 p-5">
                      <div className="flex items-center gap-4">
                        <div className="text-3xl">🎟️</div>
                        <div>
                          <div className={labelCompactCls}>
                            {regType === 'sponsor' ? `${sponsorForm.category || 'Sponsor'} Package Fee` : 'Registration Fee'}
                          </div>
                          <div className="text-3xl font-bold text-[#D7B46A]">
                            {selectedEvent?.currency || 'PKR'} {Number(fee).toLocaleString()}
                          </div>
                          <div className="mt-1 text-xs text-[#b89b84]">Transfer this exact amount</div>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Payment Method Selection */}
                <div className="mb-6">
                  <label className={labelCls}>Select Payment Method</label>
                  {paymentMethods.length === 0 ? (
                    <div className={warningBoxCls}>No payment methods configured. Contact admin.</div>
                  ) : (
                    <div className="grid gap-3">
                      {paymentMethods.map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => setPaymentMethod(m)}
                          className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-300 ${
                            paymentMethod?.key === m.key
                              ? 'border-[#B79143] bg-gradient-to-r from-[#B79143]/10 to-[#D7B46A]/5 shadow-lg shadow-[#B79143]/10'
                              : 'border-[rgba(183,145,67,0.2)] bg-[rgba(68,7,19,0.4)] hover:border-[#B79143]/40'
                          }`}
                        >
                          <span className="text-3xl">{m.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-[#F8F3EA]">{m.label}</div>
                            {m.name && <div className="text-xs text-[#b89b84] mt-0.5">{m.name}</div>}
                          </div>
                          {paymentMethod?.key === m.key && (
                            <div className="w-8 h-8 rounded-full bg-[#B79143] flex items-center justify-center">
                              <span className="text-[#2A0B12] text-sm font-bold">✓</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Account Details */}
                {paymentMethod && (
                  <div className={`${infoBoxCls} mb-6`}>
                    <div className={labelCompactCls}>Account Details — {paymentMethod.label}</div>
                    {paymentMethod.name && <div className="mb-2 text-sm text-[#b89b84]">{paymentMethod.name}</div>}
                    <div className="text-xl font-mono tracking-wider text-[#D7B46A] bg-[rgba(0,0,0,0.3)] rounded-lg p-3 select-all">
                      {paymentMethod.detail}
                    </div>
                  </div>
                )}

                {/* Receipt Upload */}
                <div className="mb-6">
                  <label className={labelCls}>
                    Payment Screenshot *
                  </label>
                  <input type="file" ref={receiptRef} className="hidden" accept="image/*,application/pdf" onChange={handleReceiptSelect} />
                  {receiptPreview ? (
                    <div className="mt-3">
                      <img src={receiptPreview} alt="Receipt" className="max-h-[200px] w-full rounded-xl border border-[#B79143]/30 object-contain bg-[rgba(0,0,0,0.2)]" />
                      <button
                        type="button"
                        className="mt-3 text-xs text-red-400 hover:text-red-300 transition-colors"
                        onClick={() => { setReceiptFile(null); setReceiptPreview(null); if (receiptRef.current) receiptRef.current.value = ''; }}
                      >
                        Remove screenshot
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="mt-3 w-full rounded-xl border-2 border-dashed border-[rgba(183,145,67,0.3)] bg-[rgba(0,0,0,0.2)] px-4 py-8 text-center transition-all duration-300 hover:border-[#B79143]/50 hover:bg-[rgba(183,145,67,0.05)]"
                      onClick={() => receiptRef.current?.click()}
                    >
                      <div className="text-4xl mb-3">📎</div>
                      <div className="text-sm font-semibold text-[#B79143]">Click to upload payment screenshot</div>
                      <div className="mt-1 text-xs text-[#b89b84]">JPG, PNG, or PDF</div>
                    </button>
                  )}
                </div>

                {/* Warning */}
                <div className={`${warningBoxCls} mb-6`}>
                  ⚠️ Your seat is <strong className="text-amber-200">reserved immediately</strong>. Status will show as{' '}
                  <strong className="text-amber-200">"Pending"</strong> until admin approves your receipt. If rejected, your seat will be released.
                </div>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button type="button" className={btnSecondaryCls} onClick={() => setRegType(null)}>
                    ← Change Type
                  </button>
                  <button
                    type="button"
                    className={btnPrimaryCls}
                    onClick={() => { if (validateDetails()) handleSubmit(); }}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-[#2A0B12]/30 border-t-[#2A0B12] rounded-full animate-spin" />
                        Submitting…
                      </span>
                    ) : (
                      'Submit Registration ✓'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}