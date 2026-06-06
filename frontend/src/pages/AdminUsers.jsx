import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, KeyRound, UserX, UserPlus, Search, RefreshCw } from 'lucide-react';
import { adminApi } from '../services/api';
import { cn } from '../lib/utils';
import { getApiErrorMessage } from '../lib/apiErrorMessage';

const limit = 30;

function displayName(row) {
  const f = row.first_name != null ? String(row.first_name).trim() : '';
  const l = row.last_name != null ? String(row.last_name).trim() : '';
  const full = [f, l].filter(Boolean).join(' ');
  return full || '—';
}

function formatCityVillage(row) {
  const c = row.city != null ? String(row.city).trim() : '';
  const v = row.village != null ? String(row.village).trim() : '';
  const joined = [c, v].filter(Boolean).join(' · ');
  if (joined) return joined;
  const cv = row.city_village != null ? String(row.city_village).trim() : '';
  return cv || '—';
}

export default function AdminUsers() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [q, setQ] = useState('');
  const [qDebounced, setQDebounced] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resetUser, setResetUser] = useState(null);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [resetErr, setResetErr] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [disableTarget, setDisableTarget] = useState(null);
  const [disableLoading, setDisableLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const load = () => {
    setLoading(true);
    adminApi
      .users({ limit, offset, q: qDebounced || undefined, role: role || undefined, status: status || undefined })
      .then((r) => {
        setItems(r.data.items || []);
        setTotal(r.data.total ?? 0);
        setError('');
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, 'Could not load users.'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [offset, qDebounced, role, status]);

  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  const clearFilters = () => {
    setQ('');
    setQDebounced('');
    setRole('');
    setStatus('');
    setOffset(0);
  };

  const submitReset = async (e) => {
    e.preventDefault();
    setResetErr('');
    if (newPw !== confirmPw) {
      setResetErr('Passwords do not match');
      return;
    }
    setResetLoading(true);
    try {
      await adminApi.resetUserPassword(resetUser.id, { newPassword: newPw, confirmPassword: confirmPw });
      setResetUser(null);
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      setResetErr(getApiErrorMessage(err, 'Reset failed.'));
    } finally {
      setResetLoading(false);
    }
  };

  const confirmDisable = async () => {
    if (!disableTarget) return;
    setDisableLoading(true);
    try {
      await adminApi.deactivateUser(disableTarget.id);
      setDisableTarget(null);
      load();
    } catch (err) {
      alert(getApiErrorMessage(err, 'Could not disable user.'));
    } finally {
      setDisableLoading(false);
    }
  };

  return (
    <div className="w-full max-w-none space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User management</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
            View and manage accounts. Edit profile details, reset passwords, or disable access. Disabled users cannot
            sign in.
          </p>
        </div>
        <Link
          to="/admin/users/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <UserPlus className="h-4 w-4" />
          Add user
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-soft dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 flex-1 sm:max-w-md">
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setOffset(0);
              }}
              placeholder="Search users…"
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm dark:border-gray-600 dark:bg-gray-800"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Role</label>
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setOffset(0);
            }}
            className="w-full min-w-[8rem] rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 sm:w-auto"
          >
            <option value="">All</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Status</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setOffset(0);
            }}
            className="w-full min-w-[8rem] rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 sm:w-auto"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button
          type="button"
          onClick={clearFilters}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium dark:border-gray-600"
        >
          Clear filters
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">{total} users</p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!canPrev || loading}
            onClick={() => setOffset((o) => Math.max(0, o - limit))}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium disabled:opacity-40 dark:border-gray-600"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={!canNext || loading}
            onClick={() => setOffset((o) => o + limit)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium disabled:opacity-40 dark:border-gray-600"
          >
            Next
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-soft dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Name</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Username</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Email</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Role</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">City / village</th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                    No users match your filters.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium text-gray-900 dark:text-white">
                      {displayName(row)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-700 dark:text-gray-300">{row.username}</td>
                    <td className="max-w-[200px] truncate px-4 py-2.5 text-gray-600 dark:text-gray-400" title={row.email}>
                      {row.email}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-semibold',
                          row.is_admin
                            ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        )}
                      >
                        {row.is_admin ? 'ADMIN' : 'MEMBER'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-gray-600 dark:text-gray-400">
                      {formatCityVillage(row)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                          row.is_active !== false
                            ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-500/30'
                            : 'bg-gray-100 text-gray-600 ring-gray-500/20 dark:bg-gray-800 dark:text-gray-400'
                        )}
                      >
                        {row.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <Link
                          to={`/admin/users/${row.id}/edit`}
                          title="Edit user"
                          className="inline-flex rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-primary-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-primary-400"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          title="Reset password"
                          onClick={() => {
                            setResetUser(row);
                            setNewPw('');
                            setConfirmPw('');
                            setResetErr('');
                          }}
                          className="inline-flex items-center gap-0.5 rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-primary-600 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-primary-400"
                        >
                          <RefreshCw className="h-3.5 w-3.5 opacity-80" aria-hidden />
                          <KeyRound className="h-4 w-4" />
                        </button>
                        {row.is_active !== false ? (
                          <button
                            type="button"
                            title="Disable user"
                            onClick={() => setDisableTarget(row)}
                            className="inline-flex rounded-lg p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="inline-flex p-2 text-gray-300 dark:text-gray-600" title="Already inactive">
                            <UserX className="h-4 w-4" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Reset password</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Set a new password for <strong>{resetUser.username}</strong>.
            </p>
            <form onSubmit={submitReset} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">New password</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                />
              </div>
              {resetErr && <p className="text-sm text-red-600 dark:text-red-400">{resetErr}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetUser(null)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {resetLoading ? 'Saving…' : 'Update password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {disableTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Disable user?</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              <strong>{disableTarget.username}</strong> will not be able to sign in until an admin re-enables the
              account from Edit user.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDisableTarget(null)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDisable}
                disabled={disableLoading}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {disableLoading ? 'Disabling…' : 'Disable'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
