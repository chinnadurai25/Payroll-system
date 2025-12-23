import React, { useState, useMemo, useEffect } from 'react';

const weekdayShort = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const AttendancePanel = ({ employee, onMarkAttendance, initialStatuses = {} }) => {
    const [currentMonth, setCurrentMonth] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });

    // statuses: { 'YYYY-MM-DD': 'P'|'A'|'L' }
    const [statuses, setStatuses] = useState({});

    const initialStatusesKey = useMemo(() => JSON.stringify(initialStatuses || {}), [initialStatuses]);

    useEffect(() => {
        // initialize from provided data (when employee or initialStatuses changes)
        if (initialStatuses && Object.keys(initialStatuses).length > 0) {
            setStatuses(initialStatuses);
        } else {
            setStatuses({});
        }
    }, [employee?.employeeId, initialStatusesKey, initialStatuses]);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const daysInMonth = useMemo(() => {
        return new Date(year, month + 1, 0).getDate();
    }, [year, month]);

    const monthLabel = useMemo(() => {
        return currentMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' });
    }, [currentMonth]);

    if (!employee) return null;

    const handlePrev = () => setCurrentMonth(new Date(year, month - 1, 1));
    const handleNext = () => setCurrentMonth(new Date(year, month + 1, 1));

    const toggleStatus = (dateStr, value) => {
        setStatuses(prev => {
            const next = { ...prev, [dateStr]: value };
            return next;
        });
        onMarkAttendance(employee.employeeId, dateStr, value);
    };

    // (Removed unused getCellStyle helper)

    const getSmallButtonStyle = (active, value) => {
        const base = {
            padding: '6px 8px',
            borderRadius: '6px',
            border: '1px solid transparent',
            cursor: 'pointer',
            fontSize: '0.8rem',
            minWidth: '28px',
            textAlign: 'center'
        };

        if (!active) return { ...base, background: '#f3f4f6', color: 'var(--text-muted)' };

        if (value === 'P') return { ...base, background: '#16a34a', color: 'white', borderColor: '#16a34a' };
        if (value === 'L') return { ...base, background: '#f97316', color: 'white', borderColor: '#ea580c' };
        if (value === 'A') return { ...base, background: '#ef4444', color: 'white', borderColor: '#dc2626' };

        return base;
    };

    // Build a calendar grid (7 columns: Sun-Sat)
    const firstWeekday = new Date(year, month, 1).getDay();
    const totalCells = firstWeekday + daysInMonth;
    const weeks = Math.ceil(totalCells / 7);

    // cells array: either null (empty leading/trailing) or day number
    const cells = new Array(weeks * 7).fill(null).map((_, idx) => {
        const dayNumber = idx - firstWeekday + 1;
        if (dayNumber < 1 || dayNumber > daysInMonth) return null;
        const dateObj = new Date(year, month, dayNumber);
        const dateStr = dateObj.toISOString().split('T')[0];
        return { day: dayNumber, dateStr, weekday: weekdayShort[dateObj.getDay()] };
    });

    return (
        <div style={{
            background: '#fff',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border-color)',
            padding: '18px',
            marginTop: '25px',
            boxShadow: 'var(--shadow-sm)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, color: 'var(--primary)' }}>Attendance — {employee.fullName || employee.email}</h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button onClick={handlePrev} style={{ padding: '6px 10px', borderRadius: '8px' }}>◀</button>
                    <div style={{ fontWeight: 600 }}>{monthLabel}</div>
                    <button onClick={handleNext} style={{ padding: '6px 10px', borderRadius: '8px' }}>▶</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                {weekdayShort.map(w => (
                    <div key={w} style={{ textAlign: 'center', fontWeight: 700, padding: '8px 0', color: 'var(--text-muted)' }}>{w}</div>
                ))}

                {cells.map((cell, i) => (
                    <div key={i} style={{ border: '1px solid var(--border-color)', minHeight: '110px', padding: '10px', borderRadius: '8px', background: cell ? '#fff' : 'transparent' }}>
                        {cell ? (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{cell.day}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cell.weekday}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                    {['P','L','A'].map(val => {
                                        const active = statuses[cell.dateStr] === val;
                                        return (
                                            <button
                                                key={val}
                                                title={val === 'P' ? 'Present' : val === 'L' ? 'Leave' : 'Absent'}
                                                onClick={() => toggleStatus(cell.dateStr, val)}
                                                style={getSmallButtonStyle(active, val)}
                                            >
                                                {val}
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        ) : null}
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '12px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Click a day's P / L / A to mark attendance for that date.
            </div>
        </div>
    );
};

export default AttendancePanel;
