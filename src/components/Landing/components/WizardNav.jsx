export default function WizardNav({ onBack, onNext, nextLabel = 'Continue →' }) {
  const C = {
    textSecondary: '#c9b29a',
    gradBtn: 'linear-gradient(135deg,#8E6B2F,#B79143,#D7B46A)',
    glowGold: 'rgba(183,145,67,0.16)',
  };

  return (
    <div className="flex justify-between mt-8">
      <button onClick={onBack} className="text-sm px-4 py-2 transition-colors hover:opacity-80" style={{ color: C.textSecondary }}>← Back</button>
      <button onClick={onNext}
        className="px-8 py-3 rounded-xl font-bold text-white text-sm tracking-wide transition-all hover:-translate-y-0.5"
        style={{ background: C.gradBtn, boxShadow: `0 4px 20px ${C.glowGold}` }}>
        {nextLabel}
      </button>
    </div>
  );
}