# Exécuter des LLM en local — faits vérifiés contre sources primaires

> **Recherche** menée le 5 octobre 2026 pour restructurer la présentation
> « LLM & développement agentique — tout ça tourne chez vous » autour de la
> seule **pratique de l'exécution locale** (retrait de la théorie tokenisation /
> paramètres / sampling / entraînement).
>
> **Méthode** : chaque fait est rattaché à une source primaire (docs et code du
> dépôt [ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp), spec
> GGUF, documentation officielle Hugging Face, documentation OpenCode, model
> cards). Quand une affirmation courante n'a pas pu être retrouvée dans une
> source primaire, elle est signalée en section **« Limites / non vérifiable »**.
> Les pages ont été consultées dans leur version en ligne à la date du 5 oct.
> 2026 ; là où le dépôt épingle llama.cpp `v0.5.0`, les docs ont aussi été
> vérifiées sur ce tag.

> ⚠️ **Errata (5 oct. 2026)** : plusieurs points de cette note sont corrigés
> au §0 de [`acte1-mecanique-inference.md`](acte1-mecanique-inference.md)
> (ratio prefill/decode sur CPU, rôle de mmap, `--fit`, `-t` auto sur CPU
> hybride, `--no-mmap`/`--mlock` remplacés par `-lm`, formules mémoire, lien
> mort vers la spec GGUF) et §0 de [`acte2-harnais.md`](acte2-harnais.md)
> (syntaxe OpenCode v2). Mesures locales : [`mesures-2026-10-05.md`](mesures-2026-10-05.md).

---

## 1. Outillage llama.cpp pour l'exécution locale

### 1.1 Que font `llama-cli`, `llama-server`, `llama-bench`

- **`llama-cli`** : outil de dialogue en terminal. Par défaut il lance une
  **conversation interactive** ; `-st, --single-turn` la limite à un seul tour,
  `-p, --prompt` pré-remplit le premier tour, `-sys/--system-prompt` fixe le
  message système. `--show-timings` (défaut : **activé**) affiche les
  informations de temps **après chaque réponse** — c'est-à-dire les tokens/s
  mesurés par le client lui-même
  ([tools/cli/README.md](https://github.com/ggml-org/llama.cpp/blob/master/tools/cli/README.md)).
- **`llama-server`** : « Set of LLM REST APIs and a web UI to interact with
  llama.cpp » — serveur HTTP exposable + **Web UI intégrée activée par défaut**
  (`--ui/--webui`, défaut enabled)
  ([tools/server/README.md](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)).
  Le README principal montre cette « Built-in web UI against `llama serve` »
  ([README](https://github.com/ggml-org/llama.cpp/blob/master/README.md)).
- **`llama-bench`** : banc d'essai de throughput. Trois types de mesures :
  **pp** (prompt processing, `-p`), **tg** (text generation, `-n`), **pg**
  (les deux enchaînés, `-pg`). Chaque test est répété `-r` fois (défaut 5) et
  les résultats sont donnés en **tokens/s moyens ± écart-type** ; sortie `md`,
  `csv`, `json`, `jsonl` ou `sql`
  ([tools/llama-bench/README.md](https://github.com/ggml-org/llama.cpp/blob/master/tools/llama-bench/README.md)).

À noter : le README principal met désormais en avant une commande unifiée
(`llama cli -hf …`, `llama serve -hf …`) et un installeur
`https://llama.app/install.sh` ; `llama-cli`, `llama-server` et `llama-bench`
restent les binaires documentés et construits par le repo
([README](https://github.com/ggml-org/llama.cpp/blob/master/README.md),
[tools/cli/README.md](https://github.com/ggml-org/llama.cpp/blob/master/tools/cli/README.md)).

### 1.2 Options clés pour débuter, avec leurs valeurs par défaut documentées

Valeurs identiques sur master et sur le tag `v0.5.0` épinglé par le repo, sauf
mention contraire. Sources : tables « Common params » / « Server-specific
params » des README
([server master](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md),
[server v0.5.0](https://github.com/ggml-org/llama.cpp/blob/v0.5.0/tools/server/README.md),
[cli master](https://github.com/ggml-org/llama.cpp/blob/master/tools/cli/README.md)).

| Option | Rôle (textuel) | Défaut documenté |
|---|---|---|
| `-m, --model FNAME` | chemin du fichier GGUF | requis en pratique ; `llama-bench` a un défaut de démo |
| `-hf, --hf-repo <user>/<model>[:quant]` | télécharger et charger directement depuis Hugging Face ; quant optionnel, **défaut `Q4_K_M`**, sinon premier fichier du repo | unused ([bench README](https://github.com/ggml-org/llama.cpp/blob/master/tools/llama-bench/README.md), [docs/models.md](https://github.com/ggml-org/llama.cpp/blob/master/docs/models.md)) |
| `-c, --ctx-size N` | size of the prompt context | **0 = loaded from model** (le contexte est lu dans les métadonnées GGUF) |
| `-t, --threads N` | nombre de threads CPU pour la génération | **-1** (automatique) ; `llama-bench` : « system dependent » |
| `-tb, --threads-batch N` | threads pour le batch/prompt processing | même valeur que `--threads` |
| `-ngl, --n-gpu-layers N` | nombre de couches à mettre en VRAM (`N`, `auto` ou `all`) | **auto** (sans GPU : rien n'est offloadé) |
| `--host HOST` | adresses d'écoute | **127.0.0.1** |
| `--port PORT` | port d'écoute | **8080** |
| `-np, --parallel N` | slots serveur (server) / séquences parallèles (cli) | server : **-1 = auto** ; cli : **1** |
| `--api-key KEY` | clé d'authentification du serveur | none (env `LLAMA_API_KEY`) |
| `--metrics` | activer l'endpoint Prometheus `/metrics` | **disabled** |
| `--jinja, --no-jinja` | moteur de template Jinja pour le chat | **enabled** (défaut master) |

Conseils CPU documentés : dans
[docs/development/token_generation_performance_tips.md](https://github.com/ggml-org/llama.cpp/blob/master/docs/development/token_generation_performance_tips.md),
l'oversaturation CPU est le premier piège — si la génération est très lente,
descendre à `-t 1`, puis monter jusqu'au goulot ; quand le CPU est saturé,
« **you need to explicitly set this parameter to the number of the physical CPU
cores** on your machine ».

### 1.3 `llama-server` expose-t-il une API compatible OpenAI ?

Oui, et c'est documenté comme tel, avec une nuance textuelle : « While no
strong claims of compatibility with OpenAI API spec is being made, in our
experience it suffices to support many apps »
([server README, « OpenAI-compatible API Endpoints »](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)).

Endpoints OpenAI-compatible listés dans ce README (les mêmes existent sur
`v0.5.0`) :

- `GET /v1/models` — id du modèle = chemin `-m` par défaut, personnalisable via
  `--alias` ;
- `POST /v1/completions` ;
- `POST /v1/chat/completions` (streaming inclus ; `response_format` JSON et
  JSON-schema supportés) ;
- `POST /v1/responses`, `POST /v1/embeddings`.

Endpoints « natifs » utiles côté exploitation : `GET /health` (public, pas de
clé ; `/v1/health` aussi), `GET /props`, `GET /slots`, `GET /metrics`
(nécessite `--metrics`), et `POST /completion` (non-OAI) dont la réponse
contient un champ `timings` avec `predicted_per_second`
([server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)).

### 1.4 Images Docker officielles

[docs/docker.md](https://github.com/ggml-org/llama.cpp/blob/master/docs/docker.md)
(documente, registry `ghcr.io/ggml-org/llama.cpp`) :

- **3 variantes de base** (CPU, plateformes `linux/amd64`, `linux/arm64`,
  `linux/s390x`) : `:full` (llama-cli/completion + outils de conversion et
  quantification), `:light` (exécutables llama-cli/completion), `:server`
  (exécutable llama-server seul) ;
- **variantes accélérateur** par suffixe : `-cuda`, `-cuda13`, `-rocm`,
  `-musa`, `-intel` (SYCL), `-vulkan`, `-openvino` — p. ex.
  `ghcr.io/ggml-org/llama.cpp:server-cuda`. Sans suffixe = build CPU.
- Avertissement officiel : « The GPU enabled images are not currently tested by
  CI beyond being built » ; pour des options de build différentes (CUDA/ROCm/
  MUSA non standard), « you'll need to build the images locally for now ».

Comparaison avec le fait de builder soi-même : la voie « build from source »
est la voie officielle alternative du README
([README](https://github.com/ggml-org/llama.cpp/blob/master/README.md)), et
[docs/build.md](https://github.com/ggml-org/llama.cpp/blob/master/docs/build.md)
documente le chemin minimal `cmake -B build && cmake --build build` (le backend
CPU x86 AVX2 est couvert par le support « AVX, AVX2, AVX512 and AMX » du
README). Les images officielles ne contiennent **pas** le CLI Hugging Face,
alors que l'image du repo ajoute `hf` — c'est l'écart qui justifie une image
maison (voir section A).

---

## 2. GGUF et quantification

### 2.1 Ce que le format GGUF normalise

Définition officielle (spécification)
([ggml-org/ggml · docs/gguf.md](https://github.com/ggml-org/ggml/blob/master/docs/gguf.md)) :

- « GGUF is a file format for storing models for inference with GGML and
  executors based on GGML. GGUF is a binary format that is designed for fast
  loading and saving of models » ; successeur de GGML/GGMF/GGJT ;
- **déploiement mono-fichier** : « Single-file deployment … do not require any
  external files for additional information » ; format **extensible** ; pensé
  pour `mmap` ;
- **paires clé/valeur normalisées** : `general.architecture` (architecture du
  modèle), `general.size_label`, `llm.context_length` (« length of the context
  (in tokens) that the model was trained on » — aussi noté `n_ctx`),
  `llm.embedding_length`, `llm.block_count`, `tokenizer.chat_template`
  (« a Jinja template that specifies the input format expected by the model »).
  C'est ce qui permet `-c 0` = contexte lu depuis le modèle (cf. §1.2).

Côté Hugging Face : « unlike tensor-only file formats like safetensors … GGUF
encodes both the tensors and a standardized set of metadata » ; le Hub fournit
un **viewer de métadonnées et de tenseurs** pour les fichiers GGUF
([docs/hub/en/gguf](https://huggingface.co/docs/hub/en/gguf)).

### 2.2 Conventions de nommage des fichiers

La spec définit une convention
([docs/gguf.md, « GGUF Naming Convention »](https://github.com/ggml-org/ggml/blob/master/docs/gguf.md)) :

```
[<Sidecar>]<BaseName><SizeLabel><FineTune><Version><Encoding><Type><Shard>.gguf
```

- `Sidecar` : `mmproj` (projecteur multimodal) ou `mtp` (têtes multi-token) ;
- `SizeLabel` : classe de taille de paramètres (`8B`, `14B`…) ;
- `Encoding` : « the weights encoding scheme that was applied to the model » —
  c'est la composante où vivent `F16`, `Q4_0`, `KQ2`, etc. ;
- La spec admet elle-même : « It is not intended to be perfectly parsable in
  the field due to the diversity of existing gguf filenames ».

**Point important, documenté comme tel** : les suffixes `Q4_K_M`, `Q5_K_M`,
`Q8_0`, le préfixe `UD-` ou `MXFP4_MOE` ne sont **pas** normalisés par la spec
en tant que chaînes obligatoires — la spec ne fait que ranger l'« encoding »
dans le nom. Les définitions par type de quantification (bpw, structure de
blocs) viennent d'ailleurs (§2.3).

### 2.3 Familles de quantification : ce qui est documenté officiellement

- **Types et bits/weight** : la page Hub GGUF fournit un tableau des types,
  par ex. `Q4_K` → « Super-blocks with 8 blocks, each block has 32 weights …
  resulting in **4.5 bits-per-weight** », `Q5_K` → 5.5 bpw, `Q6_K` → 6.5625,
  `Q2_K` → 2.625 ; les types `IQ*` (« importance matrix ») sont définis comme
  « obtained using super_block_scale & **importance matrix** »
  ([docs/hub/en/gguf](https://huggingface.co/docs/hub/en/gguf)).
- **K-quants et I-quants** : la doc quantification de llama.cpp rattache
  officiellement les familles aux PR d'origine : `[k-quants] PR #1684`, i-quants
  et importance matrix via PRs #4773, #4856, #4861, #5196, etc.
  ([tools/quantize/README.md](https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md)).
- **Définition de la quantification et de sa perte de qualité** : « Quantization
  reduces the precision of model weights (e.g., from 32-bit floats to 4-bit
  integers), which shrinks the model's size and can speed up inference. This
  process however, may introduce some accuracy loss which is usually measured
  in Perplexity (ppl) and/or Kullback–Leibler Divergence (kld). This can be
  minimized by using a suitable imatrix file »
  ([tools/quantize/README.md](https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md)).
- **« UD » = Unsloth Dynamic** : formatage propriétaire du quantizer Unsloth
  Dynamic, documenté sur leurs docs officielles — « Dynamic v3.0 is the next
  iteration of our Dynamic quantization … work with most inference engines
  including llama.cpp » ; méthodologie : imatrix de calibration, sélection de
  couches, quants mixtes (variantes `XL`) ; l'URL liée par la model card
  LFM2.5 (`basics/unsloth-dynamic-v2.0-gguf`) redirige aujourd'hui vers la page
  Dynamic **3.0**
  ([docs.unsloth.ai · Dynamic 3.0 GGUFs](https://docs.unsloth.ai/basics/dynamic-3.0-ggufs)).
  Les gains annoncés (« >10 % top-1 better accuracy at the same size ») sont
  des **revendications de l'éditeur**, pas des mesures tierces.
- **Recommandation pratique par défaut** : le flag `-hf` de llama.cpp prend
  `Q4_K_M` par défaut quand le quant n'est pas précisé
  ([bench README](https://github.com/ggml-org/llama.cpp/blob/master/tools/llama-bench/README.md))
  — c'est la seule « recommandation implicite officielle » d'un quant de
  départ retrouvée dans une source primaire.

### 2.4 Compromis taille / vitesse : les données officielles

La doc quantification publie un exemple mesuré pour
`meta-llama/Llama-3.1-8B` (bits/weight, taille, t/s en pp@512 et tg@128)
([tools/quantize/README.md](https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md)) :

| Quant | bits/weight | Taille (GiB) | Prompt processing t/s @512 | Text gen t/s @128 |
|---|---|---|---|---|
| Q2_K | 3.16 | 2.95 | 784 | 79.85 |
| Q4_K_S | 4.67 | 4.36 | 819 | 76.71 |
| Q4_K_M | 4.89 | 4.58 | 822 | 71.93 |
| Q5_K_M | 5.70 | 5.33 | 759 | 67.23 |
| Q6_K | 6.56 | 6.14 | 812 | 58.67 |
| Q8_0 | 8.50 | 7.95 | 865 | 50.93 |

Lecture prudente : le matériel de mesure n'est pas précisé dans la table ;
l'ordre de grandeur exploitable est **relatif** (passer de Q4_K_M à Q8_0 coûte
~2× la place pour ~30 % de tok/s en moins). L'asymétrie pp/tg est le fait le
plus solide : le prompt processing est **un à deux ordres de grandeur plus
rapide** que la génération.

### 2.5 Dimensionnement mémoire : ce qui est documenté, ce qui ne l'est pas

- **Documenté** : « As the models are currently fully loaded into memory, you
  will need adequate disk space to save them and sufficient RAM to load them » +
  table Llama 3.1 : 8B : 32.1 GB → **4.9 GB en Q4_K_M** ; 70B : 280.9 GB →
  43.1 GB en Q4_K_M
  ([tools/quantize/README.md](https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md)).
  Autrement dit, règle défendable en présentation : **RAM dispo ≈ taille du
  fichier + KV cache + buffers**, avec mmap actif par défaut (`-lm auto`) qui
  tempère la mise en RAM stricte
  ([server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)).
- **Documenté** : le KV cache est un coût séparé, typé — `-ctk/--cache-type-k`
  et `-ctv/--cache-type-v`, défaut **f16**, valeurs possibles incluant `q8_0`,
  `q4_0`, `iq4_nl` (réduction documentée du coût mémoire du contexte, sans
  table GiB/tokens) et `-fa/--flash-attn` défaut `auto`
  ([server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)).
- **Non vérifié** : la formule « 1 GiB/billion de paramètres en F32, 0.35 GiB
  en Q8_0, 0.25 GiB en Q4_0 » et la règle « M = medium, S = small, L = large »
  des K-quants n'ont été retrouvées dans aucune page du corpus officiel actuel
  (voir « Limites »).

---

## 3. Trouver et télécharger des modèles GGUF sur Hugging Face

### 3.1 Recherche de dépôts GGUF

- URL officielle de recherche par bibliothèque : **`huggingface.co/models?library=gguf`**,
  citée à la fois par llama.cpp (« thousands of models compatible with
  llama.cpp ») et par la doc Hub GGUF
  ([docs/models.md](https://github.com/ggml-org/llama.cpp/blob/master/docs/models.md),
  [docs/hub/en/gguf](https://huggingface.co/docs/hub/en/gguf)).
- En CLI, le filtre par app est prévu : `hf models ls --search "…"`,
  `--apps llama.cpp`, `--no-gated`, `--author`, `--pipeline-tag` ; et pour voir
  les fichiers d'un repo : `hf models ls <repo> --tree -h`
  ([guide CLI](https://huggingface.co/docs/huggingface_hub/guides/cli)).

### 3.2 Syntaxe de `hf download`

Source unique : [guide CLI huggingface_hub](https://huggingface.co/docs/huggingface_hub/guides/cli).

- `hf download <repo_id> [fichier…]` ; motif de fichiers via `--include` et
  `--exclude` (`--include "*.safetensors"` en exemple) ;
- `--revision <commit|branche|tag>` ; `--repo-type dataset|space` ;
- `--token=hf_****` : accès explicite aux dépôts **privés ou gated** (« the
  token saved locally (using `hf auth login`) will be used » par défaut) ;
- `--dry-run` : liste les fichiers qui seraient téléchargés avec leur taille
  (pratique avant de télécharger un quant) ;
- `--quiet` : n'imprime que le chemin final ; `HF_HUB_DOWNLOAD_TIMEOUT` pour
  les connexions lentes ;
- `--cache-dir` ou `HF_HOME` pour déplacer le cache.

### 3.3 `--local-dir` vs cache par défaut

- **Cache par défaut** (le mode « recommandé » officiel) : fichiers sous
  `HF_HOME` (`~/.cache/huggingface` par défaut), structure
  `hub/models--<repo>/snapshots/<hash>/…`, déduplication par symlinks
  ([guide CLI](https://huggingface.co/docs/huggingface_hub/guides/cli),
  [environment_variables](https://huggingface.co/docs/huggingface_hub/package_reference/environment_variables)).
- **`--local-dir`** : « download files and move them to a specific folder …
  workflow closer to what git commands offer » ; un dossier
  **`.cache/huggingface/` est créé à la racine du dossier local** avec les
  métadonnées, ce qui évite les re-téléchargements inutile ; « files keep
  their names » — exactement la structure « à plat » observable dans `models/`
  de ce repo (dossier `.cache/huggingface/` présent à côté du `.gguf`)
  ([guide CLI](https://huggingface.co/docs/huggingface_hub/guides/cli)).
- `HF_HUB_OFFLINE=1` : n'accède plus qu'aux fichiers déjà en cache, et saute
  même l'appel HTTP de vérification de version — pertinent pour une démo sans
  réseau ([environment_variables](https://huggingface.co/docs/huggingface_hub/package_reference/environment_variables)).

### 3.4 Modèles gated et `HF_TOKEN`

- Un modèle **gated** = dépôt avec access requests ; l'accès se demande
  **depuis le navigateur**, compte par compte (jamais par organisation) ;
  approbation automatique ou manuelle selon l'auteur
  ([docs/hub/en/models-gated](https://huggingface.co/docs/hub/en/models-gated)).
- Pour **télécharger** un modèle gated en script, il faut être authentifié :
  `hf auth login` (qui enregistre le token) ou le paramètre `token` passé aux
  méthodes de téléchargement
  ([models-gated](https://huggingface.co/docs/hub/en/models-gated)).
- La variable d'environnement **`HF_TOKEN`** configure le User Access Token et
  **écrase** le token stocké sur la machine ; l'ancien nom
  `HUGGING_FACE_HUB_TOKEN` est officiellement déprécié en sa faveur
  ([environment_variables](https://huggingface.co/docs/huggingface_hub/package_reference/environment_variables)).
- `hf auth logout` ne déconnecte **pas** un login fait via `HF_TOKEN` (il
  faudrait unset la variable) — piège connu documenté
  ([guide CLI](https://huggingface.co/docs/huggingface_hub/guides/cli)).

### 3.5 `hf_transfer` est déprécié — remplacé par Xet

Attention, c'est un changement récent de la doc officielle :
`HF_HUB_ENABLE_HF_TRANSFER` est marquée **« deprecated »** — « Now that the
Hugging Face Hub is fully powered by the Xet storage backend, all file
transfers go through the `hf-xet` binary package … This means `hf_transfer`
can't be used anymore. If you are interested in higher performance, check out
the `HF_XET_HIGH_PERFORMANCE` section » ; `HF_XET_HIGH_PERFORMANCE=1` est
présenté comme « analogous to the legacy `HF_HUB_ENABLE_HF_TRANSFER=1` »
([environment_variables](https://huggingface.co/docs/huggingface_hub/package_reference/environment_variables)).

---

## 4. Choisir un modèle pour un environnement CPU

### 4.1 Dense vs MoE : paramètres totaux vs actifs

- Les model cards définissent les deux nombres. Celle de LFM2.5-8B-A1B :
  « **Total parameters: 8.3B** » / « **Active parameters: 1.5B** », architecture
  hybride « 24 layers (18 double-gated LIV conv + 6 GQA) », contexte 131 072
  ([model card](https://huggingface.co/unsloth/LFM2.5-8B-A1B-GGUF)).
- Ce que la source primaire dit sur la vitesse : la carte affirme « **Unmatched
  throughput**: Fastest in its size class on both CPU and GPU inference, with
  day-one support for llama.cpp… » — revendication vendeur, pas une mesure
  indépendante. **Aucune doc llama.cpp officielle retrouvée ne formalise « la
  vitesse de génération en CPU dépend des paramètres actifs, la RAM des
  paramètres totaux »** : le mécanisme est community common sense mais figure
  ici en « Limites » (C3).
- llama.cpp documente en revanche des options MoE explicites, côté offload :
  `-cmoe, --cpu-moe` (« keep all Mixture of Experts (MoE) weights in the CPU »),
  `-ncmoe, --n-cpu-moe N`, et `-ncffn, --n-cpu-ffn N` pour les FFN denses
  ([server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)).
- Les repos GGUF publient des quants spécifiques MoE : p. ex.
  `LFM2.5-8B-A1B-MXFP4_MOE.gguf` dans le dépôt utilisé par le repo
  ([API HF](https://huggingface.co/api/models/unsloth/LFM2.5-8B-A1B-GGUF)).

### 4.2 Taille de contexte et coût mémoire (KV cache)

- Le contexte par défaut vient du GGUF (`-c 0` = loaded from model ; cf. §1.2) ;
  la clef spec qui le porte est `llm.context_length` (§2.1)
  ([server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md),
  [spec GGUF](https://github.com/ggml-org/llama.cpp/blob/master/docs/gguf.md)).
- Le KV cache se dimensionne avec `-ctk/-ctv` (défaut f16 ; types réduits
  `q8_0`, `q4_0`, `iq4_nl`…) et `--cache-prompt` (défaut activé) ; la
  réponse `/completion` expose `tokens_cached` et `truncated` (dépassement de
  `n_ctx`) pour diagnostiquer
  ([server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)).
- **Formule GiB/tokens du KV cache : non trouvée dans le corpus officiel
  actuel** (voir « Limites » C2). Pour la présentation : affirmer que le KV
  cache s'ajoute au fichier et se comprime via les types de cache, sans chiffre
  exact.

### 4.3 Ce que dit réellement la model card `unsloth/LFM2.5-8B-A1B-GGUF`

Vérifiée le 5 oct. 2026 sur la page et l'API du dépôt
([model card](https://huggingface.co/unsloth/LFM2.5-8B-A1B-GGUF),
[API](https://huggingface.co/api/models/unsloth/LFM2.5-8B-A1B-GGUF)) :

- Base : `LiquidAI/LFM2.5-8B-A1B` (licence `other` / `lfm1.0`) ; quantizations
  publiées par Unsloth. La carte renvoie vers la repo **officielle Liquid**
  `LiquidAI/LFM2.5-8B-A1B-GGUF` pour les quants standard.
- Description : « LFM2.5 is a new family of **hybrid models designed for
  on-device deployment** … built on LFM2 with extended pre-training and
  reinforcement learning ».
- Features annoncées : « On-device personal assistant … **chaining tool
  calls** and following complex instructions » ; « Compressed performance:
  Competitive with much larger dense and MoE models on instruction following
  and **agentic tasks** » ; throughput « fastest in its size class » (revendications
  vendeur).
- Détails : 8.3B totaux / 1.5B actifs, 24 layers (18 double-gated LIV conv +
  6 GQA), 38T tokens d'entraînement, contexte **131 072**, vocab 128 000,
  8 langues dont le français.
- Recommandation d'usage textuelle : « use for **agentic workflows, tool use**,
  structured outputs, multilingual assistants, and on-device
  personal-assistant applications. **It is not the best fit for heavy
  programming or knowledge-intensive question answering without retrieval**. »
- **Fichiers GGUF réellement présents (tailles via API)** : BF16 15.78 GiB ;
  Q8_0 8.39 ; MXFP4_MOE 4.98 ; UD-Q5_K_M **5.92** ; UD-Q5_K_S 5.59 ;
  UD-Q4_K_M 4.96 ; UD-Q4_K_XL 4.98 ; UD-Q3_K_XL 3.73 ; UD-Q2_K_XL 2.72 ;
  UD-IQ1_M 2.40 (22 fichiers au total). Le fichier local
  `LFM2.5-8B-A1B-UD-Q5_K_M.gguf` (6.0 Go mesurés par `du`) correspond au
  fichier 5.92 GiB du dépôt.
- La carte lie la méthodologie « Unsloth Dynamic » (v2.0 à l'époque du lien,
  docs passées à 3.0 depuis — cf. §2.3).

---

## 5. Branchements sur un harnais agentique

### 5.1 Brancher un provider « OpenAI-compatible » local sur OpenCode

OpenCode documente une section **llama.cpp dédiée** dans sa page Providers :

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "llama.cpp": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "llama-server (local)",
      "options": { "baseURL": "http://127.0.0.1:8080/v1" },
      "models": {
        "qwen3-coder:a3b": {
          "name": "Qwen3-Coder: a3b-30b (local)",
          "limit": { "context": 128000, "output": 65536 }
        }
      }
    }
  }
}
```

Champs documentés : l'id du provider est libre ; `npm` vaut
`@ai-sdk/openai-compatible` « for any OpenAI-compatible API » ; `options.baseURL`
est l'endpoint du serveur local ; `models` mappe les ids de modèles (ceux
exposés par l'API) vers leurs noms/config
([opencode.ai/docs/providers](https://opencode.ai/docs/providers/)).

Côté fichier de config
([opencode.ai/docs/config](https://opencode.ai/docs/config/)) :

- formats **JSON et JSONC** acceptés (`opencode.json`, `opencode.jsonc`) ;
- emplacements et **precedence** (les configs se **fusionnent**) : global
  `~/.config/opencode/opencode.json` → `OPENCODE_CONFIG` → **projet :
  `opencode.json` à la racine** (cherché du cwd vers le dépôt git) → … ;
- sélection du modèle actif par `model: "<id-provider>/<id-modele>"` ; option
  **`small_model`** pour les tâches légères (titres de session) — « By default,
  OpenCode tries to use a cheaper model if one is available from your provider,
  otherwise it falls back to your main model » ;
- substitution `{env:VAR}` dans le JSON (pratique pour des clés).

Pour `llama-server` : l'id renvoyé par `GET /v1/models` est le **chemin `-m`**
par défaut ; `--alias` permet de lui donner un id propre à référencer dans
OpenCode ([server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)).

### 5.2 Tool calling côté llama.cpp

- Support **OpenAI-style function calling** dans `common/chat.h`, utilisé par
  `llama-server` avec `--jinja` (défaut : activé)
  ([docs/function-calling.md](https://github.com/ggml-org/llama.cpp/blob/master/docs/function-calling.md)).
- **Parsers natifs par famille** de formats : Llama 3.1/3.3, Functionary v3.x,
  Hermes 2/3, Qwen 2.5, Qwen 2.5 Coder, Mistral Nemo, Firefunction v2,
  Command R7B, DeepSeek R1 (« WIP / seems reluctant to call any tools? » —
  formulation officielle), GPT-OSS (Harmony)…
- **Fallback « Generic »** quand le template n'est pas reconnu — avec
  l'avertissement textuel : « Generic support **may consume more tokens and be
  less efficient** than a model's native format »
  ([docs/function-calling.md](https://github.com/ggml-org/llama.cpp/blob/master/docs/function-calling.md)).
- Options serveur liées : `parse_tool_calls` (« whether to parse the generated
  tool call »), `parallel_tool_calls` (parallèle/multiples appels : « only
  supported on some models, verification is based on jinja template »),
  `--skip-chat-parsing` pour forcer un parseur de contenu pur
  ([server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)).

### 5.3 Fiabilité du tool calling sur petits modèles : ce que disent les sources officielles

Aucun benchmark officiel llama.cpp « fiabilité du tool calling par taille de
modèle » n'a été trouvé. Les sources officielles disent, textuellement :

- OpenCode, section Atomic Chat (modèles locaux) : « If tool calls aren't
  working well, pick a loaded model with **strong tool-calling support** (for
  example, a Qwen-Coder or DeepSeek-Coder variant) »
  ([providers](https://opencode.ai/docs/providers/)).
- OpenCode, section Ollama : « If tool calls aren't working, try **increasing
  `num_ctx`**. Start around **16k–32k** » — le contexte est traité comme le
  premier levier ([providers](https://opencode.ai/docs/providers/)).
- llama.cpp : le format non reconnu tombe en « Generic », moins efficace ;
  DeepSeek R1 « reluctant » ([function-calling.md](https://github.com/ggml-org/llama.cpp/blob/master/docs/function-calling.md)).
- Cartes de modèles : la carte LFM2.5 se positionne sur « agentic workflows,
  tool use » mais prévient « not the best fit for **heavy programming** » ; la
  carte Qwen3-0.6B (destinée au live 1) met en avant le tool calling via
  Qwen-Agent (« Qwen-Agent encapsulates tool-calling templates and
  tool-calling parsers internally ») sans promesse de fiabilité par taille
  ([Qwen3-0.6B](https://huggingface.co/Qwen/Qwen3-0.6B)).

Formulation défendable en présentation : le tool calling dépend du **parser
natif** reconnu par llama.cpp et du **contexte disponible** ; les docs des
harnais recommandent explicitement de choisir des modèles « outillés » et un
contexte large plutôt que de faire confiance à un petit modèle généraliste.

---

## 6. Mesurer et vérifier

### 6.1 `llama-bench`, mode d'emploi documenté

- `-pg <pp,tg>` : test prompt-processing **puis** text-generation dans un même
  run (ex. `-pg 512,256` = traiter 512 tokens de prompt puis en générer 256) ;
  `-p` défaut 512, `-n` défaut 128
  ([bench README](https://github.com/ggml-org/llama.cpp/blob/master/tools/llama-bench/README.md)).
- `-t, --threads <n>` accepte des **listes** (`-t 1,2,4,8,16,32`) : l'exemple
  officiel du README montre le balayage de threads avec la dégradation
  documentée par les écarts-types (le throughput pp sature avant celui de tg) ;
  tous les paramètres de test acceptent listes et plages (`first-last`,
  `first-last*mult`) ;
- résultats en **t/s ± σ**, répétition `-r` (défaut 5), sortie `md` par défaut.

### 6.2 Où `llama-server` affiche les métriques tok/s

Sources officielles pour trois endroits distincts :

1. **API** : réponse de `POST /completion` contient `timings` — « Hash of
   timing information about the completion such as the number of tokens
   `predicted_per_second` » ; l'option `timings_per_token` ajoute les vitesses
   pp/tg dans chaque réponse du même endpoint
   ([server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)).
2. **Prometheus** : `GET /metrics` (activé par le flag `--metrics`, défaut
   **disabled**) expose notamment `llamacpp:prompt_tokens_seconds` (throughput
   prompt moyen en tokens/s) et `llamacpp:predicted_tokens_seconds`
   (throughput génération moyen)
   ([server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)).
3. **Côté client** : `llama-cli` affiche les timings après chaque réponse
   (`--show-timings`, défaut true) ([tools/cli/README.md](https://github.com/ggml-org/llama.cpp/blob/master/tools/cli/README.md)).

(« les tok/s défilent dans les logs du serveur » : observé en pratique mais
**non documenté** sur les pages référencées — voir Limites C5.)

### 6.3 Endpoints d'inspection documentés

([server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)) :

- `GET /health` (et `/v1/health`) — public, sans clé API ;
- `GET /props` — propriétés globales (`total_slots`, `model_path`,
  `chat_template`, `default_generation_settings`…) ; **lecture seule par
  défaut**, la modification POST exige de démarrer avec `--props` ;
- `GET /slots` — état des slots de requêtes ;
- `GET /v1/models` — fiche du modèle chargé (id, `n_ctx_train`, `n_params`,
  taille du fichier dans `meta`) ;
- `GET /metrics` — cf. §6.2.

---

## A. Ce que le repo fait déjà vs sources primaires

| # | Pratique du repo | Verdict | Source |
|---|---|---|---|
| 1 | README : « Sans `--host`, `llama-server` se lie à `127.0.0.1`… interface et API sur `http://127.0.0.1:8080` » | ✅ Conforme aux defaults documentés (`127.0.0.1`, `8080`) | [server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md) |
| 2 | `llama-server … docs sur /` | ✅ Web UI activée par défaut (`--ui/--webui` défaut enabled) | [server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md) |
| 3 | « Ne passez pas `-t` par défaut : llama.cpp autodétecte… mesurez avec `llama-bench` » | ✅ Cohérent : défaut `-t -1` ; la doc perf dit d'aligner sur les **cœurs physiques** en cas de saturation et de chercher le point de goulot par mesure | [server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md), [perf tips](https://github.com/ggml-org/llama.cpp/blob/master/docs/development/token_generation_performance_tips.md) |
| 4 | `llama-bench -m … -pg 512,256 -t 8,14,20` | ✅ Syntaxe exacte (`-pg <pp,tg>`, listes `-t`) ; `-pg` existe déjà sur le tag v0.5.0 | [bench README master](https://github.com/ggml-org/llama.cpp/blob/master/tools/llama-bench/README.md), [v0.5.0](https://github.com/ggml-org/llama.cpp/blob/v0.5.0/tools/llama-bench/README.md) |
| 5 | `hf download … --include "X.gguf*" --local-dir …` → fichiers « à plat », `.gguf` au nom intact | ✅ Documenté ; le `.cache/huggingface/` créé dans `--local-dir` (observable dans `models/`) est le comportement officiel de reprise du téléchargement | [guide CLI](https://huggingface.co/docs/huggingface_hub/guides/cli) |
| 6 | `.env.example` : `HF_TOKEN=` « utile seulement pour les modèles gated » | ✅ Exact : gated → login requis ; `HF_TOKEN` écrase le token stocké | [models-gated](https://huggingface.co/docs/hub/en/models-gated), [env vars](https://huggingface.co/docs/huggingface_hub/package_reference/environment_variables) |
| 7 | `.env.example` : `HF_HUB_ENABLE_HF_TRANSFER=1` + `pip install hf_transfer` dans le Dockerfile | ⚠️ **Divergence** : variable officiellement **deprecated**, `hf_transfer` ne peut plus être utilisé (Xet est automatique) ; l'équivalent moderne est `HF_XET_HIGH_PERFORMANCE=1`. À retirer du Dockerfile et du `.env.example` | [env vars](https://huggingface.co/docs/huggingface_hub/package_reference/environment_variables) |
| 8 | Dockerfile : `-DLLAMA_CURL=ON -DGGML_CPU=ON` | ⚠️ Ces deux flags n'apparaissent dans **aucune** version du `docs/build.md` consulté (master et v0.5.0) ; la voie documentée est `cmake -B build` (CPU par défaut). Le build passe (image construite) mais n'est pas vérifiable via la doc → à simplifier ou sourcer | [build.md](https://github.com/ggml-org/llama.cpp/blob/master/docs/build.md) |
| 9 | Épingle `LLAMA_VERSION=v0.5.0` | ✅ Le tag existe, publié le 2026-09-23 ; sur ce tag, `tools/server/README.md` documente les mêmes defaults (ctx 0, ngl auto, host 127.0.0.1, port 8080, `/metrics`, `/v1/chat/completions`) que master — pas de dérive entre l'épingle et la doc citée | [GitHub API tag](https://api.github.com/repos/ggml-org/llama.cpp/git/refs/tags/v0.5.0), [release](https://github.com/ggml-org/llama.cpp/releases/tag/v0.5.0), [server v0.5.0](https://github.com/ggml-org/llama.cpp/blob/v0.5.0/tools/server/README.md) |
| 10 | SCENARIOS live 1 : `unsloth/Qwen3-0.6B-GGUF`, fichier `Qwen3-0.6B-Q4_K_M.gguf` « 397 MB » | ✅ Dépôt et fichier existent ; taille API 378 MiB ≈ 397 MB (MB décimaux) — cohérent | [API](https://huggingface.co/api/models/unsloth/Qwen3-0.6B-GGUF) |
| 11 | SCENARIOS checklist : `curl http://192.168.0.110:8080/v1/models` | ✅ Endpoint documenté (le modèle est identifiable via `--alias`) | [server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md) |
| 12 | PLAN/SCENARIOS live 2 : `opencode.jsonc` (~10 lignes, baseURL locale) | ✅ Le pattern (JSONC, provider custom `@ai-sdk/openai-compatible`, `options.baseURL`) est celui documenté — ⚠️ mais **le fichier `opencode.jsonc` n'existe pas dans le repo** (référencé par le PLAN, absent de l'arborescence) ; à recréer ou assumer qu'il vit sur la machine d'inférence | [providers](https://opencode.ai/docs/providers/), [config](https://opencode.ai/docs/config/) |
| 13 | SCENARIOS note skills : détection `.opencode/skills/<nom>/SKILL.md`, aussi `.claude/skills/` et `.agents/skills/`, nom minuscules avec tirets, `description` ≤ 1024 | ✅ Tous confirmés par la doc (paths projet/global, regex `^[a-z0-9]+(-[a-z0-9]+)*$`, « description must be 1-1024 characters ») | [skills](https://opencode.ai/docs/skills/) |
| 14 | GLOSSARY : « à plat … pas la structure opaque du cache HF » | ✅ Juste (la structure `models--…/snapshots/…` est court-circuitée) — nuance : `--local-dir` garde quand même une metadata `.cache/huggingface/` | [guide CLI](https://huggingface.co/docs/huggingface_hub/guides/cli) |
| 15 | README : « modèles GGUF quantifiés jusqu'à ~20 Go » sur 30 Go de RAM | ⚠️ Règle empirique du repo : les docs disent « models fully loaded into memory » + mmap par défaut, mais ne fournissent pas de formule RAM ; plausible, non sourçable | [quantize README](https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md) |

---

## B. Faits utiles pour restructurer la présentation

1. **Trois outils, trois récits** : `llama-cli` (discuter), `llama-server`
   (servir une API OpenAI-compatible + Web UI), `llama-bench` (mesurer) — la
   doc officielle structure déjà l'atelier « discute → sers → mesure »
   ([README](https://github.com/ggml-org/llama.cpp/blob/master/README.md)).
2. **Les defaults sont sûrs** : sans flag, llama.cpp prend le contexte du
   modèle (`-c 0`), autodétecte les threads (`-t -1`), écoute sur
   `127.0.0.1:8080` — message : « la commande minimale marche, les flags sont
   des ajustements mesurés » ([server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)).
3. **`-t` n'est pas un réglage à l'aveugle** : la doc officielle dit aligner
   sur les cœurs physiques **en cas de saturation**, et chercher le point par
   mesure — le couple `-t` + `llama-bench` est LE point « pratique CPU » à
   montrer ([perf tips](https://github.com/ggml-org/llama.cpp/blob/master/docs/development/token_generation_performance_tips.md)).
4. **L'API OpenAI-compatible est un fait documenté** : `/v1/chat/completions`,
   `/v1/models`, streaming, JSON-schema ; `--alias` donne un id propre ; tout
   harnais « OpenAI-compatible » se branche là-dessus
   ([server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)).
5. **OpenCode documente textuellement le branchement llama.cpp** (snippet
   officiel de ~10 lignes, `baseURL: http://127.0.0.1:8080/v1`) : la punchline
   du live 2 peut s'appuyer sur la doc du harnais, pas sur du folklore
   ([providers](https://opencode.ai/docs/providers/)).
6. **GGUF = un fichier auto-descriptif** : tenseurs + métadonnées normalisées
   (architecture, contexte d'entraînement, chat template Jinja) → « rien à
   configurer, le modèle dit lui-même comment on l'utilise »
   ([spec GGUF](https://github.com/ggml-org/ggml/blob/master/docs/gguf.md),
   [docs/hub/en/gguf](https://huggingface.co/docs/hub/en/gguf)).
7. **La quantification racontée avec un seul chiffre officiel** : Llama
   3.1-8B, 32.1 GB → **4.9 GB en Q4_K_M** (≈ ×6.6) — c'est la table du README
   quantize ; « le triangle taille/vitesse/qualité » se montre avec leurs
   colonnes bpw/taille/t/s
   ([quantize README](https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md)).
8. **Dimensionnement** : RAM ≈ taille du fichier (le modèle est « fully loaded
   into memory ») + KV cache ; Q5_K_M 8B ≈ 6 Go → confortable à 30 Go ;
   70B Q4_K_M ≈ 43 Go → hors d'atteinte. Chiffres officiels, pas de formules
   ([quantize README](https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md)).
9. **Le KV cache a des types** (`-ctk/-ctv`, f16 par défaut, réductibles à
   `q8_0`/`q4_0`) — le levier officiel pour « conversation longue sur petite
   machine », à présenter comme tel sans promettre de GiB/tokens
   ([server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)).
10. **MoE = « total vs active »** : le cas d'école est sous les yeux du public,
    LFM2.5-8B-A1B = 8.3 B totaux / 1.5 B actifs (model card), même si le
    mécanisme vitesse↔actifs reste une déduction communautaire (C3)
    ([model card](https://huggingface.co/unsloth/LFM2.5-8B-A1B-GGUF)).
11. **`llama-bench -pg 512,256 -t 8,14,20`** est exactement la syntaxe
    documentée ; le résultat est t/s ± écart-type — la démo « on mesure au lieu
    de croire » est 100 % officielle ; garder la distinction **pp ≫ tg** (le
    prompt processing est un ordre de grandeur plus rapide que la génération)
    ([bench README](https://github.com/ggml-org/llama.cpp/blob/master/tools/llama-bench/README.md)).
12. **Tok/s vérifiables à trois endroits** : client (`--show-timings`), API
    (`timings.predicted_per_second`), `/metrics` Prometheus (via `--metrics`)
    — de quoi clore la présentation en affichant le chiffre plutôt qu'en
    l'annonçant ([cli README](https://github.com/ggml-org/llama.cpp/blob/master/tools/cli/README.md),
    [server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)).
13. **Tool calling = parser natif + contexte** : llama.cpp connaît les formats
    natifs des grandes familles et retombe sur un mode « Generic » moins
    efficace ; OpenCode conseille explicitement des modèles « coder » et un
    contexte 16–32k quand les tool calls dérapent — la fiabilité se choisit,
    elle ne se subit ([function-calling.md](https://github.com/ggml-org/llama.cpp/blob/master/docs/function-calling.md),
    [providers](https://opencode.ai/docs/providers/)).
14. **Le pipeline HF tient en 3 commandes documentées** : chercher
    (`models?library=gguf` ou `hf models ls --apps llama.cpp --tree -h`),
    télécharger (`hf download --include … --local-dir …`), jouer ; gated =
    demande en navigateur + `hf auth login`/`HF_TOKEN`
    ([guide CLI](https://huggingface.co/docs/huggingface_hub/guides/cli),
    [models-gated](https://huggingface.co/docs/hub/en/models-gated)).
15. **Moderniser le repo en même temps** : retirer `hf_transfer` /
    `HF_HUB_ENABLE_HF_TRANSFER` (dépréciés, Xet automatique ; option
    `HF_XET_HIGH_PERFORMANCE=1`) ; simplifier les flags CMake non documentés ;
    recréer le `opencode.jsonc` du live 2 — trois corrections à vendre comme
    « le repo suit la doc de jeudi »
    ([env vars](https://huggingface.co/docs/huggingface_hub/package_reference/environment_variables)).

---

## C. Limites / non vérifiable

- **C1 — Formule mémoire par famille de quant** (type « 1 GiB/billion de
  paramètres en F32, 0.35 GiB en Q8_0, 0.25 GiB en Q4_0 ») : introuvable dans
  le corpus officiel consulté (README/docs master et v0.5.0). Folklore
  communautaire plausible, à ne pas présenter comme sourcé.
- **C2 — Coût GiB/tokens du KV cache** : aucune table ou formule dans les docs
  actuelles de llama.cpp ; seuls les types de cache (`-ctk/-ctv`) et
  l'existence du coût sont documentés.
- **C3 — « La vitesse CPU d'un MoE dépend des paramètres actifs »** : aucun
  texte officiel llama.cpp retrouvé ; la card LFM2.5 affirme « fastest in its
  size class » (revendication vendeur) et définit total/actifs, mais ne lie pas
  formellement actifs ↔ tok/s. À formuler comme mécanisme architectural admis,
  pas comme doc.
- **C4 — Sémantique exacte des suffixes K-quant `S`/`M`/`L`/`XL`** : déduisible
  des tables (Q4_K_S < Q4_K_M en taille et bpw) mais jamais explicitée dans une
  source primaire.
- **C5 — tok/s dans les logs de `llama-server`** : comportement réel
  communément observé, mais non décrit sur les pages README référencées ;
  s'appuyer sur les trois emplacements documentés (§6.2).
- **C6 — Chiffres locaux du PLAN** : « ~35 tok/s » sur `192.168.0.110`, « 14
  cœurs physiques / 20 threads / 30 Go » : mesures propres au matériel,
  aucune source externe possible ; la checklist SCENARIOS prévoit déjà de les
  remesurer le jour J.
- **C7 — Benchmark de la doc quantize** (table Llama-3.1-8B, pp ~800 t/s) :
  matériel de mesure non précisé dans la page → exploiter les ratios, pas les
  absolus.
- **C8 — `HF_TOKEN` et le mode offline du live 2** : `HF_HUB_OFFLINE` s'applique
  au cache `huggingface_hub` ; le comportement d'un modèle chargé par chemin
  local dans llama.cpp n'est pas concerné (aucun téléchargement) — la doc ne
  couvre pas ce cas nommément.
- **C9 — Le dépôt `ggml-org/gguf`** (les chemins testés en `master`/`main` ont
  renvoyé 404) : la spec de référence utilisée ici est `docs/gguf.md` dans
  `ggml-org/ggml`, le lien canonique de la doc llama.cpp
  ([docs/models.md](https://github.com/ggml-org/llama.cpp/blob/master/docs/models.md)).

---

## Sources primaires citées

**llama.cpp** (dépôt ggml-org/llama.cpp)

1. README — https://github.com/ggml-org/llama.cpp/blob/master/README.md
2. tools/server/README.md (master) — https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md
3. tools/server/README.md (v0.5.0) — https://github.com/ggml-org/llama.cpp/blob/v0.5.0/tools/server/README.md
4. tools/cli/README.md — https://github.com/ggml-org/llama.cpp/blob/master/tools/cli/README.md
5. tools/llama-bench/README.md (master) — https://github.com/ggml-org/llama.cpp/blob/master/tools/llama-bench/README.md
6. tools/llama-bench/README.md (v0.5.0) — https://github.com/ggml-org/llama.cpp/blob/v0.5.0/tools/llama-bench/README.md
7. docs/docker.md — https://github.com/ggml-org/llama.cpp/blob/master/docs/docker.md
8. docs/models.md — https://github.com/ggml-org/llama.cpp/blob/master/docs/models.md
9. docs/function-calling.md — https://github.com/ggml-org/llama.cpp/blob/master/docs/function-calling.md
10. tools/quantize/README.md — https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md
11. docs/development/token_generation_performance_tips.md — https://github.com/ggml-org/llama.cpp/blob/master/docs/development/token_generation_performance_tips.md
12. docs/build.md — https://github.com/ggml-org/llama.cpp/blob/master/docs/build.md
13. Tag/release v0.5.0 — https://github.com/ggml-org/llama.cpp/releases/tag/v0.5.0 (date de publication via https://api.github.com/repos/ggml-org/llama.cpp/releases/tags/v0.5.0)

**GGUF**

14. Spécification GGUF — https://github.com/ggml-org/ggml/blob/master/docs/gguf.md

**Hugging Face (documentation officielle)**

15. CLI `hf` (guide huggingface_hub) — https://huggingface.co/docs/huggingface_hub/guides/cli
16. Variables d'environnement `huggingface_hub` — https://huggingface.co/docs/huggingface_hub/package_reference/environment_variables
17. Gated models (Hub) — https://huggingface.co/docs/hub/en/models-gated
18. GGUF sur le Hub — https://huggingface.co/docs/hub/en/gguf

**Model cards / dépôts Hugging Face**

19. unsloth/LFM2.5-8B-A1B-GGUF (model card) — https://huggingface.co/unsloth/LFM2.5-8B-A1B-GGUF
20. unsloth/LFM2.5-8B-A1B-GGUF (liste/tailles de fichiers via API) — https://huggingface.co/api/models/unsloth/LFM2.5-8B-A1B-GGUF
21. Qwen/Qwen3-0.6B (model card) — https://huggingface.co/Qwen/Qwen3-0.6B
22. unsloth/Qwen3-0.6B-GGUF (liste/tailles via API) — https://huggingface.co/api/models/unsloth/Qwen3-0.6B-GGUF

**OpenCode**

23. Providers — https://opencode.ai/docs/providers/
24. Config — https://opencode.ai/docs/config/
25. Agent Skills — https://opencode.ai/docs/skills/

**Unsloth**

26. Unsloth Dynamic GGUFs — https://docs.unsloth.ai/basics/dynamic-3.0-ggufs (URL `basics/unsloth-dynamic-v2.0-gguf` liée par la model card, dorénavant servie par la page 3.0)
