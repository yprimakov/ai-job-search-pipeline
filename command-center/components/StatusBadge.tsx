import { cn, statusBadgeClass } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        statusBadgeClass(status),
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold text-white whitespace-nowrap',
        className,
      )}
    >
      {status || 'Unknown'}
    </span>
  )
}
