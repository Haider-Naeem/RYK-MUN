export default function SponsorItem({ sponsor }) {
  return (
    <div className="flex items-center gap-3 shrink-0 px-5 py-3 rounded-lg border backdrop-blur-sm"
      style={{ borderColor: 'rgba(183,145,67,0.12)', background: 'rgba(15,5,10,0.5)' }}>
      {sponsor.logo
        ? <img src={sponsor.logo} alt={sponsor.name} className="w-10 h-10 rounded object-contain" />
        : <div className="w-10 h-10 rounded flex items-center justify-center shrink-0 border"
            style={{ background: 'rgba(183,145,67,0.08)', borderColor: 'rgba(183,145,67,0.40)' }}>
            <span className="text-[10px] font-bold" style={{ color: '#B79143' }}>{sponsor.name.slice(0,2).toUpperCase()}</span>
          </div>
      }
      <span className="text-sm font-semibold tracking-wide whitespace-nowrap" style={{ color: '#c9b29a' }}>
        {sponsor.name}
      </span>
    </div>
  );
}