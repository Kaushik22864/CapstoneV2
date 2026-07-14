import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "../styles/analysis.css";
import logo from "../assets/logo-1.png";

function Analysis() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileSelect = (file) => {
  if (preview) {
    URL.revokeObjectURL(preview);
  }

  setSelectedFile(file);
  setResult(null);
  setError(null);

  if (file) {
    setPreview(URL.createObjectURL(file));
  } else {
    setPreview(null);
  }
};

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select an OCT image first.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("image", selectedFile);

    try {
      const token = localStorage.getItem("token");

      const response = await axios.post(
        "http://localhost:5000/api/predict",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setResult(response.data);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error ||
          "Analysis failed. Please check the connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="analysis-page">
      <div className="analysis-layout">
        {/* SIDEBAR */}
        <aside className="analysis-sidebar">
          <div className="analysis-sidebar-top">
            <div className="sidebar-logo">
              <img src={logo} alt="OPTIScan Logo" />
              <h2>OPTIScan</h2>
            </div>
            <nav className="analysis-menu">
              <a href="#">Dashboard</a>
              <a href="#" className="active">Analysis</a>
              <a href="#">Scan History</a>
              <a href="#">Settings</a>
            </nav>
          </div>
          <Link to="/" className="analysis-logout-btn">
            Log Out
          </Link>
        </aside>

        {/* MAIN CONTENT */}
        <main className="analysis-main-content">
          {/* TOPBAR */}
          <div className="analysis-topbar">
            <div className="analysis-search-box">
              <input type="text" placeholder="Search patients, scans or reports..." />
            </div>
            <div className="analysis-top-icons">
              <div className="analysis-notification">
                <svg width="24" height="24" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.1336 11C18.7155 16.3755 21 18 21 18H3C3 18 6 15.8667 6 8.4C6 6.70261 6.63214 5.07475 7.75736 3.87452C8.88258 2.67428 10.4087 2 12 2C12.3373 2 12.6717 2.0303 13 2.08949" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M19 8C20.6569 8 22 6.65685 22 5C22 3.34315 20.6569 2 19 2C17.3431 2 16 3.34315 16 5C16 6.65685 17.3431 8 19 8Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="analysis-profile">
                <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0.416577 28.3192C0.639911 28.375 0.868244 28.2459 0.926577 28.0242C1.78491 24.8217 5.27324 23.9917 7.35824 23.495C7.88074 23.3709 8.29325 23.2725 8.56158 23.1567C10.9366 22.1259 11.7107 20.4675 11.9424 19.2575C11.9707 19.1117 11.9182 18.9617 11.8049 18.8634C10.5682 17.7959 9.52491 16.1934 8.86658 14.35C8.84824 14.2975 8.81908 14.2492 8.78074 14.2075C7.90991 13.2609 7.40991 12.26 7.40991 11.4625C7.40991 10.9967 7.58574 10.6842 7.98158 10.4484C8.10241 10.3759 8.17824 10.2484 8.18408 10.1084C8.36825 5.86336 11.3916 2.52169 15.0999 2.50002C15.1041 2.50002 15.1849 2.50586 15.1891 2.50586C18.9157 2.55752 21.9199 5.97086 22.0274 10.2759C22.0307 10.395 22.0841 10.5067 22.1757 10.5834C22.4366 10.8042 22.5582 11.0842 22.5582 11.4642C22.5582 12.1317 22.2024 12.9525 21.5574 13.7742C21.5266 13.8134 21.5032 13.8584 21.4874 13.9059C20.8207 16.0192 19.6241 17.885 18.2057 19.0267C18.0857 19.1234 18.0291 19.2784 18.0574 19.4292C18.2891 20.6384 19.0632 22.2959 21.4382 23.3284C21.7191 23.45 22.1549 23.545 22.7074 23.6642C24.7716 24.1109 28.2257 24.86 29.0732 28.0242C29.1232 28.21 29.2916 28.3325 29.4749 28.3325C29.5107 28.3325 29.5466 28.3275 29.5832 28.3184C29.8057 28.2584 29.9374 28.03 29.8782 27.8075C28.8991 24.1517 24.9857 23.3042 22.8841 22.8492C22.3966 22.7434 21.9757 22.6525 21.7707 22.5625C20.2207 21.8892 19.2657 20.8634 18.9282 19.5084C20.3674 18.2725 21.5716 16.3659 22.2599 14.2275C22.9907 13.2775 23.3924 12.2992 23.3924 11.4634C23.3924 10.9059 23.2124 10.4409 22.8557 10.0775C22.6574 5.40752 19.3249 1.73002 15.1891 1.67086L15.0649 1.66919C11.0041 1.69086 7.65741 5.27169 7.36491 9.86086C6.84325 10.2442 6.57824 10.7817 6.57824 11.4642C6.57824 12.45 7.13575 13.6292 8.11158 14.7109C8.78574 16.5634 9.83074 18.1909 11.0749 19.33C10.7391 20.69 9.78325 21.7192 8.22991 22.3934C8.02908 22.4809 7.62908 22.5767 7.16574 22.6867C5.04824 23.19 1.10824 24.1275 0.121577 27.8092C0.0624107 28.0317 0.194077 28.2592 0.416577 28.3192Z" fill="black"/>
                </svg>
              </div>
            </div>
          </div>

          {/* TITLE */}
          <div className="analysis-page-title">
            <h1>Analyze OCT Scan</h1>
            <p>Upload a retinal OCT image for AI-assisted diagnosis.</p>
          </div>

          {/* GRID */}
          <div className="analysis-content-grid">
            {/* LEFT */}
            <div className="analysis-left-panel">
              <div className="analysis-upload-box">
                <div className="analysis-upload-content">
  {!preview ? (
    <>
      <div className="analysis-upload-icon">↑</div>
      <h2>Drag & Drop OCT Image</h2>
      <p>Supports JPG, PNG (High Resolution Recommended)</p>

      <label className="analysis-browse-btn">
        Browse Files
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files[0])}
          hidden
        />
      </label>
    </>
  ) : (
    <>
      <img
        src={preview}
        alt="OCT scan preview"
        style={{
          maxWidth: "55%",
          borderRadius: "10px",
          marginBottom: "16px",
        }}
      />

      <p>{selectedFile.name}</p>

      <label className="analysis-browse-btn">
        Change Image
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files[0])}
          hidden
        />
      </label>
    </>
  )}
</div>
              </div>

              {/* AI CARD */}
              <div className="analysis-ai-card">
                <div className="analysis-ai-header">
                  <h3>AI Engine v1.0</h3>
                  <p>Ready for diagnostic sweep</p>
                </div>
                <button
                  className="analysis-analyze-btn"
                  onClick={handleUpload}
                  disabled={loading}
                >
                  {loading ? "Analyzing..." : "Run AI Analysis"}
                </button>
                <div className="analysis-status-row">
                  <span>Processing Status</span>
                  <span>
                    {loading
                      ? "Running inference..."
                      : result
                      ? "Complete"
                      : "Waiting for trigger"}
                  </span>
                </div>
                <div className="analysis-progress-bar">
                  <div
                    className="analysis-progress"
                    style={{ width: loading ? "100%" : result ? "100%" : "0%" }}
                  ></div>
                </div>
                <small>HIPAA Compliant Processing</small>

                {error && (
                  <p style={{ color: "#dc2626", marginTop: 12 }}>{error}</p>
                )}

                {result && (
                  <div className="analysis-result-box" style={{ marginTop: 16 }}>
                    <h4>
                      Prediction:{" "}
                      <span style={{ color: "#2563eb" }}>{result.prediction}</span>
                    </h4>
                    <p>Confidence: {(result.confidence * 100).toFixed(2)}%</p>
                    <ul style={{ listStyle: "none", padding: 0 }}>
                      {Object.entries(result.probabilities).map(([label, prob]) => (
                        <li key={label} style={{ marginBottom: 6 }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>{label}</span>
                            <span>{(prob * 100).toFixed(1)}%</span>
                          </div>
                          <div style={{ background: "#eee", borderRadius: 4, height: 6 }}>
                            <div
                              style={{
                                width: `${prob * 100}%`,
                                background: "#2563eb",
                                height: "100%",
                                borderRadius: 4,
                              }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT */}
            <div className="analysis-right-panel">
              <div className="analysis-patient-card">
                <h3>Patient Information</h3>
                <div className="analysis-input-group">
                  <label>Patient Name</label>
                  <input type="text" placeholder="e.g. John Doe" />
                </div>
                <div className="analysis-row">
                  <div className="analysis-input-group">
                    <label>Patient ID</label>
                    <input type="text" placeholder="PID-12345" />
                  </div>
                  <div className="analysis-input-group">
                    <label>Date of Birth</label>
                    <input type="date" />
                  </div>
                </div>
                <div className="analysis-input-group">
                  <label>Laterality</label>
                  <div className="analysis-eye-buttons">
                    <button>Left (OS)</button>
                    <button>Right (OD)</button>
                  </div>
                </div>
                <div className="analysis-input-group">
                  <label>Clinical Notes</label>
                  <textarea placeholder="Symptoms, medical history..."></textarea>
                </div>
              </div>
              <div className="analysis-notice-card">
                <h4>Important Notice</h4>
                <p>
                  AI results are for diagnostic support only. Final clinical
                  assessment must be performed by a qualified ophthalmologist.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Analysis;