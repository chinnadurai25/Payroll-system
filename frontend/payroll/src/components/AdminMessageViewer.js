import React, { useState } from 'react';

const AdminMessageViewer = ({ messages, onStatusChange, onDelete, loading }) => {
    const [expandedId, setExpandedId] = useState(null);
    const [responseText, setResponseText] = useState({});
    const [filter, setFilter] = useState('open'); // open, solved, all

    const handleRespond = async (messageId) => {
        if (!responseText[messageId]?.trim()) return;

        try {
            const res = await fetch(`http://localhost:5000/api/messages/${messageId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'solved',
                    response: responseText[messageId]
                })
            });

            if (!res.ok) throw new Error('Failed to respond');

            setResponseText(prev => ({ ...prev, [messageId]: '' }));
            setExpandedId(null);
            if (onStatusChange) onStatusChange();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const handleDelete = async (messageId) => {
        if (!window.confirm('Delete this message?')) return;
        try {
            const res = await fetch(`http://localhost:5000/api/messages/${messageId}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete');
            if (onDelete) onDelete();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const filteredMessages = messages.filter(msg => {
        if (filter === 'all') return true;
        return msg.status === filter;
    });

    const newCount = messages.filter(m => !m.isRead).length;
    const solvedCount = messages.filter(m => m.status === 'solved').length;
    const openCount = messages.filter(m => m.status === 'open').length;

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading messages...</div>;

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '30px' }}>
                <h2 style={{ color: 'var(--primary)', marginBottom: '20px' }}>📬 Messages</h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                    <div className="fly-card" style={{ padding: '20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>New Messages</div>
                        <div style={{ fontSize: '2rem', fontWeight: '800', color: '#dc2626', marginTop: '10px' }}>{newCount}</div>
                    </div>
                    <div className="fly-card" style={{ padding: '20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Open</div>
                        <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--primary)', marginTop: '10px' }}>{openCount}</div>
                    </div>
                    <div className="fly-card" style={{ padding: '20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Solved</div>
                        <div style={{ fontSize: '2rem', fontWeight: '800', color: '#10b981', marginTop: '10px' }}>{solvedCount}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    {['open', 'solved', 'all'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                border: 'none',
                                background: filter === f ? 'var(--primary)' : '#e2e8f0',
                                color: filter === f ? '#fff' : 'var(--text-main)',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '0.9rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                {filteredMessages.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        background: '#f8fafc',
                        borderRadius: 'var(--radius)',
                        color: 'var(--text-muted)'
                    }}>
                        <p style={{ fontSize: '3rem', marginBottom: '10px' }}>📭</p>
                        <p style={{ fontSize: '1.1rem', fontWeight: '600' }}>No messages in this category</p>
                    </div>
                ) : (
                    filteredMessages.map(msg => (
                        <div
                            key={msg._id}
                            style={{
                                background: msg.isRead ? '#fff' : '#f0f9ff',
                                border: `2px solid ${msg.isRead ? 'var(--border-color)' : 'var(--primary)'}`,
                                borderRadius: 'var(--radius)',
                                padding: '20px',
                                marginBottom: '15px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onClick={() => setExpandedId(expandedId === msg._id ? null : msg._id)}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '15px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                        <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: '700' }}>{msg.title}</h3>
                                        {!msg.isRead && (
                                            <span style={{
                                                background: '#dc2626',
                                                color: '#fff',
                                                fontSize: '0.7rem',
                                                padding: '2px 8px',
                                                borderRadius: '50px',
                                                fontWeight: '700',
                                                textTransform: 'uppercase'
                                            }}>New</span>
                                        )}
                                        <span style={{
                                            background: msg.status === 'solved' ? '#10b981' : '#f59e0b',
                                            color: '#fff',
                                            fontSize: '0.7rem',
                                            padding: '2px 8px',
                                            borderRadius: '50px',
                                            fontWeight: '700',
                                            textTransform: 'uppercase'
                                        }}>{msg.status}</span>
                                    </div>
                                    <p style={{ margin: '5px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                        From: <strong>{msg.fromName}</strong> | Category: <strong>{msg.category}</strong>
                                    </p>
                                    <p style={{ margin: '5px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        {new Date(msg.createdAt).toLocaleString()}
                                    </p>
                                </div>
                                <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>
                                    {expandedId === msg._id ? '▼' : '▶'}
                                </span>
                            </div>

                            {expandedId === msg._id && (
                                <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                                        <p style={{ margin: 0, color: 'var(--text-main)', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{msg.message}</p>
                                    </div>

                                    {msg.response && (
                                        <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #dcfce7' }}>
                                            <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: '700', color: '#166534' }}>✅ Admin Response:</p>
                                            <p style={{ margin: 0, color: '#166534', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{msg.response}</p>
                                        </div>
                                    )}

                                    {msg.status === 'open' && (
                                        <div style={{ marginTop: '15px' }}>
                                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px', color: 'var(--text-main)' }}>Your Response</label>
                                            <textarea
                                                value={responseText[msg._id] || ''}
                                                onChange={(e) => setResponseText(prev => ({ ...prev, [msg._id]: e.target.value }))}
                                                placeholder="Type your response here..."
                                                rows="4"
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border-color)',
                                                    fontSize: '0.95rem',
                                                    outline: 'none',
                                                    boxSizing: 'border-box',
                                                    fontFamily: 'inherit',
                                                    resize: 'vertical'
                                                }}
                                            />
                                            <button
                                                onClick={() => handleRespond(msg._id)}
                                                style={{
                                                    background: 'var(--primary)',
                                                    color: '#fff',
                                                    padding: '10px 20px',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontWeight: '600',
                                                    marginTop: '10px',
                                                    fontSize: '0.95rem'
                                                }}
                                            >
                                                ✓ Mark as Solved & Respond
                                            </button>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => handleDelete(msg._id)}
                                        style={{
                                            background: '#fee2e2',
                                            color: '#991b1b',
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            marginTop: '10px',
                                            marginLeft: '10px',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        🗑️ Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AdminMessageViewer;
