# LLM local avec llama.cpp (Docker)

Boîte à outils conteneurisée pour faire tourner des LLM **en CPU** sur cette
machine (pas de GPU NVIDIA — x86_64 AVX2, 30 Go de RAM → modèles GGUF
quantifiés jusqu'à ~20 Go). Les modèles vivent dans `models/`
(l'[Espace de modèles](GLOSSARY.md)), monté dans le conteneur à `/models`,
toujours téléchargés **à plat** avec `--local-dir` (un dossier par modèle,
lisible et supprimable à la main — pas la structure opaque du cache HF).

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
hf download bartowski/Qwen2.5-14B-Instruct-GGUF \
    --include "*Q4_K_M*" \
    --local-dir /models/Qwen2.5-14B-Instruct-Q4_K_M
```

Le modèle apparaît aussitôt à plat dans `models/` côté hôte, avec son nom
de fichier `.gguf` intact. Pour un modèle « gated », renseigner `HF_TOKEN`
dans un fichier `.env` (copier `.env.example`).

## 4. Dialoguer ou servir

Toujours dans le conteneur :

```bash
# Dialogue interactif
llama-cli -m /models/Qwen2.5-14B-Instruct-Q4_K_M/Qwen2.5-14B-Instruct-Q4_K_M.gguf
```

```bash
# Serveur (API compatible OpenAI + docs sur / ) — cette machine uniquement
llama-server -m /models/Qwen2.5-14B-Instruct-Q4_K_M/Qwen2.5-14B-Instruct-Q4_K_M.gguf \
    -c 8192
```

Sans `--host`, `llama-server` se lie à `127.0.0.1` : interface et API sur
<http://127.0.0.1:8080>, **invisibles depuis le réseau local**.
Pour l'ouvrir au réseau local, ajoutez le paramètre :

```bash
# ⚠ Accessible depuis le réseau local
llama-server -m /models/…/modele.gguf -c 8192 --host 0.0.0.0
```

### Astuce : régler les threads au plus juste

Ne passez pas `-t` par défaut : llama.cpp autodétecte les **cœurs physiques**
(14 ici), ce qui bat en général `-t $(nproc)` (20 threads logiques,
hyperthreading + E-cores compris). Pour trancher sur votre puce et votre
modèle, mesurez avec `llama-bench` :

```bash
llama-bench -m /models/Qwen2.5-14B-Instruct-Q4_K_M/Qwen2.5-14B-Instruct-Q4_K_M.gguf \
    -pg 512,256 -t 8,14,20
```

