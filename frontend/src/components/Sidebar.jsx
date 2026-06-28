import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Image, Calendar, GitBranch, MapPin, Search, Settings, Shield, Mail, Megaphone, BarChart3 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

const baseNav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/family-members', label: 'Family Members', icon: Users },
  { to: '/reports', label: 'Reports', icon: BarChart3, reports: true },
  { to: '/gallery', label: 'Photo Gallery', icon: Image },
  { to: '/events', label: 'Events', icon: Calendar },
  { to: '/family-tree', label: 'Family Tree', icon: GitBranch },
  { to: '/places', label: 'Places & map', icon: MapPin },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/contact', label: 'Contact us', icon: Mail },
  { to: '/account', label: 'Account & privacy', icon: Settings },
];

const adminAnnouncementsNav = {
  to: '/admin/announcements',
  label: 'Announcements',
  icon: Megaphone,
  adminAnnouncements: true,
};

export default function Sidebar({ open, onClose }) {
  const { isAdmin } = useAuth();
  const { pathname } = useLocation();
  const nav = isAdmin
    ? [...baseNav, adminAnnouncementsNav, { to: '/admin/users', label: 'Admin portal', icon: Shield, adminPortal: true }]
    : baseNav;
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
          'group/sidebar z-30 flex flex-col border-r border-slate-800 bg-slate-900 transition-transform duration-200 dark:border-slate-800',
          'fixed left-0 top-[var(--app-topbar-total)] w-64',
          'max-md:h-[calc(100dvh-var(--app-topbar-total)-env(safe-area-inset-bottom,0px))] max-md:overflow-y-auto max-md:overscroll-y-contain max-md:pb-safe',
          'md:static md:h-full md:w-16 md:shrink-0 md:translate-x-0 md:overflow-y-auto md:overflow-x-hidden md:transition-[width] md:duration-200 md:ease-out md:hover:w-64',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <nav className="flex flex-col gap-1 p-2 md:p-2 md:pt-3">
          {nav.map(({ to, label, icon: Icon, adminPortal, adminAnnouncements, reports }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={label}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors md:justify-center md:gap-0 md:px-2 md:py-2.5 md:group-hover/sidebar:justify-start md:group-hover/sidebar:gap-3 md:group-hover/sidebar:px-3',
                  (adminPortal
                    ? pathname.startsWith('/admin') && !pathname.startsWith('/admin/announcements')
                    : adminAnnouncements
                      ? pathname.startsWith('/admin/announcements')
                      : reports
                        ? pathname.startsWith('/reports')
                        : isActive)
                    ? 'bg-primary-600 text-white md:bg-slate-800 md:text-white'
                    : 'text-slate-200 hover:bg-slate-800/90 hover:text-white'
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0 text-slate-100" />
              <span
                className={cn(
                  'min-w-0 truncate',
                  'md:max-w-0 md:overflow-hidden md:opacity-0 md:transition-[max-width,opacity] md:duration-200 md:ease-out',
                  'md:group-hover/sidebar:max-w-[220px] md:group-hover/sidebar:opacity-100'
                )}
              >
                {label}
              </span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
