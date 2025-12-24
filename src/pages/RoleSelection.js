import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';

import '../styles/RoleSelection.css';

const RoleSelection = () => {
    const navigate = useNavigate();

    return (
        <div className="role-selection-container fade-in">
            <div className="glass-panel" style={{ maxWidth: '800px', width: '90%', padding: '40px', background: 'rgba(255, 255, 255, 0.95)' }}>
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', textAlign: 'center' }}>
                    <h1 className="title-gradient" style={{ fontSize: '3rem', marginBottom: '10px' }}>Payroll System</h1>
                    <p style={{ color: '#64748b', fontSize: '1.2rem', fontWeight: '500' }}>Secure Enterprise Portal</p>
                </div>

                <div className="role-cards-wrapper">
                    {/* Admin Card */}
                    <div className="role-card" onClick={() => navigate('/login?role=admin')}>
                        <div className="role-icon">🛡️</div>
                        <h3 className="role-title">Administrative Access</h3>
                        <p className="role-desc">
                            Manage employee records, process payroll, and view financial reports.
                        </p>
                        <div style={{ display: 'grid', gap: '10px' }}>
                            <Button onClick={(e) => { e.stopPropagation(); navigate('/login?role=admin'); }} className="btn-modern btn-primary w-full">Admin Login</Button>
                            <Button onClick={(e) => { e.stopPropagation(); navigate('/register?role=admin'); }} className="btn-modern btn-secondary w-full">Register New Admin</Button>
                        </div>
                    </div>

                    {/* Employee Card */}
                    <div className="role-card" onClick={() => navigate('/login?role=employee')}>
                        <div className="role-icon">💼</div>
                        <h3 className="role-title">Employee Access</h3>
                        <p className="role-desc">
                            View payslips, manage direct deposit, and download tax forms.
                        </p>
                        <div style={{ display: 'grid', gap: '10px' }}>
                            <Button onClick={(e) => { e.stopPropagation(); navigate('/login?role=employee'); }} className="btn-modern btn-primary w-full">Employee Login</Button>
                            <Button onClick={(e) => { e.stopPropagation(); navigate('/register?role=employee'); }} className="btn-modern btn-secondary w-full">New Employee Setup</Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoleSelection;
