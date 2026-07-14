import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import "../styles/adminDashboard.css";

function AdminDashboard() {
  /*
  const recentRequests = [
    {
      id: 1,
      doctor: "Dr. Sarah Chen",
      email: "sarah.chen@hospital.com",
      specialization: "Cardiology",
      submitted: "Oct 24, 2023",
      status: "Awaiting OCR",
    },
    {
      id: 2,
      doctor: "Dr. James Wilson",
      email: "jwilson@visioncare.org",
      specialization: "Retina",
      submitted: "Oct 24, 2023",
      status: "Awaiting OCR",
    },
    {
      id: 3,
      doctor: "Dr. Emily Brown",
      email: "ebrown@cityeye.com",
      specialization: "Glaucoma",
      submitted: "Oct 23, 2023",
      status: "Awaiting OCR",
    },
  ];
  */

  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalUsers: 0,
    verifiedDoctors: 0,
    pendingRequests: 0,
    verifiedToday: 0,
    rejectedRequests: 0,
  });

  const [recentRequests, setRecentRequests] = useState([]);

  useEffect(() => {
    fetchDashboard();
    fetchRecentRequests();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/admin/dashboard"
      );

      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecentRequests = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/admin/applications/recent"
      );

      const data = await response.json();

      if (data.success) {
        setRecentRequests(data.applications);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const approveDoctor = async (id) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/admin/application/${id}/approve`,
        {
          method: "PUT",
        }
      );

      const data = await response.json();

      if (data.success) {
        alert("Doctor Approved");
        fetchDashboard();
        fetchRecentRequests();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const rejectDoctor = async (id) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/admin/application/${id}/reject`,
        {
          method: "PUT",
        }
      );

      const data = await response.json();

      if (data.success) {
        alert("Application Rejected");
        fetchDashboard();
        fetchRecentRequests();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AdminLayout active="dashboard">
      <main className="dashboard-main">
        <div className="dashboard-header">
          <h1>Welcome Admin!</h1>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-icon">👥</span>
            </div>

            <p>Total Users</p>
            <h2>{stats.totalUsers}</h2>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-icon">🩺</span>
            </div>

            <p>Verified Doctors</p>
            <h2>{stats.verifiedDoctors}</h2>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-icon">📋</span>
            </div>

            <p>Pending Requests</p>
            <h2>{stats.pendingRequests}</h2>
          </div>
        </div>

        <div className="dashboard-middle">
          <div className="graph-card">
            <div className="graph-header">
              <h3>User Growth</h3>
              <span>● Doctors</span>
            </div>

            <div className="graph">
              <div className="bar h40"></div>
              <div className="bar h70"></div>
              <div className="bar h65"></div>
              <div className="bar h75"></div>
              <div className="bar h85"></div>
              <div className="bar h70"></div>
              <div className="bar h85"></div>
            </div>

            <div className="graph-days">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </div>

          <div className="dashboard-sidecards">
            <div className="small-card">
              <small>VERIFIED TODAY</small>
              <h2>{stats.verifiedToday}</h2>
            </div>

            <div className="small-card">
              <small>REJECTED REQUESTS</small>
              <h2>{stats.rejectedRequests}</h2>
            </div>
          </div>
        </div>

        <div className="requests-card">
          <div className="requests-header">
            <h3>Recent Access Requests</h3>

            <Link to="/doctor-verification">
              View All
            </Link>
          </div>

          <table>
            <thead>
              <tr>
                <th>Doctor Name</th>
                <th>Specialization</th>
                <th>Submission Date</th>
                <th>Document Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {recentRequests.map((doctor) => (
                <tr key={doctor._id}>
                  <td>
                    <div className="doctor-info">
                      <strong>
                        {doctor.firstName} {doctor.lastName}
                      </strong>
                      <p>{doctor.email}</p>
                    </div>
                  </td>

                  <td>
                    <span className="specialization-badge">
                      {doctor.specialization}
                    </span>
                  </td>

                  <td>
                    {new Date(doctor.createdAt).toLocaleDateString()}
                  </td>

                  <td>
                    <span className="pending-status">
                      ● {doctor.status}
                    </span>
                  </td>

                  <td className="action-buttons">
                    <button
                      className="view-button"
                      onClick={() =>
                        navigate(`/doctor-credential-review/${doctor._id}`)
                      }
                    >
                      View Credentials
                    </button>

                    <button
                      className="approve-button"
                      onClick={() => approveDoctor(doctor._id)}
                    >
                      Approve
                    </button>

                    <button
                      className="reject-button"
                      onClick={() => rejectDoctor(doctor._id)}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </AdminLayout>
  );
}

export default AdminDashboard;