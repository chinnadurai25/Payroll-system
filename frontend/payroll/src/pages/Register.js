import React, { useState, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";
import "../styles/Register.css";

// Simple account validation with mock data
// Banks commonly operating in Tamil Nadu
const TN_BANK_PREFIXES = {
  HDFC: "HDFC Bank",
  ICIC: "ICICI Bank",
  SBIN: "State Bank of India",
  AXIS: "Axis Bank",
  BKID: "Bank of India",
  INDB: "Indian Bank",
  IDIB: "Indian Overseas Bank",
  UCBA: "UCO Bank",
  PUNB: "Punjab National Bank",
  CNRB: "Canara Bank",
  TMBL: "Tamilnad Mercantile Bank",
  KVBL: "Karur Vysya Bank",
  SIBL: "South Indian Bank"
};

const validateAccountAndIFSC = async (accountNumber, ifscCode) => {
  if (!/^\d{9,18}$/.test(accountNumber)) {
    return { valid: false, error: "Account number must be 9–18 digits only" };
  }

  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  if (!ifscRegex.test(ifscCode)) {
    return { valid: false, error: "Invalid IFSC format (example: SBIN0001234)" };
  }

  const bankPrefix = ifscCode.substring(0, 4);
  if (!TN_BANK_PREFIXES[bankPrefix]) {
    return { valid: false, error: "Bank not supported in Tamil Nadu" };
  }

  return { valid: true, bankName: TN_BANK_PREFIXES[bankPrefix] };
};


// ✅ Optional: Resize image before upload
const resizeImage = (file, maxWidth = 500, maxHeight = 500) =>
  new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    reader.readAsDataURL(file);
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (maxHeight / height) * width;
        height = maxHeight;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.8)); // compressed JPEG
    };
  });

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

    setFormData({
      ...formData,
      profilePhoto: file,
      profilePhotoPreview: preview
    });

    // Reset face detection state
    setFaceDetected(null);
    setErrors({ ...errors, profilePhoto: "" });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) newErrors.email = "Email is required";
    else if (!formData.email.endsWith("@fly.com")) newErrors.email = "Email must end with @fly.com";

    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6) newErrors.password = "Password must be at least 6 characters";

    if (!formData.confirmPassword) newErrors.confirmPassword = "Please confirm your password";
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";

    if (!formData.profilePhoto) newErrors.profilePhoto = "Profile photo is required";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) window.scrollTo(0, 0);

    return Object.keys(newErrors).length === 0;
  };

  // ✅ Optimized handleSubmit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Resize + convert image to base64
      const photoBase64 = await resizeImage(formData.profilePhoto);

      // Send registration request
      const res = await fetch("http://localhost:5000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          profilePhoto: photoBase64,
          role
        }),
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
          employeeId: data.employee.employeeId,
        },
      });
    } catch (error) {
      alert("Server error: " + error.message);
    } finally {
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
    <div className="login-page" style={{ minHeight: "100vh", padding: "40px 20px" }}>
      <div className="register-container fade-in">
        <div className="register-card">
          <div className="register-header">
            <h1 className="register-title">{role === "admin" ? "Admin" : "Employee"} Registration</h1>
            <p style={{ color: "var(--text-muted)" }}>Complete your profile to join the system</p>
          </div>

          <form onSubmit={handleSubmit}>
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
                <label style={{ display: "block", marginBottom: "10px", fontWeight: "600", color: "#ffffff" }}>📸 Upload Photo</label>
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
                    style={{ maxWidth: "150px", maxHeight: "150px", borderRadius: "12px", border: "2px solid var(--primary)" }}
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

              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                margin: '15px 0',
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                width: 'fit-content'
              }}>
                <input
                  type="checkbox"
                  name="consent"
                  checked={formData.consent}
                  onChange={handleChange}
                  required
                  style={{ width: 'auto', margin: 0 }}
                />
                <span style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.9)', fontWeight: '500' }}>
                  I agree to the <span style={{ color: '#00d4ff', textDecoration: 'underline' }}>Terms & Policy</span>
                </span>
              </label>
            </div>

            {/* 6. Login */}
            <div className="form-section">
              <SectionTitle>6. Login Credentials</SectionTitle>
              <div className="form-section-grid">
                <div>
                  <Input label="Login Email" name="email" value={formData.email} onChange={handleChange} placeholder="name@fly.gmail.com" required />
                  <ErrorMessage field="email" />
                </div>
                <div>
                  <Input label="Password" type="password" name="password" value={formData.password} onChange={handleChange} required />
                  <ErrorMessage field="password" />
                </div>
                <div>
                  <Input label="Confirm Password" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
                  <ErrorMessage field="confirmPassword" />
                </div>
              </div>
            </div>

            <Button type="submit" variant="primary" style={{ width: "100%", padding: "14px 0", background: "linear-gradient(135deg, #00d4ff, #7c3aed)", border: "none" }} disabled={loading}>
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
