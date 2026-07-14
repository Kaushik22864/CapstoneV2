import { Link } from "react-router-dom";
import "../styles/verification.css";

function VerificationPending() {
  return (
    <div className="verification-page">

      <div className="verification-container">

        <div className="icon-circle">
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7.14807 5.71104H30.0051V21.4255H32.8621V2.854H4.29065V37.1396H20V34.2825H7.14807V5.71104Z"
              fill="#9E2A19"
            />
            <path
              d="M10.0051 8.56787H27.148V11.4249H10.0051V8.56787ZM10.0051 14.2823H24.2906V17.1394H10.0051V14.2823ZM10.0051 19.9964H18.5765V22.8534H10.0051V19.9964ZM28.5762 22.8538C24.6312 22.8538 21.4332 26.0519 21.4332 29.9968C21.4332 33.9417 24.6312 37.1397 28.5762 37.1397C32.5211 37.1397 35.7191 33.9417 35.7191 29.9968C35.7191 26.0519 32.5215 22.8538 28.5762 22.8538ZM28.5762 34.2823C26.2129 34.2823 24.2906 32.3597 24.2906 29.9968C24.2906 27.6335 26.2133 25.7112 28.5762 25.7112C30.9394 25.7112 32.8617 27.6339 32.8617 29.9968C32.8621 32.3597 30.9394 34.2823 28.5762 34.2823Z"
              fill="#9E2A19"
            />
            <path
              d="M29.648 27.0344H27.5051V30.4434L30.2156 33.1293L31.7238 31.6075L29.648 29.5504V27.0344Z"
              fill="#9E2A19"
            />
          </svg>
        </div>

        <h1>Verification Pending</h1>

        <p className="description">
          Thank you for registering. Your account is currently under
          review by our administration team. Access to the OCT analysis
          platform is restricted to verified ophthalmologists only.
        </p>

        <div className="info-box">
          <h3>Next Step</h3>

          <ul>
            <li>Admin reviews your medical license</li>
            <li>Verification typically takes 24-48 hours</li>
            <li>You will receive an email upon approval</li>
          </ul>
        </div>

        <Link to="/" className="home-link">
          Return to Home
        </Link>

      </div>

    </div>
  );
}

export default VerificationPending;