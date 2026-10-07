import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { listActivityByOrg, getInterventionById } from '@/lib/api';
import { listReportsByIntervention, addReport, getSatisfaction } from '@/lib/api';
import { logActivity } from '@/lib/api';
import { updateInterventionStatus } from '@/lib/api';
import { notifyDbChange } from '@/lib/realtime';
import { useToast } from '@/components/Toast';
import { Modal } from '@/components/Modal';
import { Spinner } from '@/components/Feedback';
import { StatusBadge, PriorityBadge } from '@/components/Badges';
import { formatDateTime, timeAgo } from '@/lib/constants';
import type { Intervention, Profile, InterventionStatus, ActivityLog, InterventionReport, SatisfactionRating } from '@/lib/types';
import { MapPin, Cable, User, Clock, Star, Send, CheckCircle2, XCircle, Truck, Wrench, Lock, Copy, ExternalLink } from 'lucide-react';

const STATUS_TRANSITIONS: { value: InterventionStatus; label: string; icon: typeof Truck }[] = [
  { value: 'assigned', label: 'Assignée', icon: CheckCircle2 },
  { value: 'en_route', label: 'En route', icon: Truck },
  { value: 'in_progress', label: 'En cours', icon: Wrench },
  { value: 'completed', label: 'Terminée', icon: CheckCircle2 },
  { value: 'failed', label: 'Échec', icon: XCircle },
];

export function AdminInterventionDetail({
  intervention,
  technicians,
  onClose,
  onUpdated,
}: {
  intervention: Intervention;
  technicians: Profile[];
  onUpdated: () => void;
  onClose: () => void;
}) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<InterventionStatus>(intervention.status);
  const [saving, setSaving] = useState(false);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [reports, setReports] = useState<InterventionReport[]>([]);
  const [satisfaction, setSatisfaction] = useState<SatisfactionRating | null>(null);
  const [newReport, setNewReport] = useState('');
  const [tab, setTab] = useState<'info' | 'activity' | 'reports' | 'satisfaction'>('info');
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [freshIntervention, setFreshIntervention] = useState<Intervention | null>(null);

  const loadDetails = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoadingDetails(true);

    try {
      const fresh = await getInterventionById(intervention.id);
      setFreshIntervention(fresh as Intervention);

      const [actData, repData, satData] = await Promise.all([
        listActivityByOrg(profile.organization_id, 100),
        listReportsByIntervention(intervention.id),
        getSatisfaction(intervention.id),
      ]);
      setActivities(actData.filter((a) => a.intervention_id === intervention.id) as ActivityLog[]);
      setReports(repData as InterventionReport[]);
      setSatisfaction(satData as SatisfactionRating | null);
    } catch (err: unknown) {
      console.error('Erreur chargement détail intervention:', err);
      setFreshIntervention(null);
    } finally {
      setLoadingDetails(false);
    }
  }, [intervention.id, profile]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDetails();
  }, [loadDetails]);

  // Keeps the local draft status in sync if the intervention prop changes
  // underneath us (e.g. another user updates it while this modal is open).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus(intervention.status);
  }, [intervention]);

  const handleSave = async () => {
    if (!profile?.organization_id) { toast('Organisation introuvable.', 'error'); return; }
    setSaving(true);
    try {
      if (status === intervention.status) { toast('Aucune modification.', 'error'); setSaving(false); return; }

      await updateInterventionStatus(intervention.id, status);

      const techName = technicians.find((t) => t.id === intervention.technician_id)?.full_name ?? 'Système';
      await logActivity(
        profile.organization_id,
        intervention.id,
        intervention.technician_id,
        status === 'completed' ? 'closed' : status === 'failed' ? 'failed' : 'status_changed',
        `${techName} → ${STATUS_TRANSITIONS.find((s) => s.value === status)?.label}`
      );

      notifyDbChange();
      toast('Intervention mise à jour.', 'success');
      onUpdated();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur.';
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const displayedIntervention = freshIntervention ?? intervention;
  const techName = technicians.find((t) => t.id === displayedIntervention.technician_id)?.full_name ?? 'Non assigné';

  const handleAddReport = async () => {
    if (!newReport.trim()) return;
    try {
      await addReport(intervention.id, intervention.technician_id ?? '', newReport.trim());
      notifyDbChange();
      setNewReport('');
      toast('Rapport ajouté.', 'success');
      loadDetails();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur.';
      toast(msg, 'error');
    }
  };

  return (
    <Modal open onClose={onClose} title={intervention.client_name} description={`${intervention.fibre_socket} · ${techName}`} size="xl">
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <PriorityBadge priority={intervention.priority} />
        <StatusBadge status={status} />
      </div>

      <div className="flex gap-1 mb-4 border-b border-white/[0.06] overflow-x-auto">
        {([
          { id: 'info', label: 'Informations' },
          { id: 'activity', label: 'Activité' },
          { id: 'reports', label: 'Rapports' },
          { id: 'satisfaction', label: 'Satisfaction' },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id ? 'text-sky-300 border-sky-400' : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loadingDetails ? (
        <div className="flex justify-center py-12"><Spinner size={24} /></div>
      ) : (
        <>
          {tab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoRow icon={User} label="Client" value={intervention.client_name} />
                <InfoRow icon={MapPin} label="Adresse" value={intervention.client_address} />
                <InfoRow icon={Cable} label="Prise fibre" value={intervention.fibre_socket} mono />
                <InfoRow icon={Clock} label="Planifié le" value={formatDateTime(intervention.scheduled_at)} />
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium mb-1.5">Description</div>
                <div className="card p-3 text-sm text-slate-300">{intervention.description}</div>
              </div>
              <div>
                <div className="label flex items-center gap-1.5">Statut</div>
                <div className="grid grid-cols-5 gap-1.5">
                  {STATUS_TRANSITIONS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setStatus(s.value)}
                      className={`flex flex-col items-center gap-1 px-1 py-2 rounded-lg border text-[10px] font-medium transition-colors ${
                        status === s.value ? 'border-sky-500/40 bg-sky-500/10 text-sky-300' : 'border-white/[0.06] text-slate-500 hover:text-slate-300 hover:border-white/[0.12]'
                      }`}
                    >
                      <s.icon size={16} />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              {intervention.report && (
                <div>
                  <div className="label flex items-center gap-1.5"><Lock size={12} className="text-slate-500" /> Rapport d'origine</div>
                  <div className="card p-3 text-sm text-slate-400 italic">{intervention.report}</div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={onClose} className="btn-secondary">Annuler</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary">
                  {saving ? <Spinner size={16} /> : <CheckCircle2 size={16} />}
                  Enregistrer
                </button>
              </div>
            </div>
          )}

          {tab === 'activity' && (
            <div className="space-y-2">
              {activities.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">Aucune activité enregistrée.</div>
              ) : (
                activities.map((a) => (
                  <div key={a.id} className="card p-3 flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-200">{a.detail ?? a.action}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{a.technician?.full_name ?? 'Système'} · {timeAgo(a.created_at)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'reports' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <Lock size={12} /> Les rapports sont immuables. Ajoutez-en un nouveau en cas d'erreur.
              </div>
              {reports.length > 0 && (
                <div className="space-y-2">
                  {reports.map((r) => (
                    <div key={r.id} className="card p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-300">{r.technician?.full_name ?? 'Technicien'}</span>
                        <span className="text-[10px] text-slate-500">{timeAgo(r.created_at)}</span>
                      </div>
                      <p className="text-sm text-slate-400">{r.content}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input value={newReport} onChange={(e) => setNewReport(e.target.value)} className="input flex-1" placeholder="Nouveau rapport…" onKeyDown={(e) => { if (e.key === 'Enter') handleAddReport(); }} />
                <button onClick={handleAddReport} disabled={!newReport.trim()} className="btn-primary px-3">
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}

          {tab === 'satisfaction' && (
            <div className="space-y-3">
              {intervention.status === 'completed' && (
                <div className="card p-4">
                  <div className="text-sm font-medium text-slate-200 mb-1">
                    Lien de satisfaction client
                  </div>
                  <div className="text-xs text-slate-500 mb-3">
                    Envoyez ce lien au client pour qu'il puisse noter l'intervention.
                  </div>

                  {displayedIntervention.satisfaction_token ? (
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={`${window.location.origin}/satisfaction/${displayedIntervention.satisfaction_token}`}
                        className="input flex-1 text-xs"
                      />
                      <button
                        className="btn-secondary px-3"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/satisfaction/${displayedIntervention.satisfaction_token}`
                          );
                          toast('Lien copié.', 'success');
                        }}
                        title="Copier le lien"
                      >
                        <Copy size={16} />
                      </button>
                      <a
                        href={`${window.location.origin}/satisfaction/${displayedIntervention.satisfaction_token}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary px-3 flex items-center"
                        title="Ouvrir le lien"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">
                      Aucun lien de satisfaction disponible.
                    </div>
                  )}
                </div>
              )}

              {satisfaction ? (
                <div className="card p-5 text-center">
                  <div className="flex justify-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} size={24} className={n <= satisfaction.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'} />
                    ))}
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{satisfaction.rating}/5</div>
                  {satisfaction.comment && <p className="text-sm text-slate-400 italic">"{satisfaction.comment}"</p>}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-slate-500">Aucune évaluation de satisfaction pour cette intervention.</div>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

function InfoRow({ icon: Icon, label, value, mono }: { icon: typeof User; label: string; value: string; mono?: boolean }) {
  return (
    <div className="card p-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
        <Icon size={12} />
        {label}
      </div>
      <div className={`text-sm text-slate-200 ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}