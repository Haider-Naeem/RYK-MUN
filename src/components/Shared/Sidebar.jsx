// src/components/Shared/Sidebar.jsx
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

export function isAdminUser(userProfile) {
  const role = userProfile?.role;
  return role === 'admin' || role === 'superAdmin';
}

export function adminPadClass(userProfile) {
  return isAdminUser(userProfile) ? 'md:pl-[272px]' : '';
}

/* ── SVG ICONS ── */
const Icons = {
  Dashboard: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  Events: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  News: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/>
      <circle cx="5" cy="19" r="1"/>
    </svg>
  ),
  Users: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Payment: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  ),
  Chart: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
  Register: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/>
      <line x1="9" y1="15" x2="15" y2="15"/>
    </svg>
  ),
  Card: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <circle cx="8" cy="12" r="2"/><path d="M13 10h6M13 14h6"/>
    </svg>
  ),
  Profile: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Admin: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/>
      <path d="M16 11l2 2 4-4"/>
    </svg>
  ),
  Logout: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Menu: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  Close: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Eye: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
};

const sharedAdminNavItems = [
  { label: 'Dashboard',         icon: 'Dashboard', path: '/admin' },
  { label: 'Events',            icon: 'Events',    path: '/admin/events' },
  { label: 'News',              icon: 'News',      path: '/admin/news' },
  { label: 'Payment Approval',  icon: 'Payment',   path: '/admin/payments' },
  { label: 'All Registrations', icon: 'Users',     path: '/admin/registrations' },
  { label: 'Financials',        icon: 'Chart',     path: '/admin/financials' },
  { label: 'User Management',   icon: 'Admin',     path: '/admin/admin-management' },
  { label: 'Profile',           icon: 'Profile',   path: '/profile' },
];

const delegateMobileNav = [
  { label: 'Profile',     icon: 'Profile', path: '/profile' },
  { label: 'Cards',       icon: 'Card',    path: '/my-card' },
  { label: 'My Payments', icon: 'Payment', path: '/my-payments' },
];

/** Top bar for logged-in delegates (no sidebar) */
export function DelegateMobileBar() {
  const { userProfile, logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  async function handleLogout() {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/');
    } catch {
      toast.error('Logout failed');
    }
  }

  const initial = (userProfile?.fullName || currentUser?.email || 'U').charAt(0).toUpperCase();

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-[300] flex items-center justify-between px-5 h-16 border-b border-[rgba(201,168,76,0.3)] bg-[rgba(10,0,2,0.95)] backdrop-blur-lg">
      <button type="button" onClick={() => navigate('/')} className="font-[Cinzel,serif] text-xl font-black text-[#C9A84C] tracking-[0.15em]">
        RYK MUN
      </button>
      <div className="relative" ref={ref}>
        <button type="button" onClick={() => setOpen(!open)} className="w-10 h-10 rounded-full border-2 border-[rgba(201,168,76,0.4)] flex items-center justify-center text-[#C9A84C] font-bold text-sm">
          {userProfile?.profileImage
            ? <img src={userProfile.profileImage} alt="" className="w-full h-full rounded-full object-cover" />
            : initial}
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-52 rounded-xl border border-[rgba(183,145,67,0.25)] bg-[rgba(10,0,2,0.98)] shadow-2xl overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-[rgba(183,145,67,0.12)]">
              <div className="text-sm font-semibold text-[#F8F3EA] truncate">{userProfile?.fullName || 'Delegate'}</div>
              <div className="text-xs text-[#b89b84] truncate">{currentUser?.email}</div>
            </div>
            <div className="py-1">
              {delegateMobileNav.map(item => {
                const Icon = Icons[item.icon];
                return (
                  <button key={item.path} type="button"
                    onClick={() => { setOpen(false); navigate(item.path); }}
                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 text-[#c9b29a] hover:text-[#C9A84C] transition-colors">
                    {Icon && <span className="opacity-90 shrink-0"><Icon /></span>}
                    {item.label}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-[rgba(183,145,67,0.12)] py-1">
              <button type="button" onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 text-red-400">
                <Icons.Logout /><span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── MAIN SIDEBAR COMPONENT ── */
export default function Sidebar() {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!isAdminUser(userProfile)) return null;

  const role = userProfile?.role;
  const isSuperAdmin = role === 'superAdmin';
  const navItems = sharedAdminNavItems;

  async function handleLogout() {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/');
    } catch {
      toast.error('Logout failed');
    }
  }

  // ✅ FIXED: Exact matching for Dashboard, startsWith for sub-routes
  function isActive(item) {
    const currentPath = location.pathname;
    const itemPath = item.path;
    
    // For Dashboard (/admin), only match exact path
    if (itemPath === '/admin') {
      return currentPath === '/admin';
    }
    
    // For Profile (/profile), handle similarly to Dashboard
    if (itemPath === '/profile') {
      return currentPath === '/profile';
    }
    
    // For other admin routes, match exact path OR sub-routes
    return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
  }

  const SidebarContent = ({ isMobile = false }) => (
    <div className={`flex flex-col ${isMobile ? '' : 'h-full'}`}>
      {/* Header */}
      <div className={`px-5 py-7 border-b border-[rgba(201,168,76,0.3)] text-center ${isMobile ? 'bg-[rgba(10,0,2,0.95)]' : ''}`}>
        <div className="font-[Cinzel,serif] text-[1.65rem] font-black text-[#C9A84C] tracking-[0.15em] leading-none">
          RYK MUN
        </div>
        <div className="text-[#9A7B28] text-[0.62rem] tracking-[0.2em] uppercase font-bold mt-1">
          {isSuperAdmin ? 'Super Administrator' : 'Administrator'}
        </div>

        {/* Read-only badge for admin role */}
        {!isSuperAdmin && (
          <div className="mt-2 mx-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.15em] bg-amber-500/15 text-amber-300 border border-amber-400/30">
            <Icons.Eye />
            View Only
          </div>
        )}

        <div className="text-[#9A7B28] text-[0.72rem] mt-2.5 font-medium break-words font-[Montserrat,sans-serif]">
          {userProfile?.fullName || userProfile?.email}
        </div>
      </div>

      {/* Navigation Items */}
      <nav className={`${isMobile ? 'py-2' : 'flex-1 py-3 overflow-y-auto'}`}>
        {navItems.map((item) => {
          const Icon = Icons[item.icon];
          const active = isActive(item);
          return (
            <div
              key={item.path}
              onClick={() => {
                navigate(item.path);
                if (isMobile) setIsMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 px-6 py-3.5 cursor-pointer transition-all text-sm font-semibold tracking-wide font-[Montserrat,sans-serif]
                ${active
                  ? 'bg-[rgba(201,168,76,0.15)] text-[#C9A84C] border-l-4 border-[#C9A84C]'
                  : 'text-[#F5E6C0] hover:bg-[rgba(201,168,76,0.1)] hover:text-[#C9A84C]'
                }`}
            >
              {Icon && <span className="opacity-90 shrink-0"><Icon /></span>}
              <span>{item.label}</span>
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className={`border-t border-[rgba(201,168,76,0.3)] ${isMobile ? 'mt-auto' : ''}`}>
        <div
          onClick={handleLogout}
          className="flex items-center gap-3 px-6 py-3.5 cursor-pointer text-[#8B7355] text-sm font-semibold tracking-wide font-[Montserrat,sans-serif] hover:bg-[rgba(201,168,76,0.08)] hover:text-[#C9A84C] transition-all"
        >
          <Icons.Logout />
          <span>Sign Out</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-[300] flex items-center justify-between px-5 h-16 border-b border-[rgba(201,168,76,0.3)] bg-[rgba(10,0,2,0.95)] backdrop-blur-lg">
        <div className="font-[Cinzel,serif] text-xl font-black text-[#C9A84C] tracking-[0.15em]">
          RYK MUN
        </div>
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
          className="w-10 h-10 flex items-center justify-center text-[#C9A84C] hover:bg-[rgba(201,168,76,0.15)] rounded transition-colors"
        >
          {isMobileMenuOpen ? <Icons.Close /> : <Icons.Menu />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed top-16 left-0 right-0 z-[290] bg-[rgba(10,0,2,0.98)] border-b border-[rgba(201,168,76,0.3)] shadow-2xl max-h-[85vh] overflow-y-auto">
          <SidebarContent isMobile={true} />
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:block fixed left-0 top-0 bottom-0 z-[200] w-[272px] bg-[rgba(10,0,2,0.6)] border-r border-[rgba(201,168,76,0.3)] backdrop-blur-xl overflow-y-auto">
        <SidebarContent />
      </div>
    </>
  );
}