import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  BarChart3,
  Table2,
  Download,
  Columns,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
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
import Breadcrumb from '../components/Breadcrumb';
import { familyMembersApi } from '../services/api';
import { cn } from '../lib/utils';
import { downloadCsvFile } from '../lib/downloadFile';
import {
  filterMembersForReport,
  getReportConfig,
  genderSlices,
  bloodGroupBreakdown,
  ageDistributionChart,
  occupationChart,
  TABLE_COLUMNS,
  defaultVisibleColumns,
  displayMemberName,
} from '../lib/reportsAnalytics';

const GENDER_COLORS = {
  male: '#2563eb',
  female: '#db2777',
  other: '#7c3aed',
  unknown: '#94a3b8',
};

const PAGE_SIZES = [25, 50, 100];

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
      tick: dark ? '#94a3b8' : '#64748b',
      grid: dark ? '#334155' : '#e2e8f0',
      tooltipBg: dark ? '#1e293b' : '#ffffff',
      tooltipBorder: dark ? '#475569' : '#e2e8f0',
    }),
    [dark]
  );
}

async function downloadCsv(rows, columns, filename) {
  const escape = (v) => {
    const s = String(v ?? '');
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = columns.map((c) => escape(c.label)).join(',');
  const body = rows.map((row) => columns.map((c) => escape(c.getValue(row))).join(',')).join('\n');
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' });
  const result = await downloadCsvFile(blob, filename);
  if (result?.savedTo) {
    alert(`Export saved to ${result.savedTo}:\n${filename}`);
  }
}

function EmptyChart() {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
      Not enough data for this chart.
    </div>
  );
}

function ReportCharts({ members, chartType, chartTheme }) {
  const genderData = useMemo(() => genderSlices(members), [members]);
  const ageData = useMemo(() => ageDistributionChart(members), [members]);
  const bloodData = useMemo(() => bloodGroupBreakdown(members).chartData.map((d) => ({ label: d.group, count: d.count })), [members]);
  const occData = useMemo(() => occupationChart(members), [members]);

  const tooltipStyle = {
    backgroundColor: chartTheme.tooltipBg,
    border: `1px solid ${chartTheme.tooltipBorder}`,
    borderRadius: 8,
    fontSize: 12,
  };

  if (chartType === 'bloodGroup') {
    if (bloodData.length === 0) return <EmptyChart />;
    return (
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bloodData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
            <XAxis dataKey="label" tick={{ fill: chartTheme.tick, fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fill: chartTheme.tick, fontSize: 12 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill="#dc2626" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chartType === 'occupation') {
    if (occData.length === 0) return <EmptyChart />;
    return (
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={occData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
            <XAxis type="number" allowDecimals={false} tick={{ fill: chartTheme.tick, fontSize: 12 }} />
            <YAxis type="category" dataKey="label" width={120} tick={{ fill: chartTheme.tick, fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill="#65a30d" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Gender distribution</h3>
        {genderData.length === 0 ? (
          <EmptyChart />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {genderData.map((entry) => (
                    <Cell key={entry.key} fill={GENDER_COLORS[entry.key] || GENDER_COLORS.unknown} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Age distribution (living)</h3>
        {ageData.length === 0 ? (
          <EmptyChart />
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis dataKey="label" tick={{ fill: chartTheme.tick, fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: chartTheme.tick, fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReportDetail() {
  const { slug } = useParams();
  const config = getReportConfig(slug || '');
  const chartTheme = useChartTheme();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('data');
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [visibleCols, setVisibleCols] = useState(() => defaultVisibleColumns(slug || ''));
  const [columnsOpen, setColumnsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    familyMembersApi
      .list()
      .then((res) => {
        if (!cancelled) setMembers(res.data || []);
      })
      .catch(() => {
        if (!cancelled) setMembers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (slug) setVisibleCols(defaultVisibleColumns(slug));
    setPage(0);
    setSortCol('name');
    setSortDir('asc');
    setTab('data');
  }, [slug]);

  const filtered = useMemo(() => {
    if (!slug) return [];
    return filterMembersForReport(members, slug);
  }, [members, slug]);

  const activeColumns = useMemo(
    () => TABLE_COLUMNS.filter((c) => visibleCols.includes(c.id)),
    [visibleCols]
  );

  const sorted = useMemo(() => {
    const col = TABLE_COLUMNS.find((c) => c.id === sortCol);
    if (!col) return filtered;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = col.getValue(a);
      const bv = col.getValue(b);
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir;
    });
  }, [filtered, sortCol, sortDir]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const rangeStart = total === 0 ? 0 : safePage * pageSize + 1;
  const rangeEnd = Math.min((safePage + 1) * pageSize, total);

  if (!config) return <Navigate to="/reports" replace />;

  const toggleSort = (colId) => {
    if (sortCol === colId) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortCol(colId);
      setSortDir('asc');
    }
  };

  const toggleColumn = (colId) => {
    setVisibleCols((prev) => {
      if (prev.includes(colId)) {
        if (prev.length <= 1) return prev;
        return prev.filter((id) => id !== colId);
      }
      return [...prev, colId];
    });
  };

  const handleExport = () => {
    const date = new Date().toISOString().slice(0, 10);
    void downloadCsv(sorted, activeColumns, `jagiris-report-${slug}-${date}.csv`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Breadcrumb
          backTo="/reports"
          items={[
            { label: 'Home', to: '/' },
            { label: 'Reports', to: '/reports' },
            { label: config.title },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setColumnsOpen((o) => !o)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <Columns className="h-4 w-4" />
              Columns
            </button>
            {columnsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setColumnsOpen(false)} aria-hidden />
                <div
                  className={cn(
                    'z-50 overflow-y-auto border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-900',
                    'max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[70vh] max-md:rounded-t-2xl max-md:border-b-0 max-md:pb-safe',
                    'md:absolute md:right-0 md:mt-2 md:w-52 md:rounded-xl'
                  )}
                >
                  {TABLE_COLUMNS.map((col) => (
                    <label
                      key={col.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <input
                        type="checkbox"
                        checked={visibleCols.includes(col.id)}
                        onChange={() => toggleColumn(col.id)}
                        className="rounded border-gray-300 text-primary-600"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={total === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 dark:hover:bg-primary-500"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-800 sm:gap-2">
        <button
          type="button"
          onClick={() => setTab('data')}
          className={cn(
            'inline-flex shrink-0 touch-manipulation items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors sm:px-4 sm:py-2.5',
            tab === 'data'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          )}
        >
          <Table2 className="h-4 w-4" />
          Data
        </button>
        <button
          type="button"
          onClick={() => setTab('charts')}
          className={cn(
            'inline-flex shrink-0 touch-manipulation items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors sm:px-4 sm:py-2.5',
            tab === 'charts'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          )}
        >
          <BarChart3 className="h-4 w-4" />
          Charts
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        </div>
      ) : tab === 'data' ? (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-soft dark:border-gray-800 dark:bg-gray-900 dark:shadow-soft-dark">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {total.toLocaleString()} record{total === 1 ? '' : 's'}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                Rows:
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(0);
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <span className="text-gray-600 dark:text-gray-400">
                {rangeStart}–{rangeEnd} of {total}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={safePage <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-primary-50/60 dark:border-gray-700 dark:bg-primary-950/30">
                <tr>
                  {activeColumns.map((col) => (
                    <th key={col.id} className="whitespace-nowrap px-4 py-3 font-semibold text-gray-700 dark:text-gray-200">
                      <button
                        type="button"
                        onClick={() => toggleSort(col.id)}
                        className="inline-flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400"
                      >
                        {col.label}
                        {sortCol === col.id &&
                          (sortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={activeColumns.length} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                      No records match this report.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50">
                      {activeColumns.map((col) => (
                        <td key={col.id} className="whitespace-nowrap px-4 py-2.5 text-gray-700 dark:text-gray-300">
                          {col.id === 'name' ? (
                            <Link
                              to={`/family-members/${row.id}`}
                              className="font-medium text-primary-600 hover:underline dark:text-primary-400"
                            >
                              {displayMemberName(row)}
                            </Link>
                          ) : (
                            col.getValue(row)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <ReportCharts members={filtered} chartType={config.chartType || 'demographics'} chartTheme={chartTheme} />
      )}
    </div>
  );
}
