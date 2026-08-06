import DoctorLayout from "../components/DoctorLayout";
import "../styles/settings.css";
import { useEffect, useState } from "react";
import axios from "axios";

function Settings() {
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmNew: "" });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:5000/api/specialists/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data && res.data.specialist) {
          setProfile(res.data.specialist);
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const updateProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const payload = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        hospital: profile.hospital,
        specialization: profile.specialization,
        experience: profile.experience,
      };
      const res = await axios.put("http://localhost:5000/api/specialists/me", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(res.data?.message || "Profile updated");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to update profile");
    }
  };

  const submitChangePassword = async () => {
    if (passwords.newPassword !== passwords.confirmNew) {
      alert("New passwords do not match");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        "http://localhost:5000/api/specialists/me/password",
        { currentPassword: passwords.currentPassword, newPassword: passwords.newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(res.data?.message || "Password updated");
      setPasswords({ currentPassword: "", newPassword: "", confirmNew: "" });
      setShowPasswordForm(false);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to change password");
    }
  };

  const deactivate = async () => {
    if (!confirm("Are you sure you want to deactivate your account? This cannot be undone.")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.delete("http://localhost:5000/api/specialists/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(res.data?.message || "Account deactivated");
      // optional: log out user
      localStorage.removeItem("token");
      window.location.href = "/login";
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to deactivate account");
    }
  };

  if (loading) return (
    <DoctorLayout active="settings"><div className="settings-page">Loading...</div></DoctorLayout>
  );

  return (
    <DoctorLayout active="settings">
      <div className="settings-page">

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

        {/* PERSONAL INFORMATION */}

        <div className="settings-card">

          <div className="settings-header">
            <h2>Personal Information</h2>
            <p>Update your photo and personal details.</p>
          </div>

          <div className="settings-body">

            <div className="avatar-section">
              <img src={profile.avatar || "https://imgs.search.brave.com/W5S0P8uzxeNd-lrg3nyw86ecPMM5oeLYQYRNUL-kj4I/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9wZnBz/dGFjay5jb20vd3At/Y29udGVudC91cGxv/YWRzLzIwMjYvMDMv/ZG93bmxvYWQtNjcu/anBn"} alt="profile" />
            </div>

            <div className="form-section">

              <div className="settings-row">
                <div className="input-group">
                  <label>Full Name</label>
                  <input type="text" value={`${profile.firstName || ''} ${profile.lastName || ''}`} readOnly />
                </div>

                <div className="input-group">
                  <label>Email Address</label>
                  <input type="email" value={profile.email || ''} onChange={(e)=>setProfile({...profile,email:e.target.value})} />
                </div>
              </div>

              <div className="input-group">
                <label>Bio</label>
                <textarea value={profile.bio || ''} onChange={(e)=>setProfile({...profile,bio:e.target.value})} />
              </div>

            </div>
          </div>

          <div className="button-row">
            <button className="cancel-btn" onClick={()=>window.location.reload()}>Cancel</button>
            <button className="save-btn" onClick={updateProfile}>Save Changes</button>
          </div>
        </div>

        {/* SECURITY */}

        <div className="settings-card">

          <div className="settings-header">
            <h2>Security Settings</h2>
            <p>Keep your account safe.</p>
          </div>

          <div className="security-row">
            <span>Password</span>

            <button className="change-btn" onClick={()=>setShowPasswordForm(!showPasswordForm)}>
              {showPasswordForm? 'Cancel' : 'Change'}
            </button>
          </div>

          {showPasswordForm && (
            <div className="password-form">
              <div className="input-group">
                <label>Current Password</label>
                <input type="password" value={passwords.currentPassword} onChange={(e)=>setPasswords({...passwords,currentPassword:e.target.value})} />
              </div>
              <div className="input-group">
                <label>New Password</label>
                <input type="password" value={passwords.newPassword} onChange={(e)=>setPasswords({...passwords,newPassword:e.target.value})} />
              </div>
              <div className="input-group">
                <label>Confirm New Password</label>
                <input type="password" value={passwords.confirmNew} onChange={(e)=>setPasswords({...passwords,confirmNew:e.target.value})} />
              </div>
              <div style={{marginTop:12}}>
                <button className="save-btn" onClick={submitChangePassword}>Update Password</button>
              </div>
            </div>
          )}
        </div>

        {/* DELETE ACCOUNT */}

        <div className="danger-card">
          <div>
            <h3>Delete Account</h3>

            <p>
              Once you delete your account,
              there is no going back.
            </p>
          </div>

          <button className="danger-btn" onClick={deactivate}>
            Deactivate
          </button>
        </div>

      </div>
    </DoctorLayout>
  );
}

export default Settings;