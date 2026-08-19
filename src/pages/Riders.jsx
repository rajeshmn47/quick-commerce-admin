import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

function Riders() {
    const [riders, setRiders] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // ─── SORTING STATE ───
    const [sortField, setSortField] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');

    // ─── MODAL STATE ───
    const [selectedRider, setSelectedRider] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // ─── NEW FILTER STATES ───
    const [cityFilter, setCityFilter] = useState('');
    const [storeFilter, setStoreFilter] = useState('');

    // ─── FETCH DATA ───
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [ridersRes, ordersRes] = await Promise.all([
                    api.get('/riders'),
                    api.get('/orders?status=delivered&limit=1000')
                ]);
                setRiders(ridersRes.data.data || []);
                setOrders(ordersRes.data.data || []);
            } catch (err) {
                alert('Failed to load data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // ─── COMPUTE RIDER STATS ───
    const getRiderStats = (riderId) => {
        const riderOrders = orders.filter(o => 
            o.riderId?._id === riderId && 
            o.status === 'delivered' && 
            o.timeTaken !== null && 
            o.timeTaken >= 0
        );
        const totalDeliveries = riderOrders.length;
        const avgTime = totalDeliveries > 0 
            ? riderOrders.reduce((acc, o) => acc + o.timeTaken, 0) / totalDeliveries
            : null;
        return { totalDeliveries, avgTime };
    };

    // ─── COMPUTE STATS (all riders) ───
    const total = riders.length;
    const available = riders.filter(r => r.isAvailable === true).length;
    const busy = riders.filter(r => r.isAvailable === false && (r.activeOrdersCount || 0) > 0).length;
    const offline = riders.filter(r => r.isAvailable === false && (r.activeOrdersCount || 0) === 0).length;

    // ─── COMPUTE CITY & STORE OPTIONS ───
    const cities = [...new Set(
        riders
            .map(r => r.currentStoreId?.city)
            .filter(Boolean)
    )].sort();

    // Stores filtered by selected city (if any)
    const storeOptions = riders
        .filter(r => !cityFilter || r.currentStoreId?.city === cityFilter)
        .reduce((acc, r) => {
            const store = r.currentStoreId;
            if (store && store._id) {
                const existing = acc.find(s => s._id === store._id);
                if (!existing) acc.push({ _id: store._id, name: store.name });
            }
            return acc;
        }, [])
        .sort((a, b) => a.name.localeCompare(b.name));

    // Reset store filter when city changes
    useEffect(() => {
        setStoreFilter('');
    }, [cityFilter]);

    // ─── SEARCH FILTER ───
    const searchFiltered = riders.filter(r =>
        r.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.phone?.includes(search) ||
        r.email?.toLowerCase().includes(search.toLowerCase())
    );

    // ─── APPLY CITY & STORE FILTERS ───
    const filteredRiders = searchFiltered.filter(r => {
        if (cityFilter && r.currentStoreId?.city !== cityFilter) return false;
        if (storeFilter && r.currentStoreId?._id !== storeFilter) return false;
        return true;
    });

    // ─── SORTING ───
    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const getSortIcon = (field) => {
        if (sortField !== field) return ' ⇅';
        return sortOrder === 'asc' ? ' ↑' : ' ↓';
    };

    const sortedRiders = [...filteredRiders].sort((a, b) => {
        let valA, valB;

        switch (sortField) {
            case 'name':
                valA = a.name || '';
                valB = b.name || '';
                break;
            case 'phone':
                valA = a.phone || '';
                valB = b.phone || '';
                break;
            case 'store':
                valA = a.currentStoreId?.name || '';
                valB = b.currentStoreId?.name || '';
                break;
            case 'status':
                const getStatusWeight = (r) => {
                    if (r.isAvailable) return 1;
                    if ((r.activeOrdersCount || 0) > 0) return 2;
                    return 3;
                };
                valA = getStatusWeight(a);
                valB = getStatusWeight(b);
                break;
            case 'deliveries':
                valA = a.totalDeliveries || 0;
                valB = b.totalDeliveries || 0;
                break;
            case 'earnings':
                valA = a.totalEarnings || 0;
                valB = b.totalEarnings || 0;
                break;
            case 'avgTime':
                const statsA = getRiderStats(a._id);
                const statsB = getRiderStats(b._id);
                valA = statsA.avgTime ?? Infinity;
                valB = statsB.avgTime ?? Infinity;
                break;
            default:
                return 0;
        }

        if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    // ─── MODAL HANDLERS ───
    const openModal = (rider) => {
        setSelectedRider(rider);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedRider(null);
    };

    if (loading) return <div className="text-center py-8">Loading riders...</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">🏍️ Riders Overview</h1>

                {/* ─── STATS CARDS ─── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl shadow p-4 text-center">
                        <div className="text-2xl font-bold text-gray-800">{total}</div>
                        <div className="text-sm text-gray-500">Total Riders</div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">{available}</div>
                        <div className="text-sm text-green-600">Available</div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-4 text-center">
                        <div className="text-2xl font-bold text-red-600">{busy}</div>
                        <div className="text-sm text-red-600">Busy</div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-4 text-center">
                        <div className="text-2xl font-bold text-gray-500">{offline}</div>
                        <div className="text-sm text-gray-500">Offline</div>
                    </div>
                </div>

                {/* ─── FILTERS & SEARCH ─── */}
                <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
                    <div className="flex flex-wrap gap-3 flex-1">
                        <input
                            type="text"
                            placeholder="Search riders..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none flex-1 min-w-[200px]"
                        />
                        <select
                            value={cityFilter}
                            onChange={(e) => setCityFilter(e.target.value)}
                            className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">All Cities</option>
                            {cities.map(city => (
                                <option key={city} value={city}>{city}</option>
                            ))}
                        </select>
                        <select
                            value={storeFilter}
                            onChange={(e) => setStoreFilter(e.target.value)}
                            className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            disabled={!cityFilter && storeOptions.length === 0}
                        >
                            <option value="">All Stores</option>
                            {storeOptions.map(store => (
                                <option key={store._id} value={store._id}>{store.name}</option>
                            ))}
                        </select>
                    </div>
                    <Link
                        to="/riders/create"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 whitespace-nowrap"
                    >
                        + Add Rider
                    </Link>
                </div>

                {/* ─── TABLE ─── */}
                <div className="bg-white rounded-xl shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th
                                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none max-w-[180px]"
                                    onClick={() => handleSort('name')}
                                >
                                    Rider {getSortIcon('name')}
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none"
                                    onClick={() => handleSort('phone')}
                                >
                                    Phone {getSortIcon('phone')}
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none"
                                    onClick={() => handleSort('store')}
                                >
                                    Store {getSortIcon('store')}
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none"
                                    onClick={() => handleSort('status')}
                                >
                                    Status {getSortIcon('status')}
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none"
                                    onClick={() => handleSort('deliveries')}
                                >
                                    Deliveries {getSortIcon('deliveries')}
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none"
                                    onClick={() => handleSort('earnings')}
                                >
                                    Earnings {getSortIcon('earnings')}
                                </th>
                                <th
                                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none"
                                    onClick={() => handleSort('avgTime')}
                                >
                                    Avg Time {getSortIcon('avgTime')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {sortedRiders.map(rider => {
                                const stats = getRiderStats(rider._id);
                                return (
                                    <tr key={rider._id} className="hover:bg-gray-50">
                                        <td className="px-3 py-4 max-w-[180px]">
                                            <div className="font-medium text-gray-900 truncate">{rider.name}</div>
                                            <div className="text-sm text-gray-500 truncate">{rider.email}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{rider.phone}</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {rider.currentStoreId?.name || 'Not checked in'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                rider.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                                {rider.isAvailable ? 'Available' : 'Busy'}
                                            </span>
                                            <span className="ml-1 text-xs text-gray-500">
                                                ({rider.activeOrdersCount}/{rider.maxConcurrentOrders})
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{rider.totalDeliveries}</td>
                                        <td className="px-6 py-4 font-medium text-green-600">₹{rider.totalEarnings?.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {stats.avgTime !== null ? `${stats.avgTime.toFixed(1)} min` : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Link
                                                to={`/riders/${rider._id}`}
                                                className="text-blue-600 hover:text-blue-800 mr-2"
                                            >
                                                👁️ View
                                            </Link>
                                            <Link
                                                to={`/riders/edit/${rider._id}`}
                                                className="text-yellow-600 hover:text-yellow-800 mr-2"
                                            >
                                                ✏️ Edit
                                            </Link>
                                            <button
                                                onClick={async () => {
                                                    if (!window.confirm(`Delete ${rider.name}?`)) return;
                                                    try {
                                                        await api.delete(`/riders/${rider._id}`);
                                                        setRiders(riders.filter(r => r._id !== rider._id));
                                                    } catch {
                                                        alert('Failed to delete rider');
                                                    }
                                                }}
                                                className="text-red-600 hover:text-red-800 mr-2"
                                            >
                                                🗑️ Delete
                                            </button>
                                            <button
                                                onClick={() => openModal(rider)}
                                                className="text-sm text-blue-600 hover:text-blue-800"
                                            >
                                                📋 Details
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {sortedRiders.length === 0 && (
                        <div className="text-center py-12 text-gray-500">No riders found</div>
                    )}
                </div>
            </div>

            {/* ─── RIDER DETAIL MODAL ─── (unchanged) */}
            {showModal && selectedRider && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">
                                Rider: {selectedRider.name}
                            </h2>
                            <button
                                onClick={closeModal}
                                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Contact</h3>
                                    <p className="font-medium">{selectedRider.phone}</p>
                                    <p className="text-sm text-gray-600">{selectedRider.email}</p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Vehicle</h3>
                                    <p className="font-medium">{selectedRider.vehicle || 'N/A'}</p>
                                    <p className="text-sm text-gray-600">{selectedRider.vehicleNumber}</p>
                                </div>
                            </div>
                            <div className="border-t pt-4">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Store</h3>
                                <p className="font-medium">{selectedRider.currentStoreId?.name || 'Not checked in'}</p>
                                <p className="text-sm text-gray-600">{selectedRider.currentStoreId?.address}</p>
                                <p className="text-sm text-gray-600">{selectedRider.currentStoreId?.city}</p>
                            </div>
                            <div className="border-t pt-4">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Performance</h3>
                                <div className="mt-2 space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Total Deliveries</span>
                                        <span className="font-medium">{selectedRider.totalDeliveries}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Total Earnings</span>
                                        <span className="font-medium text-green-600">₹{selectedRider.totalEarnings?.toFixed(2)}</span>
                                    </div>
                                    {(() => {
                                        const stats = getRiderStats(selectedRider._id);
                                        return (
                                            <>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-gray-600">Delivered Orders (from orders)</span>
                                                    <span className="font-medium">{stats.totalDeliveries}</span>
                                                </div>
                                                {stats.avgTime !== null && (
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-600">Average Delivery Time</span>
                                                        <span className="font-medium">{stats.avgTime.toFixed(1)} min</span>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Status</span>
                                        <span className={`font-medium ${selectedRider.isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                                            {selectedRider.isAvailable ? 'Available' : 'Busy'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Active Orders</span>
                                        <span className="font-medium">{selectedRider.activeOrdersCount} / {selectedRider.maxConcurrentOrders}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t pt-4">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Recent Orders</h3>
                                {orders
                                    .filter(o => o.riderId?._id === selectedRider._id)
                                    .slice(0, 5)
                                    .map(order => (
                                        <div key={order._id} className="mt-2 flex justify-between text-sm border-b border-gray-100 py-1">
                                            <span className="text-gray-600">#{order._id.slice(-6)}</span>
                                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                                                order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                                order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {order.status}
                                            </span>
                                            <span className="text-gray-600">₹{order.totalAmount.toFixed(2)}</span>
                                            <span className="text-gray-500">{order.timeTaken ? `${order.timeTaken} min` : '-'}</span>
                                        </div>
                                    ))}
                                {orders.filter(o => o.riderId?._id === selectedRider._id).length === 0 && (
                                    <p className="text-sm text-gray-400 mt-1">No orders found</p>
                                )}
                            </div>
                        </div>
                        <div className="sticky bottom-0 bg-gray-50 px-6 py-3 border-t flex justify-end">
                            <button
                                onClick={closeModal}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Riders;