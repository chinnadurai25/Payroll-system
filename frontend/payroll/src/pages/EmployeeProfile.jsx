import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Button from "../components/Button";
import "../styles/EmployeeProfile.css";

const VALID_BANKS = {
  "HDFC0000001": "HDFC Bank",
  "ICIC0000001": "ICICI Bank",
  "SBIN0000001": "State Bank of India",
  "AXIS0000001": "Axis Bank",
  "BKID0000001": "Bank of India"
};

const EmployeeProfile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [accountValidating, setAccountValidating] = useState(false);
  const [validationError, setValidationError] = useState("");
  const fileInputRef = useRef(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Do not override global body background here so layout/background
  // is controlled by the app layout (BackgroundSlider / global styles).

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const fetchEmployee = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/employees");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        const current = data.find(
          (emp) => emp.email === user.email || emp.employeeId === user.employeeId
        );
        if (current) {
          setEmployee(current);
          setEditData(current);
          if (current.profilePhoto) {
            setPhotoPreview(current.profilePhoto);
          }
        }
      } catch (err) {
        console.warn("Error fetching employee:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [user, navigate]);

  const handleEditChange = (field, value) => {
    setEditData({ ...editData, [field]: value });
    if (field === "accountNumber" || field === "bankCode") {
      setValidationError("");
      setEditData((prev) => ({ ...prev, accountName: "" }));
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setValidationError("Photo must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const preview = event.target.result;
      setPhotoPreview(preview);
      setEditData({ ...editData, profilePhoto: preview });
      setValidationError("");
    };
    reader.readAsDataURL(file);
  };

  const handleValidateAccount = async () => {
    if (!editData.accountNumber || !editData.bankCode) {
      setValidationError("Please enter both account number and IFSC code");
      return;
    }

    if (editData.accountNumber.length < 9) {
      setValidationError("Account number must be at least 9 digits");
      return;
    }

    if (editData.bankCode.length !== 11) {
      setValidationError("IFSC code must be 11 characters");
      return;
    }

    setAccountValidating(true);
    try {
      if (!VALID_BANKS[editData.bankCode]) {
        setValidationError(
          `Invalid IFSC code. Valid codes: ${Object.keys(VALID_BANKS).join(", ")}`
        );
        setAccountValidating(false);
        return;
      }

      const bankName = VALID_BANKS[editData.bankCode];
      setEditData((prev) => ({ ...prev, accountName: bankName }));
      setValidationError("");
    } catch (err) {
      setValidationError("Error validating account");
    } finally {
      setAccountValidating(false);
    }
  };

  const handleSave = async () => {
    if (!editData.accountName) {
      setValidationError("Please validate account details first");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        `http://localhost:5000/api/employees/${employee.employeeId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editData),
        }
      );

      if (!res.ok) throw new Error("Failed to update");
      const updated = await res.json();
      setEmployee(updated);
      setIsEditing(false);
      setPhotoPreview(updated.profilePhoto);
      alert("✓ Profile updated successfully!");
    } catch (err) {
      alert("Error updating profile: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData(employee);
    setPhotoPreview(employee.profilePhoto);
    setValidationError("");
  };

  if (loading)
    return (
      <div style={{ color: "#fff", padding: "40px", textAlign: "center" }}>
        Loading profile...
      </div>
    );

  if (!employee)
    return (
      <div style={{ color: "#fff", padding: "40px", textAlign: "center" }}>
        Employee data not found
      </div>
    );

  return (
    <div className="profile-container">
      <div className="profile-content">
        {/* Profile Header Card */}
        <div className="profile-header-card">
          <div className="profile-photo-section">
            {photoPreview ? (
              <img 
                src={photoPreview} 
                alt={employee.fullName}
                className="profile-photo"
              />
            ) : (
              <div className="profile-photo-placeholder">
                <span className="placeholder-icon">👤</span>
              </div>
            )}
            {isEditing && (
              <div className="photo-upload-overlay">
                <button 
                  className="upload-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📷 Change Photo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: "none" }}
                />
              </div>
            )}
          </div>

          <div className="profile-header-info">
            {isEditing ? (
              <>
                <input
                  type="text"
                  className="edit-input profile-name"
                  value={editData.fullName || ""}
                  onChange={(e) => handleEditChange("fullName", e.target.value)}
                  placeholder="Full Name"
                />
                <input
                  type="text"
                  className="edit-input profile-job-title"
                  value={editData.jobTitle || ""}
                  onChange={(e) => handleEditChange("jobTitle", e.target.value)}
                  placeholder="Job Title"
                />
                <input
                  type="text"
                  className="edit-input profile-department"
                  value={editData.department || ""}
                  onChange={(e) => handleEditChange("department", e.target.value)}
                  placeholder="Department"
                />
              </>
            ) : (
              <>
                <h1 className="profile-name">{employee.fullName}</h1>
                <p className="profile-job-title">{employee.jobTitle}</p>
                <p className="profile-department">{employee.department}</p>
              </>
            )}
            <div className="profile-header-meta">
              <span className="meta-item">
                <strong>Employee ID:</strong> {employee.employeeId}
              </span>
              <span className="meta-item">
                <strong>Status:</strong> <span className="status-badge">Active</span>
              </span>
            </div>
          </div>
        </div>

        {/* Personal Information Section */}
        <div className="profile-section">
          <h2 className="section-title">👤 Personal Information</h2>
          <div className="info-grid">
            <div className="info-card">
              <label>Full Name</label>
              {isEditing ? (
                <input
                  type="text"
                  className="edit-input"
                  value={editData.fullName || ""}
                  onChange={(e) => handleEditChange("fullName", e.target.value)}
                />
              ) : (
                <p>{employee.fullName}</p>
              )}
            </div>
            <div className="info-card">
              <label>Date of Birth</label>
              {isEditing ? (
                <input
                  type="date"
                  className="edit-input"
                  value={editData.dob || ""}
                  onChange={(e) => handleEditChange("dob", e.target.value)}
                />
              ) : (
                <p>{employee.dob || "N/A"}</p>
              )}
            </div>
            <div className="info-card">
              <label>Personal Email</label>
              {isEditing ? (
                <input
                  type="email"
                  className="edit-input"
                  value={editData.personalEmail || ""}
                  onChange={(e) => handleEditChange("personalEmail", e.target.value)}
                />
              ) : (
                <p>{employee.personalEmail}</p>
              )}
            </div>
            <div className="info-card">
              <label>Phone</label>
              {isEditing ? (
                <input
                  type="text"
                  className="edit-input"
                  value={editData.phone || ""}
                  onChange={(e) => handleEditChange("phone", e.target.value)}
                />
              ) : (
                <p>{employee.phone}</p>
              )}
            </div>
            <div className="info-card">
              <label>Address</label>
              {isEditing ? (
                <textarea
                  className="edit-input"
                  value={editData.address || ""}
                  onChange={(e) => handleEditChange("address", e.target.value)}
                  rows="2"
                />
              ) : (
                <p>{employee.address}</p>
              )}
            </div>
            <div className="info-card">
              <label>Tax Status</label>
              {isEditing ? (
                <input
                  type="text"
                  className="edit-input"
                  value={editData.taxStatus || ""}
                  onChange={(e) => handleEditChange("taxStatus", e.target.value)}
                />
              ) : (
                <p>{employee.taxStatus || "N/A"}</p>
              )}
            </div>
            <div className="info-card">
              <label>PAN Number</label>
              {isEditing ? (
                <input
                  type="text"
                  className="edit-input"
                  value={editData.panNumber || ""}
                  onChange={(e) => handleEditChange("panNumber", e.target.value)}
                />
              ) : (
                <p>{employee.panNumber || "N/A"}</p>
              )}
            </div>
            <div className="info-card">
              <label>Aadhar Number</label>
              {isEditing ? (
                <input
                  type="text"
                  className="edit-input"
                  value={editData.aadharNumber || ""}
                  onChange={(e) => handleEditChange("aadharNumber", e.target.value)}
                />
              ) : (
                <p>{employee.aadharNumber || "N/A"}</p>
              )}
            </div>
          </div>
        </div>

        {/* Employment Information Section */}
        <div className="profile-section">
          <h2 className="section-title">💼 Employment Information</h2>
          <div className="info-grid">
            <div className="info-card">
              <label>Job Title</label>
              {isEditing ? (
                <input
                  type="text"
                  className="edit-input"
                  value={editData.jobTitle || ""}
                  onChange={(e) => handleEditChange("jobTitle", e.target.value)}
                />
              ) : (
                <p>{employee.jobTitle}</p>
              )}
            </div>
            <div className="info-card">
              <label>Department</label>
              {isEditing ? (
                <input
                  type="text"
                  className="edit-input"
                  value={editData.department || ""}
                  onChange={(e) => handleEditChange("department", e.target.value)}
                />
              ) : (
                <p>{employee.department}</p>
              )}
            </div>
            <div className="info-card">
              <label>Joining Date</label>
              {isEditing ? (
                <input
                  type="date"
                  className="edit-input"
                  value={editData.joiningDate || ""}
                  onChange={(e) => handleEditChange("joiningDate", e.target.value)}
                />
              ) : (
                <p>{employee.joiningDate || "N/A"}</p>
              )}
            </div>
            <div className="info-card">
              <label>Work Location</label>
              {isEditing ? (
                <input
                  type="text"
                  className="edit-input"
                  value={editData.workLocation || ""}
                  onChange={(e) => handleEditChange("workLocation", e.target.value)}
                />
              ) : (
                <p>{employee.workLocation || "N/A"}</p>
              )}
            </div>
          </div>
        </div>

        {/* Banking Information Section */}
        <div className="profile-section">
          <h2 className="section-title">🏦 Banking Information</h2>
          {validationError && (
            <div className="error-message">
              ⚠️ {validationError}
            </div>
          )}
          <div className="info-grid">
            {isEditing ? (
              <>
                <div className="info-card">
                  <label>Account Number</label>
                  <input
                    type="text"
                    className="edit-input"
                    value={editData.accountNumber || ""}
                    onChange={(e) => handleEditChange("accountNumber", e.target.value)}
                  />
                </div>
                <div className="info-card">
                  <label>Bank Code (IFSC)</label>
                  <input
                    type="text"
                    className="edit-input"
                    value={editData.bankCode || ""}
                    onChange={(e) => handleEditChange("bankCode", e.target.value)}
                  />
                </div>
                <div className="info-card">
                  <label>&nbsp;</label>
                  <Button 
                    onClick={handleValidateAccount}
                    disabled={accountValidating}
                    style={{ width: "100%", padding: "8px" }}
                  >
                    {accountValidating ? "Validating..." : "✓ Validate Account"}
                  </Button>
                </div>
                <div className="info-card">
                  <label>Account Holder Name (Auto-filled)</label>
                  <input
                    type="text"
                    className="edit-input"
                    value={editData.accountName || ""}
                    disabled
                    placeholder="Will auto-fill after validation"
                    style={{ background: "#f0f0f0" }}
                  />
                </div>
                <div className="info-card">
                  <label>Account Type</label>
                  <input
                    type="text"
                    className="edit-input"
                    value={editData.accountType || ""}
                    onChange={(e) => handleEditChange("accountType", e.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="info-card">
                  <label>Account Holder Name</label>
                  <p>{employee.accountName || "N/A"}</p>
                </div>
                <div className="info-card">
                  <label>Account Number</label>
                  <p>{employee.accountNumber || "N/A"}</p>
                </div>
                <div className="info-card">
                  <label>Bank Code (IFSC)</label>
                  <p>{employee.bankCode || "N/A"}</p>
                </div>
                <div className="info-card">
                  <label>Account Type</label>
                  <p>{employee.accountType || "N/A"}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Emergency Contact Section */}
        <div className="profile-section">
          <h2 className="section-title">🚨 Emergency Contact</h2>
          <div className="info-grid">
            <div className="info-card">
              <label>Emergency Contact Name</label>
              {isEditing ? (
                <input
                  type="text"
                  className="edit-input"
                  value={editData.emergencyName || ""}
                  onChange={(e) => handleEditChange("emergencyName", e.target.value)}
                />
              ) : (
                <p>{employee.emergencyName || "N/A"}</p>
              )}
            </div>
            <div className="info-card">
              <label>Relationship</label>
              {isEditing ? (
                <input
                  type="text"
                  className="edit-input"
                  value={editData.emergencyRel || ""}
                  onChange={(e) => handleEditChange("emergencyRel", e.target.value)}
                />
              ) : (
                <p>{employee.emergencyRel || "N/A"}</p>
              )}
            </div>
            <div className="info-card">
              <label>Emergency Phone</label>
              {isEditing ? (
                <input
                  type="text"
                  className="edit-input"
                  value={editData.emergencyPhone || ""}
                  onChange={(e) => handleEditChange("emergencyPhone", e.target.value)}
                />
              ) : (
                <p>{employee.emergencyPhone || "N/A"}</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="profile-actions">
          {!isEditing ? (
            <>
              <Button onClick={() => setIsEditing(true)} className="btn-edit">
                ✏️ Edit Profile
              </Button>
              <Button onClick={() => navigate("/dashboard")} className="btn-back">
                ← Back to Dashboard
              </Button>
              <Button 
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="btn-logout"
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleSave} disabled={saving} className="btn-save">
                {saving ? "⏳ Saving..." : "✓ Save Changes"}
              </Button>
              <Button onClick={handleCancel} className="btn-cancel">
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfile;
