import { type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { getUnreadNotificationCount } from '@/lib/api';
import { useUnreadMessages } from '@/lib/unreadMessages';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { LayoutDashboard, ClipboardList, MessageSquare, Bell, Users, LogOut, Zap, ArrowLeft } from 'lucide-react';

export type TechPage = 'dashboard' | 'interventions' | 'messages' | 'friends' | 'notifications';

const NAV: { id: TechPage; label: string; icon: typeof ClipboardList }[] = [
  { id: 'dashboard', label: 'Accueil', icon: LayoutDashboard },
  { id: 'interventions', label: 'Interventions', icon: ClipboardList },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'friends', label: 'Amis', icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

export function TechLayout({
  page,
  setPage,
  children,
  backAction,
  title,
  rightSlot,
}: {
  page: TechPage;
  setPage: (p: TechPage) => void;
  children: ReactNode;
  backAction?: () => void;
  title: string;
  rightSlot?: ReactNode;
}) {
  const { profile, signOut } = useAuth();
  const { unreadCount } = useUnreadMessages();
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [friendRequestCount, setFriendRequestCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadNotificationCount = async () => {
      try {
        const count = await getUnreadNotificationCount();
        if (mounted) {
          setUnreadNotificationCount(count);
        }
      } catch (error) {
        console.error('Erreur compteur notifications:', error);
      }
    };

    loadNotificationCount();

    const interval = setInterval(loadNotificationCount, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);
  useEffect(() => {
    let mounted = true;

    const loadFriendRequestCount = async () => {
      try {
        const response = await apiFetch(
          `${import.meta.env.VITE_API_URL}/friends/requests`
        );

        if (!response.ok) return;

        const data = await response.json();

        if (mounted) {
          setFriendRequestCount(Array.isArray(data) ? data.length : 0);
        }
      } catch (error) {
        console.error('Erreur demandes amis:', error);
      }
    };

    loadFriendRequestCount();

    const interval = setInterval(loadFriendRequestCount, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex w-60 flex-col border-r border-white/[0.06] bg-[#0d0d0f] shrink-0">
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-white/[0.06]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">FibreFlow</div>
            <div className="text-[10px] text-slate-500">Espace technicien</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setPage(n.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
                page === n.id
                  ? 'bg-sky-500/10 text-sky-300'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <span className="relative">
                <n.icon size={18} />
                {n.id === 'messages' && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-[#0d0d0f] animate-pulse" />
                )}
                {n.id === 'notifications' && unreadNotificationCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-[#0d0d0f] animate-pulse" />
                )}

                {n.id === 'friends' && friendRequestCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-[#0d0d0f] animate-pulse" />
                )}

              </span>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">
              {profile?.full_name?.charAt(0) ?? '?'}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-200 truncate">{profile?.full_name}</div>
              <div className="text-[10px] text-slate-500">Technicien</div>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 transition-colors"
          >
            <LogOut size={18} />
            Déconnexion
          </button>

          {/* Privacy Policy / Terms links, reachable from every page once
              logged in (subject requirement). */}
          <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-center gap-2 text-[10px] text-slate-600">
            <a href="/privacy-policy" className="hover:text-slate-400 hover:underline">
              Confidentialité
            </a>
            <span>·</span>
            <a href="/terms" className="hover:text-slate-400 hover:underline">
              CGU
            </a>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#0d0d0f] border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            {backAction && (
              <button onClick={backAction} className="btn-ghost p-1.5 rounded-lg">
                <ArrowLeft size={20} />
              </button>
            )}
            <span className="text-sm font-semibold text-white">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            {rightSlot}

            <button
              onClick={() => signOut()}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Déconnexion"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d0f] border-t border-white/[0.06] flex justify-around px-2 py-2">
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => { setPage(n.id); backAction?.(); }}
            className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors relative ${
              page === n.id ? 'text-sky-300' : 'text-slate-500'
            }`}
          >
            <span className="relative">
              <n.icon size={20} />
              {n.id === 'messages' && unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-[#0d0d0f] animate-pulse" />
              )}
              {n.id === 'notifications' && unreadNotificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-[#0d0d0f] animate-pulse" />
              )}

            </span>
            {n.label}
          </button>
        ))}
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto pt-14 pb-20 md:pt-0 md:pb-0">
        {/* Desktop header */}
        <div className="hidden md:flex items-center justify-between px-8 py-5 border-b border-white/[0.06] sticky top-0 bg-[#0a0a0c]/80 backdrop-blur-md z-30">
          <div className="flex items-center gap-3">
            {backAction && (
              <button onClick={backAction} className="btn-ghost p-2 rounded-lg">
                <ArrowLeft size={18} />
              </button>
            )}
            <h1 className="text-lg font-bold text-white">{title}</h1>
          </div>
          {rightSlot}
        </div>
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>

        {/* Same footer links, also visible on mobile below the content */}
        <div className="md:hidden max-w-5xl mx-auto px-4 pb-24 flex items-center justify-center gap-2 text-[10px] text-slate-600">
          <a href="/privacy-policy" className="hover:text-slate-400 hover:underline">
            Confidentialité
          </a>
          <span>·</span>
          <a href="/terms" className="hover:text-slate-400 hover:underline">
            CGU
          </a>
        </div>
      </main>
    </div>
  );
}
