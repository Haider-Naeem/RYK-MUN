import { useState, useEffect } from 'react';
import { supabase } from '../../supabase/config';
import toast from 'react-hot-toast';
import { keysToCamel } from '../../utils/cache';

const BORDER_GOLD = 'rgba(183,145,67,0.18)';
const CARD_BG = 'rgba(68,7,19,0.35)';
const PANEL_BG = 'rgba(68,7,19,0.58)';

export default function PassRegistrations({ eventId }) {
  const [registrations, setRegistrations] = useState([]);
  const [passes, setPasses] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;

    const fetchData = async () => {
      try {
        const [regRes, passRes] = await Promise.all([
          supabase.from('pass_registrations').select('*').eq('event_id', eventId).order('created_at', { ascending: false }),
          supabase.from('event_passes').select('id, name').eq('event_id', eventId)
        ]);

        if (regRes.error) throw regRes.error;
        if (passRes.error) throw passRes.error;

        const passMap = {};
        passRes.data.forEach(p => passMap[p.id] = p.name);
        setPasses(passMap);

        setRegistrations(keysToCamel(regRes.data || []));
      } catch (err) {
        toast.error('Failed to load pass registrations');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  /* Status is derived from payment approval — no manual approve/reject */
  const getStatusBadge = (paymentStatus) => {
    if (paymentStatus === 'approved') return <span className="bg-green-500/20 text-green-300 border border-green-500/30 px-2 py-0.5 rounded text-xs font-bold uppercase">Approved</span>;
    if (paymentStatus === 'rejected') return <span className="bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded text-xs font-bold uppercase">Rejected</span>;
    return <span className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-2 py-0.5 rounded text-xs font-bold uppercase">Pending</span>;
  };

  const getPaymentBadge = (status) => {
    if (status === 'approved') return <span className="text-green-400 font-bold text-xs uppercase">Paid</span>;
    if (status === 'rejected') return <span className="text-red-400 font-bold text-xs uppercase">Rejected</span>;
    return <span className="text-yellow-400 font-bold text-xs uppercase">Pending</span>;
  };

  if (loading) return <div className="text-[#B79143] py-8 text-center">Loading registrations...</div>;

  if (registrations.length === 0) {
    return (
      <div className="rounded-xl border p-8 text-center border-dashed" style={{ borderColor: BORDER_GOLD, backgroundColor: CARD_BG }}>
        <p className="text-[#b89b84]">No pass registrations found for this event.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-[#F8F3EA]">
          <thead className="border-b text-xs uppercase tracking-wider text-[#B79143]" style={{ borderColor: 'rgba(183,145,67,0.2)' }}>
            <tr>
              <th className="px-4 py-3">Pass Type</th>
              <th className="px-4 py-3">Name / Contact</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(183,145,67,0.1)]">
            {registrations.map(reg => (
              <tr key={reg.id} className="transition-colors hover:bg-[rgba(183,145,67,0.05)]">
                <td className="px-4 py-3 font-semibold">{passes[reg.passId] || 'Unknown Pass'}</td>
                <td className="px-4 py-3">
                  <div className="font-bold">{reg.fullName}</div>
                  <div className="text-xs text-[#b89b84]">{reg.email}</div>
                  <div className="text-xs text-[#b89b84]">{reg.phone}</div>
                </td>
                <td className="px-4 py-3">{getPaymentBadge(reg.paymentStatus)}</td>
                <td className="px-4 py-3">{getStatusBadge(reg.paymentStatus)}</td>
                <td className="px-4 py-3 text-xs text-[#b89b84]">
                  {new Date(reg.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
