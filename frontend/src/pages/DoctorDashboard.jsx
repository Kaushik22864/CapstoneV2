import DoctorLayout from "../components/DoctorLayout";
import "../styles/doctorDashboard.css";
import { useState, useEffect } from "react";
import axios from "axios";

function DoctorDashboard() {
  // const recentAnalysis = [
  //   {
  //     id: 1,
  //     patient: "Sushant Tandukar",
  //     patientId: "PAT-8821",
  //     scanType: "OCT - Macula",
  //     prediction: "Moderate DR",
  //   },
  // ];
  const [dashboard, setDashboard] = useState(null);
  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await axios.get(
          "http://localhost:5000/api/predict/dashboard",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        setDashboard(res.data);
      } catch (err) {
        console.log(err);
      }
    };

    loadDashboard();
  }, []);

  return (
    <DoctorLayout active="dashboard">
      <div className="doctor-dashboard">
        {/* TOPBAR */}
        <div className="analysis-topbar">
          <div className="analysis-search-box">
            <input
              type="text"
              placeholder="Search patients, scans or reports..."
            />
          </div>
          <div className="analysis-top-icons">
            <div className="analysis-notification">
              <svg
                width="24"
                height="24"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18.1336 11C18.7155 16.3755 21 18 21 18H3C3 18 6 15.8667 6 8.4C6 6.70261 6.63214 5.07475 7.75736 3.87452C8.88258 2.67428 10.4087 2 12 2C12.3373 2 12.6717 2.0303 13 2.08949"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M19 8C20.6569 8 22 6.65685 22 5C22 3.34315 20.6569 2 19 2C17.3431 2 16 3.34315 16 5C16 6.65685 17.3431 8 19 8Z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="analysis-profile">
              <svg
                width="30"
                height="30"
                viewBox="0 0 30 30"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0.416577 28.3192C0.639911 28.375 0.868244 28.2459 0.926577 28.0242C1.78491 24.8217 5.27324 23.9917 7.35824 23.495C7.88074 23.3709 8.29325 23.2725 8.56158 23.1567C10.9366 22.1259 11.7107 20.4675 11.9424 19.2575C11.9707 19.1117 11.9182 18.9617 11.8049 18.8634C10.5682 17.7959 9.52491 16.1934 8.86658 14.35C8.84824 14.2975 8.81908 14.2492 8.78074 14.2075C7.90991 13.2609 7.40991 12.26 7.40991 11.4625C7.40991 10.9967 7.58574 10.6842 7.98158 10.4484C8.10241 10.3759 8.17824 10.2484 8.18408 10.1084C8.36825 5.86336 11.3916 2.52169 15.0999 2.50002C15.1041 2.50002 15.1849 2.50586 15.1891 2.50586C18.9157 2.55752 21.9199 5.97086 22.0274 10.2759C22.0307 10.395 22.0841 10.5067 22.1757 10.5834C22.4366 10.8042 22.5582 11.0842 22.5582 11.4642C22.5582 12.1317 22.2024 12.9525 21.5574 13.7742C21.5266 13.8134 21.5032 13.8584 21.4874 13.9059C20.8207 16.0192 19.6241 17.885 18.2057 19.0267C18.0857 19.1234 18.0291 19.2784 18.0574 19.4292C18.2891 20.6384 19.0632 22.2959 21.4382 23.3284C21.7191 23.45 22.1549 23.545 22.7074 23.6642C24.7716 24.1109 28.2257 24.86 29.0732 28.0242C29.1232 28.21 29.2916 28.3325 29.4749 28.3325C29.5107 28.3325 29.5466 28.3275 29.5832 28.3184C29.8057 28.2584 29.9374 28.03 29.8782 27.8075C28.8991 24.1517 24.9857 23.3042 22.8841 22.8492C22.3966 22.7434 21.9757 22.6525 21.7707 22.5625C20.2207 21.8892 19.2657 20.8634 18.9282 19.5084C20.3674 18.2725 21.5716 16.3659 22.2599 14.2275C22.9907 13.2775 23.3924 12.2992 23.3924 11.4634C23.3924 10.9059 23.2124 10.4409 22.8557 10.0775C22.6574 5.40752 19.3249 1.73002 15.1891 1.67086L15.0649 1.66919C11.0041 1.69086 7.65741 5.27169 7.36491 9.86086C6.84325 10.2442 6.57824 10.7817 6.57824 11.4642C6.57824 12.45 7.13575 13.6292 8.11158 14.7109C8.78574 16.5634 9.83074 18.1909 11.0749 19.33C10.7391 20.69 9.78325 21.7192 8.22991 22.3934C8.02908 22.4809 7.62908 22.5767 7.16574 22.6867C5.04824 23.19 1.10824 24.1275 0.121577 27.8092C0.0624107 28.0317 0.194077 28.2592 0.416577 28.3192Z"
                  fill="black"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* ===================== */}
        {/* WELCOME */}
        {/* ===================== */}

        <div className="dashboard-header">
          <div>
            <h1>Welcome Back, Dr. Ram</h1>
            <p>Here's the summary of today's retinal clinical activity.</p>
          </div>

          <a href="/analysis">
            <button className="upload-btn">Upload OCT Scan</button>
          </a>
        </div>

        {/* ===================== */}
        {/* STATS */}
        {/* ===================== */}

        <div className="stats-card">
          <div className="stats-icon">
            <svg
              width="14"
              height="19"
              viewBox="0 0 14 19"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M0 19V17H5V15C3.61667 15 2.4375 14.5125 1.4625 13.5375C0.4875 12.5625 0 11.3833 0 10C0 8.98333 0.279167 8.05833 0.8375 7.225C1.39583 6.39167 2.15 5.78333 3.1 5.4C3.23333 4.83333 3.52917 4.375 3.9875 4.025C4.44583 3.675 4.96667 3.5 5.55 3.5L5 1.95L5.95 1.6L5.6 0.7L7.5 0L7.8 0.95L8.75 0.6L11.5 8.1L10.55 8.45L10.9 9.4L9 10.1L8.7 9.15L7.75 9.5L7.15 7.85C6.9 8.08333 6.6125 8.25833 6.2875 8.375C5.9625 8.49167 5.63333 8.53333 5.3 8.5C4.93333 8.46667 4.59167 8.35417 4.275 8.1625C3.95833 7.97083 3.68333 7.73333 3.45 7.45C3 7.71667 2.64583 8.075 2.3875 8.525C2.12917 8.975 2 9.46667 2 10C2 10.8333 2.29167 11.5417 2.875 12.125C3.45833 12.7083 4.16667 13 5 13H13V15H8V17H14V19H0ZM8.65 7.55L9.55 7.2L7.85 2.5L6.9 2.85L8.65 7.55ZM5.5 7C5.78333 7 6.02083 6.90417 6.2125 6.7125C6.40417 6.52083 6.5 6.28333 6.5 6C6.5 5.71667 6.40417 5.47917 6.2125 5.2875C6.02083 5.09583 5.78333 5 5.5 5C5.21667 5 4.97917 5.09583 4.7875 5.2875C4.59583 5.47917 4.5 5.71667 4.5 6C4.5 6.28333 4.59583 6.52083 4.7875 6.7125C4.97917 6.90417 5.21667 7 5.5 7Z"
                fill="#005FB8"
              />
            </svg>
          </div>
          <p>Total Scans</p>
          <h2>{dashboard?.totalScans || 0}</h2>
        </div>

        {/* ===================== */}
        {/* MAIN GRID */}
        {/* ===================== */}

        <div className="dashboard-grid">
          {/* LEFT SECTION */}

          <div className="statistics-card">
            <div className="statistics-header">
              <h2>Scan Activity Statistics</h2>

              <select>
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
                <option>Last Year</option>
              </select>
            </div>

            <div className="graph-placeholder">
              <div className="graph-bars">
                <div className="bar-column">
                  <div className="bar" style={{ height: "42px" }}></div>
                  <span className="bar-label">Mon</span>
                </div>
                <div className="bar-column">
                  <div className="bar" style={{ height: "74px" }}></div>
                  <span className="bar-label">Tue</span>
                </div>
                <div className="bar-column">
                  <div className="bar" style={{ height: "58px" }}></div>
                  <span className="bar-label">Wed</span>
                </div>
                <div className="bar-column">
                  <div className="bar" style={{ height: "92px" }}></div>
                  <span className="bar-label">Thu</span>
                </div>
                <div className="bar-column">
                  <div className="bar" style={{ height: "82px" }}></div>
                  <span className="bar-label">Fri</span>
                </div>
                <div className="bar-column">
                  <div className="bar" style={{ height: "104px" }}></div>
                  <span className="bar-label">Sat</span>
                </div>
                <div className="bar-column">
                  <div className="bar" style={{ height: "68px" }}></div>
                  <span className="bar-label">Sun</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SECTION */}

          <div className="distribution-card">
            <h2>Disease Distribution</h2>

            <div className="distribution-item">
              <div>
                <span>Diabetic Retinopathy</span>
                <strong>0%</strong>
              </div>

              <div className="progress-bar"></div>
            </div>

            <div className="distribution-item">
              <div>
                <span>Glaucoma</span>
                <strong>0%</strong>
              </div>

              <div className="progress-bar"></div>
            </div>

            <div className="distribution-item">
              <div>
                <span>Macular Degeneration</span>
                <strong>0%</strong>
              </div>

              <div className="progress-bar"></div>
            </div>

            <div className="distribution-item">
              <div>
                <span>Normal Retina</span>
                <strong>0%</strong>
              </div>

              <div className="progress-bar"></div>
            </div>
          </div>
        </div>

        {/* ===================== */}
        {/* TABLE */}
        {/* ===================== */}

        <div className="recent-card">
          <div className="recent-header">
            <h2>Recent AI Analysis</h2>
            <button>View All</button>
          </div>

          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>AI Prediction</th>
              </tr>
            </thead>

            <tbody>
              {dashboard?.recentPredictions?.map((scan) => (
                <tr key={scan._id}>
                  <td>
                    <div className="patient-cell">
                      <div className="avatar">
                        {scan.patientName?.charAt(0)}
                      </div>

                      <div>
                        <strong>{scan.patientName}</strong>
                        <p>{scan.patientId}</p>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span className="prediction-tag">{scan.prediction}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DoctorLayout>
  );
}

export default DoctorDashboard;
