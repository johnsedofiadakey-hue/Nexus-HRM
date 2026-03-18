import React, { useState, useEffect } from 'react';
import { Zap, Clock, ChevronRight, ShieldCheck, CheckCircle2, CreditCard, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { toast } from '../utils/toast';

import { cn } from '../utils/cn';

const SubscriptionPage: React.FC = () => {
    const [org, setOrg] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState<string | null>(null);
    const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUALLY'>('MONTHLY');

    useEffect(() => {
        fetchOrg();
    }, []);

    const fetchOrg = async () => {
        try {
            const res = await api.get('/payment/status');
            setOrg(res.data);
        } catch (error) {
            console.error('Failed to fetch org subscription', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePay = async () => {
        setPaying(billingCycle);
        try {
            const res = await api.post('/payment/initialize', { plan: billingCycle });
            if (res.data?.status === true && res.data?.data?.authorization_url) {
                window.location.href = res.data.data.authorization_url;
            } else {
                toast.error('Could not initialize payment. Ensure platform Paystack keys are valid.');
            }
        } catch (error) {
            toast.error('Payment initialization failed. Gateway might be unreachable.');
        } finally {
            setPaying(null);
        }
    };

    const calculateFinalPrice = () => {
        const base = billingCycle === 'ANNUALLY' ? (org?.annualPrice || 0) : (org?.monthlyPrice || 0);
        let final = base;
        if (org?.discountPercentage) final *= (1 - org.discountPercentage / 100);
        if (org?.discountFixed) final = Math.max(0, final - org.discountFixed);
        return { base, final, discount: base - final };
    };

    const getTrialDaysRemaining = () => {
        if (!org?.trialEndsAt) return 0;
        const now = new Date();
        const expiry = new Date(org.trialEndsAt);
        const diff = expiry.getTime() - now.getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
            <p className="text-slate-400 font-bold animate-pulse">Synchronizing Payment Gateway...</p>
        </div>
    );

    const daysLeft = getTrialDaysRemaining();
    const isTrial = org?.billingStatus === 'FREE' || !org?.billingStatus;

    return (
        <div className="space-y-10 page-enter min-h-screen pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white font-display tracking-tight">Billing & SaaS</h1>
                    <p className="text-sm font-medium text-slate-500 mt-2 flex items-center gap-2 uppercase tracking-widest font-bold">
                        <ShieldCheck size={14} className="text-primary-light" />
                        {org?.name || 'Organization'} Management Console
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Current Plan Card */}
                <div className="lg:col-span-2 glass p-10 rounded-[2.5rem] border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                        <Zap size={200} className="text-white" />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 text-primary-light shadow-2xl shadow-primary/20">
                                {isTrial ? <Clock size={32} /> : <Zap size={32} />}
                            </div>
                            <div>
                                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-light mb-1">Current status</h2>
                                <h3 className="text-5xl font-black text-white font-display tracking-tighter">
                                    {isTrial ? 'Trial Phase' : org?.subscriptionPlan || 'Enterprise'}
                                </h3>
                            </div>
                        </div>

                        <p className="text-slate-400 mb-10 max-w-xl text-lg leading-relaxed">
                            {isTrial 
                                ? `You are currently in your ${org?.trialDays || 14}-day trial period. You have full access to all Nexus HRM modules during this time.`
                                : `Your organization is on the ${org?.subscriptionPlan} plan. Thank you for choosing Nexus HRM.`
                            }
                        </p>

                         <div className="flex flex-col gap-6">
                            {/* Billing Cycle Toggle */}
                            <div className="flex items-center gap-4 bg-black/20 p-1.5 rounded-2xl w-fit border border-white/5">
                                {[
                                    { id: 'MONTHLY', label: 'Monthly' },
                                    { id: 'ANNUALLY', label: 'Annually (Save 20% fallback)' }
                                ].map((c) => (
                                    <button
                                        key={c.id}
                                        onClick={() => setBillingCycle(c.id as any)}
                                        className={cn(
                                            "px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                                            billingCycle === c.id ? "bg-primary text-white shadow-lg" : "text-slate-500 hover:text-white"
                                        )}
                                    >
                                        {c.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="flex items-baseline gap-3">
                                    <span className="text-4xl font-black text-white">GHS {calculateFinalPrice().final.toLocaleString()}</span>
                                    {calculateFinalPrice().discount > 0 && (
                                        <span className="text-lg text-slate-500 line-through font-bold">GHS {calculateFinalPrice().base.toLocaleString()}</span>
                                    )}
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">/ {billingCycle === 'ANNUALLY' ? 'year' : 'month'}</span>
                                </div>
                                {calculateFinalPrice().discount > 0 && (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-black w-fit uppercase">
                                        <CheckCircle2 size={12} />
                                        You save GHS {calculateFinalPrice().discount.toLocaleString()} with applied discount
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-4 pt-4 border-t border-white/5">
                                {org?.paystackConfigured ? (
                                    <button 
                                        onClick={handlePay}
                                        disabled={paying !== null}
                                        className="px-10 py-5 bg-gradient-to-r from-primary to-primary-light hover:scale-[1.02] active:scale-[0.98] text-white rounded-3xl font-black text-sm transition-all flex items-center gap-3 shadow-2xl shadow-primary/30 disabled:opacity-50"
                                    >
                                        <CreditCard size={18} />
                                        {paying ? 'Synchronizing Secure Checkout...' : `Upgrade Now • GHS ${calculateFinalPrice().final.toLocaleString()}`}
                                        <ChevronRight size={16} />
                                    </button>
                                ) : org?.paystackPayLink ? (
                                    <a 
                                        href={org.paystackPayLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-10 py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-3xl font-black text-sm transition-all flex items-center gap-3 border border-white/10"
                                    >
                                        <CreditCard size={18} />
                                        Proceed to Secure Payment
                                        <ChevronRight size={16} />
                                    </a>
                                ) : (
                                    <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center gap-3 max-w-md">
                                        <AlertCircle size={20} className="text-amber-500 shrink-0" />
                                        <p className="text-[11px] font-bold text-amber-500/90 leading-tight uppercase">
                                            Online payments are being initialized by the platform administrator. Please contact developer support for manual plan activation.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Trial/Subscription Status */}
                <div className="glass p-10 rounded-[2.5rem] border border-white/5 bg-white/[0.01]">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-slate-400">
                            <Clock size={24} />
                        </div>
                        <h3 className="text-xl font-black text-white font-display uppercase tracking-tight">Lifecycle</h3>
                    </div>

                    <div className="space-y-8">
                        {isTrial ? (
                            <div>
                                 <div className="flex justify-between items-end mb-4">
                                    <div>
                                        <p className="text-4xl font-black text-white font-display">{daysLeft} <span className="text-lg text-slate-500 font-medium">/ {org?.trialDays || 14}</span></p>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">Days Remaining</p>
                                    </div>
                                    <p className="text-xs font-black text-amber-500 uppercase tracking-widest">Trial Mode</p>
                                </div>
                                <div className="h-3 w-full bg-white/[0.05] rounded-full overflow-hidden border border-white/5">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(daysLeft / (org?.trialDays || 14)) * 100}%` }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                        className="h-full bg-gradient-to-r from-amber-500 to-rose-500" 
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-center">
                                <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-3" />
                                <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">Active Subscription</p>
                                <p className="text-[10px] text-slate-400 mt-1 uppercase">Renewal Date: {org?.nextBillingDate ? new Date(org.nextBillingDate).toLocaleDateString() : 'N/A'}</p>
                            </div>
                        )}

                        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 space-y-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle size={16} className="text-primary mt-0.5" />
                                <div>
                                    <p className="text-xs font-black text-white uppercase">Need manual help?</p>
                                    <p className="text-[10px] text-slate-500 mt-1">If you prefer bank transfers, contact our developer support directly for immediate activation.</p>
                                </div>
                            </div>
                            <button className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase transition-all tracking-widest">
                                Contact Support
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Feature Table Placeholder */}
            <div className="glass rounded-[2.5rem] p-8 border border-white/5 text-center">
                <h3 className="text-lg font-black text-white uppercase tracking-widest mb-2">Platform Security & Longevity</h3>
                <p className="text-xs text-slate-500">Your data is secured with AES-256 encryption and multi-tenant isolation protocols.</p>
            </div>
        </div>
    );
};

export default SubscriptionPage;
