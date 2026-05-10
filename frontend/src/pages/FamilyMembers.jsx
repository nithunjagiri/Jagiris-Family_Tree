import { useState, useEffect, useMemo, useId } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { UserPlus, Pencil, Trash2, User, Search, LayoutGrid, List, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { familyMembersApi } from '../services/api';
import { cn } from '../lib/utils';
import { formatCalendarLong } from '../lib/calendarDate';
import { HIDE_RELATION_NAMES_IN_UI } from '../lib/appDisplaySettings';
import { resolveBackendPublicUrl } from '../lib/backendOrigin';
import { getApiErrorMessage } from '../lib/apiErrorMessage';

function displayName(m) {
  return [m.name, m.surname].filter(Boolean).join(' ') || m.name || '';
}

function MemberActions({ member, isAdmin, deletingId, onDelete }) {
  return (
    <div className="flex gap-2">
      <Link
        to={`/family-members/edit/${member.id}`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        <Pencil className="h-4 w-4" />
        Edit
      </Link>
      {isAdmin && (
        <button
          type="button"
          onClick={() => onDelete(member.id, member)}
          disabled={deletingId === member.id}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <Trash2 className="h-4 w-4" />
          {deletingId === member.id ? 'Deleting...' : 'Delete'}
        </button>
      )}
    </div>
  );
}

function MemberAvatar({ m, className, placeholderIconClassName = 'h-12 w-12' }) {
  return (
    <div
      className={cn(
        'shrink-0 overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800',
        className
      )}
    >
      {m.profile_photo ? (
        <img src={resolveBackendPublicUrl(m.profile_photo)} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-gray-400">
          <User className={placeholderIconClassName} />
        </div>
      )}
    </div>
  );
}

function MemberMeta({ m, members }) {
  const spouse =
    m.spouse_id != null && String(m.spouse_id).trim() !== ''
      ? members.find((s) => Number(s.id) === Number(m.spouse_id))
      : null;
  const spouseName = spouse ? displayName(spouse) : null;
  return (
    <>
      {!HIDE_RELATION_NAMES_IN_UI && m.relation ? (
        <p className="text-sm text-primary-600 dark:text-primary-400">{m.relation}</p>
      ) : null}
      {spouseName && (
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Spouse:{' '}
          <Link
            to={`/family-members/${spouse.id}`}
            className="font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            {spouseName}
          </Link>
        </p>
      )}
      {m.date_of_birth && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          DOB: {formatCalendarLong(m.date_of_birth)}
        </p>
      )}
      {m.phone && <p className="text-sm text-gray-600 dark:text-gray-300">{m.phone}</p>}
    </>
  );
}

export default function FamilyMembers() {
  const uid = useId().replace(/:/g, '');
  const searchPanelId = `family-members-search-panel-${uid}`;
  const searchInputId = `family-members-search-input-${uid}`;
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [saveFlash, setSaveFlash] = useState(null);

  const load = () =>
    familyMembersApi
      .list()
      .then((r) => setMembers(r.data || []))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const msg = location.state && location.state.memberSavedMessage;
    if (!msg || typeof msg !== 'string') return;
    setSaveFlash(msg);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, navigate]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const parts = [m.name, m.surname];
      if (!HIDE_RELATION_NAMES_IN_UI && m.relation) parts.push(m.relation);
      const hay = parts.filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [members, searchQuery]);

  const handleDelete = async (id, member) => {
    const name = displayName(member);
    if (!window.confirm(`Delete ${name}?`)) return;
    setDeletingId(id);
    try {
      await familyMembersApi.delete(id);
      setMembers((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      alert(getApiErrorMessage(err, 'Failed to delete'));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  const showNoSearchResults = members.length > 0 && filteredMembers.length === 0 && searchQuery.trim() !== '';

  return (
    <div className="space-y-6">
      {saveFlash && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
        >
          <p className="min-w-0 flex-1 pt-0.5">{saveFlash}</p>
          <button
            type="button"
            onClick={() => setSaveFlash(null)}
            className="shrink-0 rounded-lg p-1 text-emerald-800 hover:bg-emerald-100/80 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Family Members</h1>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen((o) => !o)}
              aria-expanded={searchOpen}
              aria-controls={searchPanelId}
              aria-label={searchOpen ? 'Hide search' : 'Show search'}
              className={cn(
                'inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700',
                searchOpen && 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-950'
              )}
            >
              <Search className="h-5 w-5" />
            </button>
            <div className="flex items-center rounded-lg border border-gray-300 p-0.5 dark:border-gray-600">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-pressed={viewMode === 'grid'}
                aria-label="Grid view"
                title="Grid view"
                className={cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors',
                  viewMode === 'grid'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
                aria-label="List view"
                title="List view"
                className={cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors',
                  viewMode === 'list'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <Link
              to="/family-members/add"
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-primary-700"
            >
              <UserPlus className="h-5 w-5" />
              Add Member
            </Link>
          </div>
        </div>
        {searchOpen && (
          <div id={searchPanelId} className="w-full sm:max-w-md sm:ml-auto">
            <label htmlFor={searchInputId} className="sr-only">
              Search family members
            </label>
            <input
              id={searchInputId}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={HIDE_RELATION_NAMES_IN_UI ? 'Search by name…' : 'Search by name or relation…'}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
              autoFocus
            />
          </div>
        )}
      </div>

      {viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredMembers.map((m) => (
            <div
              key={m.id}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-soft transition-shadow hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:shadow-soft-dark"
            >
              <div className="flex flex-col items-center text-center">
                <MemberAvatar m={m} className="mb-3 h-16 w-16" placeholderIconClassName="h-8 w-8" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{displayName(m)}</h3>
                <MemberMeta m={m} members={members} />
                <div className="mt-3">
                  <MemberActions member={m} isAdmin={isAdmin} deletingId={deletingId} onDelete={handleDelete} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filteredMembers.map((m) => (
            <li
              key={m.id}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-soft transition-shadow hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:shadow-soft-dark"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <MemberAvatar m={m} className="h-16 w-16 sm:h-20 sm:w-20" placeholderIconClassName="h-8 w-8 sm:h-10 sm:w-10" />
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{displayName(m)}</h3>
                  <MemberMeta m={m} members={members} />
                </div>
                <div className="flex justify-center sm:justify-end">
                  <MemberActions member={m} isAdmin={isAdmin} deletingId={deletingId} onDelete={handleDelete} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showNoSearchResults && (
        <p className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
          No members match your search.
        </p>
      )}

      {members.length === 0 && (
        <p className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
          No family members yet. Add one to get started.
        </p>
      )}
    </div>
  );
}
