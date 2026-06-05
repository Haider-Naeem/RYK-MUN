import { forwardRef } from "react";
import SponsorItem from "./components/SponsorItem";

const SPONSORS = [
  { name: "CheezeUp",  logo: "/Cheezeup.jpeg" },
  { name: "RYK MUN",  logo: "/DP.webp" },
  { name: "H.H. Sheikh Khalifa Public School",  logo: "/Venue.webp" },
];

const SponsorsSection = forwardRef((props, ref) => {
  return (
    <section ref={ref} id="sponsors"
      className="relative z-10 min-h-screen flex flex-col justify-center overflow-hidden px-4 sm:px-6 py-20"
      style={{ background: 'rgba(32,14,24,0.82)' }}>
      <div className="max-w-6xl mx-auto w-full">
        <div className="text-center mb-14">
          <span className="text-[11px] tracking-[0.35em] uppercase" style={{ color: '#b89b84' }}>Sponsors & Partners</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mt-5 mb-5" style={{ color: '#F8F3EA' }}>
            Organizations That<br />Power RYK MUN
          </h2>
          <p className="text-sm sm:text-base leading-relaxed max-w-2xl mx-auto" style={{ color: '#c9b29a' }}>
            We proudly collaborate with institutions, companies, and organizations that believe in empowering youth leadership, diplomacy, and innovation.
          </p>
        </div>
        <div className="space-y-10">
          <div className="relative overflow-hidden">
            <div className="flex gap-10 sm:gap-16 w-max" style={{ animation: 'marqueeLeft 45s linear infinite' }}>
              {[...SPONSORS,...SPONSORS].map((s,i) => <SponsorItem key={`t-${i}`} sponsor={s} />)}
            </div>
          </div>
          <div className="relative overflow-hidden">
            <div className="flex gap-10 sm:gap-16 w-max" style={{ animation: 'marqueeRight 55s linear infinite' }}>
              {[...SPONSORS,...SPONSORS].map((s,i) => <SponsorItem key={`b-${i}`} sponsor={s} />)}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes marqueeLeft  { 0%{transform:translateX(0%)}  100%{transform:translateX(-50%)} }
        @keyframes marqueeRight { 0%{transform:translateX(-50%)} 100%{transform:translateX(0%)}  }
      `}</style>
    </section>
  );
});

SponsorsSection.displayName = 'SponsorsSection';
export default SponsorsSection;