import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/login.css";

import pharmacistImage from "../assets/Pharmacist--Streamline-Milano.png";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    try {
      // ----------------------------
      // Try Admin Login
      // ----------------------------
      let response = await fetch(
        "http://localhost:5000/api/admin/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      let data = await response.json();

      // Rate limited
      if (response.status === 429) {
        setError(
          data.error?.message ||
          "Too many login attempts. Please try again later."
        );
        return;
      }

      // Admin Login Success
      if (response.ok && data.success) {
        localStorage.setItem("token", data.accessToken);
        localStorage.setItem("role", "admin");
        localStorage.setItem("admin", JSON.stringify(data.admin));

        navigate("/admin-dashboard");
        return;
      }

      // ----------------------------
      // Try Specialist Login
      // ----------------------------
      response = await fetch(
        "http://localhost:5000/api/specialists/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      data = await response.json();

      // Rate limited
      if (response.status === 429) {
        setError(
          data.error?.message ||
          "Too many login attempts. Please try again later."
        );
        return;
      }

      // Specialist Login Success
      if (response.ok && data.success) {
        localStorage.setItem("token", data.accessToken);
        localStorage.setItem("role", "doctor");
        localStorage.setItem(
          "specialist",
          JSON.stringify(data.specialist)
        );

        navigate("/analysis");
        return;
      }

      // Login failed
      setError("Invalid email or password.");

    } catch (err) {
      console.error(err);
      setError("Unable to connect to the server.");
    }
  };

  return (
    <div className="login-page">
      <div className="container">
        <div className="login-card">

          <div className="left">
            <img
              src={pharmacistImage}
              alt="Illustration"
            />
          </div>

          <div className="right">

            <h1>Welcome Back</h1>

            <form onSubmit={handleLogin}>

              <label>Email Address</label>

              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
              />

              <label>Password</label>

              <input
                id="password"
                type="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={handleChange}
                required
              />

              {error && (
                <div className="login-error">
                  <span className="error-icon">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="options">

                {/* <label className="remember">
                  <input type="checkbox" />
                  Remember this device
                </label> */}

                <Link to="/forgot-password">
                  Forgot Password?
                </Link>

              </div>

              <button type="submit">
                Login
              </button>

              <div className="divider">
                <span></span>
                <span></span>
              </div>

              <p className="apply">
                New specialist?{" "}
                <Link to="/register">
                  Apply for Access
                </Link>
              </p>

            </form>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;