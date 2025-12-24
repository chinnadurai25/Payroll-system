import React, { useState, useMemo, useEffect } from "react";

const weekdayShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const AttendancePanel = ({
  employee,
  onMarkAttendance,
  onMonthChange,
  initialStatuses = {},
  role = "admin" // pass role from parent
}) => {
  const today = new Date();

  const [viewDate, setViewDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const [statuses, setStatuses] = useState({});

  /* ---------- SYNC DATA ---------- */
  useEffect(() => {
    setStatuses(initialStatuses || {});
  }, [initialStatuses, employee?.employeeId]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  /* ---------- CURRENT MONTH CHECK ---------- */
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth();

  const isEditable = role === "admin" && isCurrentMonth;

  /* ---------- NOTIFY PARENT ---------- */
  useEffect(() => {
    onMonthChange?.(
      `${year}-${String(month + 1).padStart(2, "0")}`
    );
  }, [year, month, onMonthChange]);

  /* ---------- NAVIGATION ---------- */
  const handlePrev = () =>
    setViewDate(new Date(year, month - 1, 1));

  const handleNext = () =>
    setViewDate(new Date(year, month + 1, 1));

  /* ---------- CALENDAR ---------- */
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();

  const cells = Array.from({ length: 42 }).map((_, i) => {
    const day = i - firstWeekday + 1;
    if (day < 1 || day > daysInMonth) return null;

    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { day, dateStr };
  });

  const markStatus = (date, status) => {
    if (!isEditable) return;

    setStatuses(prev => ({ ...prev, [date]: status }));
    onMarkAttendance(employee.employeeId, date, status);
  };

  const statusColor = {
    P: "#16a34a",
    A: "#ef4444",
    L: "#f97316"
  };

  if (!employee) return null;

  return (
    <div style={{ background: "#fff", padding: 16, borderRadius: 10 }}>

      {/* ---------- HEADER ---------- */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15
      }}>
        <h3>
          Attendance — {employee.fullName}
        </h3>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={handlePrev}>◀</button>
          <strong>
            {viewDate.toLocaleString("default", { month: "long" })} {year}
          </strong>
          <button onClick={handleNext}>▶</button>
        </div>
      </div>

      {/* ---------- INFO ---------- */}
      <p style={{ fontSize: 12, color: "#555" }}>
        {isEditable
          ? "🟢 Editing enabled (current month)"
          : "🔒 View only (past / future month)"}
      </p>

      {/* ---------- CALENDAR ---------- */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 6
      }}>
        {weekdayShort.map(d => (
          <strong key={d} style={{ textAlign: "center" }}>{d}</strong>
        ))}

        {cells.map((cell, i) =>
          cell ? (
            <div
              key={i}
              style={{
                border: "1px solid #ddd",
                minHeight: 70,
                padding: 6,
                borderRadius: 6
              }}
            >
              <div style={{ fontWeight: 600 }}>{cell.day}</div>

              {statuses[cell.dateStr] && (
                <div style={{
                  height: 5,
                  background: statusColor[statuses[cell.dateStr]],
                  marginTop: 4
                }} />
              )}

              {isEditable && (
                <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                  {["P", "L", "A"].map(s => (
                    <button
                      key={s}
                      onClick={() => markStatus(cell.dateStr, s)}
                      style={{
                        flex: 1,
                        fontSize: 10,
                        background:
                          statuses[cell.dateStr] === s
                            ? statusColor[s]
                            : "#eee",
                        color:
                          statuses[cell.dateStr] === s ? "#fff" : "#000"
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div key={i} />
          )
        )}
      </div>
    </div>
  );
};

export default AttendancePanel;
