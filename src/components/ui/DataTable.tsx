import type { ReactNode } from 'react';
import { FiInbox } from 'react-icons/fi';
import { cn } from '@/utils/format';
import { EmptyState, ErrorState, LoadingState } from './Feedback';

export type TableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'center' | 'right';
  hideBelow?: 'sm' | 'md' | 'lg';
};

const hideClasses = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
};

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  loading,
  error,
  onRetry,
  emptyTitle,
  emptyDescription,
  emptyAction,
  onRowClick,
  footer,
}: {
  columns: TableColumn<T>[];
  rows: T[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRowClick?: (row: T) => void;
  footer?: ReactNode;
}) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (rows.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
        icon={<FiInbox className="h-6 w-6" />}
      />
    );
  }

  const isActionColumn = (column: TableColumn<T>) =>
    !column.header || /action/i.test(column.header);

  return (
    <>
      <div className="divide-y divide-stroke xl:hidden dark:divide-white/5">
        {rows.map((row) => {
          const visibleColumns = columns.filter((column) => !column.hideBelow);
          const dataColumns = visibleColumns.filter((column) => !isActionColumn(column));
          const actionColumns = visibleColumns.filter(isActionColumn);

          return (
            <div
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'px-4 py-3.5 transition-colors',
                onRowClick && 'cursor-pointer active:bg-primary/[0.06] dark:active:bg-white/[0.03]',
              )}
            >
              <dl className="space-y-2.5">
                {dataColumns.map((column) => (
                  <div key={column.key} className="flex items-start justify-between gap-4">
                    <dt className="shrink-0 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-body dark:text-body-dark">
                      {column.header}
                    </dt>
                    <dd
                      className={cn(
                        'min-w-0 break-words text-right text-sm text-dark dark:text-body-dark',
                        column.className,
                      )}
                    >
                      {column.render(row)}
                    </dd>
                  </div>
                ))}
              </dl>
              {actionColumns.length > 0 && (
                <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-stroke/70 pt-3 dark:border-white/5">
                  {actionColumns.map((column) => (
                    <div key={column.key}>{column.render(row)}</div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {footer && <div className="px-4 py-3">{footer}</div>}
      </div>

      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-stroke dark:border-white/10">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-body dark:text-body-dark',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.hideBelow && hideClasses[column.hideBelow],
                    column.headerClassName,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-stroke/70 transition-colors last:border-0 dark:border-white/5',
                  onRowClick && 'cursor-pointer hover:bg-primary/[0.04] dark:hover:bg-white/[0.03]',
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-4 py-3 align-middle text-dark dark:text-body-dark',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right',
                      column.hideBelow && hideClasses[column.hideBelow],
                      column.className,
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer && (
            <tfoot>
              <tr>
                <td colSpan={columns.length} className="px-4 py-3">
                  {footer}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  );
}
