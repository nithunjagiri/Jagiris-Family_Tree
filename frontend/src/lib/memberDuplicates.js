function norm(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase();
}

/**
 * Find other members with same name + surname + gender (case-insensitive name/surname/gender).
 * @param {Array<Record<string, unknown>>} members
 * @param {{ name: string; surname: string; gender: string }} fields
 * @param {number | undefined} excludeMemberId current member when editing
 * @param {string | undefined} formDateOfBirth YYYY-MM-DD from form — used only for optional hint
 * @returns {{ matches: Record<string, unknown>[]; dobDiffersFromForm: boolean }}
 */
export function findDuplicateMembers(members, fields, excludeMemberId, formDateOfBirth) {
  const n = norm(fields.name);
  const sn = norm(fields.surname);
  const g = norm(fields.gender);
  if (!n || !g) {
    return { matches: [], dobDiffersFromForm: false };
  }

  const matches = members.filter((m) => {
    const id = Number(m.id);
    if (excludeMemberId != null && id === excludeMemberId) return false;
    return norm(m.name) === n && norm(m.surname) === sn && norm(m.gender) === g;
  });

  let dobDiffersFromForm = false;
  const formDob = formDateOfBirth ? String(formDateOfBirth).slice(0, 10) : '';
  if (formDob && matches.length) {
    dobDiffersFromForm = matches.some((m) => {
      const md = m.date_of_birth ? String(m.date_of_birth).slice(0, 10) : '';
      return md && md !== formDob;
    });
  }

  return { matches, dobDiffersFromForm };
}
