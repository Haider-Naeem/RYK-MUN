import { forwardRef } from "react";

const StatsSection = forwardRef(({ count }, ref) => {
  return (
    <section ref={ref} className="relative z-10 py-10 sm:py-14 px-4 sm:px-6 border-y"
      style={{ borderColor: 'rgba(183,145,67,0.12)', background: 'rgba(32,14,24,0.82)' }}>
      <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
        {[
          { val: count.delegates + ' +', label: 'Delegates'       },
          { val: count.committees + ' +',      label: 'Committees'      },
          { val: count.days,            label: 'Conference Days' },
          { val: count.schools + ' +',   label: 'Schools'         },
        ].map((s, i) => (
          <div key={i} className="py-3 sm:py-5 px-2">
            <div className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-none"
              style={{ background: 'linear-gradient(90deg,#B79143,#D7B46A,#B79143)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {s.val}
            </div>
            <div className="text-[10px] sm:text-xs tracking-[0.15em] uppercase mt-2" style={{ color: '#b89b84' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
});

StatsSection.displayName = 'StatsSection';
export default StatsSection;