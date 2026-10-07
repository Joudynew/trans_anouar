from pathlib import Path

path = Path("frontend/src/components/AdminLayout.tsx")

text = path.read_text(encoding="utf-8")

old = """      {/* ==================== NAVIGATION MOBILE ==================== */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d0f] border-t border-white/[0.06]">

        <div className="flex items-center px-1 py-2">

          {mobileMainNav.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                setPage(n.id);
                setMobileMenuOpen(false);
              }}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 py-1 rounded-lg text-[9px] font-medium transition-colors ${
                page === n.id
                  ? 'text-sky-300'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="relative">
                <n.icon size={20} />

                {n.id === 'activity' && unreadActivityCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-[#0d0d0f] animate-pulse" />
                )}
              </span>

              <span className="truncate max-w-full">
                {n.label}
              </span>
            </button>
          ))}

          {/* Bouton Plus */}
          <button
            onClick={() => setMobileMenuOpen((value) => !value)}
            className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 py-1 rounded-lg text-[9px] font-medium transition-colors ${
              mobileMenuOpen
                ? 'text-sky-300'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span className="relative">
              <MoreHorizontal size={20} />

              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-[#0d0d0f] animate-pulse" />
              )}
            </span>

            <span>Plus</span>
          </button>
        </div>

        {/* ==================== MENU PLUS ==================== */}
        {mobileMenuOpen && (
          <div className="absolute bottom-full right-2 mb-2 w-56 rounded-xl border border-white/[0.08] bg-[#111114] shadow-2xl overflow-hidden">

            {/* Messages */}
            <button
              onClick={() => {
                setPage('messages');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                page === 'messages'
                  ? 'text-sky-300 bg-sky-500/10'
                  : 'text-slate-300 hover:bg-white/[0.04]'
              }`}
            >
              <MessageSquare size={18} />

              <span className="flex-1 text-left">
                Messages
              </span>

              {unreadCount > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>

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

            <div className="border-t border-white/[0.06]" />

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
"""

new = """      {/* ==================== NAVIGATION MOBILE ==================== */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d0f] border-t border-white/[0.06]">

        <div className="flex items-center px-1 py-2">

          {/* 4 boutons principaux : toujours visibles */}
          {mobileMainNav.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                setPage(n.id);
                setMobileMenuOpen(false);
              }}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 py-1 rounded-lg text-[9px] font-medium transition-colors ${
                page === n.id
                  ? 'text-sky-300'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="relative">
                <n.icon size={20} />

                {n.id === 'activity' && unreadActivityCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-[#0d0d0f] animate-pulse" />
                )}
              </span>

              <span className="truncate max-w-full">
                {n.label}
              </span>
            </button>
          ))}

          {/* Bouton Plus */}
          <button
            onClick={() => setMobileMenuOpen((value) => !value)}
            className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 py-1 rounded-lg text-[9px] font-medium transition-colors ${
              mobileMenuOpen
                ? 'text-sky-300'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span className="relative">
              <MoreHorizontal size={20} />

              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-[#0d0d0f] animate-pulse" />
              )}
            </span>

            <span>Plus</span>
          </button>
        </div>

        {/* ==================== MENU PLUS ==================== */}
        {mobileMenuOpen && (
          <div className="absolute bottom-full right-2 mb-2 w-56 rounded-xl border border-white/[0.08] bg-[#111114] shadow-2xl overflow-hidden">

            {/* Messages */}
            <button
              onClick={() => {
                setPage('messages');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                page === 'messages'
                  ? 'text-sky-300 bg-sky-500/10'
                  : 'text-slate-300 hover:bg-white/[0.04]'
              }`}
            >
              <MessageSquare size={18} />

              <span className="flex-1 text-left">
                Messages
              </span>

              {unreadCount > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>

            {/* Organisations : Super Admin uniquement */}
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

            <div className="border-t border-white/[0.06]" />

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
"""

if old not in text:
    print("ERREUR : le bloc mobile attendu n'a pas été trouvé.")
    print("Aucune modification effectuée.")
    raise SystemExit(1)

path.write_text(text.replace(old, new), encoding="utf-8")

print("OK : navigation mobile Admin corrigée.")
print("- 4 boutons principaux")
print("- Messages dans Plus")
print("- Déconnexion dans Plus")
print("- Organisations uniquement pour Super Admin")
