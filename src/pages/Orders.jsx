import { useState, useEffect } from 'react';
import api from '../api/client';

function Orders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('today');

    // ─── SORT STATE ───
    const [sortField, setSortField] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');

    // ─── VIEW MODAL STATE ───
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // ─── NEW FILTER STATES ───
    const [cityFilter, setCityFilter] = useState('');
    const [storeFilter, setStoreFilter] = useState('');

    // ─── FETCH ORDERS ───
    const fetchOrders = async () => {
        try {
            const url = statusFilter ? `/orders?status=${statusFilter}` : '/orders';
            const res = await api.get(url);
            setOrders(res.data.data || []);
        } catch (err) {
            console.error(err);
            alert('Failed to fetch orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [statusFilter]);

    // ─── DATE FILTER ───
    const filterOrdersByDate = (orders) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        return orders.filter(order => {
            const orderDate = new Date(order.createdAt);
            switch (dateFilter) {
                case 'today':
                    return orderDate >= today;
                case 'week':
                    return orderDate >= startOfWeek;
                case 'month':
                    return orderDate >= startOfMonth;
                case 'all':
                default:
                    return true;
            }
        });
    };

    // ─── SORT ORDERS ───
    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    // ─── COMPUTE CITY & STORE OPTIONS ───
    const cities = [...new Set(
        orders
            .map(o => o.storeId?.city)
            .filter(Boolean)
    )].sort();

    // Stores filtered by selected city (if any)
    const storeOptions = orders
        .filter(o => !cityFilter || o.storeId?.city === cityFilter)
        .reduce((acc, o) => {
            const store = o.storeId;
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

    // ─── APPLY FILTERS ───
    const dateFiltered = filterOrdersByDate(orders);
    const filteredOrders = dateFiltered.filter(order => {
        if (cityFilter && order.storeId?.city !== cityFilter) return false;
        if (storeFilter && order.storeId?._id !== storeFilter) return false;
        return true;
    });

    const sortedOrders = [...filteredOrders].sort((a, b) => {
        let valA, valB;

        if (sortField === 'storeName') {
            valA = a.storeId?.name || '';
            valB = b.storeId?.name || '';
        } else if (sortField === 'riderName') {
            valA = a.riderId?.name || '';
            valB = b.riderId?.name || '';
        } else if (sortField === 'timeTaken') {
            if (a.timeTaken === null && b.timeTaken === null) return 0;
            if (a.timeTaken === null) return 1;
            if (b.timeTaken === null) return -1;
            return sortOrder === 'asc' 
                ? a.timeTaken - b.timeTaken 
                : b.timeTaken - a.timeTaken;
        } else {
            valA = a[sortField] ?? 0;
            valB = b[sortField] ?? 0;
        }

        if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }
        if (valA == null) valA = '';
        if (valB == null) valB = '';

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    // ─── UPDATE STATUS ───
    const updateStatus = async (order, newStatus) => {
        if (!window.confirm(`Change order status to "${newStatus}"?`)) return;
        try {
            await api.put(`/orders/${order._id}`, { status: newStatus });
            fetchOrders();
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getSortIcon = (field) => {
        if (sortField !== field) return ' ⇅';
        return sortOrder === 'asc' ? ' ↑' : ' ↓';
    };

    // ─── OPEN MODAL ───
    const openModal = (order) => {
        setSelectedOrder(order);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedOrder(null);
    };

    if (loading) return <div className="text-center py-8">Loading orders...</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* HEADER */}
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">📦 Orders</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Showing <span className="font-bold">{sortedOrders.length}</span> orders
                            {dateFilter !== 'all' && ` (${dateFilter === 'today' ? 'today' : dateFilter === 'week' ? 'this week' : 'this month'})`}
                            {statusFilter && ` · status: ${statusFilter}`}
                            {cityFilter && ` · city: ${cityFilter}`}
                            {storeFilter && ` · store: ${storeOptions.find(s => s._id === storeFilter)?.name || storeFilter}`}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="picking">Picking</option>
                            <option value="dispatched">Dispatched</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="today">📅 Today</option>
                            <option value="week">📅 This Week</option>
                            <option value="month">📅 This Month</option>
                            <option value="all">📅 All Orders</option>
                        </select>
                        {/* ─── CITY FILTER ─── */}
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
                        {/* ─── STORE FILTER ─── */}
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
                </div>

                {/* TABLE */}
                {sortedOrders.length === 0 ? (
                    <div className="bg-white rounded-xl shadow p-12 text-center">
                        <p className="text-gray-500 text-lg">No orders found</p>
                        <p className="text-sm text-gray-400">Try adjusting your filters</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700" onClick={() => handleSort('createdAt')}>
                                        Order ID
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700" onClick={() => handleSort('createdAt')}>
                                        Created At {getSortIcon('createdAt')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700" onClick={() => handleSort('customerName')}>
                                        Customer {getSortIcon('customerName')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700" onClick={() => handleSort('totalAmount')}>
                                        Total {getSortIcon('totalAmount')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700" onClick={() => handleSort('status')}>
                                        Status {getSortIcon('status')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700" onClick={() => handleSort('storeName')}>
                                        Store {getSortIcon('storeName')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 w-32 max-w-[150px] truncate" onClick={() => handleSort('riderName')}>
                                        Rider {getSortIcon('riderName')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700" onClick={() => handleSort('timeTaken')}>
                                        Time Taken {getSortIcon('timeTaken')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {sortedOrders.map(order => (
                                    <tr key={order._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-mono text-sm">{order._id.slice(-6)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {formatDate(order.createdAt)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium">{order.customerName}</div>
                                            <div className="text-sm text-gray-500">{order.customerPhone}</div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-800">₹{order.totalAmount.toFixed(2)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                                order.status === 'dispatched' ? 'bg-blue-100 text-blue-800' :
                                                order.status === 'picking' ? 'bg-yellow-100 text-yellow-800' :
                                                order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {order.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{order.storeId?.name || 'N/A'}</td>
                                        <td className="px-6 py-4 max-w-[150px]">
                                            {order.riderId ? (
                                                <div className="truncate">
                                                    <div className="font-medium text-gray-800 truncate">{order.riderId.name}</div>
                                                    <div className="text-sm text-gray-500 truncate">{order.riderId.phone}</div>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400 truncate block">Not Assigned</span>
                                            )}
                                        </td>
                                        <td className="px-2 py-4 text-sm">
                                            {order.timeTaken !== null ? (
                                                <span className="font-medium text-gray-700">
                                                    {order.timeTaken} min
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 space-x-2 whitespace-nowrap">
                                            <select
                                                value={order.status}
                                                onChange={(e) => updateStatus(order, e.target.value)}
                                                className="border rounded px-2 py-1 text-sm"
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="picking">Picking</option>
                                                <option value="dispatched">Dispatched</option>
                                                <option value="delivered">Delivered</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                            <button
                                                onClick={() => openModal(order)}
                                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                            >
                                                👁️ View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ─── VIEW MODAL ─── (unchanged) */}
            {showModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">
                                Order #{selectedOrder._id.slice(-8)}
                            </h2>
                            <button
                                onClick={closeModal}
                                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex flex-wrap justify-between items-center gap-2">
                                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                                    selectedOrder.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                    selectedOrder.status === 'dispatched' ? 'bg-blue-100 text-blue-800' :
                                    selectedOrder.status === 'picking' ? 'bg-yellow-100 text-yellow-800' :
                                    selectedOrder.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                    {selectedOrder.status.toUpperCase()}
                                </span>
                                <span className="text-sm text-gray-500">
                                    Created: {formatDate(selectedOrder.createdAt)}
                                </span>
                            </div>
                            <div className="border-t pt-4">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Customer</h3>
                                <div className="mt-1">
                                    <p className="font-medium">{selectedOrder.customerName}</p>
                                    <p className="text-sm text-gray-600">{selectedOrder.customerPhone}</p>
                                    {selectedOrder.customerLocation && (
                                        <p className="text-sm text-gray-500 mt-1">
                                            📍 Lat: {selectedOrder.customerLocation.coordinates?.[1]?.toFixed(4) || 'N/A'}, 
                                            Lng: {selectedOrder.customerLocation.coordinates?.[0]?.toFixed(4) || 'N/A'}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {selectedOrder.items && selectedOrder.items.length > 0 && (
                                <div className="border-t pt-4">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Items</h3>
                                    <ul className="mt-1 divide-y divide-gray-100">
                                        {selectedOrder.items.map((item, idx) => (
                                            <li key={idx} className="py-2 flex justify-between">
                                                <span>
                                                    {item.productId?.name || 'Product'} × {item.quantity}
                                                </span>
                                                <span className="font-medium">
                                                    ₹{(item.price || 0) * (item.quantity || 1)}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="mt-2 text-right font-bold text-lg">
                                        Total: ₹{selectedOrder.totalAmount.toFixed(2)}
                                    </div>
                                </div>
                            )}
                            <div className="border-t pt-4 grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Store</h3>
                                    <p className="font-medium">{selectedOrder.storeId?.name || 'N/A'}</p>
                                    <p className="text-sm text-gray-500">{selectedOrder.storeId?.address}</p>
                                    <p className="text-sm text-gray-500">{selectedOrder.storeId?.city || ''}</p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Rider</h3>
                                    {selectedOrder.riderId ? (
                                        <>
                                            <p className="font-medium">{selectedOrder.riderId.name}</p>
                                            <p className="text-sm text-gray-500">{selectedOrder.riderId.phone}</p>
                                        </>
                                    ) : (
                                        <p className="text-gray-400">Not assigned</p>
                                    )}
                                </div>
                            </div>
                            {selectedOrder.deliveredAt && (
                                <div className="border-t pt-4">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Delivery</h3>
                                    <p className="text-sm text-gray-600">
                                        Delivered at: {formatDate(selectedOrder.deliveredAt)}
                                    </p>
                                    {selectedOrder.timeTaken !== null && (
                                        <p className="text-sm text-gray-600">
                                            ⏱️ Time taken: <span className="font-medium">{selectedOrder.timeTaken} minutes</span>
                                        </p>
                                    )}
                                </div>
                            )}
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

export default Orders;