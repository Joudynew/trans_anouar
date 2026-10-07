import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Spinner } from '@/components/Feedback';
import { Zap } from 'lucide-react';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signin') {
      const { error: signInError } = await signIn(email.trim(), password);

      if (signInError) {
        setError(signInError);
        setLoading(false);
      }
    } else {
      const { error: signUpError } = await signUp(
        email.trim(),
        password,
        fullName.trim()
      );

      if (signUpError) {
        setError(signUpError);
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center mb-3">
            <Zap size={24} className="text-white" />
          </div>

          <h1 className="text-xl font-bold text-white">FibreFlow</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestion d'interventions fibre
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="label">Nom complet</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input"
                placeholder="Jean Dupont"
                required
                autoFocus
              />
            </div>
          )}

          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="vous@entreprise.fr"
              required
              autoFocus={mode === 'signin'}
            />
          </div>

          <div>
            <label className="label">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 break-words">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center"
          >
            {loading ? <Spinner size={18} /> : null}
            {mode === 'signin' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>

        <div className="text-center mt-4">
          {mode === 'signin' ? (
            <button
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className="text-xs text-slate-500 hover:text-sky-400 transition-colors"
            >
              Pas de compte ? Créer un compte technicien
            </button>
          ) : (
            <button
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className="text-xs text-slate-500 hover:text-sky-400 transition-colors"
            >
              Déjà un compte ? Se connecter
            </button>
          )}
        </div>

        <div className="flex justify-center gap-4 mt-6 text-xs text-slate-500">
          <button
            type="button"
            onClick={() => {
              window.location.href = '/privacy-policy';
            }}
            className="hover:text-sky-400 transition-colors"
          >
            Politique de confidentialité
          </button>

          <span>·</span>

          <button
            type="button"
            onClick={() => {
              window.location.href = '/terms';
            }}
            className="hover:text-sky-400 transition-colors"
          >
            Conditions d'utilisation
          </button>
        </div>
      </div>
    </div>
  );
}
