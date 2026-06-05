import { forwardRef } from "react";

const CommitteesSection = forwardRef(({ displayCommittees }, ref) => {
  return (
    <section ref={ref} id="committees"
      className="relative z-10 py-16 sm:py-20 px-4 sm:px-6"
      style={{ background: 'rgba(59,10,20,0.40)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 sm:mb-14">
          <span className="inline-block text-[11px] tracking-[0.3em] uppercase border-b pb-1 mb-4"
            style={{ color: '#B79143', borderColor: 'rgba(183,145,67,0.40)' }}>
            Committees
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4" style={{ color: '#F8F3EA' }}>
            Choose Your Arena
          </h2>
          <p className="text-sm sm:text-base max-w-lg mx-auto" style={{ color: '#c9b29a' }}>
            {displayCommittees.length} specialized committees covering global security, human rights, health, economics, and more.
          </p>
        </div>
        <div className="grid gap-4 sm:gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {displayCommittees.map((c, i) => (
            <div key={c.id || i}
              className="rounded-xl p-5 sm:p-6 backdrop-blur-md border transition-all duration-200 hover:-translate-y-1.5 hover:shadow-lg flex flex-col"
              style={{ background: 'rgba(59,10,20,0.58)', borderColor: 'rgba(183,145,67,0.18)', boxShadow: 'none' }}>
              <div className="flex items-center gap-3 pb-3 mb-3" style={{ borderBottom: '2px solid #B79143' }}>
                <span className="text-2xl font-extrabold tracking-wider" style={{ color: '#B79143' }}>
                  {c.abbr || c.name?.slice(0, 4)?.toUpperCase() || 'CM'}
                </span>
              </div>
              <div className="text-sm font-semibold mb-2 leading-snug" style={{ color: '#F8F3EA' }}>{c.name}</div>
              {(c.topic || c.description) && (
                <div className="text-xs leading-relaxed mt-auto pt-2" style={{ color: '#b89b84' }}>
                  {c.topic && <span className="not-italic font-semibold mr-1" style={{ color: '#B79143' }}>Topic:</span>}
                  <span className="italic">{c.topic || c.description}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

CommitteesSection.displayName = 'CommitteesSection';
export default CommitteesSection;