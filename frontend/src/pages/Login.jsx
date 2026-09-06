import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { getApiErrorMessage } from '../lib/apiErrorMessage';
import { cn } from '../lib/utils';
import { isNativeApp } from '../lib/mobile';
import { AuthBranding } from '../components/AuthBranding';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const successMessage = location.state?.message;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.login({ username, password });
      login(data.token, data.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = cn(
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400',
    'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
    'dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500'
  );

  const passwordInputClass = cn(inputClass, 'pr-10');

  return (
    <div
      className={cn(
        'standalone-page flex min-h-full flex-col items-center bg-gray-50 px-4 pb-safe dark:bg-gray-950',
        // Native: safe-area + ~3mm clearance so "Welcome" clears the camera/notch.
        // Use pt + pb (not py) so top padding is not overridden.
        isNativeApp()
          ? 'justify-start pt-[calc(var(--app-safe-top)+0.75rem)] pb-6'
          : 'justify-center py-12'
      )}
    >
      <div className="w-full max-w-md">
        <AuthBranding />
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-soft dark:border-gray-800 dark:bg-gray-900 dark:shadow-soft-dark">
          <h2 className="mb-6 text-xl font-bold text-gray-900 dark:text-white">Log in</h2>
          {typeof successMessage === 'string' && successMessage.trim() && (
            <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-300">
              {successMessage}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className={passwordInputClass}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
                </button>
              </div>
              <div className="mt-2 text-right">
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary-600 py-2.5 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
              Register
            </Link>
          </p>
          <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
            <Link to="/privacy-policy" className="hover:text-primary-600 hover:underline dark:hover:text-primary-400">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
