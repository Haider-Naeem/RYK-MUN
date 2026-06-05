import DP from "../../Assets/DP.webp";

const LOGO_SRC = DP;

const NAV_LINKS = [
  { label: "Home",       id: "home"       },
  { label: "About",      id: "about"      },
  { label: "Venue",      id: "venue"      },
  { label: "Sponsors",   id: "sponsors"   },
  { label: "Committees", id: "committees" },
  { label: "Schedule",   id: "schedule"   },
  { label: "Register",   id: "register"   },
];

export default function FooterSection({ onNavigate }) {
  return (
    <footer className="relative z-10 border-t py-6 sm:py-7 px-4 sm:px-6"
      style={{ background: 'rgba(8,2,2,0.96)', borderColor: 'rgba(183,145,67,0.12)' }}>
      <div className="max-w-5xl mx-auto flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-3 cursor-pointer justify-center" onClick={() => onNavigate('home')}>
          <img src={LOGO_SRC} alt="" className="w-9 h-9 rounded-full object-cover border" style={{ borderColor: 'rgba(183,145,67,0.40)' }} />
          <div className="text-left leading-tight">
            <div className="font-semibold text-[15px] tracking-wide" style={{ color: '#B79143' }}>RYK MUN</div>
            <div className="text-[11px]" style={{ color: '#b89b84' }}>Rahim Yar Khan · Model United Nations</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 justify-center">
          {NAV_LINKS.map(({ label, id }) => (
            <button key={id} onClick={() => onNavigate(id)} className="bg-transparent border-none cursor-pointer px-2.5 py-1 transition-all duration-200 hover:opacity-80"
              style={{ color: '#b89b84', fontSize: '12px', letterSpacing: '0.04em' }}>{label}</button>
          ))}
        </div>
        
        {/* Social Media Links */}
        <div className="flex gap-4 items-center justify-center">
          <a 
            href="https://www.instagram.com/ryk.mun/?hl=en" 
            target="_blank" 
            rel="noopener noreferrer"
            className="transition-all hover:-translate-y-0.5 hover:opacity-80"
            aria-label="Follow us on Instagram"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#b89b84' }}>
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
          </a>
        </div>
        
        <div className="w-full max-w-[220px] h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(183,145,67,0.40), transparent)' }} />
        <div className="text-[11px] sm:text-xs tracking-wide" style={{ color: '#8c6d62' }}>✉ rykmun2@gmail.com · 📍 Rahim Yar Khan, Punjab, Pakistan</div>
        <div className="text-[10px] tracking-[0.12em]" style={{ color: 'rgba(160,120,90,0.65)' }}>© 2025 RYK MUN · All Rights Reserved</div>
      </div>
    </footer>
  );
}