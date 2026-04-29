import { Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

import { useAuth } from './contexts/AuthContext';
import { useSync } from './hooks/useSync';
import AppLayout from './components/layout/AppLayout';
import AuthPage from './pages/AuthPage';
import InboxView from './views/InboxView';
import TodayView from './views/TodayView';
import ProjectsView from './views/ProjectsView';
import WeekView from './views/WeekView';
import MonthView from './views/MonthView';

export default function App() {
  const { user } = useAuth();
  const syncStatus = useSync(user);

  return (
    <>
      <Analytics />
      <SpeedInsights />
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={<AppLayout syncStatus={syncStatus} />}>
          <Route index element={<Navigate to="/inbox" replace />} />
          <Route path="inbox" element={<InboxView />} />
          <Route path="today" element={<TodayView />} />
          <Route path="projects" element={<ProjectsView />} />
          <Route path="week" element={<WeekView />} />
          <Route path="month" element={<MonthView />} />
        </Route>
        <Route path="*" element={<Navigate to="/inbox" replace />} />
      </Routes>
    </>
  );
}
