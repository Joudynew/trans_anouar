// CLAUDE-MODIF (2026-10-07) — MODIFIÉ : directives eslint-disable inutiles supprimées.
/**
 * ============================================================
 * CONTEXTE D'AUTHENTIFICATION (remplace Supabase Auth)
 * ============================================================
 *
 * Fournit l'utilisateur connecté et son profil à toute l'application.
 * Remplace complètement l'ancien auth.tsx qui utilisait Supabase.
 *
 * Fonctionnement :
 * 1. Au chargement, on lit la session depuis localStorage
 * 2. Si une session valide existe, on charge le profil depuis la BDD locale
 * 3. signIn() vérifie l'email + mot de passe via la BDD locale
 * 4. signOut() détruit la session
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { getUserById } from './api';

// Type du profil exposé à l'application (sans le hash du mot de passe)
export interface LocalProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: 'super_admin' | 'admin' | 'technician';
  status: 'active' | 'inactive';
  organization_id: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface AuthContextValue {
  user: { id: string; email: string } | null;
  profile: LocalProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Convertit une ligne BDD en profil (sans le hash)
  const toProfile = (u: Awaited<ReturnType<typeof getUserById>>): LocalProfile => ({
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    phone: u.phone,
    role: u.role as LocalProfile['role'],
    status: u.status as LocalProfile['status'],
    organization_id: u.organization_id,
    avatar_url: u.avatar_url ?? null,
    created_at: u.created_at,
  });

  // Au chargement : restaure la session JWT et vérifie le profil
  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));

      if (!payload.exp || payload.exp * 1000 <= Date.now()) {
        localStorage.removeItem('token');
        setLoading(false);
        return;
      }

      getUserById(payload.userId || payload.id || payload.sub)
        .then((u) => {
          if (u) {
            setProfile(toProfile(u));
          } else {
            localStorage.removeItem('token');
          }
        })
        .catch(() => {
          localStorage.removeItem('token');
          setProfile(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } catch {
      localStorage.removeItem('token');
      setProfile(null);
      setLoading(false);
    }
  }, []);

  // Connexion : vérifie email + mot de passe contre la BDD locale
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data.error || 'Email ou mot de passe incorrect.'
        };
      }

      localStorage.setItem('token', data.token);

      setProfile({
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.fullName,
        phone: data.user.phone,
        role:
          data.user.role.toLowerCase() === 'super_admin'
            ? 'super_admin'
            : data.user.role.toLowerCase() === 'admin'
              ? 'admin'
              : 'technician',
        status: data.user.status,
        organization_id: data.user.organizationId,
        avatar_url: data.user.avatarUrl,
        created_at: data.user.createdAt,
      });

      return { error: null };

    } catch (err) {
      return {
        error: err instanceof Error
          ? err.message
          : 'Erreur de connexion.'
      };
    }
  }, []);

  // Inscription : crée un nouveau compte technicien
  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
            fullName: fullName.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data.error || 'Erreur lors de la création du compte.'
        };
      }

      localStorage.setItem('token', data.token);

      setProfile({
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.fullName,
        phone: data.user.phone,
        role: data.user.role.toLowerCase() === 'admin'
          ? 'admin'
          : 'technician',
        status: data.user.status.toLowerCase(),
        organization_id: data.user.organizationId,
        avatar_url: data.user.avatarUrl,
        created_at: data.user.createdAt,
      });

      return { error: null };

    } catch (err) {
      return {
        error: err instanceof Error
          ? err.message
          : 'Erreur lors de la création du compte.'
      };
    }
  }, []);

  // Déconnexion
  const signOut = useCallback(async () => {
    localStorage.removeItem('token');
    setProfile(null);
  }, []);

  const user = profile ? { id: profile.id, email: profile.email } : null;

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}