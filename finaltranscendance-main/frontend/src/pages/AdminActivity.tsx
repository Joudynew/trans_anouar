import { useMemo } from 'react';
import type { ActivityLog } from '@/lib/types';
import { PageHeader } from '@/components/AdminLayout';
import { Spinner, EmptyState } from '@/components/Feedback';
import { timeAgo } from '@/lib/constants';
import { Activity as ActivityIcon, Plus, ArrowRightCircle, CheckCircle2, XCircle } from 'lucide-react';

const ACTION_META: Record<string, { icon: typeof Plus; color: string; label: string }> = {
  created: { icon: Plus, color: 'text-sky-400 bg-sky-500/10', label: 'Création' },
  status_changed: { icon: ArrowRightCircle, color: 'text-amber-400 bg-amber-500/10', label: 'Changement de statut' },
  closed: { icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/10', label: 'Clôture' },
  failed: { icon: XCircle, color: 'text-rose-400 bg-rose-500/10', label: 'Échec' },
};

export function AdminActivity({ activities, loading }: { activities: ActivityLog[]; loading: boolean }) {
  const grouped = useMemo(() => {
    const map = new Map<string, ActivityLog[]>();
    for (const a of activities) {
      const date = new Date(a.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(a);
    }
    return Array.from(map.entries());
  }, [activities]);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Activité" subtitle="Flux temps réel des actions des techniciens" />
      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={24} /></div>
      ) : activities.length === 0 ? (
        <EmptyState icon={<ActivityIcon size={24} className="text-slate-500" />} title="Aucune activité" description="Les actions des techniciens apparaîtront ici." />
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, items]) => (
            <div key={date}>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-2 sticky top-0 bg-[#0a0a0c] py-1">{date}</div>
              <div className="space-y-2">
                {items.map((a) => {
                  const meta = ACTION_META[a.action] ?? ACTION_META.status_changed;
                  return (
                    <div key={a.id} className="card p-3.5 flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.color}`}>
                        <meta.icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-200">
                          <span className="font-medium">{a.technician?.full_name ?? 'Système'}</span>
                          {' — '}
                          <span className="text-slate-400">{meta.label}</span>
                        </div>
                        {a.detail && <div className="text-xs text-slate-500 mt-0.5">{a.detail}</div>}
                        {a.intervention && (
                          <div className="text-xs text-sky-400/70 mt-0.5 truncate">
                            {a.intervention.client_name} · {a.intervention.fibre_socket}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 shrink-0">{timeAgo(a.created_at)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
