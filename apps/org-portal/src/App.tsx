import { type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@colformly/auth';
import { ThemeProvider } from '@colformly/theme';
import type { UserRole } from '@colformly/types';
import { ToastContainer } from './components/ToastContainer';
import { triggerToast } from './lib/toast';

import Login from './pages/Login';
import OrgDashboard from './pages/org/OrgDashboard';
import OrgDirectory from './pages/org/OrgDirectory';
import OrgCourses from './pages/org/OrgCourses';
import OrgBranding from './pages/org/OrgBranding';

import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherClasses from './pages/teacher/TeacherClasses';
import TeacherTestStudio from './pages/teacher/TeacherTestStudio';
import TeacherSettings from './pages/teacher/TeacherSettings';

import StudentDashboard from './pages/student/StudentDashboard';
import StudentLeaderboard from './pages/student/StudentLeaderboard';
import StudentResult from './pages/student/StudentResult';

interface RequireAuthProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

function RequireAuth({ children, allowedRoles }: RequireAuthProps) {
  const { session, user, role, isLoading } = useAuth();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const examCode = searchParams.get('code');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="font-mono text-xs text-slate-500">Verifying session...</p>
        </div>
      </div>
    );
  }

  // 1. Unauthenticated: persist pending_exam_code before redirecting to /login
  if (!session || !user) {
    if (examCode) {
      sessionStorage.setItem('pending_exam_code', examCode.trim());
    }
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 2. If a logged-in TEACHER or ORG_ADMIN opens a URL containing ?code=,
  // do NOT let them enter student exam arena; redirect to their dashboard with toast
  if (examCode && (role === 'TEACHER' || role === 'ORG_ADMIN' || role === 'SUPER_ADMIN')) {
    sessionStorage.removeItem('pending_exam_code');
    triggerToast('This is a student-only exam link.', 'error');
    const targetDashboard = role === 'TEACHER' ? '/teacher/dashboard' : '/org/dashboard';
    return <Navigate to={targetDashboard} replace />;
  }

  // 3. Role-based route authorization
  if (allowedRoles && allowedRoles.length > 0) {
    const isAuthorized =
      role === 'SUPER_ADMIN' || (role && allowedRoles.includes(role));

    if (!isAuthorized) {
      if (role === 'STUDENT') {
        const pendingCode = sessionStorage.getItem('pending_exam_code');
        const dest = pendingCode
          ? `/student/dashboard?code=${encodeURIComponent(pendingCode)}`
          : '/student/dashboard';
        return <Navigate to={dest} replace />;
      }
      if (role === 'TEACHER') {
        return <Navigate to="/teacher/dashboard" replace />;
      }
      return <Navigate to="/org/dashboard" replace />;
    }
  }

  return <>{children}</>;
}

function DefaultRedirect() {
  const { session, user, role, isLoading } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const examCode = searchParams.get('code');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (examCode && !session) {
    sessionStorage.setItem('pending_exam_code', examCode.trim());
    return <Navigate to="/login" replace />;
  }

  if (!session || !user) {
    return <Navigate to="/login" replace />;
  }

  if (examCode && (role === 'TEACHER' || role === 'ORG_ADMIN' || role === 'SUPER_ADMIN')) {
    sessionStorage.removeItem('pending_exam_code');
    triggerToast('This is a student-only exam link.', 'error');
    return <Navigate to={role === 'TEACHER' ? '/teacher/dashboard' : '/org/dashboard'} replace />;
  }

  if (role === 'STUDENT') {
    const pendingCode = sessionStorage.getItem('pending_exam_code') || examCode;
    if (pendingCode) {
      return <Navigate to={`/student/dashboard?code=${encodeURIComponent(pendingCode)}`} replace />;
    }
    return <Navigate to="/student/dashboard" replace />;
  }
  if (role === 'TEACHER') {
    return <Navigate to="/teacher/dashboard" replace />;
  }
  return <Navigate to="/org/dashboard" replace />;
}

function ThemedPortalRoutes() {
  const { activeOrg } = useAuth();

  return (
    <ThemeProvider orgTheme={activeOrg?.theme_config}>
      <ToastContainer />
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<Login />} />

        {/* Org Admin Routes (Protected: ORG_ADMIN, SUPER_ADMIN) */}
        <Route
          path="/org/dashboard"
          element={
            <RequireAuth allowedRoles={['ORG_ADMIN']}>
              <OrgDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/org/directory"
          element={
            <RequireAuth allowedRoles={['ORG_ADMIN']}>
              <OrgDirectory />
            </RequireAuth>
          }
        />
        <Route
          path="/org/courses"
          element={
            <RequireAuth allowedRoles={['ORG_ADMIN']}>
              <OrgCourses />
            </RequireAuth>
          }
        />
        <Route
          path="/org/branding"
          element={
            <RequireAuth allowedRoles={['ORG_ADMIN']}>
              <OrgBranding />
            </RequireAuth>
          }
        />

        {/* Teacher Routes (Protected: TEACHER, ORG_ADMIN, SUPER_ADMIN) */}
        <Route
          path="/teacher/dashboard"
          element={
            <RequireAuth allowedRoles={['TEACHER', 'ORG_ADMIN']}>
              <TeacherDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/teacher/classes"
          element={
            <RequireAuth allowedRoles={['TEACHER', 'ORG_ADMIN']}>
              <TeacherClasses />
            </RequireAuth>
          }
        />
        <Route
          path="/teacher/test-studio"
          element={
            <RequireAuth allowedRoles={['TEACHER', 'ORG_ADMIN']}>
              <TeacherTestStudio />
            </RequireAuth>
          }
        />
        <Route
          path="/teacher/settings"
          element={
            <RequireAuth allowedRoles={['TEACHER', 'ORG_ADMIN']}>
              <TeacherSettings />
            </RequireAuth>
          }
        />

        {/* Student Routes (Protected: STUDENT) */}
        <Route
          path="/student/dashboard"
          element={
            <RequireAuth allowedRoles={['STUDENT']}>
              <StudentDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/student/leaderboard"
          element={
            <RequireAuth allowedRoles={['STUDENT']}>
              <StudentLeaderboard />
            </RequireAuth>
          }
        />
        <Route
          path="/student/results/:id"
          element={
            <RequireAuth allowedRoles={['STUDENT']}>
              <StudentResult />
            </RequireAuth>
          }
        />

        {/* Default / Fallback Route */}
        <Route path="*" element={<DefaultRedirect />} />
      </Routes>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemedPortalRoutes />
    </AuthProvider>
  );
}
