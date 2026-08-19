import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import api from '../api/client';

// Fix default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function ZoneAssigner() {
    const [zones, setZones] = useState([]);
    const [stores, setStores] = useState([]);
    const [selectedZone, setSelectedZone] = useState(null);
    const [selectedStoreId, setSelectedStoreId] = useState('');
    const [loading, setLoading] = useState(false);

    // Fetch zones and stores
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [zonesRes, storesRes] = await Promise.all([
                    api.get('/zones'),
                    api.get('/stores/all_stores')
                ]);
                setZones(zonesRes.data.data || []);
                setStores(storesRes.data || []);
                console.log('✅ Zones loaded:', zonesRes.data.data?.length || 0);
                console.log('✅ Stores loaded:', storesRes.data?.length || 0);
            } catch (err) {
                console.error('❌ Failed to fetch data:', err);
                alert('Failed to load zones or stores. Check console for errors.');
            }
        };
        fetchData();
    }, []);

    // Assign store to zone
    const assignStore = async () => {
        if (!selectedZone) {
            alert('Please click a zone on the map first.');
            return;
        }
        if (!selectedStoreId) {
            alert('Please select a store from the dropdown.');
            return;
        }
        setLoading(true);
        try {
            await api.put(`/zones/${selectedZone._id}`, {
                storeId: selectedStoreId
            });
            alert('✅ Store assigned to zone successfully!');
            // Refresh zones
            const res = await api.get('/zones');
            setZones(res.data.data || []);
            setSelectedZone(null);
            setSelectedStoreId('');
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to assign store');
            console.error('Assign error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Zone style – blue unassigned, green assigned
    const getZoneStyle = (zone) => {
        const hasStore = !!zone.storeId;
        return {
            color: hasStore ? '#22c55e' : '#2563eb',
            weight: hasStore ? 2 : 1,
            fillColor: hasStore ? '#86efac' : '#93c5fd',
            fillOpacity: 0.2,
            dashArray: hasStore ? null : '5, 5'
        };
    };

    // Handle zone click – now also triggers a popup via onEachFeature
    const onZoneClick = (zone) => {
        setSelectedZone(zone);
        setSelectedStoreId(zone.storeId?._id || '');
    };

    // 👇 NEW: Bind popup to each zone showing the store name
    const onEachZone = (zone, layer) => {
        const storeName = zone.storeId?.name || 'Unassigned';
        const storeColor = zone.storeId ? '#22c55e' : '#6b7280';
        
        layer.bindPopup(`
            <div style="font-family: sans-serif; padding: 4px; min-width: 120px;">
                <strong style="font-size: 14px;">${zone.name}</strong><br />
                <span style="color: ${storeColor}; font-weight: 600;">
                    🏪 ${storeName}
                </span>
            </div>
        `);

        layer.on('click', () => onZoneClick(zone));
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">🗺️ Assign Stores to Zones</h1>
                    <div className="text-sm text-gray-500">
                        {zones.filter(z => z.storeId).length} / {zones.length} zones assigned
                    </div>
                </div>

                {/* Map – with floating controls */}
                <div className="bg-white rounded-xl shadow overflow-hidden h-[600px] relative">
                    <MapContainer
                        center={[12.95, 77.6]}
                        zoom={11}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer
                            attribution='© OpenStreetMap contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {/* Render zones with popups */}
                        {zones.map(zone => (
                            <GeoJSON
                                key={zone._id}
                                data={zone.boundary}
                                style={getZoneStyle(zone)}
                                onEachFeature={(feature, layer) => onEachZone(zone, layer)}
                            />
                        ))}

                        {/* Render stores */}
                        {stores.map(store => (
                            <Marker
                                key={store._id}
                                position={[
                                    store.location?.coordinates?.[1] || 0,
                                    store.location?.coordinates?.[0] || 0
                                ]}
                            >
                                <Popup>
                                    <strong>{store.name}</strong><br />
                                    {store.address}
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>

                    {/* 🚀 Floating assignment form – always visible over the map */}
                    <div className="absolute bottom-4 left-4 right-4 bg-white rounded-xl shadow-2xl p-4 border border-gray-200 z-[1000]">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                                    Selected Zone
                                </label>
                                <div className="border rounded-lg px-4 py-2 bg-gray-50 text-gray-800 text-sm h-10 flex items-center">
                                    {selectedZone ? selectedZone.name : 'Click a zone on the map'}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                                    Assign Store
                                </label>
                                <select
                                    value={selectedStoreId}
                                    onChange={(e) => setSelectedStoreId(e.target.value)}
                                    disabled={!selectedZone}
                                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white h-10 text-sm"
                                >
                                    <option value="">Choose a store...</option>
                                    {stores.map(store => (
                                        <option key={store._id} value={store._id}>
                                            {store.name} ({store.address})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <button
                                    onClick={assignStore}
                                    disabled={loading || !selectedZone || !selectedStoreId}
                                    className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition h-10 font-medium"
                                >
                                    {loading ? 'Saving...' : '💾 Assign Store'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 📌 Legend floating at top-left */}
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow border border-gray-200 text-xs space-y-1 z-[1000]">
                        <div className="flex items-center gap-2"><span className="w-4 h-3 bg-green-300 border border-green-500"></span> Assigned</div>
                        <div className="flex items-center gap-2"><span className="w-4 h-3 bg-blue-200 border border-blue-500 border-dashed"></span> Unassigned</div>
                        <div className="flex items-center gap-2">📍 Click a zone to see details</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ZoneAssigner;