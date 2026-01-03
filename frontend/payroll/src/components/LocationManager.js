import React, { useState, useEffect } from 'react';
import Button from './Button';
import Input from './Input';

const LocationManager = () => {
    const [locations, setLocations] = useState([]);
    const [newLocation, setNewLocation] = useState({
        name: '',
        latitude: '',
        longitude: '',
        radius: 100,
        type: 'office'
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [editingLocation, setEditingLocation] = useState(null);
    const [gettingLocation, setGettingLocation] = useState(false);

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        try {
            const res = await fetch('http://localhost:5001/api/locations');
            const data = await res.json();
            setLocations(data);
        } catch (err) {
            console.error('Error fetching locations:', err);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            const res = await fetch('http://localhost:5001/api/locations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newLocation)
            });
            if (res.ok) {
                setMessage('Location added successfully!');
                setNewLocation({ name: '', latitude: '', longitude: '', radius: 100, type: 'office' });
                fetchLocations();
            } else {
                const errorData = await res.json();
                setMessage(`Error adding location: ${errorData.error || 'Unknown error'}`);
            }
        } catch (err) {
            setMessage('Server error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this location?')) return;
        try {
            await fetch(`http://localhost:5001/api/locations/${id}`, { method: 'DELETE' });
            fetchLocations();
        } catch (err) {
            console.error('Error deleting location:', err);
        }
    };

    const handleGetCurrentLocation = () => {
        setGettingLocation(true);
        setMessage('');
        
        if (!navigator.geolocation) {
            setMessage('Geolocation is not supported by your browser.');
            setGettingLocation(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setNewLocation({
                    ...newLocation,
                    latitude: position.coords.latitude.toFixed(6),
                    longitude: position.coords.longitude.toFixed(6)
                });
                setMessage('✅ Current location captured! Verify coordinates and add location.');
                setGettingLocation(false);
            },
            (error) => {
                setMessage(`❌ Error getting location: ${error.message}. Please allow location access.`);
                setGettingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    const handleEdit = (location) => {
        setEditingLocation(location);
        setNewLocation({
            name: location.name,
            latitude: location.latitude.toString(),
            longitude: location.longitude.toString(),
            radius: location.radius,
            type: location.type
        });
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!editingLocation) return;
        
        setLoading(true);
        setMessage('');
        try {
            // First delete old location
            await fetch(`http://localhost:5001/api/locations/${editingLocation._id}`, { method: 'DELETE' });
            
            // Then create new one
            const res = await fetch('http://localhost:5001/api/locations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newLocation)
            });
            
            if (res.ok) {
                setMessage('Location updated successfully!');
                setNewLocation({ name: '', latitude: '', longitude: '', radius: 100, type: 'office' });
                setEditingLocation(null);
                fetchLocations();
            } else {
                const errorData = await res.json();
                setMessage(`Error updating location: ${errorData.error || 'Unknown error'}`);
            }
        } catch (err) {
            setMessage('Server error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingLocation(null);
        setNewLocation({ name: '', latitude: '', longitude: '', radius: 100, type: 'office' });
        setMessage('');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Add New Location */}
            <div style={{
                background: '#fff',
                padding: '25px',
                borderRadius: '12px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                border: '1px solid #eef2f6'
            }}>
                <h3 style={{ margin: '0 0 20px 0', color: 'var(--primary)', borderBottom: '2px solid #f0f7ff', paddingBottom: '10px' }}>
                    {editingLocation ? '✏️ Edit Location' : '📍 Add New Location'}
                </h3>
                <form onSubmit={editingLocation ? handleUpdate : handleAdd} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    <Input
                        label="Location Name"
                        value={newLocation.name}
                        onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                        required
                        placeholder="e.g. Head Office"
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)' }}>Latitude</label>
                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                            <input
                                type="number"
                                step="any"
                                value={newLocation.latitude}
                                onChange={(e) => setNewLocation({ ...newLocation, latitude: e.target.value })}
                                required
                                placeholder="e.g. 12.9716"
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    backgroundColor: '#f8fafc',
                                    outline: 'none'
                                }}
                            />
                            {newLocation.latitude && newLocation.longitude && (
                                <a
                                    href={`https://www.google.com/maps?q=${newLocation.latitude},${newLocation.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        padding: '12px',
                                        background: '#3b82f6',
                                        color: 'white',
                                        borderRadius: '8px',
                                        textDecoration: 'none',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        whiteSpace: 'nowrap'
                                    }}
                                    title="View on Google Maps"
                                >
                                    🗺️ Map
                                </a>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)' }}>Longitude</label>
                        <Input
                            type="number"
                            step="any"
                            value={newLocation.longitude}
                            onChange={(e) => setNewLocation({ ...newLocation, longitude: e.target.value })}
                            required
                            placeholder="e.g. 77.5946"
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)' }}>Get Current Location</label>
                        <button
                            type="button"
                            onClick={handleGetCurrentLocation}
                            disabled={gettingLocation}
                            style={{
                                padding: '12px',
                                background: gettingLocation ? '#9ca3af' : '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: gettingLocation ? 'not-allowed' : 'pointer',
                                fontWeight: '600',
                                fontSize: '0.9rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}
                        >
                            {gettingLocation ? '⏳ Getting...' : '📍 Get My Current Location'}
                        </button>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                            Click to automatically fill coordinates from your current GPS location
                        </p>
                    </div>
                    <Input
                        label="Radius (meters)"
                        type="number"
                        value={newLocation.radius}
                        onChange={(e) => setNewLocation({ ...newLocation, radius: e.target.value })}
                        required
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)' }}>Location Type</label>
                        <select
                            style={{
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                backgroundColor: '#f8fafc',
                                outline: 'none'
                            }}
                            value={newLocation.type}
                            onChange={(e) => setNewLocation({ ...newLocation, type: e.target.value })}
                        >
                            <option value="office">Office</option>
                            <option value="client">Client / Site</option>
                        </select>
                    </div>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                        {editingLocation && (
                            <Button 
                                type="button" 
                                onClick={handleCancelEdit}
                                style={{ width: '150px', background: '#6b7280' }}
                            >
                                Cancel
                            </Button>
                        )}
                        <Button type="submit" loading={loading} style={{ width: '200px' }}>
                            {editingLocation ? 'Update Location' : 'Add Location'}
                        </Button>
                    </div>
                </form>
                {message && <div style={{ marginTop: '15px', padding: '10px', borderRadius: '6px', background: message.includes('Error') ? '#fee2e2' : '#dcfce7', color: message.includes('Error') ? '#b91c1c' : '#15803d', fontSize: '0.9rem' }}>{message}</div>}
            </div>

            {/* Location List */}
            <div style={{
                background: '#fff',
                padding: '25px',
                borderRadius: '12px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                border: '1px solid #eef2f6'
            }}>
                <h3 style={{ margin: '0 0 20px 0', color: 'var(--primary)', borderBottom: '2px solid #f0f7ff', paddingBottom: '10px' }}>
                    🏢 Managed Locations
                </h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '2px solid #edf2f7' }}>
                            <tr>
                                <th style={{ padding: '12px' }}>Name</th>
                                <th style={{ padding: '12px' }}>Type</th>
                                <th style={{ padding: '12px' }}>Coordinates</th>
                                <th style={{ padding: '12px' }}>Radius</th>
                                <th style={{ padding: '12px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {locations.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No locations configured yet.</td>
                                </tr>
                            ) : (
                                locations.map(loc => (
                                    <tr key={loc._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px', fontWeight: '600' }}>{loc.name}</td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '20px',
                                                fontSize: '0.8rem',
                                                background: loc.type === 'office' ? '#e0f2fe' : '#fef3c7',
                                                color: loc.type === 'office' ? '#0369a1' : '#92400e',
                                                textTransform: 'capitalize'
                                            }}>
                                                {loc.type}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', fontSize: '0.85rem', color: '#64748b' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span>{loc.latitude.toFixed(6)}, {loc.longitude.toFixed(6)}</span>
                                                <a
                                                    href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        color: '#3b82f6',
                                                        textDecoration: 'none',
                                                        fontSize: '0.8rem',
                                                        fontWeight: '600'
                                                    }}
                                                    title="View on Google Maps"
                                                >
                                                    🗺️
                                                </a>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px' }}>{loc.radius}m</td>
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                <button
                                                    onClick={() => handleEdit(loc)}
                                                    style={{ 
                                                        border: 'none', 
                                                        background: '#3b82f6', 
                                                        color: 'white', 
                                                        cursor: 'pointer', 
                                                        fontSize: '0.85rem', 
                                                        fontWeight: '600',
                                                        padding: '6px 12px',
                                                        borderRadius: '6px'
                                                    }}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(loc._id)}
                                                    style={{ 
                                                        border: 'none', 
                                                        background: 'none', 
                                                        color: '#ef4444', 
                                                        cursor: 'pointer', 
                                                        fontSize: '0.9rem', 
                                                        fontWeight: '600' 
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default LocationManager;
