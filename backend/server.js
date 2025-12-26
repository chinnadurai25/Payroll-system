const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

/* ---------- DB CONNECTION ---------- */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

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
    profilePhoto: { type: String, default: null }
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
      of: String
    }
  },
  { timestamps: true }
);

attendanceSchema.index({ employeeId: 1, month: 1 }, { unique: true });

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
    response: { type: String, default: null }
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

app.post("/login", async (req, res) => {
  const { email, password, role } = req.body;

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
      "profilePhoto"
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
  const { employeeId, date, status } = req.body;
  const month = date.slice(0, 7);

  await Attendance.findOneAndUpdate(
    { employeeId, month },
    { $set: { [`days.${date}`]: status } },
    { upsert: true, new: true }
  );

  res.json({ message: "Attendance saved successfully" });
});

app.get("/api/attendance", async (req, res) => {
  const { employeeId, month } = req.query;
  const record = await Attendance.findOne({ employeeId, month });
  res.json(record?.days || {});
});

/* =========================================================
   🔹 MESSAGE ROUTES (NEW – ADDED ONLY)
========================================================= */

// Send message
app.post("/api/messages", async (req, res) => {
  const msg = await Message.create(req.body);
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

/* =========================================================
   SERVER
========================================================= */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
