# Scripts des lives

Trois lives, un filet chacun. Plan éditorial : [`PLAN.md`](PLAN.md). Chiffres
attendus : [`docs/research/mesures-2026-10-05.md`](../docs/research/mesures-2026-10-05.md).

Le matériel :

- laptop : i7-1370P, 30 Go, conteneur du repo ;
- serveur LAN `192.168.0.110:8080` : `Qwen3.8-Flash-Next`, ~36 tok/s en
  decode, ~910 tok/s en prefill ;
- OpenCode **v2.0.21**.

---

## Live 1 — De Hugging Face à la ligne de log (7 min, fin d'acte 1)

**Prouver** : un modèle se télécharge comme une bibliothèque, et son coût
mémoire se **lit** dans le log — les poids et le KV cache, comme annoncé
dans les slides.

| # | Écran | Geste | Ce qu'on dit |
|---|-------|-------|--------------|
| 1 | Navigateur | `huggingface.co/unsloth/LFM2.5-8B-A1B-GGUF`, onglet *Files and versions* | « Même modèle, du BF16 à 15,8 Go jusqu'au Q2 à 2,7 Go. La règle : Go ≈ milliards × bits ÷ 8. » |
| 2 | Terminal (conteneur) | `docker compose run --rm llama bash` | « La boîte à outils que vous emportez. » |
| 3 | Terminal | `hf download` du petit modèle (ci-dessous) | « 397 Mo, le temps de ma phrase. » |
| 4 | Terminal | `llama-cli … -p Bonjour -st -v 2>&1 \| grep -E "kv_cache: size\|Prompt:"` | Pointer `llama_kv_cache: size = 4480.00 MiB` : « Le modèle pèse 373 Mo, sa mémoire de conversation 4,4 Go. » |
| 5 | Terminal | Même commande avec `-c 4096` | « ~450 Mo. On ne réserve que ce qu'on utilise. » |
| 6 | Terminal | Lire `[ Prompt: … t/s \| Generation: … t/s ]` | « Prefill et decode, les deux vitesses de la slide, en vrai sur ce CPU. » |
| 7 ✂ | Slide | Table `llama-bench` pré-enregistrée (MoE vs dense) | Seulement si le temps le permet : la slide 9 l'a déjà montrée. |

**Commandes (vérifiées le 05/10/2026)** :

```bash
hf download unsloth/Qwen3-0.6B-GGUF \
    --include "Qwen3-0.6B-Q4_K_M.gguf" \
    --local-dir /models/Qwen3-0.6B-Q4_K_M
M=/models/Qwen3-0.6B-Q4_K_M/Qwen3-0.6B-Q4_K_M.gguf
llama-cli -m $M -p Bonjour -st -v 2>&1 | grep -E "kv_cache: size|Prompt:"
llama-cli -m $M -p Bonjour -st -c 4096 -v 2>&1 | grep -E "kv_cache: size|Prompt:"
```

**Pourquoi `-v | grep`** : sans `-v`, ni `llama-cli` ni `llama-server`
n'affichent la ligne `llama_kv_cache`. Le `grep` évite le défilé des logs
verbeux.

**Bonus si une question vient** : `llama-server -m $M` sans option ouvre
4 slots et réserve 17,9 GiB de KV cache (warning
`n_ctx_seq (163840) > n_ctx_train`). Le piège est dans les notes de la slide 10 (KV cache).

**Filet** :

- modèle pré-téléchargé dans `models/` + `HF_HUB_OFFLINE=1` si le réseau
  tombe ;
- captures de la page HF et des sorties terminal dans
  `presentation/fallback/`.

**Pré-vol** : relancer les commandes la veille, et noter les tok/s du jour
pour les citer.

---

## Live 2 — Un ticket client corrigé par l'agent, 100 % local (10 min, acte 2)

**Prouver** :

- la boucle (lire → outil → résultat → re-boucle) sur un modèle 100 % local,
  à partir d'un **symptôme client**, pas d'une suite de tests ;
- le cache de prompt au travail.

**Disposition** :

- navigateur sur <http://127.0.0.1:8000> (ticket de caisse) ;
- OpenCode à gauche ;
- à droite, le log de `llama-server` (`ssh` + `journalctl -f` ou
  `docker logs -f` selon l'installation), ou à défaut `watch curl …/slots`.

| # | Écran | Geste | Ce qu'on dit |
|---|-------|-------|--------------|
| 1 | Navigateur | Page ticket, panier par défaut (3 claviers) | « Un client se plaint : la bannière promet -10 %, le ticket applique 9 %. 1,44 € facturés en trop. » |
| 2 | Éditeur | Montrer `demo/TICKET.md` | « Voilà tout ce que l'agent va recevoir. Je ne sais pas où est le bug. » |
| 3 | OpenCode | Prompt : « Corrige le ticket demo/TICKET.md. » | Commenter les appels qui défilent : lecture du ticket, de `pricing.py`, des tests, `shell` (tests rouges), `edit`, `shell` (tests verts). |
| 4 | Log serveur | Pointer `prompt eval time = … / N tokens` à chaque tour | « Il ne recalcule que la fin du prompt : le début est dans le cache. » |
| 5 | Navigateur | Rafraîchir la page | Le badge « annoncé 10 % » disparaît, l'alerte passe au vert : « Ticket conforme ». |
| 6 | Terminal | `git diff` : une valeur, `0.09` → `0.10` | Révéler le bug seulement maintenant. « Il n'a pas deviné : il a mesuré. » |
| 7 | Terminal | `curl -s http://192.168.0.110:8080/metrics \| grep -E "prompt_tokens_(total\|cached_total)\|predicted_tokens_seconds"` | Punchline : « Des millions de tokens de prompt servis par ce serveur pendant la préparation du talk, 9 sur 10 depuis le cache. Rien n'a quitté le LAN. » |

**Avant le live** :

- `demo/reset.sh` ;
- `python3 demo/web/server.py` lancé dans un terminal dédié : la page relit
  `pricing.py` à chaque calcul, inutile de la redémarrer.

`demo/AGENTS.md` dit à l'agent de ne pas lancer le serveur (processus
bloquant) et de vérifier avec `python3 -m unittest`.

**Calibration** :

- le bug est une valeur dans `PALIERS` ; la docstring sert de spec ;
- vérifié : 3 échecs sur 9 tests, vert en une correction ;
- le passage par le ticket ajoute 1 à 2 appels d'outils par rapport à
  « rends les tests verts ». **À chronométrer en répétition** ;
- ne PAS révéler l'emplacement du bug avant l'étape 6 ;
- si l'agent tente de lancer `web/server.py` malgré `AGENTS.md`,
  l'interrompre (Échap) et le relancer.

**Plan B (temps serré)** : prompt « Les tests de demo/ sont rouges, rends-les
verts. », puis rafraîchir la page à la fin.

**Chiffres `/metrics`** : les compteurs sont cumulés depuis le démarrage du
serveur. Relever les valeurs le matin même et mettre à jour la slide 21 (sur
la base du 05/10/2026 : 4 212 240 cachés / 239 162 calculés = 94,6 %).

**Filet** :

- le serveur fonctionne sans Internet, seul le LAN compte ;
- captures d'une session de répétition, dont la page ticket rouge puis
  verte.

---

## Live 3 — Écrire une skill en direct (5 min, fin d'acte 2) ✂

**Prouver** : une skill n'est qu'un fichier markdown.

| # | Écran | Geste | Ce qu'on dit |
|---|-------|-------|--------------|
| 1 | Éditeur | `mkdir -p .opencode/skills/explain-file` + ouvrir `SKILL.md` | « Un dossier, un fichier. » |
| 2 | Éditeur | Taper le frontmatter (`name`, `description`) + 4 consignes (rôle, structure, subtilités, limites), ~15 lignes | « La description, c'est ce que l'agent voit en permanence ; le corps, il ne le charge qu'à l'usage. » |
| 3 | OpenCode | Prompt : « explique demo/pricing.py » → la skill se déclenche, réponse structurée | « Rien à redéployer : c'était un fichier. » |

**Note OpenCode** :

- les skills projet sont détectées en `.opencode/skills/<nom>/SKILL.md`
  (marche aussi `.claude/skills/` et `.agents/skills/`) ;
- le nom est celui du dossier, en minuscules avec tirets ; la `description`
  fait au plus 1 024 caractères ;
- vérifié en conditions réelles : la skill écrite pour ce repo a été
  détectée sans redémarrage.

**Rappel acte 2** : les 49 skills de `.agents/skills/` pèsent ~3 800 tokens
à chaque session. Pour la démo, envisager de lancer OpenCode depuis un
répertoire qui ne les charge pas : prompt de base plus court, premier tour
plus rapide.

**Version 60 min** : ne pas taper. Montrer le `SKILL.md` committé et
l'invoquer directement.

**Filet** : `git checkout` de la version committée de la skill si la frappe
dérape ; capture de l'invocation.

---

## Checklist pré-session (jour J)

- [ ] `docker compose build` fait, `hf` connecté, Qwen3-0.6B pré-téléchargé
      (filet hors ligne)
- [ ] `llama-server` actif sur `192.168.0.110` :
      `curl http://192.168.0.110:8080/v1/models`
- [ ] Relever `/metrics` (taux de cache, tok/s prefill/decode) et mettre à
      jour les slides 8, 19 et 21 si les chiffres ont bougé
- [ ] Remesurer `llama-bench -p 512 -n 128 -t 6,14` sur le laptop (slides 8
      et 9)
- [ ] `demo/reset.sh` → « ✓ démo prête : 3 tests rouges sur 9 »
- [ ] `python3 demo/web/server.py` lancé, page <http://127.0.0.1:8000>
      ouverte (badge « annoncé 10 % » visible)
- [ ] Skill `explain-file` : l'effacer pour la réécrire en live, ou montrer
      la version committée
- [ ] Captures de secours des 3 lives dans `presentation/fallback/`
- [ ] Revérifier les chiffres de l'acte 3 (section « Ce qui va vieillir vite »
      de `docs/research/acte3-paysage.md`)
- [ ] Page HF ouverte en onglet, laptop en mode démo (notifs coupées)
