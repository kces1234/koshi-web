import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Layouts
import AdminLayout from "./components/layout/AdminLayout";
import TeacherLayout from "./components/layout/TeacherLayout";

// Public & Auth Pages
import Home from "./pages/public/Home";
import StudentPortal from "./pages/public/StudentPortal";
import AdminLogin from "./pages/public/AdminLogin";
import TeacherLogin from "./pages/public/TeacherLogin";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard"; // <-- NEW DASHBOARD
import ClassManagement from "./pages/admin/ClassManagement";
import StudentManagement from "./pages/admin/StudentManagement";
import FeeManagement from "./pages/admin/FeeManagement";
import TeacherManagement from "./pages/admin/TeacherManagement";
import AdminAttendance from "./pages/admin/AdminAttendance";
import ResultManagement from "./pages/admin/ResultManagement";
import ReportCardGenerator from "./pages/admin/ReportCardGenerator";
import AdminTeacherAttendance from "./pages/admin/AdminTeacherAttendance";
import AdminNoticeBoard from "./pages/admin/AdminNoticeBoard";

// Teacher Pages
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import StudentAttendance from "./pages/teacher/StudentAttendance";
import TeacherMyAttendance from "./pages/teacher/TeacherMyAttendance";
import AdminAdmitCardGenerator from "./pages/admin/AdminAdmitCardGenerator";
import AdminGallery from "./pages/admin/AdminGallery";
// Import at the top
import AdminPromotion from "./pages/admin/AdminPromotion";



export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* =======================
            PUBLIC & AUTH ROUTES
        ======================= */}
        <Route path="/" element={<Home />} />
        <Route path="/portal/admit" element={<StudentPortal />} />
        <Route path="/portal/report" element={<StudentPortal />} />
        <Route path="/portal/attendance" element={<StudentPortal />} />

        <Route path="/login" element={<AdminLogin />} />
        <Route path="/teacher-login" element={<TeacherLogin />} />

        {/* =======================
            SUPER ADMIN ROUTES
        ======================= */}
        <Route path="/admin" element={<AdminLayout />}>
          {/* 👇 THIS LINE IS FIXED 👇 */}
          <Route path="dashboard" element={<AdminDashboard />} /> 
          <Route path="gallery" element={<AdminGallery />} />
          <Route path="classes" element={<ClassManagement />} />
          <Route path="students" element={<StudentManagement />} />
          <Route path="fees" element={<FeeManagement />} />
          <Route path="teachers" element={<TeacherManagement />} />
          <Route path="attendance" element={<AdminAttendance />} />
          <Route path="results" element={<ResultManagement />} />
          <Route path="reports" element={<ReportCardGenerator />} />
          <Route path="teacher-attendance" element={<AdminTeacherAttendance />} />
          <Route path="notices" element={<AdminNoticeBoard />} />
          <Route path="admit-cards" element={<AdminAdmitCardGenerator />} />
          <Route path="promotions" element={<AdminPromotion />} />
        </Route>
        

        {/* =======================
            TEACHER PORTAL ROUTES
        ======================= */}
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="my-attendance" element={<TeacherMyAttendance />} />
        </Route>

        {/* Catch-all to redirect unknown links to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}