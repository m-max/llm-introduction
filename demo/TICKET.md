# Ticket #4217 — La remise annoncée n'est pas celle appliquée

**Signalé par** : service client · **Priorité** : haute (facturation)

Un client a commandé 3 claviers mécaniques à 40,00 € (sous-total 120,00 €).
Le site lui affiche « Votre remise : -10 % sur tout le panier », mais son
ticket n'applique que 9 % : il a payé **131,04 € TTC au lieu de 129,60 €**.

D'autres clients au-delà de 100 € sont probablement concernés.

**Reproduire** : `python3 demo/web/server.py`, puis <http://127.0.0.1:8000>
(panier par défaut = la commande du client).

**Attendu** : les remises appliquées respectent les paliers commerciaux
annoncés, sans régression sur les autres paliers.
