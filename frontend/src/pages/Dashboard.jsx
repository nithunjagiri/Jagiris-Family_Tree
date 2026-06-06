import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Image,
  Calendar,
  Cake,
  Activity,
  PieChart as PieChartIcon,
  BarChart3,
  X,
  Droplets,
  Phone,
  MessageCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { familyMembersApi, photosApi, eventsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { HIDE_RELATION_NAMES_IN_UI } from '../lib/appDisplaySettings';
import { resolveBackendPublicUrl } from '../lib/backendOrigin';
import {
  birthsByDecade,
  deathsByYear,
  genderSlices,
  isDeceased,
  livingCounts,
  upcomingBirthdays,
  birthsByYearRecent,
  bloodGroupBreakdown,
  yearFromDate,
} from '../lib/dashboardAnalytics';
import { eventCalendarParts, parseCalendarYmd } from '../lib/calendarDate';

const GENDER_COLORS = {
  male: '#2563eb',
  female: '#db2777',
  other: '#7c3aed',
  unknown: '#94a3b8',
};

const LIVING_COLOR_MAP = { Living: '#059669', Deceased: '#64748b' };

function useChartTheme() {
  const [dark, setDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setDark(el.classList.contains('dark')));
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return useMemo(
    () => ({
      dark,
      tick: dark ? '#94a3b8' : '#64748b',
      grid: dark ? '#334155' : '#e2e8f0',
      tooltipBg: dark ? '#1e293b' : '#ffffff',
      tooltipBorder: dark ? '#475569' : '#e2e8f0',
      tooltipLabel: dark ? '#f8fafc' : '#0f172a',
      tooltipItem: dark ? '#e2e8f0' : '#334155',
    }),
    [dark]
  );
}

function ChartCard({ id, title, subtitle, icon: Icon, children, className }) {
  return (
    <div
      id={id}
      className={cn(
        'flex flex-col rounded-2xl border border-gray-200/80 bg-white shadow-soft dark:border-gray-800 dark:bg-gray-900 dark:shadow-soft-dark',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            {Icon && (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-400">
                <Icon className="h-4 w-4" />
              </span>
            )}
            <h2 className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">{title}</h2>
          </div>
          {subtitle && <p className="mt-1.5 pl-10 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
      </div>
      <div className="min-h-0 flex-1 px-2 pb-2 pt-4">{children}</div>
    </div>
  );
}

function StatTile({ label, value, hint, to, onClick, icon: Icon, accent }) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-gray-900 dark:text-white">
            {value}
          </p>
          {hint && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
        </div>
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
            accent || 'bg-primary-100 text-primary-600 dark:bg-primary-950/60 dark:text-primary-400'
          )}
        >
          {Icon && <Icon className="h-6 w-6" />}
        </div>
      </div>
    </>
  );
  const tileClass = 'group cursor-pointer rounded-2xl border border-gray-200/80 bg-white p-5 shadow-soft transition-all hover:border-primary-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary-900';
  if (to) {
    return (
      <Link to={to} className={tileClass}>
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(tileClass, 'w-full text-left')}>
        {inner}
      </button>
    );
  }
  return (
    <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900">
      {inner}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [recentPhotos, setRecentPhotos] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const chart = useChartTheme();
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [membersRes, photosRes, eventsRes] = await Promise.all([
          familyMembersApi.list(),
          photosApi.list(),
          eventsApi.list(true),
        ]);
        if (!cancelled) {
          setMembers(membersRes.data || []);
          setRecentPhotos((photosRes.data || []).slice(0, 6));
          setUpcomingEvents((eventsRes.data || []).slice(0, 6));
        }
      } catch (_) {
        if (!cancelled) {
          setMembers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const membersCount = members.length;
  const { living, deceased } = useMemo(() => livingCounts(members), [members]);
  const decadeData = useMemo(() => birthsByDecade(members), [members]);
  const deathYearData = useMemo(() => deathsByYear(members), [members]);
  const genderData = useMemo(() => genderSlices(members), [members]);
  const yearRecentData = useMemo(() => birthsByYearRecent(members, 28), [members]);
  const birthdaysSoon = useMemo(() => upcomingBirthdays(members, 60), [members]);
  const bloodGroupStats = useMemo(() => bloodGroupBreakdown(members), [members]);
  const selectedBloodGroupMembers = selectedBloodGroup
    ? (bloodGroupStats.membersByGroup[selectedBloodGroup] || []).filter((m) => !isDeceased(m))
    : [];

  const livingPieData = useMemo(
    () => [
      { name: 'Living', value: living },
      { name: 'Deceased', value: deceased },
    ].filter((d) => d.value > 0),
    [living, deceased]
  );

  const upcomingTimeline = useMemo(() => {
    const birthdayItems = birthdaysSoon.map(({ member, nextYmd }) => {
      const name = [member.name, member.surname].filter(Boolean).join(' ') || 'Member';
      return {
        key: `b-${member.id}-${nextYmd}`,
        type: 'birthday',
        dateYmd: nextYmd,
        title: name,
        subtitle: 'Birthday',
        description: null,
        to: `/family-members/${member.id}`,
      };
    });

    const eventItems = (upcomingEvents || [])
      .map((e) => {
        const p = parseCalendarYmd(e.event_date);
        if (!p) return null;
        return {
          key: `e-${e.id}`,
          type: 'event',
          dateYmd: p.ymd,
          title: e.title || 'Event',
          subtitle: 'Event',
          description: e.description || null,
          to: '/events',
        };
      })
      .filter(Boolean);

    return [...birthdayItems, ...eventItems]
      .sort((a, b) => a.dateYmd.localeCompare(b.dateYmd) || a.title.localeCompare(b.title))
      .slice(0, 12);
  }, [birthdaysSoon, upcomingEvents]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  const tooltipStyle = {
    backgroundColor: chart.tooltipBg,
    border: `1px solid ${chart.tooltipBorder}`,
    borderRadius: 10,
    fontSize: 12,
    color: chart.tooltipItem,
    boxShadow: chart.dark
      ? '0 4px 20px rgba(0,0,0,0.5)'
      : '0 4px 12px rgba(0,0,0,0.08)',
  };

  const welcomeName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'there';

  return (
    <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-8 pb-6">
      <div className="rounded-2xl border border-gray-200/80 bg-white px-5 py-4 shadow-soft dark:border-gray-800 dark:bg-gray-900 dark:shadow-soft-dark">
        <p className="text-lg font-semibold text-gray-900 dark:text-white">
          Welcome, {welcomeName}
        </p>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {"Here's what's happening with your family today."}
        </p>
      </div>

      {/* KPI row */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile
          label="Family members"
          value={membersCount}
          hint="People in your tree"
          to="/family-members"
          icon={Users}
        />
        <StatTile
          label="Living"
          value={living}
          hint="With current records"
          to="/family-members?status=living"
          icon={Activity}
          accent="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
        />
        <StatTile
          label="Deceased"
          value={deceased}
          hint="Recorded as not alive"
          to="/family-members?status=deceased"
          icon={Activity}
          accent="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        />
        <StatTile
          label="Birthdays (60 days)"
          value={birthdaysSoon.length}
          hint="Upcoming celebrations"
          onClick={() => document.getElementById('upcoming-events')?.scrollIntoView({ behavior: 'smooth' })}
          icon={Cake}
          accent="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
        />
        <StatTile
          label="Members with blood group"
          value={bloodGroupStats.totalWithBloodGroup}
          hint={`${Math.max(0, membersCount - bloodGroupStats.totalWithBloodGroup)} pending blood group`}
          onClick={() => document.getElementById('blood-groups-section')?.scrollIntoView({ behavior: 'smooth' })}
          icon={Droplets}
          accent="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
        />
      </section>

      {/* Charts grid — fills width */}
      <section className="grid gap-6 xl:grid-cols-12">
        <ChartCard
          title="Births by decade"
          subtitle="From date of birth, grouped by ten-year span"
          icon={BarChart3}
          className="xl:col-span-5"
        >
          <div className="h-[300px] w-full sm:h-[320px]">
            {decadeData.length === 0 ? (
              <EmptyChart message="Add birth dates on family members to see this chart." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={decadeData} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: chart.tick, fontSize: 11 }} axisLine={{ stroke: chart.grid }} />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: chart.tick, fontSize: 11 }}
                    axisLine={{ stroke: chart.grid }}
                    width={36}
                  />
                  <Tooltip
                    cursor={{ fill: chart.dark ? 'rgb(51 65 85 / 0.35)' : 'rgb(241 245 249 / 0.9)' }}
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: chart.tooltipLabel, fontWeight: 600 }}
                    itemStyle={{ color: chart.tooltipItem }}
                  />
                  <Bar dataKey="count" name="Members" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard
          title="Birth years"
          subtitle="Years with births (most recent years shown)"
          icon={BarChart3}
          className="xl:col-span-4"
        >
          <div className="h-[300px] w-full sm:h-[320px]">
            {yearRecentData.length === 0 ? (
              <EmptyChart message="No birth years in the dataset yet." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearRecentData} margin={{ top: 8, right: 8, left: 4, bottom: 36 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                  <XAxis
                    dataKey="year"
                    tick={{ fill: chart.tick, fontSize: 10 }}
                    axisLine={{ stroke: chart.grid }}
                    angle={-35}
                    textAnchor="end"
                    height={48}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: chart.tick, fontSize: 11 }}
                    axisLine={{ stroke: chart.grid }}
                    width={32}
                  />
                  <Tooltip
                    cursor={{ fill: chart.dark ? 'rgb(51 65 85 / 0.35)' : 'rgb(241 245 249 / 0.9)' }}
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: chart.tooltipLabel, fontWeight: 600 }}
                    itemStyle={{ color: chart.tooltipItem }}
                  />
                  <Bar dataKey="count" name="Members" fill="#60a5fa" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard
          title="Living status"
          subtitle="Based on death date and alive flag"
          icon={PieChartIcon}
          className="xl:col-span-3"
        >
          <div className="h-[300px] w-full sm:h-[320px]">
            {livingPieData.length === 0 ? (
              <EmptyChart message="No members yet." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={livingPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={2}
                    strokeWidth={2}
                    stroke={chart.dark ? '#0f172a' : '#fff'}
                  >
                    {livingPieData.map((d) => (
                      <Cell key={d.name} fill={LIVING_COLOR_MAP[d.name] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: chart.tooltipLabel }}
                    itemStyle={{ color: chart.tooltipItem }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={(value) => <span className="text-gray-700 dark:text-gray-300">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard
          id="blood-groups-section"
          title="Blood groups"
          subtitle="Click a blood group or count to view members"
          icon={Droplets}
          className="xl:col-span-5"
        >
          <div className="h-[280px] w-full sm:h-[300px]">
            {bloodGroupStats.chartData.length === 0 ? (
              <EmptyChart message="Blood groups are not filled yet." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bloodGroupStats.chartData} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                  <XAxis dataKey="group" tick={{ fill: chart.tick, fontSize: 11 }} axisLine={{ stroke: chart.grid }} />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: chart.tick, fontSize: 11 }}
                    axisLine={{ stroke: chart.grid }}
                    width={32}
                  />
                  <Tooltip
                    cursor={{ fill: chart.dark ? 'rgb(51 65 85 / 0.35)' : 'rgb(241 245 249 / 0.9)' }}
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: chart.tooltipLabel, fontWeight: 600 }}
                    itemStyle={{ color: chart.tooltipItem }}
                    formatter={(v) => [`${v}`, 'Members']}
                  />
                  <Bar
                    dataKey="count"
                    name="Members"
                    fill="#e11d48"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={42}
                    onClick={(entry) => setSelectedBloodGroup(entry?.group || '')}
                    cursor="pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          {bloodGroupStats.chartData.length > 0 && (
            <div className="grid grid-cols-2 gap-2 px-3 pb-3 sm:grid-cols-4">
              {bloodGroupStats.chartData.map((item) => (
                <button
                  key={item.group}
                  type="button"
                  onClick={() => setSelectedBloodGroup(item.group)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm transition-colors hover:border-primary-300 hover:bg-primary-50/50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary-700 dark:hover:bg-gray-800"
                >
                  <div className="font-semibold text-gray-900 dark:text-white">{item.group}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{item.count} members</div>
                </button>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Deaths by year"
          subtitle="Where date of death is recorded"
          icon={BarChart3}
          className="xl:col-span-4"
        >
          <div className="h-[280px] w-full sm:h-[300px]">
            {deathYearData.length === 0 ? (
              <EmptyChart message="No death dates recorded yet." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deathYearData} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                  <XAxis
                    dataKey="year"
                    tick={{ fill: chart.tick, fontSize: 11 }}
                    axisLine={{ stroke: chart.grid }}
                    tickFormatter={(y) => String(y)}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: chart.tick, fontSize: 11 }}
                    axisLine={{ stroke: chart.grid }}
                    width={36}
                  />
                  <Tooltip
                    cursor={{ fill: chart.dark ? 'rgb(51 65 85 / 0.35)' : 'rgb(241 245 249 / 0.9)' }}
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: chart.tooltipLabel, fontWeight: 600 }}
                    itemStyle={{ color: chart.tooltipItem }}
                    formatter={(v) => [`${v}`, 'Members']}
                    labelFormatter={(y) => `Year ${y}`}
                  />
                  <Bar dataKey="count" name="Deaths" fill="#64748b" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Gender" subtitle="Distribution across the family" icon={PieChartIcon} className="xl:col-span-3">
          <div className="h-[280px] w-full sm:h-[300px]">
            {genderData.length === 0 ? (
              <EmptyChart message="No members to chart." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={1.5}
                    strokeWidth={2}
                    stroke={chart.dark ? '#0f172a' : '#fff'}
                  >
                    {genderData.map((entry) => (
                      <Cell key={entry.key} fill={GENDER_COLORS[entry.key] || GENDER_COLORS.unknown} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: chart.tooltipLabel }}
                    itemStyle={{ color: chart.tooltipItem }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={(value) => <span className="text-gray-700 dark:text-gray-300">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

      </section>

      {/* Photos + Events */}
      <section className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-gray-200/80 bg-white shadow-soft dark:border-gray-800 dark:bg-gray-900 dark:shadow-soft-dark lg:col-span-5">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-400">
                <Image className="h-4 w-4" />
              </span>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Recent photos</h2>
            </div>
            <Link
              to="/gallery"
              className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2 p-4 sm:grid-cols-3">
            {recentPhotos.length === 0 ? (
              <p className="col-span-full py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                No photos yet — add some in the gallery.
              </p>
            ) : (
              recentPhotos.map((p) => (
                <Link
                  key={p.id}
                  to="/gallery"
                  className="aspect-square overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200/80 transition-all hover:ring-2 hover:ring-primary-300 dark:bg-gray-800 dark:ring-gray-700"
                >
                  <img src={resolveBackendPublicUrl(p.image_path)} alt={p.title || ''} className="h-full w-full object-cover" />
                </Link>
              ))
            )}
          </div>
        </div>

        <div id="upcoming-events" className="rounded-2xl border border-gray-200/80 bg-white shadow-soft dark:border-gray-800 dark:bg-gray-900 dark:shadow-soft-dark lg:col-span-7">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-400">
                <Calendar className="h-4 w-4" />
              </span>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Upcoming events & birthdays</h2>
            </div>
            <Link
              to="/events"
              className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              View all
            </Link>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {upcomingTimeline.length === 0 ? (
              <li className="px-5 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                No upcoming events or birthdays (next 60 days)
              </li>
            ) : (
              upcomingTimeline.map((item) => {
                const evParts = eventCalendarParts(item.dateYmd);
                return (
                <li key={item.key} className="flex gap-4 px-5 py-4">
                  <div className="flex w-10 shrink-0 flex-col items-center border-r border-gray-100 pr-4 dark:border-gray-800">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
                      {evParts?.monthShort ?? '—'}
                    </span>
                    <span className="text-xl font-bold tabular-nums text-gray-900 dark:text-white">
                      {evParts?.day ?? '—'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.subtitle} {evParts ? `· ${evParts.weekdayLong}, ${evParts.year}` : ''}
                    </p>
                    {item.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">{item.description}</p>
                    )}
                  </div>
                  <Link
                    to={item.to}
                    className="shrink-0 self-center rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    View
                  </Link>
                </li>
                );
              })
            )}
          </ul>
        </div>
      </section>

      {selectedBloodGroup && (
        <BloodGroupMembersModal
          group={selectedBloodGroup}
          members={selectedBloodGroupMembers}
          onClose={() => setSelectedBloodGroup('')}
        />
      )}
    </div>
  );
}

function EmptyChart({ message }) {
  return (
    <div className="flex h-full min-h-[200px] items-center justify-center px-6">
      <p className="text-center text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}

function BloodGroupMembersModal({ group, members, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Close blood group members dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex max-h-[min(90vh,760px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-soft dark:border-gray-700 dark:bg-gray-900 dark:shadow-soft-dark"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Blood Group {group}
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {members.length} member{members.length === 1 ? '' : 's'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
          {members.length === 0 ? (
            <li className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              No members found for this blood group.
            </li>
          ) : (
            members.map((m) => {
              const fullName = [m.name, m.surname].filter(Boolean).join(' ') || 'Member';
              return (
                <li
                  key={m.id}
                  className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-800 dark:bg-gray-800/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{fullName}</p>
                      {!HIDE_RELATION_NAMES_IN_UI && m.relation ? (
                        <p className="text-sm text-primary-600 dark:text-primary-400">{m.relation}</p>
                      ) : null}
                      <div className="mt-1 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                        {m.phone && (
                          <p className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {m.phone}</p>
                        )}
                        {m.whatsapp_number && (
                          <p className="inline-flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> {m.whatsapp_number}</p>
                        )}
                      </div>
                    </div>
                    <Link
                      to={`/family-members/${m.id}`}
                      onClick={onClose}
                      className="shrink-0 rounded-lg border border-primary-200 px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-50 dark:border-primary-800 dark:text-primary-300 dark:hover:bg-primary-900/30"
                    >
                      View
                    </Link>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
