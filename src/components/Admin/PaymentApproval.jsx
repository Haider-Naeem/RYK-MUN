// src/components/Admin/PaymentApproval.jsx

import { useState, useEffect } from 'react';
import { supabase } from '../../supabase/config';
import { usePermissions } from '../../hooks/usePermissions';
import Sidebar from '../Shared/Sidebar';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { keysToCamel } from '../../utils/cache';
import toast from 'react-hot-toast';
import bk from "../../Assets/bk.webp";

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
const labelCls = 'mb-2 block text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[#B79143]';

function statusBadge(status, size = 'sm') {
  const base = `inline-block rounded-lg px-3 py-1 uppercase tracking-[0.15em] font-bold ${size === 'lg' ? 'text-xs px-4 py-1.5' : 'text-[10px]'}`;
  if (status === 'approved')  return `${base} bg-emerald-500/15 text-emerald-300 border border-emerald-400/30`;
  if (status === 'rejected')  return `${base} bg-red-500/15 text-red-300 border border-red-400/30`;
  if (status === 'refunded')  return `${base} bg-[rgba(183,145,67,0.15)] text-[#D7B46A] border border-[rgba(183,145,67,0.3)]`;
  if (status === 'cancelled') return `${base} bg-red-500/15 text-red-300 border border-red-400/30`;
  return `${base} bg-amber-500/15 text-amber-200 border border-amber-400/30`;
}

function ReceiptModal({ url, onClose }) {
  if (!url) return null;
  const isPdf = url.toLowerCase().includes('.pdf');
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[2000] backdrop-blur-md p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="flex flex-col items-center gap-4 max-w-[90vw] max-h-[90vh]">
        <div className="flex justify-between items-center w-full px-1">
          <span className="text-[#B79143] font-bold text-sm uppercase tracking-wider">📎 Payment Receipt</span>
          <div className="flex gap-2">
            <a href={url} download target="_blank" rel="noreferrer">
              <button className="rounded-xl border px-3 py-1.5 text-xs text-[#B79143] hover:bg-[rgba(183,145,67,0.08)] transition" style={{ borderColor: BORDER_GOLD_MEDIUM }}>⬇️ Download</button>
            </a>
            <button className="rounded-xl border px-3 py-1.5 text-xs text-[#B79143] hover:bg-[rgba(183,145,67,0.08)] transition" style={{ borderColor: BORDER_GOLD_MEDIUM }} onClick={onClose}>✕ Close</button>
          </div>
        </div>
        {isPdf
          ? <iframe src={url} title="Payment Receipt" className="border rounded-xl bg-white" style={{ borderColor: BORDER_GOLD_STRONG, width: '80vw', height: '80vh' }} />
          : <img src={url} alt="Payment Receipt" className="max-w-[85vw] max-h-[80vh] object-contain rounded-xl border shadow-2xl" style={{ borderColor: BORDER_GOLD_STRONG }} />
        }
      </div>
    </div>
  );
}

export default function PaymentApproval() {
  const { canEdit } = usePermissions();

  const [payments,       setPayments]       = useState([]);
  const [registrations,  setRegistrations]  = useState([]);
  const [refundRequests, setRefundRequests] = useState([]);
  const [events,         setEvents]         = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [activeTab,      setActiveTab]      = useState('pending');
  const [filterEvent,    setFilterEvent]    = useState('all');
  const [filterMethod,   setFilterMethod]   = useState('all');
  const [filterType,     setFilterType]     = useState('all');
  const [selected,       setSelected]       = useState(null);
  const [actionLoading,  setActionLoading]  = useState(false);
  const [receiptModal,   setReceiptModal]   = useState(null);
  const [refundAction,   setRefundAction]   = useState(null);
  const [refundNote,     setRefundNote]     = useState('');

  async function fetchAll() {
    try {
      const [{ data: pays }, { data: regs }, { data: evs }, { data: rfs }] = await Promise.all([
        supabase.from('payments').select('*').order('created_at', { ascending: false }),
        supabase.from('registrations').select('*'),
        supabase.from('events').select('id, name'),
        supabase.from('refund_requests').select('*').order('created_at', { ascending: false }),
      ]);
      setPayments(keysToCamel(pays || []));
      setRegistrations(keysToCamel(regs || []));
      setEvents(evs || []);
      setRefundRequests(keysToCamel(rfs || []));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { fetchAll(); }, []);

  const regMap = Object.fromEntries(registrations.map(r => [r.id, r]));

  function getParticipantName(payment) {
    const reg = regMap[payment.registrationId];
    if (!reg) return (payment.userId || '').slice(0, 12) + '…';
    return reg.fullName || reg.companyName || reg.email || '—';
  }
  function getParticipantSub(payment) {
    const reg = regMap[payment.registrationId];
    if (!reg) return '';
    return reg.type === 'sponsor'
      ? (reg.contactPerson ? `Contact: ${reg.contactPerson}` : reg.email || '')
      : (reg.phone || reg.email || '');
  }

  const isRefundTab = activeTab === 'refunds';
  const filtered = isRefundTab ? [] : payments.filter(p => {
    const matchTab    = activeTab === 'all' || p.status === activeTab;
    const matchEvent  = filterEvent  === 'all' || p.eventId  === filterEvent;
    const matchMethod = filterMethod === 'all' || (p.paymentMethod || '').toLowerCase().includes(filterMethod.toLowerCase());
    const matchType   = filterType   === 'all' || p.registrationType === filterType;
    return matchTab && matchEvent && matchMethod && matchType;
  });

  const counts = {
    all:      payments.length,
    pending:  payments.filter(p => p.status === 'pending').length,
    approved: payments.filter(p => p.status === 'approved').length,
    rejected: payments.filter(p => p.status === 'rejected').length,
    refunds:  refundRequests.length,
  };
  const pendingRefunds = refundRequests.filter(r => r.status === 'pending').length;

  async function handleApprove(payment) {
    if (!canEdit) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('approve_payment', {
        payment_id: payment.id, registration_id: payment.registrationId || null,
      });
      if (error) throw error;
      toast.success('✅ Payment approved!');
      setSelected(null);
      fetchAll();
    } catch (e) { toast.error('Approval failed: ' + e.message); }
    finally { setActionLoading(false); }
  }

  async function handleReject(payment) {
    if (!canEdit) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('reject_payment', {
        payment_id: payment.id, registration_id: payment.registrationId || null,
      });
      if (error) throw error;
      toast.success('❌ Payment rejected');
      setSelected(null);
      fetchAll();
    } catch (e) { toast.error('Rejection failed: ' + e.message); }
    finally { setActionLoading(false); }
  }

  async function handleRefundAction() {
    if (!canEdit || !refundAction) return;
    const { request, action } = refundAction;
    setActionLoading(true);
    try {
      if (action === 'approve') {
        const { error } = await supabase.rpc('approve_refund_request', {
          request_id: request.id, payment_id: request.paymentId,
          registration_id: request.registrationId || null,
          was_approved: request.paymentStatus === 'approved', admin_note_text: refundNote,
        });
        if (error) throw error;
        toast.success(request.paymentStatus === 'approved' ? '✅ Refund approved' : '✅ Cancellation approved');
      } else {
        const { error } = await supabase.rpc('reject_refund_request', {
          request_id: request.id, admin_note_text: refundNote,
        });
        if (error) throw error;
        toast.success('❌ Request declined');
      }
      setRefundAction(null); setRefundNote('');
      fetchAll();
    } catch (e) { toast.error('Action failed: ' + e.message); }
    finally { setActionLoading(false); }
  }

  const methodOptions = Array.from(new Set(payments.map(p => p.paymentMethod).filter(Boolean)));

  function methodStyle(method) {
    const m = (method || '').toLowerCase();
    if (m.includes('bank'))  return { color: '#A8D8EA', prefix: '🏦 ' };
    if (m.includes('jazz'))  return { color: '#F6E05E', prefix: '💛 ' };
    if (m.includes('easy'))  return { color: '#9AE6B4', prefix: '💚 ' };
    return { color: '#F8F3EA', prefix: '💳 ' };
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

  return (
    <div className="relative min-h-screen overflow-hidden md:pl-[272px]" style={{ backgroundColor: BG_COLOR }}>
      <BackgroundOverlay />
      <GlowEffects />
      <Sidebar />

      <div className="relative z-10 px-4 pb-12 pt-20 sm:px-6 md:px-8 md:pt-8">
        <div className="mb-8">
          <p className="text-[#B79143] uppercase tracking-[0.3em] text-[11px] mb-3">Admin</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#F8F3EA]">Payment Approval</h1>
          <p className="text-sm text-[#b89b84] mt-2">Review payments, approvals, and refund / cancellation requests</p>
        </div>


        {/* Pending alert — only shown to superAdmin */}
        {canEdit && (counts.pending > 0 || pendingRefunds > 0) && (
          <div className="rounded-xl border border-amber-500/35 bg-amber-950/25 backdrop-blur-sm px-4 py-4 text-sm leading-relaxed text-amber-100/90 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-6">
            <span className="text-lg">⏳</span>
            <div className="flex flex-col sm:flex-row sm:gap-3">
              {counts.pending > 0 && <strong>{counts.pending} payment{counts.pending > 1 ? 's' : ''} awaiting review.</strong>}
              {pendingRefunds > 0 && <span>🔄 <strong>{pendingRefunds} refund / cancellation request{pendingRefunds > 1 ? 's' : ''}</strong> pending.</span>}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex gap-0 overflow-x-auto border-b pb-px" style={{ borderColor: 'rgba(183,145,67,0.25)' }}>
          {[
            { key: 'pending',  label: `Pending (${counts.pending})` },
            { key: 'approved', label: `Approved (${counts.approved})` },
            { key: 'rejected', label: `Rejected (${counts.rejected})` },
            { key: 'all',      label: `All (${counts.all})` },
            { key: 'refunds',  label: `🔄 Refunds / Cancellations (${counts.refunds})` },
          ].map(t => (
            <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
              className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide transition sm:px-5 sm:text-sm ${
                activeTab === t.key ? 'border-[#B79143] text-[#B79143]' : 'border-transparent text-[#b89b84] hover:text-[#F8F3EA]'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Refund Tab ── */}
        {isRefundTab ? (
          <div className="rounded-2xl border backdrop-blur-xl p-4 sm:p-6" style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-[#F8F3EA]">Refund & Cancellation Requests</h2>
                <p className="text-sm text-[#b89b84] mt-1">{refundRequests.length} total</p>
              </div>
            </div>

            {refundRequests.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🎉</div>
                <p className="text-[#b89b84] text-sm">No refund or cancellation requests received.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b text-left" style={{ borderColor: 'rgba(183,145,67,0.12)' }}>
                        {['Event','Type','Request','Orig. Status','Amount','Reason','Date','Status', canEdit ? 'Actions' : ''].filter(Boolean).map(h => (
                          <th key={h} className="pb-4 text-[#B79143] uppercase tracking-[0.2em] text-xs font-bold pr-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {refundRequests.map(r => (
                        <tr key={r.id} className="border-b hover:bg-[rgba(183,145,67,0.04)] transition" style={{ borderColor: BORDER_GOLD_LIGHT }}>
                          <td className="py-4 pr-4 font-bold text-[#F8F3EA] text-sm">{r.eventName || '—'}</td>
                          <td className="py-4 pr-4">
                            <span className="inline-block rounded-lg border px-3 py-1.5 text-xs uppercase tracking-[0.15em] text-[#B79143] font-bold" style={{ borderColor: 'rgba(183,145,67,0.25)', backgroundColor: 'rgba(183,145,67,0.08)' }}>
                              {r.registrationType}
                            </span>
                          </td>
                          <td className="py-4 pr-4">
                            <span className={`inline-block rounded-lg px-3 py-1.5 text-xs uppercase tracking-[0.15em] font-bold ${
                              r.requestType === 'cancel' ? 'bg-amber-500/15 text-amber-300 border border-amber-400/30' : 'bg-[rgba(183,145,67,0.15)] text-[#D7B46A] border border-[rgba(183,145,67,0.3)]'
                            }`}>
                              {r.requestType === 'cancel' ? '❌ Cancel' : '🔄 Refund'}
                            </span>
                          </td>
                          <td className="py-4 pr-4"><span className={statusBadge(r.paymentStatus || 'pending', 'lg')}>{r.paymentStatus || '—'}</span></td>
                          <td className="py-4 pr-4 text-[#F8F3EA] font-bold text-sm">
                            {r.requestType === 'cancel' && r.paymentStatus === 'pending'
                              ? <span className="text-[#b89b84] font-normal">N/A</span>
                              : formatCurrency(r.amount)}
                          </td>
                          <td className="py-4 pr-4 text-[#b89b84] max-w-[200px] text-sm">{r.reason || <span className="italic">—</span>}</td>
                          <td className="py-4 pr-4 text-[#b89b84] text-sm">{formatDate(r.createdAt)}</td>
                          <td className="py-4 pr-4"><span className={statusBadge(r.status, 'lg')}>{r.status}</span></td>
                          {canEdit && (
                            <td className="py-4">
                              {r.status === 'pending' ? (
                                <div className="flex gap-2">
                                  <button className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 transition"
                                    onClick={() => { setRefundAction({ request: r, action: 'approve' }); setRefundNote(''); }}>
                                    ✅ {r.requestType === 'cancel' ? 'Approve' : 'Refund'}
                                  </button>
                                  <button className="rounded-lg border border-red-400/40 bg-red-500/15 px-4 py-2 text-xs font-bold text-red-300 hover:bg-red-500/25 transition"
                                    onClick={() => { setRefundAction({ request: r, action: 'reject' }); setRefundNote(''); }}>
                                    ❌ Decline
                                  </button>
                                </div>
                              ) : (
                                <span className="text-sm text-[#b89b84]">Processed</span>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {refundRequests.map(r => (
                    <div key={r.id} className="rounded-2xl border backdrop-blur-sm p-4 space-y-3" style={{ borderColor: BORDER_GOLD, backgroundColor: CARD_BG }}>
                      <div className="flex items-start justify-between">
                        <h4 className="font-bold text-[#F8F3EA] text-base">{r.eventName || '—'}</h4>
                        <span className={statusBadge(r.status)}>{r.status}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1 font-bold">Amount</p>
                          <p className="text-[#F8F3EA] font-bold">
                            {r.requestType === 'cancel' && r.paymentStatus === 'pending'
                              ? <span className="text-[#b89b84] font-normal">N/A</span>
                              : formatCurrency(r.amount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1 font-bold">Date</p>
                          <p className="text-[#b89b84] text-xs">{formatDate(r.createdAt)}</p>
                        </div>
                      </div>
                      {r.reason && <p className="text-sm text-[#b89b84]">{r.reason}</p>}
                      {canEdit && r.status === 'pending' && (
                        <div className="flex gap-2 pt-2 border-t" style={{ borderColor: BORDER_GOLD_LIGHT }}>
                          <button className="flex-1 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 transition"
                            onClick={() => { setRefundAction({ request: r, action: 'approve' }); setRefundNote(''); }}>
                            ✅ {r.requestType === 'cancel' ? 'Approve' : 'Refund'}
                          </button>
                          <button className="flex-1 rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-2.5 text-xs font-bold text-red-300 hover:bg-red-500/25 transition"
                            onClick={() => { setRefundAction({ request: r, action: 'reject' }); setRefundNote(''); }}>
                            ❌ Decline
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <select className={inputCls + ' sm:max-w-[230px] appearance-none'} value={filterEvent} onChange={e => setFilterEvent(e.target.value)}>
                <option value="all">All Events</option>
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
              </select>
              <select className={inputCls + ' sm:max-w-[200px] appearance-none'} value={filterMethod} onChange={e => setFilterMethod(e.target.value)}>
                <option value="all">All Payments</option>
                {methodOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select className={inputCls + ' sm:max-w-[175px] appearance-none'} value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="all">All Types</option>
                <option value="delegate">Delegates</option>
                <option value="sponsor">Sponsors</option>
              </select>
            </div>

            {/* Payments Panel */}
            <div className="rounded-2xl border backdrop-blur-xl p-4 sm:p-6" style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-[#b89b84]">
                  Showing <strong className="text-[#B79143]">{filtered.length}</strong> of {payments.length} payments
                </p>
              </div>

              {loading ? (
                <div className="flex justify-center items-center min-h-[200px]">
                  <div className="w-10 h-10 rounded-full border-2 border-[#B79143]/20 border-t-[#B79143] animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4">{activeTab === 'pending' ? '🎉' : '📭'}</div>
                  <p className="text-[#b89b84] text-sm">{activeTab === 'pending' ? 'All caught up!' : 'No payments match filters.'}</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b text-left" style={{ borderColor: 'rgba(183,145,67,0.12)' }}>
                          {['Participant','Event','Type','Method','Amount','Receipt','Date','Status', canEdit ? 'Actions' : ''].filter(Boolean).map(h => (
                            <th key={h} className="pb-4 text-[#B79143] uppercase tracking-[0.2em] text-xs font-bold pr-4">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map(p => {
                          const name   = getParticipantName(p);
                          const sub    = getParticipantSub(p);
                          const mStyle = methodStyle(p.paymentMethod);
                          return (
                            <tr key={p.id} className="border-b hover:bg-[rgba(183,145,67,0.04)] transition" style={{ borderColor: BORDER_GOLD_LIGHT }}>
                              <td className="py-4 pr-4">
                                <div className="font-bold text-[#F8F3EA] text-sm">{name}</div>
                                {sub && <div className="text-xs text-[#b89b84] mt-0.5">{sub}</div>}
                              </td>
                              <td className="py-4 pr-4 font-bold text-[#F8F3EA] text-sm">{p.eventName}</td>
                              <td className="py-4 pr-4">
                                <span className="inline-block rounded-lg border px-3 py-1.5 text-xs uppercase tracking-[0.15em] text-[#B79143] font-bold" style={{ borderColor: 'rgba(183,145,67,0.25)', backgroundColor: 'rgba(183,145,67,0.08)' }}>
                                  {p.registrationType}
                                </span>
                              </td>
                              <td className="py-4 pr-4">
                                <span className="font-bold text-sm" style={{ color: mStyle.color }}>{mStyle.prefix}{p.paymentMethod || '—'}</span>
                              </td>
                              <td className="py-4 pr-4 text-[#F8F3EA] font-bold text-sm">{formatCurrency(p.amount)}</td>
                              <td className="py-4 pr-4">
                                {p.receiptUrl
                                  ? <img src={p.receiptUrl} alt="Receipt" className="w-[70px] h-[70px] object-cover rounded-lg border cursor-pointer transition-transform hover:scale-105" style={{ borderColor: BORDER_GOLD_STRONG }} onClick={() => setReceiptModal(p.receiptUrl)} />
                                  : <span className="text-sm text-[#b89b84]">—</span>}
                              </td>
                              <td className="py-4 pr-4 text-[#b89b84] text-sm">{formatDate(p.createdAt)}</td>
                              <td className="py-4 pr-4"><span className={statusBadge(p.status, 'lg')}>{p.status}</span></td>
                              {canEdit && (
                                <td className="py-4">
                                  {p.status === 'pending' ? (
                                    <div className="flex gap-2">
                                      <button className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 transition"
                                        onClick={() => setSelected({ action: 'approve', payment: p })}>✅ Approve</button>
                                      <button className="rounded-lg border border-red-400/40 bg-red-500/15 px-4 py-2 text-xs font-bold text-red-300 hover:bg-red-500/25 transition"
                                        onClick={() => setSelected({ action: 'reject', payment: p })}>❌ Reject</button>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-[#b89b84]">Processed</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-4">
                    {filtered.map(p => {
                      const name   = getParticipantName(p);
                      const sub    = getParticipantSub(p);
                      const mStyle = methodStyle(p.paymentMethod);
                      return (
                        <div key={p.id} className="rounded-2xl border backdrop-blur-sm p-4 space-y-3" style={{ borderColor: BORDER_GOLD, backgroundColor: CARD_BG }}>
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-[#F8F3EA] text-base">{name}</h4>
                              {sub && <p className="text-xs text-[#b89b84] mt-0.5 truncate">{sub}</p>}
                            </div>
                            <span className={statusBadge(p.status)}>{p.status}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1 font-bold">Event</p>
                              <p className="text-[#F8F3EA] font-bold text-sm">{p.eventName}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1 font-bold">Amount</p>
                              <p className="text-[#F8F3EA] font-bold text-sm">{formatCurrency(p.amount)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1 font-bold">Method</p>
                              <p className="font-bold text-sm" style={{ color: mStyle.color }}>{mStyle.prefix}{p.paymentMethod || '—'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1 font-bold">Date</p>
                              <p className="text-[#b89b84] text-xs">{formatDate(p.createdAt)}</p>
                            </div>
                          </div>
                          {p.receiptUrl && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1 font-bold">Receipt</p>
                              <img src={p.receiptUrl} alt="Receipt" className="w-full max-h-[100px] object-contain rounded-lg border cursor-pointer" style={{ borderColor: BORDER_GOLD_STRONG }} onClick={() => setReceiptModal(p.receiptUrl)} />
                            </div>
                          )}
                          {canEdit && p.status === 'pending' && (
                            <div className="flex gap-2 pt-2 border-t" style={{ borderColor: BORDER_GOLD_LIGHT }}>
                              <button className="flex-1 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 transition"
                                onClick={() => setSelected({ action: 'approve', payment: p })}>✅ Approve</button>
                              <button className="flex-1 rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-2.5 text-xs font-bold text-red-300 hover:bg-red-500/25 transition"
                                onClick={() => setSelected({ action: 'reject', payment: p })}>❌ Reject</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Approve/Reject Modal — superAdmin only */}
        {selected && canEdit && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && setSelected(null)}>
            <div className="w-full max-w-[520px] rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto" style={{ borderColor: BORDER_GOLD_STRONG, backgroundColor: BG_COLOR }}>
              <div className="sticky top-0 flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: BORDER_GOLD_STRONG, backgroundColor: BG_COLOR }}>
                <h3 className="text-xl font-bold text-[#F8F3EA]">{selected.action === 'approve' ? '✅ Approve Payment' : '❌ Reject Payment'}</h3>
                <button className="rounded-lg border px-3 py-1.5 text-sm text-[#B79143] hover:bg-[#B79143]/10 transition" style={{ borderColor: BORDER_GOLD_MEDIUM }} onClick={() => setSelected(null)}>✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div className="rounded-xl border p-5 text-sm space-y-2" style={{ borderColor: BORDER_GOLD, backgroundColor: 'rgba(183,145,67,0.08)' }}>
                  <p className="text-[#F8F3EA]"><strong className="text-[#B79143]">Participant:</strong> <span className="font-bold">{getParticipantName(selected.payment)}</span></p>
                  <p className="text-[#F8F3EA]"><strong className="text-[#B79143]">Event:</strong> <span className="font-bold">{selected.payment.eventName}</span></p>
                  <p className="text-[#F8F3EA]"><strong className="text-[#B79143]">Method:</strong> <span className="font-bold">{selected.payment.paymentMethod}</span></p>
                  <p className="text-[#F8F3EA]"><strong className="text-[#B79143]">Amount:</strong> <span className="font-bold text-[#D7B46A]">{formatCurrency(selected.payment.amount)}</span></p>
                </div>
                {selected.payment.receiptUrl && (
                  <div>
                    <label className={labelCls}>Receipt <span className="font-normal normal-case tracking-normal text-[#b89b84]">(click to enlarge)</span></label>
                    <img src={selected.payment.receiptUrl} alt="Receipt" className="w-full max-h-[300px] object-contain rounded-xl border cursor-pointer" style={{ borderColor: BORDER_GOLD_STRONG }} onClick={() => setReceiptModal(selected.payment.receiptUrl)} />
                  </div>
                )}
                {selected.action === 'approve'
                  ? <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100 font-medium">✅ Approving marks this payment as <strong>approved</strong>.</div>
                  : <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100 font-medium">❌ The participant's payment will be marked as rejected.</div>
                }
              </div>
              <div className="sticky bottom-0 flex gap-3 justify-end px-6 py-5 border-t" style={{ borderColor: BORDER_GOLD_STRONG, backgroundColor: BG_COLOR }}>
                <button className="rounded-xl border px-6 py-3 text-sm font-bold text-[#B79143] transition hover:bg-[#B79143]/10" style={{ borderColor: BORDER_GOLD_MEDIUM }} onClick={() => setSelected(null)}>Cancel</button>
                {selected.action === 'approve'
                  ? <button className="rounded-xl bg-gradient-to-r from-[#8E6B2F] via-[#B79143] to-[#D7B46A] px-6 py-3 text-sm font-bold text-[#2A0B12] transition hover:scale-[1.02] disabled:opacity-50" onClick={() => handleApprove(selected.payment)} disabled={actionLoading}>{actionLoading ? 'Processing…' : '✅ Confirm Approval'}</button>
                  : <button className="rounded-lg border border-red-400/40 bg-red-500/15 px-6 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500/25 disabled:opacity-50" onClick={() => handleReject(selected.payment)} disabled={actionLoading}>{actionLoading ? 'Processing…' : '❌ Confirm Rejection'}</button>
                }
              </div>
            </div>
          </div>
        )}

        {/* Refund Modal — superAdmin only */}
        {refundAction && canEdit && (() => {
          const { request, action } = refundAction;
          const isCancel    = request.requestType === 'cancel';
          const wasApproved = request.paymentStatus === 'approved';
          return (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && setRefundAction(null)}>
              <div className="w-full max-w-[520px] rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto" style={{ borderColor: BORDER_GOLD_STRONG, backgroundColor: BG_COLOR }}>
                <div className="sticky top-0 flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: BORDER_GOLD_STRONG, backgroundColor: BG_COLOR }}>
                  <h3 className="text-xl font-bold text-[#F8F3EA]">
                    {action === 'approve' ? (isCancel ? '✅ Approve Cancellation' : '✅ Approve Refund') : (isCancel ? '❌ Decline Cancellation' : '❌ Decline Refund')}
                  </h3>
                  <button className="rounded-lg border px-3 py-1.5 text-sm text-[#B79143] hover:bg-[#B79143]/10 transition" style={{ borderColor: BORDER_GOLD_MEDIUM }} onClick={() => setRefundAction(null)}>✕</button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="rounded-xl border p-5 text-sm space-y-2" style={{ borderColor: BORDER_GOLD, backgroundColor: 'rgba(183,145,67,0.08)' }}>
                    <p className="text-[#F8F3EA]"><strong className="text-[#B79143]">Event:</strong> <span className="font-bold">{request.eventName}</span></p>
                    {(!isCancel || wasApproved) && <p className="text-[#F8F3EA]"><strong className="text-[#B79143]">Amount:</strong> <span className="font-bold text-[#D7B46A]">{formatCurrency(request.amount)}</span></p>}
                    {request.reason && <p className="text-[#F8F3EA]"><strong className="text-[#B79143]">Reason:</strong> {request.reason}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Admin Note (optional)</label>
                    <textarea className={inputCls + ' resize-y'} rows={3} placeholder="Leave a note for the user…" value={refundNote} onChange={e => setRefundNote(e.target.value)} />
                  </div>
                  {action === 'approve'
                    ? <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100 font-medium">{wasApproved ? 'Payment will be marked as refunded and registration cancelled.' : 'Payment will be cancelled and registration removed.'}</div>
                    : <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100 font-medium">Declining keeps the registration and payment status unchanged.</div>
                  }
                </div>
                <div className="sticky bottom-0 flex gap-3 justify-end px-6 py-5 border-t" style={{ borderColor: BORDER_GOLD_STRONG, backgroundColor: BG_COLOR }}>
                  <button className="rounded-xl border px-6 py-3 text-sm font-bold text-[#B79143] transition hover:bg-[#B79143]/10" style={{ borderColor: BORDER_GOLD_MEDIUM }} onClick={() => setRefundAction(null)}>Cancel</button>
                  {action === 'approve'
                    ? <button className="rounded-xl bg-gradient-to-r from-[#8E6B2F] via-[#B79143] to-[#D7B46A] px-6 py-3 text-sm font-bold text-[#2A0B12] transition hover:scale-[1.02] disabled:opacity-50" onClick={handleRefundAction} disabled={actionLoading}>{actionLoading ? 'Processing…' : isCancel ? '✅ Confirm Cancellation' : '✅ Confirm Refund'}</button>
                    : <button className="rounded-lg border border-red-400/40 bg-red-500/15 px-6 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500/25 disabled:opacity-50" onClick={handleRefundAction} disabled={actionLoading}>{actionLoading ? 'Processing…' : '❌ Decline Request'}</button>
                  }
                </div>
              </div>
            </div>
          );
        })()}

        <ReceiptModal url={receiptModal} onClose={() => setReceiptModal(null)} />
      </div>
    </div>
  );
}