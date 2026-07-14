import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "../styles/register.css";


function Register() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    hospital: "",
    specialization: "",
    experience: "",
  });

  const [passwordErrors, setPasswordErrors] = useState([]);
  
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });

    // Clear password errors while typing
    if (e.target.id === "password") {
      setPasswordErrors([]);
    }
  };

  const handleFile = (file) => {
  if (!file) return;

  setSelectedImage(file);
  setPreview(URL.createObjectURL(file));
};

const handleFileChange = (e) => {
  handleFile(e.target.files[0]);
};

const handleDrop = (e) => {
  e.preventDefault();
  handleFile(e.dataTransfer.files[0]);
};

const handleDragOver = (e) => {
  e.preventDefault();
};

  const nextStep = (e) => {
    e.preventDefault();
    setStep(2);
  };

  const previousStep = () => {
    setStep(1);
  };

  const submitApplication = async (e) => {
    e.preventDefault();

    let credentialKey = "";
    let credentialUrl = "";

    if (selectedFile) {
      setIsUploading(true);
      try {
        const mimeType = selectedFile.type || "application/octet-stream";
        const lambdaRes = await axios.post(
          "http://localhost:5000/api/specialists/presigned-url",
          {
            fileName: selectedFile.name,
            fileType: mimeType,
          }
        );
        const { uploadUrl, key } = lambdaRes.data;
        await axios.put(uploadUrl, selectedFile, {
          headers: {
            "Content-Type": mimeType,
          },
        });
        credentialKey = key;
        credentialUrl = uploadUrl ? uploadUrl.split("?")[0] : "";
      } catch (uploadErr) {
        console.error("Credential Upload Error:", uploadErr);
        setIsUploading(false);
        alert(`Credential upload failed: ${uploadErr.response?.data?.message || uploadErr.message || "Network error during file upload"}`);
        return;
      }
      setIsUploading(false);
    }

    try {
      const response = await fetch(
        "http://localhost:5000/api/specialists/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            experience: Number(formData.experience),
            credentialKey,
            credentialUrl,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setPasswordErrors([]);
        navigate("/verification-pending");
      } else {
        if (data.code === "PASSWORD_VALIDATION_FAILED") {
          setPasswordErrors(data.errors || []);
          setStep(1); // Return to password page
        } else {
          setPasswordErrors([]);
          alert(data.message || "Registration failed.");
        }
      }
    } catch (error) {
      console.error("Backend Registration Error:", error);
      alert(`Registration failed: ${error.message || "Could not connect to backend"}`);
    }
  };

  return (
    <div className="register-page">
      <div className="container">
        <div className="card">

          <h1>Specialist Registration</h1>

          <div className="progress">
            <div className="active"></div>
            <div className={step === 2 ? "active" : ""}></div>
          </div>

          {step === 1 ? (
            <form onSubmit={nextStep}>

              <div className="row">
                <div className="input-group">
                  <label>First Name</label>
                  <input
                    id="firstName"
                    type="text"
                    placeholder="Enter your first name"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Last Name</label>
                  <input
                    id="lastName"
                    type="text"
                    placeholder="Enter your last name"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="input-group full">
                <label>Email Address</label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="input-group full">
                <label>Password</label>

                <input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={handleChange}
                  className={passwordErrors.length > 0 ? "error" : ""}
                  required
                />

                {passwordErrors.length > 0 && (
                  <div className="password-errors">
                    {passwordErrors.map((error, index) => (
                      <p key={index} className="error-text">
                        • {error}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <button className="btn" type="submit">
                Next Step
              </button>

              <div className="divider">
                <span></span>
                <span></span>
              </div>

              <p className="login-text">
                Already Verified? <Link to="/login">Login</Link>
              </p>

            </form>
          ) : (
            <form onSubmit={submitApplication}>

              <h2 className="section-title">
                Professional Credentials
              </h2>

              <div className="input-group full">
                <label>Hospital / Clinic</label>
                <input
                  id="hospital"
                  type="text"
                  placeholder="Enter hospital/clinic name"
                  value={formData.hospital}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="row">

                <div className="input-group">
                  <label>Specialization</label>
                  <input
                    id="specialization"
                    type="text"
                    placeholder="Enter your specialization"
                    value={formData.specialization}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Experience Year</label>
                  <input
                    id="experience"
                    type="number"
                    placeholder="Years of experience"
                    value={formData.experience}
                    onChange={handleChange}
                    required
                  />
                </div>

              </div>

              <div className="upload-box">
                <p>⬆</p>
                <span>
                  {selectedFile ? `Selected: ${selectedFile.name}` : "Click to upload credential or medical license"}
                </span>

                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                />
              </div>

              <div className="button-group">

                <button
                  type="button"
                  className="btn-back"
                  onClick={previousStep}
                  disabled={isUploading}
                >
                  Back
                </button>

                <button
                  type="submit"
                  className="btn-submit"
                  disabled={isUploading}
                >
                  {isUploading ? "Uploading Credential..." : "Submit Application"}
                </button>

              </div>

              <div className="divider">
                <span></span>
                <span></span>
              </div>

              <p className="login-text">
                Already Verified? <Link to="/login">Login</Link>
              </p>

            </form>
          )}

        </div>
      </div>
    </div>
  );
}

export default Register;