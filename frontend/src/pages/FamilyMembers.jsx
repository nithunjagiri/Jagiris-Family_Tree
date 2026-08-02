import { useState, useEffect, useMemo, useId, useCallback } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus, Pencil, Trash2, User, Search, LayoutGrid, List, X, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { familyMembersApi } from '../services/api';
import { cn } from '../lib/utils';
import { formatCalendarLong } from '../lib/calendarDate';
import { HIDE_RELATION_NAMES_IN_UI } from '../lib/appDisplaySettings';
import { resolveBackendPublicUrl } from '../lib/backendOrigin';
import { getApiErrorMessage } from '../lib/apiErrorMessage';
import {
  filterMembers,
  getUniquePlaces,
  getUniqueSurnames,
  hasActiveMemberFilters,
} from '../lib/memberFilters';
import ModulePageHeader from '../components/ModulePageHeader';
import { useRestorePageState, useSavePageStateOnUnmount } from '../hooks/usePageStatePersistence';

function displayName(m) {
  return [m.name, m.surname].filter(Boolean).join(' ') || m.name || '';
}

function MemberActions({ member, isAdmin, deletingId, onDelete }) {
  return (
    <div className="flex gap-1.5 sm:gap-2">
      <Link
        to={`/family-members/edit/${member.id}`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:px-3 sm:py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span className="hidden sm:inline">Edit</span>
      </Link>
      {isAdmin && (
        <button
          type="button"
          onClick={() => onDelete(member.id, member)}
          disabled={deletingId === member.id}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 sm:px-3 sm:py-2 dark:border-red-900 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">{deletingId === member.id ? 'Deleting...' : 'Delete'}</span>
        </button>
      )}
    </div>
  );
}

function MemberAvatar({ m, className, placeholderIconClassName = 'h-12 w-12', onPhotoClick }) {
  const handleClick = (e) => {
    if (m.profile_photo && onPhotoClick) {
      e.stopPropagation();
      onPhotoClick(resolveBackendPublicUrl(m.profile_photo), displayName(m));
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'shrink-0 overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800',
        m.profile_photo && onPhotoClick && 'cursor-pointer ring-offset-2 transition-transform hover:scale-105 active:scale-95',
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
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status');
  const { isAdmin } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [surnameFilter, setSurnameFilter] = useState('');
  const [placeFilter, setPlaceFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [saveFlash, setSaveFlash] = useState(null);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  useEffect(() => {
    if (!lightboxPhoto) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') setLightboxPhoto(null);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [lightboxPhoto]);

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

  const applyRestoredPageState = useCallback(
    (restored) => {
      if (restored.surnameFilter != null) setSurnameFilter(String(restored.surnameFilter));
      if (restored.placeFilter != null) setPlaceFilter(String(restored.placeFilter));
      if (restored.genderFilter != null) setGenderFilter(String(restored.genderFilter));
      if (restored.searchQuery != null) setSearchQuery(String(restored.searchQuery));
      if (restored.viewMode === 'grid' || restored.viewMode === 'list') setViewMode(restored.viewMode);
      if (typeof restored.filtersOpen === 'boolean') setFiltersOpen(restored.filtersOpen);
      if (typeof restored.searchOpen === 'boolean') setSearchOpen(restored.searchOpen);
      if (restored.statusFilter) setSearchParams({ status: String(restored.statusFilter) });
    },
    [setSearchParams]
  );

  useRestorePageState(applyRestoredPageState);

  useSavePageStateOnUnmount('/family-members', {
    surnameFilter,
    placeFilter,
    genderFilter,
    searchQuery,
    viewMode,
    filtersOpen,
    searchOpen,
    statusFilter: statusFilter || '',
  });

  const filteredMembers = useMemo(
    () =>
      filterMembers(members, {
        surname: surnameFilter,
        place: placeFilter,
        gender: genderFilter,
        status: statusFilter || '',
        searchQuery,
      }),
    [members, searchQuery, statusFilter, surnameFilter, placeFilter, genderFilter]
  );

  const surnameOptions = useMemo(() => getUniqueSurnames(members), [members]);
  const placeOptions = useMemo(() => getUniquePlaces(members), [members]);

  const activeFilters = hasActiveMemberFilters({
    surname: surnameFilter,
    place: placeFilter,
    gender: genderFilter,
    status: statusFilter || '',
    searchQuery,
  });

  const clearAllFilters = () => {
    setSurnameFilter('');
    setPlaceFilter('');
    setGenderFilter('');
    setSearchQuery('');
    setSearchParams({});
  };

  const setStatusFilter = (value) => {
    if (!value) {
      setSearchParams({});
      return;
    }
    setSearchParams({ status: value });
  };

  const filterSelectClass =
    'mobile-input rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white';

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

  const showNoResults = members.length > 0 && filteredMembers.length === 0 && activeFilters;

  const pageLabel =
    statusFilter === 'living'
      ? 'Living Members'
      : statusFilter === 'deceased'
        ? 'Deceased Members'
        : 'Family Members';

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
        <ModulePageHeader
          label={pageLabel}
          stackActionsOnMobile
          actions={
            <>
              <button
                type="button"
                onClick={() => setFiltersOpen((o) => !o)}
                aria-expanded={filtersOpen}
                aria-label={filtersOpen ? 'Hide filters' : 'Show filters'}
                className={cn(
                  'inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700',
                  filtersOpen && 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-950',
                  activeFilters && 'border-primary-300 dark:border-primary-700'
                )}
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen((o) => !o)}
                aria-expanded={searchOpen}
                aria-controls={searchPanelId}
                aria-label={searchOpen ? 'Hide search' : 'Show search'}
                className={cn(
                  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700',
                  searchOpen && 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-950'
                )}
              >
                <Search className="h-5 w-5" />
              </button>
              <div className="flex shrink-0 items-center rounded-lg border border-gray-300 p-0.5 dark:border-gray-600">
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
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-primary-700"
              >
                <UserPlus className="h-5 w-5" />
                Add Member
              </Link>
            </>
          }
        />
        {filtersOpen && (
          <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor={`${uid}-filter-surname`} className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Surname
                </label>
                <select
                  id={`${uid}-filter-surname`}
                  value={surnameFilter}
                  onChange={(e) => setSurnameFilter(e.target.value)}
                  className={cn(filterSelectClass, 'w-full')}
                >
                  <option value="">All surnames</option>
                  {surnameOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`${uid}-filter-place`} className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Village / Place
                </label>
                <select
                  id={`${uid}-filter-place`}
                  value={placeFilter}
                  onChange={(e) => setPlaceFilter(e.target.value)}
                  className={cn(filterSelectClass, 'w-full')}
                >
                  <option value="">All places</option>
                  {placeOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Matches current or birth place</p>
              </div>
              <div>
                <label htmlFor={`${uid}-filter-gender`} className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Gender
                </label>
                <select
                  id={`${uid}-filter-gender`}
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className={cn(filterSelectClass, 'w-full')}
                >
                  <option value="">All genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor={`${uid}-filter-status`} className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Status
                </label>
                <select
                  id={`${uid}-filter-status`}
                  value={statusFilter || ''}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={cn(filterSelectClass, 'w-full')}
                >
                  <option value="">All members</option>
                  <option value="living">Living</option>
                  <option value="deceased">Deceased</option>
                </select>
              </div>
            </div>
            {activeFilters && (
              <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                {surnameFilter && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    Surname: {surnameFilter}
                  </span>
                )}
                {placeFilter && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    Place: {placeFilter}
                  </span>
                )}
                {genderFilter && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    Gender: {genderFilter}
                  </span>
                )}
                {statusFilter && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">
                    {statusFilter === 'living' ? 'Living' : 'Deceased'}
                  </span>
                )}
                {searchQuery.trim() && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    Search: {searchQuery.trim()}
                  </span>
                )}
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
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
              placeholder={HIDE_RELATION_NAMES_IN_UI ? 'Search by name, phone, or place…' : 'Search by name, relation, phone, or place…'}
              className="mobile-input w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
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
              onClick={() => navigate(`/family-members/${m.id}`)}
              className="cursor-pointer rounded-2xl border border-gray-200 bg-white p-4 shadow-soft transition-shadow hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:shadow-soft-dark"
            >
              <div className="flex flex-col items-center text-center">
                <MemberAvatar m={m} className="mb-3 h-16 w-16" placeholderIconClassName="h-8 w-8" onPhotoClick={(url, name) => setLightboxPhoto({ url, name })} />
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{displayName(m)}</h3>
                <MemberMeta m={m} members={members} />
                <div className="mt-3" onClick={(e) => e.stopPropagation()}>
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
              onClick={() => navigate(`/family-members/${m.id}`)}
              className="cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-soft transition-shadow hover:shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:shadow-soft-dark"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <MemberAvatar m={m} className="h-12 w-12 sm:h-14 sm:w-14" placeholderIconClassName="h-6 w-6 sm:h-7 sm:w-7" onPhotoClick={(url, name) => setLightboxPhoto({ url, name })} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white sm:text-base">{displayName(m)}</h3>
                  <MemberMeta m={m} members={members} />
                </div>
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  <MemberActions member={m} isAdmin={isAdmin} deletingId={deletingId} onDelete={handleDelete} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showNoResults && (
        <p className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
          No members match your filters.
        </p>
      )}

      {members.length === 0 && (
        <p className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
          No family members yet. Add one to get started.
        </p>
      )}

      {/* Profile photo lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxPhoto(null)}
            className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="flex flex-col items-center gap-4 px-6" onClick={(e) => e.stopPropagation()}>
            <div className="h-64 w-64 overflow-hidden rounded-full border-4 border-white/20 shadow-2xl sm:h-80 sm:w-80">
              <img
                src={lightboxPhoto.url}
                alt={lightboxPhoto.name}
                className="h-full w-full object-cover"
              />
            </div>
            {lightboxPhoto.name && (
              <p className="text-center text-lg font-medium text-white">{lightboxPhoto.name}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
