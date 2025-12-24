import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isDashboard =
    location.pathname.includes("employee-dashboard") ||
    location.pathname.includes("admin-dashboard");

  // hide navbar completely on certain pages if needed
  const hideNavbar = false;

  if (hideNavbar) return null;

  return (
    <>
      <style>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .back-btn-animated {
          animation: slideInLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .back-btn-animated:hover {
          transform: scale(1.1) !important;
          background: rgba(14, 116, 144, 0.1) !important;
          color: var(--primary) !important;
        }
      `}</style>
      <nav className="no-print" style={{
        ...styles.nav,
        ...(isDashboard ? styles.dashboardNav : {})
      }}>
        <div style={styles.container}>
          <div style={styles.logoContainer}>
            {location.pathname !== "/" && (
              <button
                onClick={() => navigate(-1)}
                style={styles.backBtn}
                className="back-btn-animated"
                title="Go Back"
              >
                ←
              </button>
            )}
            <Link to="/" style={styles.logoLink}>
              <img
                src="https://flytowardsdigitalinnovation.com/wp-content/uploads/2025/07/cropped-DIGITAL_INNOVATION-removebg-preview-1-1-1.png"
                alt="Fly Towards Digital Innovation"
                style={styles.logoImage}
              />
              <div style={styles.logoText}>
                <span style={{ color: "var(--primary)" }}>Fly</span>
                <span style={{ color: "var(--text-main)" }}>Payroll</span>
              </div>
            </Link>
          </div>

          <div style={styles.links}>
            {!user && (
              <>
                <Link to="/login?role=admin" style={{ ...styles.link, ...styles.adminBtn }}>
                  ADMIN
                </Link>
                <Link to="/login?role=employee" style={{ ...styles.link, ...styles.employeeBtn }}>
                  EMPLOYEE
                </Link>
              </>
            )}
            {user && (
              <div style={styles.userInfo}>
                <span style={styles.userRole}>{user.role?.toUpperCase()}</span>
                <span style={styles.userName}>
                  {user.fullName || user.email?.split('@')[0]}
                </span>
                <button onClick={handleLogout} style={styles.logoutBtn}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
};

const styles = {
  nav: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    zIndex: 100,
    background: "transparent",
    borderBottom: "none",
    boxShadow: "none",
  },
  dashboardNav: {
    background: "transparent",
  },
  container: {
    maxWidth: "1400px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 30px",
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
  },
  backBtn: {
    background: "rgba(255, 255, 255, 0.15)",
    border: "1px solid rgba(14, 165, 233, 0.2)",
    color: "var(--text-main)",
    width: "40px",
    height: "40px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: "1.4rem",
    marginRight: "20px",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    backdropFilter: "blur(4px)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  },
  logoLink: {
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
    gap: '12px',
  },
  logoImage: {
    height: "45px",
    width: "auto",
    objectFit: "contain",
  },
  logoText: {
    fontSize: "1.7rem",
    fontWeight: "800",
    letterSpacing: "-0.8px",
    lineHeight: 1,
  },
  links: {
    display: "flex",
    gap: "25px",
    alignItems: "center",
  },
  link: {
    color: "var(--text-main)",
    textDecoration: "none",
    fontSize: "16px",
    fontWeight: "600",
    transition: "color 0.2s",
  },
  adminBtn: {
    background: "var(--ocean-gradient)",
    padding: "10px 24px",
    borderRadius: "50px",
    color: "#fff",
    boxShadow: "0 4px 15px rgba(12, 74, 110, 0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    fontWeight: "700",
  },
  employeeBtn: {
    background: "var(--fly-gradient)",
    padding: "10px 24px",
    borderRadius: "50px",
    color: "#fff",
    boxShadow: "0 4px 15px rgba(14, 165, 233, 0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    fontWeight: "700",
  },
  userInfo: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "12px",
    background: "rgba(255, 255, 255, 0.4)",
    padding: "6px 16px",
    borderRadius: "50px",
    border: "1px solid rgba(255, 255, 255, 0.3)",
  },
  userName: {
    color: "var(--text-main)",
    fontSize: "15px",
    fontWeight: "700",
  },
  userRole: {
    color: "var(--primary)",
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "1px",
    background: "var(--secondary)",
    padding: "2px 8px",
    borderRadius: "4px",
  },
  logoutBtn: {
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    color: "#ef4444",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "700",
    cursor: "pointer",
    marginLeft: "8px",
    transition: "all 0.2s",
  }
};

export default Navbar;
