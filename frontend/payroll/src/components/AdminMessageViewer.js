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
        <div style={{ padding: '0 20px 40px' }}>
            <div style={{ marginBottom: '40px' }}>
                <div className="admin-stats-grid">
                    <div className="stat-card">
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>New Messages</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#dc2626', marginTop: '10px' }}>{newCount}</div>
                    </div>
                    <div className="stat-card">
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Open Tickets</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--primary)', marginTop: '10px' }}>{openCount}</div>
                    </div>
                    <div className="stat-card">
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Solved</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#10b981', marginTop: '10px' }}>{solvedCount}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    {['open', 'solved', 'all'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`filter-btn ${filter === f ? 'active' : 'inactive'}`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)} ({
                                f === 'all' ? messages.length :
                                    f === 'open' ? openCount : solvedCount
                            })
                        </button>
                    ))}
                </div>
            </div>

            <div>
                {filteredMessages.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '80px 20px',
                        background: '#f8fafc',
                        borderRadius: 'var(--radius)',
                        color: 'var(--text-muted)',
                        border: '2px dashed var(--border-color)'
                    }}>
                        <p style={{ fontSize: '4rem', marginBottom: '15px', opacity: 0.5 }}>📭</p>
                        <p style={{ fontSize: '1.2rem', fontWeight: '600' }}>No messages found in this category</p>
                    </div>
                ) : (
                    filteredMessages.map(msg => (
                        <div
                            key={msg._id}
                            className={`message-card ${!msg.isRead ? 'unread' : ''}`}
                            onClick={() => setExpandedId(expandedId === msg._id ? null : msg._id)}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '20px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                                        <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.15rem', fontWeight: '700' }}>{msg.title}</h3>
                                        {!msg.isRead && (
                                            <span className="status-badge status-new">NEW</span>
                                        )}
                                        <span className={`status-badge status-${msg.status}`}>
                                            {msg.status}
                                        </span>
                                    </div>
                                    <p style={{ margin: '6px 0', fontSize: '0.95rem', color: '#475569' }}>
                                        <span style={{ fontWeight: '600' }}>{msg.fromName}</span> <span style={{ color: '#94a3b8' }}>•</span> {msg.category}
                                    </p>
                                    <p style={{ margin: '6px 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                                        {new Date(msg.createdAt).toLocaleString()}
                                    </p>
                                </div>
                                <span style={{
                                    fontSize: '1.5rem',
                                    color: '#cbd5e1',
                                    transition: 'transform 0.3s',
                                    transform: expandedId === msg._id ? 'rotate(90deg)' : 'rotate(0deg)'
                                }}>
                                    ▶
                                </span>
                            </div>

                            {expandedId === msg._id && (
                                <div className="fade-in" style={{ marginTop: '25px', borderTop: '1px solid var(--border-color)', paddingTop: '25px' }} onClick={(e) => e.stopPropagation()}>
                                    <h4 style={{ fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>Message Content</h4>
                                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '25px', lineHeight: '1.7', color: '#334155' }}>
                                        {msg.message}
                                    </div>

                                    {msg.response && (
                                        <div className="admin-response">
                                            <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: '800', color: '#166534' }}>✅ Your Response:</p>
                                            <p style={{ margin: 0, color: '#166534', whiteSpace: 'pre-wrap', lineHeight: '1.7' }}>{msg.response}</p>
                                        </div>
                                    )}

                                    {msg.status === 'open' && (
                                        <div className="response-container">
                                            <label className="form-label">Write Response</label>
                                            <textarea
                                                className="form-textarea"
                                                value={responseText[msg._id] || ''}
                                                onChange={(e) => setResponseText(prev => ({ ...prev, [msg._id]: e.target.value }))}
                                                placeholder="Type your professional response here..."
                                                rows="5"
                                            />
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px' }}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRespond(msg._id); }}
                                                    className="btn-modern btn-primary"
                                                >
                                                    ✓ Mark Solved & Send
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(msg._id); }}
                                            style={{
                                                background: '#fee2e2',
                                                color: '#b91c1c',
                                                padding: '10px 20px',
                                                borderRadius: '50px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontWeight: '700',
                                                fontSize: '0.9rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            🗑️ Delete Ticket
                                        </button>
                                    </div>
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
