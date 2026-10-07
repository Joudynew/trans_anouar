// ============================================================
// TYPES
// ============================================================

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: 'admin' | 'technician';
  status: 'active' | 'inactive';
  organization_id: string | null;
  avatar_url?: string | null;
  created_at: string;
}

export interface Intervention {
  id: string;
  organization_id: string;
  client_name: string;
  client_address: string;
  fibre_socket: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  technician_id: string | null;
  scheduled_at: string;
  report: string | null;
  created_at: string;
  updated_at: string;
  satisfaction_token: string | null;
  satisfaction_submitted: boolean;
  technician: User | null;
}

export interface Activity {
  id: string;
  organization_id: string;
  intervention_id: string | null;
  technician_id: string | null;
  action: 'created' | 'status_changed' | 'closed' | 'failed';
  detail: string | null;
  created_at: string;
  technician: User | null;
  intervention: Intervention | null;
}

export type ActivityDbRow = {
  id: string;
  organization_id: string;
  intervention_id: string | null;
  technician_id: string | null;
  action: string;
  detail: string | null;
  created_at: string;
  technician?: unknown | null;
  intervention?: unknown | null;
};

export interface ChannelDbRow {
  id: string;
  organization_id: string;
  name: string;
  type: string;
  created_at: string;
}

export interface MessageDbRow {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    id: string;
    full_name: string;
    email: string; avatar_url?: string | null;
  } | null;
}

export interface OrgRow {
  id: string;
  name: string;
  created_at: string;
}

// ============================================================
// API HELPER
// ============================================================

const API_URL = import.meta.env.VITE_API_URL;

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem('token');
  const headers = new Headers(init.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, {
    ...init,
    headers,
  });
}

// ============================================================
// USER FUNCTIONS
// ============================================================

function normalizeUser(raw: unknown): User {
  const u = raw as {
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
    role: string;
    status: string;
    organizationId: string;
    avatarUrl: string;
    createdAt: string;
  };
  return {
    id: u.id,
    email: u.email,
    full_name: u.fullName,
    phone: u.phone,
    role: u.role?.toLowerCase() as 'admin' | 'technician',
    status: u.status?.toLowerCase() as 'active' | 'inactive',
    organization_id: u.organizationId,
    avatar_url: u.avatarUrl,
    created_at: u.createdAt,
  };
}

export async function getUsersByOrg(orgId: string): Promise<User[]> {
  const response = await apiFetch(`${API_URL}/users/org/${orgId}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur récupération utilisateurs');
  }
  return data.users.map(normalizeUser);
}

export async function getUserById(userId: string): Promise<User> {
  const token = localStorage.getItem('token');
  const response = await apiFetch(`${API_URL}/users/${userId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur récupération utilisateur');
  }
  return normalizeUser(data.user);
}

export async function updateUser(
  userId: string,
  data: {
    fullName?: string;
    email?: string;
    phone?: string | null;
    role?: 'admin' | 'technician';
    status?: 'active' | 'inactive';
  }
): Promise<User> {
  const response = await apiFetch(`${API_URL}/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'Erreur modification utilisateur');
  }
  return normalizeUser(result.user);
}

export async function deactivateUser(userId: string): Promise<void> {
  const response = await apiFetch(`${API_URL}/users/${userId}`, {
    method: 'DELETE',
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'Erreur désactivation utilisateur');
  }
}

export async function uploadAvatar(file: File): Promise<User> {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await apiFetch(`${API_URL}/users/me/avatar`, {
    method: 'POST',
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur lors de l\'upload de l\'avatar');
  }
  return normalizeUser(data.user);
}

// ============================================================
// ORGANIZATION FUNCTIONS
// ============================================================

export async function listOrganizations(): Promise<OrgRow[]> {
  const response = await apiFetch(`${API_URL}/organizations`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur récupération organisations');
  }
  return data.organizations.map((o: unknown) => {
    const org = o as { id: string; name: string; createdAt: string };
    return { id: org.id, name: org.name, created_at: org.createdAt };
  });
}

export async function createOrganization(name: string): Promise<OrgRow> {
  const response = await apiFetch(`${API_URL}/organizations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur création organisation');
  }
  const org = data.organization as { id: string; name: string; createdAt: string };
  return { id: org.id, name: org.name, created_at: org.createdAt };
}

export async function updateOrganization(id: string, name: string): Promise<OrgRow> {
  const response = await apiFetch(`${API_URL}/organizations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur modification organisation');
  }
  const org = data.organization as { id: string; name: string; createdAt: string };
  return { id: org.id, name: org.name, created_at: org.createdAt };
}

export async function deleteOrganization(id: string): Promise<void> {
  const response = await apiFetch(`${API_URL}/organizations/${id}`, {
    method: 'DELETE',
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur suppression organisation');
  }
}

// ============================================================
// INTERVENTION FUNCTIONS
// ============================================================

function normalizeIntervention(raw: unknown): Intervention {
  const i = raw as {
    id: string;
    organizationId: string;
    clientName: string;
    clientAddress: string;
    fibreSocket: string;
    description: string;
    priority: string;
    status: string;
    technicianId: string | null;
    scheduledAt: string;
    report: string | null;
    createdAt: string;
    updatedAt: string;
    satisfactionToken: string | null;
    satisfactionSubmitted: boolean;
    technician: unknown | null;
  };
  return {
    id: i.id,
    organization_id: i.organizationId,
    client_name: i.clientName,
    client_address: i.clientAddress,
    fibre_socket: i.fibreSocket,
    description: i.description,
    priority: (i.priority?.toLowerCase() ?? 'medium') as 'low' | 'medium' | 'high',
    status: (i.status?.toLowerCase() ?? 'pending') as 'pending' | 'in_progress' | 'completed' | 'failed',
    technician_id: i.technicianId,
    scheduled_at: i.scheduledAt,
    report: i.report,
    created_at: i.createdAt,
    updated_at: i.updatedAt,
    satisfaction_token: i.satisfactionToken,
    satisfaction_submitted: i.satisfactionSubmitted,
    technician: i.technician ? normalizeUser(i.technician) : null,
  };
}

export async function getInterventionById(id: string): Promise<Intervention> {
  const response = await apiFetch(`${API_URL}/interventions/${id}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur récupération intervention');
  }
  return normalizeIntervention(data.intervention);
}

export async function getInterventionsByOrg(orgId: string): Promise<Intervention[]> {
  const response = await apiFetch(`${API_URL}/interventions/org/${orgId}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur récupération interventions');
  }
  return data.interventions.map(normalizeIntervention);
}

export async function getInterventionsByTech(technicianId: string): Promise<Intervention[]> {
  const response = await apiFetch(`${API_URL}/interventions/tech/${technicianId}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur récupération interventions');
  }
  return data.interventions.map(normalizeIntervention);
}

export async function updateInterventionStatus(
  interventionId: string,
  status: string,
  technicianId?: string,
  organizationId?: string
): Promise<Intervention> {
  const response = await apiFetch(`${API_URL}/interventions/${interventionId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: status.toUpperCase(),
      technicianId,
      organizationId,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur mise à jour statut');
  }
  return normalizeIntervention(data.intervention);
}

// ============================================================
// ACTIVITY FUNCTIONS
// ============================================================

function normalizeActivity(raw: unknown): Activity {
  const a = raw as {
    id: string;
    organizationId: string;
    interventionId: string | null;
    technicianId: string | null;
    action: string;
    detail: string | null;
    createdAt: string;
    technician: unknown | null;
    intervention: unknown | null;
  };
  return {
    id: a.id,
    organization_id: a.organizationId,
    intervention_id: a.interventionId,
    technician_id: a.technicianId,
    action: (a.action?.toLowerCase() ?? 'created') as 'created' | 'status_changed' | 'closed' | 'failed',
    detail: a.detail,
    created_at: a.createdAt,
    technician: a.technician ? normalizeUser(a.technician) : null,
    intervention: a.intervention ? normalizeIntervention(a.intervention) : null,
  };
}

export async function listActivityByOrg(orgId: string, limit = 50): Promise<Activity[]> {
  const response = await apiFetch(`${API_URL}/interventions/activity/org/${orgId}?limit=${limit}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur récupération activité');
  }
  return data.activities.map(normalizeActivity);
}

export async function logActivity(
  orgId: string,
  interventionId: string | null,
  technicianId: string | null,
  action: string,
  detail: string | null
): Promise<void> {
  const response = await apiFetch(`${API_URL}/interventions/activity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organizationId: orgId,
      interventionId,
      technicianId,
      action,
      detail,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur création activité');
  }
}

export async function getLatestActivity(orgId: string): Promise<Activity | null> {
  const response = await apiFetch(`${API_URL}/interventions/activity/org/${orgId}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur récupération activité');
  }
  return data.activities?.[0] ? normalizeActivity(data.activities[0]) : null;
}

// ============================================================
// REPORT FUNCTIONS
// ============================================================

export async function listReportsByIntervention(interventionId: string): Promise<unknown[]> {
  const response = await apiFetch(`${API_URL}/interventions/${interventionId}/reports`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur récupération rapports');
  }
  return data.reports;
}

export async function addReport(
  interventionId: string,
  technicianId: string,
  content: string,
  actionTaken?: string | null
): Promise<unknown> {
  const response = await apiFetch(`${API_URL}/interventions/${interventionId}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ technicianId, content, actionTaken }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur ajout rapport');
  }
  return data.report;
}

// ============================================================
// SATISFACTION FUNCTIONS
// ============================================================

export async function getSatisfaction(interventionId: string): Promise<unknown> {
  const response = await apiFetch(`${API_URL}/interventions/${interventionId}/satisfaction`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur satisfaction');
  }
  return data.satisfaction;
}

export async function getTechnicianSatisfactionsFromApi(technicianId: string): Promise<unknown[]> {
  const response = await apiFetch(`${API_URL}/interventions/technician/${technicianId}/satisfactions`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur récupération satisfactions technicien');
  }
  return data.satisfactions ?? [];
}

// ============================================================
// MESSAGES / CHANNELS
// ============================================================

export async function listChannels(orgId: string): Promise<ChannelDbRow[]> {
  const response = await apiFetch(`${API_URL}/messages/channels/${orgId}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur récupération channels');
  }
  return data.channels.map((c: unknown) => {
    const ch = c as { id: string; name: string; type: string; organizationId: string; createdAt: string };
    return {
      id: ch.id,
      name: ch.name,
      type: ch.type,
      organization_id: ch.organizationId,
      created_at: ch.createdAt,
    };
  });
}

export async function createChannel(
  organizationId: string,
  name: string,
  type: 'dm' | 'group',
  targetUserId?: string
): Promise<string> {
  const response = await apiFetch(`${API_URL}/messages/channels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organizationId,
      name,
      type: type.toUpperCase(),
      ...(type === 'dm' && targetUserId ? { targetUserId } : {}),
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur création channel');
  }
  return data.channel.id;
}


export async function addChannelMember(
  channelId: string,
  userId: string
): Promise<void> {
  const response = await apiFetch(`${API_URL}/messages/channels/${channelId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Erreur ajout membre au channel');
  }
}

export async function listMessages(channelId: string): Promise<MessageDbRow[]> {
  const response = await apiFetch(`${API_URL}/messages/${channelId}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur récupération messages');
  }
  return data.messages.map((m: unknown) => {
    const msg = m as {
      id: string;
      channelId: string;
      senderId: string;
      content: string;
      createdAt: string;
      sender?: { id: string; fullName: string; email: string };
    };
    return {
      id: msg.id,
      channel_id: msg.channelId,
      sender_id: msg.senderId,
      content: msg.content,
      created_at: msg.createdAt,
      sender: msg.sender
        ? {
            id: msg.sender.id,
            full_name: msg.sender.fullName,
            email: msg.sender.email,
          }
        : null,
    };
  });
}

export async function sendMessage(
  channelId: string,
  senderId: string,
  content: string
): Promise<void> {
  const response = await apiFetch(`${API_URL}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channelId, senderId, content }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur envoi message');
  }
}

export async function listAllLastMessages(orgId: string, limit = 300): Promise<MessageDbRow[]> {
  const response = await apiFetch(`${API_URL}/messages/channels/${orgId}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erreur récupération messages');
  }
  const channels = data.channels ?? [];
  return channels.flatMap((c: unknown) => {
    const ch = c as { messages?: unknown[] };
    return (ch.messages ?? []).map((m: unknown) => {
      const msg = m as {
        id: string;
        channelId: string;
        senderId: string;
        content: string;
        createdAt: string;
        sender?: { id: string; fullName: string; email: string };
      };
      return {
        id: msg.id,
        channel_id: msg.channelId,
        sender_id: msg.senderId,
        content: msg.content,
        created_at: msg.createdAt,
        sender: msg.sender ?? null,
      };
    });
  }).slice(0, limit);
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export async function getUnreadNotificationCount(): Promise<number> {
  const res = await apiFetch(`${API_URL}/notifications/unread-count`);
  if (!res.ok) {
    throw new Error(`Erreur compteur notifications: ${res.status}`);
  }
  const data = await res.json();
  return Number(data.count ?? 0);
}

// Alias de compatibilité avec les anciennes pages
export async function listUsersByOrg(orgId: string): Promise<User[]> {
  return getUsersByOrg(orgId);
}
