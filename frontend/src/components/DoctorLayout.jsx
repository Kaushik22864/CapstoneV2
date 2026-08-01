import { Link } from "react-router-dom";
import logo from "../assets/logo-1.png";
import "../styles/doctorLayout.css";

function DoctorLayout({ children, active }) {
  return (
    <div className="doctor-layout">
      {/* SIDEBAR */}
      <aside className="doctor-sidebar">
        <div className="doctor-sidebar-top">
          {/* LOGO */}
          <div className="sidebar-logo">
            <img src={logo} alt="OPTIScan" />
            <h2>OPTIScan</h2>
          </div>

          {/* MENU */}
          <nav className="doctor-menu">
            <Link
              to="/doctor-dashboard"
              className={active === "dashboard" ? "active" : ""}
            >
              Dashboard
            </Link>

            <Link
              to="/analysis"
              className={active === "analysis" ? "active" : ""}
            >
              Analysis
            </Link>

            <Link
              to="/history"
              className={active === "history" ? "active" : ""}
            >
              Scan History
            </Link>

            <Link
              to="/settings"
              className={active === "settings" ? "active" : ""}
            >
              Settings
            </Link>
          </nav>
        </div>

        {/* LOGOUT */}
        <Link to="/" className="doctor-logout-btn">
          Log Out
        </Link>
      </aside>

      {/* MAIN CONTENT */}
      <main className="doctor-main">
        {children}
      </main>
    </div>
  );
}

export default DoctorLayout;