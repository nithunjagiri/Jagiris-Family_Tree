import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Link, useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import { MapPin, Plus, Trash2, X, Users, ChevronRight } from 'lucide-react';
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

export default function PlacesMap() {
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const highlightLat = searchParams.get('lat') ? Number(searchParams.get('lat')) : null;
  const highlightLng = searchParams.get('lng') ? Number(searchParams.get('lng')) : null;
  const highlightName = searchParams.get('name') || null;
  const [data, setData] = useState({ birthPlaces: [], pins: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [placeMembers, setPlaceMembers] = useState([]);
  const [placeMembersLoading, setPlaceMembersLoading] = useState(false);

  const load = () => {
    setLoading(true);
    placesApi
      .list()
      .then((r) => {
        setData({
          birthPlaces: r.data.birthPlaces || [],
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

  const handlePlaceClick = async (place) => {
    setSelectedPlace(place);
    setPlaceMembers([]);
    setPlaceMembersLoading(true);
    try {
      const res = await placesApi.membersByPlace(place);
      setPlaceMembers(res.data.members || []);
    } catch (err) {
      setPlaceMembers([]);
    } finally {
      setPlaceMembersLoading(false);
    }
  };

  const closePlaceModal = () => {
    setSelectedPlace(null);
    setPlaceMembers([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Places &amp; map</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
            Birth places from your family records appear as a summary list. Add named pins on the map for
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-soft dark:border-gray-800 lg:col-span-2">
          {loading ? (
            <div className="flex h-[420px] items-center justify-center bg-gray-100 dark:bg-gray-900">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            </div>
          ) : (
            <div className={cn('relative h-[420px] w-full md:h-[480px]', 'leaflet-map-wrap')}>
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

        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-soft dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <MapPin className="h-4 w-4" />
              Pins
            </h2>
            {(data.pins || []).length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No pins yet. Add one to see it here and on the map.</p>
            ) : (
              <ul className="space-y-2">
                {(data.pins || []).map((p) => (
                  <li
                    key={p.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {Number(p.latitude).toFixed(4)}, {Number(p.longitude).toFixed(4)}
                      </p>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        aria-label="Delete pin"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-soft dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Birth places (from members)
            </h2>
            {(data.birthPlaces || []).length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No birth places recorded yet.</p>
            ) : (
              <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
                {(data.birthPlaces || []).map((row) => (
                  <li
                    key={row.place}
                    onClick={() => handlePlaceClick(row.place)}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 transition-colors hover:bg-primary-50 dark:bg-gray-800/80 dark:hover:bg-primary-950/30"
                  >
                    <span className="font-medium text-gray-800 dark:text-gray-200">{row.place}</span>
                    <span className="flex items-center gap-1 shrink-0 text-gray-500 dark:text-gray-400">
                      {row.member_count} members
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Click a place to view its members. To geocode these automatically later, export data from Account &amp; privacy
              and use your preferred GIS workflow.
            </p>
          </div>
        </div>
      </div>

      {selectedPlace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closePlaceModal}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative z-10 w-full max-w-lg max-h-[80vh] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedPlace}</h2>
              </div>
              <button
                type="button"
                onClick={closePlaceModal}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(80vh - 72px)' }}>
              {placeMembersLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                </div>
              ) : placeMembers.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">No members found for this place.</p>
              ) : (
                <ul className="space-y-2">
                  {placeMembers.map((m) => (
                    <li key={m.id}>
                      <Link
                        to={`/family-members/${m.id}`}
                        onClick={closePlaceModal}
                        className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/60"
                      >
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
                          {m.profile_photo ? (
                            <img src={resolveBackendPublicUrl(m.profile_photo)} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-gray-400">
                              <Users className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-gray-900 dark:text-white">
                            {[m.name, m.surname].filter(Boolean).join(' ') || 'Unnamed'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {[m.gender, m.date_of_birth ? `DOB: ${String(m.date_of_birth).slice(0, 10)}` : null].filter(Boolean).join(' · ') || '—'}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
