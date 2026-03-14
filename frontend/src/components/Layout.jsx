import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import Sidebar from './Sidebar';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const isFamilyTree = pathname.includes('family-tree');
  const mainClass = isFamilyTree
    ? 'min-w-0 flex-1 overflow-auto py-4 md:py-6'
    : 'min-w-0 flex-1 overflow-auto p-4 md:p-6';

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
      <TopBar onMenuClick={() => setSidebarOpen((o) => !o)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className={mainClass}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
