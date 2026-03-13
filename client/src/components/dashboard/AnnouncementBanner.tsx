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
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-4xl"
        >
            <div className={`relative px-6 py-3 rounded-2xl border shadow-2xl backdrop-blur-md flex items-center justify-between gap-4 overflow-hidden
        ${current.priority === 'URGENT' ? 'bg-rose-600/90 border-rose-500/50' : 'bg-slate-900/90 border-white/10'}`}>

                {/* Animated Background Pulse for Urgent */}
                {current.priority === 'URGENT' && (
                    <motion.div
                        animate={{ opacity: [0.1, 0.3, 0.1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 bg-white"
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
