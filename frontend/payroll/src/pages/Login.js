import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Button from "../components/Button";
import Input from "../components/Input";
import "../styles/Login.css";

const Login = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const role = searchParams.get("role") || "employee";

  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          role
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message);
        return;
      }

      // ✅ FIXED: store fullName
      login({
  email: data.email,
  role: data.role,
  fullName: data.fullName,   // 👈 MATCH BACKEND
  employeeId: data.employeeId
});


      // ✅ Redirect
      if (data.role === "admin") {
        navigate("/admin-dashboard");
      } else {
        navigate("/employee-dashboard");
      }

    } catch (error) {
      alert("Server error");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>{role === "admin" ? "Admin" : "Employee"} Login</h2>

        <form onSubmit={handleSubmit}>
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <Input
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <div style={{ textAlign: "right", marginBottom: "12px" }}>
  <Link
    to="/forgot-password"
    style={{
      fontSize: "14px",
      color: "#007bff",
      textDecoration: "none"
    }}
  >
    Forgot Password?
  </Link>
</div>


          <Button type="submit" variant="primary">
            Login
          </Button>
        </form>

        <Link to="/">← Back</Link>
      </div>
    </div>
  );
};

export default Login;
