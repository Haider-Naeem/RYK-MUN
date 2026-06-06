import { forwardRef, useState, useRef } from "react";

const CommitteesSection = forwardRef(({ displayCommittees }, ref) => {
  const [expandedId, setExpandedId] = useState(null);
  const cardRefs = useRef({});

  function handleExpand(id) {
    setExpandedId(prev => (prev === id ? null : id));
    setTimeout(() => {
      cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
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
                ref={el => (cardRefs.current[c.id] = el)}
                onClick={() => !isExpanded && handleExpand(c.id)}
                className={[
                  'rounded-xl backdrop-blur-md border flex flex-col transition-all duration-250',
                  isExpanded ? 'col-span-full cursor-default' : 'cursor-pointer hover:-translate-y-1.5 hover:shadow-lg',
                  isDimmed ? 'opacity-25 scale-[0.97] pointer-events-none' : '',
                ].join(' ')}
                style={{
                  background: 'rgba(59,10,20,0.58)',
                  borderColor: isExpanded ? 'rgba(183,145,67,0.45)' : 'rgba(183,145,67,0.18)',
                  // offset for fixed navbar (~64px) + a little breathing room
                  scrollMarginTop: '80px',
                  ...(isExpanded ? { gridColumn: '1 / -1' } : {}),
                }}
              >

                {/* ── EXPANDED LAYOUT ── */}
                {isExpanded ? (
                  <div className="p-5 sm:p-7">
                    {/* Top row: big logo + name/abbr block */}
                    <div className="flex items-start gap-5 mb-5">
                      {c.logoUrl ? (
                        <img
                          src={c.logoUrl}
                          alt={`${c.name} logo`}
                          className="rounded-2xl object-contain shrink-0 border"
                          style={{
                            width: '96px',
                            height: '96px',
                            background: 'rgba(183,145,67,0.1)',
                            borderColor: 'rgba(183,145,67,0.35)',
                          }}
                        />
                      ) : (
                        <div
                          className="rounded-2xl flex items-center justify-center font-bold shrink-0 border text-2xl"
                          style={{
                            width: '96px',
                            height: '96px',
                            color: '#B79143',
                            background: 'rgba(183,145,67,0.1)',
                            borderColor: 'rgba(183,145,67,0.35)',
                          }}
                        >
                          {(c.abbr || c.name)?.slice(0, 2)?.toUpperCase()}
                        </div>
                      )}

                      <div className="flex flex-col justify-center gap-1 min-w-0 pt-1">
                        <span
                          className="text-3xl font-extrabold tracking-wider leading-none"
                          style={{ color: '#B79143' }}
                        >
                          {c.abbr || c.name?.slice(0, 4)?.toUpperCase() || 'CM'}
                        </span>
                        <span
                          className="text-sm font-semibold leading-snug mt-1"
                          style={{ color: '#F8F3EA' }}
                        >
                          {c.name}
                        </span>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="mb-4" style={{ borderTop: '2px solid #B79143' }} />

                    {/* Topic */}
                    {c.topic && (
                      <div className="text-xs leading-relaxed mb-3" style={{ color: '#b89b84' }}>
                        <span className="font-semibold mr-1" style={{ color: '#B79143' }}>Topic:</span>
                        <span className="italic">{c.topic}</span>
                      </div>
                    )}

                    {/* Description */}
                    {c.description && (
                      <div
                        className="text-xs leading-relaxed max-w-3xl"
                        style={{ color: '#9a8070' }}
                      >
                        {c.description}
                      </div>
                    )}

                    {/* Close button */}
                    <div className="flex justify-end mt-5">
                      <button
                        onClick={e => { e.stopPropagation(); setExpandedId(null); }}
                        className="text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-lg border transition hover:bg-[rgba(183,145,67,0.1)]"
                        style={{ color: '#B79143', borderColor: 'rgba(183,145,67,0.3)' }}
                      >
                        Close ↑
                      </button>
                    </div>
                  </div>
                ) : (

                  /* ── COLLAPSED LAYOUT ── */
                  <div className="p-5 sm:p-6 flex flex-col flex-1">
                    {/* Header: logo + abbr */}
                    <div
                      className="flex items-center gap-3 pb-3 mb-3"
                      style={{ borderBottom: '2px solid #B79143' }}
                    >
                      {c.logoUrl ? (
                        <img
                          src={c.logoUrl}
                          alt={`${c.name} logo`}
                          className="rounded-xl object-contain shrink-0 border"
                          style={{
                            width: '52px',
                            height: '52px',
                            background: 'rgba(183,145,67,0.1)',
                            borderColor: 'rgba(183,145,67,0.3)',
                          }}
                        />
                      ) : (
                        <div
                          className="rounded-xl flex items-center justify-center text-sm font-bold shrink-0 border"
                          style={{
                            width: '52px',
                            height: '52px',
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
                      <div className="text-xs leading-relaxed line-clamp-2" style={{ color: '#b89b84' }}>
                        <span className="font-semibold mr-1" style={{ color: '#B79143' }}>Topic:</span>
                        <span className="italic">{c.topic}</span>
                      </div>
                    )}

                    {/* Expand hint */}
                    <div
                      className="mt-auto pt-3 text-[10px] uppercase tracking-[0.15em] flex items-center gap-1"
                      style={{ color: 'rgba(183,145,67,0.5)' }}
                    >
                      ▼ Expand
                    </div>
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