import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import EmployeeList from '../components/EmployeeList';
import PayrollForm from '../components/PayrollForm';
import AttendancePanel from '../components/AttendancePanel';
import SalarySlip from '../components/SalarySlip';
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
    const { logout } = useAuth();
    const navigate = useNavigate();

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
        const netSalary = proRatedGross - taxAmount;

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
                taxAmount
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
                        <Button onClick={() => navigate('/messages')} variant="primary" style={{ padding: '12px 24px' }}>Messages</Button>
                        <Button className="logout-btn" variant="secondary" onClick={() => { logout(); navigate('/login'); }} style={{ padding: '10px 18px' }}>Logout</Button>
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
                        <EmployeeList
                            employees={employees}
                            onSelect={handleEmployeeSelect}
                            selectedEmployeeId={selectedEmployee?.employeeId}
                        />
                    </div>
                    

                    {/* Right Panel: Details & Actions */}
                    <div className="details-panel">
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
