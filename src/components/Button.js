import React from 'react';
import '../index.css';

const Button = ({ children, onClick, type = 'button', variant = 'primary', className = '', ...props }) => {
    const baseStyle = {
        padding: '0.75rem 1.5rem',
        borderRadius: 'var(--radius)',
        border: '1px solid transparent',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '0.95rem',
        transition: 'all 0.2s ease',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        outline: 'none',
        letterSpacing: '0.01em',
    };

    const variants = {
        primary: {
            background: 'var(--primary)',
            color: '#fff',
            boxShadow: 'var(--shadow-sm)',
        },
        secondary: {
            background: '#fff',
            border: '1px solid var(--border-color)',
            color: 'var(--text-main)',
            boxShadow: 'var(--shadow-sm)',
        },
        danger: {
            background: '#dc2626',
            color: '#fff',
        }
    };

    const style = { ...baseStyle, ...variants[variant] };

    // Hover logic needs to be handled via CSS or inline events properly, simpler here to rely on component logic
    // but for inline styles in JS, we can just do simple overrides.

    return (
        <button
            type={type}
            onClick={onClick}
            style={style}
            className={`btn-${variant} ${className}`}
            onMouseOver={(e) => {
                if (variant === 'primary') e.currentTarget.style.background = 'var(--primary-hover)';
                if (variant === 'secondary') e.currentTarget.style.background = '#f8fafc';
            }}
            onMouseOut={(e) => {
                if (variant === 'primary') e.currentTarget.style.background = 'var(--primary)';
                if (variant === 'secondary') e.currentTarget.style.background = '#fff';
            }}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
