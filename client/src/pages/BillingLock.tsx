import { ShieldAlert, CreditCard, ExternalLink, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

export const BillingLock = () => {
    const { settings } = useTheme();

    const handleCheckout = () => {
        // Here we would ideally trigger a Paystack popup using the settings.paystackPublicKey.
        // For the scope of this implementation, we simulate an external redirect to a billing portal.
        alert('Navigating to Paystack secure checkout...');
        window.open('https://paystack.com/pay/nexus-hrm-renewal', '_blank');
    };

    return (
        <div className="min-h-screen bg-[#080c16] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-rose-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="max-w-xl w-full relative z-10"
            >
                <div className="glass p-10 md:p-14 text-center border-rose-500/20 shadow-2xl shadow-rose-500/10">
                    <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="w-20 h-20 mx-auto bg-rose-500/10 rounded-3xl flex items-center justify-center mb-8 border border-rose-500/20"
                    >
                        <ShieldAlert size={40} className="text-rose-500" />
                    </motion.div>

                    <h1 className="text-3xl md:text-4xl font-black text-white font-display mb-4 tracking-tight">
                        Subscription Inactive
                    </h1>
                    <p className="text-slate-400 text-base md:text-lg mb-10 leading-relaxed font-medium">
                        Your organization's access to the <strong className="text-white">Nexus HRM</strong> platform has been suspended due to an expired subscription. Please renew to restore immediate full service access.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-left group hover:border-emerald-500/30 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <CreditCard size={20} className="text-emerald-400" />
                                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">PRO</span>
                            </div>
                            <p className="text-sm font-bold text-white mb-1">Monthly License</p>
                            <p className="text-2xl font-black text-white font-display">
                                GHS {settings?.monthlyPriceGHS || '500.00'}
                            </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-left relative overflow-hidden group hover:border-primary/40 transition-colors">
                            <div className="absolute top-0 right-0 bg-primary/20 text-primary-light text-[9px] font-black uppercase px-2 py-1 rounded-bl-lg">Save 20%</div>
                            <div className="flex justify-between items-start mb-2">
                                <CalendarDays size={20} className="text-primary-light" />
                            </div>
                            <p className="text-sm font-bold text-white mb-1">Annual License</p>
                            <p className="text-2xl font-black text-white font-display">
                                GHS {settings?.annualPriceGHS || '4,800.00'}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={handleCheckout}
                            className="w-full btn-primary py-4 text-base shadow-lg shadow-primary/25 flex items-center justify-center gap-2 group"
                        >
                            Proceed to Secure Renewal <ExternalLink size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </button>
                        <p className="text-xs text-slate-500 font-bold">Payments are securely processed by Paystack.</p>
                    </div>
                </div>

                <div className="text-center mt-8">
                    <p className="text-xs text-slate-500 font-bold tracking-wider uppercase">
                        Need assistance? Contact <a href="mailto:support@nexus.cloud" className="text-primary-light hover:underline">support@nexus.cloud</a>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default BillingLock;
