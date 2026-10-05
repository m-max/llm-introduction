# demo/ — facturation d'un panier

- Code métier : `pricing.py` ; sa docstring est la spec commerciale.
- Tests : `python3 -m unittest` depuis `demo/` (aucune dépendance).
- `web/` n'est qu'un affichage du ticket (il relit `pricing.py`) : ne pas le
  modifier, et ne pas lancer `web/server.py` (processus bloquant).
