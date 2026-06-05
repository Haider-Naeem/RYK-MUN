// src/components/Admin/NewsManagement.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/config';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { keysToCamel } from '../../utils/cache';
import Sidebar, { isAdminUser, adminPadClass } from '../Shared/Sidebar';
import toast from 'react-hot-toast';
import bk from '../../Assets/bk.webp';

const BG_SRC = bk;
const PANEL_BG = 'rgba(68,7,19,0.58)';
const BORDER_GOLD = 'rgba(183,145,67,0.18)';

export default function NewsManagement() {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const { canEdit, isSuperAdmin, isAdmin } = usePermissions();
  const navigate = useNavigate();
  
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Announcement',
    isFeatured: false,
    isPublished: true,
    link: '',
    publishedAt: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    // Redirect if not authenticated or not admin
    if (!authLoading) {
      if (!currentUser) {
        navigate('/');
        toast.error('Please sign in first');
        return;
      }
      if (!isAdmin) {
        navigate('/');
        toast.error('Access denied. Admin only.');
        return;
      }
      fetchNews();
    }
  }, [authLoading, currentUser, isAdmin]);

  const fetchNews = async () => {
    try {
      setLoading(true);
      // Fetch ALL news (both published and unpublished) for admin view
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setNews(keysToCamel(data || []));
    } catch (err) {
      toast.error('Failed to load news');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'Announcement',
      isFeatured: false,
      isPublished: true,
      link: '',
      publishedAt: new Date().toISOString().split('T')[0]
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (item) => {
    // Only superAdmin can edit
    if (!canEdit) {
      toast.error('You have view-only access. Contact Super Admin to make changes.');
      return;
    }

    let publishDate = new Date().toISOString().split('T')[0];
    if (item.publishedAt) {
      try {
        const date = new Date(item.publishedAt);
        if (!isNaN(date.getTime())) {
          publishDate = date.toISOString().split('T')[0];
        }
      } catch (e) {
        console.error('Date parsing error:', e);
      }
    }
    
    setFormData({
      title: item.title || '',
      description: item.description || '',
      category: item.category || 'Announcement',
      isFeatured: item.isFeatured || false,
      isPublished: item.isPublished !== false,
      link: item.link || '',
      publishedAt: publishDate
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Only superAdmin can create/edit
    if (!canEdit) {
      toast.error('You have view-only access. Contact Super Admin to make changes.');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      const publishDate = new Date(formData.publishedAt);
      const isoDate = publishDate.toISOString();

      const newsData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        is_featured: formData.isFeatured,
        is_published: formData.isPublished,
        link: formData.link || null,
        published_at: isoDate,
        updated_at: new Date().toISOString()
      };

      if (editingId) {
        const { error } = await supabase
          .from('news')
          .update(newsData)
          .eq('id', editingId);
        
        if (error) throw error;
        toast.success('News updated successfully');
      } else {
        const { error } = await supabase
          .from('news')
          .insert({
            ...newsData,
            created_by: currentUser?.id,
            created_at: new Date().toISOString()
          });
        
        if (error) throw error;
        toast.success('News created successfully');
      }

      resetForm();
      fetchNews();
    } catch (err) {
      toast.error(err.message || 'Failed to save news');
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    // Only superAdmin can delete
    if (!canEdit) {
      toast.error('You have view-only access. Contact Super Admin to make changes.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this news item?')) return;
    
    try {
      const { error } = await supabase
        .from('news')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('News deleted successfully');
      fetchNews();
    } catch (err) {
      toast.error('Failed to delete news');
      console.error(err);
    }
  };

  const handleTogglePublish = async (id, currentStatus) => {
    // Only superAdmin can toggle publish status
    if (!canEdit) {
      toast.error('You have view-only access. Contact Super Admin to make changes.');
      return;
    }

    try {
      const { error } = await supabase
        .from('news')
        .update({ 
          is_published: !currentStatus, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);
      
      if (error) throw error;
      toast.success(`News ${!currentStatus ? 'published' : 'unpublished'}`);
      fetchNews();
    } catch (err) {
      toast.error('Failed to update status');
      console.error(err);
    }
  };

  const handleToggleFeatured = async (id, currentStatus) => {
    // Only superAdmin can toggle featured status
    if (!canEdit) {
      toast.error('You have view-only access. Contact Super Admin to make changes.');
      return;
    }

    try {
      const { error } = await supabase
        .from('news')
        .update({ 
          is_featured: !currentStatus, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);
      
      if (error) throw error;
      toast.success(`News ${!currentStatus ? 'marked as featured' : 'removed from featured'}`);
      fetchNews();
    } catch (err) {
      toast.error('Failed to update featured status');
      console.error(err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-PK', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const BackgroundOverlay = () => (
    <div className="absolute inset-0 z-0">
      <img src={BG_SRC} alt="" className="w-full h-full object-cover grayscale brightness-[0.15]" />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(68,7,19,0.55) 0%, rgba(10,0,2,0.75) 100%)' }} />
    </div>
  );

  // Show loading while checking auth
  if (authLoading || loading) {
    return (
      <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: '#440713' }}>
        <BackgroundOverlay />
        <Sidebar />
        <div className={`relative z-10 ${isAdmin ? 'md:pl-[272px]' : ''} flex items-center justify-center min-h-screen`}>
          <div className="w-10 h-10 rounded-full border-2 border-[#B79143]/20 border-t-[#B79143] animate-spin" />
        </div>
      </div>
    );
  }

  // Don't render if not admin (will redirect in useEffect)
  if (!isAdmin) {
    return (
      <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: '#440713' }}>
        <BackgroundOverlay />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <p className="text-[#b89b84]">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ backgroundColor: '#440713' }}>
      <BackgroundOverlay />
      <Sidebar />

      <div className={`relative z-10 ${adminPadClass(userProfile)}`}>
        <div className="px-4 pb-12 pt-20 sm:px-6 lg:px-8 md:pt-8">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <p className="text-[#B79143] uppercase tracking-[0.3em] text-[11px] mb-3">Content Management</p>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#F8F3EA]">News & Announcements</h1>
              <p className="text-sm text-[#b89b84] mt-2">
                {isSuperAdmin 
                  ? 'Manage news items displayed on the landing page' 
                  : 'View news items (read-only)'}
              </p>
            </div>
            {/* Only show Add News button for superAdmin */}
            {isSuperAdmin && (
              <button
                onClick={() => { resetForm(); setShowForm(true); }}
                className="rounded-xl border px-5 py-2.5 text-sm font-semibold text-[#B79143] hover:bg-[rgba(183,145,67,0.08)] transition"
                style={{ borderColor: 'rgba(183,145,67,0.28)' }}
              >
                + Add News
              </button>
            )}
          </div>

          {/* Form Modal - Only for superAdmin */}
          {showForm && isSuperAdmin && (
            <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="w-full max-w-lg rounded-2xl border p-6 max-h-[90vh] overflow-y-auto" 
                style={{ borderColor: 'rgba(183,145,67,0.28)', backgroundColor: 'rgba(20,4,4,0.98)' }}>
                <h2 className="text-xl font-bold text-[#F8F3EA] mb-4">
                  {editingId ? 'Edit News' : 'Add News'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm text-[#B79143] mb-1">Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full rounded-lg border px-3 py-2 text-sm bg-transparent text-[#F8F3EA] focus:outline-none focus:border-[#B79143]"
                      style={{ borderColor: 'rgba(183,145,67,0.2)' }}
                      placeholder="Enter news title"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-[#B79143] mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={4}
                      className="w-full rounded-lg border px-3 py-2 text-sm bg-transparent text-[#F8F3EA] resize-none focus:outline-none focus:border-[#B79143]"
                      style={{ borderColor: 'rgba(183,145,67,0.2)' }}
                      placeholder="Enter news description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-[#B79143] mb-1">Link (optional)</label>
                    <input
                      type="text"
                      value={formData.link}
                      onChange={(e) => setFormData({...formData, link: e.target.value})}
                      placeholder="#section or https://full-url.com"
                      className="w-full rounded-lg border px-3 py-2 text-sm bg-transparent text-[#F8F3EA] focus:outline-none focus:border-[#B79143]"
                      style={{ borderColor: 'rgba(183,145,67,0.2)' }}
                    />
                    <p className="text-xs text-[#b89b84] mt-1">Use #section for internal links or full URL for external</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-[#B79143] mb-1">Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full rounded-lg border px-3 py-2 text-sm bg-transparent text-[#F8F3EA] focus:outline-none focus:border-[#B79143]"
                        style={{ borderColor: 'rgba(183,145,67,0.2)' }}
                      >
                        <option value="Announcement">Announcement</option>
                        <option value="Speakers">Speakers</option>
                        <option value="Update">Update</option>
                        <option value="Venue">Venue</option>
                        <option value="Event">Event</option>
                        <option value="Registration">Registration</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-[#B79143] mb-1">Published Date</label>
                      <input
                        type="date"
                        value={formData.publishedAt}
                        onChange={(e) => setFormData({...formData, publishedAt: e.target.value})}
                        className="w-full rounded-lg border px-3 py-2 text-sm bg-transparent text-[#F8F3EA] focus:outline-none focus:border-[#B79143]"
                        style={{ borderColor: 'rgba(183,145,67,0.2)' }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isFeatured}
                        onChange={(e) => setFormData({...formData, isFeatured: e.target.checked})}
                        className="rounded accent-[#B79143]"
                      />
                      <span className="text-sm text-[#F8F3EA]">⭐ Featured</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isPublished}
                        onChange={(e) => setFormData({...formData, isPublished: e.target.checked})}
                        className="rounded accent-[#B79143]"
                      />
                      <span className="text-sm text-[#F8F3EA]">📢 Published</span>
                    </label>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
                      style={{ background: 'linear-gradient(135deg,#8b1a1a,#B79143)' }}
                    >
                      {editingId ? 'Update' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-lg border px-4 py-2.5 text-sm text-[#b89b84] hover:text-[#F8F3EA] transition"
                      style={{ borderColor: 'rgba(183,145,67,0.2)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* News List */}
          <div className="rounded-3xl border backdrop-blur-xl p-4 sm:p-6"
            style={{ borderColor: BORDER_GOLD, backgroundColor: PANEL_BG }}>
            {news.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#b89b84] text-lg mb-4">No news items yet</p>
                {isSuperAdmin && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="text-[#B79143] underline hover:text-[#D7B46A]"
                  >
                    Create your first announcement
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left" style={{ borderColor: 'rgba(183,145,67,0.12)' }}>
                      {['Title', 'Category', 'Featured', 'Status', 'Date', isSuperAdmin ? 'Actions' : ''].filter(Boolean).map(h => (
                        <th key={h} className="pb-4 text-[#B79143] uppercase tracking-[0.2em] text-[11px] font-bold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {news.map(item => (
                      <tr key={item.id} className="border-b hover:bg-[rgba(183,145,67,0.04)] transition"
                        style={{ borderColor: 'rgba(183,145,67,0.08)' }}>
                        <td className="py-4 pr-4">
                          <div className="font-semibold text-[#F8F3EA]">{item.title}</div>
                          {item.link && (
                            <div className="text-xs text-[#B79143] mt-1 flex items-center gap-1">
                              <span>🔗</span>
                              <span className="truncate max-w-[150px]">{item.link}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 pr-4">
                          <span className="inline-block rounded-lg border px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-[#B79143]"
                            style={{ borderColor: 'rgba(183,145,67,0.25)', backgroundColor: 'rgba(183,145,67,0.08)' }}>
                            {item.category}
                          </span>
                        </td>
                        <td className="py-4 pr-4">
                          {/* superAdmin can toggle, admin just views */}
                          {isSuperAdmin ? (
                            <button
                              onClick={() => handleToggleFeatured(item.id, item.isFeatured)}
                              className={`inline-block rounded-lg px-3 py-1 text-[10px] uppercase tracking-[0.15em] font-bold transition ${
                                item.isFeatured
                                  ? 'bg-[rgba(183,145,67,0.15)] text-[#D7B46A] border border-[rgba(183,145,67,0.3)]'
                                  : 'bg-transparent text-[#b89b84] border border-[rgba(183,145,67,0.1)]'
                              }`}
                            >
                              {item.isFeatured ? '⭐ Featured' : '—'}
                            </button>
                          ) : (
                            <span className={`inline-block rounded-lg px-3 py-1 text-[10px] uppercase tracking-[0.15em] font-bold ${
                              item.isFeatured
                                ? 'bg-[rgba(183,145,67,0.15)] text-[#D7B46A] border border-[rgba(183,145,67,0.3)]'
                                : 'bg-transparent text-[#b89b84] border border-[rgba(183,145,67,0.1)]'
                            }`}>
                              {item.isFeatured ? '⭐ Featured' : '—'}
                            </span>
                          )}
                        </td>
                        <td className="py-4 pr-4">
                          {/* superAdmin can toggle, admin just views */}
                          {isSuperAdmin ? (
                            <button
                              onClick={() => handleTogglePublish(item.id, item.isPublished)}
                              className={`inline-block rounded-lg px-3 py-1 text-[10px] uppercase tracking-[0.15em] font-bold transition ${
                                item.isPublished !== false
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30'
                                  : 'bg-red-500/15 text-red-300 border border-red-400/30'
                              }`}
                            >
                              {item.isPublished !== false ? 'Published' : 'Draft'}
                            </button>
                          ) : (
                            <span className={`inline-block rounded-lg px-3 py-1 text-[10px] uppercase tracking-[0.15em] font-bold ${
                              item.isPublished !== false
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30'
                                : 'bg-red-500/15 text-red-300 border border-red-400/30'
                            }`}>
                              {item.isPublished !== false ? 'Published' : 'Draft'}
                            </span>
                          )}
                        </td>
                        <td className="py-4 pr-4 text-[#b89b84] text-xs">
                          {formatDate(item.publishedAt || item.createdAt)}
                        </td>
                        {/* Actions column - only for superAdmin */}
                        {isSuperAdmin && (
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleEdit(item)}
                                className="text-xs text-[#B79143] hover:text-[#D7B46A] underline transition"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="text-xs text-red-400 hover:text-red-300 underline transition"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}