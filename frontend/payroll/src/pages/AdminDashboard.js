import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import EmployeeList from '../components/EmployeeList';
import PayrollForm from '../components/PayrollForm';
import AttendancePanel from '../components/AttendancePanel';
import SalarySlip from '../components/SalarySlip';
import LeaveBalancePanel from '../components/LeaveBalancePanel';
import LocationManager from '../components/LocationManager';
import SiteAssignment from '../components/SiteAssignment';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
    // State
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [attendanceMap, setAttendanceMap] = useState({});
    const [viewingMonth, setViewingMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [searchParams, setSearchParams] = useSearchParams();
    const viewMode = searchParams.get('v') || 'config'; // 'config' or 'slip'
    const [pendingPayrollData, setPendingPayrollData] = useState(null);
    const [payslipData, setPayslipData] = useState(null);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [attendanceRefreshKey, setAttendanceRefreshKey] = useState(0);
    const { logout } = useAuth();
    const navigate = useNavigate();

    const { user } = useAuth();

    useEffect(() => {
        if (!user || user.role !== "admin") {
            navigate("/login");
        }
    }, [user, navigate]);


    // Poll for pending leaves count
    useEffect(() => {
        const fetchPendingCount = async () => {
            try {
                const res = await fetch('http://192.168.1.7:5001/api/leaves/pending-count');
                if (res.ok) {
                    const data = await res.json();
                    setPendingLeaveCount(data.count);
                }
            } catch (err) {
                console.warn('Failed to fetch pending leave count');
            }
        };

        fetchPendingCount();
        const interval = setInterval(fetchPendingCount, 15000); // 15s poll
        return () => clearInterval(interval);
    }, []);

    // Fetch Leave Requests (Real Backend)
    useEffect(() => {
        if (viewMode === 'leaves') {
            const fetchLeaves = async () => {
                try {
                    const res = await fetch('http://192.168.1.7:5001/api/leaves');
                    if (res.ok) {
                        const data = await res.json();
                        setLeaveRequests(data);
                        // Update count as well
                        const pending = data.filter(l => l.status === 'Pending').length;
                        setPendingLeaveCount(pending);
                    } else {
                        console.error('Failed to fetch leaves');
                    }
                } catch (err) {
                    console.error('Error fetching leaves:', err);
                }
            };
            fetchLeaves();
        }
    }, [viewMode]);

    const handleLeaveAction = async (id, status) => {
        // Optimistic update
        setLeaveRequests(prev => prev.map(req => req._id === id ? { ...req, status } : req));

        // Decrease count if resolving a pending request
        const request = leaveRequests.find(r => r._id === id);
        if (request && request.status === 'Pending' && status !== 'Pending') {
            setPendingLeaveCount(prev => Math.max(0, prev - 1));
        }

        try {
            const res = await fetch(`http://192.168.1.7:5001/api/leaves/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (!res.ok) {
                // Revert optimistic update if failed
                console.error('Update failed');
                // You might want to re-fetch here
            } else {
                // If the leave is for the selected employee, refresh attendance
                if (request.employeeId === selectedEmployee?.employeeId) {
                    setAttendanceRefreshKey(prev => prev + 1);
                }
            }
        } catch (err) {
            console.warn('Backend update failed for leave request', err);
        }
    };

    const handleLeaveDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this leave request?')) return;

        try {
            const res = await fetch(`http://192.168.1.7:5001/api/leaves/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setLeaveRequests(prev => prev.filter(req => req._id !== id));
                // Update pending count if it was pending
                const request = leaveRequests.find(r => r._id === id);
                if (request && request.status === 'Pending') {
                    setPendingLeaveCount(prev => Math.max(0, prev - 1));
                }
            } else {
                alert('Failed to delete leave request');
            }
        } catch (err) {
            console.error('Delete leave error:', err);
        }
    };


    const filteredEmployees = employees.filter(emp =>
        (emp.fullName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (emp.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (emp.employeeId?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    // If user uses browser navigation (back/forward), force logout for safety
    useEffect(() => {
        const handlePop = () => {
            try {
                logout();
            } finally {
                navigate('/login');
            }
        };

        window.addEventListener('popstate', handlePop);
        return () => window.removeEventListener('popstate', handlePop);
    }, [logout, navigate]);

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const res = await fetch('http://192.168.1.7:5001/api/employees');
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                setEmployees(Array.isArray(data) ? data : []);
            } catch (error) {
                console.warn('Failed to fetch employees from /api/employees');
                setEmployees([]);
            } finally {
                setLoading(false);
            }
        };

        fetchEmployees();
    }, []);

    const handleEmployeeSelect = async (employee) => {
        try {
            const res = await fetch(
                `http://192.168.1.7:5001/api/employees/${employee.employeeId}`
            );

            if (!res.ok) {
                throw new Error("Failed to fetch employee");
            }

            const fullEmployee = await res.json();
            setSelectedEmployee(fullEmployee);
        } catch (err) {
            console.error("Failed to fetch employee details", err);
        }
    };

    const handlePayrollUpdate = async (employeeId, payrollData) => {
        const [year, month] = viewingMonth.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();


        const empAttendance = attendanceMap[employeeId] || {};

        let presentDays = 0;
        Object.values(empAttendance).forEach(status => {
            if (status === "P") presentDays++;
        });


        const gross =
            (+payrollData.basicSalary || 0) +
            (+payrollData.hra || 0) +
            (+payrollData.splAllowance || 0) +
            (+payrollData.travelAllowance || 0) +
            (+payrollData.allowances || 0) +
            (+payrollData.bonus || 0) +
            (+payrollData.insteadDue || 0);


        const proRatedGross = (gross / daysInMonth) * presentDays;
        const taxAmount = proRatedGross * ((+payrollData.tax || 0) / 100);
        const pfAmount = parseFloat(payrollData.pf) || 0;
        const netSalary = proRatedGross - taxAmount - pfAmount;

        const payslipPayload = {
            employeeId,
            month: viewingMonth,

            earnings: {
                basicSalary: payrollData.basicSalary,
                hra: payrollData.hra,
                splAllowance: payrollData.splAllowance,
                travelAllowance: payrollData.travelAllowance,
                allowances: payrollData.allowances,
                bonus: payrollData.bonus,
                insteadDue: payrollData.insteadDue
            },

            deductions: {
                taxPercent: payrollData.tax,
                taxAmount,
                pf: payrollData.pf
            },

            attendance: {
                totalDays: daysInMonth,
                presentDays
            },

            grossSalary: proRatedGross,
            netSalary
        };

        await fetch("http://192.168.1.7:5001/api/payslip", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payslipPayload)
        });

        setPayslipData(payslipPayload);
        setPendingPayrollData(payrollData);
        setSearchParams({ v: "slip" });
    };


    const handleMarkAttendance = async (employeeId, date, status) => {
        // Optimistic update in local attendance map
        setAttendanceMap(prev => {
            const emp = { ...(prev[employeeId] || {}), [date]: status };
            return { ...prev, [employeeId]: emp };
        });

        // Attempt to POST to backend; if unavailable, just log and continue
        try {
            const res = await fetch('http://192.168.1.7:5001/api/attendance', {
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

    // Fetch attendance for selected employee (for the viewingMonth) and populate attendanceMap
    useEffect(() => {
        if (!selectedEmployee) return;

        const fetchAttendance = async () => {
            try {
                const res = await fetch(`http://192.168.1.7:5001/api/attendance?employeeId=${encodeURIComponent(selectedEmployee.employeeId)}&month=${viewingMonth}`);
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
                // Clear map if fetch fails or backend doesn't support it yet
                setAttendanceMap(prev => ({ ...prev, [selectedEmployee.employeeId]: {} }));
            }
        };

        const fetchPayslip = async () => {
            try {
                const res = await fetch(`http://192.168.1.7:5001/api/payslip?employeeId=${encodeURIComponent(selectedEmployee.employeeId)}&month=${viewingMonth}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                setPayslipData(data);
            } catch (err) {
                console.warn('Could not fetch payslip for', selectedEmployee.employeeId, err);
                setPayslipData(null);
            }
        };

        fetchAttendance();
        fetchPayslip();
    }, [selectedEmployee, viewingMonth, attendanceRefreshKey]);

    const handleUpdateLeaveBalances = async (employeeId, balances) => {
        try {
            const res = await fetch(`http://192.168.1.7:5001/api/employees/${employeeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leaveBalances: balances })
            });

            if (!res.ok) throw new Error("Failed to update leave balances");

            const updatedEmployee = await res.json();

            // Update local state
            setSelectedEmployee(updatedEmployee);
            setEmployees(prev => prev.map(emp => emp.employeeId === employeeId ? updatedEmployee : emp));

            alert("Leave balances updated successfully");
        } catch (err) {
            console.error(err);
            alert("Failed to update leave balances");
        }
    };

    const handleDeleteEmployee = async (employee) => {
        const confirmDelete = window.confirm(
            `Are you sure you want to delete ${employee.fullName}? This action cannot be undone.`
        );

        if (!confirmDelete) return;

        try {
            const res = await fetch(
                `http://192.168.1.7:5001/api/employees/${employee.employeeId}`,
                {
                    method: "DELETE"
                }
            );

            if (!res.ok) throw new Error("Delete failed");

            // Remove employee from UI list
            setEmployees(prev =>
                prev.filter(emp => emp.employeeId !== employee.employeeId)
            );

            // Clear selected employee
            setSelectedEmployee(null);

            alert("Employee deleted successfully");
        } catch (err) {
            console.error(err);
            alert("Failed to delete employee");
        }
    };


    if (loading) {
        return (
            < div className="admin-page fade-in">
                <div className="container admin-container">

                    <h2>Loading...</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page fade-in">
            <div className="container admin-container">

                <div className="admin-header no-print">
                    <div>
                        <h1 className="title-gradient" style={{ fontSize: '2.5rem', marginBottom: '5px' }}>Admin Dashboard</h1>
                        <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Strategic Payroll & Workforce Intelligence</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <Button
                            onClick={() => setSearchParams({ v: 'leaves' })}
                            style={{
                                background: viewMode === 'leaves'
                                    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                                    : 'transparent',
                                color: viewMode === 'leaves' ? 'white' : '#f59e0b',
                                border: '1px solid #f59e0b',
                                position: 'relative',
                                fontWeight: '700'
                            }}
                        >
                            📅 Manage Leaves
                            {pendingLeaveCount > 0 && (
                                <span style={{
                                    position: 'absolute',
                                    top: '-8px',
                                    right: '-8px',
                                    background: '#ef4444',
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: '20px',
                                    height: '20px',
                                    fontSize: '0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }}>
                                    {pendingLeaveCount}
                                </span>
                            )}
                        </Button>
                        <Button onClick={() => navigate('/messages')} variant="primary" style={{ padding: '12px 24px' }}>Messages</Button>
                        <Button
                            className="logout-btn"
                            variant="secondary"
                            onClick={() => { logout(); navigate('/login'); }}
                            style={{
                                padding: '0.6rem 1.8rem',
                                fontSize: '0.95rem',
                                fontWeight: '700',
                                borderRadius: '50px',
                                background: '#fff'
                            }}
                        >
                            Logout
                        </Button>
                    </div>
                </div>

                <div className="no-print" style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                    <button
                        onClick={() => setSearchParams({ v: 'config' })}
                        style={{
                            padding: '10px 20px',
                            border: 'none',
                            background: viewMode === 'config' || viewMode === 'slip' ? 'var(--primary)' : 'transparent',
                            color: viewMode === 'config' || viewMode === 'slip' ? 'white' : 'var(--text-main)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        Payroll & Attendance
                    </button>
                    <button
                        onClick={() => setSearchParams({ v: 'locations' })}
                        style={{
                            padding: '10px 20px',
                            border: 'none',
                            background: viewMode === 'locations' ? 'var(--primary)' : 'transparent',
                            color: viewMode === 'locations' ? 'white' : 'var(--text-main)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        📍 Locations
                    </button>
                    <button
                        onClick={() => setSearchParams({ v: 'assignments' })}
                        style={{
                            padding: '10px 20px',
                            border: 'none',
                            background: viewMode === 'assignments' ? 'var(--primary)' : 'transparent',
                            color: viewMode === 'assignments' ? 'white' : 'var(--text-main)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        📅 Site Assignments
                    </button>
                    <button
                        onClick={() => setSearchParams({ v: 'geo' })}
                        style={{
                            padding: '10px 20px',
                            border: 'none',
                            background: viewMode === 'geo' ? 'var(--primary)' : 'transparent',
                            color: viewMode === 'geo' ? 'white' : 'var(--text-main)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        🌍 Geo-Tracker (Live)
                    </button>
                </div>

                {/* Admin Quick Stats */}
                <div className="no-print" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '20px',
                    marginBottom: '30px'
                }}>
                    <div className="fly-card" style={{ padding: '20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Total Workforce</div>
                        <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--primary)' }}>{employees.length}</div>
                    </div>
                    <div className="fly-card" style={{ padding: '20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Month Focus</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '800', marginTop: '5px' }}>
                            {new Date(viewingMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </div>
                    </div>
                    <div className="fly-card" style={{ padding: '20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Active System</div>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: '#10b981', marginTop: '10px' }}>🟢 Healthy</div>
                    </div>
                </div>

                <div className="admin-dashboard-container">
                    {/* Left Panel: Employee List */}
                    <div className="fly-card no-print" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div className="search-container">
                            <input
                                type="text"
                                placeholder="🔍 Search employees..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-bar-animated"
                            />
                        </div>
                        <EmployeeList
                            employees={filteredEmployees}
                            onSelect={handleEmployeeSelect}
                            selectedEmployeeId={selectedEmployee?.employeeId}
                        />
                    </div>


                    {/* Right Panel: Details & Actions */}
                    <div className="details-panel">
                        {viewMode === 'leaves' ? (
                            <div className="messages-wrapper" style={{ padding: 0, minHeight: 'auto' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                    <div>
                                        <h2 className="title-gradient" style={{ margin: 0, fontSize: '2rem' }}>📋 Leave Requests</h2>
                                        <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)', fontWeight: '500' }}>Review and manage employee time-off applications</p>
                                    </div>
                                    <Button onClick={() => setSearchParams({})} variant="secondary">Close Viewer</Button>
                                </div>

                                <div className="admin-stats-grid" style={{ marginBottom: '30px' }}>
                                    <div className="stat-card">
                                        <h4 style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Pending</h4>
                                        <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#f59e0b' }}>
                                            {leaveRequests.filter(r => r.status === 'Pending').length}
                                        </div>
                                    </div>
                                    <div className="stat-card">
                                        <h4 style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Today's Total</h4>
                                        <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--primary)' }}>
                                            {leaveRequests.length}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gap: '20px' }}>
                                    {leaveRequests.length === 0 ? (
                                        <div className="message-card" style={{ textAlign: 'center', padding: '40px' }}>
                                            <p style={{ color: 'var(--text-muted)', margin: 0, fontWeight: '600' }}>All clear! No pending leave requests.</p>
                                        </div>
                                    ) : (
                                        leaveRequests.map(req => {
                                            const statusClass = req.status === 'Approved' ? 'solved' : (req.status === 'Rejected' ? 'new' : 'open');
                                            return (
                                                <div key={req._id} className={`message-card ${req.status === 'Pending' ? 'unread' : ''}`}>
                                                    <div className="message-header">
                                                        <div>
                                                            <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: '800' }}>{req.employeeName}</h3>
                                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '5px' }}>
                                                                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--primary)', background: '#e0f2fe', padding: '2px 10px', borderRadius: '50px' }}>{req.type}</span>
                                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>{req.startDate} ➝ {req.endDate}</span>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                                            <span className={`status-badge status-${statusClass}`}>
                                                                {req.status}
                                                            </span>
                                                            <button
                                                                onClick={() => handleLeaveDelete(req._id)}
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    color: '#ef4444',
                                                                    fontSize: '0.8rem',
                                                                    fontWeight: '700',
                                                                    cursor: 'pointer',
                                                                    padding: '4px 8px',
                                                                    borderRadius: '6px',
                                                                    transition: 'all 0.2s',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px'
                                                                }}
                                                                onMouseOver={(e) => e.target.style.background = '#fee2e2'}
                                                                onMouseOut={(e) => e.target.style.background = 'none'}
                                                            >
                                                                🗑️ Delete
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="response-container">
                                                        <p style={{ margin: 0, fontSize: '0.95rem', color: '#44546a', fontStyle: 'italic', lineHeight: '1.5' }}>
                                                            "{req.reason}"
                                                        </p>
                                                        {(() => {
                                                            const emp = employees.find(e => e.employeeId === req.employeeId);
                                                            if (emp && emp.leaveBalances) {
                                                                const balanceKey = req.type.toLowerCase();
                                                                return (
                                                                    <p style={{ margin: '10px 0 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>
                                                                        Current Balance: <span style={{ color: 'var(--primary)' }}>{emp.leaveBalances[balanceKey] ?? 0} days</span> remaining
                                                                    </p>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>

                                                    {req.status === 'Pending' && (
                                                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                                                            <Button
                                                                onClick={() => handleLeaveAction(req._id, 'Rejected')}
                                                                variant="danger"
                                                                style={{ padding: '8px 20px', fontSize: '0.85rem' }}
                                                            >
                                                                ✕ Reject
                                                            </Button>
                                                            <Button
                                                                onClick={() => handleLeaveAction(req._id, 'Approved')}
                                                                variant="primary"
                                                                style={{ padding: '8px 20px', fontSize: '0.85rem' }}
                                                            >
                                                                ✓ Approve Request
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        ) : viewMode === 'locations' ? (
                            <div className="fly-card" style={{ padding: '25px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h2 className="title-gradient" style={{ margin: 0 }}>📍 Geography Configuration</h2>
                                    <Button onClick={() => setSearchParams({ v: 'config' })} variant="secondary">Back to Dashboard</Button>
                                </div>
                                <LocationManager />
                            </div>
                        ) : viewMode === 'geo' ? (
                            <div className="fly-card" style={{ padding: '25px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h2 className="title-gradient" style={{ margin: 0 }}>🌍 Workforce Geo-Tracker</h2>
                                    <Button onClick={() => setSearchParams({ v: 'config' })} variant="secondary">Back to Dashboard</Button>
                                </div>
                                <div style={{ background: 'rgba(241, 245, 249, 0.5)', borderRadius: '15px', padding: '20px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                                        {employees.map(emp => {
                                            const attendanceData = attendanceMap[emp.employeeId] || {};
                                            // Fallback to latest attendance if today is missing
                                            const allDates = Object.keys(attendanceData).sort().reverse();
                                            const latestDate = allDates[0];
                                            const lastData = latestDate ? attendanceData[latestDate] : null;

                                            return (
                                                <div key={emp.employeeId} className="fly-card" style={{ padding: '15px', border: '1px solid #e2e8f0' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                                            {emp.fullName?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{emp.fullName}</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.employeeId}</div>
                                                        </div>
                                                    </div>

                                                    {lastData?.location ? (
                                                        <div style={{ fontSize: '0.85rem' }}>
                                                            <div style={{ color: '#10b981', fontWeight: '600', marginBottom: '5px' }}>
                                                                📍 Last Seen at {lastData.location.siteName || "Unknown Site"}
                                                            </div>
                                                            <div style={{ color: 'var(--text-muted)', marginBottom: '10px' }}>
                                                                {latestDate} at {lastData.location.lat.toFixed(6)}, {lastData.location.lng.toFixed(6)}
                                                            </div>
                                                            <a
                                                                href={`https://www.google.com/maps?q=${lastData.location.lat},${lastData.location.lng}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{ color: 'var(--primary)', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}
                                                            >
                                                                🗺️ View on Google Maps
                                                            </a>
                                                        </div>
                                                    ) : (
                                                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                                            No recent location data available.
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : viewMode === 'assignments' ? (
                            <div className="fly-card" style={{ padding: '25px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h2 className="title-gradient" style={{ margin: 0 }}>📅 Field Workforce Assignment</h2>
                                    <Button onClick={() => setSearchParams({ v: 'config' })} variant="secondary">Back to Dashboard</Button>
                                </div>
                                <SiteAssignment employees={employees} />
                            </div>
                        ) : (
                            <>
                                <div className="no-print" style={{ marginBottom: "15px", textAlign: "right" }}>
                                    <Button
                                        variant="danger"
                                        onClick={() => handleDeleteEmployee(selectedEmployee)}
                                    >
                                        Delete Employee
                                    </Button>
                                </div>

                                {selectedEmployee ? (
                                    <>
                                        {viewMode === 'slip' ? (
                                            <SalarySlip
                                                employee={selectedEmployee}
                                                payrollData={pendingPayrollData}
                                                stats={(() => {
                                                    const [year, month] = viewingMonth.split('-').map(Number);
                                                    const daysInMonth = new Date(year, month, 0).getDate();
                                                    const currentEmpAttendance = attendanceMap[selectedEmployee.employeeId] || {};
                                                    const s = { totalDays: daysInMonth, present: 0, absent: 0, leave: 0 };
                                                    Object.values(currentEmpAttendance).forEach(status => {
                                                        if (status === 'P') s.present++;
                                                        else if (status === 'A') s.absent++;
                                                        else if (status === 'L') s.leave++;
                                                    });
                                                    return s;
                                                })()}
                                                onBack={() => setSearchParams({ v: 'config' })}
                                            />
                                        ) : (
                                            <>
                                                {(() => {
                                                    const [year, month] = viewingMonth.split('-').map(Number);
                                                    const daysInMonth = new Date(year, month, 0).getDate();
                                                    const currentEmpAttendance = attendanceMap[selectedEmployee.employeeId] || {};

                                                    const stats = {
                                                        totalDays: daysInMonth,
                                                        present: 0,
                                                        absent: 0,
                                                        leave: 0
                                                    };

                                                    Object.values(currentEmpAttendance).forEach(status => {
                                                        if (status === 'P') stats.present++;
                                                        else if (status === 'A') stats.absent++;
                                                        else if (status === 'L') stats.leave++;
                                                    });

                                                    return (
                                                        <PayrollForm
                                                            employee={selectedEmployee}
                                                            onUpdate={handlePayrollUpdate}
                                                            stats={stats}
                                                            initialData={payslipData}
                                                        />
                                                    );
                                                })()}
                                                <LeaveBalancePanel
                                                    employee={selectedEmployee}
                                                    onUpdateBalances={handleUpdateLeaveBalances}
                                                />
                                                <AttendancePanel
                                                    employee={selectedEmployee}
                                                    onMarkAttendance={handleMarkAttendance}
                                                    onMonthChange={(monthStr) => setViewingMonth(monthStr)}
                                                    initialStatuses={attendanceMap[selectedEmployee.employeeId] || {}}
                                                />
                                            </>
                                        )}
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
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
