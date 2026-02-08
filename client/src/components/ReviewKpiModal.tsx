import React, { useState } from 'react';
import api from '../services/api';
import { X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ReviewKpiModalProps {
    isOpen: boolean;
    onClose: () => void;
    sheetId: string;
    employeeName: string;
    onSuccess: () => void;
}

const ReviewKpiModal = ({ isOpen, onClose, sheetId, employeeName, onSuccess }: ReviewKpiModalProps) => {
    if (!isOpen) return null;

    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState('');

    const handleReview = async (decision: 'APPROVE' | 'REJECT') => {
        if (decision === 'REJECT' && !feedback) {
            alert("Please provide feedback for rejection.");
            return;
        }

        setLoading(true);
        try {
            await api.post('/kpi/review', { sheetId, decision, feedback });
            onSuccess();
            onClose();
        } catch (error) {
            alert("Failed to review");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                <div className="bg-slate-800 p-6 text-white flex justify-between items-center">
                    <h2 className="text-xl font-bold">Review Performance</h2>
                    <button onClick={onClose}><X size={24} /></button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-slate-600">
                        You are reviewing <strong>{employeeName}</strong>'s performance sheet.
                    </p>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Feedback / Comments</label>
                        <textarea
                            className="w-full border rounded-lg p-3 text-sm h-32 focus:ring-2 focus:ring-nexus-500 outline-none"
                            placeholder="Provide feedback here (Required for rejection)..."
                            value={feedback}
                            onChange={e => setFeedback(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <button
                            onClick={() => handleReview('REJECT')}
                            disabled={loading}
                            className="flex items-center justify-center p-3 rounded-lg border-2 border-red-100 bg-red-50 text-red-700 font-bold hover:bg-red-100 transition-colors"
                        >
                            <XCircle className="mr-2" /> Reject & Reopen
                        </button>
                        <button
                            onClick={() => handleReview('APPROVE')}
                            disabled={loading}
                            className="flex items-center justify-center p-3 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-500/30"
                        >
                            <CheckCircle className="mr-2" /> Approve & Lock
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewKpiModal;
