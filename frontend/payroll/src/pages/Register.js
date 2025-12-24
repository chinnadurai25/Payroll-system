import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";
import "../styles/Register.css";

const Register = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const role = searchParams.get("role") || "employee";

  const [formData, setFormData] = useState({
    // Personal
    fullName: "",
    dob: "",
    personalEmail: "",
    phone: "",
    address: "",
    taxStatus: "Single",
    panNumber: "",
    aadharNumber: "",

    // Banking
    accountName: "",
    accountNumber: "",
    bankCode: "",
    accountType: "Savings",

    // Employment (❌ NO employeeId here)
    jobTitle: "",
    department: "",
    joiningDate: "",
    workLocation: "",

    // Emergency
    emergencyName: "",
    emergencyRel: "",
    emergencyPhone: "",
    consent: false,

    // Login
    email: "",
    password: "",
    confirmPassword: ""
  });

  const handleChange = (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          role
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Registration failed");
        return;
      }

      // ✅ Navigate to success page with generated data
      navigate("/employee-success", {
        state: {
          fullName: data.employee.fullName,
          email: data.employee.email,
          employeeId: data.employee.employeeId
        }
      });

    } catch (error) {
      alert("Server error");
    }
  };

  const SectionTitle = ({ children }) => (
    <h3 className="section-title">{children}</h3>
  );

  return (
    <div className="login-page">
      <div className="register-container fade-in">
        <div className="register-card">
          <div className="register-header">
            <h1 className="register-title">{role === "admin" ? "Admin" : "Employee"} Registration</h1>
            <p style={{ color: "var(--text-muted)" }}>
              Complete your profile to join the system
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* 1. Personal */}
            <div className="form-section">
              <SectionTitle>1. Personal Identity Details</SectionTitle>
              <div className="form-section-grid">
                <Input label="Full Name" name="fullName" value={formData.fullName} onChange={handleChange} required />
                <Input label="DOB" name="dob" type="date" value={formData.dob} onChange={handleChange} required />
                <Input label="Personal Email" name="personalEmail" value={formData.personalEmail} onChange={handleChange} required />
                <Input label="Phone" name="phone" value={formData.phone} onChange={handleChange} required />
                <Input label="Address" name="address" value={formData.address} onChange={handleChange} required />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <Input label="PAN Number" name="panNumber" value={formData.panNumber} onChange={handleChange} required />
                  <Input label="Aadhar Number" name="aadharNumber" value={formData.aadharNumber} onChange={handleChange} required />
                </div>
              </div>
            </div>

            {/* 2. Banking */}
            <div className="form-section">
              <SectionTitle>2. Banking Details</SectionTitle>
              <div className="form-section-grid">
                <Input label="Account Name" name="accountName" value={formData.accountName} onChange={handleChange} required />
                <Input label="Account Number" name="accountNumber" value={formData.accountNumber} onChange={handleChange} required />
                <Input label="IFSC Code" name="bankCode" value={formData.bankCode} onChange={handleChange} required />
              </div>
            </div>

            {/* 3. Employment */}
            <div className="form-section">
              <SectionTitle>3. Employment Details</SectionTitle>
              <div className="form-section-grid">
                <Input label="Job Title" name="jobTitle" value={formData.jobTitle} onChange={handleChange} required />
                <Input label="Department" name="department" value={formData.department} onChange={handleChange} required />
                <Input label="Joining Date" type="date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} required />
              </div>
            </div>

            {/* 4. Emergency */}
            <div className="form-section">
              <SectionTitle>4. Emergency Contact</SectionTitle>
              <div className="form-section-grid">
                <Input label="Name" name="emergencyName" value={formData.emergencyName} onChange={handleChange} required />
                <Input label="Relation" name="emergencyRel" value={formData.emergencyRel} onChange={handleChange} required />
                <Input label="Phone" name="emergencyPhone" value={formData.emergencyPhone} onChange={handleChange} required />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="consent"
                  checked={formData.consent}
                  onChange={handleChange}
                  required
                />
                <span style={{ fontSize: '0.9rem', color: '#64748b' }}>I agree to terms & policy</span>
              </label>
            </div>

            {/* 5. Login */}
            <div className="form-section">
              <SectionTitle>5. Login Credentials</SectionTitle>
              <div className="form-section-grid">
                <Input label="Login Email" name="email" value={formData.email} onChange={handleChange} required />
                <Input label="Password" type="password" name="password" value={formData.password} onChange={handleChange} required />
                <Input label="Confirm Password" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              style={{ width: "100%", padding: "14px 0" }}
            >
              Complete Registration
            </Button>

            <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
              <p style={{ color: "#64748b", margin: 0 }}>
                Already have an account?{" "}
                <Link to={`/login?role=${role}`} style={{ color: "var(--primary)", fontWeight: 600, textDecoration: 'none' }}>Login</Link>
              </p>
              <Link to="/role" className="back-link" style={{ marginTop: '1rem', justifyContent: 'center' }}>Back to Roles</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
