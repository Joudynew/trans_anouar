#!/usr/bin/env bash
# ============================================================
# Patch ft_transcendence — à lancer depuis la RACINE de ton projet
# (le dossier qui contient backend/, frontend/, docker-compose.yml)
#
# Usage :
#   1. Place ce script + le dossier patch_files/ à la racine du projet
#   2. cd vers la racine du projet
#   3. bash apply_patch.sh
# ============================================================
set -e

if [ ! -d "backend/src" ] || [ ! -d "frontend/src" ]; then
  echo "Erreur : lance ce script depuis la racine du projet (backend/ et frontend/ doivent être visibles)."
  exit 1
fi

PATCH_DIR="$(dirname "$0")/patch_files"

echo "=== 1/6 : suppression des dossiers/fichiers fantômes (jamais utilisés par l'app) ==="
rm -rf backend/routes
rm -f backend/index.ts
rm -rf frontend/components
rm -f frontend/docker-compose.yml
rm -f backend/create-org.ts
rm -f backend/en.subject.pdf
rm -f en.subject.pdf
rm -f backup_before_superadmin.sql
rm -f backend/src/routes/messages.ts.backup
rm -f backend/src/routes/auth.ts.backup
rm -f frontend/tsconfig.tsbuildinfo frontend/tsconfig.app.tsbuildinfo frontend/tsconfig.node.tsbuildinfo

echo "=== 2/6 : application des correctifs de sécurité (bon emplacement : backend/src/) ==="
cp "$PATCH_DIR/organizations.ts"   backend/src/routes/organizations.ts
cp "$PATCH_DIR/users.ts"           backend/src/routes/users.ts
cp "$PATCH_DIR/interventions.ts"   backend/src/routes/interventions.ts
cp "$PATCH_DIR/backend_index.ts"   backend/src/index.ts

echo "=== 3/6 : footer Privacy Policy / Terms (bon emplacement : frontend/src/) ==="
cp "$PATCH_DIR/AdminLayout.tsx"    frontend/src/components/AdminLayout.tsx
cp "$PATCH_DIR/TechLayout.tsx"     frontend/src/components/TechLayout.tsx

echo "=== 4/6 : réintégration des 3 régressions repérées ==="
cp "$PATCH_DIR/Toast.tsx"                    frontend/src/components/Toast.tsx
cp "$PATCH_DIR/AdminInterventionDetail.tsx"  frontend/src/pages/AdminInterventionDetail.tsx
cp "$PATCH_DIR/TechFriends.tsx"              frontend/src/pages/TechFriends.tsx

echo "=== 5/6 : nettoyage nginx/certs (clé privée ne doit jamais être commitée) ==="
git rm -r --cached nginx/certs 2>/dev/null || true
rm -rf nginx/certs
mkdir -p nginx/certs
if ! grep -q "nginx/certs/" .gitignore 2>/dev/null; then
  echo "nginx/certs/" >> .gitignore
fi
if ! grep -q "tsbuildinfo" .gitignore 2>/dev/null; then
  echo "*.tsbuildinfo" >> .gitignore
fi

echo "=== 6/6 : docker-compose.yml — retrait de l'exposition directe 3001/5173 (contournait HTTPS) ==="
python3 - "$PWD/docker-compose.yml" << 'PYEOF'
import re, sys

path = sys.argv[1]
with open(path) as f:
    content = f.read()

# Remove the "ports: - 3001:3001" block under backend and "ports: - 5173:5173" under frontend
content = re.sub(r'\n *ports:\n *- "3001:3001"', '', content)
content = re.sub(r'\n *ports:\n *- "5173:5173"', '', content)

with open(path, "w") as f:
    f.write(content)

print("docker-compose.yml nettoyé")
PYEOF

echo ""
echo "============================================================"
echo "Patch appliqué. Étapes restantes à faire manuellement :"
echo ""
echo "1. Ajouter multer au backend :"
echo "   cd backend && npm install multer @types/multer"
echo ""
echo "2. Régénérer les certificats HTTPS (supprimés car ils étaient commit) :"
echo "   cd .. && bash nginx/generate-certs.sh"
echo ""
echo "3. Vérifier la compilation :"
echo "   cd backend && npx tsc --noEmit -p tsconfig.json"
echo "   cd ../frontend && npx tsc --noEmit -p tsconfig.app.json"
echo ""
echo "4. Committer (avec les comptes de TOUS les membres de l'équipe) :"
echo "   git add -A"
echo "   git commit -m \"fix: security patch (org isolation, HTTPS, dead files)\""
echo "============================================================"
