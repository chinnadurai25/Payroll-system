import React from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Messages from "./pages/Messages";

import Navbar from "./components/Navbar";
import BackgroundSlider from "./components/BackgroundSlider";

import Home from "./pages/Home";
import RoleSelection from "./pages/RoleSelection";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import EmployeeProfile from "./pages/EmployeeProfile";
import EmployeeSuccess from "./pages/EmployeeSuccess";
import ForgotPassword from "./pages/ForgotPassword";

import "./App.css";

/* 🔐 Protected Route */
const ProtectedRoute = ({ children, allowedRole }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to={`/login?role=${allowedRole}`} replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

/* ✅ Layout Wrapper */
const AppLayout = () => {
  const location = useLocation();

  // ❌ Hide navbar on employee/admin pages
  const hideNavbarRoutes = [
    "/employee-dashboard",
    "/employee-profile",
    "/admin-dashboard"
  ];

  const hideNavbar = hideNavbarRoutes.includes(location.pathname);

  return (
    <>
      <BackgroundSlider />
      {!hideNavbar && <Navbar />}

      <Routes>
        {/* 🌐 Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/role" element={<RoleSelection />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/employee-success" element={<EmployeeSuccess />} />

        {/* 🔐 Admin */}
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* 🔐 Employee */}
        <Route
          path="/employee-dashboard"
          element={
            <ProtectedRoute allowedRole="employee">
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/employee-profile"
          element={
            <ProtectedRoute allowedRole="employee">
              <EmployeeProfile />
            </ProtectedRoute>
          }
        />
        <Route
  path="/messages"
  element={
    <ProtectedRoute>
      <Messages />
    </ProtectedRoute>
  }
/>



      </Routes>
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  );
}

export default App;
