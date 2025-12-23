import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  // hide navbar completely on dashboards (optional)
  const hideNavbar =
    location.pathname.includes("employee-dashboard") ||
    location.pathname.includes("admin-dashboard");

  if (hideNavbar) return null;

  return (
    <nav style={styles.nav}>
      <h2 style={styles.logo}>PayrollPro</h2>

      <div style={styles.links}>
        <Link to="/" style={styles.link}>Home</Link>

        {/* ✅ Show Login only if NOT logged in */}
        {!user && (
          <Link to="/login" style={styles.link}>
            Login
          </Link>
        )}

        {/* ✅ If logged in (optional for later use) */}
        {user && (
          <span style={styles.userText}>
            {user.fullName || user.email}
          </span>
        )}
      </div>
    </nav>
  );
};

const styles = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 40px",
    backgroundColor: "#0f172a",
    color: "#fff"
  },
  logo: {
    margin: 0
  },
  links: {
    display: "flex",
    gap: "20px",
    alignItems: "center"
  },
  link: {
    color: "#e5e7eb",
    textDecoration: "none",
    fontSize: "16px"
  },
  userText: {
    color: "#38bdf8",
    fontSize: "14px"
  }
};

export default Navbar;
