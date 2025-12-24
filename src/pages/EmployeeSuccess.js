import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

const EmployeeSuccess = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  if (!state) {
    return <p style={{ color: "white", textAlign: "center" }}>No data found</p>;
  }

  return (
    <>
      {/* 🔹 Internal CSS */}
      <style>{`
        .success-container {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 16px;
          padding: 30px 40px;
          width: 420px;
          color: #fff;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.25);
        }

        .glass-card h2 {
          text-align: center;
          margin-bottom: 20px;
        }

        .info {
          margin: 12px 0;
          font-size: 1rem;
        }

        .info span {
          font-weight: bold;
          color: #ffd700;
        }

        .btn {
          margin-top: 20px;
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 8px;
          background: #4caf50;
          color: white;
          font-size: 1rem;
          cursor: pointer;
        }

        .btn:hover {
          background: #43a047;
        }
      `}</style>

      {/* 🔹 UI */}
      <div className="success-container">
        <div className="glass-card">
          <h2>🎉 Registration Successful</h2>

          <div className="info">
            <span>Name:</span> {state.fullName}
          </div>

          <div className="info">
            <span>Email:</span> {state.email}
          </div>

          <div className="info">
            <span>Employee ID:</span> {state.employeeId}
          </div>

          <button className="btn" onClick={() => navigate("/login?role=employee")}>
            Go to Login
          </button>
        </div>
      </div>
    </>
  );
};

export default EmployeeSuccess;
