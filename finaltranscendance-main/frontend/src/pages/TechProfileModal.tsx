import { Avatar } from "@/components/Avatar";
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  listReportsByIntervention,
  getTechnicianSatisfactionsFromApi,
  updateUser,
  deactivateUser,
} from '@/lib/api';
import { Modal } from '@/components/Modal';
import { Spinner, EmptyState } from '@/components/Feedback';
import { StatusBadge, PriorityBadge } from '@/components/Badges';
import { formatDate, timeAgo } from '@/lib/constants';
import type { Profile, Intervention, InterventionReportWithIntervention, SatisfactionRating } from '@/lib/types';
import { Phone, Wrench, Star, TrendingUp, ClipboardList, CheckCircle2, Activity as ActivityIcon, Calendar, FileText } from 'lucide-react';

type Tab = 'overview' | 'interventions' | 'satisfaction' | 'reports';

export function TechProfileModal({ technician, interventions, onClose }: { technician: Profile | null; interventions: Intervention[]; onClose: () => void; }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [reports, setReports] = useState<InterventionReportWithIntervention[]>([]);
  const [satisfaction, setSatisfaction] = useState<SatisfactionRating[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editForm, setEditForm] = useState({
    fullName: technician?.full_name ?? '',
    email: technician?.email ?? '',
    phone: technician?.phone ?? '',
  });

  const techIntervs = useMemo(
    () => interventions.filter((i) => i.technician_id === technician?.id),
    [interventions, technician?.id]
  );
  const completed = techIntervs.filter((i) => i.status === 'completed').length;
  const failed = techIntervs.filter((i) => i.status === 'failed').length;
  const inProgress = techIntervs.filter((i) => i.status === 'in_progress' || i.status === 'en_route').length;
  const assigned = techIntervs.filter((i) => i.status === 'assigned').length;
  const total = techIntervs.length;
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const loadDetails = useCallback(async () => {
    if (!technician) return;
    setLoadingDetails(true);
    const intervIds = interventions.filter((i) => i.technician_id === technician.id).map((i) => i.id);

    const reportResults = await Promise.all(intervIds.map((id) => listReportsByIntervention(id)));
    const allReports: InterventionReportWithIntervention[] = [];
    interventions.forEach((interv, idx) => {
      if (interv.technician_id !== technician.id) return;
      reportResults[idx].forEach((r: unknown) => {
        allReports.push({ ...(r as InterventionReportWithIntervention), intervention: interv });
      });
    });
    allReports.sort((a, b) => b.created_at.localeCompare(a.created_at));
    setReports(allReports.slice(0, 30));

    const technicianSats = await getTechnicianSatisfactionsFromApi(technician.id);
    setSatisfaction(technicianSats as SatisfactionRating[]);

    setLoadingDetails(false);
  }, [technician, interventions]);

  // On initialise le tab à 'overview' par défaut, pas besoin de le remettre dans un effet
  useEffect(() => {
    if (technician) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadDetails();
    }
  }, [technician, loadDetails]);

  if (!technician) return null;

  const handleSave = async () => {
    setSaving(true);

    try {
      await updateUser(technician.id, {
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || null,
      });

      setEditing(false);
      onClose();
      window.location.reload();
    } catch (err) {
      console.error('Erreur modification technicien:', err);
      alert(err instanceof Error ? err.message : 'Erreur modification du compte');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (
      !window.confirm(
        `Désactiver le compte de ${technician.full_name} ?`
      )
    ) {
      return;
    }

    setDeleting(true);

    try {
      await deactivateUser(technician.id);
      onClose();
      window.location.reload();
    } catch (err) {
      console.error('Erreur désactivation technicien:', err);
      alert(err instanceof Error ? err.message : 'Erreur désactivation du compte');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={technician.full_name} description={technician.role === 'admin' ? 'Administrateur' : 'Technicien'} size="lg">
  <div className="flex items-center gap-4 mb-4">
    <Avatar user={technician} size={48} />
    <div>
      <h2 className="text-xl font-bold text-white">{technician.full_name}</h2>
      <div className="flex items-center gap-2 flex-wrap mt-1">
        <span className={`chip border ${technician.status === 'active' ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' : 'text-slate-400 bg-slate-500/10 border-slate-500/20'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${technician.status === 'active' ? 'bg-emerald-400' : 'bg-slate-400'}`} />
          {technician.status === 'active' ? 'Actif' : 'Inactif'}
        </span>
        {technician.phone && (
          <span className="chip border text-slate-400 bg-white/[0.04] border-white/[0.06]">
            <Phone size={12} /> {technician.phone}
          </span>
        )}
        <span className="chip border text-slate-400 bg-white/[0.04] border-white/[0.06]">
          <Calendar size={12} /> Depuis {formatDate(technician.created_at)}
        </span>
      </div>
    </div>
  </div>
      {!editing ? (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => {
              setEditForm({
                fullName: technician.full_name,
                email: technician.email,
                phone: technician.phone ?? '',
              });
              setEditing(true);
            }}
            className="btn-secondary"
          >
            Modifier le compte
          </button>

          {technician.status === 'active' && (
            <button
              onClick={handleDeactivate}
              disabled={deleting}
              className="btn-secondary text-rose-400 border-rose-500/20 hover:bg-rose-500/10"
            >
              {deleting ? 'Désactivation...' : 'Désactiver le compte'}
            </button>
          )}
        </div>
      ) : (
        <div className="card p-4 mb-4 space-y-3">
          <div>
            <label className="label">Nom complet</label>
            <input
              className="input"
              value={editForm.fullName}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  fullName: e.target.value,
                })
              }
            />
          </div>

          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={editForm.email}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  email: e.target.value,
                })
              }
            />
          </div>

          <div>
            <label className="label">Téléphone</label>
            <input
              className="input"
              value={editForm.phone}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  phone: e.target.value,
                })
              }
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditing(false)}
              className="btn-secondary"
              disabled={saving}
            >
              Annuler
            </button>

            <button
              onClick={handleSave}
              className="btn-primary"
              disabled={saving}
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-1 mb-4 border-b border-white/[0.06] overflow-x-auto">
        {([
          { id: 'overview', label: 'Aperçu' },
          { id: 'interventions', label: `Interventions (${total})` },
          { id: 'satisfaction', label: `Satisfaction` },
          { id: 'reports', label: 'Rapports' },
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

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox icon={ClipboardList} label="Assignées" value={assigned} color="text-slate-200" />
            <StatBox icon={Wrench} label="En cours" value={inProgress} color="text-sky-400" />
            <StatBox icon={CheckCircle2} label="Réussies" value={completed} color="text-emerald-400" />
            <StatBox icon={ActivityIcon} label="Échecs" value={failed} color="text-rose-400" />
          </div>
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400 flex items-center gap-1.5"><TrendingUp size={14} /> Taux de réussite</span>
              <span className="text-lg font-bold text-white">{successRate}%</span>
            </div>
            <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all" style={{ width: `${successRate}%` }} />
            </div>
            <div className="text-xs text-slate-500 mt-1.5">{completed} réussies sur {total} interventions au total</div>
          </div>
        </div>
      )}

      {tab === 'interventions' && (
        <div className="space-y-2">
          {techIntervs.length === 0 ? (
            <EmptyState icon={<ClipboardList size={24} className="text-slate-500" />} title="Aucune intervention" />
          ) : (
            techIntervs.map((i) => (
              <div key={i.id} className="card p-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-slate-200 truncate">{i.client_name}</span>
                  <StatusBadge status={i.status} size="sm" />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono">{i.fibre_socket}</span>
                  <span>·</span>
                  <span>{formatDate(i.scheduled_at)}</span>
                </div>
                <div className="mt-1.5"><PriorityBadge priority={i.priority} /></div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'satisfaction' && (
        <div className="space-y-3">
          {loadingDetails ? (
            <div className="flex justify-center py-8"><Spinner size={20} /></div>
          ) : satisfaction.length === 0 ? (
            <EmptyState icon={<Star size={24} className="text-slate-500" />} title="Aucune évaluation" description="Les émissions de satisfaction des clients apparaîtront ici." />
          ) : (
            <>
              <div className="card p-4 text-center mb-3">
                <div className="text-3xl font-bold text-white">
                  {(satisfaction.reduce((s, r) => s + r.rating, 0) / satisfaction.length).toFixed(1)}
                </div>
                <div className="flex justify-center gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} size={16} className={n <= Math.round(satisfaction.reduce((s, r) => s + r.rating, 0) / satisfaction.length) ? 'text-amber-400 fill-amber-400' : 'text-slate-700'} />
                  ))}
                </div>
                <div className="text-xs text-slate-500 mt-1">{satisfaction.length} évaluation(s)</div>
              </div>
              {satisfaction.map((s) => (
                <div key={s.id} className="card p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} size={12} className={n <= s.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'} />
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-500">{timeAgo(s.created_at)}</span>
                  </div>
                  {s.comment && <p className="text-sm text-slate-400 italic">"{s.comment}"</p>}
                  {s.intervention && <p className="text-xs text-sky-400/60 mt-1">{s.intervention.client_name}</p>}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-2">
          {loadingDetails ? (
            <div className="flex justify-center py-8"><Spinner size={20} /></div>
          ) : reports.length === 0 ? (
            <EmptyState icon={<FileText size={24} className="text-slate-500" />} title="Aucun rapport" description="Les rapports d'intervention du technicien apparaîtront ici." />
          ) : (
            reports.map((r) => (
              <div key={r.id} className="card p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-300">{r.intervention?.client_name ?? 'Intervention'}</span>
                  <span className="text-[10px] text-slate-500">{timeAgo(r.created_at)}</span>
                </div>
                <p className="text-sm text-slate-400">{r.content}</p>
              </div>
            ))
          )}
        </div>
      )}
    </Modal>
  );
}

function StatBox({ icon: Icon, label, value, color }: { icon: typeof Phone; label: string; value: number; color: string }) {
  return (
    <div className="card p-3 text-center">
      <Icon size={16} className="mx-auto mb-1.5 text-slate-500" />
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-500">{label}</div>
    </div>
  );
}
