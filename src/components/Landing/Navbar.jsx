import { useState } from "react";
import UserDropdown from "./components/UserDropdown";
import DP from "../../Assets/DP.webp";

const LOGO_SRC = DP;

const NAV_LINKS = [
  { label: "Home",       id: "home"       },
  { label: "About",      id: "about"      },
  { label: "News",       id: "news"       },
  { label: "Venue",      id: "venue"      },
  { label: "Sponsors",   id: "sponsors"   },
  { label: "Committees", id: "committees" },
  { label: "Schedule",   id: "schedule"   },
  { label: "Register",   id: "register"   },
];

export default function Navbar({ activeNav, scrolled, currentUser, userProfile, showSidebar, onNavigate, onRegister }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNav = (id) => {
    onNavigate(id);
    setMenuOpen(false);
  };

  return (
    <nav className={`fixed top-0 z-[150] border-b backdrop-blur-lg transition-all duration-300
      ${showSidebar ? 'hidden md:flex left-0 right-0 md:left-0 md:right-0' : 'flex left-0 right-0'}`}
      style={{ 
        borderColor: 'rgba(183,145,67,0.12)', 
        background: scrolled ? 'rgba(20,4,4,0.95)' : 'rgba(20,4,4,0.6)' 
      }}
    >
      <div className="w-full px-4 sm:px-6 h-16 lg:h-20 flex items-center justify-between gap-4 max-w-[1920px] mx-auto">
        {/* Brand */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 cursor-pointer" onClick={() => handleNav('home')}>
          <img
            src={LOGO_SRC}
            alt="RYK MUN"
            className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full object-cover border-2 transition-transform duration-300 hover:scale-105"
            style={{ borderColor: 'rgba(183,145,67,0.40)', boxShadow: '0 0 14px rgba(183,145,67,0.16)' }}
          />
          <div className="leading-none">
            <div className="font-bold text-base sm:text-lg lg:text-xl tracking-wider transition-colors duration-300 hover:text-[#D7B46A]"
              style={{ color: '#B79143', textShadow: '0 0 18px rgba(183,145,67,0.16)' }}>
              RYK MUN
            </div>
            <div className="text-[10px] sm:text-[11px] lg:text-xs tracking-wide hidden sm:block font-medium"
              style={{ color: '#c9b29a' }}>
              Rahim Yar Khan · Model United Nations
            </div>
          </div>
        </div>

        {/* Desktop nav links - PERFECTLY CENTERED */}
        <div className="hidden lg:flex items-center gap-0 absolute left-1/2 -translate-x-1/2">
          {NAV_LINKS.map(({ label, id }) => (
            <button 
              key={id} 
              onClick={() => handleNav(id)}
              className="relative px-3 xl:px-4 py-1.5 text-sm font-semibold tracking-wide transition-all duration-300 bg-transparent cursor-pointer group"
              style={{ 
                color: activeNav === id ? '#B79143' : '#c9b29a',
              }}
            >
              {/* Label */}
              <span className="relative z-10 transition-colors duration-300 group-hover:text-[#B79143]">
                {label}
              </span>
              
              {/* Active/Hover underline */}
              <span 
                className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-300 ${
                  activeNav === id 
                    ? 'w-full bg-[#B79143]' 
                    : 'w-0 bg-[#B79143] group-hover:w-full'
                }`}
              />
              
              {/* Hover background glow */}
              <span className="absolute inset-0 rounded-lg bg-[#B79143]/0 group-hover:bg-[#B79143]/5 transition-all duration-300" />
            </button>
          ))}
        </div>

        {/* Right actions - fixed width to balance with brand */}
        <div className="flex items-center gap-3 shrink-0 min-w-[140px] justify-end">
          {currentUser ? (
            <UserDropdown user={currentUser} userProfile={userProfile} />
          ) : (
            <button 
              onClick={onRegister}
              className="hidden sm:block shrink-0 text-white font-bold text-xs sm:text-sm px-4 sm:px-5 py-2 rounded tracking-wide transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg"
              style={{ 
                background: 'linear-gradient(135deg,#8b1a1a,#B79143)',
                boxShadow: '0 4px 15px rgba(183,145,67,0.1)' 
              }}
            >
              Register Now
            </button>
          )}
          {!showSidebar && (
            <button 
              className="lg:hidden flex flex-col gap-[5px] bg-transparent border-none cursor-pointer p-1 ml-1 group"
              onClick={() => setMenuOpen(!menuOpen)} 
              aria-label="Toggle menu"
            >
              {[0,1,2].map(i => (
                <span 
                  key={i} 
                  className={`block w-5 h-0.5 rounded transition-all duration-300 group-hover:bg-[#D7B46A]`} 
                  style={{ 
                    background: '#B79143',
                    transform: menuOpen && i === 0 ? 'rotate(45deg) translate(5px, 5px)' :
                              menuOpen && i === 1 ? 'opacity-0' :
                              menuOpen && i === 2 ? 'rotate(-45deg) translate(5px, -5px)' : 'none'
                  }} 
                />
              ))}
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && !showSidebar && (
        <div 
          className="lg:hidden absolute top-full left-0 right-0 flex flex-col items-stretch px-4 pb-4 pt-2 border-t animate-fadeIn"
          style={{ background: 'rgba(15,5,10,0.95)', borderColor: 'rgba(183,145,67,0.12)', backdropFilter: 'blur(20px)' }}
        >
          {NAV_LINKS.map(({ label, id }) => (
            <button 
              key={id} 
              onClick={() => handleNav(id)}
              className="py-3 text-sm text-left tracking-wide bg-transparent border-none border-b cursor-pointer transition-all duration-200 last:border-b-0 hover:pl-3"
              style={{ 
                color: activeNav === id ? '#B79143' : '#c9b29a', 
                borderColor: 'rgba(183,145,67,0.12)',
                fontWeight: activeNav === id ? '700' : '500'
              }}
            >
              {activeNav === id && <span className="mr-2" style={{ color: '#B79143' }}>◆</span>}
              {label}
            </button>
          ))}
          {!currentUser && (
            <button 
              onClick={() => { onRegister(); setMenuOpen(false); }}
              className="mt-3 text-white font-bold text-sm px-5 py-2.5 rounded self-start transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg,#8b1a1a,#B79143)' }}
            >
              Register Now
            </button>
          )}
        </div>
      )}
    </nav>
  );
}