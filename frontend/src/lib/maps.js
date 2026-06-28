/** Open Google Maps directions to a coordinate (works on web and mobile browsers). */
export function buildGoogleMapsDirectionsUrl(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 'https://www.google.com/maps';
  const destination = `${lat},${lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

/** Merge member rows by id (birth + current place lookups). */
export function mergeMembersById(...memberLists) {
  const byId = new Map();
  for (const list of memberLists) {
    for (const member of list || []) {
      if (member?.id != null) byId.set(member.id, member);
    }
  }
  return Array.from(byId.values()).sort((a, b) => {
    const nameA = [a.name, a.surname].filter(Boolean).join(' ').toLowerCase();
    const nameB = [b.name, b.surname].filter(Boolean).join(' ').toLowerCase();
    return nameA.localeCompare(nameB);
  });
}
