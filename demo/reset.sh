#!/usr/bin/env bash
# Remet la démo dans son état initial (bug présent) et vérifie les 3 tests rouges.
set -euo pipefail
cd "$(dirname "$0")"
git checkout -- pricing.py
# 0.09 et 0.10 ont la même taille : un .pyc compilé dans la même seconde
# masquerait le retour au bug. On purge le cache.
rm -rf __pycache__
sortie=$(python3 -m unittest 2>&1 || true)
if grep -q "FAILED (failures=3)" <<<"$sortie"; then
    echo "✓ démo prête : 3 tests rouges sur 9, bug présent dans pricing.py"
else
    echo "✗ état inattendu :" >&2
    tail -3 <<<"$sortie" >&2
    exit 1
fi
