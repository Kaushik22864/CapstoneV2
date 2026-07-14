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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleLogin = async (e) => {
  e.preventDefault();

  try {

    // Try Admin Login First
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

    if (data.success) {

      localStorage.setItem(
        "token",
        data.accessToken
      );

      localStorage.setItem(
        "role",
        "admin"
      );

      localStorage.setItem(
        "admin",
        JSON.stringify(data.admin)
      );

      alert("Welcome Admin!");

      navigate("/admin-dashboard");

      return;
    }

    // If not admin, try Specialist Login
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

    if (data.success) {

      localStorage.setItem(
        "token",
        data.accessToken
      );

      localStorage.setItem(
        "role",
        "doctor"
      );

      localStorage.setItem(
        "specialist",
        JSON.stringify(data.specialist)
      );

      alert("Welcome Doctor!");

      navigate("/analysis"); // Change later to doctor dashboard

      return;
    }

    alert("Invalid email or password");

  } catch (error) {

    console.error(error);

    alert("Could not connect to server");

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

              <div className="options">

                <label className="remember">
                  <input type="checkbox" />
                  Remember this device
                </label>

                <a href="#">
                  Forget Password?
                </a>

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