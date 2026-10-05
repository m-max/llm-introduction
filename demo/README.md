# demo — Facturation (bug volontaire)

Mini-projet de démonstration pour la session « LLM & développement agentique ».
Aucune dépendance : Python 3 et sa bibliothèque standard.

| Fichier | Rôle |
|---|---|
| `pricing.py` | Facturation d'un panier : sous-total, remise par paliers, TVA. Sa **docstring est la spec** commerciale. |
| `test_pricing.py` | Les tests. **3 sur 9 sont rouges : le code s'écarte de la spec.** |
| `TICKET.md` | Le signalement client qui sert de point de départ au live. |
| `web/` | Un « ticket de caisse » web qui rend le bug visible (affichage seulement). |
| `AGENTS.md` | Consignes pour l'agent : où est le code métier, comment tester, ne pas toucher à `web/`. |
| `reset.sh` | Remet le bug en place et vérifie les 3 tests rouges. |

## Voir le bug

```bash
python3 demo/web/server.py        # http://127.0.0.1:8000 (8080 est pris par llama-server)
```

Le panier par défaut est la commande du ticket (3 claviers à 40 €). La page
compare le ticket calculé par `pricing.py` à la remise annoncée aux clients :
**« Remise (9 %) — annoncé 10 % »**, et 1,44 € facturés en trop.
`pricing.py` est relu à chaque calcul : une correction apparaît en
rafraîchissant la page, sans redémarrer le serveur.

## Lancer les tests

```bash
cd demo
python3 -m unittest -v            # aucune dépendance
uv run --with pytest pytest -v    # avec la sortie pytest
```

## Le scénario

Le bug est **volontaire** : une seule valeur dans `pricing.py` diverge de la
docstring. Pendant le live, on donne à l'agent d'OpenCode le ticket
(`TICKET.md`) sans lui dire où est le bug. Il doit :

1. trouver le code et les tests ;
2. confronter le code à la spec ;
3. localiser l'écart ;
4. corriger ;
5. revérifier.

Le public voit la page passer du rouge au vert.

Remettre la démo à zéro entre deux répétitions :

```bash
demo/reset.sh                     # ✓ démo prête : 3 tests rouges sur 9
```

Le script purge aussi `__pycache__`. `0.09` et `0.10` ont la même taille : un
`.pyc` compilé dans la même seconde masquerait le retour au bug.

Le scénario complet est dans
[`../presentation/SCENARIOS.md`](../presentation/SCENARIOS.md).

## Pour aller plus loin (Q&A)

Second écart, volontairement laissé en place : `round()` en Python arrondit
les demi-centimes au pair (« arrondi bancaire »). Un panier de 50,30 € donne
47,78 € après remise, et non 47,79 € comme en arrondi commercial. La spec dit
seulement « arrondis au centime » : c'est une ambiguïté à faire trancher,
pas un bug évident. C'est un bon exemple de limite de l'agent.
