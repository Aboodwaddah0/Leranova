import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import AdminProtectedRoute from "./routes/AdminProtectedRoute";
import OrganizationProtectedRoute from "./routes/OrganizationProtectedRoute";
import InstructorProtectedRoute from "./routes/InstructorProtectedRoute";
import DashboardPlaceholderPage from "./pages/DashboardPlaceholderPage";
import InstructorDashboardPage from "./pages/InstructorDashboardPage";
import InstructorSubjectsPage from "./pages/instructor/InstructorSubjectsPage";
import InstructorLessonsPage from "./pages/instructor/InstructorLessonsPage";
import InstructorStudentsPage from "./pages/instructor/InstructorStudentsPage";
import InstructorMarksPage from "./pages/instructor/InstructorMarksPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import SignupPage from "./pages/SignupPage";
import PaymentRedirect from "./components/auth/PaymentRedirect";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import OrganizationWorkspacePage from "./pages/OrganizationWorkspacePage";
import AdminOverviewPage from "./pages/admin/AdminOverviewPage";
import AdminOrganizationsPage from "./pages/admin/AdminOrganizationsPage";
import AdminRevenuePage from "./pages/admin/AdminRevenuePage";
import AdminPlansPage from "./pages/admin/AdminPlansPage";
import { GooeyToaster } from "goey-toast";
import { LEARNOVA_TOASTER_PROPS } from "./lib/notify";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/signup/checkout" element={<PaymentRedirect />} />
        <Route path="/payment-success" element={<PaymentSuccessPage />} />

        <Route path="/admin/login" element={<AdminLoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPlaceholderPage />} />
          <Route element={<OrganizationProtectedRoute />}>
            <Route path="/dashboard/organization" element={<OrganizationWorkspacePage />} />
          </Route>
          <Route element={<InstructorProtectedRoute />}>
            <Route path="/dashboard/instructor" element={<InstructorDashboardPage />} />
            <Route path="/dashboard/instructor/overview" element={<InstructorDashboardPage />} />
            <Route path="/dashboard/instructor/subjects" element={<InstructorSubjectsPage />} />
            <Route path="/dashboard/instructor/lessons" element={<InstructorLessonsPage />} />
            <Route path="/dashboard/instructor/students" element={<InstructorStudentsPage />} />
            <Route path="/dashboard/instructor/marks" element={<InstructorMarksPage />} />
          </Route>
          <Route path="/dashboard/:role" element={<DashboardPlaceholderPage />} />
        </Route>

        <Route element={<AdminProtectedRoute />}>
          <Route path="/admin" element={<AdminOverviewPage />} />
          <Route path="/admin/organizations" element={<AdminOrganizationsPage />} />
          <Route path="/admin/revenue" element={<AdminRevenuePage />} />
          <Route path="/admin/plans" element={<AdminPlansPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <GooeyToaster {...LEARNOVA_TOASTER_PROPS} />
    </BrowserRouter>
  );
}

export default App;
