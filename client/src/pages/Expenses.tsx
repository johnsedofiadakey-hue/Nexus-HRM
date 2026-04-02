import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, Receipt, Wallet, CheckCircle2, XCircle, 
  Clock, FileText, ChevronRight,
  TrendingUp, Download, PieChart
} from 'lucide-react';
import { cn } from '../utils/cn';
import api from '../services/api';
import { getStoredUser } from '../utils/session';

const Expenses = () => {
  const [claims, setClaims] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my' | 'approvals'>('my');
  const user = getStoredUser();
  const isManager = (user?.rank || 0) >= 70;

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'my') {
        const res = await api.get('/expenses/my');
        setClaims(res.data);
      } else {
        const res = await api.get('/expenses/approvals');
        setApprovals(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'text-green-500 bg-green-500/10';
      case 'REJECTED': return 'text-red-500 bg-red-500/10';
      case 'PAID': return 'text-blue-500 bg-blue-500/10';
      default: return 'text-amber-500 bg-amber-500/10';
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
            Expense <span className="text-[var(--primary)]">Desk</span>
          </h1>
          <p className="text-[var(--text-muted)] mt-2 font-medium">Manage reimbursements and financial claims.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-6 py-3 rounded-2xl bg-[var(--primary)] text-white font-black text-sm hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] transition-all flex items-center gap-2">
            <Plus size={18} />
            New Claim
          </button>
        </div>
      </div>

      {/* Tabs */}
      {isManager && (
        <div className="flex p-1.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] w-fit">
          <button
            onClick={() => setActiveTab('my')}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-black transition-all",
              activeTab === 'my' ? "bg-[var(--primary)] text-white shadow-lg" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            My Claims
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-black transition-all",
              activeTab === 'approvals' ? "bg-[var(--primary)] text-white shadow-lg" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            Approvals
          </button>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Spent', value: '4,200', icon: Wallet, color: 'blue' },
          { label: 'Pending', value: '850', icon: Clock, color: 'amber' },
          { label: 'Approved', value: '3,350', icon: CheckCircle2, color: 'green' },
          { label: 'This Month', value: '+12%', icon: TrendingUp, color: 'purple' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-xl"
          >
            <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-500/10 flex items-center justify-center text-${stat.color}-500 mb-4`}>
              <stat.icon size={24} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-60">{stat.label}</p>
            <p className="text-2xl font-black text-[var(--text-primary)] mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Table Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-[2.5rem] bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <h2 className="text-xl font-black text-[var(--text-primary)]">
            {activeTab === 'my' ? 'Recent History' : 'Pending Approvals'}
          </h2>
          <div className="flex items-center gap-2">
             <button className="p-2 rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-sidebar-active)]"><Download size={18} /></button>
             <button className="p-2 rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-sidebar-active)]"><PieChart size={18} /></button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-sidebar-active)]/30">
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60 italic">Reference</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60 italic">Details</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60 italic text-right">Amount</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60 italic">Status</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60 italic text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {loading ? (
                <tr><td colSpan={5} className="p-20 text-center"><div className="animate-spin h-8 w-8 border-2 border-[var(--primary)] rounded-full mx-auto" /></td></tr>
              ) : (activeTab === 'my' ? claims : approvals).length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center text-[var(--text-muted)] font-medium">No records found.</td></tr>
              ) : (activeTab === 'my' ? claims : approvals).map((item) => (
                <tr key={item.id} className="hover:bg-[var(--bg-sidebar-active)]/20 transition-colors group">
                  <td className="px-8 py-6">
                    <span className="font-mono text-xs font-bold text-[var(--primary)]">#{item.id.slice(0, 8).toUpperCase()}</span>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">{new Date(item.submittedAt || item.createdAt).toLocaleDateString()}</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center text-slate-500">
                        <Receipt size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[var(--text-primary)]">{item.title || item.category}</p>
                        <p className="text-xs text-[var(--text-muted)] font-medium truncate max-w-[200px]">{item.description || 'No description provided'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <p className="text-sm font-black text-[var(--text-primary)]">{item.currency} {Number(item.amount).toLocaleString()}</p>
                    <p className="text-[10px] text-[var(--text-muted)] font-bold">{item.category}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight",
                      getStatusColor(item.status)
                    )}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-center gap-2">
                       {activeTab === 'approvals' ? (
                         <>
                           <button className="p-2 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all"><CheckCircle2 size={16} /></button>
                           <button className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"><XCircle size={16} /></button>
                         </>
                       ) : (
                         <button className="p-2 rounded-xl bg-slate-500/10 text-slate-500 hover:bg-slate-500 hover:text-white transition-all"><FileText size={16} /></button>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default Expenses;
