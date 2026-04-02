import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LifeBuoy, Search, Plus, 
  User,
  Send, Paperclip, MoreVertical, ChevronLeft
} from 'lucide-react';
import { cn } from '../utils/cn';
import api from '../services/api';
import { getStoredUser } from '../utils/session';
import CreateTicketModal from '../components/support/CreateTicketModal';

const Support = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const user = getStoredUser();
  const isAdmin = (user?.rank || 0) >= 80;

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await api.get(isAdmin ? '/support/all' : '/support/my');
      setTickets(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetails = async (id: string) => {
    try {
      const res = await api.get(`/support/tickets/${id}`);
      setSelectedTicket(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendComment = async () => {
    if (!comment.trim() || !selectedTicket) return;
    try {
      await api.post(`/support/tickets/${selectedTicket.id}/comments`, { content: comment });
      setComment('');
      fetchTicketDetails(selectedTicket.id);
    } catch (err) {
      console.error(err);
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'URGENT': return 'text-red-500 bg-red-500/10';
      case 'HIGH': return 'text-orange-500 bg-orange-500/10';
      default: return 'text-blue-500 bg-blue-500/10';
    }
  };

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
            Internal <span className="text-[var(--primary)]">Helpdesk</span>
          </h1>
          <p className="text-[var(--text-muted)] mt-2 font-medium">Fast support for IT, HR, and Facility issues.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 rounded-2xl bg-[var(--primary)] text-white font-black text-sm hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] transition-all flex items-center gap-2"
        >
          <Plus size={18} />
          Create Ticket
        </button>
      </div>

      <div className="flex-1 flex gap-8 min-h-0">
        {/* Ticket List */}
        <div className={cn(
          "w-full lg:w-[400px] flex flex-col gap-4 min-h-0",
          selectedTicket ? "hidden lg:flex" : "flex"
        )}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
            <input 
              type="text" 
              placeholder="Search tickets..." 
              className="w-full pl-12 pr-4 py-4 rounded-[2rem] bg-[var(--bg-card)] border border-[var(--border-subtle)] focus:border-[var(--primary)] outline-none text-sm font-medium transition-all"
            />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
            {loading ? (
              <div className="p-20 text-center"><div className="animate-spin h-6 w-6 border-2 border-[var(--primary)] rounded-full mx-auto" /></div>
            ) : tickets.length === 0 ? (
              <div className="p-10 text-center bg-[var(--bg-card)] rounded-[2rem] border border-dashed border-[var(--border-subtle)]">
                <p className="text-[var(--text-muted)] text-sm font-medium">No tickets found.</p>
              </div>
            ) : tickets.map((t) => (
              <motion.div
                key={t.id}
                onClick={() => fetchTicketDetails(t.id)}
                whileHover={{ x: 5 }}
                className={cn(
                  "p-5 rounded-[1.5rem] border transition-all cursor-pointer group relative overflow-hidden",
                  selectedTicket?.id === t.id 
                    ? "bg-[var(--bg-sidebar-active)] border-[var(--primary)] shadow-lg" 
                    : "bg-[var(--bg-card)] border-[var(--border-subtle)] hover:border-[var(--primary)]/30"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                       <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest", getPriorityColor(t.priority))}>
                         {t.priority}
                       </span>
                       <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest opacity-50">#{t.id.slice(0,6)}</span>
                    </div>
                    <h3 className="font-black text-[var(--text-primary)] text-sm truncate group-hover:text-[var(--primary)] transition-colors">{t.subject}</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-1">{t.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-[10px] font-bold text-[var(--text-muted)]">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </span>
                    {t.status === 'OPEN' && <div className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Ticket Content */}
        <div className={cn(
          "flex-1 flex flex-col min-w-0 min-h-0 rounded-[2.5rem] bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-hidden shadow-2xl relative",
          !selectedTicket && "hidden lg:flex items-center justify-center p-20 text-center"
        )}>
          {!selectedTicket ? (
            <div className="space-y-6 max-w-md">
              <div className="w-24 h-24 bg-[var(--primary)]/10 rounded-[2rem] flex items-center justify-center text-[var(--primary)] mx-auto animate-bounce-slow">
                <LifeBuoy size={48} />
              </div>
              <h2 className="text-2xl font-black text-[var(--text-primary)]">Select a ticket to view details</h2>
              <p className="text-[var(--text-muted)] font-medium">Or create a new request for the technical team.</p>
            </div>
          ) : (
            <>
              {/* Ticket Top Bar */}
              <div className="p-6 md:p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-sidebar-active)]/20 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button onClick={() => setSelectedTicket(null)} className="lg:hidden p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"><ChevronLeft size={24} /></button>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                       <h2 className="text-lg font-black text-[var(--text-primary)]">{selectedTicket.subject}</h2>
                       <span className="px-3 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-[10px] font-black uppercase tracking-widest">{selectedTicket.status}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] font-medium">
                      <span className="flex items-center gap-1"><User size={12} /> {selectedTicket.employee?.fullName}</span>
                      <span>•</span>
                      <span>{selectedTicket.category}</span>
                    </div>
                  </div>
                </div>
                <button className="p-2 rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] hover:bg-[var(--bg-card)] transition-all">
                  <MoreVertical size={20} />
                </button>
              </div>

              {/* Chat-like Comments Area */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
                {/* Original Description */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white shrink-0 font-bold">
                    {selectedTicket.employee?.fullName[0]}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="p-4 rounded-[1.5rem] bg-[var(--bg-sidebar-active)] text-sm font-medium text-[var(--text-primary)] border border-[var(--border-subtle)]">
                      {selectedTicket.description}
                    </div>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] opacity-50 px-2">{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <AnimatePresence>
                  {selectedTicket.comments?.map((c: any) => (
                    <motion.div 
                      key={c.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex gap-4",
                        c.userId === user.id ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold",
                        c.userId === user.id ? "bg-[var(--primary)] text-white" : "bg-slate-500 text-white"
                      )}>
                        {c.user?.fullName?.[0] || '?'}
                      </div>
                      <div className={cn(
                        "flex-1 space-y-2",
                        c.userId === user.id ? "text-right" : "text-left"
                      )}>
                        <div className={cn(
                          "p-4 rounded-[1.5rem] text-sm font-medium border",
                          c.userId === user.id 
                            ? "bg-[var(--primary)]/10 border-[var(--primary)]/20 text-[var(--text-primary)]" 
                            : "bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-primary)]"
                        )}>
                          {c.content}
                        </div>
                        <span className="text-[10px] font-bold text-[var(--text-muted)] opacity-50 px-2">{new Date(c.createdAt).toLocaleString()}</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Input Area */}
              <div className="p-8 border-t border-[var(--border-subtle)] bg-[var(--bg-card)]">
                <div className="flex items-center gap-4 p-2 pl-6 pr-2 rounded-[2rem] bg-[var(--bg-sidebar-active)] border border-[var(--border-subtle)] focus-within:border-[var(--primary)] transition-all">
                  <input 
                    type="text" 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                    placeholder="Type your reply..." 
                    className="flex-1 bg-transparent border-none outline-none text-sm font-medium py-3"
                  />
                  <div className="flex items-center gap-1">
                    <button className="p-3 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"><Paperclip size={20} /></button>
                    <button 
                      onClick={handleSendComment}
                      className="p-3 bg-[var(--primary)] text-white rounded-[1.5rem] hover:shadow-lg transition-all"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <CreateTicketModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchTickets} 
      />
    </div>
  );
};

export default Support;
