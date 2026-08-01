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
              <span className="stat-icon"><svg width="48" height="24" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M0 12V10.425C0 9.70833 0.366667 9.125 1.1 8.675C1.83333 8.225 2.8 8 4 8C4.21667 8 4.425 8.00417 4.625 8.0125C4.825 8.02083 5.01667 8.04167 5.2 8.075C4.96667 8.425 4.79167 8.79167 4.675 9.175C4.55833 9.55833 4.5 9.95833 4.5 10.375V12H0ZM6 12V10.375C6 9.84167 6.14583 9.35417 6.4375 8.9125C6.72917 8.47083 7.14167 8.08333 7.675 7.75C8.20833 7.41667 8.84583 7.16667 9.5875 7C10.3292 6.83333 11.1333 6.75 12 6.75C12.8833 6.75 13.6958 6.83333 14.4375 7C15.1792 7.16667 15.8167 7.41667 16.35 7.75C16.8833 8.08333 17.2917 8.47083 17.575 8.9125C17.8583 9.35417 18 9.84167 18 10.375V12H6ZM19.5 12V10.375C19.5 9.94167 19.4458 9.53333 19.3375 9.15C19.2292 8.76667 19.0667 8.40833 18.85 8.075C19.0333 8.04167 19.2208 8.02083 19.4125 8.0125C19.6042 8.00417 19.8 8 20 8C21.2 8 22.1667 8.22083 22.9 8.6625C23.6333 9.10417 24 9.69167 24 10.425V12H19.5ZM8.125 10H15.9C15.7333 9.66667 15.2708 9.375 14.5125 9.125C13.7542 8.875 12.9167 8.75 12 8.75C11.0833 8.75 10.2458 8.875 9.4875 9.125C8.72917 9.375 8.275 9.66667 8.125 10ZM4 7C3.45 7 2.97917 6.80417 2.5875 6.4125C2.19583 6.02083 2 5.55 2 5C2 4.43333 2.19583 3.95833 2.5875 3.575C2.97917 3.19167 3.45 3 4 3C4.56667 3 5.04167 3.19167 5.425 3.575C5.80833 3.95833 6 4.43333 6 5C6 5.55 5.80833 6.02083 5.425 6.4125C5.04167 6.80417 4.56667 7 4 7ZM20 7C19.45 7 18.9792 6.80417 18.5875 6.4125C18.1958 6.02083 18 5.55 18 5C18 4.43333 18.1958 3.95833 18.5875 3.575C18.9792 3.19167 19.45 3 20 3C20.5667 3 21.0417 3.19167 21.425 3.575C21.8083 3.95833 22 4.43333 22 5C22 5.55 21.8083 6.02083 21.425 6.4125C21.0417 6.80417 20.5667 7 20 7ZM12 6C11.1667 6 10.4583 5.70833 9.875 5.125C9.29167 4.54167 9 3.83333 9 3C9 2.15 9.29167 1.4375 9.875 0.8625C10.4583 0.2875 11.1667 0 12 0C12.85 0 13.5625 0.2875 14.1375 0.8625C14.7125 1.4375 15 2.15 15 3C15 3.83333 14.7125 4.54167 14.1375 5.125C13.5625 5.70833 12.85 6 12 6ZM12 4C12.2833 4 12.5208 3.90417 12.7125 3.7125C12.9042 3.52083 13 3.28333 13 3C13 2.71667 12.9042 2.47917 12.7125 2.2875C12.5208 2.09583 12.2833 2 12 2C11.7167 2 11.4792 2.09583 11.2875 2.2875C11.0958 2.47917 11 2.71667 11 3C11 3.28333 11.0958 3.52083 11.2875 3.7125C11.4792 3.90417 11.7167 4 12 4Z" fill="#2563EB"/>
</svg>
</span>
            </div>

            <p>Total Users</p>
            <h2>{stats.totalUsers}</h2>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-icon"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M2 20C1.45 20 0.979167 19.8042 0.5875 19.4125C0.195833 19.0208 0 18.55 0 18V6C0 5.45 0.195833 4.97917 0.5875 4.5875C0.979167 4.19583 1.45 4 2 4H6V2C6 1.45 6.19583 0.979167 6.5875 0.5875C6.97917 0.195833 7.45 0 8 0H12C12.55 0 13.0208 0.195833 13.4125 0.5875C13.8042 0.979167 14 1.45 14 2V4H18C18.55 4 19.0208 4.19583 19.4125 4.5875C19.8042 4.97917 20 5.45 20 6V18C20 18.55 19.8042 19.0208 19.4125 19.4125C19.0208 19.8042 18.55 20 18 20H2ZM2 18H18V6H2V18ZM8 4H12V2H8V4ZM2 18V6V18ZM9 13V16H11V13H14V11H11V8H9V11H6V13H9Z" fill="#9333EA"/>
</svg>
</span>
            </div>

            <p>Verified Doctors</p>
            <h2>{stats.verifiedDoctors}</h2>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-icon"><svg width="19" height="21" viewBox="0 0 19 21" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M14 21C12.6167 21 11.4375 20.5125 10.4625 19.5375C9.4875 18.5625 9 17.3833 9 16C9 14.6167 9.4875 13.4375 10.4625 12.4625C11.4375 11.4875 12.6167 11 14 11C15.3833 11 16.5625 11.4875 17.5375 12.4625C18.5125 13.4375 19 14.6167 19 16C19 17.3833 18.5125 18.5625 17.5375 19.5375C16.5625 20.5125 15.3833 21 14 21ZM15.675 18.375L16.375 17.675L14.5 15.8V13H13.5V16.2L15.675 18.375ZM2 20C1.45 20 0.979167 19.8042 0.5875 19.4125C0.195833 19.0208 0 18.55 0 18V4C0 3.45 0.195833 2.97917 0.5875 2.5875C0.979167 2.19583 1.45 2 2 2H6.175C6.35833 1.41667 6.71667 0.9375 7.25 0.5625C7.78333 0.1875 8.36667 0 9 0C9.66667 0 10.2625 0.1875 10.7875 0.5625C11.3125 0.9375 11.6667 1.41667 11.85 2H16C16.55 2 17.0208 2.19583 17.4125 2.5875C17.8042 2.97917 18 3.45 18 4V10.25C17.7 10.0333 17.3833 9.85 17.05 9.7C16.7167 9.55 16.3667 9.41667 16 9.3V4H14V7H4V4H2V18H7.3C7.41667 18.3667 7.55 18.7167 7.7 19.05C7.85 19.3833 8.03333 19.7 8.25 20H2ZM9 4C9.28333 4 9.52083 3.90417 9.7125 3.7125C9.90417 3.52083 10 3.28333 10 3C10 2.71667 9.90417 2.47917 9.7125 2.2875C9.52083 2.09583 9.28333 2 9 2C8.71667 2 8.47917 2.09583 8.2875 2.2875C8.09583 2.47917 8 2.71667 8 3C8 3.28333 8.09583 3.52083 8.2875 3.7125C8.47917 3.90417 8.71667 4 9 4Z" fill="#EA580C"/>
</svg>
</span>
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