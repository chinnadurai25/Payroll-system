import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Navbar.css";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
    navigate("/login");
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const isHome = location.pathname === "/";
  // Updated dashboard paths check to match earlier versions logic if needed, 
  // but standardizing on /dashboard and /admin-dashboard for now.
  const isDashboard = ["/dashboard", "/admin-dashboard", "/employee-dashboard"].some(path => location.pathname.includes(path));
  const showBackButton = !isHome && !isDashboard;

  return (
    <nav className={`navbar no-print ${scrolled ? "scrolled" : ""}`}>
      <div className="navbar-container">
        <div className="logo-container">
          {showBackButton && (
            <button
              onClick={() => navigate(-1)}
              className="back-btn"
              style={{
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
              }}
              title="Go Back"
            >
              ←
            </button>
          )}
          <Link to="/" className="logo-link" onClick={closeMenu}>
            <img
              src="https://flytowardsdigitalinnovation.com/wp-content/uploads/2025/07/cropped-DIGITAL_INNOVATION-removebg-preview-1-1-1.png"
              alt="Logo"
              className="logo-image"
            />
            <span className="logo-text">
              <span style={{ color: "var(--primary)" }}>Fly</span>
              <span style={{ color: "var(--text-main)" }}>Payroll</span>
            </span>
          </Link>
        </div>

        <button className={`burger-menu ${isMenuOpen ? "active" : ""}`} onClick={toggleMenu} aria-label="Toggle Navigation">
          <span className="burger-line"></span>
          <span className="burger-line"></span>
          <span className="burger-line"></span>
        </button>

        <div className={`nav-links ${isMenuOpen ? "active" : ""}`}>
          <Link to="/about" className="nav-link" onClick={closeMenu}>About Us</Link>

          {!user ? (
            <>
              <Link to="/login?role=admin" className="admin-btn" onClick={closeMenu}>Admin Login</Link>
              <Link to="/login?role=employee" className="employee-btn" onClick={closeMenu}>Employee Login</Link>
            </>
          ) : (
            <div className="user-info">
              <span className="user-role">{user.role?.toUpperCase()}</span>
              <span className="user-name">{user.fullName || user.email?.split('@')[0]}</span>
              <button
                onClick={handleLogout}
                className="logout-btn"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
