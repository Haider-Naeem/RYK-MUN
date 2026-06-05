export default function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: '#c9b29a' }}>{label}</span>
      <span className="font-semibold" style={{ color: '#F8F3EA' }}>{value}</span>
    </div>
  );
}