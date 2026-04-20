import React, { useState, useEffect } from 'react';
import { 
  Megaphone, Plus, Search, Trash2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { getStoredUser, getRankFromRole } from '../utils/session';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { toast } from 'react-hot-toast';
import AnnouncementDetailModal from '../components/announcements/AnnouncementDetailModal';
import ConfirmDeleteModal from '../components/common/ConfirmDeleteModal';

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
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const user = getStoredUser();
  const rank = getRankFromRole(user.role);
  const canPost = rank >= 85; // Standardize to Director/MD/HR_ADMIN
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  const handleConfirmDelete = async () => {
    if (!deleteModal.id) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/announcements/${deleteModal.id}`);
      toast.success('Dispatch permanentely decommisioned.');
      fetchAnnouncements();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    } finally {
      setDeleteLoading(false);
      setDeleteModal({ open: false, id: null });
    }
  };

  const handleOpenDetail = (anno: Announcement) => {
    setSelectedAnnouncement(anno);
    setIsDetailOpen(true);
  };

  const filtered = (announcements || []).filter(a => 
    a?.title?.toLowerCase().includes(search?.toLowerCase() || '') || 
    a?.content?.toLowerCase().includes(search?.toLowerCase() || '')
  );

  const getPriorityStyle = (p: string) => {
    switch(p) {
      case 'URGENT': return 'text-[var(--error)] bg-[var(--error)]/5 border-[var(--error)]/20';
      case 'HIGH': return 'text-[var(--warning)] bg-[var(--warning)]/5 border-[var(--warning)]/20';
      case 'NORMAL': return 'text-[var(--primary)] bg-[var(--primary)]/5 border-indigo-200';
      default: return 'text-[var(--success)] bg-[var(--success)]/5 border-[var(--success)]/20';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-[var(--bg-main)]">
      {/* Header Architecture */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 mb-16">
        <div>
           <div className="flex items-center gap-3 mb-4">
              <div className="w-1.5 h-8 bg-[var(--primary)] rounded-full" />
              <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight">
                {t('common.announcements', 'Announcements')}
              </h1>
           </div>
          <p className="text-[var(--text-secondary)] font-medium max-w-xl opacity-80">
            {t('announcements.bulletin_system')}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors" size={20} />
            <input 
              type="text" 
              placeholder={t('announcements.filter_placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-14 pr-8 py-4 bg-[var(--bg-card)] border-2 border-[var(--border-subtle)] rounded-2xl w-full md:w-96 focus:border-[var(--primary)] focus:bg-white outline-none transition-all shadow-sm font-bold text-sm"
            />
          </div>
          
          {canPost && (
            <motion.button 
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-3 px-8 h-14 bg-[var(--primary)] text-white rounded-2xl transition-all font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-[var(--primary)]/30"
            >
              <Plus size={20} />
              <span>{t('announcements.post', 'Create Dispatch')}</span>
            </motion.button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
           <div className="w-12 h-12 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-24 bg-[var(--bg-card)] rounded-[3rem] border-2 border-dashed border-[var(--border-subtle)] opacity-40">
          <Megaphone size={64} className="mb-6 text-[var(--text-muted)]" />
          <p className="text-xl font-black uppercase tracking-widest text-[var(--text-muted)]">{t('announcements.no_bulletins')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((anno, idx) => (
            <motion.div 
              key={anno.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => handleOpenDetail(anno)}
              className="bg-white rounded-[2.5rem] p-8 border-2 border-[var(--border-subtle)] hover:border-[var(--primary)]/30 transition-all shadow-xl shadow-black/[0.02] hover:shadow-2xl hover:shadow-black/[0.05] relative overflow-hidden group cursor-pointer flex flex-col h-full"
            >
              <div className="flex justify-between items-center mb-6">
                <span className={cn("px-4 py-1.5 rounded-xl text-[9px] font-black tracking-[0.15em] uppercase border shadow-sm", getPriorityStyle(anno.priority))}>
                  {t('announcements.priority_bulletin', { priority: anno.priority })}
                </span>
                
                {canPost && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDeleteModal({ open: true, id: anno.id }); }}
                    className="p-3 text-[var(--error)] bg-[var(--error)]/5 hover:bg-rose-100 rounded-xl opacity-0 group-hover:opacity-100 transition-all border border-rose-100"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <h2 className="text-xl font-black text-slate-900 mb-4 leading-tight tracking-tight uppercase group-hover:text-[var(--primary)] transition-colors">
                {anno.title}
              </h2>
              
              <div className="text-slate-500 leading-relaxed mb-8 text-[13px] font-medium line-clamp-3 overflow-hidden">
                {anno.content}
              </div>

              <div className="mt-auto pt-8 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/5 border border-indigo-100 flex items-center justify-center text-[var(--primary)] font-black text-xs">
                    {anno.createdBy.fullName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[12px] font-black text-slate-800 uppercase tracking-tight">{anno.createdBy.fullName}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">{anno.createdBy.role}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-1">{t('announcements.reference')}</p>
                  <p className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">ID-{anno.id.slice(0, 5).toUpperCase()}</p>
                </div>
              </div>

              {/* Decorative Accent */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-50 to-transparent rounded-bl-full pointer-events-none" />
            </motion.div>
          ))}
        </div>
      )}

      {/* Formal Detail Modal */}
      <AnnouncementDetailModal 
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        announcement={selectedAnnouncement}
      />

      <ConfirmDeleteModal 
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null })}
        onConfirm={handleConfirmDelete}
        itemName="Organization-Wide Dispatch"
        loading={deleteLoading}
      />

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
                    <h3 className="text-2xl font-bold text-[var(--text-primary)]">{t('announcements.new_announcement')}</h3>
                    <p className="text-sm text-[var(--text-muted)]">{t('announcements.reach_description')}</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                   <div>
                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 ml-1">{t('announcements.title_label')}</label>
                    <input 
                      required
                      type="text" 
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      placeholder={t('announcements.title_placeholder', 'Enter a descriptive title...')}
                      className="w-full px-5 py-3.5 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-2xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                    />
                  </div>

                  <div>
                   <div>
                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 ml-1">{t('announcements.content_label')}</label>
                    <textarea 
                      required
                      rows={5}
                      value={formData.content}
                      onChange={e => setFormData({...formData, content: e.target.value})}
                      placeholder={t('announcements.content_placeholder', "What's the update?")}
                      className="w-full px-5 py-3.5 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-2xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                     <div>
                      <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 ml-1">{t('announcements.priority_label')}</label>
                      <select 
                        value={formData.priority}
                        onChange={e => setFormData({...formData, priority: e.target.value})}
                        className="w-full px-5 py-3.5 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-2xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                      >
                        <option value="NORMAL">{t('announcements.normal')}</option>
                        <option value="HIGH">{t('announcements.high')}</option>
                        <option value="URGENT">{t('announcements.urgent')}</option>
                      </select>
                    </div>
                    <div>
                     <div>
                      <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 ml-1">{t('announcements.audience_label')}</label>
                      <select 
                        value={formData.targetAudience}
                        onChange={e => setFormData({...formData, targetAudience: e.target.value})}
                        className="w-full px-5 py-3.5 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-2xl focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                      >
                        <option value="ALL">{t('announcements.all_staff')}</option>
                        <option value="MANAGERS">{t('announcements.managers_only')}</option>
                        <option value="DEPARTMENT">{t('announcements.my_department')}</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-4">
                     <button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-6 py-4 rounded-2xl font-bold text-[var(--text-primary)] bg-[var(--bg-input)] hover:opacity-80 transition-all border border-[var(--border-subtle)]"
                    >
                      {t('announcements.cancel')}
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-6 py-4 rounded-2xl font-bold text-white bg-[var(--primary)] hover:opacity-90 transition-all shadow-xl shadow-[var(--primary)]/20"
                    >
                      {t('announcements.publish')}
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
