const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Simple request logger
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url}`);
  next();
});

/* ---------- DB CONNECTION ---------- */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));



const getDatesBetween = (startDate, endDate) => {
  const dates = [];
  let current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10)); // YYYY-MM-DD
    current.setDate(current.getDate() + 1);
  }

  return dates;
};


/* =========================================================
   EMPLOYEE MODEL
========================================================= */
const employeeSchema = new mongoose.Schema(
  {
    role: { type: String, default: "employee" },

    fullName: String,
    dob: String,
    personalEmail: String,
    phone: String,
    address: String,
    taxStatus: String,
    panNumber: String,
    aadharNumber: String,

    accountName: String,
    accountNumber: String,
    bankCode: String,
    accountType: String,

    employeeId: String,
    jobTitle: String,
    department: String,
    joiningDate: String,
    workLocation: String,

    emergencyName: String,
    emergencyRel: String,
    emergencyPhone: String,
    consent: Boolean,

    payroll: {
      basicSalary: { type: Number, default: 0 },
      basicPay: { type: Number, default: 0 },
      hra: { type: Number, default: 0 },
      splAllowance: { type: Number, default: 0 },
      travelAllowance: { type: Number, default: 0 },
      allowances: { type: Number, default: 0 },
      bonus: { type: Number, default: 0 },
      insteadDue: { type: Number, default: 0 },
      pf: { type: Number, default: 0 },
      tax: { type: Number, default: 0 }
    },

    email: { type: String, unique: true },
    password: String,
    profilePhoto: { type: String, default: null },
    leaveBalances: {
      casual: { type: Number, default: 12 },
      sick: { type: Number, default: 10 },
      earned: { type: Number, default: 15 }
    }
  },
  { timestamps: true }
);

const Employee =
  mongoose.models.Employee || mongoose.model("Employee", employeeSchema);

/* =========================================================
   ADMIN MODEL
========================================================= */
const adminSchema = new mongoose.Schema(
  {
    fullName: String,
    email: { type: String, unique: true },
    password: String
  },
  { timestamps: true }
);

const Admin =
  mongoose.models.Admin || mongoose.model("Admin", adminSchema);

/* =========================================================
   ATTENDANCE MODEL
========================================================= */
const attendanceSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true },
    month: { type: String, required: true },
    days: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    }
  },
  { timestamps: true }
);

attendanceSchema.index({ employeeId: 1, month: 1 }, { unique: true });

// Migration: Drop legacy index if exists
mongoose.connection.once('open', async () => {
  try {
    await mongoose.connection.collection('attendances').dropIndex('employeeId_1_date_1');
    console.log("✅ Dropped legacy index: employeeId_1_date_1");
  } catch (e) {
    // Index might not exist, which is fine
  }
});

const Attendance =
  mongoose.models.Attendance ||
  mongoose.model("Attendance", attendanceSchema);

/* =========================================================
   CREATE DEFAULT ADMIN
========================================================= */
const createDefaultAdmin = async () => {
  const exists = await Admin.findOne({ email: "admin@payroll.com" });
  if (!exists) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await Admin.create({
      fullName: "System Admin",
      email: "admin@payroll.com",
      password: hashedPassword
    });
    console.log("✅ Default admin created");
  }
};
createDefaultAdmin();

/* =========================================================
   PAYSLIP MODEL
========================================================= */
const payslipSchema = new mongoose.Schema(
  {
    employeeId: String,
    month: String,

    earnings: {
      basicSalary: Number,
      hra: Number,
      splAllowance: Number,
      travelAllowance: Number,
      allowances: Number,
      bonus: Number,
      insteadDue: Number
    },

    deductions: {
      taxPercent: Number,
      taxAmount: Number,
      pf: Number
    },

    attendance: {
      totalDays: Number,
      presentDays: Number
    },

    grossSalary: Number,
    netSalary: Number
  },
  { timestamps: true }
);

payslipSchema.index({ employeeId: 1, month: 1 }, { unique: true });

const Payslip =
  mongoose.models.Payslip ||
  mongoose.model("Payslip", payslipSchema, "payslip");

/* =========================================================
   🔹 MESSAGE MODEL (NEW – ADDED ONLY)
========================================================= */
const messageSchema = new mongoose.Schema(
  {
    fromRole: { type: String, enum: ["admin", "employee"], required: true },
    fromId: { type: String, required: true },
    fromName: { type: String, required: true },

    toRole: { type: String, enum: ["admin", "employee"], required: true },
    toId: { type: String, required: true },

    title: { type: String, required: true },
    message: { type: String, required: true },
    category: { type: String, enum: ["error", "query", "feedback", "other"], default: "query" },
    isRead: { type: Boolean, default: false },
    status: { type: String, enum: ["open", "solved", "closed"], default: "open" },
    response: { type: String, default: null },
    images: [String]
  },
  { timestamps: true }
);

const Message =
  mongoose.models.Message || mongoose.model("Message", messageSchema);

/* =========================================================
   AUTH ROUTES
========================================================= */
app.post("/register", async (req, res) => {
  try {
    if (req.body.role === "admin") {
      return res.status(403).json({ message: "Admin registration not allowed" });
    }

    console.log(`📝 Registration attempt with email: ${req.body.email}`);

    const exists = await Employee.findOne({ email: req.body.email });
    if (exists) {
      console.log(`❌ Email already exists: ${req.body.email}`);
      return res.status(400).json({ message: "User already exists" });
    }

    // Generate unique employee ID - Check with existing ones
    let employeeId;
    let idExists = true;
    let counter = 1;
    const maxAttempts = 10000; // Safety limit

    while (idExists && counter <= maxAttempts) {
      employeeId = `Fly_emp${counter}`;

      // Check if this ID already exists in database
      const idCheck = await Employee.findOne({ employeeId: employeeId });

      if (!idCheck) {
        // ID is unique, use it
        idExists = false;
        console.log(`✅ Generated unique Employee ID: ${employeeId}`);
      } else {
        // ID exists, try next one
        counter++;
      }
    }

    if (counter > maxAttempts) {
      return res.status(500).json({ message: "Unable to generate unique employee ID" });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const employee = new Employee({
      ...req.body,
      employeeId,
      password: hashedPassword,
      role: "employee"
    });

    const saved = await employee.save();
    console.log(`✅ Employee registered successfully with email: ${saved.email} and ID: ${saved.employeeId}`);

    const { password, __v, ...employeeSafe } = saved.toObject();
    res.status(201).json({ message: "Registration successful", employee: employeeSafe });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.get("/ping", (req, res) => res.json({ message: "pong" }));

app.post("/login", async (req, res) => {
  const { email, password, role } = req.body;
  console.log(`🔐 Login attempt: ${email} (${role})`);

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    console.log(`\n🔐 LOGIN ATTEMPT`);
    console.log(`📧 Email received: "${email}" (length: ${email.length})`);
    console.log(`👤 Role: ${role}`);

    // First, let's check what emails exist in DB
    const allEmployees = await Employee.find({}, { email: 1 });
    console.log(`\n📊 All registered employee emails in DB:`);
    allEmployees.forEach((emp, idx) => {
      console.log(`   ${idx + 1}. "${emp.email}" (length: ${emp.email.length})`);
    });

    // Try exact match first
    console.log(`\n🔍 Trying exact match...`);
    let user = await Employee.findOne({ email: email });

    // If not found, try case-insensitive
    if (!user) {
      console.log(`⚠️ Exact match failed, trying case-insensitive...`);
      user = await Employee.findOne({ email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: "i" } });
    }

    if (!user) {
      console.log(`❌ User not found with email: ${email}`);
      return res.status(404).json({ message: "User not found. Please check your email and try again." });
    }

    console.log(`✅ User found: ${user.email}`);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`❌ Invalid password for email: ${email}`);
      return res.status(401).json({ message: "Invalid password" });
    }

    console.log(`✅ Login successful for email: ${email}\n`);
    res.json({
      role: user.role || role,
      email: user.email,
      fullName: user.fullName,
      employeeId: user.employeeId
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ message: "Server error during login", error: err.message });
  }
});

/* =========================================================
   EMPLOYEES
========================================================= */
app.get("/api/employees", async (req, res) => {
  const employees = await Employee.find({}, { password: 0, __v: 0 });
  res.json(employees);
});

/* DEBUG: Get all employee emails for testing */
app.get("/api/debug/employee-emails", async (req, res) => {
  try {
    const employees = await Employee.find({}, { email: 1, fullName: 1, employeeId: 1 });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: "Error fetching employee emails", error: err.message });
  }
});

app.get("/api/employees/:employeeId", async (req, res) => {
  const employee = await Employee.findOne(
    { employeeId: req.params.employeeId },
    { password: 0, __v: 0 }
  );

  if (!employee)
    return res.status(404).json({ message: "Employee not found" });

  res.json(employee);
});

app.put("/api/employees/:employeeId", async (req, res) => {
  try {
    const employee = await Employee.findOne({ employeeId: req.params.employeeId });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Update allowed fields (exclude sensitive fields like password and employeeId)
    const allowedFields = [
      "fullName", "dob", "personalEmail", "phone", "address", "taxStatus",
      "panNumber", "aadharNumber",
      "accountName", "accountNumber", "accountType", "bankCode", "jobTitle", "department",
      "joiningDate", "workLocation", "emergencyName", "emergencyRel", "emergencyPhone",
      "profilePhoto", "leaveBalances"
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        employee[field] = req.body[field];
      }
    });

    await employee.save();
    const updated = await Employee.findOne({ employeeId: req.params.employeeId }, { password: 0, __v: 0 });
    res.json(updated);
  } catch (err) {
    console.error("Error updating employee:", err);
    res.status(500).json({ message: "Error updating employee", error: err.message });
  }
});

/* =========================================================
   PAYROLL
========================================================= */
app.put("/api/employees/:employeeId/payroll", async (req, res) => {
  await Employee.findOneAndUpdate(
    { employeeId: req.params.employeeId },
    { payroll: req.body }
  );
  res.json({ message: "Payroll updated" });
});

/* =========================================================
   ATTENDANCE
========================================================= */
app.post("/api/attendance", async (req, res) => {
  try {
    const { employeeId, date, status, photo, verifyStatus, location } = req.body;
    console.log("📝 Received attendance data:", { employeeId, date, status, verifyStatus });

    if (!employeeId || !date) {
      return res.status(400).json({ message: "Missing employeeId or date" });
    }

    const month = date.slice(0, 7);

    const updateData = { status };
    if (photo) updateData.photo = photo;
    if (verifyStatus) updateData.verifyStatus = verifyStatus;
    if (location) updateData.location = location;

    await Attendance.findOneAndUpdate(
      { employeeId, month },
      { $set: { [`days.${date}`]: updateData } },
      { upsert: true, new: true }
    );

    console.log(`✅ Attendance saved for ${employeeId} on ${date}: ${status}`);
    res.json({ message: "Attendance saved successfully" });
  } catch (err) {
    console.error("❌ Error saving attendance:", err);
    // Send detailed error to frontend for debugging
    res.status(500).json({
      message: "Failed to save attendance",
      error: err.toString(),
      details: err.message
    });
  }
});

app.get("/api/attendance", async (req, res) => {
  const { employeeId, month } = req.query;
  const record = await Attendance.findOne({ employeeId, month });
  let days = record?.days || new Map();
  const daysObj = Object.fromEntries(days);

  // Parse month (YYYY-MM)
  const [year, mon] = month.split('-').map(Number);
  const lastDate = new Date(year, mon, 0).getDate();

  // Iterate over all days in the month to ensure correct defaults
  for (let d = 1; d <= lastDate; d++) {
    const dateObj = new Date(year, mon - 1, d);
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    const dayOfWeek = dateObj.getDay();

    if (dayOfWeek === 0) { // Sunday
      // Mark as Leave if not explicitly set to something else
      if (!daysObj[dateStr]) {
        daysObj[dateStr] = 'L';
      }
    } else if (dayOfWeek === 6) { // Saturday
      // Explicitly remove accidental 'L' if it's a Saturday (Saturday is working day)
      // BUT only if it's 'L'. If Admin manually marked it 'P' or 'A', keep it.
      if (daysObj[dateStr] === 'L') {
        // If it's a Saturday and marked as Leave, we assume it was a bugged default.
        // We'll delete it from the object so it shows as unmarked/working.
        delete daysObj[dateStr];
      }
    }
  }

  res.json(daysObj);
});

/* =========================================================
   LEAVE MANAGEMENT (NEW)
========================================================= */
const leaveSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true },
    employeeName: String, // Optional, can be fetched, but storing for easier display
    type: String,
    startDate: String,
    endDate: String,
    reason: String,
    status: { type: String, default: "Pending" }, // Pending, Approved, Rejected
    adminComment: String
  },
  { timestamps: true }
);

const Leave = mongoose.models.Leave || mongoose.model("Leave", leaveSchema);

/* =========================================================
   🔹 LOCATION MODEL
========================================================= */
const locationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    radius: { type: Number, default: 100 }, // in meters
    type: { type: String, enum: ["office", "client"], default: "office" }
  },
  { timestamps: true }
);

const Location = mongoose.models.Location || mongoose.model("Location", locationSchema);

/* =========================================================
   🔹 SITE ASSIGNMENT MODEL
========================================================= */
const siteAssignmentSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true },
    date: { type: String, required: true } // YYYY-MM-DD
  },
  { timestamps: true }
);

siteAssignmentSchema.index({ employeeId: 1, date: 1 }, { unique: true });

const SiteAssignment = mongoose.models.SiteAssignment || mongoose.model("SiteAssignment", siteAssignmentSchema);

// Submit Leave Request
app.post("/api/leaves", async (req, res) => {
  try {
    const { employeeId, ...rest } = req.body;

    // Optional: Fetch employee name if not provided
    const employee = await Employee.findOne({ employeeId });
    const employeeName = employee ? employee.fullName : "Unknown";

    const newLeave = await Leave.create({
      employeeId,
      employeeName,
      ...rest
    });
    res.status(201).json(newLeave);
  } catch (err) {
    res.status(500).json({ message: "Error submitting leave", error: err.message });
  }
});

// Get All Leaves (for Admin) or My Leaves (for Employee)
app.get("/api/leaves", async (req, res) => {
  try {
    const { employeeId, status } = req.query;
    let query = {};
    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status; // e.g., ?status=Pending for notifications

    const leaves = await Leave.find(query).sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: "Error fetching leaves", error: err.message });
  }
});

// Get specific leave stats (e.g. pending count)
app.get("/api/leaves/pending-count", async (req, res) => {
  try {
    const count = await Leave.countDocuments({ status: "Pending" });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: "Error fetching pending count", error: err.message });
  }
});

/* =========================================================
   🔹 MESSAGE ROUTES (NEW – ADDED ONLY)
========================================================= */

// Send message
app.post("/api/messages", async (req, res) => {
  console.log("📨 Received message submission");
  console.log("Keys:", Object.keys(req.body));
  if (req.body.images) {
    console.log("📷 Images count:", req.body.images.length);
  } else {
    console.log("⚠️ No images found in payload");
  }
  const msg = await Message.create(req.body);
  console.log("✅ Message saved with ID:", msg._id);
  res.json(msg);
});

// Get messages for logged-in user
app.get("/api/messages", async (req, res) => {
  const { role, id } = req.query;

  let query;

  if (role === "admin") {
    // Admins see all messages sent to them (toRole: 'admin')
    query = {
      toRole: "admin"
    };
  } else {
    // Employees see messages they sent and responses they received
    query = {
      $or: [
        { fromRole: role, fromId: id },
        { toRole: role, toId: id }
      ]
    };
  }

  const messages = await Message.find(query).sort({ createdAt: -1 });
  res.json(messages);
});

// Mark messages as read
app.put("/api/messages/read/:id", async (req, res) => {
  await Message.findByIdAndUpdate(req.params.id, { isRead: true });
  res.json({ message: "Marked as read" });
});

// Update message status and add response
app.put("/api/messages/:id", async (req, res) => {
  try {
    const { status, response } = req.body;
    // mark as read when admin responds or status changes
    const updateData = { isRead: true };
    if (status) updateData.status = status;
    if (response) updateData.response = response;
    const updated = await Message.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a message
app.delete("/api/messages/:id", async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ message: "Message deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================================================
   FORGOT PASSWORD
========================================================= */
app.post("/forgot-password", async (req, res) => {
  const { email, newPassword } = req.body;

  const user =
    (await Employee.findOne({ email })) ||
    (await Admin.findOne({ email }));

  if (!user) return res.status(404).json({ message: "User not found" });

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.json({ message: "Password updated" });
});

app.post("/api/payslip", async (req, res) => {
  await Payslip.findOneAndUpdate(
    { employeeId: req.body.employeeId, month: req.body.month },
    { $set: req.body },
    { upsert: true, new: true }
  );

  res.json({ message: "Payslip saved successfully" });
});

app.get("/api/payslip", async (req, res) => {
  const { employeeId, month } = req.query;
  const payslip = await Payslip.findOne({ employeeId, month });
  res.json(payslip || {});
});

/* =========================================================
   DELETE EMPLOYEE (ADMIN ONLY)
========================================================= */
app.delete("/api/employees/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Delete employee
    const employee = await Employee.findOneAndDelete({ employeeId });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Delete related attendance
    await Attendance.deleteMany({ employeeId });

    // Delete related payslips
    await Payslip.deleteMany({ employeeId });

    // Delete related messages
    await Message.deleteMany({
      $or: [
        { fromId: employeeId },
        { toId: employeeId }
      ]
    });

    res.json({ message: "Employee deleted successfully" });
  } catch (err) {
    console.error("Delete employee error:", err);
    res.status(500).json({ message: "Server error" });
  }
});
app.put("/api/leaves/:id", async (req, res) => {
  try {
    const { status, adminComment } = req.body;
    const leaveId = req.params.id;

    const leave = await Leave.findById(leaveId);
    if (!leave) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    // ✅ ONLY WHEN APPROVED
    if (status === "Approved" && leave.status !== "Approved") {

      // 1️⃣ Get all leave dates
      const leaveDates = getDatesBetween(leave.startDate, leave.endDate);

      // 2️⃣ Group dates by month (important)
      const monthMap = {};
      leaveDates.forEach(date => {
        const month = date.slice(0, 7); // YYYY-MM
        if (!monthMap[month]) monthMap[month] = [];
        monthMap[month].push(date);
      });

      // 3️⃣ Update attendance for each month
      for (const month in monthMap) {
        const updateDays = {};

        monthMap[month].forEach(date => {
          updateDays[`days.${date}`] = "A"; // A = Absent
        });

        await Attendance.findOneAndUpdate(
          { employeeId: leave.employeeId, month },
          { $set: updateDays },
          { upsert: true, new: true }
        );
      }

      // 4️⃣ Deduct leave balance (already exists, kept intact)
      const employee = await Employee.findOne({ employeeId: leave.employeeId });
      if (employee) {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        const diffDays =
          Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

        const type = leave.type.toLowerCase();
        if (employee.leaveBalances?.[type] !== undefined) {
          employee.leaveBalances[type] = Math.max(
            0,
            employee.leaveBalances[type] - diffDays
          );
          await employee.save();
        }
      }
    }

    // 5️⃣ Update leave status
    leave.status = status;
    leave.adminComment = adminComment;
    await leave.save();

    res.json({ message: "Leave updated & attendance auto-marked", leave });

  } catch (err) {
    console.error("Leave approval error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a leave request
app.delete("/api/leaves/:id", async (req, res) => {
  try {
    const leave = await Leave.findByIdAndDelete(req.params.id);
    if (!leave) {
      return res.status(404).json({ message: "Leave request not found" });
    }
    res.json({ message: "Leave request deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting leave", error: err.message });
  }
});

/* =========================================================
   🔹 LOCATION ROUTES
========================================================= */
app.post("/api/locations", async (req, res) => {
  try {
    console.log("📍 Creating location:", req.body);
    const location = await Location.create(req.body);
    res.status(201).json(location);
  } catch (err) {
    console.error("❌ Error adding location:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/locations", async (req, res) => {
  try {
    const locations = await Location.find();
    res.json(locations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/locations/:id", async (req, res) => {
  try {
    await Location.findByIdAndDelete(req.params.id);
    res.json({ message: "Location deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================================================
   🔹 SITE ASSIGNMENT ROUTES
========================================================= */
app.post("/api/site-assignments", async (req, res) => {
  try {
    const assignment = await SiteAssignment.findOneAndUpdate(
      { employeeId: req.body.employeeId, date: req.body.date },
      { $set: req.body },
      { upsert: true, new: true }
    );
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/site-assignments", async (req, res) => {
  try {
    const { employeeId, date } = req.query;
    let query = {};
    if (employeeId) query.employeeId = employeeId;
    if (date) query.date = date;
    const assignments = await SiteAssignment.find(query).populate("locationId");
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* =========================================================
   SERVER
========================================================= */
const PORT = 5001; // Hardcoded to avoid port 5000 conflicts
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
