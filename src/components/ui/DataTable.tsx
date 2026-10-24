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

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
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
  );
}
