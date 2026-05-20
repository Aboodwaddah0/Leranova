import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import AdminProtectedRoute from "./routes/AdminProtectedRoute";
import OrganizationProtectedRoute from "./routes/OrganizationProtectedRoute";
import InstructorProtectedRoute from "./routes/InstructorProtectedRoute";
import InstructorSchoolOnlyRoute from "./routes/InstructorSchoolOnlyRoute";
import StudentProtectedRoute from "./routes/StudentProtectedRoute";
import DashboardPlaceholderPage from "./pages/DashboardPlaceholderPage";
import InstructorDashboardPage from "./pages/InstructorDashboardPage";
import InstructorCoursesPage from "./pages/instructor/InstructorCoursesPage";
import InstructorStudentsPage from "./pages/instructor/InstructorStudentsPage";
import InstructorMarksPage from "./pages/instructor/InstructorMarksPage";
import InstructorSettingsPage from "./pages/instructor/InstructorSettingsPage";
import InstructorAnalyticsPage from "./pages/instructor/InstructorAnalyticsPage";
import StudentDashboardPage from "./pages/student/StudentDashboardPage";
import StudentCoursesPage from "./pages/student/StudentCoursesPage";
import StudentCourseDetailsPage from "./pages/student/StudentCourseDetailsPage";
import StudentSchoolSubjectsPage from "./pages/student/StudentSchoolSubjectsPage";
import StudentSchoolMarksPage from "./pages/student/StudentSchoolMarksPage";
import StudentChatPage from "./pages/student/StudentChatPage";
import StudentTeachersPage from "./pages/student/StudentTeachersPage";
import StudentTeacherProfilePage from "./pages/student/StudentTeacherProfilePage";
import StudentSubjectPage from "./pages/student/StudentSubjectPage";
import StudentLessonPage from "./pages/student/StudentLessonPage";
import StudentProfilePage from "./pages/student/StudentProfilePage";
import StudentSocialPage from "./pages/student/StudentSocialPage";
import StudentPageErrorBoundary from "./components/student/StudentPageErrorBoundary";
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
import ParentDashboardPage from "./pages/parent/ParentDashboardPage";
import ParentMarksPage from "./pages/parent/ParentMarksPage";
import ParentSettingsPage from "./pages/parent/ParentSettingsPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ForceChangePasswordPage from "./pages/ForceChangePasswordPage";
import { GooeyToaster } from "goey-toast";
import { LEARNOVA_TOASTER_PROPS } from "./lib/notify";

function LegacyStudentCourseRedirect() {
  const { courseId } = useParams();
  return <Navigate to={`/courses/${courseId}`} replace />;
}

function LegacyStudentLessonRedirect() {
  const { lessonId } = useParams();
  return <Navigate to={`/lessons/${lessonId}`} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/signup/checkout" element={<PaymentRedirect />} />
        <Route path="/payment-success" element={<PaymentSuccessPage />} />
        <Route path="/payment/success" element={<PaymentSuccessPage />} />
        <Route path="/subscription/success" element={<PaymentSuccessPage />} />
        <Route path="/payment/cancel" element={<Navigate to="/signup" replace />} />
        <Route path="/subscription/cancel" element={<Navigate to="/signup" replace />} />
        <Route path="/verify-email/:token" element={<VerifyEmailPage />} />

        <Route path="/admin/login" element={<AdminLoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/change-password" element={<ForceChangePasswordPage />} />
          <Route path="/dashboard" element={<DashboardPlaceholderPage />} />
          <Route element={<OrganizationProtectedRoute />}>
            <Route path="/dashboard/organization" element={<OrganizationWorkspacePage />} />
          </Route>
          <Route path="/dashboard/parent" element={<ParentDashboardPage />} />
          <Route path="/dashboard/parent/marks" element={<ParentMarksPage />} />
          <Route path="/dashboard/parent/settings" element={<ParentSettingsPage />} />
          <Route element={<InstructorProtectedRoute />}>
            <Route path="/dashboard/instructor" element={<InstructorDashboardPage />} />
            <Route path="/dashboard/instructor/overview" element={<InstructorDashboardPage />} />
            <Route path="/dashboard/instructor/courses" element={<InstructorCoursesPage />} />
            <Route path="/dashboard/instructor/students" element={<InstructorStudentsPage />} />
            <Route path="/dashboard/instructor/settings" element={<InstructorSettingsPage />} />
            <Route path="/dashboard/instructor/analytics" element={<InstructorAnalyticsPage />} />
            <Route element={<InstructorSchoolOnlyRoute />}>
              <Route path="/dashboard/instructor/marks" element={<InstructorMarksPage />} />
            </Route>
          </Route>
          <Route element={<StudentProtectedRoute />}>
            <Route path="/dashboard/student" element={<StudentPageErrorBoundary><StudentDashboardPage /></StudentPageErrorBoundary>} />
            <Route path="/dashboard/student/overview" element={<StudentPageErrorBoundary><StudentDashboardPage /></StudentPageErrorBoundary>} />
            <Route path="/dashboard/student/courses" element={<StudentPageErrorBoundary><StudentCoursesPage /></StudentPageErrorBoundary>} />
              <Route path="/courses" element={<StudentPageErrorBoundary><StudentCoursesPage /></StudentPageErrorBoundary>} />
              <Route path="/dashboard/student/courses" element={<Navigate to="/courses" replace />} />
              <Route path="/student/courses" element={<Navigate to="/courses" replace />} />
              <Route path="/courses/:courseId" element={<StudentCourseDetailsPage />} />
              <Route path="/student/subjects" element={<StudentPageErrorBoundary><StudentSchoolSubjectsPage /></StudentPageErrorBoundary>} />
              <Route path="/student/marks" element={<StudentPageErrorBoundary><StudentSchoolMarksPage /></StudentPageErrorBoundary>} />
              <Route path="/student/courses/:courseId" element={<LegacyStudentCourseRedirect />} />
              <Route path="/courses/:courseId/subjects/:subjectId" element={<StudentSubjectPage />} />
              <Route path="/student/subjects/:subjectId" element={<Navigate to="/courses" replace />} />
              <Route path="/lessons/:lessonId" element={<Navigate to="/courses" replace />} />
              <Route path="/student/lessons/:lessonId" element={<Navigate to="/courses" replace />} />
            <Route path="/teachers" element={<StudentPageErrorBoundary><StudentTeachersPage /></StudentPageErrorBoundary>} />
            <Route path="/teachers/:teacherId" element={<StudentPageErrorBoundary><StudentTeacherProfilePage /></StudentPageErrorBoundary>} />
            <Route path="/student/chat" element={<StudentPageErrorBoundary><StudentChatPage /></StudentPageErrorBoundary>} />
            <Route path="/student/social" element={<StudentPageErrorBoundary><StudentSocialPage /></StudentPageErrorBoundary>} />
            <Route path="/student/profile" element={<StudentProfilePage />} />
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
