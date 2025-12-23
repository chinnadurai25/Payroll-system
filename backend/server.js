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

/* ---------- EMPLOYEE SCHEMA ---------- */
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

    email: { type: String, unique: true },
    password: String
  },
  { timestamps: true }
);

const Employee = mongoose.model("Employee", employeeSchema);

/* ---------- ADMIN SCHEMA (NEW COLLECTION) ---------- */
const adminSchema = new mongoose.Schema(
  {
    fullName: String,
    email: { type: String, unique: true },
    password: String
  },
  { timestamps: true }
);

const Admin = mongoose.model("Admin", adminSchema);

/* ---------- CREATE DEFAULT ADMIN (RUNS ONCE) ---------- */
const createDefaultAdmin = async () => {
  try {
    const adminExists = await Admin.findOne({ email: "admin@payroll.com" });

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("admin123", 10);

      await Admin.create({
        fullName: "System Admin",
        email: "admin@payroll.com",
        password: hashedPassword
      });

      console.log("✅ Default admin created");
    } else {
      console.log("ℹ️ Admin already exists");
    }
  } catch (err) {
    console.error("❌ Admin creation error:", err);
  }
};

createDefaultAdmin();

/* ---------- REGISTER (EMPLOYEE ONLY) ---------- */
/* ---------- REGISTER ---------- */
app.post("/register", async (req, res) => {
  try {
    // ❌ Block admin registration
    if (req.body.role === "admin") {
      return res.status(403).json({
        message: "Admin registration not allowed",
      });
    }

    const exists = await Employee.findOne({ email: req.body.email });
    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 🔹 Generate Employee ID
    const count = await Employee.countDocuments({ role: "employee" });
    const employeeId = `Fly_emp${count + 1}`;

    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const employee = new Employee({
      ...req.body,
      employeeId, // ✅ auto generated
      password: hashedPassword,
      role: "employee",
    });

    await employee.save();

    res.status(201).json({
      message: "Registration successful",
      employee: {
        fullName: employee.fullName,
        email: employee.email,
        employeeId: employee.employeeId,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


/* ---------- LOGIN (ADMIN & EMPLOYEE) ---------- */
app.post("/login", async (req, res) => {
  const { email, password, role } = req.body;

  try {
    let user;

    if (role === "admin") {
      user = await Admin.findOne({ email });
    } else {
      user = await Employee.findOne({ email });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    res.json({
      role,
      email: user.email
    });
  } catch (err) {
    res.status(500).json({ message: "Login error" });
  }
});

/* ---------- SERVER ---------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
