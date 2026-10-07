import { Avatar } from "@/components/Avatar";
import { useState, useMemo } from 'react';
import { useToast } from '@/components/Toast';
import { Modal } from '@/components/Modal';
import type { Intervention, Profile } from '@/lib/types';
import { PageHeader } from '@/components/AdminLayout';
import { Spinner, EmptyState } from '@/components/Feedback';
import { formatDate } from '@/lib/constants';
import { useAuth } from '@/lib/auth';
import { Users, Phone, Clock, ChevronRight, UserPlus } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export function AdminTeams({
  technicians,
  loading,
  interventions,
  onSelectProfile,
  onRefresh,
  selectedOrgId,
}: {
  technicians: Profile[];
  loading: boolean;
  interventions: Intervention[];
  onSelectProfile: (p: Profile) => void;
  onRefresh: () => void;
  selectedOrgId?: string;
}) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const isSuperAdmin = profile?.role === 'super_admin';
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', phone: '', role: 'technician' as 'technician' | 'admin',
  });

  const techStats = useMemo(() => {
    return technicians
      .filter((t) => {
        return isSuperAdmin
          ? ['technician', 'admin'].includes(t.role)
          : t.role === 'technician';
      })
      .map((t) => {
        const techIntervs = interventions.filter((i) => i.technician_id === t.id);
        const completed = techIntervs.filter((i) => i.status === 'completed').length;
        const failed = techIntervs.filter((i) => i.status === 'failed').length;
        const inProgress = techIntervs.filter((i) => i.status === 'in_progress' || i.status === 'en_route').length;
        const assigned = techIntervs.filter((i) => i.status === 'assigned').length;
        const total = techIntervs.length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { ...t, completed, failed, inProgress, assigned, total, rate };
      });
  }, [technicians, interventions, isSuperAdmin]);

  const handleCreate = async () => {
    if (!form.fullName.trim() || !form.email.trim() || !form.password.trim()) {
      toast('Nom, email et mot de passe sont requis.', 'error');
      return;
    }
    if (form.password.length < 6) {
      toast('Le mot de passe doit faire au moins 6 caractères.', 'error');
      return;
    }
    setCreating(true);
    try {
      const response = await apiFetch(
        `${import.meta.env.VITE_API_URL}/users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            email: form.email.trim(),
            password: form.password,
            fullName: form.fullName.trim(),
            phone: form.phone.trim() || null,
            role: form.role,
            ...(selectedOrgId && selectedOrgId !== 'all'
              ? { organizationId: selectedOrgId }
              : {}),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur création compte');
      }
      toast(`${form.role === 'admin' ? 'Administrateur' : 'Technicien'} créé avec succès.`, 'success');
      setShowCreate(false);
      setForm({ fullName: '', email: '', password: '', phone: '', role: 'technician' });
      onRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur.';
      toast(msg, 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Équipe"
        subtitle={`${technicians.length} utilisateurs / ${techStats.length} techniciens`}
        action={
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <UserPlus size={16} />
            Nouveau membre
          </button>
        }
      />
      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={24} /></div>
      ) : techStats.length === 0 ? (
        <EmptyState icon={<Users size={24} className="text-slate-500" />} title="Aucun technicien" description="Créez un nouveau membre pour commencer." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {techStats.map((t) => (
            <div
              key={t.id}
              onClick={() => onSelectProfile(t)}
              className="card p-5 card-hover cursor-pointer group"
            >
              <div className="flex items-start gap-3 mb-4">
                <Avatar user={t} size={44} />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors truncate">{t.full_name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`chip border ${t.status === 'active' ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' : 'text-slate-400 bg-slate-500/10 border-slate-500/20'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'active' ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                      {t.status === 'active' ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-600 group-hover:text-sky-400 shrink-0" />
              </div>

              <div className="space-y-1.5 mb-4">
                {t.phone && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Phone size={12} className="shrink-0" />
                    <span>{t.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock size={12} className="shrink-0" />
                  <span>Membre depuis {formatDate(t.created_at)}</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 pt-3 border-t border-white/[0.06]">
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-200">{t.assigned}</div>
                  <div className="text-[10px] text-slate-500">Assignées</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-sky-400">{t.inProgress}</div>
                  <div className="text-[10px] text-slate-500">En cours</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-emerald-400">{t.completed}</div>
                  <div className="text-[10px] text-slate-500">Réussies</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-rose-400">{t.failed}</div>
                  <div className="text-[10px] text-slate-500">Échecs</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouveau membre" description="Créez un compte technicien ou administrateur." size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Nom complet</label>
            <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="input" placeholder="ex. Karim Benali" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" placeholder="karim@entreprise.fr" />
            </div>
            <div>
              <label className="label">Téléphone (optionnel)</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" placeholder="06 12 34 56 78" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Mot de passe</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input" placeholder="Minimum 6 caractères" />
            </div>
            <div>
              <label className="label">Rôle</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'technician' | 'admin' })} className="input">
                <option value="technician">Technicien</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Annuler</button>
            <button onClick={handleCreate} disabled={creating} className="btn-primary">
              {creating ? <Spinner size={16} /> : <UserPlus size={16} />}
              Créer le compte
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}