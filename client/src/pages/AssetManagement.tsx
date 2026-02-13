import React, { useState, useEffect } from 'react';
import { Laptop, Plus, Search, User } from 'lucide-react';
import api from '../services/api';

interface Asset {
    id: string;
    name?: string;
    description?: string;
    isCompanyProperty: boolean;
    serialNumber: string;
    type: string;
    make: string;
    model: string;
    status: string;
    assignments: { user: { fullName: string } }[];
}

const AssetManagement = () => {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        isCompanyProperty: true,
        serialNumber: '',
        type: 'LAPTOP',
        make: '',
        model: '',
        purchaseDate: '',
        warrantyExpiry: ''
    });

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        try {
            const res = await api.get('/assets');
            setAssets(res.data || []);
        } catch (error) {
            console.error("Error fetching assets", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/assets', formData);
            alert("✅ Asset Added Successfully");
            setShowModal(false);
            setFormData({
                name: '',
                description: '',
                isCompanyProperty: true,
                serialNumber: '',
                type: 'LAPTOP',
                make: '',
                model: '',
                purchaseDate: '',
                warrantyExpiry: ''
            });
            fetchAssets();
        } catch (error) {
            console.error(error);
            alert("❌ Failed to add asset");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'AVAILABLE': return 'bg-green-100 text-green-800';
            case 'ASSIGNED': return 'bg-blue-100 text-blue-800';
            case 'MAINTENANCE': return 'bg-orange-100 text-orange-800';
            case 'RETIRED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const filteredAssets = assets.filter(a =>
        a.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.assignments[0]?.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.name && a.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );


    return (
        <div className="max-w-6xl mx-auto animate-in fade-in duration-500 space-y-10">
            {/* Gradient Header */}
            <div className="rounded-2xl bg-brand-gradient p-8 shadow-xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-white flex items-center gap-2 mb-1 drop-shadow">
                        <Laptop className="text-white/80" size={32} />
                        Asset Management
                    </h1>
                    <p className="text-white/80 text-lg">Track and assign company assets</p>
                </div>
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-6 py-3 bg-brand-gradient text-white rounded-lg font-bold shadow-lg hover:scale-105 transition-transform text-lg">
                    <Plus size={20} /> Add Asset
                </button>
            </div>
            {/* Animated Card for Search */}
            <div className="bg-brand-surface rounded-2xl shadow-xl p-8 border-0">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
                    <input
                        type="text"
                        placeholder="Search by name, serial number, model, or assignee..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border rounded-lg text-lg shadow-sm focus:ring-2 focus:ring-nexus-500"
                    />
                </div>
            </div>
            {/* Animated Card for Table */}
            <div className="bg-white rounded-2xl shadow-xl border-0 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-brand-surface border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase">Asset Name/Details</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase">Serial No.</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase">Type</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase">Assigned To</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {filteredAssets.map(asset => (
                            <tr key={asset.id} className="hover:bg-nexus-50 transition-colors animate-in fade-in zoom-in">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-800 text-lg">{asset.name || `${asset.make} ${asset.model}`}</div>
                                    <div className="text-xs text-slate-500">{asset.description || `${asset.make} ${asset.model}`}</div>
                                    {asset.isCompanyProperty && <span className="text-[10px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded border border-slate-200 ml-1">Company Property</span>}
                                </td>
                                <td className="px-6 py-4 text-sm font-mono text-slate-600">{asset.serialNumber}</td>
                                <td className="px-6 py-4 text-xs font-bold text-slate-500">{asset.type}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusBadge(asset.status)}`}> 
                                        {asset.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-700">
                                    {asset.assignments.length > 0 ? (
                                        <div className="flex items-center gap-2">
                                            <User size={14} className="text-nexus-500" />
                                            {asset.assignments[0].user.fullName}
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 italic">Unassigned</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {/* Action Buttons Placeholder */}
                                    <button className="text-nexus-600 font-bold text-sm hover:underline">Manage</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredAssets.length === 0 && !loading && (
                    <div className="text-center py-12 text-slate-400">No assets found.</div>
                )}
            </div>

            {/* Add Asset Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-bold">Add New Asset</h2>
                        </div>
                        <form onSubmit={handleCreateAsset} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">Asset Name</label>
                                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border rounded p-2" placeholder="e.g. Designer MacBook" />
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-1">Description</label>
                                <textarea rows={2} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full border rounded p-2" placeholder="Detailed specs..." />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1">Make</label>
                                    <input type="text" required value={formData.make} onChange={e => setFormData({ ...formData, make: e.target.value })} className="w-full border rounded p-2" placeholder="Dell" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">Model</label>
                                    <input type="text" required value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} className="w-full border rounded p-2" placeholder="XPS 15" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Serial Number</label>
                                <input type="text" required value={formData.serialNumber} onChange={e => setFormData({ ...formData, serialNumber: e.target.value })} className="w-full border rounded p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Type</label>
                                <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full border rounded p-2">
                                    <option value="LAPTOP">Laptop</option>
                                    <option value="PHONE">Phone</option>
                                    <option value="VEHICLE">Vehicle</option>
                                    <option value="PERIPHERAL">Peripheral</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="coProp"
                                    checked={formData.isCompanyProperty}
                                    onChange={e => setFormData({ ...formData, isCompanyProperty: e.target.checked })}
                                    className="w-4 h-4 text-nexus-600 rounded"
                                />
                                <label htmlFor="coProp" className="text-sm text-slate-700">Is Company Property?</label>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1">Purchase Date</label>
                                    <input type="date" value={formData.purchaseDate} onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })} className="w-full border rounded p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">Warranty Expiry</label>
                                    <input type="date" value={formData.warrantyExpiry} onChange={e => setFormData({ ...formData, warrantyExpiry: e.target.value })} className="w-full border rounded p-2" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-nexus-600 text-white rounded font-bold">Save Asset</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssetManagement;
