
import React, { useState, useEffect } from 'react';
import { 
  Megaphone, Plus, Search, Trash2, Calendar, 
  User, CheckCircle2, AlertCircle, Info, Bell
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { getStoredUser, getRankFromRole } from '../utils/session';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { toast } from 'react-hot-toast';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  targetAudience: 'ALL' | 'DEPARTMENT' | 'MANAGERS' | 'EXECUTIVES';
  createdAt: string;
  createdBy: {
    fullName: string;
    role: string;
    avatarUrl?: string;
  };
  department?: {
    name: string;
  };
}

const Announcements = () => {
  const { t } = useTranslation();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const user = getStoredUser();
  const rank = getRankFromRole(user.role);
  const canPost = rank >= 85 || user.role === 'MD';

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'NORMAL',
    targetAudience: 'ALL',
    expirationDate: ''
  });

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/announcements');
      setAnnouncements(res.data);
    } catch (err) {
      console.error('Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/announcements', formData);
      toast.success('Announcement published!');
      setIsModalOpen(false);
      setFormData({ title: '', content: '', priority: 'NORMAL', targetAudience: 'ALL', expirationDate: '' });
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to publish');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      toast.success('Deleted');
      fetchAnnouncements();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const filtered = (announcements || []).filter(a => 
    a?.title?.toLowerCase().includes(search?.toLowerCase() || '') || 
    a?.content?.toLowerCase().includes(search?.toLowerCase() || '')
  );

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'URGENT': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'HIGH': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      default: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-[var(--bg-main)]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            {t('common.announcements', 'Announcements')}
          </h1>
          <p className="text-[var(--text-muted)] mt-2">
            Stay updated with organization-wide news and updates.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 group-focus-within:opacity-100 transition-opacity" size={18} />
            <input 
              type="text" 
              placeholder="Search announcements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 pr-6 py-3 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl w-full md:w-80 focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all shadow-sm"
            />
          </div>
          
          {canPost && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-2xl hover:opacity-90 transition-all font-semibold shadow-lg shadow-[var(--primary)]/20"
            >
              <Plus size={20} />
              <span>{t('announcements.post', 'Post New')}</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
           <div className="w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 bg-[var(--bg-card)] rounded-3xl border border-dashed border-[var(--border-subtle)] opacity-60">
          <Megaphone size={48} className="mb-4 text-[var(--primary)]" />
          <p className="text-lg font-medium">No announcements found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((anno, idx) => (
            <motion.div 
              key={anno.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-[var(--bg-card)] rounded-3xl p-6 border border-[var(--border-subtle)] hover:shadow-xl transition-all relative overflow-hidden group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={cn("px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border", getPriorityColor(anno.priority))}>
                  {anno.priority}
                </div>
                {canPost && (
                  <button 
                    onClick={() => handleDelete(anno.id)}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3 leading-snug">
                {anno.title}
              </h2>
              
              <div className="text-[var(--text-muted)] leading-relaxed mb-6 whitespace-pre-wrap">
                {anno.content}
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-[var(--border-subtle)] mt-auto">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] border border-[var(--primary)]/20">
                    <User size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{anno.createdBy.fullName}</p>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{anno.createdBy.role}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                    <Calendar size={14} className="opacity-50" />
                    {new Date(anno.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    Target: {anno.targetAudience}
                  </p>
                </div>
              </div>

              {/* Decorative Accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--primary)]/5 to-transparent rounded-bl-full pointer-events-none" />
            </motion.div>
          ))}
        </div>
      )}

      {/* Post Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-[var(--bg-card)] rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden border border-[var(--border-subtle)]"
            >
              <div className="p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-[var(--primary)]/10 rounded-2xl text-[var(--primary)]">
                    <Megaphone size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-[var(--text-primary)]">New Announcement</h3>
                    <p className="text-sm text-[var(--text-muted)]">Reach everyone in the organization.</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 ml-1">Title</label>
                    <input 
                      required
                      type="text" 
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      placeholder="Enter a descriptive title..."
                      className="w-full px-5 py-3.5 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-2xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 ml-1">Content</label>
                    <textarea 
                      required
                      rows={5}
                      value={formData.content}
                      onChange={e => setFormData({...formData, content: e.target.value})}
                      placeholder="What's the update?"
                      className="w-full px-5 py-3.5 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-2xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 ml-1">Priority</label>
                      <select 
                        value={formData.priority}
                        onChange={e => setFormData({...formData, priority: e.target.value})}
                        className="w-full px-5 py-3.5 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-2xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                      >
                        <option value="NORMAL">Normal</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent!</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 ml-1">Audience</label>
                      <select 
                        value={formData.targetAudience}
                        onChange={e => setFormData({...formData, targetAudience: e.target.value})}
                        className="w-full px-5 py-3.5 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-2xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                      >
                        <option value="ALL">All Staff</option>
                        <option value="MANAGERS">Managers Only</option>
                        <option value="DEPARTMENT">My Department</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-4">
                    <button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-6 py-4 rounded-2xl font-bold text-[var(--text-primary)] bg-[var(--bg-input)] hover:opacity-80 transition-all border border-[var(--border-subtle)]"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-6 py-4 rounded-2xl font-bold text-white bg-[var(--primary)] hover:opacity-90 transition-all shadow-xl shadow-[var(--primary)]/20"
                    >
                      Publish
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Announcements;
