import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import Select from 'react-select';
import api from '../api/client';

// Fix default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function Zones() {
    const [stores, setStores] = useState([]);
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedStoreId, setSelectedStoreId] = useState('');
    const [bbox, setBbox] = useState({
        north: 13.15,
        south: 12.3,
        east: 77.86,
        west: 77.47,
        cellSize: 0.01
    });
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [showFill, setShowFill] = useState(false); // 👈 Toggle fill
    const mapRef = useRef(null);

    // Fetch stores and zones
    useEffect(() => {
        const fetchStores = async () => {
            const res = await api.get('/stores/all_stores');
            setStores(res.data || []);
        };
        const fetchZones = async () => {
            try {
                const res = await api.get('/zones');
                setZones(res.data.data || []);
                console.log(`✅ Loaded ${res.data.data?.length || 0} zones`);
            } catch (err) {
                console.error('Failed to fetch zones:', err);
            }
        };
        fetchStores();
        fetchZones();
    }, []);

    // Generate zones
    const generateZones = async () => {
        if (!selectedStoreId) {
            alert('Please select a store for the zones.');
            return;
        }
        setLoading(true);
        try {
            await api.post('/zones/generate', {
                storeId: selectedStoreId,
                ...bbox,
                cellSize: parseFloat(bbox.cellSize)
            });
            alert('✅ Zones generated successfully!');
            const res = await api.get('/zones');
            setZones(res.data.data || []);
            setShowGenerateModal(false);
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to generate zones');
        } finally {
            setLoading(false);
        }
    };

    // Create store at clicked location
    const handleMapClick = async (e) => {
        const { lat, lng } = e.latlng;
        const name = prompt('Enter store name:');
        if (!name) return;
        const address = prompt('Enter store address:');
        if (!address) return;

        try {
            await api.post('/stores/all_stores', {
                name,
                address,
                location: {
                    type: 'Point',
                    coordinates: [lng, lat]
                }
            });
            alert('✅ Store created!');
            const res = await api.get('/stores/all_stores');
            setStores(res.data || []);
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to create store');
        }
    };

    // Handle map click only if modal is not open
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        const handleClick = (e) => {
            if (!showGenerateModal) {
                handleMapClick(e);
            }
        };
        map.on('click', handleClick);
        return () => {
            map.off('click', handleClick);
        };
    }, [showGenerateModal]);

    const storeOptions = stores.map(s => ({ value: s._id, label: s.name }));

    // ✅ GeoJSON style – toggle fill on/off
    const getPolygonStyle = () => {
        return {
            color: '#2563eb',           // blue border
            weight: 1.5,                // border thickness
            fillColor: '#93c5fd',       // light blue fill
            fillOpacity: showFill ? 0.15 : 0, // 0 = transparent, 0.15 = semi-transparent
        };
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">🗺️ Zone Management</h1>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                                type="checkbox"
                                checked={showFill}
                                onChange={(e) => setShowFill(e.target.checked)}
                            />
                            Show Fill
                        </label>
                        <button
                            onClick={() => setShowGenerateModal(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        >
                            + Generate Zones
                        </button>
                    </div>
                </div>

                {/* Map */}
                <div className="bg-white rounded-xl shadow overflow-hidden h-[600px] relative">
                    <MapContainer
                        center={[12.95, 77.6]}
                        zoom={11}
                        style={{ height: '100%', width: '100%' }}
                        ref={mapRef}
                        whenReady={() => console.log('Map ready')}
                    >
                        <TileLayer
                            attribution='© OpenStreetMap contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {/* Render zones */}
                        {zones.map(zone => {
                            if (!zone.boundary || !zone.boundary.coordinates) {
                                console.warn('Invalid zone:', zone._id);
                                return null;
                            }
                            return (
                                <GeoJSON
                                    key={zone._id}
                                    data={zone.boundary}
                                    style={getPolygonStyle()}
                                    // Optional: add interactivity
                                    eventHandlers={{
                                        click: () => console.log(`Clicked zone ${zone.name}`),
                                    }}
                                />
                            );
                        })}

                        {/* Render stores */}
                        {stores.map(store => (
                            <Marker
                                key={store._id}
                                position={[
                                    store.location.coordinates[1],
                                    store.location.coordinates[0]
                                ]}
                            >
                                <Popup>
                                    <strong>{store.name}</strong><br />
                                    {store.address}
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                    <div className="absolute bottom-2 left-2 bg-white p-2 rounded shadow text-sm text-gray-500">
                        Click on map to create a store. Zones: {zones.length}
                    </div>
                </div>

                {/* Generate Zones Modal */}
                {showGenerateModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6">
                                🔲 Generate Equal Zones
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Assign to Store
                                    </label>
                                    <Select
                                        options={storeOptions}
                                        value={storeOptions.find(opt => opt.value === selectedStoreId)}
                                        onChange={(option) => setSelectedStoreId(option ? option.value : '')}
                                        placeholder="Select a store..."
                                        isClearable
                                        menuPortalTarget={document.body}
                                        styles={{
                                            menuPortal: (provided) => ({ ...provided, zIndex: 9999 }),
                                            menu: (provided) => ({ ...provided, zIndex: 9999 })
                                        }}
                                        className="w-full"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">North (latitude)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={bbox.north}
                                            onChange={(e) => setBbox({ ...bbox, north: parseFloat(e.target.value) })}
                                            className="w-full border rounded-lg px-4 py-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">South (latitude)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={bbox.south}
                                            onChange={(e) => setBbox({ ...bbox, south: parseFloat(e.target.value) })}
                                            className="w-full border rounded-lg px-4 py-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">East (longitude)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={bbox.east}
                                            onChange={(e) => setBbox({ ...bbox, east: parseFloat(e.target.value) })}
                                            className="w-full border rounded-lg px-4 py-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">West (longitude)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={bbox.west}
                                            onChange={(e) => setBbox({ ...bbox, west: parseFloat(e.target.value) })}
                                            className="w-full border rounded-lg px-4 py-2"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cell Size (degrees, ~1.1 km per 0.01)</label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        value={bbox.cellSize}
                                        onChange={(e) => setBbox({ ...bbox, cellSize: parseFloat(e.target.value) })}
                                        className="w-full border rounded-lg px-4 py-2"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4 border-t">
                                    <button
                                        onClick={generateZones}
                                        disabled={loading}
                                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
                                    >
                                        {loading ? 'Generating...' : 'Generate Zones'}
                                    </button>
                                    <button
                                        onClick={() => setShowGenerateModal(false)}
                                        className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Zones;