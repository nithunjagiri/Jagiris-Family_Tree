import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import NavigationOriginTracker from './NavigationOriginTracker';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const isFamilyTree = pathname.includes('family-tree');
  const isDashboard = pathname === '/';
  const mainClass = isFamilyTree
    ? 'flex min-w-0 flex-1 min-h-0 flex-col overflow-hidden p-2 pb-safe md:p-4'
    : isDashboard
      ? 'min-w-0 flex-1 overflow-y-auto overscroll-y-contain p-4 md:p-6 lg:p-8 pb-safe'
      : 'min-w-0 flex-1 overflow-y-auto overscroll-y-contain p-4 md:p-6 pb-safe';

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
      <NavigationOriginTracker />
      <TopBar onMenuClick={() => setSidebarOpen((o) => !o)} />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className={mainClass}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
