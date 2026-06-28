import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Menu, LogOut, User, Moon, Sun, Shield, Settings, Mail } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { accountApi, setActiveFamilyId, resolveJagirisFamilyId } from '../services/api';

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

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-gray-200 bg-white px-4 pt-safe shadow-sm dark:border-gray-800 dark:bg-gray-900 md:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden"
        aria-label="Toggle menu"
      >
        <Menu className="h-6 w-6" />
      </button>
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white md:text-xl">
        Jagiri's Kutumbam
      </h1>
      <div className="ml-auto flex items-center gap-2">
        <NotificationBell />
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
              <User className="h-4 w-4" />
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
    </header>
  );
}
