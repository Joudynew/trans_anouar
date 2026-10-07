#!/usr/bin/env bash

set -u

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

PASS=0
FAIL=0
WARN=0

green='\033[0;32m'
red='\033[0;31m'
yellow='\033[1;33m'
cyan='\033[0;36m'
reset='\033[0m'

pass() {
  echo -e "${green}✓ PASS${reset} $1"
  PASS=$((PASS + 1))
}

fail() {
  echo -e "${red}✗ FAIL${reset} $1"
  FAIL=$((FAIL + 1))
}

warn() {
  echo -e "${yellow}⚠ WARN${reset} $1"
  WARN=$((WARN + 1))
}

section() {
  echo
  echo -e "${cyan}============================================================${reset}"
  echo -e "${cyan}$1${reset}"
  echo -e "${cyan}============================================================${reset}"
}

check_cmd() {
  command -v "$1" >/dev/null 2>&1
}

# ============================================================
section "1. ENVIRONNEMENT"
# ============================================================

check_cmd docker && pass "docker installé" || fail "docker absent"
check_cmd npm && pass "npm installé" || fail "npm absent"
check_cmd node && pass "node installé" || fail "node absent"
check_cmd npx && pass "npx installé" || fail "npx absent"

[ -d frontend ] && pass "frontend/ présent" || fail "frontend/ absent"
[ -d backend ] && pass "backend/ présent" || fail "backend/ absent"

[ -f docker-compose.yml ] && pass "docker-compose.yml présent" || \
[ -f compose.yml ] && pass "compose.yml présent" || \
fail "docker compose introuvable"

[ -f .gitignore ] && pass ".gitignore présent" || warn ".gitignore absent"

# ============================================================
section "2. DOCKER"
# ============================================================

if docker compose ps >/dev/null 2>&1; then
  pass "docker compose fonctionne"
else
  fail "docker compose inaccessible"
fi

docker compose ps

if docker compose ps --status running | grep -q "db"; then
  pass "conteneur DB actif"
else
  fail "conteneur DB non actif"
fi

if docker compose ps --status running | grep -q "backend"; then
  pass "conteneur backend actif"
else
  fail "conteneur backend non actif"
fi

if docker compose ps --status running | grep -q "frontend"; then
  pass "conteneur frontend actif"
else
  warn "conteneur frontend non détecté"
fi

# ============================================================
section "3. PORTS"
# ============================================================

for port in 3001 5173 8080 5432; do
  if ss -lnt 2>/dev/null | grep -q ":$port "; then
    pass "port $port ouvert"
  else
    warn "port $port non détecté"
  fi
done

# ============================================================
section "4. BACKEND HEALTH (HTTPS proxy)"
# ============================================================

health="$(curl -ks --max-time 5 https://localhost/health 2>/dev/null || true)"

if echo "$health" | grep -q '"ok":true'; then
  pass "GET /health OK"
else
  fail "GET /health KO"
  echo "Réponse: $health"
fi

if echo "$health" | grep -q '"database":"up"'; then
  pass "connexion PostgreSQL depuis backend OK"
else
  fail "backend ne confirme pas PostgreSQL"
fi

# ============================================================
section "5. FRONTEND"
# ============================================================

frontend_status="$(curl -ks -o /dev/null -w '%{http_code}' --max-time 5 https://localhost 2>/dev/null || true)"

if [ "$frontend_status" = "200" ]; then
  pass "frontend HTTPS 200"
else
  warn "frontend HTTP status: $frontend_status"
fi

# ============================================================
section "6. TYPESCRIPT"
# ============================================================

if [ -d frontend/node_modules ]; then
  (
    cd frontend
    npx tsc --noEmit -p tsconfig.app.json
  ) >/tmp/frontend-tsc.log 2>&1

  if [ $? -eq 0 ]; then
    pass "TypeScript frontend OK"
  else
    fail "TypeScript frontend contient des erreurs"
    cat /tmp/frontend-tsc.log
  fi
else
  warn "frontend/node_modules absent"
fi

if [ -d backend/node_modules ]; then
  (
    cd backend
    npx tsc --noEmit
  ) >/tmp/backend-tsc.log 2>&1

  if [ $? -eq 0 ]; then
    pass "TypeScript backend OK"
  else
    fail "TypeScript backend contient des erreurs"
    cat /tmp/backend-tsc.log
  fi
else
  warn "backend/node_modules absent"
fi

# ============================================================
section "7. PRISMA"
# ============================================================

if [ -d backend/prisma ]; then
  pass "backend/prisma présent"
else
  fail "backend/prisma absent"
fi

if [ -d backend/prisma/migrations ]; then
  migration_count="$(find backend/prisma/migrations -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l)"
  if [ "$migration_count" -gt 0 ]; then
    pass "$migration_count migration(s) Prisma trouvée(s)"
  else
    warn "aucune migration Prisma trouvée"
  fi
else
  warn "backend/prisma/migrations absent"
fi

if [ -f backend/prisma/schema.prisma ]; then
  pass "schema.prisma présent"
else
  fail "schema.prisma absent"
fi

if [ -d backend/node_modules ]; then
  (
    cd backend
    npx prisma validate
  ) >/tmp/prisma-validate.log 2>&1

  if [ $? -eq 0 ]; then
    pass "Prisma schema valide"
  else
    fail "Prisma schema invalide"
    cat /tmp/prisma-validate.log
  fi
fi

# ============================================================
section "8. VARIABLES ENV"
# ============================================================

if [ -f backend/.env ]; then
  pass "backend/.env présent"
else
  warn "backend/.env absent"
fi

if [ -f frontend/.env ]; then
  pass "frontend/.env présent"
else
  warn "frontend/.env absent"
fi

if [ -f backend/.env.example ]; then
  pass "backend/.env.example présent"
else
  warn "backend/.env.example absent"
fi

if [ -f frontend/.env.example ]; then
  pass "frontend/.env.example présent"
else
  warn "frontend/.env.example absent"
fi

# Vérifie seulement la présence des noms, pas les secrets.
if [ -f backend/.env ]; then
  grep -q '^JWT_SECRET=' backend/.env \
    && pass "JWT_SECRET défini" \
    || fail "JWT_SECRET absent"
fi

# ============================================================
section "9. ROUTES BACKEND"
# ============================================================

required_routes=(
  "backend/src/routes/auth.ts"
  "backend/src/routes/users.ts"
  "backend/src/routes/interventions.ts"
  "backend/src/routes/messages.ts"
  "backend/src/routes/organizations.ts"
)

for file in "${required_routes[@]}"; do
  if [ -f "$file" ]; then
    pass "$file présent"
  else
    fail "$file absent"
  fi
done

if grep -q "router.post('/login'" backend/src/routes/auth.ts 2>/dev/null; then
  pass "route POST /login présente"
else
  fail "route POST /login absente"
fi

if grep -q "router.patch('/:id'" backend/src/routes/users.ts 2>/dev/null; then
  pass "route PATCH /users/:id présente"
else
  fail "route PATCH /users/:id absente"
fi

if grep -q "satisfaction" backend/src/routes/interventions.ts 2>/dev/null; then
  pass "routes satisfaction présentes"
else
  fail "routes satisfaction absentes"
fi

if grep -q "reports" backend/src/routes/interventions.ts 2>/dev/null; then
  pass "routes rapports présentes"
else
  warn "routes rapports non détectées"
fi

# ============================================================
section "10. RÔLES / AUTORISATIONS"
# ============================================================

if grep -q "SUPER_ADMIN" backend/src/routes/users.ts 2>/dev/null; then
  pass "SUPER_ADMIN géré dans users"
else
  fail "SUPER_ADMIN non trouvé dans users"
fi

if grep -q "ADMIN" backend/src/routes/users.ts 2>/dev/null; then
  pass "ADMIN géré dans users"
else
  fail "ADMIN non trouvé dans users"
fi

if grep -q "TECHNICIAN" backend/src/routes/users.ts 2>/dev/null; then
  pass "TECHNICIAN géré dans users"
else
  fail "TECHNICIAN non trouvé dans users"
fi

# ============================================================
section "11. SATISFACTION DB"
# ============================================================

DB_CONTAINER="$(docker compose ps -q db 2>/dev/null || true)"

if [ -n "$DB_CONTAINER" ]; then

  ratings="$(
    docker exec "$DB_CONTAINER" psql \
      -U postgres \
      -d fibreflow \
      -tAc 'SELECT COUNT(*) FROM "SatisfactionRating";' \
      2>/dev/null || true
  )"

  if [[ "$ratings" =~ ^[0-9]+$ ]]; then
    pass "table SatisfactionRating accessible ($ratings ligne(s))"
  else
    fail "impossible de lire SatisfactionRating"
  fi

  submitted="$(
    docker exec "$DB_CONTAINER" psql \
      -U postgres \
      -d fibreflow \
      -tAc 'SELECT COUNT(*) FROM "Intervention" WHERE "satisfactionSubmitted" = true;' \
      2>/dev/null || true
  )"

  if [[ "$submitted" =~ ^[0-9]+$ ]]; then
    pass "$submitted intervention(s) avec satisfaction soumise"
  else
    warn "impossible de vérifier satisfactionSubmitted"
  fi

  orphan="$(
    docker exec "$DB_CONTAINER" psql \
      -U postgres \
      -d fibreflow \
      -tAc '
        SELECT COUNT(*)
        FROM "SatisfactionRating" s
        LEFT JOIN "Intervention" i ON i.id = s."interventionId"
        WHERE i.id IS NULL;
      ' 2>/dev/null || true
  )"

  if [ "$orphan" = "0" ]; then
    pass "aucune satisfaction orpheline"
  else
    fail "$orphan satisfaction(s) orpheline(s)"
  fi

else
  fail "conteneur DB introuvable"
fi

# ============================================================
section "12. FRONTEND - ANCIENS DATA LAYERS"
# ============================================================

if grep -R "from '@/lib/db'\|from './lib/db'\|from \"@/lib/db\"" frontend/src \
    >/tmp/db_refs.log 2>/dev/null; then
  warn "références à db.ts encore présentes"
  cat /tmp/db_refs.log
else
  pass "aucune référence directe à db.ts"
fi

if grep -R "supabase" frontend/src backend/src \
    >/tmp/supabase_refs.log 2>/dev/null; then
  warn "références Supabase détectées"
  head -20 /tmp/supabase_refs.log
else
  pass "aucune référence Supabase détectée"
fi

# ============================================================
section "13. SERVER LEGACY"
# ============================================================

if [ -d server ]; then
  warn "dossier server/ encore présent — vérifier s'il est réellement utilisé"
else
  pass "pas de dossier server/ legacy"
fi

# ============================================================
section "14. GIT / SECRETS"
# ============================================================

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  pass "repository Git détecté"

  if git check-ignore backend/.env >/dev/null 2>&1; then
    pass "backend/.env ignoré par Git"
  else
    warn "backend/.env n'est peut-être PAS ignoré par Git"
  fi

  if git check-ignore frontend/.env >/dev/null 2>&1; then
    pass "frontend/.env ignoré par Git"
  else
    warn "frontend/.env n'est peut-être PAS ignoré par Git"
  fi
else
  warn "pas un repository Git"
fi

# ============================================================
section "15. RÉSUMÉ"
# ============================================================

echo
echo -e "${cyan}============================================================${reset}"
echo -e "${cyan}RÉSULTAT FINAL${reset}"
echo -e "${cyan}============================================================${reset}"

echo -e "${green}PASS : $PASS${reset}"
echo -e "${yellow}WARN : $WARN${reset}"
echo -e "${red}FAIL : $FAIL${reset}"

echo

if [ "$FAIL" -eq 0 ]; then
  echo -e "${green}✓ Aucun échec automatique détecté.${reset}"
  echo "Il reste uniquement les tests fonctionnels manuels."
else
  echo -e "${red}✗ Des problèmes doivent encore être corrigés.${reset}"
fi

echo
echo "Logs temporaires :"
echo "  /tmp/frontend-tsc.log"
echo "  /tmp/backend-tsc.log"
echo "  /tmp/prisma-validate.log"

exit "$FAIL"
