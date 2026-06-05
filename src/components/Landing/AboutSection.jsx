import { forwardRef } from "react";
import DP from "../../Assets/DP.webp";

const LOGO_SRC = DP;

const AboutSection = forwardRef((props, ref) => {
  return (
    <section ref={ref} id="about"
      className="relative z-10 min-h-screen flex items-center px-4 sm:px-6 py-16 sm:py-20">
      <div className="max-w-7xl mx-auto grid md:grid-cols-[auto_1fr] gap-8 lg:gap-14 items-start w-full">
        
        {/* LEFT — Logo */}
        <div className="flex justify-center md:sticky md:top-28">
          <div className="w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56 rounded-full flex items-center justify-center border relative shrink-0"
            style={{ 
              background: 'radial-gradient(circle at 40% 35%, rgba(139,26,26,0.35), rgba(15,5,10,0.92))', 
              boxShadow: '0 0 120px rgba(183,145,67,0.16)', 
              borderColor: 'rgba(183,145,67,0.25)',
              marginTop: '0.5rem'
            }}>
            <img 
              src={LOGO_SRC} 
              alt="RYK MUN" 
              className="w-32 h-32 sm:w-36 sm:h-36 lg:w-44 lg:h-44 rounded-full object-cover" 
            />
            <div className="absolute inset-[-20px] rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(183,145,67,0.10) 0%, transparent 70%)' }} />
          </div>
        </div>

        {/* RIGHT — Content */}
        <div className="max-w-3xl">
          {/* Label */}
          <span className="inline-block text-[11px] tracking-[0.3em] uppercase border-b pb-1 mb-5 font-bold"
            style={{ color: '#B79143', borderColor: 'rgba(183,145,67,0.40)' }}>
            About RYKMUN
          </span>

          {/* Headline */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-6" style={{ color: '#F8F3EA' }}>
            BUILDING THE LEGACY<br />
            <span style={{ background: 'linear-gradient(90deg,#B79143,#D7B46A,#B79143)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              DEFINING THE FUTURE
            </span>
          </h2>

          {/* Intro Paragraph */}
          <p className="text-sm sm:text-base leading-relaxed mb-5" style={{ color: '#c9b29a' }}>
            Rahim Yar Khan, one of the most important cities of Southern Punjab, located near the Cholistan Desert, gives 
            <strong style={{ color: '#B79143' }}> RYKMUN</strong> its name and identity. The Rahim Yar Khan Model United Nations (RYKMUN) is the premier youth leadership simulation in the region.
          </p>

          <p className="text-sm sm:text-base leading-relaxed mb-5" style={{ color: '#c9b29a' }}>
            RYKMUN is a <strong style={{ color: '#D7B46A' }}>fully student-led, private conference</strong> organized by the passionate youth of Rahim Yar Khan, created with the vision of redefining diplomacy and debate in Southern Punjab. It serves as a platform for critical thinking, high-level discussion, and meaningful negotiation.
          </p>

          {/* Chapter I Highlight */}
          <div className="rounded-xl border p-4 sm:p-5 mb-5"
            style={{ 
              borderColor: 'rgba(183,145,67,0.25)', 
              background: 'linear-gradient(135deg, rgba(183,145,67,0.08), rgba(139,26,26,0.05))' 
            }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🏆</span>
              <h4 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#B79143' }}>
                Chapter I — A Historic Debut
              </h4>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#c9b29a' }}>
              In <strong style={{ color: '#D7B46A' }}>August 2025</strong>, RYKMUN made its historic debut and instantly became the <strong style={{ color: '#F8F3EA' }}>largest MUN conference in Rahim Yar Khan</strong> and the biggest private conference in Southern Punjab. With <strong style={{ color: '#D7B46A' }}>500+ delegates</strong>, highly experienced chairs from Lahore, and impactful committees, the first chapter set a new benchmark for academic excellence. Alongside intense committee sessions, RYKMUN also delivered premium social events, creating an unforgettable delegate experience.
            </p>
          </div>

          {/* Chapter II */}
          <p className="text-sm sm:text-base leading-relaxed mb-5" style={{ color: '#c9b29a' }}>
            Now, we proudly welcome you to <strong style={{ color: '#D7B46A' }}>RYKMUN Chapter II</strong> — bigger, sharper, and more competitive than ever.
          </p>

          {/* Mission */}
          <div className="rounded-xl border p-4 sm:p-5 mb-6"
            style={{ 
              borderColor: 'rgba(183,145,67,0.20)', 
              background: 'rgba(183,145,67,0.04)' 
            }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🎯</span>
              <h4 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#B79143' }}>
                Our Mission
              </h4>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#c9b29a' }}>
              Our core mission is <strong style={{ color: '#F8F3EA' }}>empowerment and accessibility</strong>. We believe location should never limit potential, and RYKMUN exists to make Rahim Yar Khan a growing hub of youth diplomacy.
            </p>
          </div>

          {/* Closing Statement */}
          <p className="text-base sm:text-lg leading-relaxed font-semibold" style={{ color: '#F8F3EA' }}>
            RYKMUN is not just a conference — it is a <span style={{ color: '#D7B46A' }}>movement</span> shaping the next generation of leaders in Southern Punjab.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-2 mt-6">
            {[
              '500+ Delegates',
              'Student-Led',
              'Expert Chairs',
              'Premium Social Events',
              'Southern Punjab Hub',
              'Redefining Diplomacy'
            ].map(f => (
              <span 
                key={f} 
                className="text-[10px] sm:text-xs px-3 py-1.5 rounded-full border font-medium transition-all duration-300 hover:bg-[#B79143]/10 hover:border-[#B79143]/40"
                style={{ 
                  color: '#b89b84', 
                  borderColor: 'rgba(183,145,67,0.18)',
                  background: 'rgba(183,145,67,0.04)'
                }}>
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
});

AboutSection.displayName = 'AboutSection';
export default AboutSection;