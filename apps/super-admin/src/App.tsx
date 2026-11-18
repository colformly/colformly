import { Routes, Route } from 'react-router-dom';

function Dashboard() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <h1 className="text-4xl font-display font-bold text-indigo-400">
        Colformly &mdash; Super Admin
      </h1>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/*" element={<Dashboard />} />
    </Routes>
  );
}
