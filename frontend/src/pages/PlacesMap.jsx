import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Link, useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import { MapPin, Plus, Trash2, Users, ChevronRight, Home } from 'lucide-react';
import { placesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { getApiErrorMessage } from '../lib/apiErrorMessage';
import { resolveBackendPublicUrl } from '../lib/backendOrigin';

import 'leaflet/dist/leaflet.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function MapResize() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

function FlyToLocation({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) {
      setTimeout(() => map.flyTo([lat, lng], 13, { duration: 1.2 }), 400);
    }
  }, [map, lat, lng]);
  return null;
}

const selectClass =
  'mobile-input w-full appearance-none rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm ring-1 ring-gray-200 transition-shadow focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-900 dark:text-white dark:ring-gray-700';

function PlaceMembersList({ members, loading, emptyMessage, className }) {
  if (loading) {
    return (
      <div className={cn('flex justify-center py-8', className)}>
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }
  if (members.length === 0) {
    return (
      <p className={cn('py-6 text-center text-sm text-gray-500 dark:text-gray-400', className)}>{emptyMessage}</p>
    );
  }
  return (
    <ul className={cn('divide-y divide-gray-100 dark:divide-gray-800', className)}>
      {members.map((m) => (
        <li key={m.id}>
          <Link
            to={`/family-members/${m.id}`}
            className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
              {m.profile_photo ? (
                <img src={resolveBackendPublicUrl(m.profile_photo)} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-gray-400">
                  <Users className="h-4 w-4" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                {[m.name, m.surname].filter(Boolean).join(' ') || 'Unnamed'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {[m.gender, m.date_of_birth ? `DOB: ${String(m.date_of_birth).slice(0, 10)}` : null]
                  .filter(Boolean)
                  .join(' · ') || '—'}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function PlaceFilterPanel({
  icon: Icon,
  title,
  hint,
  selectId,
  value,
  onChange,
  options,
  emptyOptionsMessage,
  membersTitle,
  members,
  loading,
  emptyMembersMessage,
  accentClass,
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-900/60">
      <div className={cn('flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800', accentClass)}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/80 text-primary-600 shadow-sm dark:bg-gray-900/80 dark:text-primary-400">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <label htmlFor={selectId} className="sr-only">
          {title}
        </label>
        <select id={selectId} value={value} onChange={onChange} className={selectClass}>
          <option value="">Choose a place…</option>
          {options.map((row) => (
            <option key={row.place} value={row.place}>
              {row.place} ({row.member_count})
            </option>
          ))}
        </select>
        {options.length === 0 && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{emptyOptionsMessage}</p>
        )}
        {value ? (
          <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg ring-1 ring-gray-200 dark:ring-gray-700">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/50">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-300">{membersTitle}</p>
              {!loading && (
                <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary-700 dark:bg-primary-950/60 dark:text-primary-300">
                  {members.length}
                </span>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
              <PlaceMembersList members={members} loading={loading} emptyMessage={emptyMembersMessage} />
            </div>
          </div>
        ) : (
          <p className="mt-4 flex flex-1 items-center justify-center rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            Select a place above to view members
          </p>
        )}
      </div>
    </div>
  );
}

export default function PlacesMap() {
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const highlightLat = searchParams.get('lat') ? Number(searchParams.get('lat')) : null;
  const highlightLng = searchParams.get('lng') ? Number(searchParams.get('lng')) : null;
  const highlightName = searchParams.get('name') || null;
  const [data, setData] = useState({ birthPlaces: [], currentPlaces: [], pins: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [birthPlaceSelection, setBirthPlaceSelection] = useState('');
  const [currentPlaceSelection, setCurrentPlaceSelection] = useState('');
  const [birthMembers, setBirthMembers] = useState([]);
  const [currentMembers, setCurrentMembers] = useState([]);
  const [birthMembersLoading, setBirthMembersLoading] = useState(false);
  const [currentMembersLoading, setCurrentMembersLoading] = useState(false);

  const load = () => {
    setLoading(true);
    placesApi
      .list()
      .then((r) => {
        setData({
          birthPlaces: r.data.birthPlaces || [],
          currentPlaces: r.data.currentPlaces || [],
          pins: r.data.pins || [],
        });
        setError('');
      })
      .catch((err) => {
        setError(getApiErrorMessage(err, 'Could not load places.'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!birthPlaceSelection) {
      setBirthMembers([]);
      return;
    }
    let cancelled = false;
    setBirthMembersLoading(true);
    placesApi
      .membersByPlace(birthPlaceSelection, 'birth')
      .then((res) => {
        if (!cancelled) setBirthMembers(res.data.members || []);
      })
      .catch(() => {
        if (!cancelled) setBirthMembers([]);
      })
      .finally(() => {
        if (!cancelled) setBirthMembersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [birthPlaceSelection]);

  useEffect(() => {
    if (!currentPlaceSelection) {
      setCurrentMembers([]);
      return;
    }
    let cancelled = false;
    setCurrentMembersLoading(true);
    placesApi
      .membersByPlace(currentPlaceSelection, 'residence')
      .then((res) => {
        if (!cancelled) setCurrentMembers(res.data.members || []);
      })
      .catch(() => {
        if (!cancelled) setCurrentMembers([]);
      })
      .finally(() => {
        if (!cancelled) setCurrentMembersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentPlaceSelection]);

  const center = useMemo(() => {
    if (highlightLat != null && highlightLng != null) return [highlightLat, highlightLng];
    const pins = data.pins || [];
    if (pins.length === 0) return [20, 0];
    const lat = pins.reduce((s, p) => s + Number(p.latitude), 0) / pins.length;
    const lng = pins.reduce((s, p) => s + Number(p.longitude), 0) / pins.length;
    return [lat, lng];
  }, [data.pins, highlightLat, highlightLng]);

  const zoom = highlightLat != null ? 12 : (data.pins || []).length === 0 ? 2 : Math.min(12, 4 + Math.floor(data.pins.length / 2));

  const handleAddPin = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await placesApi.create({
        name,
        latitude: Number(latitude),
        longitude: Number(longitude),
        notes: notes || undefined,
      });
      setName('');
      setLatitude('');
      setLongitude('');
      setNotes('');
      setFormOpen(false);
      load();
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Could not save place.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this map pin?')) return;
    try {
      await placesApi.remove(id);
      load();
    } catch (err) {
      alert(getApiErrorMessage(err, 'Delete failed'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Places &amp; map</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
            Birth and current places from your family records appear below the map. Add named pins on the map for
            reunions, ancestral villages, or any location you want the family to remember together.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen((o) => !o)}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-primary-700"
        >
          <Plus className="h-5 w-5" />
          Add map pin
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          {error}
        </div>
      )}

      {formOpen && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">New map pin</h2>
          <form onSubmit={handleAddPin} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Label *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                required
                placeholder="e.g. Ancestral village"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Latitude *</label>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                required
                placeholder="12.9716"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Longitude *</label>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                required
                placeholder="77.5946"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              />
            </div>
            {formError && <p className="sm:col-span-2 text-sm text-red-600 dark:text-red-400">{formError}</p>}
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {submitting ? 'Saving…' : 'Save pin'}
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 font-medium dark:border-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-gray-200/80 shadow-soft dark:border-gray-800">
            {loading ? (
              <div className="flex h-[360px] items-center justify-center bg-gray-100 dark:bg-gray-900 md:h-[420px]">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
              </div>
            ) : (
              <div className={cn('relative h-[360px] w-full md:h-[420px]', 'leaflet-map-wrap')}>
                <MapContainer center={center} zoom={zoom} className="h-full w-full" scrollWheelZoom>
                  <MapResize />
                  {highlightLat != null && highlightLng != null && (
                    <FlyToLocation lat={highlightLat} lng={highlightLng} />
                  )}
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {highlightLat != null && highlightLng != null && (
                    <Marker position={[highlightLat, highlightLng]}>
                      <Popup>{highlightName || 'Selected location'}</Popup>
                    </Marker>
                  )}
                  {(data.pins || []).map((p) => (
                    <Marker key={p.id} position={[Number(p.latitude), Number(p.longitude)]}>
                      <Popup>
                        <strong>{p.name}</strong>
                        {p.notes ? <p className="mt-1 text-sm">{p.notes}</p> : null}
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            )}
          </div>

          <section className="flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-soft dark:border-gray-800 dark:bg-gray-900 dark:shadow-soft-dark">
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-400">
                  <Users className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Places from members</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Birth and current residence from family records
                  </p>
                </div>
              </div>
            </div>
            <div className="grid min-h-0 flex-1 gap-4 p-4 md:grid-cols-2 md:p-5">
              <PlaceFilterPanel
                icon={MapPin}
                title="Birth place"
                hint="Where members were born"
                selectId="birth-place-select"
                value={birthPlaceSelection}
                onChange={(e) => setBirthPlaceSelection(e.target.value)}
                options={data.birthPlaces || []}
                emptyOptionsMessage="No birth places recorded yet."
                membersTitle={`Born in ${birthPlaceSelection}`}
                members={birthMembers}
                loading={birthMembersLoading}
                emptyMembersMessage="No members found for this birth place."
                accentClass="bg-sky-50/80 dark:bg-sky-950/20"
              />
              <PlaceFilterPanel
                icon={Home}
                title="Current place"
                hint="Where members live now"
                selectId="current-place-select"
                value={currentPlaceSelection}
                onChange={(e) => setCurrentPlaceSelection(e.target.value)}
                options={data.currentPlaces || []}
                emptyOptionsMessage="No current places recorded yet."
                membersTitle={`Living in ${currentPlaceSelection}`}
                members={currentMembers}
                loading={currentMembersLoading}
                emptyMembersMessage="No members found for this current place."
                accentClass="bg-emerald-50/80 dark:bg-emerald-950/20"
              />
            </div>
          </section>
        </div>

        <aside className="flex min-h-[420px] flex-col lg:min-h-0">
          <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-soft dark:border-gray-800 dark:bg-gray-900 dark:shadow-soft-dark">
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                  <MapPin className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">Map pins</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Saved locations on the map</p>
                </div>
              </div>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {(data.pins || []).length}
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-3">
              {(data.pins || []).length === 0 ? (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center dark:border-gray-700">
                  <MapPin className="mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No pins yet</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Use &quot;Add map pin&quot; to mark reunions, villages, or landmarks.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {(data.pins || []).map((p) => (
                    <li
                      key={p.id}
                      className="flex items-start justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-3 transition-colors hover:bg-gray-100/80 dark:border-gray-800 dark:bg-gray-800/40 dark:hover:bg-gray-800/70"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                        <p className="mt-0.5 text-xs tabular-nums text-gray-500 dark:text-gray-400">
                          {Number(p.latitude).toFixed(4)}, {Number(p.longitude).toFixed(4)}
                        </p>
                      </div>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          className="shrink-0 rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                          aria-label={`Delete pin ${p.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
