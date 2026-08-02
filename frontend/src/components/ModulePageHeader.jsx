import Breadcrumb from './Breadcrumb';
import { cn } from '../lib/utils';

/**
 * Standard module header: Back + breadcrumb (left) and actions (right) on one row;
 * optional description full width below.
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
  /** When true, actions render on a second row on mobile (avoids overlap with dense toolbars). */
  stackActionsOnMobile = false,
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        className={cn(
          'flex gap-3',
          stackActionsOnMobile
            ? 'flex-col sm:flex-row sm:items-start sm:justify-between'
            : 'items-start justify-between'
        )}
      >
        <div className="min-w-0 flex-1">
          <Breadcrumb
            backTo={backTo}
            items={[{ label: 'Home', to: '/' }, { label }]}
            className={breadcrumbClassName}
          />
        </div>
        {actions ? (
          <div
            className={cn(
              'flex flex-wrap items-center justify-end gap-2',
              stackActionsOnMobile
                ? 'w-full sm:ml-auto sm:w-auto sm:shrink-0'
                : 'ml-auto shrink-0',
              actionsClassName
            )}
          >
            {actions}
          </div>
        ) : null}
      </div>
      {description ? (
        <p className={cn('max-w-2xl text-sm text-gray-600 dark:text-gray-400', descriptionClassName)}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
