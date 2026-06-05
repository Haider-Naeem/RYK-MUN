import { forwardRef } from "react";

const ScheduleSection = forwardRef(({ timeline }, ref) => {
  return (
    <section ref={ref} id="schedule"
      className="relative z-10 py-16 sm:py-20 px-4 sm:px-6 min-h-screen flex items-center"
      style={{ background: 'rgba(32,14,24,0.82)' }}>
      <div className="max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-14">
          <span className="inline-block text-[11px] sm:text-xs tracking-[0.3em] uppercase border-b pb-1 mt-4 mb-4 font-bold"
            style={{ color: '#B79143', borderColor: 'rgba(183,145,67,0.40)' }}>
            Important Dates
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-3xl font-bold mb-3" style={{ color: '#F8F3EA' }}>
            Conference Timeline
          </h2>
          <p className="text-sm sm:text-base max-w-lg mx-auto" style={{ color: '#b89b84' }}>
            Mark your calendar for the key milestones leading up to RYKMUN
          </p>
        </div>

        {/* Timeline */}
        <div className="max-w-xl mx-auto">
          {(timeline.length > 0 ? timeline : [{ date: 'TBD', event: 'Dates will be announced soon' }]).map((t, i, arr) => (
            <div key={i} className="flex gap-6 relative group">
              
              {/* Left — Dot & Line */}
              <div className="flex flex-col items-center shrink-0 w-6 pt-1.5">
                {/* Dot */}
                <div className="w-4 h-4 rounded-full z-10 shrink-0 transition-all duration-300 group-hover:scale-125"
                  style={{ 
                    background: 'linear-gradient(135deg,#8b1a1a,#B79143)', 
                    border: '2px solid rgba(183,145,67,0.50)', 
                    boxShadow: '0 0 14px rgba(183,145,67,0.25)' 
                  }} />
                
                {/* Connecting line */}
                {i < arr.length - 1 && (
                  <div className="w-0.5 flex-1 mt-1"
                    style={{ 
                      background: 'linear-gradient(180deg, rgba(183,145,67,0.40), rgba(183,145,67,0.08))', 
                      minHeight: 56 
                    }} />
                )}
              </div>

              {/* Right — Content */}
              <div className={`pb-8 flex-1 ${i === arr.length - 1 ? 'pb-0' : ''}`}>
                {/* Date */}
                <div className="text-sm sm:text-base font-bold tracking-[0.15em] uppercase mb-1.5 transition-colors duration-300 group-hover:text-[#D7B46A]"
                  style={{ color: '#B79143' }}>
                  {t.date}
                </div>
                
                {/* Event Name */}
                <div className="text-lg sm:text-xl font-bold mb-1.5 transition-colors duration-300"
                  style={{ color: '#F8F3EA' }}>
                  {t.event}
                </div>
                
                
                {i === 0 && arr.length > 1 && (
                  <span className="inline-block text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full border font-medium mt-1"
                    style={{ 
                      color: '#D7B46A', 
                      borderColor: 'rgba(183,145,67,0.30)',
                      background: 'rgba(183,145,67,0.08)' 
                    }}>
                    Up Next
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

ScheduleSection.displayName = 'ScheduleSection';
export default ScheduleSection;