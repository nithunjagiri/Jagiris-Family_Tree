import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Image, Calendar, GitBranch } from 'lucide-react';
import { cn } from '../lib/utils';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/family-members', label: 'Family Members', icon: Users },
  { to: '/gallery', label: 'Photo Gallery', icon: Image },
  { to: '/events', label: 'Events', icon: Calendar },
  { to: '/family-tree', label: 'Family Tree', icon: GitBranch },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          aria-hidden
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          'fixed left-0 top-14 z-30 h-[calc(100vh-3.5rem)] w-64 border-r border-gray-200 bg-white transition-transform dark:border-gray-800 dark:bg-gray-900 md:static md:top-0 md:h-full md:min-h-0 md:translate-x-0 md:border-r',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <nav className="flex flex-col gap-1 p-4">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
