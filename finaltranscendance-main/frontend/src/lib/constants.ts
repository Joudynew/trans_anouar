import type { Priority, InterventionStatus } from './types';

export const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const PRIORITY_META: Record<Priority, { label: string; color: string; dot: string }> = {
  critical: { label: 'Critique', color: 'text-rose-300 bg-rose-500/10 border-rose-500/20', dot: 'bg-rose-400' },
  high: { label: 'Haute', color: 'text-amber-300 bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-400' },
  medium: { label: 'Moyenne', color: 'text-sky-300 bg-sky-500/10 border-sky-500/20', dot: 'bg-sky-400' },
  low: { label: 'Faible', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', dot: 'bg-slate-400' },
};

export const STATUS_META: Record<InterventionStatus, { label: string; color: string; dot: string }> = {
  assigned: { label: 'Assignée', color: 'text-slate-300 bg-slate-500/10 border-slate-500/20', dot: 'bg-slate-400' },
  en_route: { label: 'En route', color: 'text-violet-300 bg-violet-500/10 border-violet-500/20', dot: 'bg-violet-400' },
  in_progress: { label: 'En cours', color: 'text-sky-300 bg-sky-500/10 border-sky-500/20', dot: 'bg-sky-400' },
  completed: { label: 'Terminée', color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
  failed: { label: 'Échec', color: 'text-rose-300 bg-rose-500/10 border-rose-500/20', dot: 'bg-rose-400' },
};

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day > 7) return formatDate(iso);
  if (day > 0) return `il y a ${day}j`;
  if (hr > 0) return `il y a ${hr}h`;
  if (min > 0) return `il y a ${min}min`;
  return 'à l\'instant';
}
