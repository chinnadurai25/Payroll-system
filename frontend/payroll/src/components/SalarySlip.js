import React from 'react';
import Button from './Button';

const SalarySlip = ({ employee, payrollData, stats, onBack }) => {
    if (!employee || !payrollData) return null;

    const earnings = [
        { label: 'Basic Salary', value: payrollData.basicSalary },
        { label: 'HRA', value: payrollData.hra },
        { label: 'Special Allowance', value: payrollData.splAllowance },
        { label: 'Travel Allowance', value: payrollData.travelAllowance },
        { label: 'Other Allowances', value: payrollData.allowances },
        { label: 'Bonus', value: payrollData.bonus },
        { label: 'Instead Due', value: payrollData.insteadDue },
    ];

    const totalEarnings = earnings.reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0);

    // Pro-rated calculation
    const presentDays = stats?.present || 0;
    const totalDays = stats?.totalDays || 30;
    const proRatedGross = totalDays > 0 ? (totalEarnings / totalDays) * presentDays : 0;

    const taxRate = parseFloat(payrollData.tax) || 0;
    const taxDeduction = proRatedGross * (taxRate / 100);
    const pfDeduction = parseFloat(payrollData.pf) || 0;

    const totalDeductions = taxDeduction + pfDeduction;
    const netPayable = proRatedGross - totalDeductions;

    return (
        <div style={{
            background: '#fff',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border-color)',
            padding: '40px',
            boxShadow: 'var(--shadow-lg)',
            width: '100%',
            maxWidth: '800px',
            margin: '0 auto',
            position: 'relative',
            pageBreakInside: 'avoid',
        }} className="fade-in salary-slip-container">
            <style>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 10mm;
                    }
                    body {
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .salary-slip-container {
                        box-shadow: none !important;
                        border: 1px solid #ddd !important;
                        margin: 0 auto !important;
                        padding: 10mm !important;
                        width: 100% !important;
                        max-width: none !important;
                        min-height: auto !important;
                        zoom: 0.95;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
                <img
                    src="https://flytowardsdigitalinnovation.com/wp-content/uploads/2025/07/cropped-DIGITAL_INNOVATION-removebg-preview-1-1-1.png"
                    alt="Company Logo"
                    style={{ height: '60px', width: 'auto' }}
                />
                <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-1px' }}>
                    <span style={{ color: 'var(--primary)' }}>Fly</span>
                    <span style={{ color: 'var(--text-main)' }}>Payroll</span>
                </h1>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', borderBottom: '2px solid var(--primary)', paddingBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.8rem' }}>Monthly Salary Slip</h2>
                    <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)', fontWeight: 600 }}>Generated for the Month</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-main)' }}>{employee.fullName}</h3>
                    <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)' }}>ID: {employee.employeeId}</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '40px' }}>
                {/* Employee Details Section */}
                <div>
                    <h4 style={{ color: 'var(--primary)', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '15px' }}>Employee Details</h4>
                    <div style={{ display: 'grid', gap: '10px', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Department:</span>
                            <span style={{ fontWeight: 600 }}>{employee.department || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Designation:</span>
                            <span style={{ fontWeight: 600 }}>{employee.jobTitle || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Account No:</span>
                            <span style={{ fontWeight: 600 }}>{employee.accountNumber || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>IFSC Code:</span>
                            <span style={{ fontWeight: 600 }}>{employee.bankCode || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Phone:</span>
                            <span style={{ fontWeight: 600 }}>{employee.phone || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Joining Date:</span>
                            <span style={{ fontWeight: 600 }}>{employee.joiningDate || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* Attendance Summary Section */}
                <div>
                    <h4 style={{ color: 'var(--primary)', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '15px' }}>Attendance Summary</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                        <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Total Days</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{totalDays}</div>
                        </div>
                        <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: '#166534' }}>Present Days</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#16a34a' }}>{presentDays}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                {/* Earnings */}
                <div>
                    <h4 style={{ background: '#f1f5f9', padding: '10px 15px', borderRadius: '8px', marginBottom: '15px' }}>Earnings</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <tbody>
                            {earnings.map(item => (
                                <tr key={item.label} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '10px 0', color: '#64748b' }}>{item.label}</td>
                                    <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600 }}>₹{(parseFloat(item.value) || 0).toLocaleString()}</td>
                                </tr>
                            ))}
                            <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                                <td style={{ padding: '12px' }}>Total Gross (Scale)</td>
                                <td style={{ padding: '12px', textAlign: 'right' }}>₹{totalEarnings.toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Deductions & Net Pay */}
                <div>
                    <h4 style={{ background: '#fef2f2', padding: '10px 15px', borderRadius: '8px', marginBottom: '15px' }}>Deductions</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', marginBottom: '30px' }}>
                        <tbody>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '10px 0', color: '#64748b' }}>Income Tax ({taxRate}%)</td>
                                <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>₹{taxDeduction.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '10px 0', color: '#64748b' }}>PF Contribution</td>
                                <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>₹{pfDeduction.toLocaleString()}</td>
                            </tr>
                            <tr style={{ background: '#fff1f2', fontWeight: 700 }}>
                                <td style={{ padding: '12px' }}>Total Deductions</td>
                                <td style={{ padding: '12px', textAlign: 'right', color: '#ef4444' }}>₹{totalDeductions.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div style={{
                        background: 'linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)',
                        padding: '25px',
                        borderRadius: '15px',
                        color: 'white',
                        textAlign: 'center',
                        boxShadow: 'var(--shadow-md)'
                    }}>
                        <div style={{ fontSize: '1rem', opacity: 0.9, marginBottom: '5px' }}>Net Payable Amount</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>₹{netPayable.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <div style={{ fontSize: '0.8rem', marginTop: '10px', opacity: 0.8 }}>Amount pro-rated based on {presentDays} working days</div>
                    </div>
                </div>
            </div>

            <div className="no-print" style={{ marginTop: '40px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
                <Button onClick={() => window.print()} variant="secondary">Print Slip</Button>
                <Button onClick={onBack}>Back to Config</Button>
            </div>
        </div>
    );
};

export default SalarySlip;
