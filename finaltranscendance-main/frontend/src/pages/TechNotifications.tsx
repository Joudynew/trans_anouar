import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { Spinner, EmptyState } from '@/components/Feedback';
import { timeAgo } from '@/lib/constants';
import { Bell, UserPlus, UserCheck } from 'lucide-react';

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  friendshipId: string | null;
  createdAt: string;
};

export function TechNotifications() {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;

    try {
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/notifications`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erreur notifications');
      }

      const data = await response.json();
      setNotifications(data);
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();

    const interval = setInterval(load, 3000);

    return () => clearInterval(interval);
  }, [load]);

  const markAsRead = async (notification: Notification) => {
    if (notification.read) return;

    try {
      const token = localStorage.getItem('token');

      await fetch(
        `${import.meta.env.VITE_API_URL}/notifications/${notification.id}/read`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id
            ? { ...n, read: true }
            : n
        )
      );
    } catch (error) {
      console.error('Erreur lecture notification:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 sm:p-5">
        <div className="flex items-center gap-2.5 mb-1">
          <Bell size={18} className="text-sky-400" />
          <h2 className="text-base font-semibold text-white">
            Notifications
          </h2>
        </div>

        <p className="text-sm text-slate-500">
          Vos demandes d’amitié et autres notifications
        </p>
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell size={24} className="text-slate-500" />}
          title="Aucune notification"
          description="Vos nouvelles notifications apparaîtront ici."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const isRequest =
              notification.type === 'friend_request';

            return (
              <button
                key={notification.id}
                onClick={() => markAsRead(notification)}
                className={`w-full text-left card p-4 flex items-start gap-3 transition-colors ${
                  !notification.read
                    ? 'border-sky-500/20 bg-sky-500/[0.03]'
                    : ''
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isRequest
                      ? 'text-sky-400 bg-sky-500/10'
                      : 'text-emerald-400 bg-emerald-500/10'
                  }`}
                >
                  {isRequest ? (
                    <UserPlus size={17} />
                  ) : (
                    <UserCheck size={17} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-slate-200">
                      {notification.title}
                    </div>

                    {!notification.read && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    )}
                  </div>

                  <div className="text-xs text-slate-400 mt-1">
                    {notification.message}
                  </div>

                  <div className="text-[10px] text-slate-600 mt-1">
                    {timeAgo(notification.createdAt)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}