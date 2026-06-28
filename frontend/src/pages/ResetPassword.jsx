import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { authApi } from '../services/api';
import { getApiErrorMessage } from '../lib/apiErrorMessage';
import { cn } from '../lib/utils';
import { AuthBranding } from '../components/AuthBranding';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSentMessage, setOtpSentMessage] = useState('');
  const [devOtpBanner, setDevOtpBanner] = useState('');

  const tokenFromUrl = searchParams.get('token');
  const legacyTokenMode = Boolean(tokenFromUrl);

  useEffect(() => {
    if (tokenFromUrl) setToken(tokenFromUrl);
  }, [tokenFromUrl]);

  useEffect(() => {
    const s = location.state;
    if (s?.identifier && String(s.identifier).trim()) setIdentifier(String(s.identifier).trim());
    setOtpSentMessage(s?.otpSentMessage ? String(s.otpSentMessage) : '');
    setDevOtpBanner(s?.devOtp ? String(s.devOtp) : '');
  }, [location.state]);

  const inputClass = cn(
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400',
    'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
    'dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500'
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      if (legacyTokenMode) {
        const t = token.trim() || tokenFromUrl;
        if (!t) {
          setError('Reset token is missing.');
          setLoading(false);
          return;
        }
        const { data } = await authApi.resetPassword({
          token: t,
          password,
          confirm_password: confirmPassword,
        });
        navigate('/login', {
          replace: true,
          state: { message: data.message || 'Password updated. You can log in now.' },
        });
        return;
      }

      if (!identifier.trim()) {
        setError('Enter the username or email you used on the forgot-password page.');
        setLoading(false);
        return;
      }
      if (!/^\d{6}$/.test(otp.trim())) {
        setError('Enter the 6-digit code from your email.');
        setLoading(false);
        return;
      }

      const { data } = await authApi.resetPasswordWithOtp({
        identifier: identifier.trim(),
        otp: otp.trim(),
        password,
        confirm_password: confirmPassword,
      });
      navigate('/login', {
        replace: true,
        state: { message: data.message || 'Password updated. You can log in now.' },
      });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not reset password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="standalone-page flex min-h-full flex-col items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-950">
      <div className="w-full max-w-md">
        <AuthBranding />
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-soft dark:border-gray-800 dark:bg-gray-900 dark:shadow-soft-dark">
          <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
            {legacyTokenMode ? 'Set a new password' : 'Enter verification code'}
          </h2>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            {legacyTokenMode
              ? 'This page was opened with a reset link. Choose a new password below.'
              : 'Enter the 6-digit code from your email, then choose a new password.'}
          </p>
          {!legacyTokenMode && otpSentMessage && (
            <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-300">
              {otpSentMessage}
            </div>
          )}
          {!legacyTokenMode && devOtpBanner && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="mb-2 font-medium text-amber-900 dark:text-amber-200">Development code (not emailed)</p>
              <p className="font-mono text-2xl font-bold tracking-widest text-amber-950 dark:text-amber-50">
                {devOtpBanner}
              </p>
              <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
                Configure RESEND_API_KEY or SMTP_* + EMAIL_FROM to send real email instead.
              </p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!legacyTokenMode && (
              <>
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
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    6-digit code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    autoComplete="one-time-code"
                    placeholder="000000"
                    className={cn(inputClass, 'font-mono text-lg tracking-[0.35em]')}
                  />
                </div>
              </>
            )}
            {legacyTokenMode && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Reset token</label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                  autoComplete="off"
                  className={inputClass}
                />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirm new password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className={inputClass}
              />
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary-600 py-2.5 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            <Link to="/forgot-password" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
              Request a new code
            </Link>
            {' · '}
            <Link to="/login" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
              Back to log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
