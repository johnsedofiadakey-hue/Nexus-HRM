import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';
import api from '../services/api';

const ConfirmEmailChange = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
    const [message, setMessage] = useState('Confirming your new email address...');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('This link is missing its confirmation token.');
            return;
        }
        api.post('/auth/change-email/confirm', { token })
            .then(res => {
                setStatus('success');
                setMessage(res.data?.message || 'Email address updated successfully.');
            })
            .catch(err => {
                setStatus('error');
                setMessage(err?.response?.data?.error || 'This link is invalid or has expired.');
            });
    }, [token]);

    return (
        <div className="min-h-screen bg-[#080c16] flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--primary)]/10 rounded-full blur-[100px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="max-w-lg w-full relative z-10"
            >
                <div className="glass p-10 md:p-14 text-center shadow-2xl">
                    <div className={
                        "w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-8 border " +
                        (status === 'success'
                            ? "bg-[var(--success)]/10 border-[var(--success)]/20"
                            : status === 'error'
                                ? "bg-[var(--error)]/10 border-[var(--error)]/20"
                                : "bg-[var(--primary)]/10 border-[var(--primary)]/20")
                    }>
                        {status === 'pending' && <Loader2 size={40} className="text-[var(--primary)] animate-spin" />}
                        {status === 'success' && <CheckCircle2 size={40} className="text-[var(--success)]" />}
                        {status === 'error' && <XCircle size={40} className="text-[var(--error)]" />}
                    </div>

                    <h1 className="text-2xl md:text-3xl font-black text-white font-display mb-4 tracking-tight">
                        {status === 'pending' && 'Confirming Email'}
                        {status === 'success' && 'Email Confirmed'}
                        {status === 'error' && 'Confirmation Failed'}
                    </h1>
                    <p className="text-slate-400 text-base mb-10 leading-relaxed font-medium">
                        {message}
                    </p>

                    {status !== 'pending' && (
                        <Link
                            to="/"
                            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-[var(--primary)] text-white text-sm font-black uppercase tracking-widest hover:scale-[1.02] transition-all"
                        >
                            <Mail size={16} />
                            Return to Login
                        </Link>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default ConfirmEmailChange;
