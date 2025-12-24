import React from "react";
import { Link } from "react-router-dom";
import "../styles/Home.css";
import heroMan from "../assets/hero-man.png";

const Home = () => {
  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-wrapper">
          {/* Left Content */}
          <div className="hero-content">
            <h1>Smart Payroll Management</h1>
            <p>
              A simple and secure payroll system to manage employee salaries,
              attendance, deductions, and payslips efficiently.
            </p>
            <Link to="/role">
              <button className="primary-btn">Create Account</button>
            </Link>
          </div>

          {/* Right Image */}
          <div className="hero-image">
            <img src={heroMan} alt="Payroll Professional" />
          </div>
        </div>
      </section>


      {/* About Section */}
      <section className="about">
        <h2>Why Choose Our Payroll Software?</h2>
        <p>
          Our payroll software helps organizations automate salary processing,
          reduce manual errors, and maintain accurate employee records.
        </p>

        <div className="features">
          <div className="feature-card">
            <h3>Employee Management</h3>
            <p>Maintain employee details, roles, and salary structure.</p>
          </div>

          <div className="feature-card">
            <h3>Accurate Payroll</h3>
            <p>Automatically calculate salaries, deductions, and net pay.</p>
          </div>

          <div className="feature-card">
            <h3>Payslip Generation</h3>
            <p>Generate and download payslips securely for employees.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>© 2025 Fly Towards Digital Innovation. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Home;
