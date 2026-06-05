import { forwardRef } from "react";

const HeroSection = forwardRef(({ heroDateLabel, seatInfo, displayCommittees, onApplyDelegate, onExploreCommittees, onScrollTo, isRegistrationOpen, hasDates }, ref) => {
  // Determine if the delegate button should be disabled
  const isDisabled = (seatInfo.isFull && seatInfo.totalSeats > 0) || !isRegistrationOpen;
  
  // Determine button text
  const getButtonText = () => {
    if (seatInfo.isFull && seatInfo.totalSeats > 0) return 'Delegate Seats Full';
    if (!hasDates) return 'Dates to be Announced';
    if (!isRegistrationOpen) return 'Registration Closed';
    return 'Apply as Delegate';
  };

  return (
    <section ref={ref} id="home"
      className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-4 sm:px-6">
      <div className="max-w-3xl w-full flex flex-col items-center gap-4 sm:gap-5 py-24 sm:py-28">
        <span className="inline-block text-[10px] sm:text-xs tracking-[0.15em] uppercase px-4 sm:px-5 py-1.5 rounded-full border font-semibold"
          style={{ color: '#B79143', background: 'rgba(183,145,67,0.10)', borderColor: 'rgba(183,145,67,0.40)' }}>
          📅 {heroDateLabel}
        </span>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight"
          style={{ color: '#F8F3EA' }}>
          Rahim Yar Khan
          <br />
          <span style={{ background: 'linear-gradient(90deg,#B79143,#D7B46A,#B79143)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Model United Nations
          </span>
        </h1>

        <p className="text-sm sm:text-base md:text-lg leading-relaxed max-w-xl" style={{ color: '#c9b29a' }}>
          Debate. Diplomacy. Change. — Join hundreds of future leaders tackling the world's most pressing issues on the global stage.
        </p>

        {seatInfo.isFull && seatInfo.totalSeats > 0 && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-5 py-3 text-sm text-red-200 max-w-md">
            🚫 Delegate seats are <strong>fully booked</strong>. Sponsorship registration is still open.
          </div>
        )}


        <div className="flex gap-3 sm:gap-4 flex-wrap justify-center mt-1">
          <button
            onClick={onApplyDelegate}
            disabled={isDisabled}
            className="text-white font-bold text-sm px-7 sm:px-9 py-3 sm:py-3.5 rounded tracking-wide transition-all hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg,#8b1a1a,#B79143)', boxShadow: '0 4px 24px rgba(183,145,67,0.16)' }}>
            {getButtonText()}
          </button>
          <button onClick={onExploreCommittees}
            className="font-bold text-sm px-7 sm:px-9 py-3 sm:py-3.5 rounded tracking-wide border-2 bg-transparent transition-all hover:opacity-80"
            style={{ color: '#B79143', borderColor: 'rgba(183,145,67,0.40)' }}>
            Explore Committees
          </button>
        </div>

        <div className="flex gap-2 sm:gap-3 flex-wrap justify-center mt-1">
          {['🌍 International Platform',`🏛️ ${displayCommittees.length} + Committees`,'🎖️ Awards & Recognition'].map(p => (
            <span key={p} className="text-[10px] sm:text-xs px-3 sm:px-4 py-1 rounded-full border"
              style={{ color: '#c9b29a', background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
              {p}
            </span>
          ))}
        </div>

        {/* Instagram Link */}
        <div className="flex gap-4 items-center justify-center mt-2">
          <a 
            href="https://www.instagram.com/ryk.mun/?hl=en" 
            target="_blank" 
            rel="noopener noreferrer"
            className="transition-all hover:-translate-y-0.5 hover:opacity-80"
            aria-label="Follow us on Instagram"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#c9b29a' }}>
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
          </a>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 cursor-pointer" onClick={onScrollTo}>
        <div className="w-4 h-4 border-r-2 border-b-2 animate-bounce"
          style={{ borderColor: 'rgba(183,145,67,0.40)', transform: 'rotate(45deg)' }} />
      </div>
    </section>
  );
});

HeroSection.displayName = 'HeroSection';
export default HeroSection;