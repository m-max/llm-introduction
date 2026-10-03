# Scripts des lives

Trois lives, un filet chacun. Le matériel : laptop (conteneur du repo) +
machine d'inférence `192.168.0.110:8080` (`Qwen3.8-Flash-Next`, ~35 tok/s).

---

## Live 1 — Hugging Face & llama.cpp (5-7 min, fin d'acte 1)

**Prouver** : un LLM se télécharge comme une library et tourne sur un CPU.

| # | Écran | Geste | Ce qu'on dit |
|---|-------|-------|--------------|
| 1 | Navigateur | Page `huggingface.co/unsloth/LFM2.5-8B-A1B-GGUF` | « Un LLM se Feuille comme un paquet npm : voici les fichiers. » |
| 2 | Navigateur | Onglet *Files and versions* : les `.gguf` par quantification | Montrer les tailles : même modèle, du brut au Q4/Q5 — le pont avec la slide quantification. |
| 3 | Terminal (conteneur) | `docker compose run --rm llama bash` | « On entre dans la boîte à outils — c'est le repo que vous emportez. » |
| 4 | Terminal | `hf download <petit modèle ~0,6B GGUF> --local-dir /models/<nom>` (secondes) | « Téléchargement live : ~500 Mo, pas 6 Go — le temps de ma phrase. » |
| 5 | Terminal | `llama-cli -m /models/<nom>/<fichier>.gguf` puis une question en direct | « Réponse sur le CPU du laptop, zéro cloud. » |

**Filet** : captures de la page HF (2 écrans) + sortie terminal pré-enregistrée.
Si le réseau tombe : « le téléchargement est déjà fait, voici ce qu'on aurait
vu » + captures.

**Modèle du téléchargement live (vérifié sur HF le 03/10/2026)** :
`unsloth/Qwen3-0.6B-GGUF`, fichier `Qwen3-0.6B-Q4_K_M.gguf` (397 MB) :

```bash
hf download unsloth/Qwen3-0.6B-GGUF \
    --include "Qwen3-0.6B-Q4_K_M.gguf" \
    --local-dir /models/Qwen3-0.6B-Q4_K_M
llama-cli -m /models/Qwen3-0.6B-Q4_K_M/Qwen3-0.6B-Q4_K_M.gguf
```

**Pré-vol** : ré-exécuter cette commande la veille ; pré-warm du cache HF sur le laptop.

---

## Live 2 — OpenCode sur le modèle local (10-12 min, fin d'acte 2)

**Prouver** : la boucle agent (lire → outil → résultat → re-boucle) sur un
modèle 100 % local.

| # | Écran | Geste | Ce qu'on dit |
|---|-------|-------|--------------|
| 1 | Terminal | `cat opencode.jsonc` (10 lignes, baseURL `192.168.0.110`) | « Toute la plomberie cloud est remplacée par ça. » |
| 2 | Terminal | `python3 -m unittest` dans `demo/` → 3 tests rouges | « Un panier de facturation, trois tests qui échouent. Où est le bug ? Je ne le sais pas. » |
| 3 | OpenCode | Prompt : « Les tests de demo/ sont rouges, rends-les verts. » | Lancer, puis commenter les tool calls qui défilent : read → bash → read → edit. |
| 4 | OpenCode | L'agent édite `pricing.py`, relance les tests → verts | « Il n'a pas deviné : il a mesuré. » |
| 5 | Terminal | `git diff` — une valeur, `0.09` → `0.10` | Punchline méta : « Et l'agent qui a fait ça tourne sur le serveur local, à 35 tokens/s — la session qui a préparé cette présentation aussi. » |

**Filet** : session OpenCode rejouable hors ligne (le serveur local fonctionne
sans réseau, seul le LAN compte) + captures de la session de répétition.

**Calibration** : le bug (une valeur dans `PALIERS`, docstring = spec) est
calibré pour 2-3 tool calls. Vérifié : 3 échecs sur 9 tests, vert en une
correction. Ne PAS révéler l'emplacement du bug avant l'étape 5.

---

## Live 3 — Écrire une skill en direct (5 min, milieu d'acte 3)

**Prouver** : une skill n'est qu'un fichier markdown.

| # | Écran | Geste | Ce qu'on dit |
|---|-------|-------|--------------|
| 1 | Éditeur | `mkdir -p .opencode/skills/explain-file` + ouvrir `SKILL.md` | « Un dossier, un fichier. » |
| 2 | Éditeur | Taper le frontmatter (`name`, `description`) + 4 consignes (rôle, structure, subtilités, limites), ~15 lignes | « La description, c'est comment l'agent la découvre ; le corps, c'est ce qu'il fait. » |
| 3 | OpenCode | Prompt : « explique demo/pricing.py » → la skill se déclenche, réponse structurée | « Rien à redéployer : c'était un fichier. » |

**Note OpenCode** : les skills projet sont détectées en
`.opencode/skills/<nom>/SKILL.md` (marche aussi `.claude/skills/` et
`.agents/skills/`) ; nom = dossier, minuscules avec tirets ; `description`
≤ 1024 caractères. Vérifié en conditions réelles : la skill écrite pour ce
repo a été détectée sans redémarrage.

**Filet** : `git checkout` de la version déjà committée de la skill si la
frappe en direct dérape ; capture de l'invocation.

---

## Checklist pré-session (jour J)

- [ ] `docker compose build` fait, `hf` connecté, cache HF tiède sur le laptop
- [ ] `llama-server` actif sur `192.168.0.110`, test API rapide :
      `curl http://192.168.0.110:8080/v1/models`
- [ ] Remesurer les tok/s (chiffre cité sur les slides)
- [ ] `demo/` à l'état rouge : `python3 -m unittest` → 3 échecs
      (`git checkout -- demo/` si besoin)
- [ ] Skill `explain-file` : effacer puis réécrire en live, ou montrer la
      version committée en commentaire
- [ ] Captures de secours des 3 lives dans `presentation/fallback/`
- [ ] Page HF ouverte en onglet, laptop en mode démo (notifs coupées)
