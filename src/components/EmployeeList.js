import React from 'react';

const EmployeeList = ({ employees, onSelect, selectedEmployeeId }) => {
    return (
        <div style={{
            background: '#fff',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
        }}>
            <div style={{
                padding: '15px 20px',
                borderBottom: '1px solid var(--border-color)',
                background: '#f8fafc'
            }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>Employees</h3>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
                {employees.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No employees found.
                    </div>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {employees.map(emp => (
                            <li
                                key={emp.employeeId}
                                onClick={() => onSelect(emp)}
                                style={{
                                    padding: '15px 20px',
                                    borderBottom: '1px solid var(--border-color)',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s',
                                    background: selectedEmployeeId === emp.employeeId ? 'var(--primary-light)' : 'transparent',
                                    borderLeft: selectedEmployeeId === emp.employeeId ? '4px solid var(--primary)' : '4px solid transparent'
                                }}
                                onMouseEnter={(e) => {
                                    if (selectedEmployeeId !== emp.employeeId) e.currentTarget.style.background = '#f1f5f9';
                                }}
                                onMouseLeave={(e) => {
                                    if (selectedEmployeeId !== emp.employeeId) e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{emp.fullName || emp.email}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ID: {emp.employeeId}</div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default EmployeeList;
