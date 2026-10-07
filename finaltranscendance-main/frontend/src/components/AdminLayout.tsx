import { type ReactNode, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useUnreadMessages } from '@/lib/unreadMessages';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Activity,
  MessageSquare,
  LogOut,
  Zap,
  Building2,
  MoreHorizontal,
} from 'lucide-react';

export type AdminPage =
  | 'dashboard'
  | 'planning'
  | 'teams'
  | 'organizations'
  | 'activity'
  | 'messages';

const NAV: {
  id: AdminPage;
  label: string;
  icon: typeof LayoutDashboard;
}[] = [
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const visibleNav = NAV.filter(
    (n) => n.id !== 'organizations' || isSuperAdmin
  );

  const mobileMainNav = visibleNav.filter((n) =>
    ['dashboard', 'planning', 'teams', 'activity'].includes(n.id)
  );

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex">

      {/* ==================== SIDEBAR DESKTOP ==================== */}
      <aside className="hidden md:flex w-60 flex-col border-r border-white/[0.06] bg-[#0d0d0f] shrink-0">

        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-white/[0.06]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>

          <div>
            <div className="text-sm font-bold text-white">
              FibreFlow
            </div>

            <div className="text-[10px] text-slate-500">
              Gestion d'interventions
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5">
          {visibleNav.map((n) => (
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

        {/* Profil + déconnexion */}
        <div className="p-3 border-t border-white/[0.06]">

          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">
              {profile?.full_name?.charAt(0) ?? '?'}
            </div>

            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-200 truncate">
                {profile?.full_name}
              </div>

              <div className="text-[10px] text-slate-500">
                Administrateur
              </div>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 transition-colors"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </aside>

            {/* ==================== NAVIGATION MOBILE ==================== */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d0f] border-t border-white/[0.06]">

        <div className="flex items-stretch w-full px-1 py-1.5">

          {mobileMainNav.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                setPage(n.id);
                setMobileMenuOpen(false);
              }}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg text-[9px] font-medium transition-colors ${
                page === n.id
                  ? 'text-sky-300'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="relative shrink-0">
                <n.icon size={19} />

                {n.id === 'activity' && unreadActivityCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-[#0d0d0f] animate-pulse" />
                )}
              </span>

              <span className="truncate max-w-full px-0.5">
                {n.label}
              </span>
            </button>
          ))}

          {/* Messages */}
          <button
            onClick={() => {
              setPage('messages');
              setMobileMenuOpen(false);
            }}
            className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg text-[9px] font-medium transition-colors ${
              page === 'messages'
                ? 'text-sky-300'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span className="relative shrink-0">
              <MessageSquare size={19} />

              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-[#0d0d0f] animate-pulse" />
              )}
            </span>

            <span className="truncate max-w-full px-0.5">
              Messages
            </span>
          </button>

          {/* Plus */}
          <button
            onClick={() => setMobileMenuOpen((value) => !value)}
            className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg text-[9px] font-medium transition-colors ${
              mobileMenuOpen
                ? 'text-sky-300'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <MoreHorizontal size={19} />
            <span>Plus</span>
          </button>

        </div>

        {/* ==================== MENU PLUS ==================== */}
        {mobileMenuOpen && (
          <div className="absolute bottom-full right-2 mb-2 w-56 rounded-xl border border-white/[0.08] bg-[#111114] shadow-2xl overflow-hidden">

            {/* Organisations - Super Admin uniquement */}
            {isSuperAdmin && (
              <button
                onClick={() => {
                  setPage('organizations');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  page === 'organizations'
                    ? 'text-sky-300 bg-sky-500/10'
                    : 'text-slate-300 hover:bg-white/[0.04]'
                }`}
              >
                <Building2 size={18} />

                <span className="flex-1 text-left">
                  Organisations
                </span>
              </button>
            )}

            {/* Déconnexion */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                signOut();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-400 hover:bg-rose-500/5 transition-colors"
            >
              <LogOut size={18} />

              <span>
                Déconnexion
              </span>
            </button>

          </div>
        )}
      </div>


      {/* ==================== CONTENU PRINCIPAL ==================== */}
      <main className="flex-1 min-w-0 overflow-y-auto pb-20 md:pb-0">

        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">

          {topBar}

          {children}

        </div>
      </main>
    </div>
  );
}

/* ==================== PAGE HEADER ==================== */

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">

      <div>
        <h1 className="text-2xl font-bold text-white">
          {title}
        </h1>

        {subtitle && (
          <p className="text-sm text-slate-500 mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {action && (
        <div className="shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}

/* ==================== STAT CARD ==================== */

export function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  sub,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  value: string | number;
  accent: 'sky' | 'emerald' | 'rose' | 'amber';
  sub?: string;
}) {
  const colors = {
    sky: {
      icon: 'text-sky-400',
      bg: 'bg-sky-500/10',
    },
    emerald: {
      icon: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    rose: {
      icon: 'text-rose-400',
      bg: 'bg-rose-500/10',
    },
    amber: {
      icon: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
  };

  const color = colors[accent];

  return (
    <div className="card p-4 sm:p-5">

      <div className="flex items-start justify-between gap-3">

        <div className="min-w-0">

          <p className="text-xs sm:text-sm text-slate-500 truncate">
            {label}
          </p>

          <p className="text-2xl sm:text-3xl font-bold text-white mt-1">
            {value}
          </p>

          {sub && (
            <p className="text-[10px] sm:text-xs text-slate-600 mt-1 truncate">
              {sub}
            </p>
          )}

        </div>

        <div
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${color.bg}`}
        >
          <Icon size={20} className={color.icon} />
        </div>

      </div>
    </div>
  );
}
