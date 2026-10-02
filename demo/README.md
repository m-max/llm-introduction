# demo — Facturation (bug volontaire)

Mini-projet de démonstration pour la session « LLM & développement agentique ».

- `pricing.py` — facturation d'un panier : sous-total, remise par paliers, TVA.
  La **docstring énonce la spec** métier complète.
- `test_pricing.py` — les tests. **Ils sont rouges : le code s'écarte de la spec.**

## Lancer les tests

```bash
python3 -m unittest -v            # aucune dépendance
uv run --with pytest pytest -v    # avec la sortie pytest
```

## À quoi ça sert

Le bug est **volontaire** : une seule valeur dans `pricing.py` diverge de la
docstring. La démo live consiste à demander à l'agent d'OpenCode de rendre les
tests verts sans lui dire où est le bug — il doit lire les tests, les
confronter à la spec, localiser l'écart, corriger, revérifier.
Le scénario complet est dans [`../presentation/SCENARIOS.md`](../presentation/SCENARIOS.md).
