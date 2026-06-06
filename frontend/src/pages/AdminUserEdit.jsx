import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminApi } from '../services/api';
import { cn } from '../lib/utils';
import { getApiErrorMessage } from '../lib/apiErrorMessage';

const GENDER_OPTIONS = [
  { value: '', label: 'Not set' },
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export default function AdminUserEdit() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [city, setCity] = useState('');
  const [village, setVillage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetPw, setResetPw] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwErr, setPwErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminApi
      .getUser(id)
      .then((r) => {
        if (cancelled) return;
        const u = r.data.user;
        setUsername(u.username || '');
        setEmail(u.email || '');
        setFirstName(u.first_name != null ? String(u.first_name) : '');
        setLastName(u.last_name != null ? String(u.last_name) : '');
        setPhone(u.phone != null ? String(u.phone) : '');
        setGender(u.gender != null ? String(u.gender) : '');
        setDob(u.date_of_birth != null ? String(u.date_of_birth).slice(0, 10) : '');
        const c = u.city != null ? String(u.city).trim() : '';
        const v = u.village != null ? String(u.village).trim() : '';
        if (c || v) {
          setCity(c);
          setVillage(v);
        } else if (u.city_village != null && String(u.city_village).trim() !== '') {
          setCity(String(u.city_village).trim());
          setVillage('');
        } else {
          setCity('');
          setVillage('');
        }
        setIsAdmin(!!u.is_admin);
        setIsActive(u.is_active !== false);
        setErr('');
      })
      .catch((e) => {
        if (!cancelled) setErr(getApiErrorMessage(e, 'Could not load user.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSave = async (e) => {
    e.preventDefault();
    setMsg('');
    setErr('');
    setPwErr('');
    setSaving(true);
    try {
      const payload = {
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        gender: gender || '',
        date_of_birth: dob || '',
        city: city.trim(),
        village: village.trim(),
        is_admin: isAdmin,
        is_active: isActive,
      };
      if (resetPw) {
        if (!newPw || newPw.length < 6) {
          setPwErr('Enter a new password (at least 6 characters).');
          setSaving(false);
          return;
        }
        if (newPw !== confirmPw) {
          setPwErr('Password fields do not match');
          setSaving(false);
          return;
        }
      }
      await adminApi.patchUser(id, payload);
      if (resetPw) {
        await adminApi.resetUserPassword(id, { newPassword: newPw, confirmPassword: confirmPw });
        setNewPw('');
        setConfirmPw('');
        setResetPw(false);
      }
      setMsg('User updated.');
    } catch (e) {
      setErr(getApiErrorMessage(e, 'Save failed.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (err && !username) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <p className="text-red-600 dark:text-red-400">{err}</p>
        <Link to="/admin/users" className="text-primary-600 hover:underline dark:text-primary-400">
          Back to users
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/admin/users"
          className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          ← Back to users
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit user</h1>

      <form onSubmit={handleSave} className="space-y-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Personal information
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">First name</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                maxLength={120}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Last name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                maxLength={120}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Account</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
              <input
                value={username}
                readOnly
                className="w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">Not editable after creation.</p>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={64}
                placeholder="+91 98765 43210"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">City</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                maxLength={255}
                placeholder="City or town"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Village</label>
              <input
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                maxLength={255}
                placeholder="Village or locality"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Role &amp; status
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className={cn(
                  'w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800',
                  'cursor-pointer'
                )}
              >
                {GENDER_OPTIONS.map((o) => (
                  <option key={o.value || 'x'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Date of birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <input
                id="is-admin"
                type="checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600"
              />
              <label htmlFor="is-admin" className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Administrator
              </label>
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <input
                id="inactive"
                type="checkbox"
                checked={!isActive}
                onChange={(e) => setIsActive(!e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600"
              />
              <label htmlFor="inactive" className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Inactive (cannot sign in)
              </label>
            </div>
          </div>
        </section>

        <section className="border-t border-gray-200 pt-6 dark:border-gray-700">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Password reset
          </h2>
          <div className="flex items-center gap-3">
            <input
              id="reset-pw"
              type="checkbox"
              checked={resetPw}
              onChange={(e) => {
                setResetPw(e.target.checked);
                setPwErr('');
              }}
              className="h-4 w-4 rounded border-gray-300 text-primary-600"
            />
            <label htmlFor="reset-pw" className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Reset password for this user
            </label>
          </div>
          {resetPw && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">New password</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  minLength={6}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Confirm</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  minLength={6}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                />
              </div>
            </div>
          )}
          {pwErr && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{pwErr}</p>}
        </section>

        {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}
        {msg && <p className="text-sm text-green-600 dark:text-green-400">{msg}</p>}

        {!isActive && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            <p className="font-medium">This account is disabled.</p>
            <button
              type="button"
              onClick={async () => {
                setErr('');
                try {
                  await adminApi.activateUser(id);
                  setIsActive(true);
                  setMsg('Account re-enabled.');
                } catch (e) {
                  setErr(getApiErrorMessage(e, 'Could not enable account.'));
                }
              }}
              className="mt-2 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800"
            >
              Re-enable account
            </button>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
          <Link
            to="/admin/users"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium dark:border-gray-600"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Update user'}
          </button>
        </div>
      </form>
    </div>
  );
}
