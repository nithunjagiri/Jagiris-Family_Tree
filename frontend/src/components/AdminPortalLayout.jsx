import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Breadcrumb from './Breadcrumb';
import { cn } from '../lib/utils';

const tabClass = ({ isActive }) =>
  cn(
    'rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
    isActive
      ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-300'
      : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
  );

export default function AdminPortalLayout() {
  const { pathname } = useLocation();
  const pageLabel = pathname.includes('/admin/announcements')
    ? 'Announcements'
    : pathname.includes('/admin/audit')
      ? 'Audit log'
      : 'Admin portal';
  const pageDescription =
    pageLabel === 'Announcements'
      ? 'Create and manage announcements for the family.'
      : pageLabel === 'Audit log'
        ? 'Review activity across the family app.'
        : 'Manage user accounts and review the audit trail.';

  return (
    <div className="w-full max-w-none space-y-6">
      <div>
        <Breadcrumb backTo="/" items={[{ label: 'Home', to: '/' }, { label: pageLabel }]} />
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{pageDescription}</p>
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
