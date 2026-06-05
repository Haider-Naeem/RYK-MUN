import { useState, useEffect } from 'react';
import { supabase } from '../../supabase/config';
import { useAuth } from '../../hooks/useAuth';
import Sidebar, { DelegateMobileBar, adminPadClass } from '../Shared/Sidebar';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { keysToCamel, invalidateCollection } from '../../utils/cache';
import { useNavigate } from 'react-router-dom';
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
const BORDER_GOLD_MEDIUM = 'rgba(183,145,67,0.28)';
const BORDER_GOLD_STRONG = 'rgba(183,145,67,0.3)';

function canRequestRefund(payment, registrations, refundRequests, events) {
  // 1. Check payment status
  if (payment.status !== 'approved' && payment.status !== 'pending') 
    return { allowed: false, reason: null };

  // 2. Check if already requested
  const existing = refundRequests.find(r => r.paymentId === payment.id);
  if (existing) return { allowed: false, reason: null };

  // 3. Get registration and event details
  const reg = registrations.find(r => r.id === payment.registrationId);
  if (!reg) return { allowed: false, reason: null };

  // 4. Get event to check registration dates
  const event = events.find(e => e.id === (payment.eventId || reg.eventId));
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 5. PRIMARY CHECK: Event's Registration End Date
  if (event?.registrationEndDate) {
    const regEnd = new Date(event.registrationEndDate);
    regEnd.setHours(23, 59, 59, 999);
    
    const daysUntilRegEnd = Math.ceil((regEnd.getTime() - today.getTime()) / 86400000);
    
    if (today > regEnd) {
      return { 
        allowed: false, 
        reason: 'Registration has closed. Cancellations are no longer accepted.' 
      };
    }
    
    return { 
      allowed: true, 
      daysUntil: daysUntilRegEnd,
      deadline: event.registrationEndDate 
    };
  }

  // 6. FALLBACK: Check Event Start Date (if no registration end date set)
  const startDate = reg.eventStartDate || payment.eventStartDate || event?.startDate || event?.date;
  
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const daysUntilEvent = Math.ceil((start.getTime() - today.getTime()) / 86400000);
    
    if (daysUntilEvent <= 0) {
      return { 
        allowed: false, 
        reason: 'Event has already started. Cancellations are no longer possible.' 
      };
    }
    
    if (daysUntilEvent <= 7) {
      return { 
        allowed: false, 
        reason: `Only ${daysUntilEvent} day${daysUntilEvent === 1 ? '' : 's'} until the event — deadline has passed.` 
      };
    }
    
    return { allowed: true, daysUntil: daysUntilEvent };
  }
  
  // 7. No dates available - allow cancellation
  return { allowed: true, daysUntil: null };
}

function refundStatusBadgeClass(status) {
  if (status === 'approved') return 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30';
  if (status === 'rejected') return 'bg-red-500/15 text-red-300 border border-red-400/30';
  return 'bg-amber-500/15 text-amber-200 border border-amber-400/30';
}

function payBadgeClass(status) {
  if (status === 'approved') return 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30';
  if (status === 'rejected') return 'bg-red-500/15 text-red-300 border border-red-400/30';
  return 'bg-amber-500/15 text-amber-200 border border-amber-400/30';
}

export default function MyPayments() {
  const { currentUser, userProfile } = useAuth();
  const padClass = adminPadClass(userProfile);
  const navigate = useNavigate();

  const isDelegate = userProfile?.role !== 'admin';

  const [payments, setPayments] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [refundRequests, setRefundRequests] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [imageModal, setImageModal] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    async function load() {
      try {
        const [{ data: pays, error: pErr }, { data: regs, error: rErr }, { data: evts, error: eErr }] = await Promise.all([
          supabase.from('payments').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }),
          supabase.from('registrations').select('*').eq('user_id', currentUser.id),
          supabase.from('events').select('*'),
        ]);
        if (pErr) throw pErr;
        if (rErr) throw rErr;
        if (eErr) throw eErr;
        
        setPayments(keysToCamel(pays));
        setRegistrations(keysToCamel(regs));
        setEvents(keysToCamel(evts || []));

        const { data: rf } = await supabase
          .from('refund_requests')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false });
        setRefundRequests(keysToCamel(rf || []));
      } catch (e) {
        console.error(e);
        toast.error('Failed to load payments.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser]);

  async function submitCancel() {
    if (!cancelModal) return;
    setSubmitting(true);
    try {
      const isPending = cancelModal.status === 'pending';
      const row = {
        user_id: currentUser.id,
        payment_id: cancelModal.id,
        registration_id: cancelModal.registrationId,
        event_id: cancelModal.eventId,
        event_name: cancelModal.eventName,
        amount: cancelModal.amount || 0,
        registration_type: cancelModal.registrationType,
        reason: cancelReason.trim(),
        payment_status: cancelModal.status,
        request_type: isPending ? 'cancel' : 'refund',
        status: 'pending',
      };

      const { data, error } = await supabase.from('refund_requests').insert(row).select().single();
      if (error) throw error;

      invalidateCollection('refundRequests');
      setRefundRequests(prev => [keysToCamel(data), ...prev]);
      toast.success(isPending ? '✅ Cancellation request submitted.' : '✅ Refund request submitted.');
      setCancelModal(null);
      setCancelReason('');
    } catch (e) {
      toast.error('Failed: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const counts = {
    all: payments.length,
    pending: payments.filter(p => p.status === 'pending').length,
    approved: payments.filter(p => p.status === 'approved').length,
    rejected: payments.filter(p => p.status === 'rejected').length,
    refunds: refundRequests.length,
  };
  const isRefundTab = activeTab === 'refunds';
  const filtered = isRefundTab ? [] : activeTab === 'all' ? payments : payments.filter(p => p.status === activeTab);

  const thCls = 'py-3 pr-4 text-left text-xs font-bold uppercase tracking-[0.15em] text-[#B79143]';
  const inputCls =
    'w-full rounded-xl border border-[rgba(183,145,67,0.25)] bg-[rgba(0,0,0,0.4)] backdrop-blur-sm px-4 py-3.5 text-sm text-[#F8F3EA] placeholder:text-[#b89b84] focus:border-[#B79143] focus:outline-none focus:ring-2 focus:ring-[#B79143]/20 transition-all duration-300';
  const labelCls = 'mb-2 block text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[#B79143]';

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
    <div className={`relative min-h-screen overflow-hidden ${padClass}`} style={{ backgroundColor: BG_COLOR }}>
      <BackgroundOverlay />
      <GlowEffects />
      <Sidebar />
      <DelegateMobileBar />
      
      <div className="relative z-10 min-h-screen flex items-center justify-center px-2 sm:px-5 py-20 sm:py-10">
        <div className="w-full max-w-6xl">
          
          {isDelegate && (
            <>
              <button
                onClick={() => navigate("/")}
                className="hidden sm:flex items-center gap-2 text-[#B79143] hover:text-[#F8F3EA] transition text-sm font-medium mb-4"
              >
                ← Back to Home
              </button>
              <button
                onClick={() => navigate("/")}
                className="sm:hidden flex items-center gap-2 text-[#B79143] hover:text-[#F8F3EA] transition text-sm font-medium mb-4"
              >
                ← Back
              </button>
            </>
          )}

          <div className="mb-8">
            <p className="text-[#B79143] uppercase tracking-[0.3em] text-[11px] mb-3">Payments</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#F8F3EA]">My Payments</h1>
          </div>

          {/* Tabs */}
          <div className="mb-6 flex gap-0 overflow-x-auto border-b pb-px" style={{ borderColor: 'rgba(183,145,67,0.25)' }}>
            {[
              { key: 'all', label: `All (${counts.all})` },
              { key: 'pending', label: `Pending (${counts.pending})` },
              { key: 'approved', label: `Approved (${counts.approved})` },
              { key: 'rejected', label: `Rejected (${counts.rejected})` },
              { key: 'refunds', label: `🔄 Refunds / Cancellations (${counts.refunds})` },
            ].map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide transition sm:px-5 sm:text-sm ${
                  activeTab === t.key
                    ? 'border-[#B79143] text-[#B79143]'
                    : 'border-transparent text-[#b89b84] hover:text-[#F8F3EA]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Refund Requests Tab */}
          {isRefundTab ? (
            <div 
              className="animate-fade-in rounded-2xl border backdrop-blur-xl p-4 sm:p-6"
              style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-[#F8F3EA]">My Refund & Cancellation Requests</h3>
                <span className="text-sm text-[#b89b84]">{refundRequests.length} total</span>
              </div>
              {loading ? (
                <div className="grid min-h-40 place-items-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#B79143]/30 border-t-[#B79143]" />
                </div>
              ) : refundRequests.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mb-3 text-4xl">🎉</div>
                  <p className="text-sm text-[#b89b84]">No refund or cancellation requests yet.</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b" style={{ borderColor: 'rgba(183,145,67,0.15)' }}>
                          <th className={thCls}>Event</th>
                          <th className={thCls}>Type</th>
                          <th className={thCls}>Request</th>
                          <th className={thCls}>Amount</th>
                          <th className={thCls}>Reason</th>
                          <th className={thCls}>Submitted</th>
                          <th className={thCls}>Status</th>
                          <th className={thCls}>Admin Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: 'rgba(183,145,67,0.1)' }}>
                        {refundRequests.map(r => (
                          <tr key={r.id} className="hover:bg-[rgba(183,145,67,0.04)] transition-colors">
                            <td className="py-3 pr-4 font-semibold text-[#F8F3EA]">{r.eventName || '—'}</td>
                            <td className="py-3 pr-4">
                              <span className="rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase text-[#B79143]" style={{ borderColor: 'rgba(183,145,67,0.3)', backgroundColor: 'rgba(183,145,67,0.08)' }}>
                                {r.registrationType}
                              </span>
                            </td>
                            <td className="py-3 pr-4">
                              <span className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase ${
                                r.requestType === 'cancel'
                                  ? 'border border-amber-400/40 bg-amber-500/15 text-amber-200'
                                  : 'border border-[#B79143]/30 bg-[#B79143]/10 text-[#B79143]'
                              }`}>
                                {r.requestType === 'cancel' ? '❌ Cancel' : '🔄 Refund'}
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-[#F8F3EA]">{formatCurrency(r.amount)}</td>
                            <td className="max-w-[160px] py-3 pr-4 text-[#b89b84]">{r.reason || <span className="italic">—</span>}</td>
                            <td className="py-3 pr-4 text-xs text-[#b89b84]">{formatDate(r.createdAt)}</td>
                            <td className="py-3 pr-4">
                              <span className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase ${refundStatusBadgeClass(r.status)}`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="py-3 text-xs text-[#b89b84]">{r.adminNote || <span className="italic">—</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-4">
                    {refundRequests.map(r => (
                      <div
                        key={r.id}
                        className="rounded-2xl border backdrop-blur-sm p-4 space-y-3"
                        style={{ borderColor: BORDER_GOLD, backgroundColor: CARD_BG }}
                      >
                        <div className="flex items-start justify-between">
                          <h4 className="font-semibold text-[#F8F3EA]">{r.eventName || '—'}</h4>
                          <span className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase ${refundStatusBadgeClass(r.status)}`}>
                            {r.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1">Type</p>
                            <p className="text-[#F8F3EA]">{r.registrationType || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1">Request</p>
                            <p className="text-[#F8F3EA]">{r.requestType === 'cancel' ? '❌ Cancel' : '🔄 Refund'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1">Amount</p>
                            <p className="text-[#F8F3EA] font-medium">{formatCurrency(r.amount)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1">Submitted</p>
                            <p className="text-[#b89b84] text-xs">{formatDate(r.createdAt)}</p>
                          </div>
                        </div>
                        {r.reason && (
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1">Reason</p>
                            <p className="text-sm text-[#b89b84]">{r.reason}</p>
                          </div>
                        )}
                        {r.adminNote && (
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1">Admin Note</p>
                            <p className="text-sm text-[#b89b84]">{r.adminNote}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Payments Tab */
            <div 
              className="rounded-2xl border backdrop-blur-xl p-4 sm:p-6"
              style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}
            >
              {loading ? (
                <div className="grid min-h-40 place-items-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#B79143]/30 border-t-[#B79143]" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mb-3 text-4xl">💳</div>
                  <p className="text-sm text-[#b89b84]">No payments found.</p>
                  <button
                    type="button"
                    className="mt-5 rounded-xl bg-gradient-to-r from-[#8E6B2F] via-[#B79143] to-[#D7B46A] px-5 py-2.5 text-sm font-semibold text-[#2A0B12] transition-all duration-300 hover:scale-[1.02]"
                    onClick={() => navigate('/register-event')}
                  >
                    Register for an Event
                  </button>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b" style={{ borderColor: 'rgba(183,145,67,0.15)' }}>
                          <th className={thCls}>Event</th>
                          <th className={thCls}>Type</th>
                          <th className={thCls}>Method</th>
                          <th className={thCls}>Amount</th>
                          <th className={thCls}>Receipt</th>
                          <th className={thCls}>Date</th>
                          <th className={thCls}>Status</th>
                          <th className={thCls}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: 'rgba(183,145,67,0.1)' }}>
                        {filtered.map(p => {
                          const refundCheck = canRequestRefund(p, registrations, refundRequests, events);
                          const existingRefund = refundRequests.find(r => r.paymentId === p.id);
                          const isPending = p.status === 'pending';
                          return (
                            <tr key={p.id} className="hover:bg-[rgba(183,145,67,0.04)] transition-colors">
                              <td className="py-3 pr-4 font-semibold text-[#F8F3EA]">{p.eventName}</td>
                              <td className="py-3 pr-4">
                                <span className="rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase text-[#B79143]" style={{ borderColor: 'rgba(183,145,67,0.3)', backgroundColor: 'rgba(183,145,67,0.08)' }}>
                                  {p.registrationType}
                                </span>
                              </td>
                              <td className="py-3 pr-4 text-[#b89b84]">{p.paymentMethod}</td>
                              <td className="py-3 pr-4 text-[#F8F3EA]">{formatCurrency(p.amount)}</td>
                              <td className="py-3 pr-4">
                                {p.receiptUrl ? (
                                  <img
                                    src={p.receiptUrl}
                                    alt="Receipt"
                                    className="size-[60px] cursor-pointer rounded-lg border object-cover transition hover:scale-110"
                                    style={{ borderColor: BORDER_GOLD_STRONG }}
                                    onClick={() => setImageModal(p.receiptUrl)}
                                  />
                                ) : (
                                  <span className="text-xs text-[#b89b84]">—</span>
                                )}
                              </td>
                              <td className="py-3 pr-4 text-xs text-[#b89b84]">{formatDate(p.createdAt)}</td>
                              <td className="py-3 pr-4">
                                <div className="flex flex-col gap-1">
                                  <span className={`w-fit rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase ${payBadgeClass(p.status)}`}>{p.status}</span>
                                  {existingRefund && (
                                    <span className={`w-fit rounded-lg px-2.5 py-1 text-[9px] font-semibold uppercase ${refundStatusBadgeClass(existingRefund.status)}`}>
                                      {existingRefund.requestType === 'cancel' ? 'Cancel' : 'Refund'} {existingRefund.status}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3">
                                <div className="flex flex-col gap-1.5">
                                  {p.status === 'approved' && (
                                    <button
                                      type="button"
                                      className="w-fit rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/25"
                                      onClick={() => navigate('/my-card', { state: { regId: p.registrationId } })}
                                    >
                                      🎫 View Card
                                    </button>
                                  )}
                                  {refundCheck.allowed && !existingRefund && (
                                    <button
                                      type="button"
                                      className="w-fit rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-1.5 text-[11px] font-semibold text-red-300 transition hover:bg-red-500/25"
                                      onClick={() => {
                                        setCancelModal(p);
                                        setCancelReason('');
                                      }}
                                    >
                                      {isPending ? '❌ Cancel Request' : '🔄 Cancel & Refund'}
                                    </button>
                                  )}
                                  {!refundCheck.allowed && refundCheck.reason && !existingRefund && (
                                    <div className="max-w-[160px] text-[11px] leading-snug text-[#b89b84]">⚠️ {refundCheck.reason}</div>
                                  )}
                                  {existingRefund?.status === 'pending' && (
                                    <span className="text-[11px] italic text-[#b89b84]">
                                      {existingRefund.requestType === 'cancel' ? 'Cancellation' : 'Refund'} under review
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-4">
                    {filtered.map(p => {
                      const refundCheck = canRequestRefund(p, registrations, refundRequests, events);
                      const existingRefund = refundRequests.find(r => r.paymentId === p.id);
                      const isPending = p.status === 'pending';
                      return (
                        <div
                          key={p.id}
                          className="rounded-2xl border backdrop-blur-sm p-4 space-y-3"
                          style={{ borderColor: BORDER_GOLD, backgroundColor: CARD_BG }}
                        >
                          <div className="flex items-start justify-between">
                            <h4 className="font-semibold text-[#F8F3EA] text-base">{p.eventName}</h4>
                            <div className="flex flex-col gap-1 items-end">
                              <span className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase ${payBadgeClass(p.status)}`}>{p.status}</span>
                              {existingRefund && (
                                <span className={`rounded-lg px-2.5 py-1 text-[9px] font-semibold uppercase ${refundStatusBadgeClass(existingRefund.status)}`}>
                                  {existingRefund.requestType} {existingRefund.status}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1">Type</p>
                              <p className="text-[#F8F3EA]">{p.registrationType || '—'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1">Method</p>
                              <p className="text-[#b89b84]">{p.paymentMethod || '—'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1">Amount</p>
                              <p className="text-[#F8F3EA] font-medium">{formatCurrency(p.amount)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1">Date</p>
                              <p className="text-[#b89b84] text-xs">{formatDate(p.createdAt)}</p>
                            </div>
                          </div>

                          {p.receiptUrl && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-2">Receipt</p>
                              <img
                                src={p.receiptUrl}
                                alt="Receipt"
                                className="w-full max-h-[120px] rounded-lg border object-contain cursor-pointer transition hover:scale-[1.02]"
                                style={{ borderColor: BORDER_GOLD_STRONG }}
                                onClick={() => setImageModal(p.receiptUrl)}
                              />
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 pt-2 border-t" style={{ borderColor: 'rgba(183,145,67,0.1)' }}>
                            {p.status === 'approved' && (
                              <button
                                type="button"
                                className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/25"
                                onClick={() => navigate('/my-card', { state: { regId: p.registrationId } })}
                              >
                                🎫 View Card
                              </button>
                            )}
                            {refundCheck.allowed && !existingRefund && (
                              <button
                                type="button"
                                className="rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/25"
                                onClick={() => {
                                  setCancelModal(p);
                                  setCancelReason('');
                                }}
                              >
                                {isPending ? '❌ Cancel' : '🔄 Refund'}
                              </button>
                            )}
                            {!refundCheck.allowed && refundCheck.reason && !existingRefund && (
                              <p className="text-xs text-[#b89b84]">⚠️ {refundCheck.reason}</p>
                            )}
                            {existingRefund?.status === 'pending' && (
                              <span className="text-xs italic text-[#b89b84]">Under review</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Policy Notice */}
          {!isRefundTab && (
            <div 
              className="mt-4 max-w-2xl rounded-xl border p-4 text-sm"
              style={{ borderColor: 'rgba(183,145,67,0.2)', backgroundColor: 'rgba(183,145,67,0.08)' }}
            >
              <strong className="text-[#B79143]">Cancellation & Refund Policy:</strong>{' '}
              <span className="text-[#F8F3EA]">
                Cancellation requests must be submitted <strong>before the registration end date</strong>. 
                Once registration closes, cancellations are no longer accepted. 
                All refunds are subject to admin approval.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      {cancelModal && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setCancelModal(null)}
        >
          <div 
            className="flex max-h-[90vh] w-full max-w-[480px] flex-col overflow-hidden rounded-2xl border shadow-2xl"
            style={{ borderColor: BORDER_GOLD_STRONG, backgroundColor: BG_COLOR }}
          >
            <div 
              className="sticky top-0 flex items-center justify-between px-5 py-4"
              style={{ borderBottom: `1px solid ${BORDER_GOLD_STRONG}`, backgroundColor: BG_COLOR }}
            >
              <h3 className="text-base font-bold text-[#F8F3EA]">
                {cancelModal.status === 'pending' ? '❌ Request Cancellation' : '🔄 Request Cancellation & Refund'}
              </h3>
              <button
                type="button"
                className="rounded-lg border px-2 py-1 text-sm text-[#B79143] hover:bg-[#B79143]/10 transition"
                style={{ borderColor: BORDER_GOLD_STRONG }}
                onClick={() => setCancelModal(null)}
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <div 
                className="mb-4 rounded-xl border p-4 text-sm"
                style={{ borderColor: 'rgba(183,145,67,0.2)', backgroundColor: 'rgba(183,145,67,0.08)' }}
              >
                <p className="text-[#F8F3EA]"><strong className="text-[#B79143]">Event:</strong> {cancelModal.eventName}</p>
                <p className="text-[#F8F3EA]"><strong className="text-[#B79143]">Amount:</strong> {formatCurrency(cancelModal.amount)}</p>
                <p className="text-[#F8F3EA]"><strong className="text-[#B79143]">Payment Status:</strong> {cancelModal.status}</p>
              </div>
              {cancelModal.status === 'pending' && (
                <div 
                  className="mb-4 rounded-xl border p-4 text-sm"
                  style={{ borderColor: 'rgba(183,145,67,0.2)', backgroundColor: 'rgba(183,145,67,0.08)' }}
                >
                  <span className="text-[#F8F3EA]">💡 Since payment is still <strong>pending</strong>, no refund is needed.</span>
                </div>
              )}
              <div className="mb-4">
                <label className={labelCls}>Reason for Cancellation</label>
                <textarea
                  className={`${inputCls} resize-y`}
                  rows={3}
                  placeholder="Please explain why…"
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                />
              </div>
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                ⚠️{' '}
                Cancellations are subject to admin review and registration deadline policies. 
                Requests submitted after registration closes will not be accepted.
              </div>
            </div>
            <div 
              className="sticky bottom-0 flex flex-wrap justify-end gap-3 px-5 py-4"
              style={{ borderTop: `1px solid ${BORDER_GOLD_STRONG}`, backgroundColor: BG_COLOR }}
            >
              <button
                type="button"
                className="rounded-xl border px-5 py-2.5 text-sm font-semibold text-[#B79143] transition-all duration-300 hover:bg-[#B79143]/10"
                style={{ borderColor: BORDER_GOLD_STRONG }}
                onClick={() => setCancelModal(null)}
              >
                Keep Registration
              </button>
              <button
                type="button"
                className="rounded-xl border border-red-400/40 bg-red-500/15 px-5 py-2.5 text-sm font-semibold text-red-300 transition-all duration-300 hover:bg-red-500/25 disabled:opacity-50"
                onClick={submitCancel}
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {imageModal && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm cursor-pointer"
          onClick={() => setImageModal(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={imageModal}
              alt="Receipt"
              className="max-w-full max-h-[85vh] rounded-2xl border object-contain shadow-2xl"
              style={{ borderColor: BORDER_GOLD_STRONG }}
            />
            <button
              type="button"
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#B79143] text-[#2A0B12] flex items-center justify-center text-sm font-bold hover:scale-110 transition shadow-lg"
              onClick={() => setImageModal(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}