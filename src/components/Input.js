import React from 'react';

const Input = ({ label, type = 'text', name, value, onChange, placeholder, required = false, ...props }) => {
    const containerStyle = {
        marginBottom: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start'
    };

    const labelStyle = {
        marginBottom: '0.5rem',
        color: 'var(--text-main)',
        fontSize: '0.9rem',
        fontWeight: '600',
    };

    const inputStyle = {
        width: '100%',
        padding: '0.75rem 1rem',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border-color)',
        background: 'var(--input-bg)',
        color: 'var(--text-main)',
        fontSize: '0.95rem',
        outline: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
    };

    return (
        <div style={containerStyle}>
            {label && <label htmlFor={name} style={labelStyle}>{label}</label>}
            <input
                type={type}
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                style={inputStyle}
                onFocus={(e) => {
                    e.target.style.borderColor = 'var(--primary)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 58, 138, 0.1)';
                }}
                onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border-color)';
                    e.target.style.boxShadow = 'none';
                }}
                {...props}
            />
        </div>
    );
};

export default Input;
