import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '../utils/toast';
import { CalendarDays, Plus, X, Loader2, Trash2, Globe } from 'lucide-react';
import api from '../services/api';
import { getStoredUser, getRankFromRole } from '../utils/session';
import { cn } from '../utils/cn';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const HolidayCalendar = () => {
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showAdd, setShowAdd] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [form, setForm] = useState({ name: '', date: '', isRecurring: false });
  const [saving, setSaving] = useState(false);

  const user = getStoredUser();
  const isAdmin = getRankFromRole(user.role) >= 80;

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/holidays?year=${year}`);
      setHolidays(Array.isArray(res.data) ? res.data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchHolidays(); }, [year]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/holidays', { ...form, year: form.isRecurring ? null : year, country: 'GH' });
      setShowAdd(false); setForm({ name: '', date: '', isRecurring: false });
      fetchHolidays();
    } catch (err: any) { toast.info(String(err?.response?.data?.error || 'Failed')); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this holiday?')) return;
    await api.delete(`/holidays/${id}`);
    fetchHolidays();
  };

  const seedGhana = async () => {
    setSeeding(true);
    try {
      const res = await api.post('/holidays/seed-ghana');
      toast.info(String(res.data.message));
      fetchHolidays();
    } catch (e) { toast.info('Seeding failed'); }
    finally { setSeeding(false); }
  };

  // Group by month
  const byMonth = (MONTHS || []).map((m, i) => ({
    name: m, index: i,
    holidays: (holidays || []).filter(h => new Date(h.date).getMonth() === i)
  }));

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">Holiday <span className="gradient-text">Calendar</span></h1>
          <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-2 opacity-60">{holidays.length} observed holidays for {year}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] p-1.5 rounded-2xl shadow-sm">
            <button onClick={() => setYear(y => y - 1)} className="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--bg-card)] rounded-xl transition-all">‹</button>
            <span className="font-black text-[var(--text-primary)] w-12 text-center text-sm">{year}</span>
            <button onClick={() => setYear(y => y + 1)} className="w-8 h-8 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--bg-card)] rounded-xl transition-all">›</button>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-3">
              <button onClick={seedGhana} disabled={seeding} className="btn-secondary px-6">
                {seeding ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
                <span className="hidden sm:inline ml-2">Ghana Holidays</span>
              </button>
              <button onClick={() => setShowAdd(true)} className="btn-primary px-6">
                <Plus size={16} /> 
                <span className="hidden sm:inline ml-2">Add Holiday</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] animate-pulse">Synchronizing Global Calendar...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {(byMonth || []).map(({ name, index, holidays: mHolidays }) => (
            <div key={name} className={cn(
              "nx-glass-card p-8 transition-all group",
              mHolidays.length === 0 ? 'opacity-40 grayscale-[0.5]' : 'hover:scale-[1.02]'
            )}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-3 h-3 rounded-full transition-all duration-500",
                    mHolidays.length > 0 ? 'bg-[var(--primary)] shadow-[0_0_12px_var(--ring-color)]' : 'bg-[var(--text-muted)] opacity-30'
                  )} />
                  <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tight">{name}</h3>
                </div>
                {mHolidays.length > 0 && (
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 uppercase tracking-widest">
                    {mHolidays.length}
                  </span>
                )}
              </div>
              {mHolidays.length === 0 ? (
                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest opacity-40">No entries</p>
              ) : (
                <div className="space-y-4">
                  {(mHolidays || []).map((h: any) => (
                    <div key={h.id} className="flex items-center gap-4 group/item py-2">
                      <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] flex flex-col items-center justify-center border border-[var(--border-subtle)] group-hover/item:border-[var(--primary)]/30 transition-all">
                        <span className="text-[14px] font-black text-[var(--text-primary)]">{new Date(h.date).getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-[var(--text-primary)] truncate group-hover/item:text-[var(--primary)] transition-colors">{h.name}</p>
                        {h.isRecurring && <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-0.5 opacity-60">Annual Observance</p>}
                      </div>
                      {isAdmin && (
                        <button onClick={() => handleDelete(h.id)} className="opacity-0 group-hover/item:opacity-100 p-2 rounded-xl bg-red-500/5 text-red-500 hover:bg-red-500/10 transition-all">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[var(--bg-main)]/80 backdrop-blur-md" onClick={e => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="nx-glass-card w-full max-w-md p-10 shadow-2xl border-[var(--border-subtle)]"
          >
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Add <span className="gradient-text">Holiday</span></h2>
              <button 
                onClick={() => setShowAdd(false)} 
                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-8">
              <div>
                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3 ml-1">Holiday Name</label>
                <input 
                  className="nx-input" 
                  required 
                  value={form.name} 
                  onChange={e => setForm({ ...form, name: e.target.value })} 
                  placeholder="e.g. Independence Day" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3 ml-1">Observance Date</label>
                <input 
                  type="date" 
                  className="nx-input" 
                  required 
                  value={form.date} 
                  onChange={e => setForm({ ...form, date: e.target.value })} 
                />
              </div>
              <div className="flex items-center gap-4 p-5 rounded-2xl bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)] group">
                <input 
                  type="checkbox" 
                  id="recurring" 
                  className="w-5 h-5 rounded-lg border-[var(--border-subtle)] text-[var(--primary)] focus:ring-[var(--ring-color)]" 
                  checked={form.isRecurring} 
                  onChange={e => setForm({ ...form, isRecurring: e.target.checked })} 
                />
                <label htmlFor="recurring" className="text-[13px] font-bold text-[var(--text-secondary)] cursor-pointer group-hover:text-[var(--text-primary)] transition-colors">
                  Recurring annually
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary px-8">Cancel</button>
                <button type="submit" className="btn-primary px-8" disabled={saving}>
                  {saving ? <><Loader2 size={16} className="animate-spin mr-2" /> Saving...</> : 'Add Holiday'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default HolidayCalendar;
