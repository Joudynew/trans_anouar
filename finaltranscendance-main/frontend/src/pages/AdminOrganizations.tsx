/**
 * ============================================================
 * PAGE ADMIN : ORGANISATIONS (système multi-tenant)
 * ============================================================
 *
 * Permet à l'admin de créer, modifier et supprimer des organisations.
 * Chaque organisation isole ses données : utilisateurs et interventions
 * ne se mélangent jamais entre organisations.
 *
 * C'est le module "organization system" du barème ft_transcendence.
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/Toast';
import { Modal } from '@/components/Modal';
import { Spinner, EmptyState } from '@/components/Feedback';
import { PageHeader } from '@/components/AdminLayout';
import {
  listOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getUsersByOrg,
  type OrgRow,
} from '@/lib/api';
import { notifyDbChange } from '@/lib/realtime';
import { Building2, Plus, Trash2, Edit2, Users } from 'lucide-react';

export function AdminOrganizations({ onRefresh }: { onRefresh: () => void }) {
  const { toast } = useToast();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editOrg, setEditOrg] = useState<OrgRow | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const allOrgs = await listOrganizations();
    setOrgs(allOrgs);
    const countMap: Record<string, number> = {};
    for (const org of allOrgs) {
      const users = await getUsersByOrg(org.id);
      countMap[org.id] = users.length;
    }
    setCounts(countMap);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast('Le nom est requis.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editOrg) {
        await updateOrganization(editOrg.id, name.trim());
        toast('Organisation mise à jour.', 'success');
      } else {
        await createOrganization(name.trim());
        toast('Organisation créée.', 'success');
      }
      setShowModal(false);
      setEditOrg(null);
      setName('');
      await load();
      onRefresh();
      notifyDbChange();
    } catch {
      toast('Erreur lors de l\'opération.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (org: OrgRow) => {
    if (org.id === 'default-org') {
      toast('L\'organisation par défaut ne peut pas être supprimée.', 'error');
      return;
    }
    if (counts[org.id] > 0) {
      toast(`Impossible de supprimer : ${counts[org.id]} utilisateur(s) y sont rattachés.`, 'error');
      return;
    }
    await deleteOrganization(org.id);
    toast('Organisation supprimée.', 'success');
    await load();
    onRefresh();
    notifyDbChange();
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Organisations"
        subtitle={`${orgs.length} organisation(s) — isolation des données par équipe`}
        action={
          <button onClick={() => { setEditOrg(null); setName(''); setShowModal(true); }} className="btn-primary">
            <Plus size={16} />
            Nouvelle organisation
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={24} /></div>
      ) : orgs.length === 0 ? (
        <EmptyState icon={<Building2 size={24} className="text-slate-500" />} title="Aucune organisation" description="Créez une organisation pour isoler les données d'une équipe." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orgs.map((org) => (
            <div key={org.id} className="card p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center shrink-0">
                  <Building2 size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">{org.name}</h3>
                  {org.id === 'default-org' && (
                    <span className="text-[10px] text-slate-500">Par défaut</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                <Users size={12} />
                <span>{counts[org.id] ?? 0} membre(s)</span>
              </div>
              <div className="flex gap-2 pt-3 border-t border-white/[0.06]">
                <button
                  onClick={() => { setEditOrg(org); setName(org.name); setShowModal(true); }}
                  className="btn-secondary flex-1 text-xs justify-center"
                >
                  <Edit2 size={14} />
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(org)}
                  disabled={org.id === 'default-org'}
                  className="btn-secondary px-3 text-rose-400 hover:bg-rose-500/10 disabled:opacity-30"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditOrg(null); setName(''); }}
        title={editOrg ? 'Modifier l\'organisation' : 'Nouvelle organisation'}
        description="Chaque organisation isole ses utilisateurs et interventions."
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Nom de l'organisation</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="ex. Équipe Nord, Agence Paris…"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => { setShowModal(false); setEditOrg(null); setName(''); }} className="btn-secondary">
              Annuler
            </button>
            <button onClick={handleSubmit} disabled={saving || !name.trim()} className="btn-primary">
              {saving ? <Spinner size={16} /> : <Plus size={16} />}
              {editOrg ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}