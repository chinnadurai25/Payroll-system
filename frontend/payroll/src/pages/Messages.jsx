import React, { useState, useEffect } from "react";
import Button from "../components/Button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import MessageForm from "../components/MessageForm";
import AdminMessageViewer from "../components/AdminMessageViewer";
import "../styles/Messages.css";
import "../styles/Button.css";

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [employeeData, setEmployeeData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in
  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  // Fetch employee data for name
  useEffect(() => {
    if (!user?.email) return;

    const fetchEmployeeData = async () => {
      try {
        const res = await fetch("http://localhost:5001/api/employees");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        const currentEmp = data.find(emp => emp.email === user.email || emp.employeeId === user.employeeId);
        if (currentEmp) setEmployeeData(currentEmp);
      } catch (err) {
        console.warn("Error fetching employee data:", err);
      }
    };

    fetchEmployeeData();
  }, [user]);

  // Fetch messages
  const fetchMessages = React.useCallback(async () => {
    try {
      setLoading(true);
      const role = user?.role || "employee";
      const id = role === "admin" ? "admin" : (user?.employeeId || user?.email || user?.id || "");

      const url = `http://localhost:5001/api/messages?role=${role}&id=${encodeURIComponent(id)}`;
      const res = await fetch(url);

      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Error fetching messages:", err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch only (no auto-refresh)
  useEffect(() => {
    if (!user?.role) return;

    fetchMessages();
  }, [user?.role, user?.employeeId, user?.email, fetchMessages]);

  if (!user) return null;

  const isAdmin = user?.role === "admin";
  const isEmployee = user?.role === "employee";

  return (
    <div style={{ padding: "40px 20px", minHeight: "100vh", background: "#f8fafc" }} className="fade-in">
      <div className="container">
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "40px",
          paddingTop: "60px",
          paddingBottom: "20px"
        }}>
          <div>
            <h1 className="title-gradient" style={{ fontSize: "2.5rem", marginBottom: "5px" }}>
              💬 Messages
            </h1>
            <p style={{ color: "var(--text-muted)", fontWeight: "500" }}>
              {isAdmin ? "Admin: View and respond to employee queries" : "Send queries and feedback to admin"}
            </p>
          </div>
          {isAdmin && (
            <Button
              variant="primary"
              onClick={fetchMessages}
              style={{ padding: "12px 24px" }}
            >
              🔄 Refresh
            </Button>
          )}
        </div>

        {isEmployee && (
          <div style={{ marginBottom: "40px" }}>
            <MessageForm employee={employeeData} onMessageSent={fetchMessages} />
          </div>
        )}

        {isAdmin && (
          <AdminMessageViewer
            messages={messages}
            loading={loading}
            onStatusChange={fetchMessages}
            onDelete={fetchMessages}
          />
        )}

        {isEmployee && messages.length > 0 && (
          <div className="history-section">
            <h2 style={{ color: "var(--primary)", marginBottom: "20px" }}>📤 Your Messages History</h2>
            <div style={{ display: "grid", gap: "20px" }}>
              {messages.map(msg => (
                <div key={msg._id} className="message-card">
                  <div className="message-header">
                    <div>
                      <h3 style={{ margin: 0, color: "var(--text-main)", fontSize: "1.2rem", fontWeight: "700" }}>{msg.title}</h3>
                      <p style={{ margin: "5px 0 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        {new Date(msg.createdAt).toLocaleString()} • {msg.category}
                      </p>
                    </div>
                    <span className={`status-badge status-${msg.status}`}>
                      {msg.status.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ margin: "10px 0", color: "var(--text-main)", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{msg.message}</p>

                  {msg.response && (
                    <div className="admin-response">
                      <p style={{ margin: "0 0 8px 0", fontSize: "0.9rem", fontWeight: "800", color: "#166534", display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>👨‍💼</span> Admin Response:
                      </p>
                      <p style={{ margin: 0, color: "#15803d", fontSize: "0.95rem", whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
                        {msg.response}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
