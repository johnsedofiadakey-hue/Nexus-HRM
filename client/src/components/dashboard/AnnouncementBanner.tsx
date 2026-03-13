import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, X, ChevronRight, Info, AlertTriangle, Zap } from 'lucide-react';
import api from '../../services/api';

interface Announcement {
    id: string;
    title: string;
    content: string;
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    createdBy: { fullName: string };
}

const AnnouncementBanner = () => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                const res = await api.get('/announcements');
                setAnnouncements(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                console.error('Failed to fetch announcements:', err);
                setAnnouncements([]);
            }
        };
        fetchAnnouncements();
    }, []);

    if (!Array.isArray(announcements) || announcements.length === 0 || !isVisible) return null;

    const current = announcements[currentIdx];

    const getPriorityStyles = (p: string) => {
        switch (p) {
            case 'URGENT': return 'bg-rose-500 text-white border-rose-400';
            case 'HIGH': return 'bg-amber-500 text-white border-amber-400';
            default: return 'bg-primary text-white border-primary-light/50';
        }
    };

    return (
        <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[10001] w-[95%] max-w-5xl"
        >
            <div className={`relative px-8 py-5 rounded-[2.5rem] border shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] backdrop-blur-2xl flex items-center justify-between gap-6 overflow-hidden transition-all duration-500 hover:scale-[1.01]
    ${current.priority === 'URGENT' ? 'bg-rose-600 border-rose-400/50' : 'bg-slate-900/90 border-white/20'}`}>

                {/* Animated Background Pulse for Urgent */}
                {current.priority === 'URGENT' && (
                    <motion.div
                        animate={{ opacity: [0.2, 0.5, 0.2] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 bg-white/10 pointer-events-none"
                    />
                )}

                <div className="flex items-center gap-4 relative">
                    <div className="p-2 rounded-xl bg-white/10">
                        {current.priority === 'URGENT' ? <Zap size={18} /> : <Megaphone size={18} />}
                    </div>
                    <div className="min-w-0">
                        <h4 className="font-black text-sm uppercase tracking-wider">{current.title}</h4>
                        <p className="text-xs opacity-80 truncate">{current.content}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 relative">
                    {announcements.length > 1 && (
                        <button
                            onClick={() => setCurrentIdx((currentIdx + 1) % announcements.length)}
                            className="p-1 px-2 text-[10px] font-black uppercase tracking-widest bg-white/10 rounded-lg hover:bg-white/20 transition-all flex items-center gap-1"
                        >
                            Next ({currentIdx + 1}/{announcements.length})
                            <ChevronRight size={12} />
                        </button>
                    )}
                    <button onClick={() => setIsVisible(false)} className="p-1.5 hover:bg-white/10 rounded-lg">
                        <X size={16} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export default AnnouncementBanner;
