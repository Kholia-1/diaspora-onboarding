#!/usr/bin/env bash
#
# Déploiement / mise à jour de diaspora-onboarding sur Ubuntu.
# Étapes : git pull -> build --no-cache -> recréation du conteneur -> nettoyage.
#
# Usage :
#   ./deploy.sh
#
set -euo pipefail

cd "$(dirname "$0")"

# Sélection de la commande Docker Compose (plugin v2 ou binaire v1)
if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "ERREUR : Docker Compose introuvable. Installez Docker + le plugin compose." >&2
  exit 1
fi

# Vérification du fichier .env
if [[ ! -f .env ]]; then
  echo "ERREUR : fichier .env manquant. Copiez .env.example puis renseignez FERNET_KEY." >&2
  echo "  cp .env.example .env" >&2
  exit 1
fi

if ! grep -qE '^FERNET_KEY=.+' .env; then
  echo "ERREUR : FERNET_KEY non renseignée dans .env (perte des documents chiffrés sinon)." >&2
  echo "  python3 -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"" >&2
  exit 1
fi

echo ">>> [1/5] Récupération du code (git pull)..."
git pull --ff-only

echo ">>> [2/5] Préparation des volumes persistants..."
mkdir -p uploads data

echo ">>> [3/5] Construction de l'image (no-cache)..."
$COMPOSE build --no-cache

echo ">>> [4/5] Recréation du conteneur..."
$COMPOSE up -d --force-recreate

echo ">>> [5/5] Nettoyage des images orphelines..."
docker image prune -f

echo
echo "=== Déploiement terminé ==="
$COMPOSE ps
echo
echo "Logs : $COMPOSE logs -f diaspora-onboarding"
echo "Santé : curl http://localhost:10002/health"
