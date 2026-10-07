import { useMemo } from 'react';
import { StatusBadge, PriorityBadge } from '@/components/Badges';
import { EmptyState } from '@/components/Feedback';
import { PRIORITY_ORDER, formatTime, isToday } from '@/lib/constants';
import type { Intervention } from '@/lib/types';
import { MapPin, Cable, Clock, ChevronRight, ClipboardList } from 'lucide-react';

export function TechInterventionsList({
  interventions,
  onSelect,
}: {
  interventions: Intervention[];
  onSelect: (id: string) => void;
}) {
  const sorted = useMemo(() => {
    return [...interventions].sort((a, b) => {
      const aDone = a.status === 'completed' || a.status === 'failed';
      const bDone = b.status === 'completed' || b.status === 'failed';
      if (aDone !== bDone) return aDone ? 1 : -1;
      return (
        PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      );
    });
  }, [interventions]);

  const todayCount = interventions.filter((i) => isToday(i.scheduled_at)).length;
  const pendingCount = interventions.filter(
    (i) => i.status !== 'completed' && i.status !== 'failed'
  ).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="card p-4 sm:p-5">
          <div className="text-2xl sm:text-3xl font-bold text-white">{todayCount}</div>
          <div className="text-xs text-slate-500 mt-1">Aujourd'hui</div>
        </div>
        <div className="card p-4 sm:p-5">
          <div className="text-2xl sm:text-3xl font-bold text-sky-400">{pendingCount}</div>
          <div className="text-xs text-slate-500 mt-1">En attente</div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={24} className="text-slate-500" />}
          title="Aucune intervention"
          description="Vous n'avez pas d'intervention assignée pour le moment."
        />
      ) : (
        <div className="space-y-2.5">
          {sorted.map((i) => {
            const done = i.status === 'completed' || i.status === 'failed';
            return (
              <button
                key={i.id}
                onClick={() => onSelect(i.id)}
                className={`w-full text-left card p-4 card-hover ${done ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">{i.client_name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <MapPin size={11} className="shrink-0" />
                      <span className="truncate">{i.client_address}</span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-600 shrink-0 mt-0.5" />
                </div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <PriorityBadge priority={i.priority} />
                  <StatusBadge status={i.status} size="sm" />
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Cable size={11} />
                    <span className="font-mono">{i.fibre_socket}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {formatTime(i.scheduled_at)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
