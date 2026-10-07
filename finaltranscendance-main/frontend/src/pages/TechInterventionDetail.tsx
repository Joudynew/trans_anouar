import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { listReportsByIntervention, addReport } from '@/lib/api';
import { logActivity } from '@/lib/api';
import { updateInterventionStatus } from '@/lib/api';
import { notifyDbChange } from '@/lib/realtime';
import { useToast } from '@/components/Toast';
import { Spinner } from '@/components/Feedback';
import { StatusBadge, PriorityBadge } from '@/components/Badges';
import { formatDateTime, timeAgo } from '@/lib/constants';
import type { Intervention, InterventionStatus, InterventionReport } from '@/lib/types';
import { MapPin, Cable, Clock, FileText, Send, CheckCircle2, XCircle, Truck, Wrench, Lock } from 'lucide-react';

const STATUS_ACTIONS: { value: InterventionStatus; label: string; icon: typeof Truck; color: string }[] = [
  { value: 'en_route', label: 'En route', icon: Truck, color: 'text-violet-300 border-violet-500/30 bg-violet-500/10' },
  { value: 'in_progress', label: 'Démarrer', icon: Wrench, color: 'text-sky-300 border-sky-500/30 bg-sky-500/10' },
  { value: 'completed', label: 'Terminer', icon: CheckCircle2, color: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' },
  { value: 'failed', label: 'Échec', icon: XCircle, color: 'text-rose-300 border-rose-500/30 bg-rose-500/10' },
];

export function TechInterventionDetail({
  intervention,
  onUpdated,
}: {
  intervention: Intervention;
  onUpdated: () => void;
}) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [reports, setReports] = useState<InterventionReport[]>([]);
  const [newReport, setNewReport] = useState('');
  const [loadingReports, setLoadingReports] = useState(true);

  // On utilise intervention.status directement – pas de state séparé

  useEffect(() => {
    // Charge les rapports existants de l'intervention depuis la BDD locale
    listReportsByIntervention(intervention.id).then((data) => {
      setReports(data as InterventionReport[]);
      setLoadingReports(false);
    });
  }, [intervention.id]);

  const updateStatus = async (newStatus: InterventionStatus) => {
    setSaving(true);
    try {
      // Met à jour le statut de l'intervention dans la BDD locale
      await updateInterventionStatus(intervention.id, newStatus);
      // Enregistre l'action dans le journal d'activité
      await logActivity(
        profile?.organization_id ?? '',
        intervention.id,
        user?.id ?? null,
        newStatus === 'completed' ? 'closed' : newStatus === 'failed' ? 'failed' : 'status_changed',
        `${user?.email} → ${STATUS_ACTIONS.find((s) => s.value === newStatus)?.label}`
      );
      // Notifie les autres onglets que la BDD a changé
      notifyDbChange();
      toast('Statut mis à jour.', 'success');
      onUpdated();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur.';
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddReport = async () => {
    if (!newReport.trim() || !user) return;
    try {
      // Ajoute un rapport immuable (append-only) à l'intervention
      await addReport(intervention.id, user.id, newReport.trim());
      // Notifie les autres onglets du changement
      notifyDbChange();
      setNewReport('');
      toast('Rapport ajouté.', 'success');
      // Recharge la liste des rapports depuis la BDD locale
      const data = await listReportsByIntervention(intervention.id);
      setReports(data as InterventionReport[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur.';
      toast(msg, 'error');
    }
  };

  const done = intervention.status === 'completed' || intervention.status === 'failed';

  return (
    <div className="space-y-4">
      <div className="card p-4 sm:p-5">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <PriorityBadge priority={intervention.priority} />
          <StatusBadge status={intervention.status} />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">{intervention.client_name}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div className="flex items-center gap-2 text-slate-400"><MapPin size={14} className="shrink-0 text-slate-500" /> {intervention.client_address}</div>
          <div className="flex items-center gap-2 text-slate-400"><Cable size={14} className="shrink-0 text-slate-500" /> <span className="font-mono">{intervention.fibre_socket}</span></div>
          <div className="flex items-center gap-2 text-slate-400"><Clock size={14} className="shrink-0 text-slate-500" /> {formatDateTime(intervention.scheduled_at)}</div>
        </div>
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <div className="text-xs text-slate-500 font-medium mb-1">Description</div>
          <p className="text-sm text-slate-300">{intervention.description}</p>
        </div>
      </div>

      {!done && (
        <div className="card p-4">
          <div className="text-xs text-slate-500 font-medium mb-2.5">Changer le statut</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STATUS_ACTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => updateStatus(s.value)}
                disabled={saving}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 ${s.color} hover:brightness-125`}
              >
                <s.icon size={16} />
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card p-4">
        <div className="text-xs text-slate-500 font-medium mb-1.5 flex items-center gap-1.5"><FileText size={14} /> Rapports d'intervention ({reports.length})</div>
        <div className="text-xs text-slate-600 mb-3 flex items-center gap-1"><Lock size={11} /> Une fois envoyé, un rapport ne peut plus être modifié. Ajoutez-en un autre en cas d'erreur.</div>
        {loadingReports ? (
          <div className="flex justify-center py-4"><Spinner size={20} /></div>
        ) : (
          <div className="space-y-2 mb-3">
            {reports.map((r) => (
              <div key={r.id} className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.04]">
                <div className="text-xs text-slate-500 mb-1">{timeAgo(r.created_at)}</div>
                <p className="text-sm text-slate-300">{r.content}</p>
              </div>
            ))}
            {reports.length === 0 && <div className="text-sm text-slate-500 py-2">Aucun rapport pour le moment.</div>}
          </div>
        )}
        <div className="flex gap-2">
          <input value={newReport} onChange={(e) => setNewReport(e.target.value)} className="input flex-1" placeholder="Ajouter un rapport…" onKeyDown={(e) => { if (e.key === 'Enter') handleAddReport(); }} />
          <button onClick={handleAddReport} disabled={!newReport.trim()} className="btn-primary px-3">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}