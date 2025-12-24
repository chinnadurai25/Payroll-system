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
      basicPay: { type: Number, default: 0 },
      hra: { type: Number, default: 0 },
      allowances: { type: Number, default: 0 },
      tax: { type: Number, default: 0 }
    },

    email: { type: String, unique: true },
    password: String
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
   ATTENDANCE MODEL (MONTHLY + DAYS MAP)
========================================================= */
const attendanceSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true },
    month: { type: String, required: true }, // YYYY-MM
    days: {
      type: Map,
      of: String // P / A / L
    }
  },
  { timestamps: true }
);

// ONE document per employee per month
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
   AUTH ROUTES
========================================================= */
app.post("/register", async (req, res) => {
  try {
    if (req.body.role === "admin") {
      return res.status(403).json({ message: "Admin registration not allowed" });
    }

    const exists = await Employee.findOne({ email: req.body.email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const count = await Employee.countDocuments();
    const employeeId = `Fly_emp${count + 1}`;

    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const employee = new Employee({
      ...req.body,
      employeeId,
      password: hashedPassword,
      role: "employee"
    });

    await employee.save();
    res.status(201).json({ message: "Registration successful" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password, role } = req.body;

  const user =
    role === "admin"
      ? await Admin.findOne({ email })
      : await Employee.findOne({ email });

  if (!user) return res.status(404).json({ message: "User not found" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ message: "Invalid password" });

  res.json({
    role: user.role || role,
    email: user.email,
    fullName: user.fullName,
    employeeId: user.employeeId
  });
});

/* =========================================================
   EMPLOYEES
========================================================= */
app.get("/api/employees", async (req, res) => {
  const employees = await Employee.find({}, { password: 0, __v: 0 });
  res.json(employees);
});

app.get("/api/employees/:employeeId", async (req, res) => {
  const employee = await Employee.findOne(
    { employeeId: req.params.employeeId },
    { password: 0, __v: 0 }
  );
  if (!employee) return res.status(404).json({ message: "Employee not found" });
  res.json(employee);
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
   ATTENDANCE (FIXED LOGIC ✅)
========================================================= */
app.post("/api/attendance", async (req, res) => {
  try {
    const { employeeId, date, status } = req.body;
    const month = date.slice(0, 7); // YYYY-MM

    await Attendance.findOneAndUpdate(
      { employeeId, month },
      {
        $set: {
          [`days.${date}`]: status
        }
      },
      { upsert: true, new: true }
    );

    res.json({ message: "Attendance saved successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Attendance save failed" });
  }
});

app.get("/api/attendance", async (req, res) => {
  const { employeeId, month } = req.query;

  const record = await Attendance.findOne({ employeeId, month });
  res.json(record?.days || {});
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

/* =========================================================
   SERVER
========================================================= */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
