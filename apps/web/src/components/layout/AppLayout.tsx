import { Outlet } from 'react-router-dom';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import HintBar from './HintBar';

interface AppLayoutProps {
  isSynced: boolean;
}

export default function AppLayout({ isSynced }: AppLayoutProps) {
  return (
    <div className="flex flex-col h-full bg-bg">
      <Topbar isSynced={isSynced} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-y-auto">
            <Outlet />
          </div>
          <HintBar />
        </main>
      </div>
    </div>
  );
}
