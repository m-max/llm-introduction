# LLM local avec llama.cpp (Docker)

Boîte à outils conteneurisée pour faire tourner des LLM **en CPU** sur cette
machine (pas de GPU NVIDIA — x86_64 AVX2, 30 Go de RAM → modèles GGUF
quantifiés dont le fichier **et** le KV cache tiennent en RAM, soit ~20 Go
de fichier au plus). Les modèles vivent dans `models/`
(l'[Espace de modèles](GLOSSARY.md)), monté dans le conteneur à `/models`,
toujours téléchargés **à plat** avec `--local-dir` (un dossier par modèle,
lisible et supprimable à la main — pas la structure opaque du cache HF).

## Démarrer en 3 commandes

```bash
docker compose build                                # 1. construire la boîte à outils
docker compose run --rm llama bash                  # 2. y entrer
# 3. télécharger un modèle (~6 Go)
hf download unsloth/LFM2.5-8B-A1B-GGUF \
    --include "LFM2.5-8B-A1B-UD-Q5_K_M.gguf*" \
    --local-dir /models/LFM2.5-8B-A1B-UD-Q5_K_M
```

Puis `llama-cli -m /models/LFM2.5-8B-A1B-UD-Q5_K_M/LFM2.5-8B-A1B-UD-Q5_K_M.gguf`
et vous discutez avec un LLM sur votre CPU. La suite détaille chaque étape.

## 1. Construire l'image

```bash
docker compose build
```

Changer de version de llama.cpp :

```bash
docker compose build --build-arg LLAMA_VERSION=<tag>
```

## 2. Entrer dans la boîte à outils

```bash
docker compose run --rm llama bash
```

Le conteneur partage le réseau de l'hôte (`network_mode: host`) : pas de
ports à publier, pas de `--service-ports`. Le serveur écoute directement
sur l'hôte.

Le dossier de travail est `/models` ; sont disponibles : `hf`, `llama-cli`,
`llama-server`, `llama-bench`.

## 3. Télécharger un modèle (depuis le conteneur)

```bash
hf download unsloth/LFM2.5-8B-A1B-GGUF \
    --include "LFM2.5-8B-A1B-UD-Q5_K_M.gguf*" \
    --local-dir /models/LFM2.5-8B-A1B-UD-Q5_K_M
```

Le modèle apparaît aussitôt à plat dans `models/` côté hôte, avec son nom
de fichier `.gguf` intact. Pour un modèle « gated », renseigner `HF_TOKEN`
dans un fichier `.env` (copier `.env.example`).

## 4. Dialoguer ou servir

Toujours dans le conteneur :

```bash
# Dialogue interactif
llama-cli -m /models/LFM2.5-8B-A1B-UD-Q5_K_M/LFM2.5-8B-A1B-UD-Q5_K_M.gguf
```

```bash
# Serveur (API compatible OpenAI + docs sur / ) — cette machine uniquement
llama-server -m /models/LFM2.5-8B-A1B-UD-Q5_K_M/LFM2.5-8B-A1B-UD-Q5_K_M.gguf \
    -c 8192
```

**Toujours fixer `-c`** : sans lui, `llama-server` ouvre 4 slots (`-np` auto)
et réserve 4 × le contexte du modèle — mesuré : 17,9 Gio de KV cache pour
Qwen3-0.6B, un modèle de 373 Mo. Pour un seul utilisateur, ajoutez `-np 1`.

Raccourci : `llama-server -hf unsloth/Qwen3-0.6B-GGUF:Q4_K_M -c 8192`
télécharge le modèle (dans le cache HF, pas dans `models/`) puis le sert.

Sans `--host`, `llama-server` se lie à `127.0.0.1` : interface et API sur
<http://127.0.0.1:8080>, **invisibles depuis le réseau local**.
Pour l'ouvrir au réseau local, ajoutez le paramètre :

```bash
# ⚠ Accessible depuis le réseau local
llama-server -m /models/…/modele.gguf -c 8192 --host 0.0.0.0
```

### Astuce : régler les threads au plus juste

Ne passez pas `-t` par défaut : sur un CPU hybride, llama.cpp ne compte que
les **P-cores** et ignore E-cores et hyperthreading (6 threads ici, sur
14 cœurs / 20 threads). Mesuré sur ce laptop avec LFM2.5-8B-A1B : 34,6 tok/s
en génération avec 6 threads, contre 26,4 avec 14 — la génération est
limitée par la bande passante mémoire, et ajouter des threads la sature. Le
traitement du prompt, lui, profite de plus de threads. Pour trancher sur
votre puce et votre modèle, mesurez avec `llama-bench` :

```bash
llama-bench -m /models/LFM2.5-8B-A1B-UD-Q5_K_M/LFM2.5-8B-A1B-UD-Q5_K_M.gguf \
    -pg 512,256 -t 6,8,14,20
```

## 5. Brancher un agent (OpenCode)

[`opencode.jsonc`](opencode.jsonc) déclare un provider `llama-local`
compatible OpenAI (syntaxe OpenCode v2). Côté serveur, prévoir au moins
32k de contexte — OpenCode envoie ~10 000 tokens dès le premier tour — et
un nom de modèle stable :

```bash
# dans le conteneur
llama-server -m /models/…/modele.gguf -c 32768 -np 1 --alias local-model
```

```bash
# sur l'hôte, dans ce repo
export LLAMA_BASE_URL=http://127.0.0.1:8080/v1
curl -s $LLAMA_BASE_URL/models          # test de vie
opencode            # puis choisir le modèle llama-local/local-model
opencode run -m llama-local/local-model "Les tests de demo/ sont rouges, rends-les verts."
```

Pour viser un serveur du réseau local, changer `LLAMA_BASE_URL` (et lancer
ce serveur avec `--host 0.0.0.0`).

## Ce repo sert aussi de support à une présentation

« **LLM & développement agentique — tout ça tourne chez vous** » :

- [`presentation/`](presentation/) — le deck **`llm-agentique-local.pptx`** (+ son PDF),
  son script de fabrication (`build_deck.js`), le plan détaillé de la session
  (`PLAN.md`) et les scripts des lives (`SCENARIOS.md`) ;
- [`demo/`](demo/) — un mini-projet Python avec un bug volontaire, rendu
  visible par une page « ticket de caisse » (`python3 demo/web/server.py`) :
  la démo agentique (l'agent d'OpenCode corrige le ticket client) ;
- [`.opencode/skills/explain-file/`](.opencode/skills/explain-file/SKILL.md) —
  la skill écrite en direct pendant la troisième partie, qui explique un fichier
  de code en moins de vingt lignes.

