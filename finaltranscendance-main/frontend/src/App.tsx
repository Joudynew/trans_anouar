/**
 * ============================================================
 * COMPOSANT RACINE — Orchestration de l'application
 * ============================================================
 *
 * Les données sont chargées via l'API backend.
 * Route l'utilisateur vers l'interface admin ou technicien selon son rôle.
 *
 * Données chargées :
 * - Admin : interventions, techniciens, activité (filtrés par organisation)
 * - Tech : ses interventions assignées
 *
 * Temps réel : utilise WebSocket.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { UnreadMessagesProvider, useUnreadMessages } from '@/lib/unreadMessages';
import { ToastProvider } from '@/components/Toast';
import { FullPageLoader } from '@/components/Feedback';
import { AdminLayout, type AdminPage } from '@/components/AdminLayout';
import { TechLayout, type TechPage } from '@/components/TechLayout';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { AdminPlanning } from '@/pages/AdminPlanning';
import { AdminTeams } from '@/pages/AdminTeams';
import { AdminActivity } from '@/pages/AdminActivity';
import { AdminMessages } from '@/pages/AdminMessages';
import { AdminOrganizations } from '@/pages/AdminOrganizations';
import { AdminInterventionDetail } from '@/pages/AdminInterventionDetail';
import { TechProfileModal } from '@/pages/TechProfileModal';
import { TechInterventionsList } from '@/pages/TechInterventionsList';
import { TechInterventionDetail } from '@/pages/TechInterventionDetail';
import { TechMessages } from '@/pages/TechMessages';
import { TechNotifications } from '@/pages/TechNotifications';
import { TechFriends } from '@/pages/TechFriends';
import { TechDashboard } from '@/pages/TechDashboard';
import { AuthPage } from '@/pages/AuthPage';
import { SatisfactionPage } from '@/pages/SatisfactionPage';
import { PrivacyPolicyPage } from '@/pages/PrivacyPolicyPage';
import { TermsPage } from '@/pages/TermsPage';

import {
  type ActivityDbRow,
  getInterventionsByOrg,
  getUsersByOrg,
  getInterventionsByTech,
  listActivityByOrg,
  listOrganizations,
} from '@/lib/api';
import { subscribeToChanges, notifyDbChange } from '@/lib/realtime';
import type { Intervention, Profile, ActivityLog } from '@/lib/types';

// Convertit les rows de la BDD locale vers les types de l'app
function toProfile(p: unknown): Profile {
  const raw = p as {
    id: string;
    email: string;
    full_name: string;
    phone: string | null;
    role: string;
    status: string;
    organization_id: string;
    avatar_url: string | null;
    created_at: string;
  };
  return {
    id: raw.id,
    email: raw.email,
    full_name: raw.full_name,
    phone: raw.phone,
    role: raw.role as Profile['role'],
    status: raw.status as Profile['status'],
    organization_id: raw.organization_id,
    avatar_url: raw.avatar_url,
    created_at: raw.created_at,
  };
}

function toIntervention(i: unknown): Intervention {
  const raw = i as {
    id: string;
    organization_id: string;
    client_name: string;
    client_address: string;
    fibre_socket: string;
    description: string;
    priority: string;
    status: string;
    technician_id: string | null;
    scheduled_at: string;
    report: string | null;
    created_at: string;
    updated_at: string;
    technician: unknown | null;
  };
  return {
    id: raw.id,
    organization_id: raw.organization_id,
    client_name: raw.client_name,
    client_address: raw.client_address,
    fibre_socket: raw.fibre_socket,
    description: raw.description,
    priority: raw.priority as Intervention['priority'],
    status: raw.status as Intervention['status'],
    technician_id: raw.technician_id,
    scheduled_at: raw.scheduled_at,
    report: raw.report,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    technician: raw.technician ? toProfile(raw.technician) : null,
  };
}

function toActivity(a: ActivityDbRow): ActivityLog {
  return {
    id: a.id,
    organization_id: a.organization_id,
    intervention_id: a.intervention_id,
    technician_id: a.technician_id,
    action: a.action as ActivityLog['action'],
    detail: a.detail,
    created_at: a.created_at,
    technician: a.technician ? toProfile(a.technician) : null,
    intervention: a.intervention as unknown as Intervention | null,
  };
}

// ============================================================
// APPLICATION ADMIN
// ============================================================
function AdminApp() {
  const { profile } = useAuth();
  const [page, setPageState] = useState<AdminPage>('dashboard');

  const isSuperAdmin = profile?.role === 'super_admin';

  const setPage = useCallback((nextPage: AdminPage) => {
    if (nextPage === 'organizations' && !isSuperAdmin) {
      setPageState('dashboard');
      return;
    }
    setPageState(nextPage);
  }, [isSuperAdmin]);
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('all');
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [technicians, setTechnicians] = useState<Profile[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [detailIntervention, setDetailIntervention] = useState<Intervention | null>(null);
  const [profileModal, setProfileModal] = useState<Profile | null>(null);
  const { markActivitySeen } = useUnreadMessages();

  // Charge les organisations disponibles pour le SUPER_ADMIN
  useEffect(() => {
    if (!isSuperAdmin) return;

    listOrganizations()
      .then((orgs) => setOrganizations(orgs))
      .catch((err) => console.error('Erreur chargement organisations:', err));
  }, [isSuperAdmin]);

  // Marque les notifications activité comme vues quand on visite la page activité
  useEffect(() => {
    if (page === 'activity') markActivitySeen();
  }, [page, markActivitySeen]);

  // Charge les données de l'organisation sélectionnée.
  // SUPER_ADMIN peut choisir une organisation ou "Toutes".
  const loadAll = useCallback(async () => {
    setLoadingData(true);

    try {
      const orgIds = isSuperAdmin
        ? selectedOrgId === 'all'
          ? organizations.map((o) => o.id)
          : [selectedOrgId]
        : [profile?.organization_id ?? 'default-org'];

      if (orgIds.length === 0) {
        setInterventions([]);
        setTechnicians([]);
        setActivities([]);
        return;
      }

      const results = await Promise.all(
        orgIds.map(async (orgId) => {
          const [intervs, users, acts] = await Promise.all([
            getInterventionsByOrg(orgId),
            getUsersByOrg(orgId),
            listActivityByOrg(orgId),
          ]);

          return { intervs, users, acts };
        })
      );

      setInterventions(
        results.flatMap((r) => r.intervs.map(toIntervention))
      );

      setTechnicians(
        results.flatMap((r) => r.users).map((u) => ({
          ...u,
          avatar_url: u.avatar_url ?? null,
          role: u.role as Profile['role'],
          status: u.status as Profile['status'],
        }))
      );

      setActivities(
        results.flatMap((r) => r.acts.map(toActivity))
      );
    } catch (err) {
      console.error('Erreur chargement données admin:', err);
    } finally {
      setLoadingData(false);
    }
  }, [isSuperAdmin, selectedOrgId, organizations, profile]); // ← dépendance corrigée

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (profile) loadAll();
  }, [loadAll, profile]);

  // Temps réel : recharge quand la BDD change via WebSocket
  useEffect(() => {
    const unsubscribe = subscribeToChanges(() => loadAll());
    return unsubscribe;
  }, [loadAll]);

  const currentDetail = useMemo(
    () => interventions.find((i) => i.id === detailIntervention?.id) ?? detailIntervention,
    [interventions, detailIntervention]
  );

  return (
    <>
        <AdminLayout
        page={page}
        setPage={setPage}
        isSuperAdmin={isSuperAdmin}
        topBar={
          isSuperAdmin ? (
            <div className="w-full mb-6">
              <div className="card p-3 flex items-center gap-3">
                <label className="text-sm font-medium text-slate-300">
                  Organisation
                </label>

                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="input max-w-xs"
                >
                  <option value="all">Toutes les organisations</option>

                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null
        }
      >
                {page === 'dashboard' && <AdminDashboard interventions={interventions} technicians={technicians} onSelectIntervention={setDetailIntervention} />}
        {page === 'planning' && (
          <AdminPlanning
            interventions={interventions}
            technicians={technicians}
            loading={loadingData}
            onRefresh={loadAll}
            onSelectIntervention={setDetailIntervention}
          />
        )}
        {page === 'teams' && (
          <AdminTeams
            technicians={technicians}
            loading={loadingData}
            interventions={interventions}
            onSelectProfile={setProfileModal}
            onRefresh={loadAll}
            selectedOrgId={isSuperAdmin ? selectedOrgId : profile?.organization_id ?? undefined}
          />
        )}
        {page === 'organizations' && isSuperAdmin && (
          <AdminOrganizations onRefresh={loadAll} />
        )}
        {page === 'activity' && <AdminActivity activities={activities} loading={loadingData} />}
        {page === 'messages' && <AdminMessages technicians={technicians} />}
      </AdminLayout>

      {currentDetail && (
        <AdminInterventionDetail
          intervention={currentDetail}
          technicians={technicians}
          onUpdated={() => { loadAll(); notifyDbChange(); }}
          onClose={() => setDetailIntervention(null)}
        />
      )}
      <TechProfileModal technician={profileModal} interventions={interventions} onClose={() => setProfileModal(null)} />
    </>
  );
}

// ============================================================
// APPLICATION TECHNICIEN
// ============================================================
function TechApp() {
  const { user } = useAuth();
  const [page, setPage] = useState<TechPage>('dashboard');
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Charge les interventions assignées au technicien connecté
  const loadInterventions = useCallback(async () => {
    if (!user) return;
    const intervs = await getInterventionsByTech(user.id);
    setInterventions(intervs.map(toIntervention));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInterventions();
  }, [loadInterventions]);

  // Temps réel : recharge quand la BDD change
  useEffect(() => {
    const unsubscribe = subscribeToChanges(() => loadInterventions());
    return unsubscribe;
  }, [loadInterventions]);

  const selected = interventions.find((i) => i.id === selectedId);
  const title = selected
    ? selected.client_name
    : page === 'dashboard' ? 'Tableau de bord'
    : page === 'interventions' ? 'Mes interventions'
    : page === 'messages' ? 'Messages'
    : page === 'friends' ? 'Amis'
    : 'Notifications';

  return (
    <TechLayout
      page={page}
      setPage={setPage}
      title={title}
      backAction={selected || page !== 'dashboard' ? () => { if (selected) { setSelectedId(null); } else { setPage('dashboard'); } } : undefined}
    >
      {selected ? (
        <TechInterventionDetail intervention={selected} onUpdated={() => { loadInterventions(); notifyDbChange(); }} />
      ) : (
        <>
          {page === 'dashboard' && (
            loading ? <FullPageLoader label="Chargement…" /> :
            <TechDashboard interventions={interventions} onSelect={setSelectedId} />
          )}
          {page === 'interventions' && (
            loading ? <FullPageLoader label="Chargement des interventions…" /> :
            <TechInterventionsList interventions={interventions} onSelect={setSelectedId} />
          )}
          {page === 'messages' && <TechMessages />}
          {page === 'notifications' && <TechNotifications />}
          {page === 'friends' && <TechFriends />}
        </>
      )}
    </TechLayout>
  );
}

// ============================================================
// ROUTAGE PRINCIPAL
// ============================================================
function AppContent() {
  const { user, profile, loading } = useAuth();

  if (loading) return <FullPageLoader label="Chargement…" />;
  if (!user || !profile) return <AuthPage />;
  if (profile.role === 'admin' || profile.role === 'super_admin') return <AdminApp />;
  return <TechApp />;
}

export default function App() {
  const path = window.location.pathname;

  if (path === '/privacy-policy') {
    return <PrivacyPolicyPage />;
  }

  if (path === '/terms') {
    return <TermsPage />;
  }

  const match = path.match(/^\/satisfaction\/([^/]+)$/);

  if (match) {
    return <SatisfactionPage token={match[1]} />;
  }

  return (
    <ToastProvider>
      <AuthProvider>
        <UnreadMessagesProvider>
          <AppContent />
        </UnreadMessagesProvider>
      </AuthProvider>
    </ToastProvider>
  );
}