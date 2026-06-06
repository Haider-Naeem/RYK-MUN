import { forwardRef, useState } from "react";

const CommitteesSection = forwardRef(({ displayCommittees }, ref) => {
  const [expandedId, setExpandedId] = useState(null);

  function handleExpand(id) {
    setExpandedId(prev => (prev === id ? null : id));
  }

  return (
    <section
      ref={ref}
      id="committees"
      className="relative z-10 py-16 sm:py-20 px-4 sm:px-6"
      style={{ background: 'rgba(59,10,20,0.40)' }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 sm:mb-14">
          <span
            className="inline-block text-[11px] tracking-[0.3em] uppercase border-b pb-1 mb-4"
            style={{ color: '#B79143', borderColor: 'rgba(183,145,67,0.40)' }}
          >
            Committees
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4" style={{ color: '#F8F3EA' }}>
            Choose Your Arena
          </h2>
          <p className="text-sm sm:text-base max-w-lg mx-auto" style={{ color: '#c9b29a' }}>
            {displayCommittees.length} specialized committees covering global security, human rights,
            health, economics, and more.
          </p>
        </div>

        {/* Collapse-all bar — only visible when something is expanded */}
        {expandedId && (
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setExpandedId(null)}
              className="text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-lg border transition hover:bg-[rgba(183,145,67,0.1)]"
              style={{ color: '#B79143', borderColor: 'rgba(183,145,67,0.3)' }}
            >
              Collapse all ↑
            </button>
          </div>
        )}

        <div
          className="grid gap-4 sm:gap-5"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
        >
          {displayCommittees.map((c, i) => {
            const isExpanded = expandedId === c.id;
            const isDimmed   = expandedId && expandedId !== c.id;

            return (
              <div
                key={c.id || i}
                onClick={() => !isExpanded && handleExpand(c.id)}
                className={[
                  'rounded-xl p-5 sm:p-6 backdrop-blur-md border flex flex-col transition-all duration-250',
                  isExpanded ? 'col-span-full cursor-default' : 'cursor-pointer hover:-translate-y-1.5 hover:shadow-lg',
                  isDimmed ? 'opacity-25 scale-[0.97] pointer-events-none' : '',
                ].join(' ')}
                style={{
                  background: 'rgba(59,10,20,0.58)',
                  borderColor: 'rgba(183,145,67,0.18)',
                  // span the full grid row when expanded
                  ...(isExpanded ? { gridColumn: '1 / -1' } : {}),
                }}
              >
                {/* Card header — logo + abbr */}
                <div
                  className="flex items-center gap-3 pb-3 mb-3"
                  style={{ borderBottom: '2px solid #B79143' }}
                >
                  {/* Logo */}
                  {c.logoUrl ? (
                    <img
                      src={c.logoUrl}
                      alt={`${c.name} logo`}
                      className="w-9 h-9 rounded-lg object-contain shrink-0 border"
                      style={{
                        background: 'rgba(183,145,67,0.1)',
                        borderColor: 'rgba(183,145,67,0.3)',
                      }}
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border"
                      style={{
                        color: '#B79143',
                        background: 'rgba(183,145,67,0.1)',
                        borderColor: 'rgba(183,145,67,0.3)',
                      }}
                    >
                      {(c.abbr || c.name)?.slice(0, 2)?.toUpperCase()}
                    </div>
                  )}

                  <span className="text-2xl font-extrabold tracking-wider" style={{ color: '#B79143' }}>
                    {c.abbr || c.name?.slice(0, 4)?.toUpperCase() || 'CM'}
                  </span>
                </div>

                {/* Name */}
                <div className="text-sm font-semibold mb-2 leading-snug" style={{ color: '#F8F3EA' }}>
                  {c.name}
                </div>

                {/* Topic */}
                {c.topic && (
                  <div className={`text-xs leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`} style={{ color: '#b89b84' }}>
                    <span className="not-italic font-semibold mr-1" style={{ color: '#B79143' }}>Topic:</span>
                    <span className="italic">{c.topic}</span>
                  </div>
                )}

                {/* Description */}
                {c.description && (
                  <div
                    className={`text-xs leading-relaxed mt-2 ${isExpanded ? '' : 'line-clamp-2'}`}
                    style={{ color: '#9a8070' }}
                  >
                    {c.description}
                  </div>
                )}

                {/* Footer */}
                {isExpanded ? (
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={e => { e.stopPropagation(); setExpandedId(null); }}
                      className="text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-lg border transition hover:bg-[rgba(183,145,67,0.1)]"
                      style={{ color: '#B79143', borderColor: 'rgba(183,145,67,0.3)' }}
                    >
                      Close ↑
                    </button>
                  </div>
                ) : (
                  <div
                    className="mt-auto pt-3 text-[10px] uppercase tracking-[0.15em] flex items-center gap-1"
                    style={{ color: 'rgba(183,145,67,0.5)' }}
                  >
                    ▼ Expand
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
});

CommitteesSection.displayName = 'CommitteesSection';
export default CommitteesSection;