// src/components/Admin/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/config';
import { usePermissions } from '../../hooks/usePermissions';
import Sidebar from '../Shared/Sidebar';
import { formatCurrency, formatDate, getInitials } from '../../utils/helpers';
import { keysToCamel } from '../../utils/cache';
import bk from '../../Assets/bk.webp';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const BG_SRC = bk;
const BG_COLOR = '#440713';
const BG_GRADIENT = 'linear-gradient(180deg, rgba(68,7,19,0.55) 0%, rgba(10,0,2,0.75) 100%)';
const GLOW_GOLD = 'radial-gradient(circle, rgba(183,145,67,0.18), transparent 70%)';
const GLOW_RED  = 'radial-gradient(circle, rgba(120,18,30,0.18), transparent 70%)';
const PANEL_BG  = 'rgba(68,7,19,0.58)';
const BORDER_GOLD        = 'rgba(183,145,67,0.18)';
const BORDER_GOLD_LIGHT  = 'rgba(183,145,67,0.08)';
const BORDER_GOLD_MEDIUM = 'rgba(183,145,67,0.28)';

const COLORS = ['#C9A84C', '#D7B46A', '#E8C97A', '#8E6B2F', '#FF6B6B'];

function badgeCls(status) {
  const base = 'inline-block rounded-lg px-3 py-1 text-[10px] uppercase tracking-[0.15em] font-bold';
  if (status === 'approved')  return `${base} bg-emerald-500/15 text-emerald-300 border border-emerald-400/30`;
  if (status === 'rejected')  return `${base} bg-red-500/15 text-red-300 border border-red-400/30`;
  if (status === 'refunded')  return `${base} bg-[rgba(183,145,67,0.15)] text-[#D7B46A] border border-[rgba(183,145,67,0.3)]`;
  if (status === 'cancelled') return `${base} bg-red-500/15 text-red-300 border border-red-400/30`;
  return `${base} bg-amber-500/15 text-amber-300 border border-amber-400/30`;
}

function roleBadge(role) {
  const base = 'inline-block rounded-lg px-3 py-1 text-[10px] uppercase tracking-[0.15em] font-bold';
  if (role === 'superAdmin') return `${base} bg-purple-500/15 text-purple-300 border border-purple-400/30`;
  if (role === 'admin')      return `${base} bg-[rgba(183,145,67,0.15)] text-[#D7B46A] border border-[rgba(183,145,67,0.3)]`;
  return `${base} bg-[rgba(183,145,67,0.08)] text-[#b89b84] border border-[rgba(183,145,67,0.2)]`;
}

function roleLabel(role) {
  if (role === 'superAdmin') return '👑 Super Admin';
  if (role === 'admin')      return '🛡️ Admin';
  return '👤 User';
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { canEdit, isSuperAdmin } = usePermissions();

  const [stats, setStats] = useState({
    totalUsers: 0, totalEvents: 0, totalRegistrations: 0,
    pendingPayments: 0, approvedPayments: 0, rejectedPayments: 0,
    refundedPayments: 0, cancelledPayments: 0,
    totalRevenue: 0, totalRefunded: 0, otherIncome: 0,
    delegates: 0, sponsors: 0, committees: 0, admins: 0, superAdmins: 0,
  });
  const [recentPayments, setRecentPayments] = useState([]);
  const [recentUsers,    setRecentUsers]    = useState([]);
  const [eventsOverview, setEventsOverview] = useState([]);
  const [allData,        setAllData]        = useState({ payments: [], registrations: [], committees: [] });
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [
          { data: users },
          { data: events },
          { data: regs },
          { data: pays },
          { data: comms },
          { data: fins },
        ] = await Promise.all([
          supabase.from('users').select('*').order('created_at', { ascending: false }),
          supabase.from('events').select('*').order('created_at', { ascending: false }),
          supabase.from('registrations').select('type, event_id'),
          supabase.from('payments').select('*').order('created_at', { ascending: false }),
          supabase.from('committees').select('*'),
          supabase.from('financials').select('amount, income_type'),   // ← fetch other income
        ]);

        const payments      = keysToCamel(pays || []);
        const registrations = regs || [];
        const usersData     = keysToCamel(users || []);
        const eventsData    = keysToCamel(events || []);
        const commsData     = keysToCamel(comms || []);
        const financials    = keysToCamel(fins || []);

        const approved    = payments.filter(p => p.status === 'approved');
        const refunded    = payments.filter(p => p.status === 'refunded');
        const otherIncome = financials
          .filter(f => f.incomeType === 'income')
          .reduce((s, f) => s + (f.amount || 0), 0);

        const totalPayRev = approved.reduce((s, p) => s + (p.amount || 0), 0);

        setStats({
          totalUsers:         usersData.length,
          totalEvents:        eventsData.length,
          totalRegistrations: registrations.length,
          pendingPayments:    payments.filter(p => p.status === 'pending').length,
          approvedPayments:   approved.length,
          rejectedPayments:   payments.filter(p => p.status === 'rejected').length,
          refundedPayments:   refunded.length,
          cancelledPayments:  payments.filter(p => p.status === 'cancelled').length,
          totalRevenue:       totalPayRev + otherIncome,   // ← includes other income
          totalRefunded:      refunded.reduce((s, p) => s + (p.amount || 0), 0),
          otherIncome,
          delegates:          registrations.filter(r => r.type === 'delegate').length,
          sponsors:           registrations.filter(r => r.type === 'sponsor').length,
          committees:         commsData.length,
          admins:             usersData.filter(u => u.role === 'admin').length,
          superAdmins:        usersData.filter(u => u.role === 'superAdmin').length,
        });

        setRecentPayments(payments.slice(0, 5));
        setRecentUsers(usersData.slice(0, 8));
        setEventsOverview(eventsData);
        setAllData({ payments, registrations, committees: commsData });
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const pieData = [
    { name: 'Delegates', value: stats.delegates },
    { name: 'Sponsors',  value: stats.sponsors },
  ];
  const barData = [
    { name: 'Pending',   count: stats.pendingPayments },
    { name: 'Approved',  count: stats.approvedPayments },
    { name: 'Rejected',  count: stats.rejectedPayments },
    { name: 'Refunded',  count: stats.refundedPayments },
    { name: 'Cancelled', count: stats.cancelledPayments },
  ];

  const approvedPayments = allData.payments.filter(p => p.status === 'approved');

  function eventDateRange(ev) {
    const s = ev.startDate || ev.date;
    const e = ev.endDate;
    if (!s) return '—';
    if (e && e !== s) return `${s} → ${e}`;
    return s;
  }

  const BackgroundOverlay = () => (
    <div className="absolute inset-0 z-0">
      <img src={BG_SRC} alt="" className="w-full h-full object-cover grayscale brightness-[0.15]" />
      <div className="absolute inset-0" style={{ background: BG_GRADIENT }} />
    </div>
  );

  if (loading) return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: BG_COLOR }}>
      <BackgroundOverlay />
      <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full blur-3xl opacity-40 pointer-events-none" style={{ background: GLOW_GOLD }} />
      <div className="absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full blur-3xl opacity-30 pointer-events-none" style={{ background: GLOW_RED }} />
      <Sidebar />
      <div className="relative z-10 md:pl-[272px] flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 rounded-full border-2 border-[#B79143]/20 border-t-[#B79143] animate-spin" />
      </div>
    </div>
  );

  const netRev = stats.totalRevenue - stats.totalRefunded;

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: BG_COLOR }}>
      <BackgroundOverlay />
      <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full blur-3xl opacity-40 pointer-events-none" style={{ background: GLOW_GOLD }} />
      <div className="absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full blur-3xl opacity-30 pointer-events-none" style={{ background: GLOW_RED }} />

      <Sidebar />

      <div className="relative z-10 md:pl-[272px]">
        <div className="px-4 pb-12 pt-20 sm:px-6 lg:px-8 md:pt-8">

          {/* Header */}
          <div className="mb-8">
            <p className="text-[#B79143] uppercase tracking-[0.3em] text-[11px] mb-3">Dashboard</p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#F8F3EA]">
              {isSuperAdmin ? 'Super Admin Dashboard' : 'Admin Dashboard'}
            </h1>
            <p className="text-sm text-[#b89b84] mt-2">
              {isSuperAdmin ? 'Full platform control and analytics' : 'Read-only overview of platform activity'}
            </p>
          </div>

          {/* View-only banner */}
          {!canEdit && (
            <div className="rounded-xl border border-amber-500/35 bg-amber-950/25 px-4 py-3 text-sm text-amber-100/90 flex items-center gap-3 mb-6">
              <span className="text-lg">👁️</span>
              <span>You have <strong>view-only</strong> access. All data is live but no changes can be made from this account.</span>
            </div>
          )}

          {/* Pending payment alert */}
          {canEdit && stats.pendingPayments > 0 && (
            <div className="rounded-xl border border-amber-500/35 bg-amber-950/25 backdrop-blur-sm px-4 py-4 text-sm leading-relaxed text-amber-100/90 flex items-center gap-3 mb-6 cursor-pointer hover:bg-amber-950/35 transition"
              onClick={() => navigate('/admin/payments')}>
              <span className="text-lg shrink-0">⏳</span>
              <span><strong>{stats.pendingPayments} payment{stats.pendingPayments !== 1 ? 's' : ''}</strong> awaiting your approval. <span className="underline text-amber-300">Review now →</span></span>
            </div>
          )}

          {/* Stat Cards — Row 1 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-4 sm:mb-6">
            {[
              { label: 'Total Users',   value: stats.totalUsers,         icon: '👥', sub: `${stats.superAdmins} super admin${stats.superAdmins !== 1 ? 's' : ''}, ${stats.admins} admin${stats.admins !== 1 ? 's' : ''}` },
              { label: 'Total Events',  value: stats.totalEvents,        icon: '📅', sub: 'created events' },
              { label: 'Registrations', value: stats.totalRegistrations, icon: '📋', sub: 'all time' },
              { label: 'Committees',    value: stats.committees,         icon: '⭐', sub: 'across all events' },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl border backdrop-blur-xl p-4 sm:p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#B79143]/5"
                style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
                <div className="text-[1.2rem] sm:text-[1.5rem] mb-2">{s.icon}</div>
                <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.25em] text-[#B79143] font-bold mb-2">{s.label}</div>
                <div className="text-3xl sm:text-4xl font-bold text-[#F8F3EA]">{s.value}</div>
                <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-[#b89b84]">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Stat Cards — Row 2 (financial) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-4 sm:mb-6">
            {[
              { label: 'Pending',       value: stats.pendingPayments,              icon: '⏳', sub: 'awaiting approval',        highlight: false },
              { label: 'Approved',      value: stats.approvedPayments,             icon: '✅', sub: 'confirmed payments',        highlight: false },
              { label: 'Gross Revenue', value: formatCurrency(stats.totalRevenue), icon: '💰', sub: 'payments + other income',   highlight: true },
              { label: 'Net Revenue',   value: formatCurrency(netRev),             icon: '📊', sub: 'gross − refunds',           highlight: true },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl border backdrop-blur-xl p-4 sm:p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#B79143]/5"
                style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
                <div className="text-[1.2rem] sm:text-[1.5rem] mb-2">{s.icon}</div>
                <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.25em] text-[#B79143] font-bold mb-2">{s.label}</div>
                <div className={`font-bold break-all ${s.highlight ? 'text-xl sm:text-2xl' : 'text-3xl sm:text-4xl'} text-[#F8F3EA]`}>{s.value}</div>
                <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-[#b89b84]">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Other Income note — only show if there is any */}
          {stats.otherIncome > 0 && (
            <div className="rounded-xl border border-emerald-500/35 bg-emerald-950/20 backdrop-blur-sm px-4 py-4 text-sm leading-relaxed text-emerald-100/90 flex items-start gap-3 mb-4 sm:mb-6">
              <span className="text-[1.1rem] shrink-0 mt-0.5">💵</span>
              <span>
                <strong>{formatCurrency(stats.otherIncome)}</strong> in other income (grants, sponsorships, etc.) is included in gross revenue.
              </span>
            </div>
          )}

          {/* Refund Warning */}
          {stats.refundedPayments > 0 && (
            <div className="rounded-xl border border-amber-500/35 bg-amber-950/25 backdrop-blur-sm px-4 py-4 text-sm leading-relaxed text-amber-100/90 flex items-start gap-3 mb-4 sm:mb-6">
              <span className="text-[1.1rem] shrink-0 mt-0.5">🔄</span>
              <span>
                <strong>{stats.refundedPayments} refund{stats.refundedPayments !== 1 ? 's' : ''}</strong> totalling{' '}
                <strong className="text-red-400">{formatCurrency(stats.totalRefunded)}</strong> issued.
                Net: <strong className="text-[#D7B46A]">{formatCurrency(netRev)}</strong>
              </span>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="rounded-2xl border backdrop-blur-xl p-4 sm:p-6" style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
              <h3 className="text-lg font-bold text-[#F8F3EA] mb-4">Payment Status Breakdown</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData}>
                  <XAxis dataKey="name" stroke="#9A7B28" tick={{ fill: '#b89b84', fontSize: 10 }} />
                  <YAxis stroke="#9A7B28" tick={{ fill: '#b89b84', fontSize: 10 }} width={30} />
                  <Tooltip contentStyle={{ background: 'rgba(68,7,19,0.95)', border: '1px solid rgba(183,145,67,0.3)', borderRadius: '12px', color: '#F8F3EA', fontSize: '0.8rem' }} />
                  <Bar dataKey="count" fill="url(#goldGradient)" radius={[4, 4, 0, 0]} />
                  <defs>
                    <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D7B46A" /><stop offset="100%" stopColor="#8E6B2F" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-2xl border backdrop-blur-xl p-4 sm:p-6" style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
              <h3 className="text-lg font-bold text-[#F8F3EA] mb-4">Registration Types</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'rgba(68,7,19,0.95)', border: '1px solid rgba(183,145,67,0.3)', borderRadius: '12px', color: '#F8F3EA', fontSize: '0.8rem' }} />
                  <Legend wrapperStyle={{ color: '#F8F3EA', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Actions — superAdmin only */}
          {canEdit && (
            <div className="rounded-2xl border backdrop-blur-xl p-4 sm:p-6 mb-4 sm:mb-6" style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
              <h2 className="text-lg font-bold text-[#F8F3EA] mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Review Payments', icon: '⏳', path: '/admin/payments',         highlight: stats.pendingPayments > 0, badge: stats.pendingPayments || null },
                  { label: 'Create Event',     icon: '📅', path: '/admin/events',           highlight: false, badge: null },
                  { label: 'Financials',       icon: '💰', path: '/admin/financials',       highlight: false, badge: null },
                  { label: 'Manage Users',     icon: '👥', path: '/admin/admin-management', highlight: false, badge: null },
                ].map((a, i) => (
                  <button key={i} onClick={() => navigate(a.path)}
                    className={`relative rounded-xl border p-3 sm:p-4 text-left transition-all hover:scale-[1.02] hover:shadow-lg ${a.highlight ? 'border-amber-400/40 bg-amber-500/10 hover:bg-amber-500/15' : 'hover:bg-[rgba(183,145,67,0.06)]'}`}
                    style={!a.highlight ? { borderColor: BORDER_GOLD, backgroundColor: 'rgba(68,7,19,0.3)' } : {}}>
                    {a.badge ? (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-500 text-[#2A0B12] text-[10px] font-bold flex items-center justify-center">
                        {a.badge > 9 ? '9+' : a.badge}
                      </span>
                    ) : null}
                    <div className="text-xl mb-2">{a.icon}</div>
                    <div className={`text-xs font-semibold uppercase tracking-wide ${a.highlight ? 'text-amber-300' : 'text-[#B79143]'}`}>{a.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Payments */}
          <div className="rounded-3xl border backdrop-blur-xl p-4 sm:p-6 mb-4 sm:mb-6" style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-[#F8F3EA]">Recent Payments</h2>
                <p className="text-sm text-[#b89b84] mt-1">Latest payment transactions.</p>
              </div>
              <button onClick={() => navigate('/admin/payments')}
                className="rounded-xl border px-4 py-2 text-sm text-[#B79143] hover:bg-[rgba(183,145,67,0.08)] transition"
                style={{ borderColor: BORDER_GOLD_MEDIUM }}>
                View All
              </button>
            </div>

            {recentPayments.length === 0 ? (
              <p className="text-[#b89b84] text-sm py-6">No payments yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left" style={{ borderColor: 'rgba(183,145,67,0.12)' }}>
                      {['Event', 'Type', 'Method', 'Amount', 'Status'].map(h => (
                        <th key={h} className="pb-4 text-[#B79143] uppercase tracking-[0.2em] text-[11px] font-bold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayments.map(p => (
                      <tr key={p.id} className="border-b hover:bg-[rgba(183,145,67,0.04)] transition" style={{ borderColor: BORDER_GOLD_LIGHT }}>
                        <td className="py-4 pr-4 font-semibold text-[#F8F3EA]">{p.eventName || '—'}</td>
                        <td className="py-4 pr-4">
                          <span className="inline-block rounded-lg border px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-[#B79143]"
                            style={{ borderColor: 'rgba(183,145,67,0.25)', backgroundColor: 'rgba(183,145,67,0.08)' }}>
                            {p.registrationType}
                          </span>
                        </td>
                        <td className="py-4 pr-4 text-[#b89b84]">{p.paymentMethod || '—'}</td>
                        <td className="py-4 pr-4 text-[#F8F3EA]">
                          <span className={p.status === 'refunded' ? 'text-red-400' : ''}>
                            {p.status === 'refunded' ? '−' : ''}{formatCurrency(p.amount)}
                          </span>
                        </td>
                        <td className="py-4"><span className={badgeCls(p.status)}>{p.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Users */}
          <div className="rounded-3xl border backdrop-blur-xl p-4 sm:p-6 mb-4 sm:mb-6" style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-[#F8F3EA]">Recent Users</h2>
                <p className="text-sm text-[#b89b84] mt-1">Latest registered participants.</p>
          </div>
              <button onClick={() => navigate('/admin/admin-management')}
                className="rounded-xl border px-4 py-2 text-sm text-[#B79143] hover:bg-[rgba(183,145,67,0.08)] transition"
                style={{ borderColor: BORDER_GOLD_MEDIUM }}>
                {canEdit ? 'Manage Users' : 'View Users'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left" style={{ borderColor: 'rgba(183,145,67,0.12)' }}>
                    {['User', 'Email', 'Phone', 'Role', 'Registered'].map(h => (
                      <th key={h} className="pb-4 text-[#B79143] uppercase tracking-[0.2em] text-[11px] font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-[#b89b84] text-sm">No users yet.</td></tr>
                  ) : recentUsers.map(u => (
                    <tr key={u.id} className="border-b hover:bg-[rgba(183,145,67,0.04)] transition" style={{ borderColor: BORDER_GOLD_LIGHT }}>
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[rgba(183,145,67,0.15)] border border-[#B79143]/30 flex items-center justify-center text-[#B79143] font-bold text-xs shrink-0">
                            {getInitials(u.fullName)}
                          </div>
                          <span className="font-semibold text-[#F8F3EA]">{u.fullName || '—'}</span>
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-[#b89b84]">{u.email}</td>
                      <td className="py-4 pr-4 text-[#b89b84]">{u.phone || '—'}</td>
                      <td className="py-4 pr-4">
                        <span className={roleBadge(u.role)}>{roleLabel(u.role)}</span>
                      </td>
                      <td className="py-4 text-[#b89b84] text-xs">{formatDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Events Overview */}
          <div className="rounded-3xl border backdrop-blur-xl p-4 sm:p-6" style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-[#F8F3EA]">Events Overview</h2>
                <p className="text-sm text-[#b89b84] mt-1">Summary of all created events.</p>
              </div>
              <button onClick={() => navigate('/admin/events')}
                className="rounded-xl border px-4 py-2 text-sm text-[#B79143] hover:bg-[rgba(183,145,67,0.08)] transition"
                style={{ borderColor: BORDER_GOLD_MEDIUM }}>
                {canEdit ? 'Manage Events' : 'View Events'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left" style={{ borderColor: 'rgba(183,145,67,0.12)' }}>
                    {['Event', 'Date Range', 'Venue', 'Committees', 'Registrations', 'Revenue', 'Status'].map(h => (
                      <th key={h} className="pb-4 text-[#B79143] uppercase tracking-[0.2em] text-[11px] font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {eventsOverview.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-[#b89b84] text-sm">No events created yet.</td></tr>
                  ) : eventsOverview.map(ev => {
                    const evRegs  = allData.registrations.filter(r => r.eventId === ev.id);
                    const evPays  = approvedPayments.filter(p => p.eventId === ev.id);
                    const evRev   = evPays.reduce((s, p) => s + (p.amount || 0), 0);
                    const evComms = allData.committees.filter(c => c.eventId === ev.id).length;
                    return (
                      <tr key={ev.id} className="border-b hover:bg-[rgba(183,145,67,0.04)] transition cursor-pointer"
                        style={{ borderColor: BORDER_GOLD_LIGHT }}
                        onClick={() => navigate('/admin/events')}>
                        <td className="py-4 pr-4 font-bold text-[#F8F3EA]">{ev.name}</td>
                        <td className="py-4 pr-4 text-[#b89b84] text-xs">{eventDateRange(ev)}</td>
                        <td className="py-4 pr-4 text-[#b89b84]">{ev.venue || '—'}</td>
                        <td className="py-4 pr-4 text-[#F8F3EA]">{evComms}</td>
                        <td className="py-4 pr-4 text-[#F8F3EA]">{evRegs.length}</td>
                        <td className="py-4 pr-4 text-[#D7B46A] font-semibold">{formatCurrency(evRev)}</td>
                        <td className="py-4">
                          <span className={`inline-block rounded-lg px-3 py-1 text-[10px] uppercase tracking-[0.15em] font-bold ${
                            ev.status === 'active'     ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30'
                            : ev.status === 'upcoming' ? 'bg-amber-500/15 text-amber-300 border border-amber-400/30'
                            : 'bg-red-500/15 text-red-300 border border-red-400/30'
                          }`}>
                            {ev.status || 'active'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}