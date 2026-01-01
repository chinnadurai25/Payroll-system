import React, { useState, useEffect, useCallback } from 'react';
import Button from './Button';

const SiteAssignment = ({ employees }) => {
    const [locations, setLocations] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('');
    const [date, setDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const fetchLocations = useCallback(async () => {
        try {
            const res = await fetch('http://192.168.1.7:5001/api/locations');
            const data = await res.json();
            setLocations(data);
        } catch (err) {
            console.error('Error fetching locations:', err);
        }
    }, []);

    const fetchAssignments = useCallback(async () => {
        try {
            const res = await fetch(`http://192.168.1.7:5001/api/site-assignments?date=${date}`);
            const data = await res.json();
            setAssignments(data);
        } catch (err) {
            console.error('Error fetching assignments:', err);
        }
    }, [date]);

    useEffect(() => {
        fetchLocations();
        fetchAssignments();
    }, [fetchLocations, fetchAssignments]);

    const handleAssign = async (e) => {
        e.preventDefault();
        if (!selectedEmployee || !selectedLocation) {
            setMessage('Please select both employee and location.');
            return;
        }

        setLoading(true);
        setMessage('');
        try {
            const res = await fetch('http://192.168.1.7:5001/api/site-assignments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeId: selectedEmployee,
                    locationId: selectedLocation,
                    date: date
                })
            });
            if (res.ok) {
                setMessage('Assignment saved!');
                fetchAssignments();
            } else {
                setMessage('Error saving assignment.');
            }
        } catch (err) {
            setMessage('Server error.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{
                background: '#fff',
                padding: '25px',
                borderRadius: '12px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                border: '1px solid #eef2f6'
            }}>
                <h3 style={{ margin: '0 0 20px 0', color: 'var(--primary)', borderBottom: '2px solid #f0f7ff', paddingBottom: '10px' }}>
                    📅 Assign Site for {date}
                </h3>
                <form onSubmit={handleAssign} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)' }}>Select Employee</label>
                        <select
                            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}
                            value={selectedEmployee}
                            onChange={(e) => setSelectedEmployee(e.target.value)}
                        >
                            <option value="">-- Select Employee --</option>
                            {employees.map(emp => (
                                <option key={emp.employeeId} value={emp.employeeId}>
                                    {emp.fullName} ({emp.employeeId})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)' }}>Select Location</label>
                        <select
                            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                        >
                            <option value="">-- Select Location --</option>
                            {locations.map(loc => (
                                <option key={loc._id} value={loc._id}>
                                    {loc.name} ({loc.type})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)' }}>Date</label>
                        <input
                            type="date"
                            style={{ padding: '11px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>

                    <Button type="submit" loading={loading}>
                        Assign Site
                    </Button>
                </form>
                {message && <div style={{ marginTop: '15px', padding: '10px', borderRadius: '6px', background: message.includes('Error') ? '#fee2e2' : '#dcfce7', color: message.includes('Error') ? '#b91c1c' : '#15803d', fontSize: '0.9rem' }}>{message}</div>}
            </div>

            <div style={{
                background: '#fff',
                padding: '25px',
                borderRadius: '12px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                border: '1px solid #eef2f6'
            }}>
                <h3 style={{ margin: '0 0 20px 0', color: 'var(--primary)', borderBottom: '2px solid #f0f7ff', paddingBottom: '10px' }}>
                    📋 Assignments for {date}
                </h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '2px solid #edf2f7' }}>
                            <tr>
                                <th style={{ padding: '12px' }}>Employee</th>
                                <th style={{ padding: '12px' }}>Location</th>
                                <th style={{ padding: '12px' }}>Type</th>
                                <th style={{ padding: '12px' }}>Coordinates</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assignments.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No assignments for this date.</td>
                                </tr>
                            ) : (
                                assignments.map(asgn => (
                                    <tr key={asgn._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px', fontWeight: '600' }}>
                                            {employees.find(e => e.employeeId === asgn.employeeId)?.fullName || asgn.employeeId}
                                        </td>
                                        <td style={{ padding: '12px' }}>{asgn.locationId?.name}</td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '20px',
                                                fontSize: '0.8rem',
                                                background: asgn.locationId?.type === 'office' ? '#e0f2fe' : '#fef3c7',
                                                color: asgn.locationId?.type === 'office' ? '#0369a1' : '#92400e',
                                                textTransform: 'capitalize'
                                            }}>
                                                {asgn.locationId?.type}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', fontSize: '0.85rem', color: '#64748b' }}>
                                            {asgn.locationId?.latitude}, {asgn.locationId?.longitude}
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

export default SiteAssignment;
