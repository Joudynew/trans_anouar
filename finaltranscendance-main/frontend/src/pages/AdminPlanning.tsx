import { useState, useMemo, useEffect, useCallback } from 'react';
import { useToast } from '@/components/Toast';
import { Modal } from '@/components/Modal';
import { Spinner, EmptyState } from '@/components/Feedback';
import { PageHeader } from '@/components/AdminLayout';
import { StatusBadge, PriorityBadge } from '@/components/Badges';
import { formatDateTime, isToday } from '@/lib/constants';
import type { Intervention, Profile, Priority } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { notifyDbChange } from '@/lib/realtime';
import { CalendarPlus, Search, Filter, MapPin, User, Cable, ClipboardList, Calendar, ChevronRight } from 'lucide-react';

export function AdminPlanning({
  interventions,
  technicians,
  loading,
  onRefresh,
  onSelectIntervention,
}: {
  interventions: Intervention[];
  technicians: Profile[];
  loading: boolean;
  onRefresh: () => void;
  onSelectIntervention: (i: Intervention) => void;
}) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const orgId = profile?.organization_id ?? 'default-org';
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [form, setForm] = useState({
    client_name: '', client_address: '', fibre_socket: '', description: '',
    priority: 'medium' as Priority, technician_id: '', scheduled_date: '', scheduled_time: '09:00',
  });

  // État pour l'heure courante
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  const techName = useCallback(
    (id: string | null) => technicians.find((t) => t.id === id)?.full_name ?? 'Non assigné',
    [technicians]
  );

  const filtered = useMemo(() => {
    return interventions
      .filter((i) => {
        if (statusFilter !== 'all' && i.status !== statusFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            i.client_name.toLowerCase().includes(q) ||
            i.client_address.toLowerCase().includes(q) ||
            i.fibre_socket.toLowerCase().includes(q) ||
            techName(i.technician_id).toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.scheduled_at).getTime();
        const dateB = new Date(b.scheduled_at).getTime();
        const pastA = dateA < now;
        const pastB = dateB < now;

        if (pastA !== pastB) {
          return pastA ? 1 : -1;
        }

        if (!pastA) {
          return dateA - dateB;
        }

        return dateB - dateA;
      });
  }, [interventions, search, statusFilter, now, techName]);

  const handleCreate = async () => {
    if (saving) return;

    if (!form.client_name.trim() || !form.client_address.trim() || !form.fibre_socket.trim() || !form.description.trim()) {
      toast('Tous les champs client, adresse, prise fibre et description sont requis.', 'error');
      return;
    }
    if (!form.scheduled_date) { toast('La date planifiée est requise.', 'error'); return; }
    setSaving(true);
    try {
      const scheduledAt = new Date(`${form.scheduled_date}T${form.scheduled_time}:00`);

      if (isNaN(scheduledAt.getTime())) {
        toast('La date ou l’heure est invalide.', 'error');
        setSaving(false);
        return;
      }

      if (scheduledAt.getTime() <= Date.now()) {
        toast('Impossible de créer une intervention dans le passé.', 'error');
        setSaving(false);
        return;
      }

      const response = await apiFetch(
        `${import.meta.env.VITE_API_URL}/interventions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            organizationId: orgId,
            clientName: form.client_name.trim(),
            clientAddress: form.client_address.trim(),
            fibreSocket: form.fibre_socket.trim(),
            description: form.description.trim(),
            priority: form.priority.toUpperCase(),
            technicianId: form.technician_id || null,
            scheduledAt: scheduledAt.toISOString(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur création intervention');
      }

      const newId = data.intervention.id;
      await apiFetch(
        `${import.meta.env.VITE_API_URL}/interventions/activity`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            organizationId: orgId,
            interventionId: newId,
            technicianId: form.technician_id || null,
            action: 'created',
            detail: `Ticket créé pour ${form.client_name.trim()} — ${form.fibre_socket.trim()}`,
          }),
        }
      );

      notifyDbChange();
      toast('Intervention créée et assignée.', 'success');
      setModalOpen(false);
      setForm({ client_name: '', client_address: '', fibre_socket: '', description: '', priority: 'medium', technician_id: '', scheduled_date: '', scheduled_time: '09:00' });
      onRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la création.';
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const todayCount = interventions.filter((i) => isToday(i.scheduled_at)).length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Planification"
        subtitle={`${interventions.length} interventions · ${todayCount} aujourd'hui`}
        action={
          <button onClick={() => setModalOpen(true)} className="btn-primary">
            <CalendarPlus size={16} />
            Nouveau ticket
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher client, adresse, prise…" className="input pl-10" />
        </div>
        <div className="relative">
          <Filter size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input pl-10 pr-8 appearance-none cursor-pointer">
            <option value="all">Tous les statuts</option>
            <option value="assigned">Assignées</option>
            <option value="en_route">En route</option>
            <option value="in_progress">En cours</option>
            <option value="completed">Terminées</option>
            <option value="failed">Échecs</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={24} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<ClipboardList size={24} className="text-slate-500" />} title="Aucune intervention" description="Créez un nouveau ticket d'intervention pour commencer." />
      ) : (
        <div className="space-y-2">
          {filtered.map((i) => (
            <div key={i.id} onClick={() => onSelectIntervention(i)} className="card p-4 card-hover cursor-pointer group">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <h3 className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors">{i.client_name}</h3>
                    <PriorityBadge priority={i.priority} />
                    <StatusBadge status={i.status} size="sm" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5"><MapPin size={12} className="shrink-0" /><span className="truncate">{i.client_address}</span></div>
                    <div className="flex items-center gap-1.5"><Cable size={12} className="shrink-0" /><span className="font-mono">{i.fibre_socket}</span></div>
                    <div className="flex items-center gap-1.5"><User size={12} className="shrink-0" /><span className="truncate">{techName(i.technician_id)}</span></div>
                    <div className="flex items-center gap-1.5"><Calendar size={12} className="shrink-0" /><span>{formatDateTime(i.scheduled_at)}</span></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">{i.description}</p>
                </div>
                <ChevronRight size={16} className="text-slate-600 group-hover:text-sky-400 transition-colors shrink-0 mt-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau ticket d'intervention" description="Créez et assignez une intervention à un technicien." size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Nom du client</label>
              <input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className="input" placeholder="ex. M. Dupont Jean" />
            </div>
            <div>
              <label className="label">Numéro de prise fibre</label>
              <input value={form.fibre_socket} onChange={(e) => setForm({ ...form, fibre_socket: e.target.value })} className="input font-mono" placeholder="PTO-75002-0042" />
            </div>
          </div>
          <div>
            <label className="label">Adresse</label>
            <input value={form.client_address} onChange={(e) => setForm({ ...form, client_address: e.target.value })} className="input" placeholder="12 Rue de la Paix, 75002 Paris" />
          </div>
          <div>
            <label className="label">Description de la panne</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input min-h-[80px] resize-y" placeholder="Décrivez la panne ou l'intervention à réaliser…" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Priorité</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })} className="input">
                <option value="low">Faible</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
                <option value="critical">Critique</option>
              </select>
            </div>
            <div>
              <label className="label">Technicien</label>
              <select value={form.technician_id} onChange={(e) => setForm({ ...form, technician_id: e.target.value })} className="input">
                <option value="">Non assigné</option>
                {technicians.filter((t) => t.role?.toLowerCase() === 'technician' && t.status?.toLowerCase() === 'active').map((t) => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={form.scheduled_date}
                onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="label">Heure</label>
            <input type="time" value={form.scheduled_time} onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })} className="input max-w-[160px]" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button>
            <button onClick={handleCreate} disabled={saving} className="btn-primary">
              {saving ? <Spinner size={16} /> : <CalendarPlus size={16} />}
              Créer le ticket
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}