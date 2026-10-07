import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function Spinner({ size = 20 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin text-slate-500" />;
}

export function FullPageLoader({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center gap-3">
      <Spinner size={32} />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description }: { icon: ReactNode; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center mb-3">
        {Icon}
      </div>
      <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
      {description && <p className="text-xs text-slate-500 mt-1 max-w-xs">{description}</p>}
    </div>
  );
}
