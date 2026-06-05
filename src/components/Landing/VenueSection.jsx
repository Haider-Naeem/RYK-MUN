import { forwardRef } from "react";

const VenueSection = forwardRef(({ selectedEvent, formatEventDateRange }, ref) => {
  return (
    <section ref={ref} id="venue"
      className="relative z-10 py-16 sm:py-20 px-4 sm:px-6 min-h-screen flex items-center"
      style={{ background: 'rgba(59,10,20,0.40)' }}>
      <div className="max-w-6xl mx-auto w-full">
        <div className="text-center mb-10 sm:mb-14">
          <span className="inline-block text-[11px] tracking-[0.3em] uppercase border-b pb-1 mb-4"
            style={{ color: '#B79143', borderColor: 'rgba(183,145,67,0.40)' }}>
            
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4" style={{ color: '#F8F3EA' }}>
            Where It All Happens
          </h2>
          <p className="text-sm sm:text-base max-w-lg mx-auto" style={{ color: '#c9b29a' }}>
            {selectedEvent?.venue
              ? `RYK MUN will be hosted at ${selectedEvent.venue}${selectedEvent.venueLocation ? `, ${selectedEvent.venueLocation}` : ''}.`
              : 'Venue details will be announced soon.'}
          </p>
        </div>

        {selectedEvent?.venue ? (
          <div className="max-w-5xl mx-auto rounded-3xl border overflow-hidden backdrop-blur-xl"
            style={{ borderColor: 'rgba(183,145,67,0.18)', background: 'rgba(59,10,20,0.58)', boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 60px rgba(183,145,67,0.16)' }}>
            <div className="grid md:grid-cols-2">
              <div className="relative flex items-center justify-center p-10 sm:p-14 border-b md:border-b-0 md:border-r"
                style={{ borderColor: 'rgba(183,145,67,0.12)' }}>
                <div className="absolute inset-0 opacity-10"
                  style={{ background: 'radial-gradient(circle at center, rgba(183,145,67,0.16), transparent 70%)' }} />
                {selectedEvent?.venueLogoUrl ? (
                  <img src={selectedEvent.venueLogoUrl} alt="Venue Logo" className="w-64 h-64 sm:w-80 sm:h-80 object-contain" />
                ) : (
                  <div className="w-52 h-52 sm:w-64 sm:h-64 rounded-3xl border flex items-center justify-center text-8xl"
                    style={{ borderColor: 'rgba(183,145,67,0.40)', background: 'rgba(183,145,67,0.08)' }}>🏛️</div>
                )}
              </div>
              <div className="flex flex-col justify-center p-8 sm:p-12">
                <h3 className="text-3xl sm:text-4xl font-bold mb-5 leading-tight" style={{ color: '#F8F3EA' }}>{selectedEvent.venue}</h3>
                {selectedEvent?.venueIntro ? (
                  <p className="text-sm sm:text-base leading-relaxed mb-8" style={{ color: '#c9b29a' }}>{selectedEvent.venueIntro}</p>
                ) : (
                  <p className="text-sm italic mb-8" style={{ color: '#b89b84' }}>More details about the venue will be announced soon.</p>
                )}
                <div className="flex items-start gap-3 mb-5">
                  <span className="text-lg">📅</span>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.25em] font-bold mb-1" style={{ color: '#B79143' }}>Event Dates</div>
                    <div className="text-sm sm:text-base" style={{ color: '#c9b29a' }}>{formatEventDateRange(selectedEvent)}</div>
                  </div>
                </div>
                {selectedEvent?.venueLocation && (
                  <div className="flex items-start gap-3">
                    <span className="text-lg">📍</span>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.25em] font-bold mb-1" style={{ color: '#B79143' }}>Location</div>
                      <div className="text-sm sm:text-base" style={{ color: '#c9b29a' }}>{selectedEvent.venueLocation}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto rounded-2xl border p-10 sm:p-16 text-center backdrop-blur-xl"
            style={{ borderColor: 'rgba(183,145,67,0.18)', background: 'rgba(59,10,20,0.58)' }}>
            <div className="text-6xl mb-6">🏛️</div>
            <h3 className="text-2xl sm:text-3xl font-bold mb-4" style={{ color: '#F8F3EA' }}>Venue TBA</h3>
            <p className="text-sm sm:text-base max-w-md mx-auto" style={{ color: '#c9b29a' }}>The conference venue will be announced shortly. Stay tuned for updates.</p>
          </div>
        )}
      </div>
    </section>
  );
});

VenueSection.displayName = 'VenueSection';
export default VenueSection;