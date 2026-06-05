import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabase/config";

export default function UserDropdown({ user, userProfile }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const initial = (userProfile?.fullName || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 overflow-hidden flex items-center justify-center backdrop-blur-sm transition-all"
        style={{ borderColor: 'rgba(183,145,67,0.40)', background: 'rgba(15,5,10,0.92)' }}>
        {userProfile?.profileImage
          ? <img src={userProfile.profileImage} alt="Profile" className="w-full h-full object-cover" />
          : <span className="font-bold text-xs sm:text-sm" style={{ color: '#B79143' }}>{initial}</span>
        }
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-xl border shadow-2xl overflow-hidden z-50"
          style={{ background: 'rgba(15,5,10,0.92)', borderColor: 'rgba(183,145,67,0.18)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(183,145,67,0.12)' }}>
            <div className="text-sm font-semibold truncate" style={{ color: '#F8F3EA' }}>{userProfile?.fullName || 'Delegate'}</div>
            <div className="text-xs truncate" style={{ color: '#b89b84' }}>{user?.email}</div>
          </div>
          <div className="py-1">
            {[
              { label: 'Profile',     icon: '👤', path: '/profile'     },
              { label: 'Cards',       icon: '🪪', path: '/my-card'     },
              { label: 'My Payments', icon: '💳', path: '/my-payments' },
            ].map(item => (
              <button key={item.label} onClick={() => { setOpen(false); navigate(item.path); }}
                className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors hover:opacity-80"
                style={{ color: '#c9b29a' }}>
                <span>{item.icon}</span>{item.label}
              </button>
            ))}
          </div>
          <div className="border-t py-1" style={{ borderColor: 'rgba(183,145,67,0.12)' }}>
            <button onClick={() => { setOpen(false); handleLogout(); }}
              className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 text-red-400 hover:text-red-300 transition-colors">
              <span>🚪</span>Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}