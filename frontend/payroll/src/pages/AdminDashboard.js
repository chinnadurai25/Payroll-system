import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import EmployeeList from '../components/EmployeeList';
import PayrollForm from '../components/PayrollForm';
import AttendancePanel from '../components/AttendancePanel';
import SalarySlip from '../components/SalarySlip';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    // State
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [attendanceMap, setAttendanceMap] = useState({});
    const [viewingMonth, setViewingMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [viewMode, setViewMode] = useState('config'); // 'config' or 'slip'
    const [pendingPayrollData, setPendingPayrollData] = useState(null);

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


    const handleLogout = () => {
        logout();
        navigate('/');
    };

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



    const handlePayrollUpdate = (employeeId, payrollData) => {
        console.log(`Updating payroll for ${employeeId}:`, payrollData);

        // Optimistic UI update
        const updatedEmployees = employees.map(emp =>
            emp.employeeId === employeeId ? { ...emp, payroll: payrollData } : emp
        );
        setEmployees(updatedEmployees);
        setSelectedEmployee({ ...selectedEmployee, payroll: payrollData });

        // Save current calc data and show slip
        setPendingPayrollData(payrollData);
        setViewMode('slip');
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

        fetchAttendance();
    }, [selectedEmployee, viewingMonth]);

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
                <div className="no-print" style={{
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
                    <div className="glass-panel no-print" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
                                        onBack={() => setViewMode('config')}
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
