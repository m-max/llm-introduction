"""Ticket de caisse web pour la démo — rend le bug de pricing.py visible.

    python3 demo/web/server.py          puis http://127.0.0.1:8000

Bibliothèque standard uniquement. pricing.py est rechargé à chaque requête :
une correction faite pendant le live apparaît en rafraîchissant la page,
sans redémarrer le serveur.

La colonne « annoncé / attendu » ne vient PAS de pricing.py : elle applique
les paliers de la spec commerciale (SPEC_PALIERS ci-dessous, recopiés de la
docstring de pricing.py). C'est l'écart entre les deux qui rend le bug visible.
"""

import importlib
import json
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.dont_write_bytecode = True  # pas de .pyc périmé quand pricing.py change
ICI = Path(__file__).resolve().parent
sys.path.insert(0, str(ICI.parent))
import pricing  # noqa: E402

HOTE, PORT = "127.0.0.1", 8000  # 8080 est pris par llama-server

# Spec commerciale, telle qu'annoncée aux clients (centimes, taux).
SPEC_PALIERS = [(20_000, 0.15), (10_000, 0.10), (5_000, 0.05)]
SPEC_TVA = 0.20

CATALOGUE = [
    {"id": "clavier", "nom": "Clavier mécanique", "prix": 40_00, "qte": 3},
    {"id": "souris", "nom": "Souris sans fil", "prix": 25_00, "qte": 0},
    {"id": "cable", "nom": "Câble USB-C", "prix": 12_50, "qte": 0},
    {"id": "ecran", "nom": "Écran 27 pouces", "prix": 149_00, "qte": 0},
]


def taux_spec(montant):
    for seuil, taux in SPEC_PALIERS:
        if montant >= seuil:
            return taux
    return 0.0


def ticket(lignes):
    """Ticket calculé par pricing.py, à côté de ce que la spec annonce."""
    importlib.reload(pricing)
    st = pricing.sous_total(lignes)
    apres = pricing.appliquer_remise(st)
    attendu_apres = round(st * (1 - taux_spec(st)))
    return {
        "sous_total": st,
        "taux": pricing.taux_remise(st),
        "remise": st - apres,
        "tva": pricing.total_ttc(lignes) - apres,
        "total_ttc": pricing.total_ttc(lignes),
        "attendu": {
            "taux": taux_spec(st),
            "total_ttc": round(attendu_apres * (1 + SPEC_TVA)),
        },
        "paliers": [{"seuil": s, "taux": t} for s, t in reversed(SPEC_PALIERS)],
    }


class Handler(BaseHTTPRequestHandler):
    def _json(self, code, data):
        corps = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corps)))
        self.end_headers()
        self.wfile.write(corps)

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            corps = (ICI / "index.html").read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(corps)))
            self.end_headers()
            self.wfile.write(corps)
        elif self.path == "/api/catalogue":
            self._json(200, CATALOGUE)
        else:
            self._json(404, {"erreur": "introuvable"})

    def do_POST(self):
        if self.path != "/api/ticket":
            return self._json(404, {"erreur": "introuvable"})
        try:
            demande = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            lignes = [(int(p), int(q)) for p, q in demande["lignes"]]
            self._json(200, ticket(lignes))
        except Exception as exc:  # pricing.py en cours d'édition, JSON invalide…
            self._json(500, {"erreur": f"{type(exc).__name__}: {exc}"})

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    print(f"Ticket de caisse : http://{HOTE}:{PORT}  (Ctrl+C pour arrêter)")
    ThreadingHTTPServer((HOTE, PORT), Handler).serve_forever()
