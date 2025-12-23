import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import EmployeeList from '../components/EmployeeList';
import PayrollForm from '../components/PayrollForm';
import AttendancePanel from '../components/AttendancePanel';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    // State
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [attendanceMap, setAttendanceMap] = useState({});

    // Fetch employees from backend with fallback to mock data
    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const res = await fetch('/api/employees');
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                setEmployees(Array.isArray(data) ? data : []);
            } catch (error) {
                console.warn('Failed to fetch employees from /api/employees, using mock data. Error:', error);
                const mockEmployees = [
                    { employeeId: 'EMP001', fullName: 'John Doe', email: 'john@example.com', payroll: { basicPay: 50000, hra: 20000, allowances: 5000, tax: 5 } },
                    { employeeId: 'EMP002', fullName: 'Jane Smith', email: 'jane@example.com', payroll: { basicPay: 60000, hra: 25000, allowances: 6000, tax: 6 } },
                    { employeeId: 'EMP003', fullName: 'Robert Johnson', email: 'robert@example.com', payroll: { basicPay: 55000, hra: 22000, allowances: 5500, tax: 5.5 } },
                    { employeeId: 'EMP004', fullName: 'Emily Davis', email: 'emily@example.com', payroll: { basicPay: 48000, hra: 19000, allowances: 4800, tax: 4.5 } },
                ];
                setEmployees(mockEmployees);
            } finally {
                setLoading(false);
            }
        };

        fetchEmployees();
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleEmployeeSelect = (employee) => {
        setSelectedEmployee(employee);
    };

    const handlePayrollUpdate = (employeeId, payrollData) => {
        // Here we would send a PUT request to the backend
        console.log(`Updating payroll for ${employeeId}:`, payrollData);

        // Optimistic UI update
        const updatedEmployees = employees.map(emp =>
            emp.employeeId === employeeId ? { ...emp, payroll: payrollData } : emp
        );
        setEmployees(updatedEmployees);
        // Also update selected employee to reflect changes immediately in UI if needed
        setSelectedEmployee({ ...selectedEmployee, payroll: payrollData });

        alert("Payroll details updated successfully! (Mocked)");
    };

    const handleMarkAttendance = async (employeeId, date, status) => {
        // Optimistic update in local attendance map
        setAttendanceMap(prev => {
            const emp = { ...(prev[employeeId] || {}), [date]: status };
            return { ...prev, [employeeId]: emp };
        });

        // Attempt to POST to backend; if unavailable, just log and continue
        try {
            const res = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employeeId, date, status })
            });
            if (!res.ok) {
                console.warn('Attendance API responded with non-OK status', res.status);
            }
        } catch (err) {
            console.warn('Failed to POST attendance to /api/attendance (backend may not be configured).', err);
        }
    };

    // Fetch attendance for selected employee (current month) and populate attendanceMap
    useEffect(() => {
        if (!selectedEmployee) return;

        const fetchAttendance = async () => {
            try {
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const monthStr = `${year}-${month}`;
                const res = await fetch(`/api/attendance?employeeId=${encodeURIComponent(selectedEmployee.employeeId)}&month=${monthStr}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();

                let statuses = {};
                if (Array.isArray(data)) {
                    data.forEach(item => {
                        if (item.date && item.status) statuses[item.date] = item.status;
                    });
                } else if (data && typeof data === 'object') {
                    statuses = data;
                }

                setAttendanceMap(prev => ({ ...prev, [selectedEmployee.employeeId]: statuses }));
            } catch (err) {
                console.warn('Could not fetch attendance for', selectedEmployee.employeeId, err);
            }
        };

        fetchAttendance();
    }, [selectedEmployee]);

    if (loading) {
        return (
            <div style={{ padding: '40px 20px' }} className="fade-in">
                <div className="container">
                    <h2>Loading...</h2>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '40px 20px' }} className="fade-in">
            <div className="container">
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '30px',
                    paddingBottom: '20px',
                    borderBottom: '1px solid var(--border-color)'
                }}>
                    <div>
                        <h1 className="title-gradient" style={{ fontSize: '2rem' }}>Admin Portal</h1>
                        <p style={{ color: 'var(--text-muted)' }}>Manage employees, payroll, and attendance</p>
                    </div>
                    <Button onClick={handleLogout} variant="secondary">Sign Out</Button>
                </div>

                <div className="admin-dashboard-container">
                    {/* Left Panel: Employee List */}
                    <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <EmployeeList
                            employees={employees}
                            onSelect={handleEmployeeSelect}
                            selectedEmployeeId={selectedEmployee?.employeeId}
                        />
                    </div>

                    {/* Right Panel: Details & Actions */}
                    <div className="details-panel">
                        {selectedEmployee ? (
                            <>
                                <PayrollForm
                                    employee={selectedEmployee}
                                    onUpdate={handlePayrollUpdate}
                                />
                                <AttendancePanel
                                    employee={selectedEmployee}
                                    onMarkAttendance={handleMarkAttendance}
                                    initialStatuses={attendanceMap[selectedEmployee.employeeId] || {}}
                                />
                            </>
                        ) : (
                            <div className="glass-panel" style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '100%',
                                color: 'var(--text-muted)',
                                flexDirection: 'column'
                            }}>
                                <span style={{ fontSize: '3rem', marginBottom: '15px' }}>👈</span>
                                <h3>Select an employee to manage</h3>
                                <p>Click on an employee from the list to view details.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
