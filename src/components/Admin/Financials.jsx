// src/components/Admin/Financials.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase/config';
import { usePermissions } from '../../hooks/usePermissions';
import Sidebar from '../Shared/Sidebar';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { keysToCamel } from '../../utils/cache';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
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

const COLORS = ['#C9A84C', '#D7B46A', '#E8C97A', '#8E6B2F', '#FF6B6B', '#FFA500'];
const EXPENSE_CATEGORIES = ['Venue', 'Catering', 'Marketing', 'Technology', 'Printing', 'Transport', 'Honorarium', 'Decoration', 'Security', 'General'];

const inputCls = 'w-full rounded-xl border border-[rgba(183,145,67,0.25)] bg-[rgba(0,0,0,0.4)] backdrop-blur-sm px-4 py-3.5 text-sm text-[#F8F3EA] placeholder:text-[#b89b84] focus:border-[#B79143] focus:outline-none focus:ring-2 focus:ring-[#B79143]/20 transition-all duration-300';
const labelCls = 'mb-2 block text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[#B79143]';

const emptyExpenseForm = { description: '', amount: '', category: '', eventId: '' };

export default function Financials() {
  const { canEdit } = usePermissions();

  const [payments,         setPayments]         = useState([]);
  const [expenses,         setExpenses]         = useState([]);
  const [events,           setEvents]           = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [filterEvent,      setFilterEvent]      = useState('all');
  const [showModal,        setShowModal]        = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [expenseForm,      setExpenseForm]      = useState(emptyExpenseForm);
  const [savingExpense,    setSavingExpense]    = useState(false);
  const [activeTab,        setActiveTab]        = useState('overview');

  useEffect(() => {
    async function load() {
      try {
        const [{ data: pays }, { data: exps }, { data: evs }] = await Promise.all([
          supabase.from('payments').select('*'),
          supabase.from('financials').select('*').order('created_at', { ascending: false }),
          supabase.from('events').select('*'),
        ]);
        setPayments(keysToCamel(pays || []));
        setExpenses(keysToCamel(exps || []));
        setEvents(keysToCamel(evs || []));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const filtPays = filterEvent === 'all' ? payments : payments.filter(p => p.eventId === filterEvent);
  const filtExps = filterEvent === 'all' ? expenses : expenses.filter(e => e.eventId === filterEvent);

  const approved      = filtPays.filter(p => p.status === 'approved');
  const refunded      = filtPays.filter(p => p.status === 'refunded');
  const totalRev      = approved.reduce((s, p) => s + (p.amount || 0), 0);
  const delegateRev   = approved.filter(p => p.registrationType === 'delegate').reduce((s, p) => s + (p.amount || 0), 0);
  const sponsorRev    = approved.filter(p => p.registrationType === 'sponsor').reduce((s, p) => s + (p.amount || 0), 0);
  const totalRefunded = refunded.reduce((s, p) => s + (p.amount || 0), 0);
  const totalExp      = filtExps.reduce((s, e) => s + (e.amount || 0), 0);
  const netProfit     = totalRev - totalExp;

  const byEvent = events.map(ev => {
    const evPays = payments.filter(p => p.status === 'approved' && p.eventId === ev.id);
    const evExp  = expenses.filter(e => e.eventId === ev.id);
    return {
      name:      ev.name.length > 12 ? ev.name.slice(0, 12) + '…' : ev.name,
      Delegates: evPays.filter(p => p.registrationType === 'delegate').reduce((s, p) => s + (p.amount || 0), 0),
      Sponsors:  evPays.filter(p => p.registrationType === 'sponsor').reduce((s, p) => s + (p.amount || 0), 0),
      Expenses:  evExp.reduce((s, e) => s + (e.amount || 0), 0),
    };
  });

  const revPie = [
    { name: 'Delegate Revenue', value: delegateRev },
    { name: 'Sponsor Revenue',  value: sponsorRev },
    { name: 'Total Expenses',   value: totalExp },
  ].filter(d => d.value > 0);

  const expByCategory = {};
  filtExps.forEach(e => {
    const c = e.category || 'General';
    expByCategory[c] = (expByCategory[c] || 0) + (e.amount || 0);
  });
  const expCatData = Object.entries(expByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  async function handleSaveExpense() {
    if (!canEdit) return;
    if (!expenseForm.description || !expenseForm.amount) {
      toast.error('Description and amount are required'); return;
    }
    setSavingExpense(true);
    try {
      const eventName = events.find(e => e.id === expenseForm.eventId)?.name || '';
      const row = {
        description: expenseForm.description,
        amount:      parseFloat(expenseForm.amount),
        category:    expenseForm.category || 'General',
        event_id:    expenseForm.eventId || null,
        event_name:  eventName,
      };
      if (editingExpenseId) {
        const { data, error } = await supabase.from('financials').update(row).eq('id', editingExpenseId).select().single();
        if (error) throw error;
        setExpenses(prev => prev.map(x => x.id === editingExpenseId ? keysToCamel(data) : x));
        toast.success('Expense updated');
      } else {
        const { data, error } = await supabase.from('financials').insert(row).select().single();
        if (error) throw error;
        setExpenses(prev => [keysToCamel(data), ...prev]);
        toast.success('Expense recorded');
      }
      setExpenseForm(emptyExpenseForm);
      setEditingExpenseId(null);
      setShowModal(false);
    } catch { toast.error(editingExpenseId ? 'Failed to update expense' : 'Failed to save expense'); }
    finally { setSavingExpense(false); }
  }

  function openAddExpenseModal() {
    if (!canEdit) return;
    setEditingExpenseId(null);
    setExpenseForm(emptyExpenseForm);
    setShowModal(true);
  }

  function openEditExpenseModal(e) {
    if (!canEdit) return;
    setEditingExpenseId(e.id);
    setExpenseForm({
      description: e.description || '',
      amount:      e.amount != null ? String(e.amount) : '',
      category:    e.category || '',
      eventId:     e.eventId || '',
    });
    setShowModal(true);
  }

  function closeExpenseModal() {
    setShowModal(false);
    setEditingExpenseId(null);
    setExpenseForm(emptyExpenseForm);
  }

  async function handleDeleteExpense(exp) {
    if (!canEdit) return;
    if (!window.confirm(`Delete expense "${exp.description}" (${formatCurrency(exp.amount)})?`)) return;
    try {
      const { error } = await supabase.from('financials').delete().eq('id', exp.id);
      if (error) throw error;
      setExpenses(prev => prev.filter(x => x.id !== exp.id));
      toast.success('Expense deleted');
    } catch { toast.error('Failed to delete expense'); }
  }

  const selectedEventName = filterEvent !== 'all'
    ? events.find(e => e.id === filterEvent)?.name || ''
    : '';

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

  if (loading) return (
    <div className="relative min-h-screen overflow-hidden md:pl-[272px]" style={{ backgroundColor: BG_COLOR }}>
      <BackgroundOverlay /><GlowEffects /><Sidebar />
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 rounded-full border-2 border-[#B79143]/20 border-t-[#B79143] animate-spin" />
      </div>
    </div>
  );

  const tabs = [
    { key: 'overview', label: 'Overview Charts' },
    { key: 'payments', label: `Payments (${approved.length})` },
    { key: 'expenses', label: `Expenses (${filtExps.length})` },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden md:pl-[272px]" style={{ backgroundColor: BG_COLOR }}>
      <BackgroundOverlay />
      <GlowEffects />
      <Sidebar />

      <div className="relative z-10 px-4 pb-12 pt-20 sm:px-6 md:px-8 md:pt-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-[#B79143] uppercase tracking-[0.3em] text-[11px] mb-3">Admin</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#F8F3EA]">Financial Overview</h1>
            <p className="text-sm text-[#b89b84] mt-2">
              {filterEvent !== 'all' ? `Showing: ${selectedEventName}` : 'Complete financial picture across all events'}
            </p>
          </div>
          {canEdit && (
            <button
              type="button"
              className="rounded-xl bg-gradient-to-r from-[#8E6B2F] via-[#B79143] to-[#D7B46A] px-5 py-3 text-sm font-semibold text-[#2A0B12] transition hover:scale-[1.02] w-full sm:w-auto shrink-0"
              onClick={openAddExpenseModal}
            >
              + Record Expense
            </button>
          )}
        </div>


        {/* Event Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-6">
          <label className="text-xs uppercase tracking-[0.2em] text-[#B79143] font-bold whitespace-nowrap shrink-0">
            Filter by Event:
          </label>
          <select
            className={inputCls + ' w-full sm:max-w-xs min-w-0 appearance-none'}
            value={filterEvent}
            onChange={e => setFilterEvent(e.target.value)}
          >
            <option value="all">All Events (combined)</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
        </div>

        {/* Stat Cards — Row 1 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-4 sm:mb-6">
          {[
            { label: 'Total Revenue',    value: formatCurrency(totalRev),    icon: '💰', color: '#D7B46A' },
            { label: 'Delegate Revenue', value: formatCurrency(delegateRev), icon: '🧑‍💼', color: '#D7B46A' },
            { label: 'Sponsor Revenue',  value: formatCurrency(sponsorRev),  icon: '🏢', color: '#D7B46A' },
            { label: 'Balance',          value: formatCurrency(netProfit),   icon: netProfit >= 0 ? '📈' : '📉', color: netProfit >= 0 ? '#5CCC8A' : '#FF6B6B' },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl border backdrop-blur-xl p-4 sm:p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#B79143]/5" style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
              <div className="text-xl sm:text-2xl mb-2">{s.icon}</div>
              <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.25em] text-[#B79143] font-bold mb-2">{s.label}</div>
              <div className="text-xl sm:text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Stat Cards — Row 2 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6">
          {[
            { label: 'Total Expenses',    value: formatCurrency(totalExp),                              icon: '💸', color: '#FF6B6B' },
            { label: 'Total Refunded',    value: formatCurrency(totalRefunded),                         icon: '🔄', color: '#FF6B6B' },
            { label: 'Pending Payments',  value: filtPays.filter(p => p.status === 'pending').length,   icon: '⏳', color: '#F39C12' },
            { label: 'Approved Payments', value: approved.length,                                       icon: '✅', color: '#5CCC8A' },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl border backdrop-blur-xl p-4 sm:p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#B79143]/5" style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
              <div className="text-xl sm:text-2xl mb-2">{s.icon}</div>
              <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.25em] text-[#B79143] font-bold mb-2">{s.label}</div>
              <div className={`font-bold ${typeof s.value === 'string' ? 'text-xl sm:text-2xl' : 'text-3xl sm:text-4xl'}`} style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-0 overflow-x-auto border-b pb-px" style={{ borderColor: 'rgba(183,145,67,0.25)' }}>
          {tabs.map(t => (
            <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
              className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide transition sm:px-5 sm:text-sm ${
                activeTab === t.key ? 'border-[#B79143] text-[#B79143]' : 'border-transparent text-[#b89b84] hover:text-[#F8F3EA]'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border backdrop-blur-xl p-4 sm:p-6" style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
                <h3 className="text-lg font-bold text-[#F8F3EA] mb-4">Revenue vs Expenses by Event</h3>
                {byEvent.some(e => e.Delegates + e.Sponsors + e.Expenses > 0) ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={byEvent}>
                      <XAxis dataKey="name" stroke="#9A7B28" tick={{ fill: '#b89b84', fontSize: 10 }} />
                      <YAxis stroke="#9A7B28" tick={{ fill: '#b89b84', fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={{ background: 'rgba(68,7,19,0.95)', border: '1px solid rgba(183,145,67,0.3)', borderRadius: '12px', color: '#F8F3EA', fontSize: 11 }} formatter={v => formatCurrency(v)} />
                      <Legend wrapperStyle={{ color: '#F8F3EA', fontSize: 11 }} />
                      <Bar dataKey="Delegates" fill="#C9A84C" stackId="rev" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Sponsors"  fill="#D7B46A" stackId="rev" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Expenses"  fill="#FF6B6B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-[#b89b84] text-sm py-8 text-center">No data yet.</p>
                )}
              </div>

              <div className="rounded-2xl border backdrop-blur-xl p-4 sm:p-6" style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
                <h3 className="text-lg font-bold text-[#F8F3EA] mb-4">Revenue & Expense Breakdown</h3>
                {revPie.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={revPie} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                        {revPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'rgba(68,7,19,0.95)', border: '1px solid rgba(183,145,67,0.3)', borderRadius: '12px', color: '#F8F3EA', fontSize: 11 }} formatter={v => formatCurrency(v)} />
                      <Legend wrapperStyle={{ color: '#F8F3EA', fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-[#b89b84] text-sm py-8 text-center">No financial data yet.</p>
                )}
              </div>
            </div>

            {expCatData.length > 0 && (
              <div className="rounded-2xl border backdrop-blur-xl p-4 sm:p-6" style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
                <h3 className="text-lg font-bold text-[#F8F3EA] mb-4">Expenses by Category</h3>
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b text-left" style={{ borderColor: 'rgba(183,145,67,0.12)' }}>
                        {['Category', 'Total Amount', '% of Expenses'].map(h => (
                          <th key={h} className="pb-4 text-[#B79143] uppercase tracking-[0.2em] text-[11px] font-bold pr-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {expCatData.map(c => (
                        <tr key={c.name} className="border-b hover:bg-[rgba(183,145,67,0.04)] transition" style={{ borderColor: BORDER_GOLD_LIGHT }}>
                          <td className="py-4 pr-4 text-[#F8F3EA]">{c.name}</td>
                          <td className="py-4 pr-4 text-[#FF6B6B] font-semibold">-{formatCurrency(c.value)}</td>
                          <td className="py-4 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="h-2 w-24 sm:w-32 rounded-full bg-[rgba(183,145,67,0.1)] overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400" style={{ width: `${(c.value / totalExp) * 100}%` }} />
                              </div>
                              <span className="text-xs text-[#b89b84]">{((c.value / totalExp) * 100).toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden space-y-3">
                  {expCatData.map(c => (
                    <div key={c.name} className="rounded-xl border backdrop-blur-sm p-4" style={{ borderColor: BORDER_GOLD, backgroundColor: CARD_BG }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-[#F8F3EA] text-sm">{c.name}</span>
                        <span className="text-[#FF6B6B] font-bold text-sm">-{formatCurrency(c.value)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-[rgba(183,145,67,0.1)] overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400" style={{ width: `${(c.value / totalExp) * 100}%` }} />
                        </div>
                        <span className="text-xs text-[#b89b84]">{((c.value / totalExp) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Payments Tab ── */}
        {activeTab === 'payments' && (
          <div className="rounded-2xl border backdrop-blur-xl p-4 sm:p-6" style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#F8F3EA]">Approved Payments</h2>
              {filterEvent !== 'all' && <p className="text-sm text-[#b89b84] mt-1">{selectedEventName}</p>}
            </div>
            {approved.length === 0 ? (
              <p className="text-[#b89b84] text-sm py-8 text-center">No approved payments.</p>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b text-left" style={{ borderColor: 'rgba(183,145,67,0.12)' }}>
                        {['Event', 'Type', 'Method', 'Amount', 'Approved On'].map(h => (
                          <th key={h} className="pb-4 text-[#B79143] uppercase tracking-[0.2em] text-[11px] font-bold pr-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {approved.map(p => (
                        <tr key={p.id} className="border-b hover:bg-[rgba(183,145,67,0.04)] transition" style={{ borderColor: BORDER_GOLD_LIGHT }}>
                          <td className="py-4 pr-4 font-semibold text-[#F8F3EA]">{p.eventName || '—'}</td>
                          <td className="py-4 pr-4">
                            <span className="inline-block rounded-lg border px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] text-[#B79143]" style={{ borderColor: 'rgba(183,145,67,0.25)', backgroundColor: 'rgba(183,145,67,0.08)' }}>
                              {p.registrationType}
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-[#b89b84]">{p.paymentMethod}</td>
                          <td className="py-4 pr-4 text-[#D7B46A] font-semibold">{formatCurrency(p.amount)}</td>
                          <td className="py-4 text-[#b89b84] text-xs">{formatDate(p.approvedAt || p.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden space-y-3">
                  {approved.map(p => (
                    <div key={p.id} className="rounded-xl border backdrop-blur-sm p-4" style={{ borderColor: BORDER_GOLD, backgroundColor: CARD_BG }}>
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-semibold text-[#F8F3EA] text-sm">{p.eventName || '—'}</h4>
                        <span className="inline-block rounded-lg border px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] text-[#B79143]" style={{ borderColor: 'rgba(183,145,67,0.25)', backgroundColor: 'rgba(183,145,67,0.08)' }}>
                          {p.registrationType}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1">Method</p>
                          <p className="text-[#b89b84]">{p.paymentMethod}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1">Amount</p>
                          <p className="text-[#D7B46A] font-semibold">{formatCurrency(p.amount)}</p>
                        </div>
                      </div>
                      <p className="text-xs text-[#b89b84] mt-2">{formatDate(p.approvedAt || p.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Expenses Tab ── */}
        {activeTab === 'expenses' && (
          <div className="rounded-2xl border backdrop-blur-xl p-4 sm:p-6" style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-[#F8F3EA]">Expenses</h2>
                {filterEvent !== 'all' && <p className="text-sm text-[#b89b84] mt-1">{selectedEventName}</p>}
              </div>
              {canEdit && (
                <button
                  type="button"
                  className="rounded-xl border px-4 py-2.5 text-sm font-semibold text-[#B79143] hover:bg-[rgba(183,145,67,0.08)] transition w-full sm:w-auto text-center"
                  style={{ borderColor: BORDER_GOLD_MEDIUM }}
                  onClick={openAddExpenseModal}
                >
                  + Add Expense
                </button>
              )}
            </div>

            {filtExps.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">💸</div>
                <p className="text-[#b89b84] text-sm">No expenses recorded.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b text-left" style={{ borderColor: 'rgba(183,145,67,0.12)' }}>
                        {['Description', 'Category', 'Event', 'Amount', 'Date', canEdit ? 'Actions' : ''].filter(Boolean).map(h => (
                          <th key={h} className="pb-4 text-[#B79143] uppercase tracking-[0.2em] text-[11px] font-bold pr-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtExps.map(e => (
                        <tr key={e.id} className="border-b hover:bg-[rgba(183,145,67,0.04)] transition" style={{ borderColor: BORDER_GOLD_LIGHT }}>
                          <td className="py-4 pr-4 font-semibold text-[#F8F3EA]">{e.description}</td>
                          <td className="py-4 pr-4">
                            <span className="inline-block rounded-lg px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] font-bold bg-amber-500/15 text-amber-300 border border-amber-400/30">
                              {e.category}
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-[#b89b84] text-xs">{e.eventName || 'General'}</td>
                          <td className="py-4 pr-4 text-[#FF6B6B] font-bold">-{formatCurrency(e.amount)}</td>
                          <td className="py-4 pr-4 text-[#b89b84] text-xs">{formatDate(e.createdAt)}</td>
                          {canEdit && (
                            <td className="py-4">
                              <div className="flex gap-1.5">
                                <button className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 transition" onClick={() => openEditExpenseModal(e)}>Edit</button>
                                <button className="rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/25 transition" onClick={() => handleDeleteExpense(e)}>Delete</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {filtExps.map(e => (
                    <div key={e.id} className="rounded-xl border backdrop-blur-sm p-4" style={{ borderColor: BORDER_GOLD, backgroundColor: CARD_BG }}>
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-semibold text-[#F8F3EA] text-sm">{e.description}</h4>
                        <span className="inline-block rounded-lg px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] font-bold bg-amber-500/15 text-amber-300 border border-amber-400/30 shrink-0">{e.category}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1">Event</p>
                          <p className="text-[#b89b84] text-xs">{e.eventName || 'General'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-[#B79143] mb-1">Amount</p>
                          <p className="text-[#FF6B6B] font-bold">-{formatCurrency(e.amount)}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: BORDER_GOLD_LIGHT }}>
                        <span className="text-xs text-[#b89b84]">{formatDate(e.createdAt)}</span>
                        {canEdit && (
                          <div className="flex gap-1.5">
                            <button className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 transition" onClick={() => openEditExpenseModal(e)}>Edit</button>
                            <button className="rounded-lg border border-red-400/40 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/25 transition" onClick={() => handleDeleteExpense(e)}>Delete</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Add / Edit Expense Modal — superAdmin only ── */}
        {showModal && canEdit && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && closeExpenseModal()}>
            <div className="w-full max-w-[540px] rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto" style={{ borderColor: BORDER_GOLD_STRONG, backgroundColor: BG_COLOR }}>
              <div className="sticky top-0 flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: BORDER_GOLD_STRONG, backgroundColor: BG_COLOR }}>
                <h3 className="text-lg font-bold text-[#F8F3EA]">{editingExpenseId ? '✏️ Edit Expense' : '💸 Record Expense'}</h3>
                <button className="rounded-lg border px-3 py-1.5 text-sm text-[#B79143] hover:bg-[#B79143]/10 transition" style={{ borderColor: BORDER_GOLD_MEDIUM }} onClick={closeExpenseModal}>✕</button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className={labelCls}>Description *</label>
                  <input className={inputCls} placeholder="e.g. Venue rental for Day 2" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Amount (PKR) *</label>
                    <input className={inputCls} type="number" placeholder="e.g. 15000" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Category</label>
                    <select className={inputCls + ' appearance-none'} value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}>
                      <option value="">Select category</option>
                      {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Related Event (optional)</label>
                  <select className={inputCls + ' appearance-none'} value={expenseForm.eventId} onChange={e => setExpenseForm({ ...expenseForm, eventId: e.target.value })}>
                    <option value="">General Expense</option>
                    {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="sticky bottom-0 flex gap-3 justify-end px-6 py-5 border-t" style={{ borderColor: BORDER_GOLD_STRONG, backgroundColor: BG_COLOR }}>
                <button className="rounded-xl border px-5 py-2.5 text-sm font-semibold text-[#B79143] transition hover:bg-[#B79143]/10" style={{ borderColor: BORDER_GOLD_MEDIUM }} onClick={closeExpenseModal}>Cancel</button>
                <button className="rounded-xl bg-gradient-to-r from-[#8E6B2F] via-[#B79143] to-[#D7B46A] px-5 py-2.5 text-sm font-semibold text-[#2A0B12] transition hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100" onClick={handleSaveExpense} disabled={savingExpense}>
                  {savingExpense ? 'Saving…' : editingExpenseId ? '💾 Update Expense' : '💸 Record Expense'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}