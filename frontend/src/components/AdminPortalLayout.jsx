import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '../lib/utils';

const tabClass = ({ isActive }) =>
  cn(
    'rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
    isActive
      ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-300'
      : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
  );

export default function AdminPortalLayout() {
  return (
    <div className="w-full max-w-none space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin portal</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Manage user accounts and review the audit trail.
        </p>
      </div>
      <nav className="flex gap-1 border-b border-gray-200 dark:border-gray-700" aria-label="Admin sections">
        <NavLink to="users" className={tabClass}>
          Users
        </NavLink>
        <NavLink to="announcements" className={tabClass}>
          Announcements
        </NavLink>
        <NavLink to="audit" className={tabClass}>
          Audit log
        </NavLink>
      </nav>
      <Outlet />
    </div>
  );
}
