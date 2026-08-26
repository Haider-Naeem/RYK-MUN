import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabase/config';
import toast from 'react-hot-toast';
import { keysToCamel, camelToSnake } from '../../utils/cache';

const BORDER_GOLD = 'rgba(183,145,67,0.18)';
const CARD_BG = 'rgba(68,7,19,0.35)';

export default function PassManagement({ event }) {
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', description: '', performers: '', timing: '', price: '', currency: 'PKR',
    pass_type: '', theme: 'default', total_seats: 0,
    registration_start_date: '', registration_end_date: '', status: 'active'
  });
  
  const fetchPasses = async () => {
    if (!event?.id) return;
    try {
      const { data, error } = await supabase
        .from('event_passes')
        .select('*')
        .eq('event_id', event.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPasses(keysToCamel(data || []));
    } catch (err) {
      toast.error('Failed to load passes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasses();

    const channel = supabase
      .channel('pass-management-realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'event_passes',
        filter: `event_id=eq.${event?.id}`
      }, () => {
        fetchPasses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event?.id]);

  const handleEdit = (pass) => {
    setEditingId(pass.id);
    setFormData({
      name: pass.name || '',
      description: pass.description || '',
      performers: pass.performers || '',
      timing: pass.timing || '',
      price: pass.price || '',
      currency: pass.currency || 'PKR',
      pass_type: pass.passType || '',
      theme: pass.theme || 'default',
      total_seats: pass.totalSeats || 0,
      registration_start_date: pass.registrationStartDate || '',
      registration_end_date: pass.registrationEndDate || '',
      status: pass.status || 'active'
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      name: '', description: '', performers: '', timing: '', price: '', currency: 'PKR',
      pass_type: '', theme: 'default', total_seats: 0,
      registration_start_date: '', registration_end_date: '', status: 'active'
    });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price) {
      toast.error('Name and price are required');
      return;
    }
    const payload = {
      event_id: event.id,
      name: formData.name,
      description: formData.description || null,
      performers: formData.performers || '[]',
      timing: formData.timing || null,
      price: Number(formData.price),
      currency: formData.currency,
      pass_type: formData.pass_type || null,
      theme: formData.theme || 'default',
      total_seats: Number(formData.total_seats) || 0,
      registration_start_date: formData.registration_start_date || null,
      registration_end_date: formData.registration_end_date || null,
      status: formData.status

    };

    try {
      if (editingId === 'new') {
        const { error } = await supabase.from('event_passes').insert([payload]);
        if (error) throw error;
        toast.success('Pass created successfully');
      } else {
        const { error } = await supabase.from('event_passes').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Pass updated successfully');
      }
      handleCancel();
      fetchPasses();
    } catch (err) {
      toast.error('Error saving pass');
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this pass?')) return;
    try {
      const { error } = await supabase.from('event_passes').delete().eq('id', id);
      if (error) throw error;
      toast.success('Pass deleted');
      fetchPasses();
    } catch (err) {
      toast.error('Error deleting pass');
    }
  };

  const inputCls = "w-full rounded-xl border border-[rgba(183,145,67,0.25)] bg-[rgba(0,0,0,0.4)] px-4 py-2 text-sm text-[#F8F3EA] placeholder-[#b89b84] focus:border-[#B79143] focus:outline-none";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-[#F8F3EA]">Manage Passes</h2>
        {!editingId && (
          <button onClick={() => setEditingId('new')} className="rounded-xl bg-[#B79143] px-4 py-2 text-xs font-bold text-[#2A0B12] hover:opacity-90">
            + Create Pass
          </button>
        )}
      </div>

      {editingId && (
        <div className="rounded-xl border p-5" style={{ borderColor: BORDER_GOLD, backgroundColor: CARD_BG }}>
          <h3 className="text-lg text-[#F8F3EA] mb-4 font-semibold">{editingId === 'new' ? 'New Pass' : 'Edit Pass'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-[#B79143] uppercase mb-1 block">Pass Name</label>
              <input type="text" className={inputCls} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Gala Dinner Pass" />
            </div>
            <div>
              <label className="text-xs text-[#B79143] uppercase mb-1 block">Price</label>
              <input type="number" className={inputCls} value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="e.g. 1500" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-[#B79143] uppercase mb-1 block">Description</label>
              <textarea className={inputCls} rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Details about this pass..."></textarea>
            </div>
            <div className="sm:col-span-1">
              <label className="text-xs text-[#B79143] uppercase mb-1 block">Performers</label>
              <textarea className={inputCls} rows="2" value={formData.performers} onChange={e => setFormData({...formData, performers: e.target.value})} placeholder="e.g. DJ Snake, Atif Aslam..."></textarea>
            </div>
            <div className="sm:col-span-1">
              <label className="text-xs text-[#B79143] uppercase mb-1 block">Timing</label>
              <textarea className={inputCls} rows="2" value={formData.timing} onChange={e => setFormData({...formData, timing: e.target.value})} placeholder="e.g. 8:00 PM - 11:30 PM"></textarea>
            </div>
            <div>
              <label className="text-xs text-[#B79143] uppercase mb-1 block">Total Seats</label>
              <input type="number" className={inputCls} value={formData.total_seats} onChange={e => setFormData({...formData, total_seats: e.target.value})} placeholder="e.g. 100" />
            </div>
            <div>
              <label className="text-xs text-[#B79143] uppercase mb-1 block">Pass Type</label>
              <input type="text" className={inputCls} value={formData.pass_type} onChange={e => setFormData({...formData, pass_type: e.target.value})} placeholder="e.g. VIP, Regular" />
            </div>
            <div>
              <label className="text-xs text-[#B79143] uppercase mb-1 block">Registration Start</label>
              <input type="date" className={inputCls} value={formData.registration_start_date} onChange={e => setFormData({...formData, registration_start_date: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-[#B79143] uppercase mb-1 block">Registration End</label>
              <input type="date" className={inputCls} value={formData.registration_end_date} onChange={e => setFormData({...formData, registration_end_date: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={handleCancel} className="px-4 py-2 text-sm font-semibold text-[#b89b84] hover:text-white">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-[#2A0B12] bg-[#B79143] rounded hover:opacity-90">Save Pass</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-[#B79143]">Loading passes...</div>
      ) : passes.length === 0 && !editingId ? (
        <div className="text-[#b89b84] text-center p-8 rounded border border-dashed border-[#B79143]/30">
          No passes created for this event yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {passes.map(pass => (
            <div key={pass.id} className="rounded-xl border p-4 flex flex-col" style={{ borderColor: BORDER_GOLD, backgroundColor: CARD_BG }}>
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-lg font-bold text-[#F8F3EA]">{pass.name}</h4>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${pass.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                  {pass.status}
                </span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <p className="text-sm text-[#b89b84]"><strong className="text-[#B79143]">Performers:</strong> {pass.performers || 'TBA'}</p>
                <div className="text-xs font-bold px-2 py-0.5 rounded border border-[#B79143]/30 bg-[#B79143]/10 text-[#D7B46A]">
                  🎟️ {pass.soldSeats || 0} / {pass.totalSeats > 0 ? pass.totalSeats : '∞'} Sold
                </div>
              </div>
              <p className="text-sm text-[#b89b84] mb-3 flex-1"><strong className="text-[#B79143]">Timing:</strong> {pass.timing || 'TBA'}</p>
              <div className="flex justify-between items-end mt-auto">
                <div className="text-lg font-bold text-[#D7B46A]">{pass.currency} {pass.price}</div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(pass)} className="text-xs text-[#B79143] hover:text-[#D7B46A]">Edit</button>
                  <button onClick={() => handleDelete(pass.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
