import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import EmployeeList from '../components/EmployeeList';
import PayrollForm from '../components/PayrollForm';
import AttendancePanel from '../components/AttendancePanel';
import SalarySlip from '../components/SalarySlip';
import LeaveBalancePanel from '../components/LeaveBalancePanel';
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
    const { logout } = useAuth();
    const navigate = useNavigate();

    // Poll for pending leaves count
    useEffect(() => {
        const fetchPendingCount = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/leaves/pending-count');
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
                    const res = await fetch('http://localhost:5000/api/leaves');
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
            const res = await fetch(`http://localhost:5000/api/leaves/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (!res.ok) {
                // Revert optimistic update if failed
                console.error('Update failed');
                // You might want to re-fetch here
            }
        } catch (err) {
            console.warn('Backend update failed for leave request', err);
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
                const res = await fetch('http://localhost:5000/api/employees');
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
                `http://localhost:5000/api/employees/${employee.employeeId}`
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


        const presentDays = daysInMonth;

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

        await fetch("http://localhost:5000/api/payslip", {
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
            const res = await fetch('http://localhost:5000/api/attendance', {
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
                const res = await fetch(`http://localhost:5000/api/attendance?employeeId=${encodeURIComponent(selectedEmployee.employeeId)}&month=${viewingMonth}`);
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
                const res = await fetch(`http://localhost:5000/api/payslip?employeeId=${encodeURIComponent(selectedEmployee.employeeId)}&month=${viewingMonth}`);
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
    }, [selectedEmployee, viewingMonth]);

    const handleUpdateLeaveBalances = async (employeeId, balances) => {
        try {
            const res = await fetch(`http://localhost:5000/api/employees/${employeeId}`, {
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
                `http://localhost:5000/api/employees/${employee.employeeId}`,
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

                <div className="no-print" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '30px',
                    paddingTop: '60px', // For fixed navbar
                    paddingBottom: '20px',
                }}>
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
                            <div className="glass-panel leave-management-panel fade-in">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h2 style={{ margin: 0, color: 'var(--text-main)' }}>Manage Leave Requests</h2>
                                    <Button onClick={() => setSearchParams({})} variant="secondary" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>Close</Button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {leaveRequests.length === 0 ? (
                                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No pending leave requests.</p>
                                    ) : (
                                        leaveRequests.map(req => (
                                            <div key={req._id} style={{
                                                background: 'white',
                                                padding: '20px',
                                                borderRadius: '16px',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                                                border: '1px solid var(--border-color)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}>
                                                <div>
                                                    <h4 style={{ margin: '0 0 5px 0', fontSize: '1.1rem' }}>{req.employeeName}</h4>
                                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                        <span style={{ fontWeight: '600', color: 'var(--primary)', background: '#e0f2fe', padding: '2px 8px', borderRadius: '4px' }}>{req.type}</span>
                                                        <span>{req.startDate} ➝ {req.endDate}</span>
                                                        {(() => {
                                                            const emp = employees.find(e => e.employeeId === req.employeeId);
                                                            if (emp && emp.leaveBalances) {
                                                                const balanceKey = req.type.toLowerCase();
                                                                return (
                                                                    <span style={{ marginLeft: '10px', color: '#64748b', fontStyle: 'italic', fontWeight: '500' }}>
                                                                        (Balance: {emp.leaveBalances[balanceKey] ?? 0} days remaining)
                                                                    </span>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>
                                                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>"{req.reason}"</p>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                    {req.status === 'Pending' ? (
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button
                                                                onClick={() => handleLeaveAction(req._id, 'Approved')}
                                                                style={{ background: '#dcfce7', color: '#166534', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
                                                            >
                                                                ✓ Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleLeaveAction(req._id, 'Rejected')}
                                                                style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
                                                            >
                                                                ✕ Reject
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span style={{
                                                            fontWeight: '700',
                                                            padding: '6px 12px',
                                                            borderRadius: '8px',
                                                            background: req.status === 'Approved' ? '#dcfce7' : '#fee2e2',
                                                            color: req.status === 'Approved' ? '#166534' : '#991b1b'
                                                        }}>
                                                            {req.status.toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
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
