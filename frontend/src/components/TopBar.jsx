import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Menu, LogOut, User, Moon, Sun, Shield, Settings, Mail } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { accountApi, setActiveFamilyId, resolveJagirisFamilyId } from '../services/api';
import { resolveBackendPublicUrl } from '../lib/backendOrigin';
import { cn } from '../lib/utils';

export default function TopBar({ onMenuClick }) {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    accountApi
      .listFamilies()
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res.data?.families) ? res.data.families : [];
        const nextId = resolveJagirisFamilyId(rows);
        if (nextId) setActiveFamilyId(nextId);
      })
      .catch(() => {
        if (cancelled) return;
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setProfileOpen(false);
  };

  const iconBtnClass =
    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800';

  return (
    <header className="app-topbar">
      <div className="app-topbar-row">
        <button
          type="button"
          onClick={onMenuClick}
          className={cn(iconBtnClass, 'md:hidden')}
          aria-label="Toggle menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="min-w-0 flex-1 md:flex-none">
          <h1
            className="truncate text-base font-semibold leading-tight text-gray-900 dark:text-white md:text-xl"
            title="Jagiri's Kutumbam"
          >
            Jagiri&apos;s Kutumbam
          </h1>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          <NotificationBell />
          <button type="button" onClick={toggleTheme} className={iconBtnClass} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((o) => !o)}
              className={cn(iconBtnClass, 'md:h-auto md:w-auto md:gap-2 md:px-3 md:py-2')}
              aria-label="Account menu"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                {user?.profile_photo ? (
                  <img
                    src={resolveBackendPublicUrl(user.profile_photo)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>
              <span className="hidden text-sm font-medium md:inline">{user?.username}</span>
            </button>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-10" aria-hidden onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-700">
                    <p className="text-sm font-medium">{user?.username}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                  </div>
                  <Link
                    to="/account"
                    onClick={() => setProfileOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    <Settings className="h-4 w-4" />
                    Account &amp; privacy
                  </Link>
                  <Link
                    to="/contact"
                    onClick={() => setProfileOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    <Mail className="h-4 w-4" />
                    Contact us
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin/users"
                      onClick={() => setProfileOpen(false)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      <Shield className="h-4 w-4" />
                      Admin portal
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-red-400"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
