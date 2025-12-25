import React, { useState, useEffect } from "react";
import Button from "../components/Button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import MessageForm from "../components/MessageForm";
import AdminMessageViewer from "../components/AdminMessageViewer";

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
        const res = await fetch("http://localhost:5000/api/employees");
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
  const fetchMessages = async () => {
    try {
      setLoading(true);
      const role = user?.role || "employee";
      const id = role === "admin" ? "admin" : (user?.employeeId || user?.email || user?.id || "");

      const url = `http://localhost:5000/api/messages?role=${role}&id=${encodeURIComponent(id)}`;
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
  };

  // Initial fetch only (no auto-refresh)
  useEffect(() => {
    if (!user?.role) return;
    
    fetchMessages();
  }, [user?.role, user?.employeeId, user?.email]);

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
          <div style={{ marginTop: "40px" }}>
            <h2 style={{ color: "var(--primary)", marginBottom: "20px" }}>📤 Your Messages History</h2>
            <div style={{ display: "grid", gap: "15px" }}>
              {messages.map(msg => (
                <div
                  key={msg._id}
                  style={{
                    background: "#fff",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius)",
                    padding: "20px",
                    boxShadow: "var(--shadow-sm)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "10px" }}>
                    <div>
                      <h3 style={{ margin: 0, color: "var(--text-main)", fontSize: "1.1rem" }}>{msg.title}</h3>
                      <p style={{ margin: "5px 0 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        {new Date(msg.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span style={{
                      background: msg.status === "solved" ? "#dcfce7" : msg.status === "open" ? "#fef3c7" : "#e5e7eb",
                      color: msg.status === "solved" ? "#166534" : msg.status === "open" ? "#92400e" : "#374151",
                      padding: "4px 12px",
                      borderRadius: "20px",
                      fontSize: "0.8rem",
                      fontWeight: "700"
                    }}>
                      {msg.status.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ margin: "10px 0", color: "var(--text-main)", lineHeight: "1.6" }}>{msg.message}</p>
                  {msg.response && (
                    <div style={{
                      background: "#f0fdf4",
                      border: "1px solid #dcfce7",
                      padding: "12px",
                      borderRadius: "8px",
                      marginTop: "10px"
                    }}>
                      <p style={{ margin: "0 0 5px 0", fontSize: "0.85rem", fontWeight: "700", color: "#166534" }}>Admin Response:</p>
                      <p style={{ margin: 0, color: "#166534", fontSize: "0.95rem", whiteSpace: "pre-wrap", lineHeight: "1.5" }}>
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
