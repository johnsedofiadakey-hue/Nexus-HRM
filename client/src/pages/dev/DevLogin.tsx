import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

const DevLogin = () => {
    const [key, setKey] = useState('');
    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app we might verify with backend first, but for now just saving to local storage 
        // to be used in headers.
        if (key) {
            localStorage.setItem('nexus_dev_key', key);
            navigate('/nexus-dev-portal/dashboard');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
                <div className="flex justify-center mb-6">
                    <div className="bg-red-500/10 p-4 rounded-full">
                        <ShieldAlert className="text-red-500 w-12 h-12" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-white text-center mb-2">Shadow Access</h1>
                <p className="text-slate-500 text-center mb-8 text-sm">Enter Master Control Key</p>

                <form onSubmit={handleLogin} className="space-y-4">
                    <input
                        type="password"
                        value={key}
                        onChange={e => setKey(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:border-red-500 focus:outline-none transition-colors font-mono"
                        placeholder="••••••••••••••••"
                        autoFocus
                    />
                    <button
                        type="submit"
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-all"
                    >
                        Authenticate
                    </button>
                </form>
            </div>
        </div>
    );
};

export default DevLogin;
