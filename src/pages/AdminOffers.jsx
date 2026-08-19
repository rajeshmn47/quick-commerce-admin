import React, { useState, useEffect } from 'react';
import api from '../api/client';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AdminOffers() {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingOffer, setEditingOffer] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        startTime: '',
        endTime: '',
        daysOfWeek: [], // array of numbers 0-6
        condition: '',
        incentives: [{ earnings: '', incentive: '' }],
        isActive: true,
        startDate: '',
        endDate: '',
    });

    useEffect(() => {
        fetchOffers();
    }, []);

    const fetchOffers = async () => {
        try {
            const res = await api.get('/offers');
            setOffers(res.data.data || []);
        } catch (err) {
            alert('Failed to load offers');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleDayToggle = (dayIndex) => {
        setFormData(prev => {
            const days = prev.daysOfWeek || [];
            if (days.includes(dayIndex)) {
                return { ...prev, daysOfWeek: days.filter(d => d !== dayIndex) };
            } else {
                return { ...prev, daysOfWeek: [...days, dayIndex].sort() };
            }
        });
    };

    const handleIncentiveChange = (index, field, value) => {
        const updated = [...formData.incentives];
        updated[index][field] = value;
        setFormData(prev => ({ ...prev, incentives: updated }));
    };

    const addIncentiveTier = () => {
        setFormData(prev => ({
            ...prev,
            incentives: [...prev.incentives, { earnings: '', incentive: '' }]
        }));
    };

    const removeIncentiveTier = (index) => {
        const updated = formData.incentives.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, incentives: updated }));
    };

    const resetForm = () => {
        setFormData({
            name: '',
            startTime: '',
            endTime: '',
            daysOfWeek: [],
            condition: '',
            incentives: [{ earnings: '', incentive: '' }],
            isActive: true,
            startDate: '',
            endDate: '',
        });
        setEditingOffer(null);
    };

    const openCreateModal = () => {
        resetForm();
        setShowModal(true);
    };

    const openEditModal = (offer) => {
        setEditingOffer(offer);
        setFormData({
            name: offer.name,
            startTime: offer.startTime || '',
            endTime: offer.endTime || '',
            daysOfWeek: offer.daysOfWeek || [],
            condition: offer.condition || '',
            incentives: offer.incentives.map(t => ({ earnings: t.earnings, incentive: t.incentive })),
            isActive: offer.isActive,
            startDate: offer.startDate ? offer.startDate.split('T')[0] : '',
            endDate: offer.endDate ? offer.endDate.split('T')[0] : '',
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                incentives: formData.incentives.map(t => ({
                    earnings: Number(t.earnings),
                    incentive: Number(t.incentive)
                })),
                daysOfWeek: formData.daysOfWeek || [],
            };
            if (editingOffer) {
                await api.put(`/offers/${editingOffer._id}`, payload);
            } else {
                await api.post('/offers', payload);
            }
            setShowModal(false);
            fetchOffers();
            resetForm();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to save offer');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this offer?')) return;
        try {
            await api.delete(`/offers/${id}`);
            fetchOffers();
        } catch (err) {
            alert('Failed to delete');
        }
    };

    if (loading) return <div className="text-center py-8">Loading offers...</div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">🎯 Rider Offers</h1>
                <button
                    onClick={openCreateModal}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                    + Add Offer
                </button>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condition</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Incentives</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {offers.map(offer => (
                            <tr key={offer._id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium">{offer.name}</td>
                                <td className="px-6 py-4 text-sm">
                                    {offer.startTime} – {offer.endTime}
                                </td>
                                <td className="px-6 py-4 text-sm">
                                    {offer.daysOfWeek?.map(d => DAYS[d]).join(', ') || 'All'}
                                </td>
                                <td className="px-6 py-4 text-sm">{offer.condition}</td>
                                <td className="px-6 py-4 text-sm">
                                    {offer.incentives.map((t, i) => (
                                        <div key={i}>₹{t.earnings} → +₹{t.incentive}</div>
                                    ))}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs rounded-full ${offer.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                                        {offer.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 space-x-2">
                                    <button onClick={() => openEditModal(offer)} className="text-blue-600 hover:text-blue-800">✏️ Edit</button>
                                    <button onClick={() => handleDelete(offer._id)} className="text-red-600 hover:text-red-800">🗑️ Delete</button>
                                </td>
                            </tr>
                        ))}
                        {offers.length === 0 && (
                            <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">No offers yet</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold mb-4">{editingOffer ? 'Edit Offer' : 'Create Offer'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Name *</label>
                                <input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full border rounded-lg px-4 py-2"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Start Time *</label>
                                    <input
                                        type="time"
                                        name="startTime"
                                        value={formData.startTime}
                                        onChange={handleInputChange}
                                        className="w-full border rounded-lg px-4 py-2"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">End Time *</label>
                                    <input
                                        type="time"
                                        name="endTime"
                                        value={formData.endTime}
                                        onChange={handleInputChange}
                                        className="w-full border rounded-lg px-4 py-2"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Days of Week</label>
                                <div className="flex flex-wrap gap-3">
                                    {DAYS.map((day, idx) => (
                                        <label key={idx} className="flex items-center gap-1">
                                            <input
                                                type="checkbox"
                                                checked={formData.daysOfWeek?.includes(idx) || false}
                                                onChange={() => handleDayToggle(idx)}
                                            />
                                            {day}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Condition</label>
                                <input
                                    name="condition"
                                    value={formData.condition}
                                    onChange={handleInputChange}
                                    className="w-full border rounded-lg px-4 py-2"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Incentive Tiers</label>
                                {formData.incentives.map((tier, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2 items-center">
                                        <input
                                            type="number"
                                            placeholder="Earnings"
                                            value={tier.earnings}
                                            onChange={(e) => handleIncentiveChange(idx, 'earnings', e.target.value)}
                                            className="flex-1 border rounded-lg px-4 py-2"
                                            required
                                        />
                                        <input
                                            type="number"
                                            placeholder="Incentive"
                                            value={tier.incentive}
                                            onChange={(e) => handleIncentiveChange(idx, 'incentive', e.target.value)}
                                            className="flex-1 border rounded-lg px-4 py-2"
                                            required
                                        />
                                        <button type="button" onClick={() => removeIncentiveTier(idx)} className="text-red-600">✕</button>
                                    </div>
                                ))}
                                <button type="button" onClick={addIncentiveTier} className="text-blue-600 text-sm">+ Add Tier</button>
                            </div>

                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        name="isActive"
                                        checked={formData.isActive}
                                        onChange={handleInputChange}
                                    />
                                    Active
                                </label>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Start Date (optional)</label>
                                    <input
                                        type="date"
                                        name="startDate"
                                        value={formData.startDate}
                                        onChange={handleInputChange}
                                        className="w-full border rounded-lg px-4 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">End Date (optional)</label>
                                    <input
                                        type="date"
                                        name="endDate"
                                        value={formData.endDate}
                                        onChange={handleInputChange}
                                        className="w-full border rounded-lg px-4 py-2"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t">
                                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                                    {editingOffer ? 'Update' : 'Create'}
                                </button>
                                <button type="button" onClick={() => setShowModal(false)} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}