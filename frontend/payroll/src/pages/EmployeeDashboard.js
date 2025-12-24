import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import SalarySlip from '../components/SalarySlip';

const EmployeeDashboard = () => {
    const { user } = useAuth();

    // State
    const [employeeData, setEmployeeData] = useState(null);
    const [attendance, setAttendance] = useState({});
    const [loading, setLoading] = useState(true);
    const [viewDate, setViewDate] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });
    const [searchParams, setSearchParams] = useSearchParams();
    const viewMode = searchParams.get('v') || 'overview'; // 'overview' or 'slip'

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const viewingMonth = `${year}-${String(month + 1).padStart(2, '0')}`;


    // Fetch full employee details including payroll config
    useEffect(() => {
        if (!user?.email) return;

        const fetchDetails = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/employees');
                if (!res.ok) throw new Error('Failed to fetch');
                const data = await res.json();
                const currentEmp = data.find(emp => emp.email === user.email || emp.employeeId === user.employeeId);
                if (currentEmp) setEmployeeData(currentEmp);
            } catch (err) {
                console.warn('Error fetching employee details:', err);
            }
        };
        fetchDetails();
    }, [user]);

    // Fetch attendance for the viewing month
    useEffect(() => {
        if (!employeeData?.employeeId) return;

        const fetchAttendance = async () => {
            try {
                const res = await fetch(`http://localhost:5000/api/attendance?employeeId=${encodeURIComponent(employeeData.employeeId)}&month=${viewingMonth}`);
                if (!res.ok) throw new Error('Failed to fetch attendance');
                const data = await res.json();

                let statuses = {};
                if (Array.isArray(data)) {
                    data.forEach(item => {
                        if (item.date && item.status) statuses[item.date] = item.status;
                    });
                } else if (data && typeof data === 'object') {
                    statuses = data;
                }
                setAttendance(statuses);
            } catch (err) {
                console.warn('Error fetching attendance:', err);
                setAttendance({});
            } finally {
                setLoading(false);
            }
        };
        fetchAttendance();
    }, [employeeData, viewingMonth]);

    // Calculations
    const stats = useMemo(() => {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const p = Object.values(attendance).filter(s => s === 'P').length;
        const a = Object.values(attendance).filter(s => s === 'A').length;
        const l = Object.values(attendance).filter(s => s === 'L').length;
        return { totalDays: daysInMonth, present: p, absent: a, leave: l };
    }, [attendance, year, month]);

    const payrollResults = useMemo(() => {
        if (!employeeData?.payroll) return { netPayable: 0, gross: 0, tax: 0, proRated: 0, deductions: 0, breakdown: {} };

        const { basicSalary, hra, splAllowance, travelAllowance, allowances, bonus, insteadDue, pf, tax } = employeeData.payroll;
        const basic = parseFloat(basicSalary) || 0;
        const h = parseFloat(hra) || 0;
        const spl = parseFloat(splAllowance) || 0;
        const travel = parseFloat(travelAllowance) || 0;
        const allow = parseFloat(allowances) || 0;
        const bns = parseFloat(bonus) || 0;
        const inst = parseFloat(insteadDue) || 0;
        const pfVal = parseFloat(pf) || 0;
        const tRate = parseFloat(tax) || 0;

        const gross = basic + h + spl + travel + allow + bns + inst;
        const proRated = stats.totalDays > 0 ? (gross / stats.totalDays) * stats.present : 0;
        const taxVal = proRated * (tRate / 100);
        const net = proRated - taxVal - pfVal;

        return {
            gross,
            proRated,
            tax: taxVal,
            pf: pfVal,
            deductions: taxVal + pfVal,
            netPayable: net,
            taxRate: tRate,
            breakdown: { basic, h, spl, travel, allow, bns, inst }
        };
    }, [employeeData, stats]);

    const handlePrev = () => setViewDate(new Date(year, month - 1, 1));
    const handleNext = () => setViewDate(new Date(year, month + 1, 1));

    if (loading && !employeeData) return <div style={{ padding: '40px' }}>Loading your dashboard...</div>;

    const monthLabel = viewDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });

    return (
        <div style={{ padding: '40px 20px' }} className="fade-in">
            <div className="container">
                <div className="no-print" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '40px',
                    paddingTop: '60px', // Offset for fixed navbar
                    paddingBottom: '20px',
                }}>
                    <div>
                        <h1 className="title-gradient" style={{ fontSize: '2.5rem', marginBottom: '5px' }}>My Portfolio</h1>
                        <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Welcome, {employeeData?.fullName || user?.email}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <div className="fly-card" style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 20px', borderRadius: '50px' }}>
                            <button onClick={handlePrev} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--primary)' }}>◀</button>
                            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)', minWidth: '140px', textAlign: 'center' }}>{monthLabel}</span>
                            <button onClick={handleNext} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--primary)' }}>▶</button>
                        </div>
                        <Button onClick={() => setSearchParams({ v: 'slip' })} variant="primary" style={{ padding: '12px 28px' }}>View Pay Slip</Button>
                    </div>
                </div>

                {viewMode === 'slip' && (
                    <div style={{ marginTop: '30px' }}>
                        <SalarySlip
                            employee={employeeData}
                            payrollData={employeeData?.payroll}
                            stats={stats}
                            onBack={() => setSearchParams({ v: 'overview' })}
                        />
                    </div>
                )}

                {viewMode === 'overview' && (
                    <>
                        <div className="fly-card" style={{ marginBottom: '30px', padding: '30px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h2 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.8rem', fontWeight: '800' }}>Financial Insights</h2>
                                <div style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: '700', background: 'var(--secondary)', padding: '6px 16px', borderRadius: '50px' }}>
                                    Attendance: {stats.present} / {stats.totalDays} Days
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' }}>
                                <div style={{
                                    padding: '30px',
                                    background: 'linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)',
                                    borderRadius: 'var(--radius)',
                                    color: 'white',
                                    boxShadow: 'var(--shadow-lg)'
                                }}>
                                    <h3 style={{ fontSize: '0.9rem', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '800' }}>Net Earnings</h3>
                                    <p style={{ fontSize: '3.5rem', fontWeight: '900', marginTop: '15px', letterSpacing: '-1px' }}>₹{payrollResults.netPayable.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                    <span style={{
                                        display: 'inline-block',
                                        marginTop: '10px',
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        background: 'rgba(255,255,255,0.2)',
                                        color: 'white',
                                        fontSize: '0.8rem',
                                        fontWeight: '600'
                                    }}>Based on current attendance</span>
                                </div>

                                <div style={{
                                    padding: '30px',
                                    background: '#fff',
                                    borderRadius: 'var(--radius)',
                                    border: '1px solid var(--border-color)',
                                    boxShadow: 'var(--shadow-sm)'
                                }}>
                                    <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Gross Salary (Full)</h3>
                                    <p style={{ fontSize: '3rem', fontWeight: '700', color: 'var(--text-main)', marginTop: '10px' }}>₹{payrollResults.gross.toLocaleString()}</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '15px' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Basic: ₹{payrollResults.breakdown.basic || 0}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>HRA: ₹{payrollResults.breakdown.h || 0}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Spl: ₹{payrollResults.breakdown.spl || 0}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Travel: ₹{payrollResults.breakdown.travel || 0}</div>
                                    </div>
                                </div>

                                <div style={{
                                    padding: '30px',
                                    background: '#fff',
                                    borderRadius: 'var(--radius)',
                                    border: '1px solid var(--border-color)',
                                    boxShadow: 'var(--shadow-sm)'
                                }}>
                                    <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Total Deductions</h3>
                                    <p style={{ fontSize: '3rem', fontWeight: '700', color: '#ef4444', marginTop: '10px' }}>₹{payrollResults.deductions.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                    <div style={{ marginTop: '15px' }}>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tax ({payrollResults.taxRate}%): ₹{payrollResults.tax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>PF Contribution: ₹{payrollResults.pf.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Attendance Summary Bar */}
                        <div className="glass-panel" style={{ padding: '20px' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '15px' }}>Monthly Attendance Record</h3>
                            <div style={{ display: 'flex', gap: '4px', height: '30px', background: '#f1f5f9', borderRadius: '15px', overflow: 'hidden', padding: '4px' }}>
                                {new Array(stats.totalDays).fill(0).map((_, i) => {
                                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
                                    const status = attendance[dateStr];
                                    let color = '#e2e8f0';
                                    if (status === 'P') color = '#22c55e';
                                    if (status === 'A') color = '#ef4444';
                                    if (status === 'L') color = '#f59e0b';

                                    return (
                                        <div key={i} title={`${dateStr}: ${status || 'N/A'}`} style={{ flex: 1, background: color, borderRadius: '2px' }}></div>
                                    );
                                })}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '15px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%' }}></span> Present ({stats.present})</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', background: '#f59e0b', borderRadius: '50%' }}></span> Leave ({stats.leave})</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }}></span> Absent ({stats.absent})</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '8px', height: '8px', background: '#e2e8f0', borderRadius: '50%' }}></span> Unmarked</span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default EmployeeDashboard;
