import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";
import "../styles/Login.css";

const Login = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const role = searchParams.get("role") || "employee";
  const [formData, setFormData] = useState({ email: "", password: "" });

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

      // Save logged-in user
      localStorage.setItem(
        "payroll_user",
        JSON.stringify({
          email: data.email,
          role: data.role
        })
      );

      // Navigate based on role
      navigate(
        data.role === "admin"
          ? "/admin-dashboard"
          : "/employee-dashboard"
      );
    } catch (err) {
      alert("Server error");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card fade-in">
        <div className="login-header">
          <h2 className="login-title">
            {role === "admin" ? "Admin" : "Employee"} Login
          </h2>
          <p className="login-subtitle">Welcome back, please sign in</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <Input
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <Input
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            className="btn-modern btn-primary w-full"
          >
            Sign In
          </Button>
        </form>

        <div className="login-footer">
          {role !== "admin" && (
            <p>
              Don't have an account?{" "}
              <Link
                to={`/register?role=${role}`}
                className="link-highlight"
              >
                Register here
              </Link>
            </p>
          )}
          <Link to="/" className="back-link">
            ← Back to Role Selection
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
