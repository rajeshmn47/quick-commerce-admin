import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

function Store() {
    // ----- STATE -----
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [riderCounts, setRiderCounts] = useState({}); // storeId -> count
    const [showModal, setShowModal] = useState(false);
    const [editingStore, setEditingStore] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        latitude: '',
        longitude: '',
        operating_hours: '9:00 AM - 11:00 PM',
        description: '',
        isActive: true,
    });
    const [saving, setSaving] = useState(false);
    const [mapLink, setMapLink] = useState('');

    // ----- SORT & FILTER STATE -----
    const [sortField, setSortField] = useState('completedOrders');
    const [sortOrder, setSortOrder] = useState('desc');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
    const [orderStatusFilter, setOrderStatusFilter] = useState(''); // order status filter

    // ----- FETCH STORES & RIDER COUNTS -----
    const fetchStores = async () => {
        try {
            const res = await api.get('/stores/all_stores');
            setStores(res.data || []);
        } catch (err) {
            console.error(err);
            alert('Failed to load stores');
        } finally {
            setLoading(false);
        }
    };

    const fetchRiderCounts = async () => {
        try {
            // Fetch all riders (only need their currentStoreId)
            const res = await api.get('/riders'); // adjust endpoint if needed
            const riders = res.data.data || [];
            const counts = {};
            riders.forEach(rider => {
                const storeId = rider.currentStoreId?._id || rider.currentStoreId;
                if (storeId) {
                    counts[storeId] = (counts[storeId] || 0) + 1;
                }
            });
            setRiderCounts(counts);
        } catch (err) {
            console.error('Failed to fetch rider counts:', err);
            // Silently fail – riders column will show 0
        }
    };

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            await fetchStores();
            await fetchRiderCounts();
            setLoading(false);
        };
        fetchAll();
    }, []);

    // ----- SORT & FILTER LOGIC -----
    const getFilteredAndSortedStores = () => {
        let result = [...stores];

        // 1️⃣ Filter by store active status
        if (statusFilter === 'active') {
            result = result.filter(store => store.isActive === true);
        } else if (statusFilter === 'inactive') {
            result = result.filter(store => store.isActive === false);
        }

        // 2️⃣ Filter by order status (stores with at least 1 order in that status)
        if (orderStatusFilter && orderStatusFilter !== '') {
            result = result.filter(store => 
                (store.orderCounts?.[orderStatusFilter] || 0) > 0
            );
        }

        // 3️⃣ Sort
        result.sort((a, b) => {
            let valA, valB;

            switch (sortField) {
                case 'name':
                    valA = a.name || '';
                    valB = b.name || '';
                    break;
                case 'completedOrders':
                    valA = a.completedOrders || 0;
                    valB = b.completedOrders || 0;
                    break;
                case 'pendingOrders':
                    const pendingA = (a.orderCounts?.pending || 0) +
                        (a.orderCounts?.accepted || 0) +
                        (a.orderCounts?.picking || 0) +
                        (a.orderCounts?.dispatched || 0);
                    const pendingB = (b.orderCounts?.pending || 0) +
                        (b.orderCounts?.accepted || 0) +
                        (b.orderCounts?.picking || 0) +
                        (b.orderCounts?.dispatched || 0);
                    valA = pendingA;
                    valB = pendingB;
                    break;
                case 'riders':
                    valA = riderCounts[a._id] || 0;
                    valB = riderCounts[b._id] || 0;
                    break;
                default:
                    valA = a[sortField] ?? 0;
                    valB = b[sortField] ?? 0;
            }

            if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    };

    const sortedStores = getFilteredAndSortedStores();

    // ----- HANDLE SORT CLICK -----
    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    // ----- EXTRACT COORDINATES (unchanged) -----
    const extractCoordinates = (url) => {
        try {
            const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (match) {
                const lat = parseFloat(match[1]);
                const lng = parseFloat(match[2]);
                if (!isNaN(lat) && !isNaN(lng)) {
                    setFormData({
                        ...formData,
                        latitude: lat,
                        longitude: lng,
                    });
                    alert('✅ Coordinates extracted!');
                    setMapLink('');
                    return;
                }
            }
            const llMatch = url.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (llMatch) {
                const lat = parseFloat(llMatch[1]);
                const lng = parseFloat(llMatch[2]);
                if (!isNaN(lat) && !isNaN(lng)) {
                    setFormData({
                        ...formData,
                        latitude: lat,
                        longitude: lng,
                    });
                    alert('✅ Coordinates extracted!');
                    setMapLink('');
                    return;
                }
            }
            alert('❌ Could not extract coordinates. Please paste a valid Google Maps URL.');
        } catch (err) {
            alert('❌ Invalid URL.');
        }
    };

    // ----- OPEN MODAL (Create or Edit) -----
    const openModal = (store = null) => {
        if (store) {
            setEditingStore(store);
            setFormData({
                name: store.name,
                address: store.address,
                latitude: store.location?.coordinates?.[1] || store.latitude || '',
                longitude: store.location?.coordinates?.[0] || store.longitude || '',
                operating_hours: store.operating_hours || '9:00 AM - 11:00 PM',
                description: store.description || '',
                isActive: store.isActive !== undefined ? store.isActive : true,
            });
        } else {
            setEditingStore(null);
            setFormData({
                name: '',
                address: '',
                latitude: '',
                longitude: '',
                operating_hours: '9:00 AM - 11:00 PM',
                description: '',
                isActive: true,
            });
        }
        setMapLink('');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingStore(null);
        setMapLink('');
    };

    // ----- FORM HANDLERS -----
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        const payload = {
            name: formData.name,
            address: formData.address,
            location: {
                type: "Point",
                coordinates: [
                    parseFloat(formData.longitude),
                    parseFloat(formData.latitude)
                ]
            },
            operating_hours: formData.operating_hours,
            description: formData.description,
            isActive: formData.isActive,
        };

        try {
            if (editingStore) {
                await api.put(`/stores/stores/${editingStore._id}`, payload);
                alert('✅ Store updated!');
            } else {
                await api.post('/stores/stores', payload);
                alert('✅ Store created!');
            }
            closeModal();
            fetchStores();
        } catch (err) {
            alert(err.response?.data?.error || '❌ Something went wrong');
        } finally {
            setSaving(false);
        }
    };

    const deleteStore = async (id) => {
        if (!window.confirm('Delete this store?')) return;
        try {
            await api.delete(`/stores/${id}`);
            fetchStores();
        } catch (err) {
            alert('Failed to delete');
        }
    };

    // ----- RENDER -----
    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-lg text-gray-600">Loading stores...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* HEADER */}
                <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                    <h1 className="text-3xl font-bold text-gray-800">🏪 Dark Stores</h1>
                    <div className="flex flex-wrap gap-2">
                        {/* Store status filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="all">All Stores</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>

                        {/* Order status filter */}
                        <select
                            value={orderStatusFilter}
                            onChange={(e) => setOrderStatusFilter(e.target.value)}
                            className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">All Orders</option>
                            <option value="pending">Pending</option>
                            <option value="accepted">Accepted</option>
                            <option value="picking">Picking</option>
                            <option value="dispatched">Dispatched</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                        </select>

                        <button
                            onClick={() => openModal()}
                            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm transition"
                        >
                            + Add New Store
                        </button>
                    </div>
                </div>

                {/* TABLE */}
                <div className="bg-white rounded-xl shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700" onClick={() => handleSort('name')}>
                                    Store {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700" onClick={() => handleSort('completedOrders')}>
                                    Completed {sortField === 'completedOrders' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700" onClick={() => handleSort('pendingOrders')}>
                                    Active Orders {sortField === 'pendingOrders' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </th>
                                {/* NEW: Riders column */}
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700" onClick={() => handleSort('riders')}>
                                    Riders {sortField === 'riders' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {sortedStores.map((store) => {
                                const pending = (store.orderCounts?.pending || 0);
                                const accepted = (store.orderCounts?.accepted || 0);
                                const picking = (store.orderCounts?.picking || 0);
                                const dispatched = (store.orderCounts?.dispatched || 0);
                                const totalActive = pending + accepted + picking + dispatched;

                                let activeBadge = '';
                                if (totalActive > 5) activeBadge = '🔴 High';
                                else if (totalActive > 2) activeBadge = '🟡 Medium';
                                else if (totalActive > 0) activeBadge = '🟢 Low';
                                else activeBadge = '✅ None';

                                const statusBreakdown = [];
                                if (pending > 0) statusBreakdown.push(`Pending: ${pending}`);
                                if (accepted > 0) statusBreakdown.push(`Accepted: ${accepted}`);
                                if (picking > 0) statusBreakdown.push(`Picking: ${picking}`);
                                if (dispatched > 0) statusBreakdown.push(`Dispatched: ${dispatched}`);

                                return (
                                    <tr key={store._id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            <Link to={`/store/${store._id}`} className="hover:text-blue-600 hover:underline">
                                                {store.name}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{store.address}</td>
                                        <td className="px-6 py-4 font-medium text-gray-800">{store.completedOrders || 0}</td>
                                        <td className="px-6 py-4">
                                            <span className={`font-medium ${totalActive > 5 ? 'text-red-600' : totalActive > 2 ? 'text-yellow-600' : 'text-green-600'}`}>
                                                {totalActive} {activeBadge}
                                            </span>
                                            {statusBreakdown.length > 0 && (
                                                <div className="text-xs text-gray-400">
                                                    {statusBreakdown.join(' · ')}
                                                </div>
                                            )}
                                        </td>
                                        {/* NEW: Riders cell */}
                                        <td className="px-6 py-4 text-center">
                                            <span className="font-medium text-blue-600">
                                                {riderCounts[store._id] || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${store.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {store.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-3">
                                                <Link to={`/store/${store._id}`} className="text-green-600 hover:text-green-800 font-medium text-sm">
                                                    👁️ View
                                                </Link>
                                                <button onClick={() => openModal(store)} className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                                                    ✏️ Edit
                                                </button>
                                                <button onClick={() => deleteStore(store._id)} className="text-red-600 hover:text-red-800 font-medium text-sm">
                                                    🗑️ Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {sortedStores.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            <p className="text-lg">No stores found</p>
                            <button onClick={() => openModal()} className="text-blue-600 hover:underline mt-2">
                                Create your first store
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ----- MODAL (Popup for Create/Edit) – unchanged ----- */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">
                            {editingStore ? '✏️ Edit Store' : '➕ Create New Store'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Store Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    placeholder="e.g. Koramangala Dark Store"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    required
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    placeholder="e.g. 123, 1st Main, Koramangala"
                                />
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <label className="block text-sm font-medium text-blue-700 mb-1">
                                    📍 Paste Google Maps Link to Auto-Fill Coordinates
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={mapLink}
                                        onChange={(e) => setMapLink(e.target.value)}
                                        className="flex-1 border border-blue-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder="Paste Google Maps URL here..."
                                    />
                                    <button
                                        type="button"
                                        onClick={() => extractCoordinates(mapLink)}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 whitespace-nowrap transition"
                                    >
                                        Get Location
                                    </button>
                                </div>
                                <p className="text-xs text-blue-600 mt-1">
                                    💡 Go to Google Maps, right-click anywhere → "What's here?" → copy URL
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Latitude *</label>
                                    <input
                                        type="number"
                                        step="any"
                                        name="latitude"
                                        value={formData.latitude}
                                        onChange={handleChange}
                                        required
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                                        placeholder="12.9352"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Longitude *</label>
                                    <input
                                        type="number"
                                        step="any"
                                        name="longitude"
                                        value={formData.longitude}
                                        onChange={handleChange}
                                        required
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                                        placeholder="77.6245"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Operating Hours</label>
                                <input
                                    type="text"
                                    name="operating_hours"
                                    value={formData.operating_hours}
                                    onChange={handleChange}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    placeholder="9:00 AM - 11:00 PM"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows="2"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    placeholder="Store description (optional)"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    name="isActive"
                                    checked={formData.isActive}
                                    onChange={handleChange}
                                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                                    Store is Active
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition"
                                >
                                    {saving ? 'Saving...' : editingStore ? 'Update Store' : 'Create Store'}
                                </button>
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
                                >
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

export default Store;