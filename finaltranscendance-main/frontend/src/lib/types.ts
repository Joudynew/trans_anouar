// ============================================================
// TYPES PARTAGÉS DE L'APPLICATION
// ============================================================
// Ces types décrivent la forme des données dans toute l'app.
// Mis à jour pour la base locale PostgreSQL (au lieu de Supabase).

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type InterventionStatus = 'assigned' | 'en_route' | 'in_progress' | 'completed' | 'failed';
type ProfileRole = 'super_admin' | 'admin' | 'technician';
type ChannelType = 'dm' | 'group';

// Profil utilisateur — correspond à la table `users` en BDD locale.
// organization_id garantit l'isolation entre équipes.
export interface Profile {
  id: string;
  email: string;
  role: ProfileRole;
  full_name: string;
  phone: string | null;
  status: 'active' | 'inactive';
  organization_id: string | null;
  avatar_url: string | null;
  created_at: string;
}


export interface Intervention {
  id: string;
  organization_id: string;
  client_name: string;
  client_address: string;
  fibre_socket: string;
  description: string;
  priority: Priority;
  status: InterventionStatus;
  technician_id: string | null;
  scheduled_at: string;
  report: string | null;
  created_at: string;
  updated_at: string;
  satisfaction_token?: string | null;
  satisfaction_submitted?: boolean;
  technician?: Profile | null;
}

export interface ActivityLog {
  id: string;
  organization_id: string;
  intervention_id: string | null;
  technician_id: string | null;
  action: 'created' | 'status_changed' | 'closed' | 'failed';
  detail: string | null;
  created_at: string;
  technician?: Profile | null;
  intervention?: { id: string; client_name: string; fibre_socket: string } | null;
}

// Rapport d'intervention — IMMUABLE une fois créé (append-only)
export interface InterventionReport {
  id: string;
  intervention_id: string;
  technician_id: string;
  content: string;
  action_taken: string | null;
  created_at: string;
  technician?: Profile | null;
}

export interface InterventionReportWithIntervention extends InterventionReport {
  intervention?: Intervention | null;
}

export interface SatisfactionRating {
  id: string;
  intervention_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  intervention?: { id: string; client_name: string; fibre_socket: string } | null;
}

export interface Channel {
  id: string;
  organization_id: string;
  name: string;
  type: ChannelType;
  created_at: string;
}


export interface Message {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: Profile | null;
}
