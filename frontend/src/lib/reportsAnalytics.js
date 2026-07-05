import {
  Users,
  HeartPulse,
  Heart,
  User,
  Baby,
  GraduationCap,
  Briefcase,
  UserRound,
  Crown,
  HeartHandshake,
  UserX,
  Droplets,
  Building2,
} from 'lucide-react';
import { isDeceased, genderSlices, bloodGroupBreakdown } from './dashboardAnalytics';
import { parseCalendarYmd, todayYmdInTimeZone } from './calendarDate';

/** @param {Record<string, unknown>} m */
export function displayMemberName(m) {
  return [m.name, m.surname].filter(Boolean).join(' ') || String(m.name || '—');
}

/** @param {Record<string, unknown>} m @param {string} [todayYmd] */
export function getMemberAge(m, todayYmd = todayYmdInTimeZone('Asia/Kolkata')) {
  if (isDeceased(m)) return null;
  const birth = parseCalendarYmd(m.date_of_birth);
  if (!birth) return null;
  const today = parseCalendarYmd(todayYmd);
  if (!today) return null;
  let age = today.y - birth.y;
  const birthdayPassed = today.m > birth.m || (today.m === birth.m && today.d >= birth.d);
  if (!birthdayPassed) age -= 1;
  return age >= 0 ? age : null;
}

function isLiving(m) {
  return !isDeceased(m);
}

function isMale(m) {
  return String(m.gender || '').trim() === 'Male';
}

function isFemale(m) {
  return String(m.gender || '').trim() === 'Female';
}

function hasBloodGroup(m) {
  return String(m.blood_group || '').trim() !== '';
}

function hasOccupation(m) {
  return String(m.occupation || '').trim() !== '';
}

function ageInRange(m, min, max, todayYmd) {
  if (!isLiving(m)) return false;
  const age = getMemberAge(m, todayYmd);
  if (age == null) return false;
  if (min != null && age < min) return false;
  if (max != null && age > max) return false;
  return true;
}

/**
 * @typedef {{ min: number; max: number | null; label: string }} AgeChartBucket
 */

/** @param {number} start @param {number} end */
function fiveYearBucketsInRange(start, end) {
  /** @type {AgeChartBucket[]} */
  const buckets = [];
  for (let s = start; s <= end; s += 5) {
    const e = Math.min(s + 4, end);
    buckets.push({ min: s, max: e, label: `${s}–${e}` });
  }
  return buckets;
}

/** @param {number} start @param {number} end @param {string} openLabel */
function fiveYearBucketsWithOpenTail(start, end, openLabel) {
  return [...fiveYearBucketsInRange(start, end), { min: end + 1, max: null, label: openLabel }];
}

/** Living-member demographics: 5-year bands from birth through 80+, open tail at 81+. */
const DEFAULT_AGE_CHART_BUCKETS = fiveYearBucketsWithOpenTail(0, 80, '81+');

/** Under-18 report: four bands aligned to childhood / teen stages. */
const UNDER_18_AGE_CHART_BUCKETS = [
  { min: 0, max: 5, label: '0–5' },
  { min: 6, max: 10, label: '6–10' },
  { min: 11, max: 15, label: '11–15' },
  { min: 16, max: 17, label: '16–18' },
];

/** 18–30 report: early adulthood bands. */
const AGE_18_30_CHART_BUCKETS = [
  { min: 18, max: 20, label: '18–20' },
  { min: 21, max: 25, label: '21–25' },
  { min: 26, max: 30, label: '26–30' },
];

/** Married report: adult bands with a wide young-adult bucket and decennial bands above 30. */
const MARRIED_AGE_CHART_BUCKETS = [
  { min: 18, max: 30, label: '18–30' },
  { min: 31, max: 40, label: '31–40' },
  { min: 41, max: 50, label: '41–50' },
  { min: 51, max: 60, label: '51–60' },
  { min: 61, max: 70, label: '61–70' },
  { min: 71, max: 80, label: '71–80' },
  { min: 81, max: null, label: '80+' },
];

/** @param {string} slug @returns {AgeChartBucket[]} */
export function getAgeChartBuckets(slug) {
  switch (slug) {
    case 'age-under-18':
      return UNDER_18_AGE_CHART_BUCKETS;
    case 'age-18-30':
      return AGE_18_30_CHART_BUCKETS;
    case 'age-30-50':
      return fiveYearBucketsInRange(31, 50);
    case 'age-50-70':
      return fiveYearBucketsInRange(51, 70);
    case 'age-above-70':
      return fiveYearBucketsWithOpenTail(71, 85, '86+');
    case 'married':
      return MARRIED_AGE_CHART_BUCKETS;
    default:
      return DEFAULT_AGE_CHART_BUCKETS;
  }
}

/** @param {number} age @param {AgeChartBucket[]} buckets */
function bucketIndexForAge(age, buckets) {
  for (let i = 0; i < buckets.length; i += 1) {
    const bucket = buckets[i];
    if (age < bucket.min) return -1;
    if (bucket.max == null || age <= bucket.max) return i;
  }
  return -1;
}

/** @type {Record<string, { slug: string; title: string; section: string; filter: (m: Record<string, unknown>, todayYmd?: string) => boolean; icon: import('lucide-react').LucideIcon; accent: string; border: string; chartType?: string }>} */
export const REPORT_CONFIGS = {
  'total-members': {
    slug: 'total-members',
    title: 'Total Members',
    section: 'core',
    filter: () => true,
    icon: Users,
    accent: 'bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
    border: 'border-l-blue-500',
    chartType: 'demographics',
  },
  'living-members': {
    slug: 'living-members',
    title: 'Living Members',
    section: 'core',
    filter: isLiving,
    icon: HeartPulse,
    accent: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
    border: 'border-l-emerald-500',
    chartType: 'demographics',
  },
  'deceased-members': {
    slug: 'deceased-members',
    title: 'Deceased Members',
    section: 'core',
    filter: isDeceased,
    icon: Heart,
    accent: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    border: 'border-l-slate-500',
    chartType: 'demographics',
  },
  males: {
    slug: 'males',
    title: 'Males',
    section: 'core',
    filter: isMale,
    icon: User,
    accent: 'bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400',
    border: 'border-l-sky-500',
    chartType: 'demographics',
  },
  females: {
    slug: 'females',
    title: 'Females',
    section: 'core',
    filter: isFemale,
    icon: User,
    accent: 'bg-pink-100 text-pink-600 dark:bg-pink-950/50 dark:text-pink-400',
    border: 'border-l-pink-500',
    chartType: 'demographics',
  },
  'age-under-18': {
    slug: 'age-under-18',
    title: 'Under 18',
    section: 'age',
    filter: (m, todayYmd) => ageInRange(m, null, 17, todayYmd),
    icon: Baby,
    accent: 'bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400',
    border: 'border-l-violet-500',
    chartType: 'age',
  },
  'age-18-30': {
    slug: 'age-18-30',
    title: '18–30 Years',
    section: 'age',
    filter: (m, todayYmd) => ageInRange(m, 18, 30, todayYmd),
    icon: GraduationCap,
    accent: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400',
    border: 'border-l-indigo-500',
    chartType: 'age',
  },
  'age-30-50': {
    slug: 'age-30-50',
    title: '30–50 Years',
    section: 'age',
    filter: (m, todayYmd) => ageInRange(m, 31, 50, todayYmd),
    icon: Briefcase,
    accent: 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
    border: 'border-l-amber-500',
    chartType: 'age',
  },
  'age-50-70': {
    slug: 'age-50-70',
    title: '50–70 Years',
    section: 'age',
    filter: (m, todayYmd) => ageInRange(m, 51, 70, todayYmd),
    icon: UserRound,
    accent: 'bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400',
    border: 'border-l-orange-500',
    chartType: 'age',
  },
  'age-above-70': {
    slug: 'age-above-70',
    title: 'Above 70',
    section: 'age',
    filter: (m, todayYmd) => ageInRange(m, 71, null, todayYmd),
    icon: Crown,
    accent: 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400',
    border: 'border-l-rose-500',
    chartType: 'age',
  },
  married: {
    slug: 'married',
    title: 'Married',
    section: 'insights',
    filter: (m) => String(m.marital_status || '').trim().toLowerCase() === 'married',
    icon: HeartHandshake,
    accent: 'bg-teal-100 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400',
    border: 'border-l-teal-500',
    chartType: 'demographics',
  },
  unmarried: {
    slug: 'unmarried',
    title: 'Unmarried',
    section: 'insights',
    filter: (m) => String(m.marital_status || '').trim().toLowerCase() === 'single',
    icon: UserX,
    accent: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-400',
    border: 'border-l-cyan-500',
    chartType: 'demographics',
  },
  'by-blood-group': {
    slug: 'by-blood-group',
    title: 'Blood Group Recorded',
    section: 'insights',
    filter: hasBloodGroup,
    icon: Droplets,
    accent: 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400',
    border: 'border-l-red-500',
    chartType: 'bloodGroup',
  },
  'by-occupation': {
    slug: 'by-occupation',
    title: 'Occupation Recorded',
    section: 'insights',
    filter: hasOccupation,
    icon: Building2,
    accent: 'bg-lime-100 text-lime-700 dark:bg-lime-950/50 dark:text-lime-400',
    border: 'border-l-lime-500',
    chartType: 'occupation',
  },
};

export const REPORT_SECTIONS = [
  { id: 'core', label: 'Core demographics' },
  { id: 'age', label: 'Age groups (living members)' },
  { id: 'insights', label: 'Additional insights' },
];

/** @param {string} slug */
export function getReportConfig(slug) {
  return REPORT_CONFIGS[slug] || null;
}

/** @param {Array<Record<string, unknown>>} members */
export function buildReportSummaries(members) {
  const todayYmd = todayYmdInTimeZone('Asia/Kolkata');
  return Object.values(REPORT_CONFIGS).map((config) => ({
    ...config,
    count: members.filter((m) => config.filter(m, todayYmd)).length,
  }));
}

/** @param {Array<Record<string, unknown>>} members @param {string} slug */
export function filterMembersForReport(members, slug) {
  const config = getReportConfig(slug);
  if (!config) return [];
  const todayYmd = todayYmdInTimeZone('Asia/Kolkata');
  return members.filter((m) => config.filter(m, todayYmd));
}

/**
 * @param {Array<Record<string, unknown>>} members
 * @param {AgeChartBucket[]} [buckets]
 * @returns {{ label: string; count: number }[]}
 */
export function ageDistributionChart(members, buckets = DEFAULT_AGE_CHART_BUCKETS) {
  const todayYmd = todayYmdInTimeZone('Asia/Kolkata');
  const counts = buckets.map((bucket) => ({ label: bucket.label, count: 0 }));

  for (const m of members) {
    if (!isLiving(m)) continue;
    const age = getMemberAge(m, todayYmd);
    if (age == null) continue;
    const idx = bucketIndexForAge(age, buckets);
    if (idx >= 0) counts[idx].count += 1;
  }

  return counts.filter((b) => b.count > 0);
}

/**
 * @param {Array<Record<string, unknown>>} members
 * @param {number} [limit]
 */
export function occupationChart(members, limit = 12) {
  const counts = new Map();
  for (const m of members) {
    const occ = String(m.occupation || '').trim();
    if (!occ) continue;
    counts.set(occ, (counts.get(occ) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

export { genderSlices, bloodGroupBreakdown, isDeceased };

export const TABLE_COLUMNS = [
  { id: 'name', label: 'Name', getValue: (m) => displayMemberName(m) },
  { id: 'gender', label: 'Gender', getValue: (m) => m.gender || '—' },
  { id: 'date_of_birth', label: 'Date of birth', getValue: (m) => (m.date_of_birth ? String(m.date_of_birth).slice(0, 10) : '—') },
  {
    id: 'age',
    label: 'Age',
    getValue: (m) => {
      const age = getMemberAge(m);
      return age != null ? String(age) : '—';
    },
  },
  {
    id: 'status',
    label: 'Status',
    getValue: (m) => (isDeceased(m) ? 'Deceased' : 'Living'),
  },
  { id: 'phone', label: 'Phone', getValue: (m) => m.phone || m.whatsapp_number || '—' },
  { id: 'residence', label: 'Residence', getValue: (m) => m.residence_place_name || m.residence_place || '—' },
  { id: 'occupation', label: 'Occupation', getValue: (m) => m.occupation || '—' },
  { id: 'blood_group', label: 'Blood group', getValue: (m) => m.blood_group || '—' },
  { id: 'marital_status', label: 'Marital status', getValue: (m) => m.marital_status || '—' },
];

/** @param {string} slug */
export function defaultVisibleColumns(slug) {
  const config = getReportConfig(slug);
  const base = ['name', 'gender', 'date_of_birth', 'status', 'phone', 'residence'];
  if (config?.section === 'age') return [...base.slice(0, 3), 'age', ...base.slice(3)];
  if (config?.chartType === 'bloodGroup') return [...base, 'blood_group'];
  if (config?.chartType === 'occupation') return [...base, 'occupation'];
  return base;
}
