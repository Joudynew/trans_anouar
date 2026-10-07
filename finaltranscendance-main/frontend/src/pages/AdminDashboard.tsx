import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';
import type { Intervention, Profile } from '@/lib/types';
import { PageHeader, StatCard } from '@/components/AdminLayout';
import { StatusBadge, PriorityBadge } from '@/components/Badges';
import { isToday, formatDateTime } from '@/lib/constants';

export function AdminDashboard({
  interventions,
  technicians,
  onSelectIntervention,
}: {
  interventions: Intervention[];
  technicians: Profile[];
  onSelectIntervention: (i: Intervention) => void;
}) {
  const stats = useMemo(() => {
    const todayCount = interventions.filter((i) => isToday(i.scheduled_at)).length;
    const completed = interventions.filter((i) => i.status === 'completed').length;
    const failed = interventions.filter((i) => i.status === 'failed').length;
    const inProgress = interventions.filter((i) => i.status === 'in_progress').length;
    const enRoute = interventions.filter((i) => i.status === 'en_route').length;
    const upcoming = interventions
      .filter((i) => i.status !== 'completed' && i.status !== 'failed' && isToday(i.scheduled_at))
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
      .slice(0, 5);

    const last7Days: { label: string; interventions: number; completed: number }[] = [];
    for (let d = 6; d >= 0; d--) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      const dayIntervs = interventions.filter((i) => {
        const iDate = new Date(i.scheduled_at);
        return iDate.getDate() === date.getDate() && iDate.getMonth() === date.getMonth() && iDate.getFullYear() === date.getFullYear();
      });
      last7Days.push({
        label: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
        interventions: dayIntervs.length,
        completed: dayIntervs.filter((i) => i.status === 'completed').length,
      });
    }

    return { todayCount, completed, failed, inProgress, enRoute, upcoming, last7Days };
  }, [interventions]);

  const techRanking = useMemo(() => {
    return technicians
      .filter((t) => t.role === 'technician')
      .map((t) => {
        const techIntervs = interventions.filter((i) => i.technician_id === t.id);
        const completed = techIntervs.filter((i) => i.status === 'completed').length;
        const failed = techIntervs.filter((i) => i.status === 'failed').length;
        const total = techIntervs.length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { id: t.id, name: t.full_name, completed, failed, total, rate };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [interventions, technicians]);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Dashboard" subtitle="Vue d'ensemble des interventions et de l'activité" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard icon={Clock} label="Interventions du jour" value={stats.todayCount} accent="sky" sub={`${stats.inProgress} en cours · ${stats.enRoute} en route`} />
        <StatCard icon={CheckCircle2} label="Terminées" value={stats.completed} accent="emerald" sub="Toutes interventions confondues" />
        <StatCard icon={AlertTriangle} label="Urgences critiques" value={interventions.filter((i) => i.priority === 'critical' && i.status !== 'completed' && i.status !== 'failed').length} accent="rose" sub="Priorité critique en attente" />
        <StatCard icon={TrendingUp} label="Taux de réussite" value={`${stats.completed + stats.failed > 0 ? Math.round((stats.completed / (stats.completed + stats.failed)) * 100) : 0}%`} accent="amber" sub={`${stats.completed} réussies · ${stats.failed} échecs`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-white mb-1">Activité des 7 derniers jours</h3>
          <p className="text-xs text-slate-500 mb-4">Interventions planifiées et complétées</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats.last7Days}>
              <defs>
                <linearGradient id="gInterv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gDone" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#121214', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area type="monotone" dataKey="interventions" name="Planifiées" stroke="#38bdf8" strokeWidth={2} fill="url(#gInterv)" />
              <Area type="monotone" dataKey="completed" name="Terminées" stroke="#34d399" strokeWidth={2} fill="url(#gDone)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Classement techniciens</h3>
          <p className="text-xs text-slate-500 mb-4">Taux de réussite et volume d'interventions</p>
          {techRanking.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">Aucun technicien actif.</div>
          ) : (
            <div className="space-y-3">
              {techRanking.map((tech, idx) => (
                <div key={tech.id} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-200 truncate">{tech.name}</div>
                    <div className="text-xs text-slate-500">{tech.completed} réussies · {tech.failed} échecs · {tech.total} total</div>
                  </div>
                  <div className="text-sm font-bold text-sky-400 shrink-0">{tech.rate}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Interventions à venir aujourd'hui</h3>
        {stats.upcoming.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">Aucune intervention en attente pour aujourd'hui.</div>
        ) : (
          <div className="space-y-2">
            {stats.upcoming.map((i) => (
              <div
                key={i.id}
                onClick={() => onSelectIntervention(i)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.03] cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-200 truncate">{i.client_name}</span>
                    <PriorityBadge priority={i.priority} />
                  </div>
                  <div className="text-xs text-slate-500 truncate">{i.client_address}</div>
                </div>
                <StatusBadge status={i.status} size="sm" />
                <span className="text-xs text-slate-500 shrink-0 hidden sm:block">{formatDateTime(i.scheduled_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
