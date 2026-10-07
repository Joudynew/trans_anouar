import { type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { useUnreadMessages } from '@/lib/unreadMessages';
import { LayoutDashboard, CalendarDays, Users, Activity, MessageSquare, LogOut, Zap, Building2 } from 'lucide-react';

export type AdminPage = 'dashboard' | 'planning' | 'teams' | 'organizations' | 'activity' | 'messages';

const NAV: { id: AdminPage; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'planning', label: 'Planification', icon: CalendarDays },
  { id: 'teams', label: 'Équipe', icon: Users },
  { id: 'organizations', label: 'Organisations', icon: Building2 },
  { id: 'activity', label: 'Activité', icon: Activity },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
];

export function AdminLayout({
  page,
  setPage,
  isSuperAdmin = false,
  children,
  topBar,
}: {
  page: AdminPage;
  setPage: (p: AdminPage) => void;
  isSuperAdmin?: boolean;
  children: ReactNode;
  topBar?: ReactNode;
}) {
  const { profile, signOut } = useAuth();
  const { unreadCount, unreadActivityCount } = useUnreadMessages();

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-white/[0.06] bg-[#0d0d0f] shrink-0">
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-white/[0.06]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">FibreFlow</div>
            <div className="text-[10px] text-slate-500">Gestion d'interventions</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.filter((n) => n.id !== 'organizations' || isSuperAdmin).map((n) => (
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
                {n.id === 'activity' && unreadActivityCount > 0 && (
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
              <div className="text-[10px] text-slate-500">Administrateur</div>
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

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d0f] border-t border-white/[0.06] flex justify-around px-2 py-2">
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => setPage(n.id)}
            className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors relative ${
              page === n.id ? 'text-sky-300' : 'text-slate-500'
            }`}
          >
            <span className="relative">
              <n.icon size={20} />
              {n.id === 'messages' && unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-[#0d0d0f] animate-pulse" />
              )}
              {n.id === 'activity' && unreadActivityCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-[#0d0d0f] animate-pulse" />
              )}
            </span>
            {n.label}
          </button>
        ))}
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
          {topBar}
          {children}
        </div>

        {/* Same footer links, also visible on mobile below the content */}
        <div className="md:hidden max-w-6xl mx-auto px-4 pb-24 flex items-center justify-center gap-2 text-[10px] text-slate-600">
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

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  value: number | string;
  sub?: string;
  accent: 'sky' | 'emerald' | 'rose' | 'amber';
}) {
  const accentColor = {
    sky: 'text-sky-400 bg-sky-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
    rose: 'text-rose-400 bg-rose-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
  }[accent];

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500 font-medium">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accentColor}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="text-2xl sm:text-3xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}
