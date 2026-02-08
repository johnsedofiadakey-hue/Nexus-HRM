import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Save, Settings, CreditCard } from 'lucide-react';

const AdminSettings = () => {
    const { settings, refreshSettings } = useTheme();
    const [formData, setFormData] = useState(settings);
    const [saving, setSaving] = useState(false);

    // Sync state when settings load
    useEffect(() => {
        setFormData(settings);
    }, [settings]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const token = localStorage.getItem('nexus_token');
            const res = await fetch('http://localhost:5000/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                refreshSettings();
                alert("Settings Saved & Applied!");
            } else {
                alert("Failed to save settings");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in pb-20">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-nexus-100 rounded-xl text-nexus-600">
                    <Settings size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">System Settings</h1>
                    <p className="text-slate-500">Customize branding and subscription</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">

                {/* BRANDING CARD */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">White-Label Branding</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Company Name</label>
                            <input
                                type="text"
                                value={formData.companyName}
                                onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                                className="w-full border rounded-lg p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Logo URL</label>
                            <input
                                type="text"
                                value={formData.companyLogoUrl || ''}
                                onChange={e => setFormData({ ...formData, companyLogoUrl: e.target.value })}
                                className="w-full border rounded-lg p-2"
                                placeholder="http://example.com/logo.png"
                            />
                        </div>

                        {/* COLOR PICKERS */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Primary Color (Brand)</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={formData.primaryColor}
                                    onChange={e => setFormData({ ...formData, primaryColor: e.target.value })}
                                    className="w-10 h-10 rounded cursor-pointer border-0"
                                />
                                <input
                                    type="text"
                                    value={formData.primaryColor}
                                    onChange={e => setFormData({ ...formData, primaryColor: e.target.value })}
                                    className="flex-1 border rounded-lg p-2 font-mono uppercase"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Secondary Color (Context)</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={formData.secondaryColor}
                                    onChange={e => setFormData({ ...formData, secondaryColor: e.target.value })}
                                    className="w-10 h-10 rounded cursor-pointer border-0"
                                />
                                <input
                                    type="text"
                                    value={formData.secondaryColor}
                                    onChange={e => setFormData({ ...formData, secondaryColor: e.target.value })}
                                    className="flex-1 border rounded-lg p-2 font-mono uppercase"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Accent Color (Highlights)</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={formData.accentColor}
                                    onChange={e => setFormData({ ...formData, accentColor: e.target.value })}
                                    className="w-10 h-10 rounded cursor-pointer border-0"
                                />
                                <input
                                    type="text"
                                    value={formData.accentColor}
                                    onChange={e => setFormData({ ...formData, accentColor: e.target.value })}
                                    className="flex-1 border rounded-lg p-2 font-mono uppercase"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* SUBSCRIPTION CARD */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h2 className="text-xl font-bold text-slate-800">Subscription</h2>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${formData.subscriptionStatus === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {formData.subscriptionStatus || 'ACTIVE'}
                        </span>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-lg">
                        <CreditCard className="text-slate-400" size={32} />
                        <div>
                            <p className="font-bold text-slate-700">{formData.plan || 'Free'} Plan</p>
                            <p className="text-xs text-slate-500">
                                {formData.lastPaymentDate ? `Last Payment: ${new Date(formData.lastPaymentDate).toLocaleDateString()}` : 'No payment history'}
                            </p>
                        </div>
                        {formData.paymentLink && (
                            <a href={formData.paymentLink} target="_blank" rel="noreferrer" className="ml-auto text-nexus-600 font-bold text-sm hover:underline border border-nexus-200 px-3 py-1 rounded bg-white">
                                Pay Now / Manage
                            </a>
                        )}
                    </div>
                </div>

                {/* MAINTENANCE CARD */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">System Maintenance</h2>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-slate-700">System Backup</p>
                            <p className="text-sm text-slate-500">Create an immediate backup of the database.</p>
                        </div>
                        <button
                            type="button"
                            onClick={async () => {
                                try {
                                    const token = localStorage.getItem('nexus_token');
                                    const res = await fetch('http://localhost:5000/api/maintenance/backup', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
                                    if (res.ok) alert('Backup started successfully!');
                                    else alert('Backup failed');
                                } catch (e) { alert('Error triggering backup'); }
                            }}
                            className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-900"
                        >
                            Run Backup Now
                        </button>
                    </div>
                    <div className="mt-4 pt-4 border-t flex items-center justify-between">
                        <div>
                            <p className="font-bold text-slate-700">Health Check</p>
                            <p className="text-sm text-slate-500">Verify database and system status.</p>
                        </div>
                        <button
                            type="button"
                            onClick={async () => {
                                try {
                                    const token = localStorage.getItem('nexus_token');
                                    const res = await fetch('http://localhost:5000/api/maintenance/health', { headers: { Authorization: `Bearer ${token}` } });
                                    const data = await res.json();
                                    alert(`System Status: ${data.status}\nUptime: ${data.uptime}s\nMemory: ${JSON.stringify(data.memory)}`);
                                } catch (e) { alert('Health Check Failed'); }
                            }}
                            className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-50"
                        >
                            Check Health
                        </button>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-nexus-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-nexus-700 shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                        <Save size={20} /> {saving ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>

            </form>
        </div>
    );
};

export default AdminSettings;
