import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const MessageForm = ({ employee, onMessageSent }) => {
    const { user } = useAuth();

    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [category, setCategory] = useState('query');
    const [images, setImages] = useState([]);
    const [sending, setSending] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    /* ---------------- IMAGE HANDLING ---------------- */

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);

        const validImages = files.filter(file =>
            file.type.startsWith('image/')
        );

        setImages(prev => [...prev, ...validImages]);
    };

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    /* ---------------- FORM SUBMIT ---------------- */

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSending(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            // Convert images to Base64
            const convertToBase64 = (file) => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = (error) => reject(error);
                });
            };

            const base64Images = await Promise.all(images.map(img => convertToBase64(img)));

            const payload = {
                fromRole: 'employee',
                fromId: user?.employeeId || user?.email,
                fromName: employee?.fullName || user?.email,
                toRole: 'admin',
                toId: 'admin',
                title,
                message,
                category,
                status: 'open',
                images: base64Images
            };

            const res = await fetch('http://localhost:5001/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to send message');

            setSuccessMsg('✅ Message sent successfully!');
            setTitle('');
            setMessage('');
            setCategory('query');
            setImages([]);

            if (onMessageSent) onMessageSent();

            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            setErrorMsg('❌ Error sending message: ' + err.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="message-form-card fade-in">
            <h2 style={{
                color: 'var(--primary)',
                marginBottom: '25px',
                fontSize: '1.6rem',
                textAlign: 'center'
            }}>
                📝 Send Query to Admin
            </h2>

            {/* SUCCESS MESSAGE */}
            {successMsg && (
                <div style={{
                    background: '#ecfdf5',
                    color: '#047857',
                    padding: '16px',
                    borderRadius: '12px',
                    marginBottom: '20px',
                    border: '1px solid #6ee7b7',
                    fontWeight: '600'
                }}>
                    ✅ {successMsg}
                </div>
            )}

            {/* ERROR MESSAGE */}
            {errorMsg && (
                <div style={{
                    background: '#fef2f2',
                    color: '#b91c1c',
                    padding: '16px',
                    borderRadius: '12px',
                    marginBottom: '20px',
                    border: '1px solid #fecaca'
                }}>
                    {errorMsg}
                </div>
            )}

            <form onSubmit={handleSubmit}>

                {/* TITLE */}
                <div style={{ marginBottom: '20px' }}>
                    <label className="form-label">Title</label>
                    <input
                        type="text"
                        className="form-input"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Brief subject of your query"
                        required
                    />
                </div>

                {/* CATEGORY */}
                <div style={{ marginBottom: '20px' }}>
                    <label className="form-label">Category</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="form-select"
                    >
                        <option value="query">❓ General Query</option>
                        <option value="error">⚠️ Error / Issue</option>
                        <option value="feedback">💡 Feedback</option>
                        <option value="other">📝 Other</option>
                    </select>
                </div>

                {/* MESSAGE */}
                <div style={{ marginBottom: '20px' }}>
                    <label className="form-label">Message</label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="form-textarea text-area-resize"
                        placeholder="Describe your query or issue in detail..."
                        required
                        rows="6"
                    />
                </div>

                {/* IMAGE UPLOAD */}
                <div style={{ marginBottom: '20px' }}>
                    <label className="form-label">
                        Attach Images (optional)
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                        className="form-input"
                    />

                    {/* IMAGE PREVIEW */}
                    {images.length > 0 && (
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            marginTop: '12px',
                            flexWrap: 'wrap'
                        }}>
                            {images.map((img, index) => (
                                <div key={index} style={{ position: 'relative' }}>
                                    <img
                                        src={URL.createObjectURL(img)}
                                        alt="preview"
                                        style={{
                                            width: '90px',
                                            height: '90px',
                                            objectFit: 'cover',
                                            borderRadius: '10px',
                                            border: '1px solid #ddd'
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        style={{
                                            position: 'absolute',
                                            top: '-6px',
                                            right: '-6px',
                                            background: '#ef4444',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: '22px',
                                            height: '22px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* SUBMIT */}
                <button
                    type="submit"
                    disabled={sending}
                    className={`btn-modern btn-message w-full ${sending ? 'opacity-50' : ''}`}
                    style={{ fontSize: '1.1rem' }}
                >
                    {sending ? '⏳ Sending...' : '📤 Send Message'}
                </button>
            </form>
        </div>
    );
};

export default MessageForm;
