import Breadcrumb from './Breadcrumb';
import { cn } from '../lib/utils';

/**
 * Standard module header: Back button + Home breadcrumb + optional description and actions.
 */
export default function ModulePageHeader({
  label,
  backTo = '/',
  description,
  actions,
  className,
  breadcrumbClassName,
}) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}>
      <div className="min-w-0 flex-1">
        <Breadcrumb
          backTo={backTo}
          items={[{ label: 'Home', to: '/' }, { label }]}
          className={breadcrumbClassName}
        />
        {description ? (
          <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div> : null}
    </div>
  );
}
