import React, { useEffect, useState } from 'react';
import api from '../services/api';

// Types
interface TeamAppraisal {
    id: string;
    status: string;
    finalScore: number | null;
    employee: { id: string; fullName: string; position: string };
    cycle: { name: string; endDate: string };
    ratings: Rating[];
}

interface Rating {
    id: string;
    competency: { id: string; name: string; description: string; weight: number };
    selfScore: number | null;
    managerScore: number | null;
    selfComment: string;
    managerComment?: string;
}

const ManagerAppraisals = () => {
    const [appraisals, setAppraisals] = useState<TeamAppraisal[]>([]);
    const [selectedAppraisal, setSelectedAppraisal] = useState<TeamAppraisal | null>(null);
    const [loading, setLoading] = useState(true);
    const [ratings, setRatings] = useState<{ [key: string]: { score: number; comment: string } }>({});

    useEffect(() => {
        fetchTeamAppraisals();
    }, []);

    const fetchTeamAppraisals = async () => {
        try {
            const res = await api.get('/appraisals/team');
            setAppraisals(res.data || []);
        } catch (error) {
            console.error(error);
            setAppraisals([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAppraisal = (appraisal: TeamAppraisal) => {
        setSelectedAppraisal(appraisal);

        // Pre-fill manager ratings if they exist
        const initialRatings: Record<string, { score: number; comment: string }> = {};
        appraisal.ratings.forEach((r: Rating) => {
            initialRatings[r.competency.id] = {
                score: r.managerScore || 0,
                comment: r.managerComment || ''
            };
        });
        setRatings(initialRatings);
    };

    const handleRatingChange = (competencyId: string, field: 'score' | 'comment', value: string) => {
        setRatings(prev => ({
            ...prev,
            [competencyId]: { ...prev[competencyId], [field]: value }
        }));
    };

    const handleSubmitReview = async () => {
        if (!selectedAppraisal) return;

        const payload = {
            appraisalId: selectedAppraisal.id,
            ratings: Object.keys(ratings).map(k => ({
                competencyId: k,
                score: Number(ratings[k].score),
                comment: ratings[k].comment
            }))
        };

        try {
            await api.post('/appraisals/manager-rating', payload);
            alert('Manager Review Submitted!');
            setSelectedAppraisal(null);
            fetchTeamAppraisals();
        } catch (error) {
            console.error(error);
            alert('Error submitting review');
        }
    };

    if (loading) return <div className="p-6">Loading team appraisals...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Team Appraisals</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Team Appraisals List */}
                <div className="lg:col-span-1 space-y-3">
                    <h2 className="text-sm font-semibold text-slate-600 uppercase mb-3">Pending Reviews</h2>

                    {appraisals.length === 0 ? (
                        <div className="bg-white p-4 rounded-lg border border-slate-200">
                            <p className="text-slate-500 text-sm">No pending appraisals</p>
                        </div>
                    ) : (
                        appraisals.map((appraisal) => (
                            <button
                                key={appraisal.id}
                                onClick={() => handleSelectAppraisal(appraisal)}
                                className={`w-full text-left bg-white p-4 rounded-lg border transition ${selectedAppraisal?.id === appraisal.id
                                    ? 'border-nexus-blue shadow-md'
                                    : 'border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-slate-800">{appraisal.employee.fullName}</h3>
                                    <span className={`text-xs px-2 py-1 rounded-full ${appraisal.status === 'PENDING_MANAGER'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-green-100 text-green-800'
                                        }`}>
                                        {appraisal.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500">{appraisal.employee.position}</p>
                                <p className="text-xs text-slate-400 mt-1">{appraisal.cycle.name}</p>
                            </button>
                        ))
                    )}
                </div>

                {/* Review Form */}
                <div className="lg:col-span-2">
                    {!selectedAppraisal ? (
                        <div className="bg-white p-8 rounded-lg border border-slate-200 text-center">
                            <p className="text-slate-500">← Select an appraisal to review</p>
                        </div>
                    ) : (
                        <div className="bg-white p-6 rounded-lg border border-slate-200">
                            <div className="mb-6">
                                <h2 className="text-xl font-bold text-slate-800">
                                    Review: {selectedAppraisal.employee.fullName}
                                </h2>
                                <p className="text-sm text-slate-500">
                                    {selectedAppraisal.cycle.name} • {selectedAppraisal.employee.position}
                                </p>
                            </div>

                            <div className="space-y-6">
                                {selectedAppraisal.ratings.map((rating) => (
                                    <div key={rating.id} className="border-b border-slate-100 pb-6 last:border-b-0">
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className="text-base font-semibold text-slate-800">
                                                    {rating.competency.name}
                                                </h3>
                                                <span className="text-xs text-slate-400">
                                                    Weight: {rating.competency.weight}x
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-500">
                                                {rating.competency.description}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Employee Self-Rating (Read-only) */}
                                            <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                                                <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">
                                                    Employee Rating
                                                </label>
                                                <div className="text-slate-700">
                                                    <div className="font-bold text-2xl text-blue-600">
                                                        {rating.selfScore ?? '-'}/5
                                                    </div>
                                                    <p className="text-sm mt-2">{rating.selfComment}</p>
                                                </div>
                                            </div>

                                            {/* Manager Rating (Editable) */}
                                            <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                                                <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">
                                                    Your Rating
                                                </label>
                                                {selectedAppraisal.status === 'COMPLETED' ? (
                                                    <div className="text-slate-700">
                                                        <div className="font-bold text-2xl text-green-600">
                                                            {rating.managerScore}/5
                                                        </div>
                                                        <p className="text-sm mt-2">{rating.managerComment}</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="5"
                                                            step="0.5"
                                                            className="w-full p-2 border rounded mb-2 text-lg font-semibold"
                                                            value={ratings[rating.competency.id]?.score || 0}
                                                            onChange={(e) => handleRatingChange(
                                                                rating.competency.id,
                                                                'score',
                                                                e.target.value
                                                            )}
                                                        />
                                                        <textarea
                                                            className="w-full p-2 border rounded text-sm h-20"
                                                            placeholder="Add your feedback..."
                                                            value={ratings[rating.competency.id]?.comment || ''}
                                                            onChange={(e) => handleRatingChange(
                                                                rating.competency.id,
                                                                'comment',
                                                                e.target.value
                                                            )}
                                                        />
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {selectedAppraisal.status !== 'COMPLETED' && (
                                <div className="mt-8 flex justify-end space-x-3">
                                    <button
                                        onClick={() => setSelectedAppraisal(null)}
                                        className="px-6 py-3 rounded-lg font-semibold text-slate-600 hover:bg-slate-100 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubmitReview}
                                        className="bg-nexus-blue text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                                    >
                                        Submit Manager Review
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManagerAppraisals;
