import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';

function RiderDetail() {
    const { id } = useParams();
    const [rider, setRider] = useState(null);
    const [allOrders, setAllOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ─── FETCH RIDER & ORDERS ───
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [riderRes, ordersRes] = await Promise.all([
                    api.get(`/riders/${id}`),
                    api.get(`/orders?riderId=${id}&limit=1000`)
                ]);
                setRider(riderRes.data.data);
                setAllOrders(ordersRes.data.data || []);
            } catch (err) {
                console.error(err);
                setError('Failed to load rider data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    // ─── DERIVED STATS (from orders) ───
    const deliveredOrders = allOrders.filter(o => o.status === 'delivered');
    const totalDeliveries = deliveredOrders.length;

    const validDeliveries = deliveredOrders.filter(o => o.timeTaken !== null && o.timeTaken >= 0);
    const avgTime = validDeliveries.length > 0
        ? validDeliveries.reduce((acc, o) => acc + o.timeTaken, 0) / validDeliveries.length
        : null;

    const onTimeOrders = validDeliveries.filter(o => o.timeTaken <= 60).length;
    const onTimeRate = validDeliveries.length > 0 ? (onTimeOrders / validDeliveries.length * 100) : 0;

    const totalEarningsFromOrders = validDeliveries.reduce((acc, o) => acc + (o.totalAmount || 0), 0);

    // ─── BAN RIDER ───
    const banRider = async () => {
        if (!window.confirm(`Ban ${rider.name}? They will no longer be assigned new orders.`)) return;
        try {
            await api.put(`/riders/${id}/ban`);
            alert('Rider banned successfully');
            // Refresh rider data
            const res = await api.get(`/riders/${id}`);
            setRider(res.data.data);
        } catch (err) {
            alert('Failed to ban rider');
        }
    };

    // ─── FORMAT DATE ───
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

    if (loading) return <div className="text-center py-8">Loading rider details...</div>;
    if (error) return <div className="text-center py-8 text-red-600">{error}</div>;
    if (!rider) return <div className="text-center py-8">No rider found</div>;

    const isSuspended = rider.status === 'suspended';

    // Recent delivered orders (max 10)
    const recentDelivered = deliveredOrders.slice(0, 10);

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-4xl mx-auto">
                <Link to="/riders" className="text-blue-600 hover:underline">← Back to Riders</Link>

                {/* ─── RIDER CARD ─── */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden mt-4">
                    <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-white flex flex-wrap justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">{rider.name}</h1>
                            <p className="text-gray-500">{rider.email}</p>
                            <p className="text-gray-500">{rider.phone}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            {/* Status badge */}
                            {isSuspended ? (
                                <span className="px-3 py-1 text-sm font-semibold rounded-full bg-red-200 text-red-800">
                                    🚫 Suspended
                                </span>
                            ) : rider.isAvailable ? (
                                <span className="px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">
                                    🟢 Available
                                </span>
                            ) : (
                                <span className="px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800">
                                    🔴 Busy
                                </span>
                            )}
                            {/* Ban button only if not suspended */}
                            {!isSuspended ? (
                                <button
                                    onClick={banRider}
                                    className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full hover:bg-red-200 transition"
                                >
                                    🚫 Ban Rider
                                </button>
                            ) : (
                                <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
                                    🚫 Banned
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Vehicle</h3>
                            <p className="text-gray-800 mt-1">{rider.vehicle?.type?.toUpperCase() || 'N/A'} - {rider.vehicle?.number || 'N/A'}</p>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Current Store</h3>
                            <p className="text-gray-800 mt-1">{rider.currentStoreId?.name || 'Not checked in'}</p>
                            <p className="text-sm text-gray-500">{rider.currentStoreId?.address}</p>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Active Orders</h3>
                            <p className="text-gray-800 mt-1">{rider.activeOrdersCount} / {rider.maxConcurrentOrders}</p>
                        </div>
                    </div>

                    {/* ─── PERFORMANCE STATS (computed from orders) ─── */}
                    <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-4 gap-4 border-t pt-4">
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <div className="text-sm text-gray-500">Delivered Orders</div>
                            <div className="text-xl font-bold text-gray-800">{totalDeliveries}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <div className="text-sm text-gray-500">Total Earnings</div>
                            <div className="text-xl font-bold text-green-600">
                                ₹{totalEarningsFromOrders.toFixed(2)}
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <div className="text-sm text-gray-500">Avg Delivery Time</div>
                            <div className="text-xl font-bold text-blue-600">
                                {avgTime !== null ? `${avgTime.toFixed(1)} min` : 'N/A'}
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                            <div className="text-sm text-gray-500">On-Time Rate</div>
                            <div className={`text-xl font-bold ${onTimeRate >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                                {totalDeliveries > 0 ? `${onTimeRate.toFixed(0)}%` : 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── RECENT DELIVERED ORDERS ─── */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden mt-6">
                    <div className="px-6 py-4 border-b">
                        <h2 className="text-xl font-semibold text-gray-800">📦 Recent Deliveries</h2>
                        <p className="text-sm text-gray-500">
                            Showing last {recentDelivered.length} of {totalDeliveries} delivered orders
                        </p>
                    </div>
                    {recentDelivered.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">No delivered orders found</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time Taken</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {recentDelivered.map(order => (
                                        <tr key={order._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-mono text-sm">#{order._id.slice(-6)}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{formatDate(order.createdAt)}</td>
                                            <td className="px-6 py-4 font-medium">₹{order.totalAmount.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {order.timeTaken !== null ? `${order.timeTaken} min` : '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                    DELIVERED
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default RiderDetail;