import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { getApiErrorMessage } from '../lib/apiErrorMessage';
import { cn } from '../lib/utils';
import { AuthBranding } from '../components/AuthBranding';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const inputClass = cn(
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400',
    'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
    'dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500'
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const trimmed = identifier.trim();
      const { data } = await authApi.forgotPassword({ identifier: trimmed });

      if (data.otpDelivery === 'email' || data.otpDelivery === 'dev') {
        navigate('/reset-password', {
          replace: false,
          state: {
            identifier: trimmed,
            otpSentMessage: data.message || '',
            devOtp: data.devOtp != null ? String(data.devOtp) : undefined,
          },
        });
        return;
      }

      setMessage(data.message || 'Request received.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Something went wrong. Try again later.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="standalone-page flex min-h-full flex-col items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-950">
      <div className="w-full max-w-md">
        <AuthBranding />
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-soft dark:border-gray-800 dark:bg-gray-900 dark:shadow-soft-dark">
          <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">Forgot password</h2>
          <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
            Enter your username or email. We will send a 6-digit code to the email address on your account.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Username or email
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoComplete="username"
                className={inputClass}
              />
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            {message && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-300">
                {message}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary-600 py-2.5 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send code'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            <Link to="/login" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
              Back to log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
