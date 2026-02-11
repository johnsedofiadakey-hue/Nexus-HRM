import React, { useEffect, useState } from 'react';

interface Appraisal {
    id: string;
    status: string;
    finalScore: number | null;
    reviewer: { fullName: string };
    cycle: { name: string; endDate: string };
    ratings: Rating[];
}

interface Rating {
    id: string;
    competency: { id: string; name: string; description: string };
    selfScore: number | null;
    managerScore: number | null;
    selfComment: string;
    managerComment?: string;
}

const Appraisals = () => {
    const [appraisal, setAppraisal] = useState<Appraisal | null>(null);
    const [loading, setLoading] = useState(true);
    const [ratings, setRatings] = useState<{ [key: string]: { score: number; comment: string } }>({});

    useEffect(() => {
        fetchMyAppraisal();
    }, []);

    const fetchMyAppraisal = async () => {
        try {
            const token = localStorage.getItem('nexus_token');
            const res = await fetch('http://localhost:5000/api/appraisals/my-latest', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAppraisal(data);
                const initialRatings: { [key: string]: { score: number; comment: string } } = {};
                data.ratings.forEach((r: Rating) => {
                    initialRatings[r.competency.id] = { score: r.selfScore || 0, comment: r.selfComment || '' };
                });
                setRatings(initialRatings);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleRatingChange = (competencyId: string, field: 'score' | 'comment', value: string) => {
        setRatings(prev => ({
            ...prev,
            [competencyId]: { ...prev[competencyId], [field]: value }
        }));
    };

    const handleSubmit = async () => {
        if (!appraisal) return;

        const payload = {
            appraisalId: appraisal.id,
            ratings: Object.keys(ratings).map(key => ({
                competencyId: key,
                score: Number(ratings[key].score),
                comment: ratings[key].comment
            }))
        };

        try {
            const token = localStorage.getItem('nexus_token');
            const res = await fetch('http://localhost:5000/api/appraisals/self-rating', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert('Self Review Submitted!');
                fetchMyAppraisal();
            } else {
                alert('Failed to submit');
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) {
        return <div className="p-12 text-center text-xl text-nexus-600 animate-pulse">Loading Appraisal...</div>;
    }

    if (!appraisal) {
        return (
            <div className="max-w-3xl mx-auto animate-in fade-in duration-500 space-y-10">
                <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 p-8 shadow-xl mb-8">
                    <h1 className="text-3xl font-extrabold text-white mb-1 drop-shadow">My Performance Appraisal</h1>
                    <p className="text-white/80 text-lg">No active appraisal cycle found for you.</p>
                </div>
            </div>
        );
    }

    const isLocked = appraisal.status !== 'PENDING_SELF';

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Performance Appraisal</h1>
                    <p className="text-slate-500">{appraisal.cycle.name} - Reviewer: {appraisal.reviewer?.fullName}</p>
                </div>
                <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${appraisal.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                        }`}
                >
                    {appraisal.status.replace('_', ' ')}
                </div>
            </div>

            <div className="space-y-6">
                {appraisal.ratings.map((rating) => (
                    <div key={rating.id} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-slate-800">{rating.competency.name}</h3>
                            <p className="text-sm text-slate-500">{rating.competency.description}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-slate-50 p-4 rounded-md border border-slate-100">
                                <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">My Rating (0-5)</label>
                                {isLocked ? (
                                    <div className="text-slate-700">
                                        <div className="font-bold text-lg">{rating.selfScore}/5</div>
                                        <p className="text-sm mt-1">{rating.selfComment}</p>
                                    </div>
                                ) : (
                                    <>
                                        <input
                                            type="number"
                                            min={0}
                                            max={5}
                                            value={ratings[rating.competency.id]?.score ?? ''}
                                            onChange={e => handleRatingChange(rating.competency.id, 'score', e.target.value)}
                                            className="w-full p-2 border rounded mb-2"
                                        />
                                        <textarea
                                            value={ratings[rating.competency.id]?.comment ?? ''}
                                            onChange={e => handleRatingChange(rating.competency.id, 'comment', e.target.value)}
                                            className="w-full p-2 border rounded text-sm h-20"
                                            placeholder="Comment"
                                        />
                                    </>
                                )}
                            </div>

                            <div className="bg-slate-50 p-4 rounded-md border border-slate-100">
                                <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Manager Rating</label>
                                {rating.managerScore !== null ? (
                                    <div className="text-slate-700">
                                        <div className="font-bold text-lg">{rating.managerScore}/5</div>
                                        <p className="text-sm mt-1">{rating.managerComment}</p>
                                    </div>
                                ) : (
                                    <span className="text-sm italic text-slate-500">Pending Review</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {!isLocked && (
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleSubmit}
                        className="px-6 py-2 bg-nexus-600 text-white rounded-lg font-bold hover:bg-nexus-700 shadow-lg"
                    >
                        Submit Self Review
                    </button>
                </div>
            )}
        </div>
    );
};

export default Appraisals;
