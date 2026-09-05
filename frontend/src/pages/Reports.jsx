import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ModulePageHeader from '../components/ModulePageHeader';
import { familyMembersApi } from '../services/api';
import { cn } from '../lib/utils';
import { buildReportSummaries, REPORT_SECTIONS } from '../lib/reportsAnalytics';

function ReportCard({ slug, title, count, icon: Icon, accent, border }) {
  const countColor = border.replace('border-l-', 'text-');

  return (
    <Link
      to={`/reports/${slug}`}
      className={cn(
        'group touch-manipulation active:scale-[0.98] flex flex-col items-center rounded-xl border border-gray-200/80 border-l-4 bg-white px-4 py-6 text-center shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:shadow-soft-dark',
        border
      )}
    >
      <span className={cn('mb-3 flex h-12 w-12 items-center justify-center rounded-full', accent)}>
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className={cn('mt-2 text-3xl font-bold tabular-nums', countColor)}>{count.toLocaleString()}</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">total records</p>
    </Link>
  );
}

export default function Reports() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const summaries = useMemo(() => buildReportSummaries(members), [members]);

  const summariesBySection = useMemo(() => {
    const map = {};
    for (const section of REPORT_SECTIONS) {
      map[section.id] = summaries.filter((s) => s.section === section.id);
    }
    return map;
  }, [summaries]);

  return (
    <div className="space-y-6">
      <ModulePageHeader
        label="Reports"
      />

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-8">
          {REPORT_SECTIONS.map((section) => (
            <section key={section.id}>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {section.label}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {summariesBySection[section.id].map((report) => (
                  <ReportCard key={report.slug} {...report} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
