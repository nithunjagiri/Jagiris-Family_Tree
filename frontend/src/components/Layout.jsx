import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import Sidebar from './Sidebar';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const isFamilyTree = pathname.includes('family-tree');
  const isDashboard = pathname === '/';
  const shellClass = isFamilyTree
    ? 'flex h-[100dvh] flex-col overflow-hidden bg-gray-50 dark:bg-gray-950'
    : 'flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950';
  const innerClass = isFamilyTree ? 'flex min-h-0 flex-1 items-stretch' : 'flex flex-1';
  const mainClass = isFamilyTree
    ? 'min-w-0 flex-1 min-h-0 overflow-y-auto overscroll-y-contain py-4 md:py-6 pb-safe'
    : isDashboard
      ? 'min-w-0 flex-1 p-4 md:p-6 lg:p-8 pb-safe'
      : 'min-w-0 flex-1 p-4 md:p-6 pb-safe';

  return (
    <div className={shellClass}>
      <TopBar onMenuClick={() => setSidebarOpen((o) => !o)} />
      <div className={innerClass}>
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className={mainClass}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
