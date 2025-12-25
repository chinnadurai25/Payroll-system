import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const MessageForm = ({ employee, onMessageSent }) => {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [category, setCategory] = useState('query');
    const [sending, setSending] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSending(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const payload = {
                fromRole: 'employee',
                fromId: user?.employeeId || user?.email,
                fromName: employee?.fullName || user?.email,
                toRole: 'admin',
                toId: 'admin',
                title,
                message,
                category,
                status: 'open'
            };

            const res = await fetch('http://localhost:5000/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to send message');

            setSuccessMsg('✅ Message sent successfully!');
            setTitle('');
            setMessage('');
            setCategory('query');
            
            if (onMessageSent) onMessageSent();
            
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setErrorMsg('❌ Error sending message: ' + err.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <div style={{
            background: '#fff',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border-color)',
            padding: '30px',
            boxShadow: 'var(--shadow-sm)',
            maxWidth: '600px',
            margin: '0 auto'
        }}>
            <h2 style={{ color: 'var(--primary)', marginBottom: '20px', fontSize: '1.5rem' }}>📝 Send Query to Admin</h2>

            {successMsg && (
                <div style={{
                    background: '#dcfce7',
                    color: '#166534',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: '1px solid #86efac'
                }}>
                    {successMsg}
                </div>
            )}

            {errorMsg && (
                <div style={{
                    background: '#fee2e2',
                    color: '#991b1b',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    border: '1px solid #fca5a5'
                }}>
                    {errorMsg}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text-main)' }}>Title</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Brief subject of your query"
                        required
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            fontSize: '1rem',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text-main)' }}>Category</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            fontSize: '1rem',
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    >
                        <option value="query">Query</option>
                        <option value="error">Error/Issue</option>
                        <option value="feedback">Feedback</option>
                        <option value="other">Other</option>
                    </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text-main)' }}>Message</label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Describe your query or issue in detail..."
                        required
                        rows="6"
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            fontSize: '1rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit',
                            resize: 'vertical'
                        }}
                    />
                </div>

                <button
                    type="submit"
                    disabled={sending}
                    style={{
                        background: 'var(--primary)',
                        color: '#fff',
                        padding: '12px 28px',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: sending ? 'not-allowed' : 'pointer',
                        opacity: sending ? 0.6 : 1,
                        transition: 'all 0.2s'
                    }}
                >
                    {sending ? '⏳ Sending...' : '📤 Send Message'}
                </button>
            </form>
        </div>
    );
};

export default MessageForm;
