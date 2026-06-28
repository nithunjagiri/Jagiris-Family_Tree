import Breadcrumb from './Breadcrumb';
import { cn } from '../lib/utils';

/**
 * Standard module header: Back button + Home breadcrumb + optional description and actions.
 * Back uses browser history unless `backTo` is set explicitly.
 */
export default function ModulePageHeader({
  label,
  backTo,
  description,
  descriptionClassName,
  actions,
  className,
  breadcrumbClassName,
  actionsClassName,
}) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="min-w-0">
        <Breadcrumb
          backTo={backTo}
          items={[{ label: 'Home', to: '/' }, { label }]}
          className={breadcrumbClassName}
        />
        {description ? (
          <p className={cn('mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400', descriptionClassName)}>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className={cn('flex flex-wrap items-center gap-2', actionsClassName)}>{actions}</div>
      ) : null}
    </div>
  );
}
