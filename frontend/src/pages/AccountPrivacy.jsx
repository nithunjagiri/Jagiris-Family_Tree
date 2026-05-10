import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Download, UserX, Shield, ClipboardCheck, User } from 'lucide-react';
import { accountApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { getApiErrorMessage } from '../lib/apiErrorMessage';

const PROFILE_GENDER_OPTIONS = [
  { value: '', label: 'Not set' },
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

function formatTs(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return null;
  }
}

function emptyProfileForm() {
  return {
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    gender: '',
    date_of_birth: '',
    city: '',
    village: '',
  };
}

export default function AccountPrivacy() {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState(null);
  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [privacyReadAt, setPrivacyReadAt] = useState(null);
  const [privacyLoadErr, setPrivacyLoadErr] = useState('');
  const [ackLoading, setAckLoading] = useState(false);
  const [ackMsg, setAckMsg] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const [exporting, setExporting] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteErr, setDeleteErr] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const applyUserToProfileForm = (u) => {
    if (!u) return;
    const dob =
      u.date_of_birth != null && u.date_of_birth !== ''
        ? String(u.date_of_birth).slice(0, 10)
        : '';
    setProfileForm({
      username: u.username || '',
      email: u.email || '',
      first_name: u.first_name != null ? String(u.first_name) : '',
      last_name: u.last_name != null ? String(u.last_name) : '',
      phone: u.phone != null ? String(u.phone) : '',
      gender: u.gender != null ? String(u.gender) : '',
      date_of_birth: dob,
      city: u.city != null ? String(u.city) : '',
      village: u.village != null ? String(u.village) : '',
    });
  };

  useEffect(() => {
    let cancelled = false;
    accountApi
      .getPrivacySettings()
      .then((r) => {
        if (cancelled) return;
        setProfileUser(r.data?.user || null);
        applyUserToProfileForm(r.data?.user);
        setPrivacyReadAt(r.data?.privacy?.privacy_notice_read_at || null);
        setPrivacyLoadErr('');
      })
      .catch((err) => {
        if (cancelled) return;
        setPrivacyLoadErr(getApiErrorMessage(err, 'Could not load account privacy data.'));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const startProfileEdit = () => {
    setProfileErr('');
    setProfileMsg('');
    if (profileUser) applyUserToProfileForm(profileUser);
    setProfileEditing(true);
  };

  const cancelProfileEdit = () => {
    setProfileErr('');
    setProfileMsg('');
    if (profileUser) applyUserToProfileForm(profileUser);
    setProfileEditing(false);
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileErr('');
    setProfileMsg('');
    setProfileSaving(true);
    try {
      const payload = {
        username: profileForm.username.trim(),
        email: profileForm.email.trim(),
        first_name: profileForm.first_name.trim(),
        last_name: profileForm.last_name.trim(),
        phone: profileForm.phone.trim(),
        gender: profileForm.gender || undefined,
        date_of_birth: profileForm.date_of_birth || undefined,
        city: profileForm.city.trim(),
        village: profileForm.village.trim(),
      };
      const { data } = await accountApi.updateProfile(payload);
      login(data.token, data.user);
      const r = await accountApi.getPrivacySettings();
      setProfileUser(r.data.user);
      applyUserToProfileForm(r.data.user);
      setProfileEditing(false);
      setProfileMsg('Profile saved.');
    } catch (err) {
      setProfileErr(getApiErrorMessage(err, 'Could not save profile.'));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAcknowledgePrivacy = async () => {
    setAckMsg('');
    setAckLoading(true);
    try {
      const { data } = await accountApi.acknowledgePrivacyNotice();
      setPrivacyReadAt(data?.privacy?.privacy_notice_read_at || null);
      setAckMsg('Recorded. Thank you.');
    } catch (err) {
      setAckMsg(getApiErrorMessage(err, 'Could not save.'));
    } finally {
      setAckLoading(false);
    }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    setPwErr('');
    setPwMsg('');
    setPwLoading(true);
    try {
      await accountApi.changePassword({ currentPassword, newPassword });
      setPwMsg('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPwErr(getApiErrorMessage(err, 'Could not update password.'));
    } finally {
      setPwLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await accountApi.exportData();
      const blob = new Blob([res.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jagiris-family-export-${Date.now()}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(getApiErrorMessage(err, 'Export failed.'));
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setDeleteErr('');
    setDeleteLoading(true);
    try {
      await accountApi.deleteAccount({ password: deletePassword });
      logout();
      navigate('/login');
    } catch (err) {
      setDeleteErr(getApiErrorMessage(err, 'Could not delete account.'));
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="w-full max-w-none space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Account &amp; privacy</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Signed in as{' '}
          <span className="font-medium text-gray-800 dark:text-gray-200">
            {profileUser?.username || user?.username}
          </span>
          {(profileUser?.email || user?.email) ? (
            <>
              {' '}
              · {profileUser?.email || user?.email}
            </>
          ) : null}
        </p>
        {privacyLoadErr && (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{privacyLoadErr}</p>
        )}
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <User className="h-5 w-5 text-primary-600" />
            Profile
          </h2>
          {!profileEditing ? (
            <button
              type="button"
              onClick={startProfileEdit}
              className="rounded-lg border border-primary-600 px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-50 dark:text-primary-300 dark:hover:bg-primary-950/40"
            >
              Edit profile
            </button>
          ) : null}
        </div>

        {!profileEditing ? (
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Username</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{profileUser?.username ?? user?.username ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Email</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{profileUser?.email ?? user?.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">First name</dt>
              <dd className="text-gray-900 dark:text-white">{profileUser?.first_name || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Last name</dt>
              <dd className="text-gray-900 dark:text-white">{profileUser?.last_name || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Phone</dt>
              <dd className="text-gray-900 dark:text-white">{profileUser?.phone || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">City</dt>
              <dd className="text-gray-900 dark:text-white">{profileUser?.city || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Village</dt>
              <dd className="text-gray-900 dark:text-white">{profileUser?.village || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Gender</dt>
              <dd className="text-gray-900 dark:text-white">
                {profileUser?.gender
                  ? PROFILE_GENDER_OPTIONS.find((o) => o.value === profileUser.gender)?.label || profileUser.gender
                  : '—'}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-gray-500 dark:text-gray-400">Date of birth</dt>
              <dd className="text-gray-900 dark:text-white">
                {profileUser?.date_of_birth
                  ? String(profileUser.date_of_birth).slice(0, 10)
                  : '—'}
              </dd>
            </div>
          </dl>
        ) : (
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                <input
                  value={profileForm.username}
                  onChange={(e) => setProfileForm((f) => ({ ...f, username: e.target.value }))}
                  required
                  minLength={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">First name</label>
                <input
                  value={profileForm.first_name}
                  onChange={(e) => setProfileForm((f) => ({ ...f, first_name: e.target.value }))}
                  maxLength={120}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                  autoComplete="given-name"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Last name</label>
                <input
                  value={profileForm.last_name}
                  onChange={(e) => setProfileForm((f) => ({ ...f, last_name: e.target.value }))}
                  maxLength={120}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                  autoComplete="family-name"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                  maxLength={64}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                  autoComplete="tel"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">City</label>
                <input
                  value={profileForm.city}
                  onChange={(e) => setProfileForm((f) => ({ ...f, city: e.target.value }))}
                  maxLength={255}
                  placeholder="City or town"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                  autoComplete="address-level2"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Village</label>
                <input
                  value={profileForm.village}
                  onChange={(e) => setProfileForm((f) => ({ ...f, village: e.target.value }))}
                  maxLength={255}
                  placeholder="Village or locality"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                  autoComplete="address-level3"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Gender</label>
                <select
                  value={profileForm.gender}
                  onChange={(e) => setProfileForm((f) => ({ ...f, gender: e.target.value }))}
                  className={cn(
                    'w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800',
                    'cursor-pointer'
                  )}
                >
                  {PROFILE_GENDER_OPTIONS.map((o) => (
                    <option key={o.value || 'unset'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Date of birth</label>
                <input
                  type="date"
                  value={profileForm.date_of_birth}
                  onChange={(e) => setProfileForm((f) => ({ ...f, date_of_birth: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                  autoComplete="bday"
                />
              </div>
            </div>
            {profileErr && <p className="text-sm text-red-600 dark:text-red-400">{profileErr}</p>}
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={profileSaving}
                className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {profileSaving ? 'Saving…' : 'Save profile'}
              </button>
              <button
                type="button"
                onClick={cancelProfileEdit}
                disabled={profileSaving}
                className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        {profileMsg && !profileEditing ? (
          <p className="mt-3 text-sm text-green-600 dark:text-green-400">{profileMsg}</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <ClipboardCheck className="h-5 w-5 text-primary-600" />
          Privacy record
        </h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Your choices are stored in the <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">user_privacy_settings</code>{' '}
          table (one row per user). Use the button below to record that you have read this screen&apos;s privacy guidance.
        </p>
        {privacyReadAt ? (
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Privacy notice last acknowledged: <strong>{formatTs(privacyReadAt)}</strong>
          </p>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400">You have not recorded an acknowledgment yet.</p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleAcknowledgePrivacy}
            disabled={ackLoading}
            className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {ackLoading ? 'Saving…' : 'I have read the privacy notes below'}
          </button>
          {ackMsg && <span className="text-sm text-green-600 dark:text-green-400">{ackMsg}</span>}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <KeyRound className="h-5 w-5 text-primary-600" />
          Password
        </h2>
        <form onSubmit={handlePassword} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              autoComplete="new-password"
              required
              minLength={6}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">At least 6 characters.</p>
          </div>
          {pwErr && <p className="text-sm text-red-600 dark:text-red-400">{pwErr}</p>}
          {pwMsg && <p className="text-sm text-green-600 dark:text-green-400">{pwMsg}</p>}
          <button
            type="submit"
            disabled={pwLoading}
            className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {pwLoading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <Download className="h-5 w-5 text-primary-600" />
          Your data
        </h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Download a JSON snapshot of family members, events, and gallery metadata. Photos remain on the server; paths
          are included in the export for your records.
        </p>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="rounded-lg border border-primary-600 px-4 py-2 font-medium text-primary-700 hover:bg-primary-50 disabled:opacity-60 dark:text-primary-300 dark:hover:bg-primary-950/40"
        >
          {exporting ? 'Preparing…' : 'Download data export'}
        </button>
      </section>

      <section className="rounded-2xl border border-red-200 bg-red-50/50 p-6 dark:border-red-900/40 dark:bg-red-950/20">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-red-900 dark:text-red-200">
          <UserX className="h-5 w-5" />
          Delete account
        </h2>
        <p className="mb-4 text-sm text-red-800/90 dark:text-red-200/80">
          Permanently removes your login. Family data in the shared database is not automatically erased—coordinate with
          your administrator before deleting the only admin account.
        </p>
        {!deleteOpen ? (
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
          >
            I want to delete my account
          </button>
        ) : (
          <form onSubmit={handleDelete} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-800 dark:text-gray-200">
                Confirm with your password
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                required
                autoComplete="current-password"
              />
            </div>
            {deleteErr && <p className="text-sm text-red-600 dark:text-red-400">{deleteErr}</p>}
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={deleteLoading}
                className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleteLoading ? 'Deleting…' : 'Delete my account'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteOpen(false);
                  setDeletePassword('');
                  setDeleteErr('');
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <Shield className="h-5 w-5 text-gray-500" />
          Privacy notes
        </h2>
        <ul className="list-inside list-disc space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li>Use a strong, unique password and keep your device locked when others may access it.</li>
          <li>Exports may contain personal data—store files securely and delete copies you no longer need.</li>
          <li>Administrators can review an audit trail of important changes where that feature is enabled.</li>
        </ul>
      </section>
    </div>
  );
}
