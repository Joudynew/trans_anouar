import { Avatar } from "@/components/Avatar";
import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Check,
  X,
  Trash2,
  Search,
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type FriendUser = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  status: string;
};

type Friend = {
  id: string;
  user: FriendUser;
  status: string;
};

type FriendRequest = {
  id: string;
  requester: FriendUser;
  status: string;
};

export function TechFriends() {
  const { toast } = useToast();
  const { profile } = useAuth();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [users, setUsers] = useState<FriendUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  const apiUrl = import.meta.env.VITE_API_URL;
  const orgId = profile?.organization_id;

  const loadFriends = useCallback(async () => {
    if (!orgId) return;

    try {
      const [friendsResponse, requestsResponse, usersResponse] =
        await Promise.all([
          apiFetch(`${apiUrl}/friends`),
          apiFetch(`${apiUrl}/friends/requests`),
          apiFetch(`${apiUrl}/users/org/${orgId}`),
        ]);

      if (
        !friendsResponse.ok ||
        !requestsResponse.ok ||
        !usersResponse.ok
      ) {
        throw new Error('Impossible de charger les amis');
      }

      const friendsData = await friendsResponse.json();
      const requestsData = await requestsResponse.json();
      const usersData = await usersResponse.json();

      setFriends(Array.isArray(friendsData) ? friendsData : []);
      setRequests(Array.isArray(requestsData) ? requestsData : []);

      const usersList = Array.isArray(usersData) ? usersData : usersData.users ?? [];
      setUsers(
        usersList
          .filter((u: FriendUser) => u.id !== profile?.id)
          .map((u: FriendUser) => ({
            id: u.id,
            fullName: u.fullName,
            email: u.email,
            avatarUrl: u.avatarUrl ?? null,
            status: u.status,
          }))
      );
    } catch (error) {
      toast(
        error instanceof Error ? error.message : 'Erreur de chargement',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, [orgId, apiUrl, profile?.id, toast]);

  useEffect(() => {
    if (!profile?.id || !orgId) return;

    loadFriends();

    const interval = setInterval(loadFriends, 3000);

    return () => clearInterval(interval);
  }, [profile?.id, orgId, loadFriends]);

  const friendIds = useMemo(
    () => new Set(friends.map((friend) => friend.user.id)),
    [friends]
  );

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return users
      .filter((user) => !friendIds.has(user.id))
      .filter((user) => {
        if (!query) return true;

        return (
          user.fullName.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
        );
      });
  }, [users, search, friendIds]);

  const sendRequest = async (userId: string) => {
    setSending(userId);
    try {
      const response = await apiFetch(
        `${import.meta.env.VITE_API_URL}/friends/${userId}`,
        { method: 'POST' }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Impossible d’envoyer la demande');
      }

      toast('Demande d’amitié envoyée.', 'success');
      await loadFriends();
    } catch (error) {
      toast(
        error instanceof Error ? error.message : 'Erreur lors de l’envoi',
        'error'
      );
    } finally {
      setSending(null);
    }
  };

  const acceptRequest = async (id: string) => {
    try {
      const response = await apiFetch(
        `${apiUrl}/friends/${id}/accept`,
        { method: 'PATCH' }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur');
      }

      toast('Demande acceptée.', 'success');
      await loadFriends();
    } catch (error) {
      toast(
        error instanceof Error ? error.message : 'Erreur',
        'error'
      );
    }
  };

  const rejectRequest = async (id: string) => {
    try {
      const response = await apiFetch(
        `${apiUrl}/friends/${id}/reject`,
        { method: 'PATCH' }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur');
      }

      toast('Demande refusée.', 'success');
      await loadFriends();
    } catch (error) {
      toast(
        error instanceof Error ? error.message : 'Erreur',
        'error'
      );
    }
  };

  const removeFriend = async (id: string) => {
    if (!window.confirm('Supprimer cet ami ?')) return;

    try {
      const response = await apiFetch(
        `${apiUrl}/friends/${id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur');
      }

      toast('Ami supprimé.', 'success');
      await loadFriends();
    } catch (error) {
      toast(
        error instanceof Error ? error.message : 'Erreur',
        'error'
      );
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">Mes amis</h2>
        <p className="text-sm text-slate-500 mt-1">
          Gérez vos contacts et vos demandes d'amitié.
        </p>
      </div>

      {/* Recherche / ajout */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus size={18} className="text-sky-400" />
          <h3 className="font-semibold text-white">
            Ajouter un ami
          </h3>
        </div>

        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
            placeholder="Rechercher par nom ou email..."
          />
        </div>

        {search.trim() && (
          <div className="mt-3 space-y-2">
            {filteredUsers.length === 0 ? (
              <p className="text-sm text-slate-500 py-3">
                Aucun utilisateur trouvé.
              </p>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/[0.03]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center text-sm font-bold text-white shrink-0">
                      {user.fullName.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-200 truncate">
                        {user.fullName}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {user.email}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => sendRequest(user.id)}
                    disabled={sending === user.id}
                    className="btn-primary shrink-0"
                  >
                    <UserPlus size={14} />
                    {sending === user.id ? '...' : 'Ajouter'}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Demandes reçues */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-sky-400" />
            <h3 className="font-semibold text-white">
              Demandes reçues
            </h3>
          </div>

          {requests.length > 0 && (
            <span className="chip bg-sky-500/10 text-sky-300 border border-sky-500/20">
              {requests.length}
            </span>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">
            Chargement...
          </p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-slate-500">
            Aucune demande en attente.
          </p>
        ) : (
          <div className="space-y-2">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/[0.03]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center text-sm font-bold text-white">
                    {request.requester.fullName.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-200 truncate">
                      {request.requester.fullName}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {request.requester.email}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => acceptRequest(request.id)}
                    className="btn-primary"
                    title="Accepter"
                  >
                    <Check size={14} />
                  </button>

                  <button
                    onClick={() => rejectRequest(request.id)}
                    className="btn-secondary"
                    title="Refuser"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Amis */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-sky-400" />
            <h3 className="font-semibold text-white">
              Mes amis
            </h3>
          </div>

          <span className="chip bg-white/[0.04] text-slate-300 border border-white/[0.06]">
            {friends.length}
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">
            Chargement...
          </p>
        ) : friends.length === 0 ? (
          <p className="text-sm text-slate-500">
            Vous n'avez pas encore d'amis.
          </p>
        ) : (
          <div className="space-y-2">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/[0.03]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center text-sm font-bold text-white">
                    {friend.user.fullName.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-200 truncate">
                      {friend.user.fullName}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {friend.user.email}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => removeFriend(friend.id)}
                  className="btn-secondary shrink-0"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}