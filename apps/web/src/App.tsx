import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import AppLayout from './components/layout/AppLayout';
import AuthPage from './pages/AuthPage';
import InboxView from './views/InboxView';
import TodayView from './views/TodayView';
import ProjectsView from './views/ProjectsView';
import { SyncService } from './services/SyncService';
import { supabase } from './lib/supabase';

export default function App() {
  const { user } = useAuth();
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    if (!user || !supabase) {
      setIsSynced(false);
      return;
    }

    const userId = user.id;
    const syncService = new SyncService(supabase);
    let unsubscribeRealtime: (() => void) | undefined;

    async function runSync() {
      try {
        await syncService.sync(userId);
        setIsSynced(true);
      } catch {
        setIsSynced(false);
      }
    }

    void runSync();

    function handleOnline() {
      void runSync();
    }
    window.addEventListener('online', handleOnline);

    unsubscribeRealtime = syncService.subscribe(userId, () => {
      void runSync();
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      unsubscribeRealtime?.();
    };
  }, [user]);

  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/" element={<AppLayout isSynced={isSynced} />}>
        <Route index element={<Navigate to="/inbox" replace />} />
        <Route path="inbox" element={<InboxView />} />
        <Route path="today" element={<TodayView />} />
        <Route path="projects" element={<ProjectsView />} />
      </Route>
      <Route path="*" element={<Navigate to="/inbox" replace />} />
    </Routes>
  );
}
