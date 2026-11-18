import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    return (_jsx(ThemeProvider, { orgTheme: activeOrg?.theme_config, children: _jsxs(Routes, { children: [_jsx(Route, { path: "/org/dashboard", element: _jsx(OrgDashboard, {}) }), _jsx(Route, { path: "/org/directory", element: _jsx(OrgDirectory, {}) }), _jsx(Route, { path: "/org/courses", element: _jsx(OrgCourses, {}) }), _jsx(Route, { path: "/org/branding", element: _jsx(OrgBranding, {}) }), _jsx(Route, { path: "/teacher/dashboard", element: _jsx(TeacherDashboard, {}) }), _jsx(Route, { path: "/teacher/classes", element: _jsx(TeacherClasses, {}) }), _jsx(Route, { path: "/teacher/test-studio", element: _jsx(TeacherTestStudio, {}) }), _jsx(Route, { path: "/teacher/settings", element: _jsx(TeacherSettings, {}) }), _jsx(Route, { path: "/student/dashboard", element: _jsx(StudentDashboard, {}) }), _jsx(Route, { path: "/student/leaderboard", element: _jsx(StudentLeaderboard, {}) }), _jsx(Route, { path: "/student/results/:id", element: _jsx(StudentResult, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/org/dashboard", replace: true }) })] }) }));
}
export default function App() {
    return (_jsx(AuthProvider, { children: _jsx(ThemedPortalRoutes, {}) }));
}
//# sourceMappingURL=App.js.map