/**
 * ============================================================
 * PAGE TECHNICIEN : TABLEAU DE BORD
 * ============================================================
 *
 * Vue d'ensemble pour le technicien :
 * - Cartes de statistiques (aujourd'hui, en cours, terminées, urgentes)
 * - Graphique d'activité des 7 derniers jours
 * - Liste des interventions du jour et à venir
 * - Accès rapide au détail d'une intervention
 */

import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, CheckCircle2, AlertTriangle, Calendar, ChevronRight, MapPin, Cable, Wrench, TrendingUp } from 'lucide-react';
import { StatusBadge, PriorityBadge } from '@/components/Badges';
import { EmptyState } from '@/components/Feedback';
import { isToday, formatDateTime, formatTime } from '@/lib/constants';
import type { Intervention } from '@/lib/types';

export function TechDashboard({
  interventions,
  onSelect,
}: {
  interventions: Intervention[];
  onSelect: (id: string) => void;
}) {
  const stats = useMemo(() => {
    const today = interventions.filter((i) => isToday(i.scheduled_at));
    const completed = interventions.filter((i) => i.status === 'completed').length;
    const inProgress = interventions.filter((i) => i.status === 'in_progress' || i.status === 'en_route').length;
    const urgent = interventions.filter(
      (i) => i.priority === 'critical' && i.status !== 'completed' && i.status !== 'failed'
    ).length;

    // Graphique : 7 derniers jours
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

    // Interventions à venir (non terminées, triées par date)
    const upcoming = interventions
      .filter((i) => i.status !== 'completed' && i.status !== 'failed')
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
      .slice(0, 8);

    return { todayCount: today.length, completed, inProgress, urgent, last7Days, upcoming };
  }, [interventions]);

  return (
    <div className="animate-fade-in space-y-4 sm:space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-xl font-bold text-white">Tableau de bord</h1>
        <p className="text-sm text-slate-500 mt-0.5">Vue d'ensemble de vos interventions</p>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={Clock} label="Aujourd'hui" value={stats.todayCount} accent="sky" />
        <StatCard icon={Wrench} label="En cours" value={stats.inProgress} accent="amber" />
        <StatCard icon={CheckCircle2} label="Terminées" value={stats.completed} accent="emerald" />
        <StatCard icon={AlertTriangle} label="Urgentes" value={stats.urgent} accent="rose" />
      </div>

      {/* Graphique d'activité */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-1.5">
          <TrendingUp size={16} className="text-sky-400" />
          Activité des 7 derniers jours
        </h3>
        <p className="text-xs text-slate-500 mb-4">Interventions planifiées et complétées</p>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={stats.last7Days}>
            <defs>
              <linearGradient id="gTechInterv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gTechDone" x1="0" y1="0" x2="0" y2="1">
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
            <Area type="monotone" dataKey="interventions" name="Planifiées" stroke="#38bdf8" strokeWidth={2} fill="url(#gTechInterv)" />
            <Area type="monotone" dataKey="completed" name="Terminées" stroke="#34d399" strokeWidth={2} fill="url(#gTechDone)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Interventions à venir */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-1.5">
          <Calendar size={16} className="text-sky-400" />
          Interventions à venir
        </h3>
        {stats.upcoming.length === 0 ? (
          <EmptyState
            icon={<Calendar size={24} className="text-slate-500" />}
            title="Rien à venir"
            description="Aucune intervention en attente."
          />
        ) : (
          <div className="space-y-2">
            {stats.upcoming.map((i) => (
              <div
                key={i.id}
                onClick={() => onSelect(i.id)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.03] cursor-pointer transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-200 truncate">{i.client_name}</span>
                    <PriorityBadge priority={i.priority} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><MapPin size={11} className="shrink-0" /><span className="truncate">{i.client_address}</span></span>
                    <span className="flex items-center gap-1"><Cable size={11} className="shrink-0" /><span className="font-mono">{i.fibre_socket}</span></span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <StatusBadge status={i.status} size="sm" />
                  <div className="text-xs text-slate-500 mt-1">{formatTime(i.scheduled_at)}</div>
                </div>
                <ChevronRight size={16} className="text-slate-600 shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interventions récemment terminées */}
      {interventions.some((i) => i.status === 'completed' || i.status === 'failed') && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-1.5">
            <CheckCircle2 size={16} className="text-emerald-400" />
            Récemment terminées
          </h3>
          <div className="space-y-2">
            {interventions
              .filter((i) => i.status === 'completed' || i.status === 'failed')
              .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
              .slice(0, 5)
              .map((i) => (
                <div
                  key={i.id}
                  onClick={() => onSelect(i.id)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.03] cursor-pointer transition-colors opacity-70"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-slate-200 truncate">{i.client_name}</span>
                    <div className="text-xs text-slate-500 truncate">{formatDateTime(i.scheduled_at)}</div>
                  </div>
                  <StatusBadge status={i.status} size="sm" />
                  <ChevronRight size={16} className="text-slate-600 shrink-0" />
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Carte de statistique pour le dashboard technicien
function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Clock;
  label: string;
  value: number;
  accent: 'sky' | 'amber' | 'emerald' | 'rose';
}) {
  const colors = {
    sky: 'text-sky-400',
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
    rose: 'text-rose-400',
  };
  return (
    <div className="card p-4 sm:p-5">
      <Icon size={18} className={`${colors[accent]} mb-2`} />
      <div className="text-2xl sm:text-3xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}
