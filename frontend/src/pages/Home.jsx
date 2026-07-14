import { Link } from "react-router-dom";
import "../styles/home.css";

import logo from "../assets/logo-1.png";
import heroImage from "../assets/app-on-table.webp";

function Home() {
  return (
    <div className="home-page">
    <>
      {/* NAVBAR */}
      <header className="navbar">
        <div className="nav-left">
          <img src={logo} alt="Logo" className="logo" />
          <span>OPTISCAN</span>
        </div>

        <nav className="nav-links">
          <a href="#">Research</a>
          <a href="#">About</a>
        </nav>

        <div className="nav-buttons">
          <Link to="/login" className="btn-light">
            Login
          </Link>

          <Link to="/register" className="btn-primary">
            Get Access
          </Link>
        </div>
      </header>

      {/* LANDING */}
      <section className="landing">
        <div className="landing-text">
          <span className="tag">
            AI-Powered Ophthalmology Platform
          </span>

          <h1>
            AI-Powered <br />
            <span>Retinal Disease</span>
            <br />
            Detection
          </h1>

          <p>
            Enhance clinical decision-making with automated retinal layer
            segmentation and pathology detection. Get instant expert-level
            analysis of OCT scans within seconds.
          </p>

          <div className="landing-buttons">
            <Link to="/register" className="btn-primary">
              Get Access
            </Link>

            <a
              href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              target="_blank"
              rel="noreferrer"
              className="btn-outline"
            >
              Watch Demo
            </a>
          </div>
        </div>

        <div className="landing-image">
          <img src={heroImage} alt="OCT Platform" />
        </div>
      </section>

      {/* FEATURES */}
      <section className="features">
        <div className="features-header">
          <span className="small-title">
            EMPOWERING OPHTHALMOLOGY
          </span>

          <h2>
            Advanced AI Diagnostic Suite for Modern Practices
          </h2>

          <p>
            Integrate cutting-edge deep learning directly into your workflow
            to improve patient outcomes and clinic efficiency.
          </p>
        </div>

        <div className="feature-grid">
          <div className="feature-card">
            <svg width="22" height="23" viewBox="0 0 22 23" fill="none">
              <path d="M2.475 13.925L0 12.05L5.875 3.95L8.7 6.45L12.8 0.6L16.1 4.125L19.125 0L21.7 1.9L16.425 9.1L13.2 5.65L9.275 11.225L6.325 8.625L2.475 13.925ZM15.275 18.225C15.8083 18.225 16.2667 18.0333 16.65 17.65C17.0333 17.2667 17.225 16.8083 17.225 16.275C17.225 15.7417 17.0333 15.2833 16.65 14.9C16.2667 14.5167 15.8083 14.325 15.275 14.325C14.7417 14.325 14.2833 14.5167 13.9 14.9C13.5167 15.2833 13.325 15.7417 13.325 16.275C13.325 16.8083 13.5167 17.2667 13.9 17.65C14.2833 18.0333 14.7417 18.225 15.275 18.225ZM19.675 22.85L17.625 20.8C17.275 20.9833 16.9042 21.125 16.5125 21.225C16.1208 21.325 15.7083 21.375 15.275 21.375C13.8583 21.375 12.6542 20.8792 11.6625 19.8875C10.6708 18.8958 10.175 17.6917 10.175 16.275C10.175 14.8583 10.6708 13.6542 11.6625 12.6625C12.6542 11.6708 13.8583 11.175 15.275 11.175C16.6917 11.175 17.8958 11.6708 18.8875 12.6625C19.8792 13.6542 20.375 14.8583 20.375 16.275C20.375 16.6917 20.3292 17.0917 20.2375 17.475C20.1458 17.8583 20.0083 18.225 19.825 18.575L21.875 20.625L19.675 22.85Z" fill="#005FB8"/>
            </svg>
            <h3>Automated Detection</h3>
             <p>
               Instantly identify biomarkers for AMD, DME and RVO with
               99% sensitivity using proprietary neural networks.
             </p>
          </div>

  <div className="feature-card">
    <svg width="24" height="18" viewBox="0 0 24 18" fill="none">
      <path d="M6.35 17.7C4.59894 17.7 3.10284 17.1 1.8617 15.9C0.620568 14.7 0 13.2333 0 11.5C0 10.0333 0.404167 8.7125 1.2125 7.5375C2.02083 6.3625 3.11667 5.61667 4.5 5.3C5.01667 3.7 5.94167 2.41667 7.275 1.45C8.60833 0.483333 10.1083 0 11.775 0C13.8083 0 15.5583 0.6875 17.025 2.0625C18.4917 3.4375 19.3167 5.13333 19.5 7.15C20.7 7.46667 21.675 8.1125 22.425 9.0875C23.175 10.0625 23.55 11.175 23.55 12.425C23.55 13.8903 23.025 15.1358 21.975 16.1615C20.925 17.1872 19.6667 17.7 18.2 17.7H13.725C12.8588 17.7 12.1172 17.3916 11.5003 16.7747C10.8834 16.1578 10.575 15.4163 10.575 14.55V10.925L8.8 12.7L7.125 11.05L11.775 6.375L16.425 11.05L14.75 12.7L12.975 10.925V14.55H18.2C18.8 14.55 19.3167 14.3333 19.75 13.9C20.1833 13.4667 20.4 12.95 20.4 12.35C20.4 11.75 20.1833 11.2333 19.75 10.8C19.3167 10.3667 18.8 10.15 18.2 10.15H16.4V7.775C16.4 6.49542 15.9491 5.40469 15.0472 4.50281C14.1453 3.60094 13.0546 3.15 11.775 3.15C10.4583 3.15 9.35833 3.64583 8.475 4.6375C7.59167 5.62917 7.15 6.8 7.15 8.15H6.35C5.46619 8.15 4.71191 8.46233 4.08714 9.087C3.46238 9.71166 3.15 10.4658 3.15 11.3495C3.15 12.2332 3.46238 12.9875 4.08714 13.6125C4.71191 14.2375 5.46619 14.55 6.35 14.55H8.575V17.7H6.35Z" fill="#005FB8"/>
    </svg>

    <h3>Seamless Integration</h3>

    <p>
      Direct DICOM integration from major OCT manufacturers
      including Zeiss, Heidelberg and Topcon.
    </p>
  </div>

  <div className="feature-card">
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M5 14.85H7V9.85H5V14.85ZM12.7 14.85H14.7V4.85H12.7V14.85ZM8.85 14.85H10.85V11.85H8.85V14.85ZM8.85 9.85H10.85V7.85H8.85V9.85ZM3.15 19.7C2.26667 19.7 1.52083 19.3958 0.9125 18.7875C0.304167 18.1792 0 17.4333 0 16.55V3.15C0 2.26667 0.304167 1.52083 0.9125 0.9125C1.52083 0.304167 2.26667 0 3.15 0H16.55C17.4333 0 18.1792 0.304167 18.7875 0.9125C19.3958 1.52083 19.7 2.26667 19.7 3.15V16.55C19.7 17.4333 19.3958 18.1792 18.7875 18.7875C18.1792 19.3958 17.4333 19.7 16.55 19.7H3.15ZM3.15 16.55H16.55V3.15H3.15V16.55Z" fill="#005FB8"/>
    </svg>

    <h3>Predictive Analytics</h3>

    <p>
      Track disease progression with quantitative volumetric
      data and automated trend reports.
    </p>
  </div>

</div>
      </section>

      {/* CTA */}
      <section className="cta">
        <h2>Join the Future of Retinal Care</h2>

        <p>
          Experience the most advanced AI diagnostic tool for
          ophthalmology. Start your journey today.
        </p>

        <div className="cta-buttons">
          <Link to="/register" className="btn-light">
            Sign Up
          </Link>

          <a href="#" className="btn-outline-light">
            View Documentation
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-grid">
          <div>
            <img src={logo} alt="Logo" className="logo" />

            <p>
              Leading the transformation of ophthalmology through
              artificial intelligence diagnostics.
            </p>
          </div>

          <div>
            <h4>Product</h4>
            <a href="#">Platform Overview</a>
            <a href="#">Security & Privacy</a>
            <a href="#">Regulatory Compliance</a>
          </div>

          <div>
            <h4>Resources</h4>
            <a href="#">Case Studies</a>
            <a href="#">Whitepapers</a>
            <a href="#">API Documentation</a>
          </div>

          <div>
            <h4>Institutional</h4>
            <a href="#">Partner Network</a>
            <a href="#">Academic Research</a>
            <a href="#">Contact Support</a>
          </div>
        </div>
      </footer>
    </></div>
  );
}

export default Home;