import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@colformly/auth';
import { ThemeProvider } from '@colformly/theme';

import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Billing from './pages/Billing';
import Incidents from './pages/Incidents';
import Leads from './pages/Leads';
import Settings from './pages/Settings';
import SystemLogs from './pages/SystemLogs';

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider preset="superAdmin">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/system-logs" element={<SystemLogs />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ThemeProvider>
    </AuthProvider>
  );
}
