# 🧪 Registration Form Test Data

## Quick Fill Guide

Use this data to quickly fill the registration form and test:

### Personal Details
- **Full Name:** John Doe
- **DOB:** 1995-06-15
- **Personal Email:** john.doe@example.com
- **Phone:** 9876543210
- **Address:** 123 Main St, New York, NY 10001
- **PAN Number:** ABCDE1234F
- **Aadhar Number:** 123456789012

### Banking Details
- **Account Number:** 1234567890
- **IFSC Code:** HDFC0000001
- Click "Validate Account" (will auto-fill with "HDFC Bank")
- **Account Type:** Savings (auto-filled)

### Employment Details
- **Job Title:** Software Engineer
- **Department:** Engineering
- **Joining Date:** 2024-01-15

### Emergency Contact
- **Name:** Jane Doe
- **Relation:** Sister
- **Phone:** 9876543211
- **Consent:** ✓ Check the checkbox

### Profile Photo
- **Photo:** Upload ANY image with a FACE
- Will show: ✓ Face detected

### Login Credentials (MOST IMPORTANT)
- **Login Email:** john.doe@fly.gmail.com (⚠️ MUST end with @fly.gmail.com)
- **Password:** Test1234 (minimum 6 characters)
- **Confirm Password:** Test1234 (must match)

---

## Valid IFSC Codes for Testing
```
HDFC0000001 → HDFC Bank
ICIC0000001 → ICICI Bank
SBIN0000001 → State Bank of India
AXIS0000001 → Axis Bank
BKID0000001 → Bank of India
```

---

## Common Errors & Solutions

| Error | Solution |
|-------|----------|
| "Email must end with @fly.gmail.com" | Use format: yourname@fly.gmail.com |
| "Password must be at least 6 characters" | Make password 6+ characters long |
| "Passwords do not match" | Ensure both password fields are identical |
| "Profile photo is required" | Upload an image with a human face |
| "Invalid IFSC code" | Use one from the valid codes list above |

---

## Expected Behavior After Fix

1. ✅ When you click "Complete Registration":
   - If there are errors, you'll see them in a RED BOX at the top
   - Each field with error will also show error message below it

2. ✅ If all data is valid:
   - Registration will process
   - You'll be redirected to success page with your Employee ID

3. ✅ Employee ID format:
   - Fly_emp1, Fly_emp2, Fly_emp3, etc.
   - Auto-generated based on registration order

---

## After Registration

Login with:
- **Email:** john.doe@fly.gmail.com
- **Password:** Test1234
- Navigate to: Dashboard → My Profile to see your registered info
