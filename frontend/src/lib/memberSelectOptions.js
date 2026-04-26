function baseLabel(m) {
  const parts = [m.name, m.surname].filter(Boolean);
  const joined = parts.join(' ').trim();
  if (joined) return joined;
  if (m.name) return String(m.name).trim();
  return `#${m.id}`;
}

function nameKey(m) {
  return baseLabel(m).toLowerCase().replace(/\s+/g, ' ').trim();
}

function birthYear(m) {
  if (!m.date_of_birth) return null;
  const y = parseInt(String(m.date_of_birth).slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

/**
 * Labels for Father/Mother/Spouse selects. When several members share the same display name,
 * append birth place when available; otherwise birth year or member id. If labels still
 * collide (e.g. same name and birthplace), append ` · #id`.
 * @param {Array<Record<string, unknown>>} members
 * @param {{ excludeId?: number | null }} [opts]
 * @returns {{ value: string; label: string }[]}
 */
export function buildMemberLinkOptions(members, opts = {}) {
  const rawEx = opts.excludeId;
  const excludeId =
    rawEx != null && rawEx !== '' && Number.isFinite(Number(rawEx)) ? Number(rawEx) : null;
  const list = Array.isArray(members) ? members : [];

  const counts = new Map();
  for (const m of list) {
    const k = nameKey(m);
    counts.set(k, (counts.get(k) || 0) + 1);
  }

  let out = list.map((m) => {
    const value = String(m.id);
    const k = nameKey(m);
    let label = baseLabel(m);
    if (counts.get(k) > 1) {
      const placeRaw =
        m.birth_place_name != null
          ? String(m.birth_place_name).trim()
          : m.birth_place != null
            ? String(m.birth_place).trim()
            : '';
      if (placeRaw) {
        label = `${label} (${placeRaw})`;
      } else {
        const y = birthYear(m);
        if (y != null) {
          label = `${label} (b. ${y})`;
        } else {
          label = `${label} (#${m.id})`;
        }
      }
    }
    return { value, label };
  });

  out = out.filter((o) => excludeId == null || Number(o.value) !== excludeId);

  const labelFreq = new Map();
  for (const o of out) {
    labelFreq.set(o.label, (labelFreq.get(o.label) || 0) + 1);
  }
  return out.map((o) =>
    labelFreq.get(o.label) > 1 ? { ...o, label: `${o.label} · #${o.value}` } : o
  );
}
