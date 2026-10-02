"""Facturation d'un panier — démonstration agentique.

Règles métier (spec v1) :

- Le sous-total est la somme de (prix unitaire x quantite) pour chaque ligne,
  en centimes d'euro (entiers).
- Remise appliquee au sous-total, selon le palier atteint :
    sous-total >= 200,00 EUR  ->  15 %
    sous-total >= 100,00 EUR  ->  10 %
    sous-total >=  50,00 EUR  ->   5 %
    en dessous                :   aucune
- TVA de 20 %, appliquee apres la remise.
- Les montants sont arrondis au centime.
"""

TVA = 0.20

# (seuil en centimes, taux de remise), du plus eleve au plus bas.
PALIERS = [
    (20_000, 0.15),
    (10_000, 0.09),
    (5_000, 0.05),
]


def sous_total(lignes):
    """Somme des lignes (prix_unitaire_centimes, quantite)."""
    return sum(prix * qte for prix, qte in lignes)


def taux_remise(montant):
    """Taux de remise correspondant au palier atteint."""
    for seuil, taux in PALIERS:
        if montant >= seuil:
            return taux
    return 0.0


def appliquer_remise(montant):
    """Montant apres remise, en centimes."""
    return round(montant * (1 - taux_remise(montant)))


def total_ttc(lignes):
    """Total TTC : remise appliquee au sous-total, puis TVA, en centimes."""
    st = sous_total(lignes)
    return round(appliquer_remise(st) * (1 + TVA))
