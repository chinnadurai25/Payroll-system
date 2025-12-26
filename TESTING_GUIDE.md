# 🚀 Quick Testing Guide

## Testing Scenarios

### 1. **Admin Reply Box Fix** ✅
```
Steps:
1. Login as admin (admin@payroll.com / admin123)
2. Go to Admin Dashboard → Messages
3. Click on a message to expand it
4. Click in the textarea to type a reply
5. Expected: Box stays open, can type reply without it closing
6. Click "Mark Solved & Send"
7. Expected: Message status updates to "Solved"
```

---

### 2. **Registration with Email Validation** ✅
```
Test Case A: Invalid email
- Email: john@gmail.com (NOT @fly.gmail.com)
- Expected: Error "Email must end with @fly.gmail.com"

Test Case B: Valid email format
- Email: john@fly.gmail.com
- Expected: Proceeds to next step
```

---

### 3. **Account & IFSC Validation** ✅
```
Test Case A: Invalid IFSC
- Account: 1234567890
- IFSC: INVALID123
- Click "Validate Account"
- Expected: Error showing valid IFSC codes

Test Case B: Valid credentials
- Account: 1234567890 (any 9+ digits)
- IFSC: HDFC0000001 (from valid list)
- Click "Validate Account"
- Expected: Account Holder field auto-fills with "HDFC Bank"

Valid Test IFSCs:
- HDFC0000001 → HDFC Bank
- ICIC0000001 → ICICI Bank
- SBIN0000001 → State Bank of India
- AXIS0000001 → Axis Bank
- BKID0000001 → Bank of India
```

---

### 4. **Photo Upload & Face Detection** ✅
```
Test Case A: Photo without face
- Upload: A landscape image, building photo, text document
- Expected: "✗ Face not detected" error
- Cannot submit form

Test Case B: Photo with face
- Upload: Photo with human face
- Expected: "✓ Face detected" message
- Can proceed with registration

Test Case C: File size validation
- Upload: File > 5MB
- Expected: "Photo must be less than 5MB" error
```

---

### 5. **Complete Registration Flow** ✅
```
Full Workflow:
1. Go to Register page
2. Fill all personal details
3. Enter account (9+ digits) + valid IFSC
4. Click "Validate Account" → Auto-fills name
5. Upload a face photo → Gets approved
6. Enter credentials (email: name@fly.gmail.com)
7. Upload photo with face
8. Click "✓ Complete Registration"
9. Expected: Redirect to success page with generated Employee ID
10. Employee ID format: Fly_emp1, Fly_emp2, etc.
```

---

### 6. **Employee Profile Page** ✅
```
Access Profile:
1. Login as employee (user registered above)
2. Go to Dashboard
3. Click "👤 My Profile" button
4. Expected: Shows profile page with:
   - Profile photo (if uploaded)
   - Personal Details (Name, DOB, Email, Phone, Address)
   - Employment Information (Job Title, Department, etc.)
   - Banking Details (Masked account number)
   - Emergency Contact
5. Account number displayed as masked: ****567890

Navigation:
- "← Back to Dashboard" → Returns to dashboard
- "Logout" → Logs out user
```

---

### 7. **Profile Photo Display** ✅
```
Scenario A: Photo uploaded during registration
- Profile page shows the uploaded photo in frame
- Size: 180x180px
- Rounded corners, bordered with primary color

Scenario B: No photo uploaded
- Shows 📸 emoji placeholder
- Same frame styling
```

---

## 🔐 Test Credentials

### Admin Account
```
Email: admin@payroll.com
Password: admin123
```

### Employee Account (After Registration)
```
Email: testemployee@fly.gmail.com
Password: TestPass123
Employee ID: Fly_emp1 (auto-generated)
```

---

## 📊 Database Validation

### Employee Document Example
```javascript
{
  "_id": "...",
  "fullName": "John Doe",
  "email": "john@fly.gmail.com",
  "employeeId": "Fly_emp1",
  "accountNumber": "1234567890",
  "bankCode": "HDFC0000001",
  "accountName": "HDFC Bank",
  "profilePhoto": "data:image/jpeg;base64,...",
  "jobTitle": "Developer",
  "department": "Engineering",
  // ... other fields
}
```

---

## 🛠️ Debugging

### If Face Detection Not Working
- Check browser console for errors
- Verify image is valid and readable
- Try with different image formats (JPG, PNG)
- Current: Uses simple pixel-variation algorithm
- Production: Implement face-api.js integration

### If Registration Fails
- Check browser console for error details
- Verify backend is running on port 5000
- Check MongoDB connection in server logs
- Verify email format ends with @fly.gmail.com

### If Profile Photo Not Showing
- Check if photo was saved as Base64 in database
- Verify image data is not corrupted
- Clear browser cache and reload

---

## ✅ Checklist for Production Ready

- [ ] Test all validation messages appear correctly
- [ ] Test admin reply box stays open during typing
- [ ] Test face detection with 5+ different photos
- [ ] Test registration flow end-to-end
- [ ] Test profile page displays all info correctly
- [ ] Test photo displays in profile
- [ ] Test logout and re-login
- [ ] Verify no console errors
- [ ] Test on different browsers (Chrome, Firefox, Safari)
- [ ] Test mobile responsiveness
- [ ] Verify error messages are user-friendly
- [ ] Test with slow internet connection

---

## 📝 Notes

- All validation is client-side and server-side
- Face detection uses simple pixel-variation (not ML-based)
- Photos stored as Base64 (not optimized for production)
- Email must end with @fly.gmail.com (company domain)
- Account validation uses mock bank data (implement real API later)
