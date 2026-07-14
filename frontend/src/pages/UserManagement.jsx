import { useState, useEffect } from "react";
import AdminLayout from "../components/AdminLayout";
import "../styles/userManagement.css";

function UserManagement() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("All Roles");
  const [status, setStatus] = useState("All Status");
  const [institution, setInstitution] = useState("All Institutions");

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showManage, setShowManage] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/admin/users");

      const data = await response.json();

      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const openDetails = (user) => {
    setSelectedUser(user);
    setShowDetails(true);
  };

  const openManage = (user) => {
    setSelectedUser(user);
    setShowManage(true);
  };

  const changeRole = async (newRole) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/admin/user/${selectedUser.id}/role`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role: newRole,
          }),
        },
      );

      const data = await response.json();

      console.log(response.status);
      console.log(data);

      if (data.success) {
        alert(data.message);
        setShowManage(false);
        fetchUsers();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const deleteUser = async () => {
    if (!window.confirm("Are you sure you want to delete this account?")) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/admin/user/${selectedUser.id}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      console.log(response.status);
      console.log(data);

      if (data.success) {
        alert(data.message);
        setShowManage(false);
        fetchUsers();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const filteredUsers = users.filter((user) => {
    return (
      (user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())) &&
      (role === "All Roles" || user.role === role) &&
      (status === "All Status" || user.status === status) &&
      (institution === "All Institutions" || user.institution === institution)
    );
  });

  return (
    <AdminLayout active="users">
      <main className="user-management-main">
        <div className="dashboard-top-grid">
          <div className="filter-card">
            <div className="filter-grid">
              <div>
                <label>Search Name or Email</label>

                <input
                  type="text"
                  placeholder="e.g. Dr. Julian Thorne"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div>
                <label>Role</label>

                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option>All Roles</option>
                  <option>Doctor</option>
                  <option>Admin</option>
                </select>
              </div>

              <div>
                <label>Status</label>

                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option>All Status</option>
                  <option>Verified</option>
                  <option>Pending</option>
                  <option>Suspended</option>
                </select>
              </div>

              <div>
                <label>Institution</label>

                <select
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                >
                  <option>All Institutions</option>

                  {[...new Set(users.map((user) => user.institution))].map(
                    (inst) => (
                      <option key={inst}>{inst}</option>
                    ),
                  )}
                </select>
              </div>
            </div>
          </div>

          <div className="health-card">
            <h3>Platform Health</h3>

            <p>All authentication services are currently operational.</p>

            <div className="health-footer">
              <div className="tech-stack">
                <span>JWT</span>
                <span>AWS</span>
                <span>MongoDB</span>
              </div>

              <div className="uptime">● 99.9% Uptime</div>
            </div>
          </div>
        </div>

        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>User Name</th>
                <th>Role</th>
                <th>Institution</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="user-cell">
                      <div className="avatar">
                        {user.name
                          .split(" ")
                          .map((word) => word[0])
                          .join("")
                          .substring(0, 2)}
                      </div>

                      <div>
                        <strong>{user.name}</strong>

                        <p>{user.email}</p>
                      </div>
                    </div>
                  </td>

                  <td>{user.role}</td>

                  <td>{user.institution}</td>

                  <td>
                    <span
                      className={
                        user.status === "Verified"
                          ? "status verified"
                          : user.status === "Pending"
                            ? "status pending"
                            : "status suspended"
                      }
                    >
                      {user.status}
                    </span>
                  </td>

                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>

                  <td>
                    <button
                      className="table-link"
                      onClick={() => openDetails(user)}
                    >
                      View Details
                    </button>

                    <button
                      className="table-link"
                      onClick={() => openManage(user)}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="table-footer">
            <span>
              Showing {filteredUsers.length} of {users.length} users
            </span>

            <div>
              <button className="page-btn">Previous</button>

              <button className="page-btn">Next</button>
            </div>
          </div>
        </div>

        {showDetails && selectedUser && (
          <div className="modal-overlay">
            <div className="modal">
              <h2>User Details</h2>

              <p>
                <strong>Name:</strong> {selectedUser.name}
              </p>

              <p>
                <strong>Email:</strong> {selectedUser.email}
              </p>

              <p>
                <strong>Role:</strong> {selectedUser.role}
              </p>

              <p>
                <strong>Institution:</strong> {selectedUser.institution}
              </p>

              <p>
                <strong>Status:</strong> {selectedUser.status}
              </p>

              <p>
                <strong>Joined:</strong>{" "}
                {new Date(selectedUser.createdAt).toLocaleString()}
              </p>

              <button
                className="approve-btn"
                onClick={() => setShowDetails(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {showManage && selectedUser && (
          <div className="modal-overlay">
            <div className="modal">
              <h2>Manage User</h2>

              <p>{selectedUser.name}</p>

              <button
                className="approve-btn"
                onClick={() => changeRole("Doctor")}
              >
                Make Doctor
              </button>

              <button
                className="approve-btn"
                onClick={() => changeRole("Admin")}
              >
                Make Admin
              </button>

              <button className="reject-btn" onClick={deleteUser}>
                Delete Account
              </button>

              <button
                className="table-link"
                onClick={() => setShowManage(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </main>
    </AdminLayout>
  );
}

export default UserManagement;
