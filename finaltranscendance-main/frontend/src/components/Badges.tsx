import type { Priority, InterventionStatus } from '@/lib/types';
import { PRIORITY_META, STATUS_META } from '@/lib/constants';

export function PriorityBadge({ priority }: { priority: Priority }) {
  const m = PRIORITY_META[priority];
  return (
    <span className={`chip border ${m.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

export function StatusBadge({ status, size = 'md' }: { status: InterventionStatus; size?: 'sm' | 'md' }) {
  const m = STATUS_META[status];
  return (
    <span className={`chip border ${m.color} ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : ''}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot} ${status === 'in_progress' ? 'animate-pulse' : ''}`} />
      {m.label}
    </span>
  );
}
