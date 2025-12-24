import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const EmployeeProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* 🔙 Back Button */}
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          ← Back
        </button>

        <h2 style={styles.heading}>My Profile</h2>

        <div style={styles.row}>
          <strong>Name:</strong> {user?.fullName}
        </div>
        <div style={styles.row}>
          <strong>Email:</strong> {user?.email}
        </div>
        <div style={styles.row}>
          <strong>Employee ID:</strong> {user?.employeeId}
        </div>
        <div style={styles.row}>
          <strong>Role:</strong> {user?.role}
        </div>

      </div>
    </div>
  );
};

/* 🔹 Internal CSS */
const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px"
  },
  card: {
    width: "100%",
    maxWidth: "500px",
    background: "rgba(255,255,255,0.15)",
    backdropFilter: "blur(12px)",
    borderRadius: "16px",
    padding: "25px",
    color: "#fff",
    position: "relative"
  },
  backBtn: {
    position: "absolute",
    top: "15px",
    left: "15px",
    background: "transparent",
    border: "none",
    color: "#fff",
    fontSize: "1rem",
    cursor: "pointer"
  },
  heading: {
    textAlign: "center",
    marginBottom: "25px"
  },
  row: {
    marginBottom: "12px",
    fontSize: "1rem"
  }
};

export default EmployeeProfile;
