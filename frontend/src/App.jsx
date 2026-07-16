import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Register from "./pages/Register";
import VerificationPending from "./pages/VerificationPending";
import Login from "./pages/Login";
import Analysis from "./pages/Analysis";
import AdminDashboard from "./pages/AdminDashboard";
import UserManagement from "./pages/UserManagement";
import DoctorVerification from "./pages/DoctorVerification";
import DoctorCredentialReview from "./pages/DoctorCredentialReview";
import ForgotPassword from "./pages/ForgotPassword";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verification-pending" element={<VerificationPending />}/>
      <Route path="/login" element={<Login />} />
      <Route path="/analysis" element={<Analysis />} />
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
      <Route path="/user-management" element={<UserManagement />} />
      <Route path="/doctor-verification" element={<DoctorVerification />} />
      <Route path="/doctor-credential-review/:id" element={<DoctorCredentialReview />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
    </Routes>
  );
}

export default App;