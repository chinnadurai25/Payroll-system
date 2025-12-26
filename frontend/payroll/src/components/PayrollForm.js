import React, { useState, useEffect } from 'react';
import Input from './Input';
import Button from './Button';

const PayrollForm = ({ employee, onUpdate, stats, initialData }) => {
    const [formData, setFormData] = useState({
        basicSalary: '',
        hra: '',
        splAllowance: '',
        travelAllowance: '',
        allowances: '',
        bonus: '',
        insteadDue: '',
        pf: '',
        tax: ''
    });

    useEffect(() => {
        if (employee) {
            const payroll = initialData?.earnings || employee.payroll || {};
            setFormData({
                basicSalary: payroll.basicSalary || '',
                hra: payroll.hra || '',
                splAllowance: payroll.splAllowance || '',
                travelAllowance: payroll.travelAllowance || '',
                allowances: payroll.allowances || '',
                bonus: payroll.bonus || '',
                insteadDue: payroll.insteadDue || '',
                pf: initialData?.deductions?.pf || '',
                tax: initialData?.deductions?.taxPercent || ''
            });
        }
    }, [employee, initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onUpdate(employee.employeeId, formData);
    };

    // Calculations
    const basic = parseFloat(formData.basicSalary) || 0;
    const hra = parseFloat(formData.hra) || 0;
    const spl = parseFloat(formData.splAllowance) || 0;
    const travel = parseFloat(formData.travelAllowance) || 0;
    const allow = parseFloat(formData.allowances) || 0;
    const bonus = parseFloat(formData.bonus) || 0;
    const instead = parseFloat(formData.insteadDue) || 0;
    const pf = parseFloat(formData.pf) || 0;
    const taxRate = parseFloat(formData.tax) || 0;

    // Monthly Gross = Sum of all earnings
    const grossMonthly = basic + hra + spl + travel + allow + bonus + instead;

    // Pro-rated calculation based on attendance
    const presentDays = stats?.present || 0;
    const totalDays = stats?.totalDays || 30;

    const proRatedGross = totalDays > 0 ? (grossMonthly / totalDays) * presentDays : 0;
    const taxDeduction = proRatedGross * (taxRate / 100);
    const netPayable = proRatedGross - taxDeduction - pf;

    if (!employee) return <div style={{ color: 'var(--text-muted)' }}>Select an employee to view details.</div>;

    return (
        <div style={{
            background: '#fff',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border-color)',
            padding: '25px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
        }}>
            <div>
                <h3 style={{ marginBottom: '15px', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', fontSize: '1.2rem' }}>
                    Payroll Config: {employee.fullName}
                </h3>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                        <Input label="Basic Salary" name="basicSalary" type="number" value={formData.basicSalary} onChange={handleChange} placeholder="0" />
                        <Input label="HRA" name="hra" type="number" value={formData.hra} onChange={handleChange} placeholder="0" />
                        <Input label="Spl Allowance" name="splAllowance" type="number" value={formData.splAllowance} onChange={handleChange} placeholder="0" />
                        <Input label="Travel Allowance" name="travelAllowance" type="number" value={formData.travelAllowance} onChange={handleChange} placeholder="0" />
                        <Input label="Other Allowances" name="allowances" type="number" value={formData.allowances} onChange={handleChange} placeholder="0" />
                        <Input label="Bonus" name="bonus" type="number" value={formData.bonus} onChange={handleChange} placeholder="0" />
                        <Input label="Instead Due" name="insteadDue" type="number" value={formData.insteadDue} onChange={handleChange} placeholder="0" />
                        <Input label="PF Deduction" name="pf" type="number" value={formData.pf} onChange={handleChange} placeholder="0" />
                        <Input label="Tax (%)" name="tax" type="number" value={formData.tax} onChange={handleChange} placeholder="0" min="0" max="100" step="0.1" />
                    </div>

                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="submit">Update Config</Button>
                    </div>
                </form>
            </div>

            {/* Salary Summary Section */}
            <div style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                padding: '18px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: '1rem' }}>💰 Monthly Salary Summary</h4>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                        {presentDays} / {totalDays} Days Present
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                    <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>Gross Monthly</div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>₹{grossMonthly.toLocaleString()}</div>
                    </div>
                    <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>Pro-rated Gross</div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>₹{proRatedGross.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                    <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>Deductions (Tax+PF)</div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ef4444' }}>₹{(taxDeduction + pf).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                    <div style={{ background: 'var(--primary)', padding: '10px', borderRadius: '8px', color: 'white' }}>
                        <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '2px' }}>Net Payable</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>₹{netPayable.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PayrollForm;
