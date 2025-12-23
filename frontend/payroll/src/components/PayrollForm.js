import React, { useState, useEffect } from 'react';
import Input from './Input';
import Button from './Button';

const PayrollForm = ({ employee, onUpdate }) => {
    const [formData, setFormData] = useState({
        basicPay: '',
        hra: '',
        allowances: '',
        tax: ''
    });

    useEffect(() => {
        if (employee) {
            setFormData({
                basicPay: employee.payroll?.basicPay || '',
                hra: employee.payroll?.hra || '',
                allowances: employee.payroll?.allowances || '',
                tax: employee.payroll?.tax || '' // now represents percentage (e.g. 5 for 5%)
            });
        }
    }, [employee]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onUpdate(employee.employeeId, formData);
    };

    if (!employee) return <div style={{ color: 'var(--text-muted)' }}>Select an employee to view details.</div>;

    return (
        <div style={{
            background: '#fff',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border-color)',
            padding: '25px',
            boxShadow: 'var(--shadow-sm)'
        }}>
            <h3 style={{ marginBottom: '20px', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                Payroll Details: {employee.fullName}
            </h3>
            <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <Input
                        label="Basic Pay"
                        name="basicPay"
                        type="number"
                        value={formData.basicPay}
                        onChange={handleChange}
                        placeholder="e.g. 50000"
                    />
                    <Input
                        label="HRA (House Rent Allowance)"
                        name="hra"
                        type="number"
                        value={formData.hra}
                        onChange={handleChange}
                        placeholder="e.g. 20000"
                    />
                    <Input
                        label="Other Allowances"
                        name="allowances"
                        type="number"
                        value={formData.allowances}
                        onChange={handleChange}
                        placeholder="e.g. 5000"
                    />
                    <Input
                        label="Tax (%)"
                        name="tax"
                        type="number"
                        value={formData.tax}
                        onChange={handleChange}
                        placeholder="e.g. 5"
                        min="0"
                        max="100"
                        step="0.1"
                    />
                </div>

                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                    <Button type="submit">Update Payroll</Button>
                </div>
            </form>
        </div>
    );
};

export default PayrollForm;
