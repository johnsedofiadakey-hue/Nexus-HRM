import React, { useEffect, useState } from 'react';
import { CalendarDays, Plus, X, Loader2, Trash2, Globe } from 'lucide-react';
import api from '../services/api';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const HolidayCalendar = () => {
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showAdd, setShowAdd] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [form, setForm] = useState({ name: '', date: '', isRecurring: false });
  const [saving, setSaving] = useState(false);

  const user = JSON.parse(localStorage.getItem('nexus_user') || '{}');
  const isAdmin = ['MD', 'HR_ADMIN'].includes(user.role);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/holidays?year=${year}`);
      setHolidays(res.data);
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
    } catch (err: any) { alert(err?.response?.data?.error || 'Failed'); }
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
      alert(res.data.message);
      fetchHolidays();
    } catch (e) { alert('Seeding failed'); }
    finally { setSeeding(false); }
  };

  // Group by month
  const byMonth = MONTHS.map((m, i) => ({
    name: m, index: i,
    holidays: holidays.filter(h => new Date(h.date).getMonth() === i)
  }));

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Holiday Calendar</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{holidays.length} holidays for {year}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 glass-light px-3 py-2 rounded-xl">
            <button onClick={() => setYear(y => y - 1)} className="text-slate-400 hover:text-white transition-colors">‹</button>
            <span className="font-semibold text-white w-12 text-center">{year}</span>
            <button onClick={() => setYear(y => y + 1)} className="text-slate-400 hover:text-white transition-colors">›</button>
          </div>
          {isAdmin && (
            <>
              <button onClick={seedGhana} disabled={seeding} className="btn-secondary flex items-center gap-2 text-sm">
                {seeding ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
                Ghana Holidays
              </button>
              <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
                <Plus size={16} /> Add Holiday
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin" style={{ color: 'var(--primary-light)' }} /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {byMonth.map(({ name, index, holidays: mHolidays }) => (
            <div key={name} className={`glass p-5 ${mHolidays.length === 0 ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full" style={{ background: mHolidays.length > 0 ? 'var(--primary)' : 'var(--text-muted)' }} />
                <h3 className="font-display font-semibold text-white">{name}</h3>
                {mHolidays.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full ml-auto" style={{ background: 'rgba(99,102,241,0.2)', color: 'var(--primary-light)' }}>
                    {mHolidays.length}
                  </span>
                )}
              </div>
              {mHolidays.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No holidays</p>
              ) : (
                <div className="space-y-2">
                  {mHolidays.map((h: any) => (
                    <div key={h.id} className="flex items-center gap-3 group">
                      <div className="text-xs font-mono w-6 text-center font-bold" style={{ color: 'var(--primary-light)' }}>
                        {new Date(h.date).getDate()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{h.name}</p>
                        {h.isRecurring && <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Annual</p>}
                      </div>
                      {isAdmin && (
                        <button onClick={() => handleDelete(h.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 transition-all text-rose-400">
                          <Trash2 size={12} />
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
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div className="modal-box">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-bold text-xl text-white">Add Holiday</h2>
              <button onClick={() => setShowAdd(false)} className="p-2 rounded-lg hover:bg-white/10" style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Holiday Name *</label>
                <input className="nx-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Independence Day" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Date *</label>
                <input type="date" className="nx-input" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)' }}>
                <input type="checkbox" id="recurring" className="w-4 h-4 rounded" checked={form.isRecurring} onChange={e => setForm({ ...form, isRecurring: e.target.checked })} />
                <label htmlFor="recurring" className="text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                  Recurring annually (e.g. national holidays)
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving}>
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : 'Add Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HolidayCalendar;
