# Changements faits par Claude (2026-10-07)

Chaque fichier ajouté ou modifié contient un commentaire `CLAUDE-MODIF` (en haut du fichier ; en bas pour le README).
Pour tous les retrouver : `grep -rn "CLAUDE-MODIF" .`

## Fichiers ajoutés / modifiés

- `.env.example` — NOUVEAU fichier : modèle des variables d'environnement (exigé par le sujet).
- `.gitignore` — NOUVEAU fichier : ignore .env, node_modules, builds, certificats, uploads.
- `Makefile` — NOUVEAU fichier : déploiement en une commande (`make`), crée .env avec secrets aléatoires.
- `README.md` — NOUVEAU fichier : squelette du README exigé par le sujet (sections TODO à compléter).
- `backend/.dockerignore` — NOUVEAU fichier : exclut node_modules/dist/.env de l'image Docker.
- `backend/src/index.ts` — MODIFIÉ : express-async-errors (plus de crash), middleware d'erreur global, CORS via FRONTEND_URL, en-têtes nosniff sur /uploads, seed du super admin.
- `backend/src/lib/jwt.ts` — MODIFIÉ : arrêt clair si JWT_SECRET absent/trop court, vérification du contenu du token.
- `backend/src/middleware/auth.ts` — MODIFIÉ : middleware async, rejet des comptes INACTIVE, ajout authRole + helpers isAdmin / isInCallerOrg / publicUserSelect.
- `backend/src/routes/friends.ts` — MODIFIÉ : utilise le PrismaClient partagé (lib/prisma) au lieu d'en créer un nouveau.
- `backend/src/routes/interventions.ts` — MODIFIÉ : validation Zod (création, statut, activité, rapports, satisfaction), création réservée aux admins, statut modifiable par le technicien assigné ou un admin, contrôles d'organisation, passwordHash retiré de l'activité.
- `backend/src/routes/messages.ts` — MODIFIÉ : contrôle d'organisation (liste/création de salons, ajout de membres), passwordHash retiré (sender), longueur des messages limitée.
- `backend/src/routes/notifications.ts` — MODIFIÉ : utilise le PrismaClient partagé (lib/prisma).
- `backend/src/routes/organizations.ts` — MODIFIÉ : validation Zod du nom d'organisation (création/modification).
- `backend/src/routes/users.ts` — MODIFIÉ : extension d'avatar déduite du type MIME (anti-upload .html), plus de log du mot de passe, validation email/nom/téléphone au PATCH.
- `backend/src/seed.ts` — NOUVEAU fichier : crée le premier SUPER_ADMIN au démarrage depuis le .env (remplace prisma/create-admin.ts).
- `backend/src/ws.ts` — MODIFIÉ : WebSocket authentifié par JWT (?token=), diffusion limitée à la même organisation.
- `docker-compose.yml` — MODIFIÉ : variables via .env, restart, adminer retiré, nginx construit (certs auto), ports 8080/8443 configurables.
- `frontend/.dockerignore` — NOUVEAU fichier : exclut node_modules/dist/.env de l'image Docker.
- `frontend/Dockerfile` — MODIFIÉ : build multi-étapes, fichiers statiques servis par nginx (au lieu de vite preview), VITE_API_URL=/api par défaut.
- `frontend/index.html` — MODIFIÉ : ajout d'un favicon (évite une erreur 404 dans la console Chrome) et d'une meta description.
- `frontend/nginx-spa.conf` — NOUVEAU fichier : sert le build React avec fallback SPA (/terms, /privacy-policy, /satisfaction/...).
- `frontend/src/components/TechLayout.tsx` — MODIFIÉ : import inutilisé (Avatar) supprimé (erreur ESLint).
- `frontend/src/lib/auth.tsx` — MODIFIÉ : directives eslint-disable inutiles supprimées.
- `frontend/src/lib/realtime.ts` — MODIFIÉ : envoie le token JWT au WebSocket, se connecte seulement si connecté, se reconnecte au changement de compte.
- `frontend/src/lib/unreadMessages.tsx` — MODIFIÉ : erreurs ESLint react-hooks/set-state-in-effect traitées.
- `frontend/src/pages/AdminPlanning.tsx` — MODIFIÉ : techName en useCallback (avertissement react-hooks/exhaustive-deps).
- `frontend/src/pages/TechFriends.tsx` — MODIFIÉ : import inutilisé supprimé + erreur ESLint set-state-in-effect traitée.
- `frontend/src/pages/TechProfileModal.tsx` — MODIFIÉ : suppression d'un `any` (erreur ESLint).
- `nginx/Dockerfile` — NOUVEAU fichier : image nginx qui génère le certificat TLS au démarrage et rend le template de config.
- `nginx/generate-certs.sh` — MODIFIÉ : exécuté automatiquement au démarrage du conteneur nginx (plus d'étape manuelle).
- `nginx/nginx.conf` — MODIFIÉ : blocs server déplacés dans templates/default.conf.template, server_tokens off.
- `nginx/templates/default.conf.template` — NOUVEAU fichier : config HTTPS (en-têtes de sécurité, frontend statique, timeouts WebSocket, redirection vers HTTPS_PORT).
- `backend/package.json` / `backend/package-lock.json` — MODIFIÉ : ajout de la dépendance `express-async-errors` (JSON : pas de commentaire possible).

## Fichiers supprimés

- `inutile/` (prompts, patchs, script d'audit, sujet PDF, fiche d'éval)
- `fix_admin_mobile.py`
- `package.json` et `package-lock.json` à la racine (eslint seul, inutilisés)
- `frontend/src/lib/unreadMessages.tsx.backup`
- `frontend/tsconfig.app.tsbuildinfo`, `frontend/tsconfig.node.tsbuildinfo` (fichiers de build)
- `backend/prisma/create-admin.ts` (identifiants en dur, ne fonctionnait pas en ESM ; remplacé par `backend/src/seed.ts`)

Pour voir le détail ligne par ligne : la pull request #1 sur GitHub, ou `git diff <commit-initial> HEAD`.
