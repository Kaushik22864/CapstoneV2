import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import "../styles/doctorVerification.css";

function DoctorVerification() {
  /*
  const applications = [
    {
      id: 1,
      name: "Dr. Sarah Chen",
      email: "sarah.chen@hospital.com",
      specialization: "Cardiology",
      submissionDate: "Oct 24, 2023",
      status: "Awaiting OCR",
    },
    {
      id: 2,
      name: "Dr. Marcus Thorne",
      email: "m.thorne@medcenter.org",
      specialization: "Neurology",
      submissionDate: "Oct 23, 2023",
      status: "In Review",
    },
    {
      id: 3,
      name: "Dr. Elena Rodriguez",
      email: "elena.rod@healthmail.com",
      specialization: "Pediatrics",
      submissionDate: "Oct 22, 2023",
      status: "Flagged / ID mismatch",
    },
    {
      id: 4,
      name: "Dr. James Wilson",
      email: "j.wilson@surgery.com",
      specialization: "General Surgery",
      submissionDate: "Oct 21, 2023",
      status: "Verification Ready",
    },
  ];
  */

  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/admin/applications/recent"
      );

      const data = await response.json();

      if (data.success) {
        setApplications(data.applications);
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
        loadApplications();
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
        loadApplications();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AdminLayout active="verification">
      <main className="verification-main">
        {/* Header */}
        <div className="verification-header">
          <h1>Doctor Verification</h1>

          <p>
            Manage the clinical onboarding queue. Review submitted medical
            licenses, specialization credentials and verify identities before
            granting access to the platform.
          </p>
        </div>

        {/* Verification Table */}
        <div className="verification-card">
          <div className="card-header">
            <h3>Pending Medical Verifications</h3>

            <span className="action-required">
              Action Required: {applications.length}
            </span>
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
              {applications.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    style={{
                      textAlign: "center",
                      padding: "30px",
                    }}
                  >
                    No pending applications.
                  </td>
                </tr>
              ) : (
                applications.map((doctor) => (
                  <tr key={doctor._id}>
                    <td>
                      <div className="doctor-info">
                        <div className="doctor-avatar">
                          {(doctor.firstName[0] + doctor.lastName[0]).toUpperCase()}
                        </div>

                        <div>
                          <strong>
                            {doctor.firstName} {doctor.lastName}
                          </strong>

                          <p>{doctor.email}</p>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="specialization-tag">
                        {doctor.specialization}
                      </span>
                    </td>

                    <td>
                      {new Date(doctor.createdAt).toLocaleDateString()}
                    </td>

                    <td>
                      <span className="doc-status awaiting-ocr">
                        Pending Review
                      </span>
                    </td>

                    <td className="verification-actions">
                      <button
                        className="credential-btn"
                        onClick={() =>
                          navigate(
                            `/doctor-credential-review/${doctor._id}`
                          )
                        }
                      >
                        View Credentials
                      </button>

                      <button
                        className="approve-btn"
                        onClick={() => approveDoctor(doctor._id)}
                      >
                        Approve
                      </button>

                      <button
                        className="reject-btn"
                        onClick={() => rejectDoctor(doctor._id)}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="table-footer">
            <span>
              Showing {applications.length} application(s)
            </span>
          </div>
        </div>
      </main>
    </AdminLayout>
  );
}

export default DoctorVerification;