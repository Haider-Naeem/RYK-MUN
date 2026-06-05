// src/pages/AdminManagement.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase/config';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import Sidebar from '../Shared/Sidebar';
import { formatDate, getInitials } from '../../utils/helpers';
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

const badgeAdmin      = 'inline-block rounded-lg px-3 py-1 text-[10px] uppercase tracking-[0.15em] font-bold bg-[rgba(183,145,67,0.15)] text-[#D7B46A] border border-[rgba(183,145,67,0.3)]';
const badgeSuperAdmin = 'inline-block rounded-lg px-3 py-1 text-[10px] uppercase tracking-[0.15em] font-bold bg-purple-500/15 text-purple-300 border border-purple-400/30';
const badgeUser       = 'inline-block rounded-lg px-3 py-1 text-[10px] uppercase tracking-[0.15em] font-bold bg-[rgba(183,145,67,0.08)] text-[#b89b84] border border-[rgba(183,145,67,0.2)]';

function roleBadgeClass(role) {
  if (role === 'superAdmin') return badgeSuperAdmin;
  if (role === 'admin')      return badgeAdmin;
  return badgeUser;
}

function roleLabel(role) {
  if (role === 'superAdmin') return '👑 Super Admin';
  if (role === 'admin')      return '🛡️ Admin';
  return '👤 User';
}

export default function AdminManagement() {
  const { currentUser } = useAuth();
  const { canEdit } = usePermissions();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [resetModal, setResetModal] = useState(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setUsers(keysToCamel(data || []));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function sendReset(email) {
    if (!canEdit) return;
    setResetting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success(`Password reset email sent to ${email}`);
      setResetModal(null);
    } catch (e) {
      toast.error('Failed to send reset email');
    } finally {
      setResetting(false);
    }
  }

  const filtered = users.filter(u => {
    const matchRole = filterRole === 'all' || u.role === filterRole;
    const matchSearch =
      !search ||
      (u.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const roleCounts = {
    superAdmin: users.filter(u => u.role === 'superAdmin').length,
    admin:      users.filter(u => u.role === 'admin').length,
    user:       users.filter(u => u.role === 'user').length,
  };

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
          <h1 className="text-2xl sm:text-3xl font-bold text-[#F8F3EA]">User Management</h1>
          <p className="text-sm text-[#b89b84] mt-2">
            {canEdit ? 'Manage users and account access' : 'View user accounts and roles'}
          </p>
        </div>

     

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-5 mb-6">
          {[
            { label: 'Super Admins', value: roleCounts.superAdmin, icon: '👑', desc: 'Full platform access',  color: '#c084fc' },
            { label: 'Admins',       value: roleCounts.admin,      icon: '🛡️', desc: 'View-only access',     color: '#D7B46A' },
            { label: 'Users',        value: roleCounts.user,       icon: '👤', desc: 'Regular participants', color: '#b89b84' },
          ].map((s, i) => (
            <div
              key={i}
              className="rounded-2xl border backdrop-blur-xl p-4 sm:p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#B79143]/5"
              style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}
            >
              <div className="text-2xl sm:text-3xl mb-2">{s.icon}</div>
              <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.25em] text-[#B79143] font-bold mb-2">{s.label}</div>
              <div className="text-3xl sm:text-4xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-[#b89b84]">{s.desc}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            className={inputCls}
            placeholder="🔍 Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            type="search"
          />
          <select
            className={inputCls + ' w-full sm:w-[200px] min-w-0 shrink-0 appearance-none'}
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="superAdmin">Super Admins</option>
            <option value="admin">Admins Only</option>
            <option value="user">Users Only</option>
          </select>
        </div>

        {/* Users Panel */}
        <div className="rounded-2xl border backdrop-blur-xl p-4 sm:p-6" style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-[#b89b84]">
              Showing <strong className="text-[#B79143]">{filtered.length}</strong> of {users.length} users
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center min-h-[200px]">
              <div className="w-10 h-10 rounded-full border-2 border-[#B79143]/20 border-t-[#B79143] animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🔎</div>
              <p className="text-[#b89b84] text-sm">No users found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((u) => (
                <UserCard
                  key={u.id || u.uid || Math.random()}
                  user={u}
                  isSelf={u.id === currentUser?.id || u.uid === currentUser?.id}
                  canEdit={canEdit}
                  onReset={() => setResetModal(u)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Password Reset Modal (superAdmin only) ── */}
      {resetModal && canEdit && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && setResetModal(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto"
            style={{ borderColor: BORDER_GOLD_STRONG, backgroundColor: BG_COLOR }}
          >
            <div
              className="sticky top-0 flex items-center justify-between px-6 py-5 border-b"
              style={{ borderColor: BORDER_GOLD_STRONG, backgroundColor: BG_COLOR }}
            >
              <h3 className="text-lg font-bold text-[#F8F3EA]">🔑 Password Reset</h3>
              <button
                className="rounded-lg border px-3 py-1.5 text-sm text-[#B79143] hover:bg-[#B79143]/10 transition"
                style={{ borderColor: BORDER_GOLD_MEDIUM }}
                onClick={() => setResetModal(null)}
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl border p-4 text-sm" style={{ borderColor: BORDER_GOLD, backgroundColor: 'rgba(183,145,67,0.08)' }}>
                <p className="text-[#F8F3EA]">
                  <strong className="text-[#B79143]">User:</strong> {resetModal.fullName || '—'}
                </p>
                <p className="text-[#F8F3EA] mt-1">
                  <strong className="text-[#B79143]">Email:</strong> {resetModal.email}
                </p>
              </div>
              <div className="rounded-xl border border-blue-400/30 bg-blue-500/10 p-4 text-sm text-blue-100">
                💡 A password reset link will be sent to the user's email address.
              </div>
              <p className="text-sm text-[#b89b84]">
                Send password reset link to <strong className="text-[#F8F3EA]">{resetModal.email}</strong>?
              </p>
            </div>

            <div
              className="sticky bottom-0 flex gap-3 justify-end px-6 py-5 border-t"
              style={{ borderColor: BORDER_GOLD_STRONG, backgroundColor: BG_COLOR }}
            >
              <button
                className="rounded-xl border px-5 py-2.5 text-sm font-semibold text-[#B79143] transition hover:bg-[#B79143]/10"
                style={{ borderColor: BORDER_GOLD_MEDIUM }}
                onClick={() => setResetModal(null)}
              >
                Cancel
              </button>
              <button
                className="rounded-xl bg-gradient-to-r from-[#8E6B2F] via-[#B79143] to-[#D7B46A] px-5 py-2.5 text-sm font-semibold text-[#2A0B12] transition hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                onClick={() => sendReset(resetModal.email)}
                disabled={resetting}
              >
                {resetting ? 'Sending…' : '🔑 Send Reset Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── User Card Component ── */
function UserCard({ user, isSelf, canEdit, onReset }) {
  const role = user.role;
  const profileImage = user.profileImage || user.profile_image;
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className="rounded-2xl border backdrop-blur-sm p-4 sm:p-5 flex flex-col transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:shadow-[#B79143]/5"
      style={{ borderColor: BORDER_GOLD, backgroundColor: CARD_BG }}
    >
      {/* Top Row - Avatar + Badge */}
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 overflow-hidden shrink-0 flex items-center justify-center"
          style={{ borderColor: BORDER_GOLD_MEDIUM, backgroundColor: 'rgba(183,145,67,0.1)' }}
        >
          {profileImage && !imgError ? (
            <img
              src={profileImage}
              alt={user.fullName || 'Profile'}
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="text-[#B79143] font-bold text-base sm:text-lg">
              {getInitials(user.fullName)}
            </span>
          )}
        </div>
        <span className={roleBadgeClass(role)}>{roleLabel(role)}</span>
      </div>

      {/* Name */}
      <div className="mb-3">
        <h3 className="font-semibold text-[#F8F3EA] text-base sm:text-lg">
          {user.fullName || '—'}
          {isSelf && (
            <span className="ml-2 text-xs text-[#B79143] font-normal">(You)</span>
          )}
        </h3>
      </div>

      {/* Contact Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-start gap-2">
          <span className="text-[10px] uppercase tracking-wider text-[#B79143] font-bold shrink-0 mt-0.5 w-12">Email</span>
          <span className="text-sm text-[#b89b84] break-all">{user.email || '—'}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-[10px] uppercase tracking-wider text-[#B79143] font-bold shrink-0 mt-0.5 w-12">Phone</span>
          <span className="text-sm text-[#b89b84]">{user.phone || '—'}</span>
        </div>
      </div>

      {/* Actions — only superAdmin sees the Reset Password button */}
      <div className="mt-auto pt-4 border-t" style={{ borderColor: BORDER_GOLD_LIGHT }}>
        {canEdit ? (
          <button
            onClick={onReset}
            className="w-full rounded-xl border px-4 py-2.5 text-xs font-semibold text-[#B79143] transition hover:bg-[rgba(183,145,67,0.08)]"
            style={{ borderColor: BORDER_GOLD_MEDIUM }}
          >
            🔑 Reset Password
          </button>
        ) : (
          <div className="w-full rounded-xl border px-4 py-2.5 text-xs font-semibold text-center text-[#b89b84] cursor-not-allowed opacity-50"
            style={{ borderColor: BORDER_GOLD_LIGHT }}>
            🔒 View Only
          </div>
        )}
      </div>

      {/* Join Date */}
      <div className="text-[10px] text-[#b89b84] mt-3 text-right">
        Joined {formatDate(user.createdAt)}
      </div>
    </div>
  );
}