import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';

function StoreDetail() {
    const { id } = useParams();
    const [store, setStore] = useState(null);
    const [inventory, setInventory] = useState([]);
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [riders, setRiders] = useState([]);
    const [riderStats, setRiderStats] = useState({ total: 0, available: 0, busy: 0, offline: 0 });
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [orderStatusFilter, setOrderStatusFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ─── ORDER SORTING ───
    const [orderSortField, setOrderSortField] = useState('createdAt');
    const [orderSortOrder, setOrderSortOrder] = useState('desc');

    // ─── RIDER SORTING ───
    const [riderSortField, setRiderSortField] = useState('name');
    const [riderSortOrder, setRiderSortOrder] = useState('asc');

    // ─── STATS ───
    const [totalOrdersCount, setTotalOrdersCount] = useState(0);
    const [deliveredOrdersCount, setDeliveredOrdersCount] = useState(0);
    const [orderStatusCounts, setOrderStatusCounts] = useState({
        pending: 0,
        picking: 0,
        dispatched: 0,
        delivered: 0,
        cancelled: 0,
    });
    const [pickers, setPickers] = useState([]);
    const [complaintsCount, setComplaintsCount] = useState(0);

    // ─── ACTIVE SECTION ───
    const [activeSection, setActiveSection] = useState('store');

    // ─── INVENTORY SEARCH & SORT ───
    const [productSearch, setProductSearch] = useState('');
    const [sortField, setSortField] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');

    // ─── PAGINATION ───
    const [ordersPage, setOrdersPage] = useState(1);
    const [ordersLimit] = useState(10);
    const [ordersTotal, setOrdersTotal] = useState(0);
    const [invPage, setInvPage] = useState(1);
    const [invLimit] = useState(8);

    // ─── INVENTORY FOCUS ───
    const [selectedInventory, setSelectedInventory] = useState(null);

    // Modal states
    const [showInventoryModal, setShowInventoryModal] = useState(false);
    const [editingInventory, setEditingInventory] = useState(null);
    const [inventoryForm, setInventoryForm] = useState({
        product_id: '',
        stock_quantity: 0,
        low_stock_threshold: 10,
        reorder_point: 5,
    });
    const [saving, setSaving] = useState(false);

    // ─── REFS ───
    const storeRef = useRef(null);
    const ridersRef = useRef(null);
    const ordersRef = useRef(null);
    const inventoryRef = useRef(null);

    // ─── FETCH FUNCTIONS ───
    const fetchStore = async () => {
        try {
            const res = await api.get(`/stores/stores/${id}`);
            setStore(res.data);
        } catch (err) {
            console.error(err);
            setError('Store not found');
        }
    };

    const fetchInventory = async () => {
        try {
            const res = await api.get(`/inventory/store/${id}`);
            setInventory(res.data.data || []);
            setInvPage(1);
            setSelectedInventory(null);
        } catch (err) {
            console.error('Error fetching inventory:', err);
            setInventory([]);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await api.get('/products');
            setProducts(res.data.data || []);
        } catch (err) {
            console.error('Error fetching products:', err);
            setProducts([]);
        }
    };

    const fetchStoreOrders = async (page = ordersPage, limit = ordersLimit) => {
        try {
            setOrdersLoading(true);
            let url = `/orders/store/${id}?page=${page}&limit=${limit}`;
            if (orderStatusFilter) url += `&status=${orderStatusFilter}`;
            url += `&sortField=${orderSortField}&sortOrder=${orderSortOrder}`;
            const res = await api.get(url);
            setOrders(res.data.data || []);
            setOrdersTotal(res.data.count || 0);
        } catch (err) {
            console.error('Error fetching store orders:', err);
            setOrders([]);
            setOrdersTotal(0);
        } finally {
            setOrdersLoading(false);
        }
    };

    const fetchRiders = async () => {
        try {
            const res = await api.get(`/riders/store/${id}`);
            setRiders(res.data.data?.riders || []);
            setRiderStats(res.data.data?.stats || { total: 0, available: 0, busy: 0, offline: 0 });
        } catch (err) {
            console.error('Error fetching riders:', err);
            setRiders([]);
            setRiderStats({ total: 0, available: 0, busy: 0, offline: 0 });
        }
    };

    const fetchPickers = async () => {
        try {
            // Adjust endpoint to match your backend
            const res = await api.get(`/stores/${id}/pickers`);
            setPickers(res.data.data || []);
        } catch (err) {
            console.error('Error fetching pickers:', err);
            setPickers([]);
        }
    };

    const fetchComplaints = async () => {
        try {
            // Adjust endpoint to match your backend
            const res = await api.get(`/orders/store/${id}/complaints?count=true`);
            setComplaintsCount(res.data.count || 0);
        } catch (err) {
            console.error('Error fetching complaints:', err);
            setComplaintsCount(0);
        }
    };

    const fetchOrderStatusStats = async () => {
        try {
            const res = await api.get(`/orders/store/${id}/stats`);
            setOrderStatusCounts(res.data.data || { pending: 0, picking: 0, dispatched: 0, delivered: 0, cancelled: 0 });
        } catch (err) {
            console.error('Error fetching order status stats:', err);
            setOrderStatusCounts({ pending: 0, picking: 0, dispatched: 0, delivered: 0, cancelled: 0 });
        }
    };

    // ─── FETCH ALL ───
    const fetchAll = async () => {
        setLoading(true);
        await Promise.all([
            fetchStore(),
            fetchInventory(),
            fetchProducts(),
            fetchStoreOrders(1),
            fetchRiders(),
            fetchPickers(),
            fetchComplaints(),
            fetchOrderStatusStats(),
        ]);

        // ─── FETCH STATS (Total & Delivered) ───
        try {
            const totalRes = await api.get(`/orders/store/${id}?limit=0`);
            setTotalOrdersCount(totalRes.data.count || 0);
            const deliveredRes = await api.get(`/orders/store/${id}?status=delivered&limit=0`);
            setDeliveredOrdersCount(deliveredRes.data.count || 0);
        } catch (err) {
            console.error('Error fetching order stats:', err);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchAll();
    }, [id]);

    useEffect(() => {
        if (id) {
            fetchStoreOrders(ordersPage);
        }
    }, [orderStatusFilter, ordersPage, orderSortField, orderSortOrder]);

    // ─── MODAL HANDLERS ───
    const openAddInventory = () => {
        setEditingInventory(null);
        setInventoryForm({
            product_id: '',
            stock_quantity: 0,
            low_stock_threshold: 10,
            reorder_point: 5,
        });
        setShowInventoryModal(true);
    };

    const openEditInventory = (item) => {
        setEditingInventory(item);
        setInventoryForm({
            product_id: item.product_id._id,
            stock_quantity: item.stock_quantity,
            low_stock_threshold: item.low_stock_threshold || 10,
            reorder_point: item.reorder_point || 5,
        });
        setShowInventoryModal(true);
    };

    const closeInventoryModal = () => {
        setShowInventoryModal(false);
        setEditingInventory(null);
        setInventoryForm({
            product_id: '',
            stock_quantity: 0,
            low_stock_threshold: 10,
            reorder_point: 5,
        });
    };

    const handleInventoryChange = (e) => {
        const { name, value } = e.target;
        setInventoryForm({
            ...inventoryForm,
            [name]: name === 'product_id' ? value : parseFloat(value) || 0,
        });
    };

    const handleSubmitInventory = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            if (editingInventory) {
                await api.put(`/inventory/${editingInventory._id}`, {
                    stock_quantity: inventoryForm.stock_quantity,
                    low_stock_threshold: inventoryForm.low_stock_threshold,
                    reorder_point: inventoryForm.reorder_point,
                });
                alert('✅ Stock updated successfully!');
            } else {
                await api.post('/inventory', {
                    store_id: id,
                    product_id: inventoryForm.product_id,
                    stock_quantity: inventoryForm.stock_quantity,
                    low_stock_threshold: inventoryForm.low_stock_threshold,
                    reorder_point: inventoryForm.reorder_point,
                });
                alert('✅ Product added to inventory!');
            }
            closeInventoryModal();
            fetchInventory();
        } catch (err) {
            alert(err.response?.data?.error || '❌ Something went wrong');
        } finally {
            setSaving(false);
        }
    };

    const removeFromInventory = async (inventoryId, productName) => {
        if (!window.confirm(`Remove "${productName}" from this store's inventory?`)) return;
        try {
            await api.delete(`/inventory/${inventoryId}`);
            alert('✅ Product removed from inventory');
            fetchInventory();
        } catch (err) {
            alert('❌ Failed to remove from inventory');
        }
    };

    const availableProducts = products.filter(
        (p) => !inventory.some((i) => i.product_id?._id === p._id)
    );

    // ─── INVENTORY SEARCH + SORT ───
    const handleInventorySort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
        setInvPage(1);
        setSelectedInventory(null);
    };

    const getInventorySortIcon = (field) => {
        if (sortField !== field) return ' ⇅';
        return sortOrder === 'asc' ? ' ↑' : ' ↓';
    };

    const filteredInventory = inventory.filter((item) => {
        if (!productSearch.trim()) return true;
        const productName = item.product_id?.name || '';
        return productName.toLowerCase().includes(productSearch.toLowerCase());
    });

    const sortedInventory = [...filteredInventory].sort((a, b) => {
        let valA = a.product_id?.[sortField] ?? '';
        let valB = b.product_id?.[sortField] ?? '';

        if (sortField === 'stock') {
            valA = a.stock_quantity ?? 0;
            valB = b.stock_quantity ?? 0;
        }
        if (sortField === 'category') {
            valA = a.product_id?.category || '';
            valB = b.product_id?.category || '';
        }
        if (sortField === 'name') {
            valA = a.product_id?.name || '';
            valB = b.product_id?.name || '';
        }

        if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const totalInvPages = Math.ceil(sortedInventory.length / invLimit);
    const paginatedInventory = sortedInventory.slice(
        (invPage - 1) * invLimit,
        invPage * invLimit
    );

    // ─── ORDER SORTING HELPERS ───
    const handleOrderSort = (field) => {
        if (orderSortField === field) {
            setOrderSortOrder(orderSortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setOrderSortField(field);
            setOrderSortOrder('asc');
        }
        setOrdersPage(1);
    };

    const getOrderSortIcon = (field) => {
        if (orderSortField !== field) return ' ⇅';
        return orderSortOrder === 'asc' ? ' ↑' : ' ↓';
    };

    // ─── RIDER SORTING HELPERS ───
    const handleRiderSort = (field) => {
        if (riderSortField === field) {
            setRiderSortOrder(riderSortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setRiderSortField(field);
            setRiderSortOrder('asc');
        }
    };

    const getRiderSortIcon = (field) => {
        if (riderSortField !== field) return ' ⇅';
        return riderSortOrder === 'asc' ? ' ↑' : ' ↓';
    };

    const sortedRiders = [...riders].sort((a, b) => {
        let valA, valB;
        switch (riderSortField) {
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
            case 'activeOrders':
                valA = a.activeOrdersCount || 0;
                valB = b.activeOrdersCount || 0;
                break;
            case 'deliveries':
                valA = a.totalDeliveries || 0;
                valB = b.totalDeliveries || 0;
                break;
            default:
                return 0;
        }
        if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
        }
        if (valA < valB) return riderSortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return riderSortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    // ─── HELPERS ───
    const getStatusBadge = (status) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800',
            picking: 'bg-blue-100 text-blue-800',
            dispatched: 'bg-purple-100 text-purple-800',
            delivered: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getRiderStatusBadge = (rider) => {
        if (rider.isAvailable && rider.activeOrdersCount < rider.maxConcurrentOrders) {
            return { label: '🟢 Available', color: 'bg-green-100 text-green-800' };
        } else if (!rider.isAvailable && rider.activeOrdersCount > 0) {
            return { label: '🔴 Busy', color: 'bg-red-100 text-red-800' };
        } else {
            return { label: '⚪ Offline', color: 'bg-gray-100 text-gray-500' };
        }
    };

    const PaginationControls = ({ page, totalPages, onPageChange, loading }) => {
        if (totalPages <= 1) return null;
        return (
            <div className="flex justify-between items-center px-6 py-3 border-t bg-gray-50 text-sm">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1 || loading}
                    className="px-4 py-1 border rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    ← Previous
                </button>
                <span className="text-gray-600">Page {page} of {totalPages}</span>
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages || loading}
                    className="px-4 py-1 border rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Next →
                </button>
            </div>
        );
    };

    // ─── RENDER ───
    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-lg text-gray-600">Loading store details...</div>
            </div>
        );
    }

    if (error || !store) {
        return (
            <div className="flex flex-col justify-center items-center h-screen">
                <div className="text-lg text-red-600">{error || 'Store not found'}</div>
                <Link to="/" className="text-blue-600 hover:underline mt-4">
                    ← Back to Stores
                </Link>
            </div>
        );
    }

    const sections = [
        { id: 'store', label: '🏪 Store' },
        { id: 'riders', label: '🏍️ Riders' },
        { id: 'orders', label: '📋 Orders' },
        { id: 'inventory', label: '📦 Inventory' },
    ];

    // ─── SIDEBAR NAV ───
    const Sidebar = () => (
        <aside className="w-56 bg-white shadow-lg flex-shrink-0 h-screen sticky top-0 overflow-y-auto z-10">
            <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-white">
                <h1 className="text-sm font-bold text-gray-800">📌 Navigate</h1>
                <p className="text-xs text-gray-500">{store.name}</p>
            </div>
            <nav className="p-3 space-y-1">
                {sections.map((section) => (
                    <button
                        key={section.id}
                        onClick={() => {
                            setActiveSection(section.id);
                            if (section.id !== 'inventory') {
                                setSelectedInventory(null);
                            }
                        }}
                        className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-2 ${activeSection === section.id
                                ? 'bg-blue-50 text-blue-600'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <span className="text-base">{section.label.split(' ')[0]}</span>
                        <span>{section.label.split(' ').slice(1).join(' ')}</span>
                    </button>
                ))}
                <div className="border-t my-3"></div>
                <Link
                    to="/"
                    className="block w-full text-left px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 transition"
                >
                    ← Back to Stores
                </Link>
            </nav>
        </aside>
    );

    // ─── SECTION RENDERERS ───
    const renderStore = () => (
        <div ref={storeRef} className="bg-white rounded-xl shadow-lg overflow-hidden scroll-mt-6">
            <div className="p-6 border-b">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{store.name}</h1>
                        <p className="text-gray-600 mt-1">{store.address}</p>
                        {store.description && <p className="text-gray-500 mt-2">{store.description}</p>}
                    </div>
                    <span
                        className={`px-3 py-1 text-sm font-semibold rounded-full ${store.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                    >
                        {store.isActive ? '🟢 Active' : '🔴 Inactive'}
                    </span>
                </div>
            </div>
            <div className="p-6 grid grid-cols-2 gap-6">
                <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Coordinates</h3>
                    <p className="text-gray-800 mt-1">
                        Latitude: {store.location?.coordinates?.[1] || 'N/A'}
                    </p>
                    <p className="text-gray-800">
                        Longitude: {store.location?.coordinates?.[0] || 'N/A'}
                    </p>
                </div>
                <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Operating Hours</h3>
                    <p className="text-gray-800 mt-1">{store.operating_hours || 'Not specified'}</p>
                </div>
            </div>

            {/* ─── ORDER STATUS BREAKDOWN ─── */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-6 border-t bg-gray-50">
                <div className="text-center bg-white rounded-lg shadow-sm p-3">
                    <div className="text-2xl font-bold text-yellow-600">{orderStatusCounts.pending || 0}</div>
                    <div className="text-xs text-gray-500">Pending</div>
                </div>
                <div className="text-center bg-white rounded-lg shadow-sm p-3">
                    <div className="text-2xl font-bold text-blue-600">{orderStatusCounts.picking || 0}</div>
                    <div className="text-xs text-gray-500">Picking</div>
                </div>
                <div className="text-center bg-white rounded-lg shadow-sm p-3">
                    <div className="text-2xl font-bold text-purple-600">{orderStatusCounts.dispatched || 0}</div>
                    <div className="text-xs text-gray-500">Dispatched</div>
                </div>
                <div className="text-center bg-white rounded-lg shadow-sm p-3">
                    <div className="text-2xl font-bold text-green-600">{orderStatusCounts.delivered || 0}</div>
                    <div className="text-xs text-gray-500">Delivered</div>
                </div>
                <div className="text-center bg-white rounded-lg shadow-sm p-3">
                    <div className="text-2xl font-bold text-red-600">{orderStatusCounts.cancelled || 0}</div>
                    <div className="text-xs text-gray-500">Cancelled</div>
                </div>
            </div>

            {/* ─── ENHANCED STORE STATS ─── */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-6 border-t bg-gradient-to-b from-gray-50 to-white">
                <div className="text-center bg-white rounded-lg shadow-sm p-3">
                    <div className="text-2xl font-bold text-blue-600">{totalOrdersCount}</div>
                    <div className="text-xs text-gray-500">Total Orders</div>
                </div>
                <div className="text-center bg-white rounded-lg shadow-sm p-3">
                    <div className="text-2xl font-bold text-green-600">{deliveredOrdersCount}</div>
                    <div className="text-xs text-gray-500">Completed</div>
                </div>
                <div className="text-center bg-white rounded-lg shadow-sm p-3">
                    <div className="text-2xl font-bold text-purple-600">{riderStats.total}</div>
                    <div className="text-xs text-gray-500">Total Riders</div>
                </div>
                <div className="text-center bg-white rounded-lg shadow-sm p-3">
                    <div className="text-2xl font-bold text-indigo-600">{riderStats.available}</div>
                    <div className="text-xs text-gray-500">Available Riders</div>
                </div>
                <div className="text-center bg-white rounded-lg shadow-sm p-3">
                    <div className="text-2xl font-bold text-orange-600">{pickers.length}</div>
                    <div className="text-xs text-gray-500">Pickers</div>
                </div>
                <div className="text-center bg-white rounded-lg shadow-sm p-3">
                    <div className="text-2xl font-bold text-red-600">{complaintsCount}</div>
                    <div className="text-xs text-gray-500">Complaints</div>
                </div>
            </div>

            {/* ─── PICKERS SECTION ─── */}
            {pickers.length > 0 && (
                <div className="p-6 border-t">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">🧑‍🍳 Pickers</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {pickers.map((picker) => (
                            <div key={picker._id} className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                    {picker.name?.[0] || 'P'}
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{picker.name}</p>
                                    <p className="text-xs text-gray-500">{picker.phone}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderRiders = () => (
        <div ref={ridersRef} className="bg-white rounded-xl shadow-lg overflow-hidden scroll-mt-6">
            <div className="p-6 border-b">
                <h3 className="text-xl font-semibold text-gray-800">🏍️ Delivery Riders</h3>
                <p className="text-sm text-gray-500">
                    Riders currently checked in at this store · {riderStats.total} total, {riderStats.available} available
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-800">{riderStats.total}</div>
                    <div className="text-sm text-gray-500">Total Riders</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{riderStats.available}</div>
                    <div className="text-sm text-green-600">Available</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{riderStats.busy}</div>
                    <div className="text-sm text-red-600">Busy</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gray-500">{riderStats.offline}</div>
                    <div className="text-sm text-gray-500">Offline</div>
                </div>
            </div>

            {riders.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No riders checked in at this store</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none" onClick={() => handleRiderSort('name')}>
                                    Rider {getRiderSortIcon('name')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none" onClick={() => handleRiderSort('phone')}>
                                    Phone {getRiderSortIcon('phone')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none" onClick={() => handleRiderSort('store')}>
                                    Store {getRiderSortIcon('store')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none" onClick={() => handleRiderSort('status')}>
                                    Status {getRiderSortIcon('status')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none" onClick={() => handleRiderSort('activeOrders')}>
                                    Active Orders {getRiderSortIcon('activeOrders')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none" onClick={() => handleRiderSort('deliveries')}>
                                    Deliveries {getRiderSortIcon('deliveries')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {sortedRiders.map((rider) => {
                                const status = getRiderStatusBadge(rider);
                                return (
                                    <tr key={rider._id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">{rider.name}</div>
                                            <div className="text-xs text-gray-500">{rider.email || ''}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{rider.phone}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-600">{rider.currentStoreId?.name || 'Not checked in'}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${status.color}`}>{status.label}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className="font-bold text-gray-800">{rider.activeOrdersCount} / {rider.maxConcurrentOrders}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{rider.totalDeliveries || 0}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    const renderOrders = () => (
        <div ref={ordersRef} className="bg-white rounded-xl shadow-lg overflow-hidden scroll-mt-6">
            <div className="p-6 border-b flex flex-wrap justify-between items-center gap-3">
                <div>
                    <h3 className="text-xl font-semibold text-gray-800">📋 Orders</h3>
                    <p className="text-sm text-gray-500">
                        {ordersTotal > 0 ? `Showing ${orders.length} of ${ordersTotal} orders` : 'No orders'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={orderStatusFilter}
                        onChange={(e) => {
                            setOrderStatusFilter(e.target.value);
                            setOrdersPage(1);
                        }}
                        className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="picking">Picking</option>
                        <option value="dispatched">Dispatched</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
            </div>

            {ordersLoading ? (
                <div className="p-8 text-center text-gray-500">Loading orders...</div>
            ) : orders.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No orders for this store</div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none" onClick={() => handleOrderSort('_id')}>
                                        Order ID {getOrderSortIcon('_id')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none" onClick={() => handleOrderSort('customerName')}>
                                        Customer {getOrderSortIcon('customerName')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none" onClick={() => handleOrderSort('totalAmount')}>
                                        Total {getOrderSortIcon('totalAmount')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none" onClick={() => handleOrderSort('status')}>
                                        Status {getOrderSortIcon('status')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none" onClick={() => handleOrderSort('createdAt')}>
                                        Date {getOrderSortIcon('createdAt')}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {orders.map((order) => (
                                    <tr key={order._id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">#{order._id.slice(-6)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">{order.customerName}</div>
                                            <div className="text-xs text-gray-500">{order.customerPhone}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-800">₹{order.totalAmount?.toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(order.status)}`}>
                                                {order.status?.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <Link to={`/orders/${order._id}`} className="text-blue-600 hover:text-blue-800 transition">
                                                👁️ View
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <PaginationControls
                        page={ordersPage}
                        totalPages={Math.ceil(ordersTotal / ordersLimit)}
                        onPageChange={setOrdersPage}
                        loading={ordersLoading}
                    />
                </>
            )}
        </div>
    );

    const renderInventory = () => (
        <div ref={inventoryRef} className="bg-white rounded-xl shadow-lg overflow-hidden scroll-mt-6">
            {selectedInventory ? (
                <div>
                    <div className="p-6 border-b flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-gray-800">
                            📦 {selectedInventory.product_id.name}
                        </h2>
                        <button
                            onClick={() => setSelectedInventory(null)}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition text-sm font-medium"
                        >
                            ← Back to Inventory
                        </button>
                    </div>
                    <div className="p-6 grid grid-cols-2 gap-6">
                        <div>
                            <p><span className="font-semibold">Category:</span> {selectedInventory.product_id.category}</p>
                            <p><span className="font-semibold">Price:</span> ₹{selectedInventory.product_id.price}</p>
                            <p><span className="font-semibold">Unit:</span> {selectedInventory.product_id.unit}</p>
                        </div>
                        <div>
                            <p><span className="font-semibold">Stock:</span> {selectedInventory.stock_quantity}</p>
                            <p><span className="font-semibold">Low Stock Threshold:</span> {selectedInventory.low_stock_threshold}</p>
                            <p><span className="font-semibold">Reorder Point:</span> {selectedInventory.reorder_point}</p>
                        </div>
                    </div>
                    <div className="p-6 border-t flex gap-3">
                        <button
                            onClick={() => openEditInventory(selectedInventory)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            ✏️ Edit Stock
                        </button>
                        <button
                            onClick={() => {
                                removeFromInventory(selectedInventory._id, selectedInventory.product_id.name);
                                setSelectedInventory(null);
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                        >
                            🗑️ Remove from Store
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="p-6 border-b flex flex-wrap justify-between items-center gap-3">
                        <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                            <h3 className="text-xl font-semibold text-gray-800">📦 Inventory</h3>
                            <input
                                type="text"
                                placeholder="🔍 Search products..."
                                value={productSearch}
                                onChange={(e) => {
                                    setProductSearch(e.target.value);
                                    setInvPage(1);
                                    setSelectedInventory(null);
                                }}
                                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-48"
                            />
                        </div>
                        <button
                            onClick={openAddInventory}
                            disabled={availableProducts.length === 0}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${availableProducts.length === 0
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                        >
                            + Add Product
                        </button>
                    </div>

                    {inventory.length === 0 && (
                        <div className="p-8 text-center text-gray-500">No products in inventory</div>
                    )}

                    {inventory.length > 0 && (
                        <>
                            {sortedInventory.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">No products match your search</div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th
                                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                                                        onClick={() => handleInventorySort('name')}
                                                    >
                                                        Product {getInventorySortIcon('name')}
                                                    </th>
                                                    <th
                                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                                                        onClick={() => handleInventorySort('category')}
                                                    >
                                                        Category {getInventorySortIcon('category')}
                                                    </th>
                                                    <th
                                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700"
                                                        onClick={() => handleInventorySort('stock')}
                                                    >
                                                        Stock {getInventorySortIcon('stock')}
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {paginatedInventory.map((item) => {
                                                    const product = item.product_id;
                                                    if (!product) return null;
                                                    const stock = item.stock_quantity || 0;
                                                    const threshold = item.low_stock_threshold || 10;
                                                    const isLowStock = stock <= threshold;
                                                    return (
                                                        <tr
                                                            key={item._id}
                                                            className="hover:bg-gray-50 transition cursor-pointer"
                                                            onClick={() => setSelectedInventory(item)}
                                                        >
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="font-medium text-gray-900">{product.name}</div>
                                                                <div className="text-xs text-gray-500">₹{product.price}</div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{product.category}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`font-semibold ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                                                                    {stock} {product.unit}
                                                                </span>
                                                                {isLowStock && (
                                                                    <span className="ml-2 text-xs text-red-500">(Low stock: {threshold})</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                {isLowStock ? (
                                                                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">⚠️ Low Stock</span>
                                                                ) : (
                                                                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">✅ In Stock</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        openEditInventory(item);
                                                                    }}
                                                                    className="text-blue-600 hover:text-blue-800 mr-3 transition"
                                                                >
                                                                    ✏️ Edit
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        removeFromInventory(item._id, product.name);
                                                                    }}
                                                                    className="text-red-600 hover:text-red-800 transition"
                                                                >
                                                                    🗑️ Remove
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <PaginationControls
                                        page={invPage}
                                        totalPages={totalInvPages}
                                        onPageChange={(newPage) => {
                                            setInvPage(newPage);
                                            setSelectedInventory(null);
                                        }}
                                        loading={false}
                                    />
                                </>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );

    // ─── MAIN ───
    return (
        <div className="flex min-h-screen bg-gray-100">
            <Sidebar />
            <main className="flex-1 p-6 overflow-y-auto max-h-screen overflow-y-scroll">
                {activeSection === 'store' && renderStore()}
                {activeSection === 'riders' && renderRiders()}
                {activeSection === 'orders' && renderOrders()}
                {activeSection === 'inventory' && renderInventory()}
            </main>

            {/* ─── MODAL ─── */}
            {showInventoryModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">
                            {editingInventory ? '✏️ Edit Stock' : '📦 Add Product to Inventory'}
                        </h2>
                        <form onSubmit={handleSubmitInventory} className="space-y-4">
                            {!editingInventory && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Product *</label>
                                    <select
                                        name="product_id"
                                        value={inventoryForm.product_id}
                                        onChange={handleInventoryChange}
                                        required
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    >
                                        <option value="">Select a product...</option>
                                        {availableProducts.map((p) => (
                                            <option key={p._id} value={p._id}>
                                                {p.name} - ₹{p.price} ({p.category})
                                            </option>
                                        ))}
                                    </select>
                                    {availableProducts.length === 0 && (
                                        <p className="text-sm text-amber-600 mt-1">
                                            All products are already in inventory or no products exist.
                                            <Link to="/products" className="text-blue-600 hover:underline ml-1">Create a product →</Link>
                                        </p>
                                    )}
                                </div>
                            )}
                            {editingInventory && (
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-sm text-gray-600"><span className="font-medium">Product:</span> {editingInventory.product_id.name}</p>
                                    <p className="text-sm text-gray-600"><span className="font-medium">Unit:</span> {editingInventory.product_id.unit}</p>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Stock Quantity {editingInventory && `(in ${editingInventory.product_id.unit})`} *
                                </label>
                                <input
                                    type="number"
                                    name="stock_quantity"
                                    value={inventoryForm.stock_quantity}
                                    onChange={handleInventoryChange}
                                    required
                                    min="0"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Threshold</label>
                                    <input
                                        type="number"
                                        name="low_stock_threshold"
                                        value={inventoryForm.low_stock_threshold}
                                        onChange={handleInventoryChange}
                                        min="0"
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Alert when stock falls below this</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Reorder Point</label>
                                    <input
                                        type="number"
                                        name="reorder_point"
                                        value={inventoryForm.reorder_point}
                                        onChange={handleInventoryChange}
                                        min="0"
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Auto-reorder when stock reaches this</p>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition"
                                >
                                    {saving ? 'Saving...' : editingInventory ? 'Update Stock' : 'Add to Inventory'}
                                </button>
                                <button
                                    type="button"
                                    onClick={closeInventoryModal}
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

export default StoreDetail;