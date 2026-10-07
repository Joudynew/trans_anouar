/**
 * ============================================================
 * SUIVI DES MESSAGES NON LUS
 * ============================================================
 *
 * Les changements sont reçus via le WebSocket du backend.
 * - WebSocket pour notifier les clients connectés
 * - Les données sont rechargées via l'API après notification
 *
 * Le état "lu/non lu" est stocké en localStorage par utilisateur.
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { subscribeToChanges } from '@/lib/realtime';
import { listAllLastMessages, getLatestActivity } from '@/lib/api';
import type { Message, ActivityLog } from '@/lib/types';

interface UnreadContextValue {
  unreadCount: number;
  unreadByChannel: Record<string, number>;
  lastReadByChannel: Record<string, string>;
  markChannelRead: (channelId: string, lastMessageAt: string) => void;
  isChannelUnread: (channelId: string) => boolean;
  lastMessages: Record<string, Message | null>;
  unreadActivityCount: number;
  markActivitySeen: () => void;
}

const UnreadContext = createContext<UnreadContextValue | undefined>(undefined);

// Clés localStorage par utilisateur pour le suivi de lecture
function getStorageKey(userId: string, kind: string): string {
  return `fibreflow_${kind}_${userId}`;
}

function loadStoredReadState(userId: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(getStorageKey(userId, 'read_state'));
    return raw ? JSON.parse(raw) as Record<string, string> : {};
  } catch {
    return {};
  }
}

function saveStoredReadState(userId: string, state: Record<string, string>): void {
  try {
    localStorage.setItem(getStorageKey(userId, 'read_state'), JSON.stringify(state));
  } catch { /* ignore */ }
}

function loadStoredActivitySeen(userId: string): string {
  try {
    return localStorage.getItem(getStorageKey(userId, 'activity_seen')) ?? '';
  } catch {
    return '';
  }
}

function saveStoredActivitySeen(userId: string, timestamp: string): void {
  try {
    localStorage.setItem(getStorageKey(userId, 'activity_seen'), timestamp);
  } catch { /* ignore */ }
}

export function UnreadMessagesProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [lastReadByChannel, setLastReadByChannel] = useState<Record<string, string>>({});
  const [lastMessages, setLastMessages] = useState<Record<string, Message | null>>({});
  const [activitySeenAt, setActivitySeenAt] = useState<string>('');
  const [lastActivity, setLastActivity] = useState<ActivityLog | null>(null);
  const userIdRef = useRef<string | null>(null);

  // Charge l'état de lecture depuis localStorage au démarrage
  useEffect(() => {
    if (!user) return;
    userIdRef.current = user.id;
    setLastReadByChannel(loadStoredReadState(user.id));
    setActivitySeenAt(loadStoredActivitySeen(user.id));
  }, [user]);

  // Charge les derniers messages de tous les canaux de l'organisation
  const loadAllLastMessages = useCallback(async () => {
    if (!profile?.organization_id || !user) return;

    const msgs = await listAllLastMessages(profile.organization_id);

    const byChannel: Record<string, Message | null> = {};

    for (const m of msgs) {
      const current = byChannel[m.channel_id];

      if (
        !current ||
        new Date(m.created_at).getTime() >
          new Date(current.created_at).getTime()
      ) {
        byChannel[m.channel_id] = {
          ...m,
          sender: m.sender ? {
            id: m.sender.id,
            full_name: m.sender.full_name,
            email: m.sender.email,
            phone: null,
            role: 'technician',
            status: 'active',
            organization_id: profile.organization_id,
            avatar_url: null,
            created_at: m.created_at,
          } : null,
        };
      }
    }

    /*
     * IMPORTANT :
     * Si un canal n'a encore aucun état de lecture sauvegardé,
     * on considère son dernier message actuel comme déjà lu.
     *
     * Cela évite qu'un ancien message provoque un faux badge
     * rouge après un refresh ou un redémarrage Docker.
     */
    setLastReadByChannel((prev) => {
      const next = { ...prev };
      let changed = false;

      for (const [channelId, message] of Object.entries(byChannel)) {
        if (!message) continue;

        if (!next[channelId]) {
          next[channelId] = message.created_at;
          changed = true;
        }
      }

      if (changed) {
        const uid = userIdRef.current;

        if (uid) {
          saveStoredReadState(uid, next);
        }
      }

      return changed ? next : prev;
    });

    setLastMessages(byChannel);
  }, [profile, user]);

  // Recharge les messages quand le backend signale un changement via WebSocket
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const refresh = async () => {
      if (cancelled) return;

      try {
        await loadAllLastMessages();
      } catch (error) {
        console.error('Erreur chargement messages non lus:', error);
      }
    };

    // Chargement immédiat à la connexion
    refresh();

    // Second passage pour éviter la course au démarrage
    const retryTimer = window.setTimeout(() => {
      refresh();
    }, 500);

    // Temps réel
    const unsubscribe = subscribeToChanges(() => {
      refresh();
    });

    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
      unsubscribe();
    };
  }, [user, loadAllLastMessages]);

  // Charge la dernière activité pour les notifications admin
  const loadLatestActivity = useCallback(async () => {
    if (!profile?.organization_id) return;
    const act = await getLatestActivity(profile.organization_id);
    setLastActivity(act as unknown as ActivityLog | null);
  }, [profile]);

  useEffect(() => {
    if (!user || profile?.role !== 'admin') return;
    loadLatestActivity();
    const unsubscribe = subscribeToChanges(() => loadLatestActivity());
    return unsubscribe;
  }, [user, profile?.role, loadLatestActivity]);

  const markChannelRead = useCallback((channelId: string, lastMessageAt: string) => {
    setLastReadByChannel((prev) => {
      if (prev[channelId] && new Date(prev[channelId]).getTime() >= new Date(lastMessageAt).getTime()) {
        return prev;
      }
      const next = { ...prev, [channelId]: lastMessageAt };
      const uid = userIdRef.current;
      if (uid) saveStoredReadState(uid, next);
      return next;
    });
  }, []);

  const markActivitySeen = useCallback(() => {
    const now = new Date().toISOString();
    setActivitySeenAt(now);
    const uid = userIdRef.current;
    if (uid) saveStoredActivitySeen(uid, now);
  }, []);

  const isChannelUnread = useCallback((channelId: string): boolean => {
    const lastMsg = lastMessages[channelId];
    if (!lastMsg || lastMsg.sender_id === user?.id) return false;
    const lastRead = lastReadByChannel[channelId];
    if (!lastRead) return true;
    return new Date(lastMsg.created_at).getTime() > new Date(lastRead).getTime();
  }, [lastMessages, lastReadByChannel, user]);

  const unreadByChannel: Record<string, number> = {};
  for (const chId of Object.keys(lastMessages)) {
    if (isChannelUnread(chId)) unreadByChannel[chId] = 1;
  }
  const unreadCount = Object.keys(unreadByChannel).length;

  const unreadActivityCount = (() => {
    if (profile?.role !== 'admin' || !lastActivity) return 0;
    if (!activitySeenAt) return 1;
    return new Date(lastActivity.created_at).getTime() > new Date(activitySeenAt).getTime() ? 1 : 0;
  })();

  return (
    <UnreadContext.Provider value={{ unreadCount, unreadByChannel, lastReadByChannel, markChannelRead, isChannelUnread, lastMessages, unreadActivityCount, markActivitySeen }}>
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnreadMessages() {
  const ctx = useContext(UnreadContext);
  if (!ctx) throw new Error('useUnreadMessages must be used within UnreadMessagesProvider');
  return ctx;
}