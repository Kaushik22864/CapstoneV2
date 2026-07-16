import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import "../styles/forgotPassword.css";
import illustration from "../assets/Pharmacist--Streamline-Milano.png";

function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // STEP 1 - Send OTP
  const sendOTP = async (e) => {
    e.preventDefault();

    const response = await fetch(
        "http://localhost:5000/api/specialists/forgot-password",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email,
            }),
        }
    );

    const data = await response.json();

    alert(data.message);

    if (data.success) {
        setStep(2);
    }
};

  // STEP 2 - Verify OTP
  const verifyOTP = async (e) => {
    e.preventDefault();

    const response = await fetch(
        "http://localhost:5000/api/specialists/verify-otp",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email,
                otp,
            }),
        }
    );

    const data = await response.json();

    alert(data.message);

    if (data.success) {
        setStep(3);
    }
};

  // STEP 3 - Reset Password
  const resetPassword = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
    }

    const response = await fetch(
        "http://localhost:5000/api/specialists/reset-password",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email,
                otp,
                password,
            }),
        }
    );

    const data = await response.json();

    alert(data.message);

    if (data.success) {
        navigate("/login");
    }
};

  return (
    <div className="forgot-page">
      <div className="forgot-container">
        {/* Left Section */}
        <div className="forgot-left">
          <img
            src={illustration}
            alt="Illustration"
          />
        </div>

        {/* Right Section */}
        <div className="forgot-right">
          {step === 1 && (
            <>
              <h1>Forgot Password</h1>

              <p className="subtitle">
                Enter your registered email address and we'll send you a
                verification code.
              </p>

              <form onSubmit={sendOTP}>
                <label>Email Address</label>

                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <button type="submit">
                  Send OTP
                </button>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <h1>Verify OTP</h1>

              <p className="subtitle">
                We've sent a verification code to
              </p>

              <strong className="email-text">
                {email}
              </strong>

              <form onSubmit={verifyOTP}>
                <label>Verification Code</label>

                <input
                  type="text"
                  maxLength="6"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />

                <button type="submit">
                  Verify OTP
                </button>
              </form>

              <p className="resend">
                Didn't receive it?

                <button
                  type="button"
                  className="link-btn"
                  onClick={sendOTP}
                >
                  Resend Code
                </button>
              </p>
            </>
          )}

          {step === 3 && (
            <>
              <h1>Create New Password</h1>

              <p className="subtitle">
                Your identity has been verified.
              </p>

              <form onSubmit={resetPassword}>
                <label>New Password</label>

                <input
                  type="password"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <label>Confirm Password</label>

                <input
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />

                <button type="submit">
                  Update Password
                </button>
              </form>
            </>
          )}

          <div className="divider">
            <span></span>
            <span></span>
          </div>

          <p className="back-login">
            <Link to="/login">
              ← Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;