import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@colformly/auth';
import { ThemeProvider } from '@colformly/theme';

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

function ThemedPortalRoutes() {
  const { activeOrg } = useAuth();

  return (
    <ThemeProvider orgTheme={activeOrg?.theme_config}>
      <Routes>
        {/* Org Admin Routes */}
        <Route path="/org/dashboard" element={<OrgDashboard />} />
        <Route path="/org/directory" element={<OrgDirectory />} />
        <Route path="/org/courses" element={<OrgCourses />} />
        <Route path="/org/branding" element={<OrgBranding />} />

        {/* Teacher Routes */}
        <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
        <Route path="/teacher/classes" element={<TeacherClasses />} />
        <Route path="/teacher/test-studio" element={<TeacherTestStudio />} />
        <Route path="/teacher/settings" element={<TeacherSettings />} />

        {/* Student Routes */}
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/leaderboard" element={<StudentLeaderboard />} />
        <Route path="/student/results/:id" element={<StudentResult />} />

        {/* Default Redirect */}
        <Route path="*" element={<Navigate to="/org/dashboard" replace />} />
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
