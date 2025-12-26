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
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 16px;
          padding: 30px 40px;
          width: 420px;
          color: #fff;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.25);
        }

        .glass-card h2 {
          text-align: center;
          margin-bottom: 20px;
          font-size: 1.8rem;
          background: linear-gradient(135deg, #00d4ff, #7c3aed);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .info {
          margin: 12px 0;
          font-size: 1rem;
          background: rgba(255, 255, 255, 0.08);
          padding: 12px 16px;
          border-radius: 8px;
          border-left: 3px solid #00d4ff;
        }

        .info span {
          font-weight: bold;
          color: #00d4ff;
        }

        .btn {
          margin-top: 20px;
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 8px;
          background: linear-gradient(135deg, #00d4ff, #7c3aed);
          color: white;
          font-size: 1rem;
          cursor: pointer;
          font-weight: 700;
          transition: all 0.3s ease;
        }

        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 212, 255, 0.3);
        }

        .btn:active {
          transform: scale(0.98);
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
