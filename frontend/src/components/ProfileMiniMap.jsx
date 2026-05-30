import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
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

export default function ProfileMiniMap({ lat, lng, label }) {
  const navigate = useNavigate();

  const handleClick = () => {
    const params = new URLSearchParams({ lat, lng });
    if (label) params.set('name', label);
    navigate(`/places?${params.toString()}`);
  };

  return (
    <div
      onClick={handleClick}
      title={`View ${label || 'location'} on map`}
      className="group relative h-28 w-36 cursor-pointer overflow-hidden rounded-xl border border-gray-200 shadow-sm transition-shadow hover:shadow-md sm:h-32 sm:w-40 dark:border-gray-700"
    >
      <div className="leaflet-map-wrap h-full w-full pointer-events-none">
        <MapContainer
          center={[lat, lng]}
          zoom={10}
          className="h-full w-full"
          zoomControl={false}
          attributionControl={false}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          touchZoom={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[lat, lng]} />
        </MapContainer>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-4">
        <p className="truncate text-[10px] font-medium text-white">{label || 'Birth place'}</p>
      </div>
      <div className="absolute inset-0 rounded-xl ring-2 ring-transparent transition-all group-hover:ring-primary-500/50" />
    </div>
  );
}
