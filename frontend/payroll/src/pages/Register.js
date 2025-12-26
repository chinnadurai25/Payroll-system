import React, { useState, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";
import "../styles/Register.css";

// Simple account validation with mock data
const VALID_BANKS = {
  "HDFC0000001": "HDFC Bank",
  "ICIC0000001": "ICICI Bank",
  "SBIN0000001": "State Bank of India",
  "AXIS0000001": "Axis Bank",
  "BKID0000001": "Bank of India"
};

const validateAccountAndIFSC = async (accountNumber, ifscCode) => {
  if (!accountNumber || accountNumber.length < 9) {
    return { valid: false, error: "Account number must be at least 9 digits" };
  }
  if (!ifscCode || ifscCode.length !== 11) {
    return { valid: false, error: "IFSC code must be 11 characters" };
  }
  if (!VALID_BANKS[ifscCode]) {
    return { valid: false, error: "Invalid IFSC code. Valid codes: " + Object.keys(VALID_BANKS).join(", ") };
  }
  return { valid: true, bankName: VALID_BANKS[ifscCode] };
};

const detectFaceInImage = async (imageFile) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const data = imageData.data;
          let pixelVariation = 0;
          for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i+1] + data[i+2]) / 3;
            if (Math.abs(data[i] - avg) > 20) pixelVariation++;
          }
          
          const hasFace = pixelVariation > (data.length / 4) * 0.3;
          resolve({ success: hasFace, message: hasFace ? "Face detected ✓" : "No face detected" });
        } catch (err) {
          resolve({ success: false, message: "Error processing image" });
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(imageFile);
  });
};

const Register = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const role = searchParams.get("role") || "employee";
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    fullName: "",
    dob: "",
    personalEmail: "",
    phone: "",
    address: "",
    taxStatus: "Single",
    panNumber: "",
    aadharNumber: "",
    accountName: "",
    accountNumber: "",
    bankCode: "",
    accountType: "Savings",
    jobTitle: "",
    department: "",
    joiningDate: "",
    workLocation: "",
    emergencyName: "",
    emergencyRel: "",
    emergencyPhone: "",
    consent: false,
    email: "",
    password: "",
    confirmPassword: "",
    profilePhoto: null,
    profilePhotoPreview: null
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [faceDetected, setFaceDetected] = useState(null);

  const handleChange = (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: "" });
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrors({ ...errors, profilePhoto: "Photo must be less than 5MB" });
      return;
    }

    const preview = URL.createObjectURL(file);
    setFormData({ ...formData, profilePhoto: file, profilePhotoPreview: preview });

    const result = await detectFaceInImage(file);
    setFaceDetected(result.success);
    if (!result.success) {
      setErrors({ ...errors, profilePhoto: result.message });
    } else {
      setErrors({ ...errors, profilePhoto: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!formData.email.endsWith("@fly.gmail.com")) {
      newErrors.email = "Email must end with @fly.gmail.com";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    // Confirm password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Photo is required
    if (!formData.profilePhoto) {
      newErrors.profilePhoto = "Profile photo is required";
    }

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      // Scroll to first error
      window.scrollTo(0, 0);
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      // Show which fields have errors
      const errorFields = Object.keys(errors);
      const errorMsg = `Please fix errors: ${errorFields.join(", ")}`;
      alert(errorMsg);
      return;
    }

    setLoading(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(formData.profilePhoto);
      reader.onload = async () => {
        const photoBase64 = reader.result;

        const res = await fetch("http://localhost:5000/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: formData.fullName,
            dob: formData.dob,
            personalEmail: formData.personalEmail,
            phone: formData.phone,
            address: formData.address,
            taxStatus: formData.taxStatus,
            panNumber: formData.panNumber,
            aadharNumber: formData.aadharNumber,
            accountName: formData.accountName,
            accountNumber: formData.accountNumber,
            bankCode: formData.bankCode,
            accountType: formData.accountType,
            jobTitle: formData.jobTitle,
            department: formData.department,
            joiningDate: formData.joiningDate,
            workLocation: formData.workLocation,
            emergencyName: formData.emergencyName,
            emergencyRel: formData.emergencyRel,
            emergencyPhone: formData.emergencyPhone,
            consent: formData.consent,
            email: formData.email,
            password: formData.password,
            profilePhoto: photoBase64,
            role
          })
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.message || "Registration failed");
          setLoading(false);
          return;
        }

        navigate("/employee-success", {
          state: {
            fullName: data.employee.fullName,
            email: data.employee.email,
            employeeId: data.employee.employeeId
          }
        });
      };
    } catch (error) {
      alert("Server error: " + error.message);
      setLoading(false);
    }
  };

  const handleAccountValidation = async () => {
    if (!formData.accountNumber || !formData.bankCode) {
      setErrors({ ...errors, accountNumber: "Enter both account number and IFSC code" });
      return;
    }

    const result = await validateAccountAndIFSC(formData.accountNumber, formData.bankCode);
    if (!result.valid) {
      setErrors({ ...errors, accountNumber: result.error });
    } else {
      setFormData({ ...formData, accountName: result.bankName });
      setErrors({ ...errors, accountNumber: "" });
    }
  };

  const SectionTitle = ({ children }) => (
    <h3 className="section-title">{children}</h3>
  );

  const ErrorMessage = ({ field }) =>
    errors[field] && <p style={{ color: "#ef4444", fontSize: "0.85rem", margin: "5px 0 0 0" }}>{errors[field]}</p>;

  return (
    <div className="login-page" style={{
      minHeight: "100vh",
      padding: "40px 20px"
    }}>
      <style>{`
        .register-container {
          max-width: 900px;
          margin: 0 auto;
        }

        .register-card {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 40px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .register-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .register-title {
          font-size: 2rem;
          font-weight: 800;
          background: linear-gradient(135deg, #00d4ff, #7c3aed);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 10px;
        }

        .register-header p {
          color: #a0a0b0;
          font-weight: 500;
          margin: 0;
        }

        .form-section {
          margin-bottom: 30px;
          padding-bottom: 30px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .form-section:last-of-type {
          border-bottom: none;
        }

        .section-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: #00d4ff;
          margin-bottom: 20px;
          margin-top: 0;
        }

        .form-section-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 15px;
        }

        .form-label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #ffffff;
          font-size: 0.9rem;
        }

        .form-input,
        .form-select,
        .form-textarea {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: #ffffff;
          font-size: 1rem;
          transition: all 0.3s;
        }

        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #00d4ff;
          background: rgba(255, 255, 255, 0.12);
          box-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
        }

        .form-input::placeholder {
          color: #707080;
        }

        .form-textarea {
          resize: vertical;
          min-height: 100px;
        }

        .btn-modern {
          padding: 12px 24px;
          border-radius: 8px;
          border: none;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s;
          font-size: 0.95rem;
        }

        .btn-primary {
          background: linear-gradient(135deg, #00d4ff, #7c3aed);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 212, 255, 0.3);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.1);
          color: #00d4ff;
          border: 1px solid rgba(0, 212, 255, 0.3);
        }

        .btn-secondary:hover {
          background: rgba(0, 212, 255, 0.1);
          border-color: #00d4ff;
        }

        .back-link {
          color: #00d4ff;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s;
        }

        .back-link:hover {
          color: #7c3aed;
          text-decoration: underline;
        }
      `}</style>
      <div className="register-container fade-in">
        <div className="register-card">
          <div className="register-header">
            <h1 className="register-title">{role === "admin" ? "Admin" : "Employee"} Registration</h1>
            <p style={{ color: "var(--text-muted)" }}>
              Complete your profile to join the system
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Show all errors at the top */}
            {Object.keys(errors).length > 0 && (
              <div style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#fca5a5",
                padding: "16px",
                borderRadius: "12px",
                marginBottom: "25px",
                backdropFilter: "blur(10px)"
              }}>
                <p style={{ margin: "0 0 12px 0", fontWeight: "700", fontSize: "0.95rem", color: "#fecaca" }}>⚠️ Please fix these errors:</p>
                <ul style={{ margin: 0, paddingLeft: "20px" }}>
                  {Object.entries(errors).map(([field, message]) => (
                    <li key={field} style={{ margin: "6px 0", fontSize: "0.9rem" }}>
                      <strong>{field}:</strong> {message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

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
                <div>
                  <Input label="Account Number" name="accountNumber" value={formData.accountNumber} onChange={handleChange} required />
                  <ErrorMessage field="accountNumber" />
                </div>
                <div>
                  <Input label="IFSC Code" name="bankCode" value={formData.bankCode} onChange={handleChange} required />
                </div>
                <Button type="button" onClick={handleAccountValidation} variant="secondary" style={{ padding: "10px 15px", alignSelf: "flex-end" }}>
                  Validate Account
                </Button>
              </div>
              {formData.accountName && (
                <p style={{ color: "#10b981", marginTop: "10px", fontWeight: "600" }}>✓ Account Holder: {formData.accountName}</p>
              )}
              <Input label="Account Type" name="accountType" value={formData.accountType} onChange={handleChange} disabled style={{ marginTop: "10px" }} />
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

            {/* 4. Profile Photo */}
            <div className="form-section">
              <SectionTitle>4. Profile Photo (Face Detection)</SectionTitle>
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "10px", fontWeight: "600", color: "#ffffff" }}>
                  📸 Upload Photo
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: "2px dashed #00d4ff",
                    borderRadius: "12px",
                    padding: "40px 20px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: "rgba(0, 212, 255, 0.08)",
                    transition: "all 0.3s",
                    marginBottom: "15px"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = "rgba(0, 212, 255, 0.15)"}
                  onMouseOut={(e) => e.currentTarget.style.background = "rgba(0, 212, 255, 0.08)"}
                >
                  <p style={{ margin: 0, fontWeight: "600", color: "#00d4ff" }}>Click to upload photo</p>
                  <p style={{ margin: "5px 0 0 0", fontSize: "0.9rem", color: "#a0a0b0" }}>PNG, JPG (Max 5MB)</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: "none" }}
                />
                <ErrorMessage field="profilePhoto" />
              </div>

              {formData.profilePhotoPreview && (
                <div style={{ marginBottom: "15px" }}>
                  <img
                    src={formData.profilePhotoPreview}
                    alt="Preview"
                    style={{
                      maxWidth: "150px",
                      maxHeight: "150px",
                      borderRadius: "12px",
                      border: "2px solid var(--primary)"
                    }}
                  />
                  <p style={{ marginTop: "10px", fontSize: "0.9rem", color: faceDetected ? "#10b981" : "#ef4444", fontWeight: "600" }}>
                    {faceDetected ? "✓ Face detected" : "✗ Face not detected"}
                  </p>
                </div>
              )}
            </div>

            {/* 5. Emergency */}
            <div className="form-section">
              <SectionTitle>5. Emergency Contact</SectionTitle>
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

            {/* 6. Login */}
            <div className="form-section">
              <SectionTitle>6. Login Credentials</SectionTitle>
              <div className="form-section-grid">
                <div>
                  <Input
                    label="Login Email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@fly.gmail.com"
                    required
                  />
                  <ErrorMessage field="email" />
                </div>
                <div>
                  <Input
                    label="Password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <ErrorMessage field="password" />
                </div>
                <div>
                  <Input
                    label="Confirm Password"
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                  <ErrorMessage field="confirmPassword" />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              style={{ width: "100%", padding: "14px 0", background: "linear-gradient(135deg, #00d4ff, #7c3aed)", border: "none" }}
              disabled={loading}
            >
              {loading ? "⏳ Registering..." : "✓ Complete Registration"}
            </Button>

            <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
              <p style={{ color: "#a0a0b0", margin: 0 }}>
                Already have an account?{" "}
                <Link to={`/login?role=${role}`} style={{ color: "#00d4ff", fontWeight: 600, textDecoration: 'none' }}>Login</Link>
              </p>
              <Link to="/role" className="back-link" style={{ marginTop: '1rem', justifyContent: 'center', display: 'inline-block' }}>Back to Roles</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
