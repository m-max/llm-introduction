# Acte 1 — Ce qu'il faut comprendre pour faire tourner un modèle en local

> **Recherche** menée le 5 octobre 2026 pour l'acte 1 de la présentation
> « LLM & développement agentique — tout ça tourne chez vous ». Complète
> (sans la dupliquer) la note outillage
> [`execution-llm-local.md`](execution-llm-local.md) : ici on explique **la
> mécanique** (mémoire, KV cache, quantification, prefill/decode, MoE), pas les
> commandes.
>
> **Méthode.** Le code de llama.cpp a été lu directement (clone de `master`,
> commit `c06f8416`, 5 oct. 2026) et recoupé avec le tag **`v0.5.0`** épinglé par
> le repo : tous les comportements de code cités ci-dessous existent à
> l'identique sur `v0.5.0` sauf mention contraire. Les liens GitHub pointent sur
> `master`.
>
> **Légende de fiabilité** (utilisée partout) :
> - **[S]** fait sourcé (doc, code, papier, model card) — citation + lien ;
> - **[C]** calcul ou déduction faite ici à partir de faits sourcés (le
>   raisonnement est donné) ;
> - **[E]** revendication d'éditeur/vendeur (non vérifiée de façon indépendante) ;
> - **[M]** mesure faite pendant cette recherche (méthode donnée).

---

## 0. Corrections et compléments à `execution-llm-local.md`

Le fichier n'a pas été modifié ; voici ce qu'il faudrait y corriger.

| # | Passage de la note | Problème | Correction sourcée |
|---|---|---|---|
| E1 | §4.2 : lien « spec GGUF » `github.com/ggml-org/llama.cpp/blob/master/docs/gguf.md` | **Lien mort** : il n'y a pas de `docs/gguf.md` dans le dépôt llama.cpp (vérifié sur le clone). | La spec est dans `ggml-org/ggml` : https://github.com/ggml-org/ggml/blob/master/docs/gguf.md (déjà citée correctement en §2.1). |
| E2 | §2.4 / B.11 : « le prompt processing est un à deux ordres de grandeur plus rapide que la génération » | Vrai sur **GPU** (table quantize : ~822 vs ~72 t/s, ≈ ×11), **faux sur CPU**. L'exemple CPU officiel de `llama-bench` montre un rapport **×2 à ×4** (pp64 33–59 t/s vs tg16 15–17 t/s, llama 7B Q4_0). | [tools/llama-bench/README.md](https://github.com/ggml-org/llama.cpp/blob/master/tools/llama-bench/README.md) (exemple « different numbers of threads »). Conséquence majeure pour l'agentique sur CPU : voir §4. |
| E3 | §2.5 : « mmap actif par défaut (`-lm auto`) qui **tempère** la mise en RAM stricte » | Trompeur : mmap change **qui** possède la mémoire (le cache de pages de l'OS au lieu du processus), pas **combien** il en faut pour aller vite. Un modèle dont les poids ne tiennent pas en RAM est relu depuis le disque à chaque token. | Voir §1 (discussion #638, code `llama-mmap.cpp`). |
| E4 | §1.2 : `-t` défaut « -1 (automatique) » sans plus | Incomplet : sur Linux x86 avec CPU **hybride**, l'auto-détection **exclut les E-cores et l'hyperthreading** — sur l'i7-1370P du projet, `-t` auto ≈ **6** (les P-cores), pas 14 ni 20. | `common_cpu_get_num_math()` dans [common/common.cpp](https://github.com/ggml-org/llama.cpp/blob/master/common/common.cpp) — voir §6.4. |
| E5 | §1.2 : `-c 0` = « contexte lu dans le GGUF » | Incomplet : avec `--fit on` (**défaut**), si le contexte d'entraînement ne tient pas en mémoire, llama.cpp **réduit automatiquement** `n_ctx` (plancher `--fit-ctx`, défaut 4096). | [tools/server/README.md](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md) (`-fit`, `-fitc`) ; [common/fit.h](https://github.com/ggml-org/llama.cpp/blob/master/common/fit.h) : « the context size which is modified if and only if equal to 0 ». |
| E6 | §2.5 / §4.2 : `-ctk/-ctv q8_0` présentés sans condition | Il manque : **un cache V quantifié exige Flash Attention**. En `-fa auto` llama.cpp l'active tout seul ; en `-fa off` c'est une erreur. Le K quantifié ne l'exige pas. | [src/llama-context.cpp](https://github.com/ggml-org/llama.cpp/blob/master/src/llama-context.cpp) — voir §2.4. |
| E7 | C2 « formule GiB/tokens du KV cache non trouvée » | Elle existe : le log de llama.cpp affiche la taille exacte, la formule est publiée (Databricks, kipply) et se vérifie sur les chiffres du guide gpt-oss. | Voir §2.2–2.3. |
| E8 | C3 « vitesse MoE ↔ paramètres actifs : non vérifiable » | Sourçable : Mistral (Mixtral), billet MoE de Hugging Face, papier KTransformers (SOSP 2025), plus la règle « decode limité par la bande passante » (ggerganov, Databricks). | Voir §5. |
| E9 | C4 « sémantique S/M/L jamais explicitée dans une source primaire » | Elle l'est, dans la PR d'origine des k-quants (#1684) : `_S` = même type partout ; `_M`/`_L` = certains tenseurs sensibles (`attention.wv`, `attention.wo`, `feed_forward.w2`) en précision supérieure. | [PR #1684](https://github.com/ggml-org/llama.cpp/pull/1684) — voir §3.2. |
| E10 | C5 « tok/s dans les logs de `llama-server` : non documenté » | Le code l'imprime à chaque requête : `prompt eval time = … tokens per second` puis `eval time = … tokens per second`. | [tools/server/server-context.cpp](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/server-context.cpp) (`print_timings`) — voir §2.5. |
| E11 | C1 « 0.25 GiB/milliard en Q4_0 : folklore » | Ça se retrouve à partir des bits par poids officiels : octets ≈ paramètres × bpw / 8 (Q4_0 = 4,5 bpw → 0,56 Go par milliard ; Q4_K_M ≈ 4,89 bpw → 0,61 Go par milliard). Le chiffre « 0,25 » est donc **faux** pour Q4_0 : 0,25 correspond à 2 bits par poids. | Table bpw de [tools/quantize/README.md](https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md) ; [C]. |

Les noms d'options dont il faut se méfier à l'oral : **`--no-mmap` et `--mlock`
n'existent plus** dans `common/arg.cpp` (ni sur `master` ni sur `v0.5.0`). Ils sont
remplacés par **`-lm, --load-mode {auto,none,mmap,mlock,mmap+mlock,dio}`** [S]
([server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md), ligne `-lm`).
Les guides plus anciens (p. ex. la commande `--no-mmap` du guide gpt-oss,
[discussion #15396](https://github.com/ggml-org/llama.cpp/discussions/15396))
sont donc **périmés pour la version épinglée**. La note existante utilise déjà
`-lm auto`, c'est correct.

---

## 1. Chargement en mémoire : ce qui se passe quand llama.cpp ouvre un GGUF

### 1.1 Par défaut, le fichier est *mappé*, pas copié

- **[S]** Option : `-lm, --load-mode MODE` (défaut `auto`). Texte de l'aide :
  « auto: mmap, unless a device does not support it / none: no special loading
  mode / mmap: memory-map model (if mmap disabled, slower load but may reduce
  pageouts if not using mlock) / mlock: force system to keep model in RAM rather
  than swapping or compressing / mmap+mlock / dio: use DirectIO if available »
  ([server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md),
  [common/arg.cpp](https://github.com/ggml-org/llama.cpp/blob/master/common/arg.cpp)).
- **[S]** Dans le code ([src/llama-mmap.cpp](https://github.com/ggml-org/llama.cpp/blob/master/src/llama-mmap.cpp)),
  sous Linux : `posix_fadvise(..., POSIX_FADV_SEQUENTIAL)` puis
  `mmap(NULL, size, PROT_READ, MAP_SHARED | MAP_POPULATE, fd, 0)` (le
  `MAP_POPULATE` est retiré quand des tenseurs « lazy » existent, cf. §1.4), puis
  `posix_madvise(..., POSIX_MADV_WILLNEED)`. Le mapping est en **lecture seule**
  et **partagé**.
- **[S]** Origine historique : PR #613 de jart, « Make loading weights 10-100x
  faster » (mars 2023), qui passe le chargement à mmap avec `MAP_SHARED` pour
  éviter de copier les pages, « important because copied memory competes with
  the kernel file cache »
  ([PR #613](https://github.com/ggml-org/llama.cpp/pull/613),
  [billet de jart](https://justine.lol/mmap/)).

### 1.2 Pourquoi le premier lancement est lent et le second rapide

- **[S]** `/proc/meminfo` : `Cached` = « In-memory cache for files read from the
  disk (the pagecache) » ([doc noyau Linux, proc](https://docs.kernel.org/filesystems/proc.html)).
- **[C]** Au premier lancement, `MAP_POPULATE` force la lecture du fichier
  depuis le disque vers le **cache de pages** de l'OS : on est limité par le
  débit du disque (un fichier de 6 Go sur un SSD NVMe à ~3 Go/s ≈ 2 s ; sur
  un disque réseau ou un HDD, ça prend des minutes). Au second lancement, les
  pages sont **encore dans le cache** (tant que l'OS n'a pas eu besoin de la
  RAM) : le « chargement » consiste juste à mapper des pages déjà présentes,
  quasiment instantané. C'est la même raison pour laquelle plusieurs processus
  peuvent partager un seul exemplaire des poids (`MAP_SHARED`, PR #613).

### 1.3 Pourquoi les moniteurs système « mentent »

- **[S]** Discussion historique
  [« 30B model now needs only 5.8GB of RAM? How? » (#638)](https://github.com/ggml-org/llama.cpp/discussions/638) :
  réponse de Green-Sky : « the os now counts it as filesystem cache. Since #613
  the model is a memory mapped file… gnome-system-monitor does not show cached
  files ». jart : les pages « aren't actually loaded into the resident set size
  on Unix systems until they're needed ».
- **[S]** Sous Linux, `VmRSS = RssAnon + RssFile + RssShmem` ; `RssFile` =
  « size of resident file mappings » ([doc noyau](https://docs.kernel.org/filesystems/proc.html)).
- **[C] Formulation exacte à retenir** : la RSS d'un processus **inclut** les
  pages du fichier mappé **déjà présentes en RAM** (`RssFile`) ; ce qu'elle ne
  montre pas, ce sont les pages pas encore touchées ou évincées. Ce qui
  sous-estime vraiment, c'est la colonne **« utilisé »** de `free` ou des
  moniteurs graphiques : les poids y apparaissent comme **« tampon/cache »**
  (`buff/cache`), parce que l'OS les considère comme du cache de fichiers. Pour
  voir la vraie empreinte : `grep -E 'VmRSS|RssFile|RssAnon' /proc/$(pgrep llama-server)/status`.
  L'affirmation « les pages mmap ne comptent pas dans la RSS » (#638, 2023)
  est **inexacte sous Linux** ; elle n'est vraie que pour des pages jamais
  touchées.
- **[S]** Au chargement, llama.cpp affiche la taille des poids par buffer :
  `load_tensors: %12s model buffer size = %8.2f MiB` (sur CPU, le buffer
  s'appelle `CPU_Mapped`)
  ([src/llama-model.cpp](https://github.com/ggml-org/llama.cpp/blob/master/src/llama-model.cpp),
  [ggml-backend.cpp](https://github.com/ggml-org/llama.cpp/blob/master/ggml/src/ggml-backend.cpp)).

### 1.4 Quand le modèle dépasse la RAM

- **[S]** #638 : « the 30B model will go into swap and result in extremely slow
  speeds » ; « waiting minutes per token is realistic » ; « cpu cores are only
  doing very little work, mostly waiting for all the loaded data in swap »
  ([discussion #638](https://github.com/ggml-org/llama.cpp/discussions/638)).
- **[C]** Mécanisme : les pages mmap sont « propres » (lecture seule, adossées
  au fichier) ; sous pression mémoire, le noyau les **jette sans les écrire en
  swap**, puis doit les **relire depuis le disque** au prochain token. Comme le
  decode relit tous les poids actifs à chaque token (§4), on passe d'une
  bande passante RAM (~80–100 Go/s sur le laptop) à celle du SSD (~2–7 Go/s) :
  on perd un ou deux ordres de grandeur. Ça « marche », mais c'est
  inutilisable.
- **[S]** `-lm mlock` / `mmap+mlock` verrouillent les pages en RAM ; en cas
  d'échec, llama.cpp suggère d'augmenter `RLIMIT_MEMLOCK` (`ulimit -l`)
  ([src/llama-mmap.cpp](https://github.com/ggml-org/llama.cpp/blob/master/src/llama-mmap.cpp)).
- **[S] Nouveauté** : `-lzm, --lazy-mode` (défaut `auto`) : « on-demand reading
  of certain tensors, for example per-layer embeddings… auto: on, but only for
  tensors larger than 4 GiB » ; le log affiche
  `tensor %s (size = %zu MiB) lazy read enabled`
  ([server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md),
  [src/llama-model-loader.cpp](https://github.com/ggml-org/llama.cpp/blob/master/src/llama-model-loader.cpp)).
  Ce mode sert les modèles à **gros embeddings** (dont Qwen3.8-Flash-Next,
  cf. §8) : une table d'embedding n'est lue que pour les lignes des tokens
  vus, ce qui est bien adapté à une lecture disque à la demande.

### 1.5 Taille du fichier ≈ empreinte des poids

- **[S]** « At the moment, memory and disk requirements are the same »
  ([tools/quantize/README.md](https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md)).
- **[C]** Vérification sur un exemple : le GGUF est mappé tel quel, à
  l'alignement près ; la taille du buffer `CPU_Mapped` du log ≈ taille du
  fichier. À cela s'ajoutent le KV cache (§2) et les buffers de calcul
  (`compute buffer size = … MiB`, typiquement quelques centaines de Mo,
  dépendant de `-ub`).

---

## 2. Le KV cache

### 2.1 Ce que c'est

- **[S]** Databricks : les LLM génèrent en deux temps, « 'prefill', where the
  tokens in the input prompt are processed in parallel, and 'decoding', where
  text is generated one 'token' at a time » ; le KV cache est ce qui permet au
  decode de ne pas tout recalculer
  ([LLM Inference Performance Engineering](https://www.databricks.com/blog/llm-inference-performance-engineering-best-practices)).
- **[C] Version dev** : à chaque couche d'attention, chaque token produit une
  « clé » et une « valeur ». Le token suivant doit les comparer à **tous** les
  tokens précédents. Plutôt que de les recalculer, on les garde en mémoire :
  c'est un **cache memoïsé indexé par position**, qui grossit d'une entrée par
  token et par couche. Il est alloué **en entier au démarrage** pour `n_ctx`
  tokens (llama.cpp réserve `n_ctx` « cells »).

### 2.2 Formule de taille

- **[S]** Databricks : « batch_size * seqlen * (d_model/n_heads) * n_layers * 2
  (K and V) * 2 (bytes per Float16) * n_kv_heads »
  ([Databricks](https://www.databricks.com/blog/llm-inference-performance-engineering-best-practices)) ;
  même formule par token chez kipply : « 2·2·n_layers·n_heads·d_head »
  ([Transformer Inference Arithmetic](https://kipp.ly/transformer-inference-arithmetic/)).
- Forme à afficher : **octets = 2 (K et V) × n_couches_attention × n_têtes_KV ×
  head_dim × n_ctx × octets_par_élément** (f16 = 2 ; q8_0 = 34/32 ≈ 1,06 ;
  q4_0 = 18/32 ≈ 0,56).
- **[S]** Où llama.cpp l'affiche (texte exact du format,
  [src/llama-kv-cache.cpp](https://github.com/ggml-org/llama.cpp/blob/master/src/llama-kv-cache.cpp)) :

  ```
  llama_kv_cache: %10s KV buffer size = %8.2f MiB
  llama_kv_cache: size = %7.2f MiB (%6u cells, %3d layers, %2u/%u seqs), K (%s): %7.2f MiB, V (%s): %7.2f MiB
  ```

  **[C]** Exemple reconstruit (Llama-3.1-8B, `-c 8192`, f16, serveur par défaut
  = 4 slots, KV unifié) : `llama_kv_cache: size = 1024.00 MiB (  8192 cells,  32 layers,  4/1 seqs), K (f16):  512.00 MiB, V (f16):  512.00 MiB`.
  Pour les couches récurrentes (SSM/DeltaNet), une ligne séparée :
  `llama_memory_recurrent: size = … MiB (… cells, … layers, … seqs …), R (…): … MiB, S (…): … MiB`
  ([src/llama-memory-recurrent.cpp](https://github.com/ggml-org/llama.cpp/blob/master/src/llama-memory-recurrent.cpp)).

### 2.3 Exemples chiffrés

Configs lues dans les `config.json` des dépôts HF (liens en sources). Calculs [C], f16.

| Modèle | Couches avec KV | Têtes KV × head_dim | Par token | Au contexte max |
|---|---|---|---|---|
| **Llama-3.1-8B** (32 couches, 8 têtes KV, head_dim 128) | 32 | 8 × 128 | **128 KiB** | **16 GiB** à 131 072 tokens (q8_0 : ~8,5 GiB) |
| idem sans GQA (hypothèse 32 têtes KV = MHA) | 32 | 32 × 128 | 512 KiB | 64 GiB |
| **Qwen3-0.6B** (28 couches, 8 × 128) | 28 | 8 × 128 | 112 KiB | **4,4 GiB** à 40 960 tokens, pour un modèle de **0,4 Go** |
| **gpt-oss-20b** (24 couches dont 12 « full », 8 × 64, fenêtre glissante 128) | 12 (+12 SWA plafonnées) | 8 × 64 | 24 KiB | **3 GiB** à 131 072 |
| **gpt-oss-120b** (36 couches dont 18 « full ») | 18 (+18 SWA) | 8 × 64 | 36 KiB | **4,5 GiB** à 131 072 |
| **LFM2.5-8B-A1B** (24 couches : 18 conv + 6 attention, 8 × 64) | 6 | 8 × 64 | 12 KiB | ~1,5 GiB à 128 000 |
| **Qwen3.8-Flash-Next** (48 couches : 36 DeltaNet + 12 QSA, 2 × 256) | 12 | 2 × 256 | 24 KiB | **6 GiB** à 262 144 (+ index QSA + état DeltaNet fixe) |

**Validation croisée [S]+[C]** : le guide officiel gpt-oss de llama.cpp donne
une empreinte totale de **14,9 Go à 8K tokens et 17,9 Go à 131K** pour
gpt-oss-20b, et **64,0 Go → 68,5 Go** pour gpt-oss-120b
([discussion #15396](https://github.com/ggml-org/llama.cpp/discussions/15396)).
Les écarts (+3,0 et +4,5) correspondent exactement à la formule (24 KiB et
36 KiB par token × ~123K tokens supplémentaires). La formule est donc
utilisable telle quelle sur scène.

### 2.4 Ce qui réduit le KV cache

- **GQA / MQA [S]** : MQA = « a single key-value head » ; GQA = « an
  intermediate (more than one, less than number of query heads) number of
  key-value heads », qui atteint une « quality close to multi-head attention
  with comparable speed to MQA » ([Ainslie et al., arXiv:2305.13245](https://arxiv.org/abs/2305.13245)).
  **[C]** Llama-3.1-8B : 32 têtes de requête mais 8 têtes KV, donc KV cache
  divisé par 4 par rapport à du MHA (tableau ci-dessus).
- **Sliding window attention [S]** : Gemma 3 utilise « 5 local layers for every
  global layer » avec une fenêtre locale de **1024 tokens**, ce qui fait passer
  le surcoût mémoire du KV cache d'environ 60 % (attention globale seule) à
  moins de 15 % à 32K ([Gemma 3 Technical Report, arXiv:2503.19786](https://arxiv.org/html/2503.19786)).
  gpt-oss alterne couches `sliding_attention` (fenêtre **128**) et
  `full_attention` (`config.json` de [gpt-oss-120b](https://huggingface.co/openai/gpt-oss-120b)).
  **[S]** Dans llama.cpp, le cache SWA est dimensionné à
  `min(n_ctx, n_swa × n_seq + n_ubatch)`, arrondi à 256
  ([src/llama-kv-cache-iswa.cpp](https://github.com/ggml-org/llama.cpp/blob/master/src/llama-kv-cache-iswa.cpp)) ;
  `--swa-full` force la taille pleine (défaut : non).
- **Architectures hybrides [S]** : les couches convolutionnelles (LFM2.5),
  SSM/Mamba ou à attention linéaire (Gated DeltaNet de Qwen3-Next / Qwen3.8)
  gardent un **état de taille fixe** au lieu d'un cache qui grossit avec les
  tokens. llama.cpp a des mémoires dédiées : `llama_memory_recurrent`,
  `llama_memory_hybrid`, et `llama_memory_hybrid_idx` (« llama_memory_hybrid
  plus a third cache with one indexer key per token, for block-sparse attention
  (qwen4exp QSA) »)
  ([src/llama-memory-hybrid-idx.h](https://github.com/ggml-org/llama.cpp/blob/master/src/llama-memory-hybrid-idx.h)).
- **Quantification du cache [S]** : `-ctk/--cache-type-k`, `-ctv/--cache-type-v`
  (défaut `f16`). Code : si V est quantifié et `-fa auto`, log
  `enabling flash_attn since it is required for quantized V cache` ; si `-fa off`,
  erreur `quantized V cache requires flash_attn to be enabled`
  ([src/llama-context.cpp](https://github.com/ggml-org/llama.cpp/blob/master/src/llama-context.cpp)).
  Le doc multi-GPU le confirme : `-fa` « Required when using `--split-mode tensor`
  and/or quantized V cache » ([docs/multi-gpu.md](https://github.com/ggml-org/llama.cpp/blob/master/docs/multi-gpu.md)).
  **Qualité [S]** (J. Gäßler, [PR #7412](https://github.com/ggml-org/llama.cpp/pull/7412)) :
  « The K cache seems to be much more sensitive to quantization than the V
  cache » ; « no significant quality loss from using q8_0 instead of FP16 for
  the KV cache » ; « q4_0 for the V cache and FP16 for everything else is more
  precise than using q6_K with FP16 KV cache ». Message pour la scène :
  **`-ctk q8_0 -ctv q8_0` divise le KV cache par ~2 pour un coût en qualité
  négligeable**.

### 2.5 Prompt caching, slots et dépassement de contexte (llama-server)

- **[S]** `cache_prompt` (défaut `true`) : « Re-use KV cache from a previous
  request if possible. This way the common prefix does not have to be
  re-processed, only the suffix that differs between the requests »
  ([server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)).
  Il précise aussi : les logits ne sont « **not** guaranteed to be bit-for-bit
  identical » d'un batch à l'autre, ce qui peut rendre les résultats non
  déterministes.
- **[S]** Slots : `-np` auto = **4 slots** avec KV **unifié** (log
  `n_parallel is set to auto, using n_parallel = 4 and kv_unified = true`,
  [tools/server/server.cpp](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/server.cpp)).
  Sans KV unifié, chaque slot n'a que `n_ctx / n_slots` tokens
  ([src/llama-context.cpp](https://github.com/ggml-org/llama.cpp/blob/master/src/llama-context.cpp), `n_ctx_seq`).
  Le serveur logue `initializing, n_slots = %d, n_ctx_slot = %d, kv_unified = '%s'`.
- **[S]** `--cache-reuse N` (défaut 0) : « min chunk size to attempt reusing from
  the cache via KV shifting ». Les morceaux réutilisés sont décalés
  (`llama_kv_cache_seq_add`) au lieu d'être recalculés
  ([PR #9866](https://github.com/ggml-org/llama.cpp/pull/9866)) : utile quand
  le milieu du prompt change mais pas la suite (complétion de code, FIM).
- **[S]** Cache de prompts en RAM hôte : `-cram, --cache-ram N` (défaut
  **8192 MiB**) + `--cache-idle-slots` (défaut activé)
  ([PR #16391](https://github.com/ggml-org/llama.cpp/pull/16391), `common/common.h`).
  Pour les modèles SWA ou hybrides, dont on ne peut pas « rembobiner » l'état à
  une position arbitraire, le serveur prend des **checkpoints de contexte**
  (`--ctx-checkpoints`, défaut 32 par slot, espacés d'au moins
  `--checkpoint-min-step` = 8192 tokens) ([PR #15293](https://github.com/ggml-org/llama.cpp/pull/15293)).
- **[C] Pourquoi c'est central en agentique** : le prompt système + les
  définitions d'outils + les fichiers déjà lus forment un **préfixe stable**.
  Avec le prompt caching, seul le dernier message est « prefillé » à chaque
  tour. Si le harnais modifie le début du prompt (horodatage, réordonnancement
  des outils), le cache saute et tout est recalculé : sur CPU, ça se paie en
  minutes (§4.4).
- **Dépassement de `n_ctx` [S]** : `--context-shift` est **désactivé par défaut**
  (`ctx_shift = false`, `common/common.h`). Conséquences dans
  [server-context.cpp](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/server-context.cpp) :
  - prompt trop long → erreur `request (%d tokens) exceeds the available context size (%d tokens), try increasing it`
    (type `exceed_context_size_error`) ;
  - génération qui atteint la limite → arrêt (`STOP_TYPE_LIMIT`, `truncated = true`),
    log debug « stopped due to running out of context capacity » ;
  - avec `--context-shift`, le serveur garde `n_keep` tokens, **jette la moitié
    du reste** (`n_discard = n_left / 2`) et logue `slot context shift, n_keep = …, n_left = …, n_discard = …`.
    Le modèle « oublie » alors silencieusement le milieu de la conversation.
- **[S]** Les tok/s apparaissent dans les logs serveur à chaque requête :
  `prompt eval time = %10.2f ms / %5d tokens (%8.2f ms per token, %8.2f tokens per second)`
  puis `       eval time = …` et `      total time = …` ; pendant un long prefill :
  `prompt processing, n_tokens = …, progress = …, t = … s / … tokens per second`
  (`print_timings`, même fichier).

---

## 3. Quantification

### 3.1 Principe

- **[S]** « Quantization reduces the precision of model weights (e.g., from
  32-bit floats to 4-bit integers), which shrinks the model's size and can speed
  up inference. This process however, may introduce some accuracy loss which is
  usually measured in Perplexity (ppl) and/or Kullback–Leibler Divergence (kld) »
  ([tools/quantize/README.md](https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md)).
- **[S] Structure en blocs** ([ggml/src/ggml-common.h](https://github.com/ggml-org/llama.cpp/blob/master/ggml/src/ggml-common.h),
  [PR #1684](https://github.com/ggml-org/llama.cpp/pull/1684)) :
  - `Q4_0` : blocs de 32 poids, 4 bits chacun + 1 échelle f16 → (32×4+16)/32 = **4,5 bpw** ;
  - `Q4_K` : « Super-blocks with 8 blocks, each block has 32 weights », échelles
    et minimums eux-mêmes quantifiés → **4,5 bpw** ; super-bloc `QK_K = 256` ;
  - `Q8_0` : 32 poids × 8 bits + échelle f16 → 8,5 bpw ;
  - `MXFP4` : `QK_MXFP4 32`, 32 valeurs FP4 (E2M1) + **une échelle E8M0** sur 8
    bits → 4,25 bpw ; `NVFP4` : blocs de 64, une échelle UE4M3 par sous-bloc de 16
    → 4,5 bpw [C pour les bpw].
- **[C] Version dev** : on découpe chaque matrice en paquets de 32 nombres ; on
  stocke pour chaque paquet un « zoom » (facteur d'échelle) et, pour chaque
  nombre, un petit entier sur 4 bits qui dit où il se trouve entre −zoom et
  +zoom. C'est une **compression avec perte, par blocs**, comme un JPEG pour
  les poids. Le calcul décompresse à la volée, dans les registres.

### 3.2 K-quants, mixes S/M/L, I-quants, imatrix

- **[S] K-quants et mixes** ([PR #1684](https://github.com/ggml-org/llama.cpp/pull/1684), texte d'origine) :
  `Q4_K_S` « uses GGML_TYPE_Q4_K for all tensors » ; `Q4_K_M` « uses GGML_TYPE_Q6_K
  for half of the attention.wv and feed_forward.w2 tensors, else GGML_TYPE_Q4_K » ;
  `Q3_K_L` met `Q5_K` sur `attention.wv`, `attention.wo`, `feed_forward.w2` ; et
  « all quantization variants use 6-bit quantization for the output.weight
  tensor ». **D'où `Q4_K_M` ≈ 4,89 bpw** et pas 4,5
  ([quantize README](https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md)).
  Les règles actuelles du code ont évolué (`src/llama-quant.cpp`), mais le
  principe reste : **plus de bits sur les tenseurs sensibles**.
- **[S] I-quants + imatrix** : `IQ*` = « obtained using super_block_scale &
  importance matrix » ([HF docs GGUF](https://huggingface.co/docs/hub/en/gguf)) ;
  PR #4861 « importance matrix » et suivantes (liste dans le quantize README).
  **[C]** L'imatrix = statistiques d'activations mesurées sur un texte de
  calibration ; le quantizer s'en sert pour **minimiser l'erreur là où le modèle
  regarde vraiment**.
- **[S] Effet mesuré de l'imatrix** (table ci-dessous, Llama 3 8B) : `q4_K_M`
  passe de KLD 0,0313 sans imatrix à **0,0282** avec ; `q3_K_M` de 0,102 à 0,084.
  « There seems to be no consistent improvement from using more Wikitext tokens
  for the importance matrix. »

### 3.3 Données de qualité publiées (llama.cpp, primaires)

**[S]** [tools/perplexity/README.md](https://github.com/ggml-org/llama.cpp/blob/master/tools/perplexity/README.md),
Llama 3 8B, référence FP16, backend CUDA, RTX 4090 (extrait ; « WT 10m » =
imatrix Wikitext) :

| Quant | imatrix | Taille (GiB) | PPL | KLD moyenne | « Same top p » ¹ |
|---|---|---|---|---|---|
| f16 | – | 14,97 | 6,2332 | 0,00055 | – |
| q8_0 | – | 7,96 | 6,2343 | 0,0014 | 97,7 % |
| q6_K | – | 6,14 | 6,2534 | 0,0055 | 96,0 % |
| q5_K_M | – | 5,33 | 6,2886 | 0,0108 | – |
| **q4_K_M** | WT 10m | **4,58** | 6,3829 | **0,0282** | – |
| q4_K_M | – | 4,58 | 6,4071 | 0,0313 | 91,9 % |
| iq4_XS | WT 10m | 4,14 | 6,4597 | 0,0363 | – |
| q3_K_M | WT 10m | 3,74 | 6,7343 | 0,0844 | – |
| q2_K | – | 2,96 | 9,7516 | 0,4451 | 71,1 % |
| iq1_S | WT 1m | 1,88 | 58,10 | 2,21 | – |

¹ « Same top p » = proportion de positions où le token le plus probable est le
même qu'en FP16 (table « LLaMA 2 vs. LLaMA 3 » du même fichier).

**[C] Lecture pour la scène** : de Q8 à Q5 la dégradation est quasi
invisible ; **Q4_K_M est le « coude » de la courbe** (÷3,3 en taille par
rapport à f16, ~92 % de tokens identiques au greedy) ; en dessous de 3 bits la
perplexité s'effondre. Le même fichier note aussi que Llama 3 se quantifie
**moins bien** que Llama 2 (q4_K_M : KLD 0,031 contre 0,013) : la tolérance
dépend du modèle. **[S]** L'article « Accuracy is Not All You Need » montre que
des modèles compressés à précision égale changent beaucoup de réponses
individuelles (« flips »), et propose **KL-Divergence et flips** comme
métriques, « well correlated » ([arXiv:2407.09141](https://arxiv.org/abs/2407.09141)).
C'est pour ça que llama.cpp mesure la KLD et pas seulement la PPL.

### 3.4 « Un gros modèle quantifié bat un petit modèle en pleine précision » : sourcé ?

**Oui, avec deux sources primaires indépendantes.**

- **[S]** Dettmers & Zettlemoyer, *The case for 4-bit precision: k-bit Inference
  Scaling Laws* (35 000+ expériences, 19M → 176B paramètres) : « 4-bit precision
  is almost universally optimal for total model bits and zero-shot accuracy »
  ([arXiv:2212.09720](https://arxiv.org/abs/2212.09720)). Autrement dit, à
  budget mémoire fixe, il vaut mieux plus de paramètres en 4 bits que moins de
  paramètres en 8 ou 16 bits.
- **[S]** Table de la [PR #1684](https://github.com/ggml-org/llama.cpp/pull/1684)
  (LLaMA 1, perplexité wikitext) : **13B Q4_K_M = 5,30 pour 7,32 Go** contre
  **7B F16 = 5,91 pour 13,0 Go**. Le 13B quantifié est meilleur **et** presque
  deux fois plus petit ; même le 13B Q2_K (5,85, 5,13 Go) bat le 7B F16.
  ikawrakow : « generation performance as measured by perplexity is basically a
  fairly smooth function of quantized model size ».
- Limite : établi en perplexité ou zero-shot, sur des familles de modèles
  homogènes et avec des quants ≥ 3–4 bits. Ce n'est pas une loi pour comparer
  deux familles de modèles différentes, ni pour descendre sous 3 bits.

### 3.5 Formats natifs récents : des modèles livrés déjà quantifiés

- **[S] MXFP4 (gpt-oss)** : « The models were post-trained with MXFP4
  quantization of the MoE weights, making gpt-oss-120b run on a single 80GB GPU »
  ([model card gpt-oss-120b](https://huggingface.co/openai/gpt-oss-120b)) ; le
  `config.json` exclut de MXFP4 l'attention, le routeur, les embeddings et la
  tête de sortie (`modules_to_not_convert`). GGUF officiel ggml-org :
  `gpt-oss-120b-MXFP4.gguf` **63,4 Go**, `gpt-oss-20b-MXFP4.gguf` **12,1 Go**
  ([API HF](https://huggingface.co/api/models/ggml-org/gpt-oss-120b-GGUF/tree/main)).
  **[C]** Il n'y a donc rien à « re-quantifier » : le GGUF reproduit le format
  dans lequel le modèle a été post-entraîné.
- **[S] QAT Gemma 3** : « Instead of just quantizing the model after it's fully
  trained, QAT incorporates the quantization process during training » ; 27B :
  « 54 GB (BF16) to just 14.1 GB (int4) » ; « We reduce the perplexity drop by
  54% (using llama.cpp perplexity evaluation) when quantizing down to Q4_0 » ;
  GGUF publiés pour llama.cpp
  ([Google Developers Blog](https://developers.googleblog.com/en/gemma-3-quantized-aware-trained-state-of-the-art-ai-to-consumer-gpus/)) [E pour le −54 %].
- **[S] NVFP4** : format pris en charge par ggml (`block_nvfp4`) ; des
  checkpoints NVFP4 de Qwen3.8-Flash-Next sont publiés par NVIDIA
  ([nvidia/Qwen3.8-Flash-Next-NVFP4](https://huggingface.co/nvidia/Qwen3.8-Flash-Next-NVFP4)).
- **[S] Entraînement en FP8** : DeepSeek-V3 (671B totaux, « 37B activated for
  each token ») décrit un cadre d'entraînement en précision mixte FP8 dans le
  corps du papier ([arXiv:2412.19437](https://arxiv.org/abs/2412.19437)). Le
  « format natif » des poids descend donc de 16 bits vers 8, puis 4.

---

## 4. Prefill vs decode

### 4.1 Les deux phases

- **[S]** Prefill = tokens du prompt « processed in parallel » ; decode = « one
  'token' at a time in an autoregressive manner » ; en decode, « the speed is
  dependent on how quickly we can load model parameters from GPU memory to local
  caches/registers, rather than how quickly we can compute on loaded data »
  ([Databricks](https://www.databricks.com/blog/llm-inference-performance-engineering-best-practices)).
- **[S]** ggerganov ([discussion #4167](https://github.com/ggml-org/llama.cpp/discussions/4167),
  perfs Apple Silicon) : « At large batch size (PP means batch size of 512) the
  computation is compute bound » ; la génération (TG) est limitée par la bande
  passante mémoire. Données de la même discussion (llama 7B, GPU Metal) : M1
  (68 Go/s) Q4_0 TG **14,2** t/s ; M3 Max (400 Go/s) **66,3** ; M4 Max (546 Go/s)
  **83,1** ; M2 Ultra (800 Go/s) **94,3**. Le TG suit la bande passante.
- **[S]** Horace He : en régime « memory-bandwidth bound », « increasing the
  FLOPS of your GPU won't help » ([Making Deep Learning Go Brrrr](https://horace.io/brrr_intro.html)).
- **[S] Preuve dans la doc llama.cpp elle-même** (table quantize, Llama-3.1-8B,
  même machine) : **F16 14,96 GiB → tg 29,2 t/s ; Q8_0 7,95 GiB → 50,9 ;
  Q4_K_M 4,58 GiB → 71,9** ; alors que pp@512 reste entre 760 et 920 t/s pour
  tous les quants ([tools/quantize/README.md](https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md)).
  Sur CPU, même constat dans la PR #1684 (Ryzen 7950X, 4 threads, 7B) :
  **F16 214 ms/token, Q4_K_M 71 ms/token**. **[C]** Diviser la taille des
  poids par 3 divise à peu près par 3 le temps par token : c'est la signature
  d'un régime limité par la mémoire.

### 4.2 Règle d'estimation du decode

**[C]** (dérivée de Databricks : « achieved memory bandwidth is ((total model
parameter size + KV cache size) / TPOT) », MBU = débit atteint / débit crête) :

> **tok/s (decode) ≲ bande passante mémoire ÷ octets lus par token**
> (octets lus par token ≈ poids **actifs** × bpw/8 + KV cache lu).

C'est un **plafond** : en pratique on atteint ~50–80 % de la bande passante
théorique (ordre de grandeur, la MBU dépend du moteur et du matériel). Exemple
vérifiable : M2 Ultra 800 Go/s, 7B Q4_0 3,56 GiB → plafond ≈ 210 t/s, mesuré
94 t/s (≈ 45 %) (#4167).

### 4.3 Bandes passantes de référence

| Matériel | Bande passante crête | Mémoire max | Source |
|---|---|---|---|
| **Laptop du projet, i7-1370P** (2 canaux) | **83,2 Go/s** (DDR5-5200) ou 102,4 Go/s (LPDDR5-6400) | 96 Go | [Intel ARK](https://www.intel.com/content/www/us/en/products/sku/232146/intel-core-i71370p-processor-24m-cache-up-to-5-20-ghz/specifications.html) [S] (type exact de RAM du laptop non vérifié) |
| Apple M5 | 153 Go/s | – | [Apple Newsroom, oct. 2025](https://www.apple.com/newsroom/2025/10/apple-unleashes-m5-the-next-big-leap-in-ai-performance-for-apple-silicon/) [S] |
| Apple M4 Pro / M4 Max | 273 / 546 Go/s | 64 / 128 Go | [Apple Newsroom, oct. 2024](https://www.apple.com/newsroom/2024/10/apple-introduces-m4-pro-and-m4-max/) [S] |
| Apple M5 Pro / M5 Max | 307 / jusqu'à 614 Go/s (460 avec le GPU 32 cœurs) | 64 / 128 Go | [Apple Newsroom, mars 2026](https://www.apple.com/newsroom/2026/03/apple-debuts-m5-pro-and-m5-max-to-supercharge-the-most-demanding-pro-workflows/) [S] |
| Apple M5 Ultra (Mac Studio) | 1,2 To/s | 512 Go | [Apple Newsroom, août 2026](https://www.apple.com/newsroom/2026/08/apple-introduces-new-mac-studio-with-m5-max-and-m5-ultra/) [S] |
| AMD Ryzen AI Max+ 395 (Strix Halo) | 256 Go/s (LPDDR5X-8000, bus 256 bits) | 128 Go (jusqu'à 96 Go pour le GPU) | [Tom's Hardware](https://www.tomshardware.com/pc-components/cpus/amds-beastly-strix-halo-ryzen-ai-max-debuts-with-radical-new-memory-tech-to-feed-rdna-3-5-graphics-and-zen-5-cpu-cores) ; [C] 256 bits × 8000 MT/s ÷ 8 = 256 Go/s |
| NVIDIA DGX Spark (GB10) | 273 Go/s (LPDDR5x, 256 bits) | 128 Go | [nvidia.com](https://www.nvidia.com/en-us/products/workstations/dgx-spark/) [S] ; « up to 200 billion parameters » [E] |
| RTX 4090 | 1 008 Go/s | 24 Go | [C] 384 bits × 21 Gbps ; consensus des fiches |
| RTX 5090 | 1 792 Go/s | 32 Go (GDDR7, 512 bits) | [nvidia.com](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/) (512 bits, 32 Go) ; [C] 512 × 28 Gbps ÷ 8 |

### 4.4 TTFT vs tok/s : pourquoi le prefill domine en agentique sur CPU

- **[S]** TTFT (« Time To First Token ») « is driven by the time required to
  process the prompt and then generate the first output token »
  ([Databricks](https://www.databricks.com/blog/llm-inference-performance-engineering-best-practices)).
- **[S]** Sur CPU, le prefill n'est que **2 à 4 fois** plus rapide que le
  decode (exemple officiel `llama-bench`, llama 7B Q4_0, CPU : pp64 = 32–59 t/s,
  tg16 = 15–17 t/s ; le tg plafonne dès 8 threads, le pp continue de monter avec
  les threads : **pp = calcul, tg = mémoire**)
  ([tools/llama-bench/README.md](https://github.com/ggml-org/llama.cpp/blob/master/tools/llama-bench/README.md)).
- **[C] Ordre de grandeur pour un tour d'agent** (avec ces chiffres CPU anciens,
  à remesurer sur le laptop) : prompt système + outils + fichiers = **20 000
  tokens** ÷ 50 t/s = **~400 s** avant le premier token ; réponse de 500 tokens
  ÷ 16 t/s = **~30 s**. Le prefill fait ~90 % de l'attente. D'où trois
  leviers : **prompt caching** (§2.5), **GPU/iGPU pour le prefill**, et des
  **prompts courts** (moins d'outils déclarés). Sur GPU, le même prefill
  à ~800 t/s prend ~25 s.
- **[S]** La spéculation n'aide **que** le decode : « computing n tokens in a
  batch (as in prompt processing) is more efficient than computing n
  sequentially » ([docs/speculative.md](https://github.com/ggml-org/llama.cpp/blob/master/docs/speculative.md)).

---

## 5. MoE : paramètres actifs vs paramètres totaux

- **[S] Mixtral** : « each token has access to 47B parameters, but only uses 13B
  active parameters during inference » ([arXiv:2401.04088](https://arxiv.org/abs/2401.04088)).
  Billet Mistral : « Mixtral has 46.7B total parameters but only uses 12.9B
  parameters per token. It, therefore, processes input and generates output at
  the same speed and for the same cost as a 12.9B model »
  ([mistral.ai](https://mistral.ai/news/mixtral-of-experts)) [E pour
  « même vitesse »].
- **[S] Hugging Face** (billet MoE, TL;DR) : « Have **faster inference** compared
  to a model with the same number of parameters » et « Require **high VRAM** as
  all experts are loaded in memory » ([huggingface.co/blog/moe](https://huggingface.co/blog/moe)).
- **[S] Recherche systèmes** : KTransformers (SOSP 2025) exploite précisément ce
  découpage, en plaçant attention, KV cache et expert partagé sur un seul GPU
  et les experts routés en RAM CPU, ce qui fait tourner DeepSeek-V3/R1 671B
  avec un GPU de 24 Go
  ([ACM DL](https://dl.acm.org/doi/10.1145/3731569.3764843),
  [PDF](https://madsys.cs.tsinghua.edu.cn/publication/ktransformers-unleashing-the-full-potential-of-cpu/gpu-hybrid-inference-for-moe-models/SOSP25-chen.pdf)).
- **[S] llama.cpp** : `-cmoe, --cpu-moe` « keep all Mixture of Experts (MoE)
  weights in the CPU » ; `-ncmoe, --n-cpu-moe N` « … of the first N layers » ;
  `-ot, --override-tensor` pour un placement manuel
  ([server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)).
  Le guide gpt-oss l'utilise pour les GPU de 8 à 16 Go
  ([discussion #15396](https://github.com/ggml-org/llama.cpp/discussions/15396)).
- **[C] Le raisonnement complet** (§4.2 + ci-dessus) : en decode, chaque token
  ne lit **que** les experts choisis par le routeur (+ attention + expert
  partagé), donc les octets lus par token suivent les **paramètres actifs** →
  vitesse proche d'un dense de la taille des actifs. Mais on ne sait pas à
  l'avance quels experts seront choisis : **tous** doivent être en mémoire
  rapide → RAM = **paramètres totaux**. Sur CPU, où la RAM est abondante mais
  la bande passante faible, le MoE est donc le profil idéal.
- **[C] Exemples chiffrés** (plafonds théoriques, laptop à 83 Go/s) :
  - dense 8B Q4_K_M (4,9 Go lus par token) → **≤ ~17 t/s** ;
  - LFM2.5-8B-A1B UD-Q5_K_M (1,5B actifs × ~6,1 bpw ≈ 1,15 Go/token) → **≤ ~70 t/s**, pour 6,4 Go de RAM ;
  - Qwen3.8-Flash-Next (6B actifs × ~5 bpw ≈ 3,75 Go/token) → ≤ ~22 t/s… mais
    **111 Go de poids ne tiennent pas dans 30 Go** → thrashing (§1.4).
- **Nuance [C]** : en **prefill**, un batch de 512 tokens active à peu près
  tous les experts : le prefill d'un MoE coûte en calcul ~ses paramètres actifs
  par token, mais il lit tous les poids. Le gain MoE est donc surtout un gain
  de decode.

---

## 6. Le reste du pipeline

### 6.1 Tokenisation

- **[S]** « The same text translated into different languages can have
  drastically different tokenization lengths, with differences up to 15 times
  in some cases » (Petrov et al., NeurIPS 2023, [arXiv:2305.15425](https://arxiv.org/abs/2305.15425)).
  Étude 2026 sur 7 tokenizers récents (o200k, Llama 3, Qwen3, DeepSeek V3/V4,
  Gemma 3, Mistral Tekken, Claude) : « French requires 31% to 58% more tokens
  than English » ([arXiv:2609.39001](https://arxiv.org/abs/2609.39001), auteur
  unique, préprint).
- **[M] Mesure locale** (tokenizers `tokenizer.json` de Qwen3-0.6B et
  Llama-3.1-8B-Instruct, lib `tokenizers` 0.23.2, même paragraphe en FR et en EN
  + 13 ko de Python tirés de `convert_hf_to_gguf.py`) :

  | Texte | Qwen3 tokens/mot | Qwen3 caractères/token | Llama 3.1 tokens/mot |
  |---|---|---|---|
  | Anglais (103 mots) | 1,14 | 5,45 | 1,14 |
  | Français (123 mots, même contenu) | **1,52** | 4,17 | 1,53 |
  | Python | 2,74 par « mot » séparé par des espaces | 4,35 | 2,71 |

  Même contenu : **187 tokens en FR contre 117 en EN (+60 %)**, cohérent avec la
  fourchette 31–58 % (échantillon court). Découpages : « développeurs » →
  `dé|velop|pe|urs` (Qwen3), `d|é|velop|pe|urs` (Llama 3.1) ;
  « anticonstitutionnellement » → `ant|icon|stitution|nel|lement`.
- **[C] Règle de poche** : en français, **1 mot ≈ 1,5 token** ; en code,
  **~4 caractères par token**. Le contexte de 128K tokens représente donc
  ~85 000 mots de français, ou ~500 Ko de code.

### 6.2 Chat template

- **[S]** GGUF stocke `tokenizer.chat_template`, « a Jinja template that
  specifies the input format expected by the model »
  ([spec GGUF](https://github.com/ggml-org/ggml/blob/master/docs/gguf.md)) ;
  `--jinja` est activé par défaut (note existante).
- **[S]** Tool calling : si le template n'est pas reconnu par un parseur natif,
  le serveur passe en mode générique (« you'll see `Chat format: Generic` in the
  logs ») ; « Use `--chat-template-file` to override the template when
  appropriate » ; « Native support for DeepSeek R1 works best w/ our template
  override (official template is buggy…) » ; « Native support requires the
  right template for these GGUFs » ; on vérifie le template chargé via
  `chat_template` / `chat_template_tool_use` dans `/props`
  ([docs/function-calling.md](https://github.com/ggml-org/llama.cpp/blob/master/docs/function-calling.md)).
- **[C] Pourquoi un mauvais template casse le tool calling** : le modèle a été
  entraîné à voir les outils et à émettre ses appels avec des **balises exactes**
  (`<tool_call>…</tool_call>`, canaux Harmony…). Si le template ne place pas la
  liste d'outils là où le modèle l'attend, ou si le parseur ne reconnaît pas
  les balises en sortie, l'appel d'outil arrive au harnais comme du **texte
  brut**, et l'agent « parle » au lieu d'agir.

### 6.3 Sampling en une ligne

- **[S] Défauts llama-server** : `temperature` 0.8, `top_k` 40, `top_p` 0.95,
  `min_p` 0.05 ([server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md) ;
  `common/common.h`). Ordre par défaut de la chaîne : penalties → DRY →
  top-n-sigma → top-k → typical-p → top-p → min-p → XTC → **température en
  dernier** (`common/common.h`).
- **[S]** Si le GGUF contient des clés `general.sampling.*` (temp, top_k,
  top_p, min_p, sequence…), llama.cpp les applique **à la place des défauts**,
  sauf si l'utilisateur a passé l'option
  (`common_init_sampler_from_model`, [common/common.cpp](https://github.com/ggml-org/llama.cpp/blob/master/common/common.cpp)).
- **[S]** Les éditeurs recommandent leurs propres valeurs : Qwen3.8-Flash-Next
  « thinking » `temperature=1.0, top_p=0.95, top_k=20`, « instruct »
  `0.7 / 0.80 / 20` ; Unsloth ajoute `min_p=0.0`
  ([model card](https://huggingface.co/Qwen/Qwen3.8-Flash-Next),
  [GGUF Unsloth](https://huggingface.co/unsloth/Qwen3.8-Flash-Next-GGUF)) ; guide
  gpt-oss : `--temp 1.0 --top-p 1.0`, « Do not use repetition penalties! »
  ([#15396](https://github.com/ggml-org/llama.cpp/discussions/15396)).
- **[C] Une ligne pour la scène** : le modèle sort une distribution de
  probabilités sur ~150 000 tokens ; top-k/top-p/min-p **coupent la longue
  traîne**, la température **aplatit ou durcit** ce qui reste, puis on tire au
  sort.

### 6.4 Threads

- **[S]** Auto-détection (`-t -1`) sous Linux x86 : si le CPU est hybride,
  `common_cpu_get_num_math()` épingle un thread sur chaque CPU logique, **saute
  les E-cores** (commentaire du code : « efficiency cores harm lockstep
  threading ») et **un hyperthread sur deux** (« hyperthreading isn't useful for
  linear algebra ») ; sinon, nombre de cœurs physiques
  ([common/common.cpp](https://github.com/ggml-org/llama.cpp/blob/master/common/common.cpp)).
  `-tb` vaut par défaut la même chose que `-t`.
- **[C]** i7-1370P (6 P-cores HT + 8 E-cores = 20 threads) → **6 threads par
  défaut**. Le benchmark `-t 8,14,20` du repo compare donc le défaut implicite
  (6) à des valeurs qui incluent les E-cores. **Il faut ajouter `-t 6`** à la
  liste pour mesurer le défaut. Comme le decode est limité par la mémoire, 6
  P-cores suffisent souvent à saturer le bus (exemple officiel : tg plafonne
  dès 8 threads) ; le prefill, lui, peut profiter des E-cores (`-tb`). Hypothèse
  à mesurer, pas un fait.
- **[S]** Doc perf : en cas de saturation, « explicitly set this parameter to the
  number of the physical CPU cores »
  ([token_generation_performance_tips.md](https://github.com/ggml-org/llama.cpp/blob/master/docs/development/token_generation_performance_tips.md)).

### 6.5 Batch, Flash Attention, offload GPU, spéculation

- **[S]** `-b, --batch-size` « logical maximum batch size (default: 2048) » ;
  `-ub, --ubatch-size` « physical maximum batch size (default: 512) »
  ([server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)).
  **[C]** Le prompt est découpé en morceaux de `-ub` tokens envoyés au moteur de
  calcul ; un `-ub` plus grand accélère le prefill (surtout sur GPU) mais
  grossit le compute buffer.
- **[S] Flash Attention** : « an IO-aware exact attention algorithm that uses
  tiling to reduce the number of memory reads/writes » ([arXiv:2205.14135](https://arxiv.org/abs/2205.14135)) ;
  dans llama.cpp `-fa auto` par défaut, « Supported (and therefore enabled by
  default) for most combinations of models and backends »
  ([docs/multi-gpu.md](https://github.com/ggml-org/llama.cpp/blob/master/docs/multi-gpu.md)).
  **[C]** Même résultat mathématique, moins de mémoire temporaire. Il est
  indispensable pour quantifier le cache V.
- **[S] Offload partiel** : `-ngl` = « max. number of layers to store in VRAM »
  (défaut `auto`) ; `--fit on` (défaut) ajuste automatiquement les arguments non
  fixés pour tenir en mémoire ([server README](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)).
  Le log annonce `offloaded %d/%d layers to GPU`.
- **[S] Décodage spéculatif** : un petit modèle « brouillon » propose plusieurs
  tokens, le gros modèle les vérifie **en un seul batch** ; variantes llama.cpp
  : `draft` (petit modèle), `draft-eagle3`, `draft-dflash`, **`draft-mtp`** (« Use
  Multi Token Prediction (MTP) heads from the main model »), et des variantes
  n-gram sans modèle ([docs/speculative.md](https://github.com/ggml-org/llama.cpp/blob/master/docs/speculative.md)).
  MTP = têtes entraînées pour prédire plusieurs tokens à l'avance (objectif
  d'entraînement de DeepSeek-V3, [arXiv:2412.19437](https://arxiv.org/abs/2412.19437)) ;
  Qwen3.8-Flash-Next embarque 4B paramètres de MTP (« 1 layer, trained with
  multi-steps »). En une phrase : **deviner vite, vérifier en parallèle, garder
  ce qui est juste**, ce qui transforme du decode (limité par la mémoire) en
  mini-prefill (limité par le calcul).

---

## 7. Règles de dimensionnement à emporter

### 7.1 La formule

> **RAM nécessaire ≈ taille du fichier GGUF + KV cache (`n_ctx` × octets/token) + buffers de calcul (~0,3–1 Go) + OS et applis**

- Taille fichier [S] : « memory and disk requirements are the same » (quantize README).
- KV cache [S]/[C] : formule §2.2, affichée dans le log `llama_kv_cache: size = …`.
- Buffers [S] : affichés `compute buffer size = … MiB` (`llama-context.cpp`) ; la
  fourchette 0,3–1 Go est une **estimation [C]** pour CPU avec `-ub 512`.
- **[C] Paramètres → Go** : Go ≈ milliards de paramètres × bpw / 8. Q4_K_M ≈ 0,61
  Go par milliard ; Q8_0 ≈ 1,06 ; BF16 = 2. Vérification : Llama 3.1 8B Q4_K_M →
  4,9 Go (officiel) ; 70B → 43,1 Go (officiel).
- **[S]** llama.cpp fait ce calcul lui-même avec `--fit` (défaut `on`), avec une
  marge de 1024 MiB (`--fit-target`).

### 7.2 Ce qui tient où (estimations [C], Q4 sauf mention, contexte modéré ~32K, KV f16)

| RAM (ou mémoire unifiée) | Confortable | Limite | Exemples concrets (taille fichier) |
|---|---|---|---|
| **16 Go** | dense ≤ 8B ; MoE ~20B | dense 12–14B à contexte court | Llama 3.1 8B Q4_K_M 4,9 Go ; gpt-oss-20b MXFP4 12,1 Go (le guide officiel annonce 14,9 Go à 8K, donc trop juste sur un laptop de 16 Go avec l'OS) |
| **32 Go** (≈ le laptop, 30 Go) | dense ≤ 14B ; MoE ≤ ~30B | dense 32B Q4 (~20 Go) à contexte court | LFM2.5-8B-A1B 6,4 Go ; gpt-oss-20b ; Qwen3-30B-A3B Q4 (~18 Go [C]) |
| **64 Go** | dense 32B ; 70B Q4_K_M (43,1 Go) à contexte modéré | gpt-oss-120b (63,4 Go → 64–68,5 Go selon le contexte) **ne tient pas** | – |
| **128 Go** (Strix Halo, DGX Spark, M4/M5 Max) | gpt-oss-120b avec tout le contexte | Qwen3.8-Flash-Next UD-Q4_K_XL (111,3 Go + ~6 GiB de KV à 262K) **très juste** ; UD-Q3_K_XL (90 Go) passe | DGX Spark : « up to 200 billion parameters » [E] |

Avertissement à dire sur scène : sur une machine à mémoire unifiée, la part
réellement allouable au GPU est plafonnée (Strix Halo : jusqu'à 96 Go sur 128
selon Tom's Hardware) ; sur un PC classique, ce qui compte pour la vitesse
GPU, c'est la VRAM (24/32 Go), et ce qui dépasse retombe sur la RAM et sur sa
bande passante.

---

## 8. Le serveur LAN : Qwen3.8-Flash-Next

**Model card trouvée** : [Qwen/Qwen3.8-Flash-Next](https://huggingface.co/Qwen/Qwen3.8-Flash-Next)
(+ [`config.json`](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/main/config.json)) ;
GGUF : [unsloth/Qwen3.8-Flash-Next-GGUF](https://huggingface.co/unsloth/Qwen3.8-Flash-Next-GGUF). [S] sauf mention.

- Statut : « architecture preview intended to underpin Qwen4 », distinct du
  service hébergé Qwen3.8-Flash (1M de contexte par défaut, outils intégrés) ;
  `model_type: qwen4_exp`, arch GGUF `qwen4exp` (présente dans llama.cpp
  `master` **et** `v0.5.0`).
- **Paramètres** : « 125B with 6B activated, plus 51B n-gram embedding and 4B MTP ».
  **[C]** 125 + 51 = 176 Md, ce qui colle avec les **176,9 B** affichés par le
  serveur (llama.cpp ne compte probablement pas la tête MTP, ou la compte à
  part ; non vérifié).
- **Couches** : 48 ; « Hidden Layout: 12 × (3 × (Gated DeltaNet → MoE) → 1 × (Qwen
  Sparse Attention → MoE)) » → **36 couches d'attention linéaire (sans KV cache),
  12 couches d'attention « QSA »** (`full_attention_interval: 4`).
  - Gated DeltaNet : 48 têtes V / 16 têtes QK, head_dim 128 (état en float32).
  - QSA : 24 têtes Q, **2 têtes KV**, head_dim 256 ; indexeur MQA (4 têtes de
    requête, 1 tête de clé, dim 128) ; budget « 2048 tokens » (attention
    parcimonieuse par micro-blocs).
- **MoE** : 512 experts, « 10 Routed + 1 Shared », dimension intermédiaire 640.
- **N-gram embedding** : 51 Md de paramètres ; config : `ngram_vocab_size_base:
  20 000 000`, `ngram_size: 3` (bigrammes et trigrammes, injectés en couche 2) ;
  la carte le présente comme « more amenable to offloading than
  Mixture-of-Experts ».
- Hidden size 2560, vocab 248 320, **contexte 262 144 natif**, extensible à 1M
  (YaRN) ; vision intégrée.
- **Fichier** [S, API HF] : `UD-Q4_K_XL` = **4 shards, 111,33 Go (103,7 GiB)**
  (`-00001-of-00004` = 11 Mo de métadonnées, puis 49,9 + 49,4 + 12,1 Go). Autres
  : UD-Q3_K_XL 90 Go, Q8_0 192 Go, BF16 354 Go.
- **[C] Ce que l'architecture implique** :
  - **bpw moyen** ≈ 111,3 × 8 / 176,9 ≈ **5,0** ;
  - **octets lus par token** ≈ 6B actifs × 5/8 ≈ **3,75 Go** (+ quelques lignes
    d'embedding n-gram, + KV) → **35 tok/s ⇒ ~130 Go/s effectifs**. C'est
    cohérent avec une machine à mémoire unifiée de 256–273 Go/s (Strix Halo,
    DGX Spark) à ~50 % d'efficacité, ou avec un GPU. **Le matériel du serveur
    n'est pas documenté ici** : c'est une déduction ;
  - **KV cache** ≈ 2 × 12 × 2 × 256 × 2 o = **24 KiB/token → 6 GiB à 262 144
    tokens** en f16 (contre 24 GiB si les 48 couches avaient la même attention
    complète), plus l'index QSA et l'état DeltaNet fixe (~3 MiB par couche et
    par séquence en float32, soit ~110 MiB pour 36 couches [C]) ;
  - la table n-gram (51 Md de paramètres) dépasse largement 4 GiB : avec
    `--lazy-mode auto`, llama.cpp devrait la **lire à la demande depuis le
    disque** au lieu de la garder résidente (règle du code, §1.4 ; non vérifié
    sur ce fichier précis).
- Pourquoi c'est le bon exemple pour l'acte 1 : il cumule **toutes** les
  notions — MoE extrême (6B actifs sur 176B, 3,4 %), attention hybride (KV
  cache divisé par 4), GQA poussée (2 têtes KV), quantification dynamique
  (UD-Q4_K_XL), MTP pour le décodage spéculatif, gros embeddings
  déportables.

---

## 9. Explications pour la scène

1. **Chargement.** « Le modèle n'est pas *chargé*, il est *mappé* : l'OS
   présente le fichier comme de la mémoire et le lit depuis le disque au premier
   accès. La première fois, on attend le SSD ; la seconde, tout est déjà dans le
   cache de l'OS. Si votre moniteur affiche 2 Go "utilisés" pour un modèle de
   6 Go, regardez la colonne *cache* : les poids y sont. »
2. **Trop gros pour la RAM.** « Si le fichier ne tient pas en RAM, ça démarre
   quand même, puis l'OS passe son temps à jeter des pages et à les relire.
   Vous passez de 80 Go/s à 3 Go/s : un token par minute. La règle est simple :
   le fichier doit tenir en RAM, avec de la marge. »
3. **KV cache.** « Pour écrire le mot suivant, le modèle relit tout ce qui
   précède. Pour ne pas tout recalculer, il garde un cache par token et par
   couche, réservé d'un coup au démarrage pour toute la fenêtre de contexte.
   Sur un Llama 8B, c'est 128 Ko par token, soit 16 Go pour 128K de contexte :
   plus que le modèle lui-même. »
4. **Pourquoi les nouveaux modèles ont des contextes énormes.** « Les
   architectures récentes trichent intelligemment : moins de têtes de cache
   (GQA), des couches qui ne regardent que les 128 ou 1024 derniers tokens, ou
   des couches qui gardent un état de taille fixe. Le modèle du serveur n'a un
   vrai KV cache que sur 12 couches sur 48 : 6 Go pour 262 000 tokens. »
5. **Quantification.** « On compresse les poids par paquets de 32 : un facteur
   d'échelle, puis chaque poids sur 4 bits. C'est un JPEG pour réseaux de
   neurones : à 8 bits on ne voit rien, à 4 bits c'est le bon compromis, à 2 bits
   ça bave. Et un 13B compressé en 4 bits bat un 7B non compressé, tout en étant
   plus petit. »
6. **Prefill vs decode.** « Il y a deux moteurs. Lire votre prompt, c'est un
   gros calcul matriciel parallèle, limité par le CPU ou le GPU. Écrire la
   réponse, c'est un token à la fois, et à chaque token il faut relire tous les
   poids : là, c'est la bande passante mémoire qui décide. Diviser la taille du
   modèle par trois multiplie la vitesse d'écriture par trois. »
7. **Règle de calcul.** « Vitesse d'écriture maximale = bande passante divisée
   par la taille des poids lus par token. 83 Go/s divisés par 5 Go, ça fait 16
   tokens par seconde au mieux pour un 8B sur ce laptop. Aucun réglage ne vous
   fera dépasser ce plafond. »
8. **Agentique sur CPU.** « Un agent envoie 20 000 tokens de contexte à chaque
   tour. Sur CPU, lire ce prompt prend des minutes, alors qu'écrire la réponse
   prend des secondes. C'est pour ça que le cache de prompt est vital : si le
   début du prompt ne change pas, on ne le relit pas. »
9. **MoE.** « Un MoE, c'est 512 experts dont 10 travaillent à chaque token. Il
   faut de la RAM pour tous, mais on ne lit que ceux qui travaillent. Sur CPU,
   où la RAM ne coûte pas cher mais où la bande passante est faible, c'est
   exactement le bon profil. »
10. **Template.** « Le modèle a appris à appeler des outils avec des balises
    précises. Le chat template, embarqué dans le GGUF, met vos outils au bon
    endroit et à la bonne forme. S'il est faux, l'appel d'outil arrive comme du
    texte et votre agent bavarde au lieu d'agir. »
11. **Tokens.** « Un token n'est pas un mot. En français, comptez 1,5 token par
    mot, soit 60 % de plus que l'anglais pour le même texte. Votre contexte de
    128K, c'est environ un roman de 85 000 mots. »

---

## 10. Chiffres et schémas proposés pour les slides

**Slide « mmap »** — schéma à 3 boîtes : `SSD (fichier .gguf)` → `cache de pages
de l'OS (RAM)` ← `llama.cpp (mapping lecture seule)`. Annotation : « 1er
lancement = vitesse du SSD ; 2e = instantané ; trop gros = relecture à chaque
token ». Commande à montrer : `free -h` (colonne *buff/cache*) puis
`grep Rss /proc/$(pgrep llama-server)/status`.

**Slide « KV cache »** — formule + barre empilée :
`2 × couches × têtes KV × head_dim × n_ctx × 2 octets`.
Barres empilées (poids | KV à 8K | KV au contexte max) :
- Llama-3.1-8B Q4_K_M : 4,6 GiB | 1 GiB | **16 GiB** ;
- Qwen3-0.6B Q4_K_M : 0,4 GiB | 0,9 GiB | **4,4 GiB** (« le cache pèse 10× le modèle ») ;
- gpt-oss-20b : 12,1 Go | – | +3 GiB (validé par le guide officiel : 14,9 → 17,9 Go) ;
- Qwen3.8-Flash-Next : 103,7 GiB | 0,2 GiB | 6 GiB.
Mettre la ligne de log réelle à l'écran : `llama_kv_cache: size = … MiB (… cells, … layers, …), K (f16): …, V (f16): …`.

**Slide « quantification »** — courbe KLD vs taille (Llama 3 8B, perplexity
README) : f16 14,97 GiB / 0,0006 ; q8_0 7,96 / 0,0014 ; q6_K 6,14 / 0,0055 ;
q5_K_M 5,33 / 0,011 ; **q4_K_M 4,58 / 0,028** ; q3_K_M 3,74 / 0,084 ; q2_K 2,96
/ 0,445 ; iq1_S 1,88 / 2,21 (axe Y logarithmique, coude à Q4). Encadré « 13B
Q4_K_M (7,3 Go, PPL 5,30) > 7B F16 (13 Go, PPL 5,91) » (PR #1684).

**Slide « decode = bande passante »** — deux graphiques côte à côte :
(a) table quantize Llama-3.1-8B : tg F16 29 → Q8_0 51 → Q4_K_M 72 t/s pendant
que pp reste à ~800–900 t/s ; (b) #4167 : TG Q4_0 7B vs bande passante (M1 68 →
14 t/s ; M3 Max 400 → 66 ; M4 Max 546 → 83 ; M2 Ultra 800 → 94).

**Slide « bandes passantes »** — barres horizontales (Go/s) : laptop i7-1370P
83 · M5 153 · Strix Halo 256 · DGX Spark 273 · M4 Pro 273 · M5 Pro 307 · M4 Max
546 · M5 Max 614 · RTX 4090 1008 · M5 Ultra 1200 · RTX 5090 1792. Ajouter une
colonne « plafond tok/s pour un 8B Q4_K_M (4,9 Go) » = BW/4,9 : 17 · 31 · 52 ·
56 · 56 · 63 · 111 · 125 · 206 · 245 · 366 [C].

**Slide « un tour d'agent sur CPU »** — frise : `[prefill 20 000 tokens ≈ 400 s]
[decode 500 tokens ≈ 30 s]` vs `[prefill caché : 500 nouveaux tokens ≈ 10 s]
[decode ≈ 30 s]` (ordres de grandeur [C] à remplacer par la mesure
`llama-bench -pg 20000,500` du laptop).

**Slide « MoE »** — grille de 512 petits carrés dont 10 + 1 allumés ; légende «
RAM : 176 Md de paramètres ; lecture par token : 6 Md ». Table : dense 8B Q4 →
≤ 17 t/s ; LFM2.5-8B-A1B → ≤ 70 t/s (plafonds laptop [C]).

**Slide « dimensionnement »** — la formule de §7.1 + la table de §7.2.

**Slide « Qwen3.8-Flash-Next anatomie »** — empilement de 12 blocs `[DeltaNet,
DeltaNet, DeltaNet, QSA]`, chaque couche suivie d'un MoE 512×(10+1) ; à côté :
« 111 Go, 4 shards, 262K de contexte, 6B actifs, ~35 tok/s ».

---

## 11. Limites, points non vérifiés, affirmations courantes fausses

### 11.1 Non vérifié / à mesurer

- **Matériel du serveur LAN** : inconnu ; l'estimation « ~130 Go/s effectifs »
  (§8) est une déduction à partir des 35 tok/s mesurés par le projet.
- **Type de RAM du laptop** (DDR5-5200 → 83,2 Go/s ou LPDDR5-6400 → 102,4 Go/s) :
  non vérifié (nécessite `sudo dmidecode -t memory`).
- **Compilation et benchmark locaux** : impossibles pendant cette recherche
  (pas de `cmake` ni de `g++` sur la machine, pas d'image llama.cpp construite).
  Les chiffres CPU cités viennent de l'exemple officiel `llama-bench` (llama 7B,
  matériel non précisé, 2023) et de la PR #1684 (Ryzen 7950X) : ils donnent des
  **rapports** et des ordres de grandeur, pas des chiffres du laptop.
- **176,9 B vs 125 + 51 + 4** : le détail du décompte de llama.cpp (MTP,
  vision) n'a pas été vérifié.
- **Lazy-read de la table n-gram** : déduit de la règle `> 4 GiB` du code, non
  observé dans un log réel.
- **Efficacité réelle de la bande passante** (« 50–80 % ») : ordre de grandeur
  tiré d'un seul point mesuré (#4167, M2 Ultra ≈ 45 %) et de la notion de MBU de
  Databricks. Pas une constante.
- **Fourchette de 0,3 à 1 Go pour les buffers de calcul** : estimation.
- Étude « Invisible Language Tax » (arXiv:2609.39001) : préprint à auteur
  unique, non relu par des pairs.
- Gains du QAT Gemma 3 (−54 % de perte de perplexité) et vitesse « comme un
  12,9B » de Mixtral : revendications d'éditeur.
- RTX 4090/5090 : bandes passantes calculées (bus × débit) et concordantes avec
  les fiches tierces ; la page NVIDIA consultée n'affiche que le bus et la
  capacité.

### 11.2 Affirmations courantes fausses ou trompeuses

| Affirmation | Statut | Pourquoi |
|---|---|---|
| « Avec mmap, un modèle de 30 Go tourne dans 6 Go de RAM » | **Faux** | Les poids sont dans le cache de pages. S'ils n'y tiennent pas, il faut relire le disque à chaque token (#638). |
| « La RSS ne compte pas les pages mmap » | **Inexact sous Linux** | `VmRSS` inclut `RssFile`. Ce sont `free`/« utilisé » et les moniteurs graphiques qui les rangent en cache. |
| « Plus de threads = plus rapide » | **Faux pour le decode** | Le tg plafonne dès que le bus mémoire est saturé (exemple officiel : plateau à 8 threads) ; la doc dit de redescendre aux cœurs physiques. Sur Intel hybride, llama.cpp exclut déjà les E-cores par défaut. |
| « Le prompt est traité 10 à 100× plus vite que la génération » | **Vrai sur GPU, faux sur CPU** (×2–4) | Voir E2. C'est le piège de l'agentique sur CPU. |
| « Un MoE 30B-A3B tourne comme un 3B, donc 4 Go de RAM suffisent » | **Faux** | Vitesse ≈ actifs, mais RAM = totaux (HF : « all experts are loaded in memory »). |
| « 1 token ≈ 1 mot » / « 4 caractères par token » partout | **Faux en français** | ~1,5 token/mot ; +31 à 58 % de tokens par rapport à l'anglais. |
| « La quantification du KV cache dégrade fortement le modèle » | **Faux pour q8_0** | « no significant quality loss » (PR #7412) ; K plus sensible que V. |
| « `-ctk/-ctv q4_0` marche partout » | **Incomplet** | Un V quantifié exige Flash Attention (activé automatiquement en `-fa auto`, erreur en `-fa off`). |
| « Q4 = 4 bits par poids » | **Approximatif** | Q4_0 = 4,5 bpw, Q4_K_M ≈ 4,89 bpw (échelles + tenseurs sensibles en Q6_K). |
| « `--no-mmap` / `--mlock` » | **Périmé** pour la version épinglée | Remplacés par `-lm/--load-mode`. |
| « `-c 0` charge toujours le contexte complet du modèle » | **Incomplet** | `--fit on` (défaut) peut le réduire pour tenir en mémoire (plancher 4096). |
| « Quand le contexte est plein, le modèle oublie le début » | **Faux par défaut** | `--context-shift` est désactivé par défaut : la requête est refusée ou la génération s'arrête. Avec context shift, c'est la moitié **après** `n_keep` qui est jetée, pas le début. |
| « Le prompt caching est déterministe » | **Faux** | Le README avertit que les logits ne sont pas identiques bit à bit entre batch et decode. |

---

## Sources

**llama.cpp — code et docs** (master `c06f8416`, recoupés sur `v0.5.0`)
- src/llama-mmap.cpp — https://github.com/ggml-org/llama.cpp/blob/master/src/llama-mmap.cpp
- src/llama-model-loader.cpp — https://github.com/ggml-org/llama.cpp/blob/master/src/llama-model-loader.cpp
- src/llama-model.cpp — https://github.com/ggml-org/llama.cpp/blob/master/src/llama-model.cpp
- src/llama-kv-cache.cpp — https://github.com/ggml-org/llama.cpp/blob/master/src/llama-kv-cache.cpp
- src/llama-kv-cache-iswa.cpp — https://github.com/ggml-org/llama.cpp/blob/master/src/llama-kv-cache-iswa.cpp
- src/llama-memory-recurrent.cpp — https://github.com/ggml-org/llama.cpp/blob/master/src/llama-memory-recurrent.cpp
- src/llama-memory-hybrid-idx.h — https://github.com/ggml-org/llama.cpp/blob/master/src/llama-memory-hybrid-idx.h
- src/llama-context.cpp — https://github.com/ggml-org/llama.cpp/blob/master/src/llama-context.cpp
- common/arg.cpp, common/common.h, common/common.cpp, common/fit.h — https://github.com/ggml-org/llama.cpp/tree/master/common
- ggml/src/ggml-common.h — https://github.com/ggml-org/llama.cpp/blob/master/ggml/src/ggml-common.h
- tools/server/README.md, server.cpp, server-context.cpp — https://github.com/ggml-org/llama.cpp/tree/master/tools/server
- tools/quantize/README.md — https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md
- tools/perplexity/README.md — https://github.com/ggml-org/llama.cpp/blob/master/tools/perplexity/README.md
- tools/llama-bench/README.md — https://github.com/ggml-org/llama.cpp/blob/master/tools/llama-bench/README.md
- docs/speculative.md — https://github.com/ggml-org/llama.cpp/blob/master/docs/speculative.md
- docs/function-calling.md — https://github.com/ggml-org/llama.cpp/blob/master/docs/function-calling.md
- docs/multi-gpu.md — https://github.com/ggml-org/llama.cpp/blob/master/docs/multi-gpu.md
- docs/development/token_generation_performance_tips.md — https://github.com/ggml-org/llama.cpp/blob/master/docs/development/token_generation_performance_tips.md

**llama.cpp — PR et discussions**
- PR #613 (mmap, jart) — https://github.com/ggml-org/llama.cpp/pull/613 ; billet : https://justine.lol/mmap/
- Discussion #638 (« 30B in 5.8GB? ») — https://github.com/ggml-org/llama.cpp/discussions/638
- PR #1684 (k-quants, ikawrakow) — https://github.com/ggml-org/llama.cpp/pull/1684
- Discussion #4167 (Apple Silicon, ggerganov) — https://github.com/ggml-org/llama.cpp/discussions/4167
- PR #7412 (KV cache quantifié, J. Gäßler) — https://github.com/ggml-org/llama.cpp/pull/7412
- PR #9866 (`--cache-reuse`) — https://github.com/ggml-org/llama.cpp/pull/9866
- PR #15293 (checkpoints SWA/contexte) — https://github.com/ggml-org/llama.cpp/pull/15293
- PR #16391 (`--cache-ram`) — https://github.com/ggml-org/llama.cpp/pull/16391
- Discussion #15396 (guide gpt-oss) — https://github.com/ggml-org/llama.cpp/discussions/15396

**Papiers**
- Dettmers & Zettlemoyer, k-bit Inference Scaling Laws — https://arxiv.org/abs/2212.09720
- Ainslie et al., GQA — https://arxiv.org/abs/2305.13245
- Dao et al., FlashAttention — https://arxiv.org/abs/2205.14135
- Jiang et al., Mixtral of Experts — https://arxiv.org/abs/2401.04088
- Gemma 3 Technical Report — https://arxiv.org/html/2503.19786
- DeepSeek-V3 Technical Report — https://arxiv.org/abs/2412.19437
- Dutta et al., Accuracy is Not All You Need — https://arxiv.org/abs/2407.09141
- Petrov et al., Language Model Tokenizers Introduce Unfairness Between Languages — https://arxiv.org/abs/2305.15425
- Serval, The Invisible Language Tax (préprint 2026) — https://arxiv.org/abs/2609.39001
- KTransformers (SOSP 2025) — https://dl.acm.org/doi/10.1145/3731569.3764843

**Blogs techniques**
- Databricks, LLM Inference Performance Engineering — https://www.databricks.com/blog/llm-inference-performance-engineering-best-practices
- kipply, Transformer Inference Arithmetic — https://kipp.ly/transformer-inference-arithmetic/
- Horace He, Making Deep Learning Go Brrrr — https://horace.io/brrr_intro.html
- Hugging Face, Mixture of Experts Explained — https://huggingface.co/blog/moe
- Mistral, Mixtral of experts — https://mistral.ai/news/mixtral-of-experts
- Google, Gemma 3 QAT — https://developers.googleblog.com/en/gemma-3-quantized-aware-trained-state-of-the-art-ai-to-consumer-gpus/
- Linux kernel, /proc — https://docs.kernel.org/filesystems/proc.html

**Model cards et configs**
- Qwen/Qwen3.8-Flash-Next — https://huggingface.co/Qwen/Qwen3.8-Flash-Next (config : https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/main/config.json)
- unsloth/Qwen3.8-Flash-Next-GGUF — https://huggingface.co/unsloth/Qwen3.8-Flash-Next-GGUF (tailles : https://huggingface.co/api/models/unsloth/Qwen3.8-Flash-Next-GGUF/tree/main/UD-Q4_K_XL)
- nvidia/Qwen3.8-Flash-Next-NVFP4 — https://huggingface.co/nvidia/Qwen3.8-Flash-Next-NVFP4
- openai/gpt-oss-120b / -20b — https://huggingface.co/openai/gpt-oss-120b , https://huggingface.co/openai/gpt-oss-20b
- ggml-org/gpt-oss-*-GGUF (tailles) — https://huggingface.co/api/models/ggml-org/gpt-oss-120b-GGUF/tree/main
- Llama-3.1-8B config (miroir unsloth) — https://huggingface.co/unsloth/Llama-3.1-8B-Instruct/raw/main/config.json
- Qwen/Qwen3-0.6B config — https://huggingface.co/Qwen/Qwen3-0.6B/raw/main/config.json
- LiquidAI/LFM2.5-8B-A1B config — https://huggingface.co/LiquidAI/LFM2.5-8B-A1B/raw/main/config.json
- HF docs GGUF — https://huggingface.co/docs/hub/en/gguf
- Spec GGUF — https://github.com/ggml-org/ggml/blob/master/docs/gguf.md

**Matériel**
- Intel i7-1370P — https://www.intel.com/content/www/us/en/products/sku/232146/intel-core-i71370p-processor-24m-cache-up-to-5-20-ghz/specifications.html
- Apple M4 Pro/Max — https://www.apple.com/newsroom/2024/10/apple-introduces-m4-pro-and-m4-max/
- Apple M5 — https://www.apple.com/newsroom/2025/10/apple-unleashes-m5-the-next-big-leap-in-ai-performance-for-apple-silicon/
- Apple M5 Pro/Max — https://www.apple.com/newsroom/2026/03/apple-debuts-m5-pro-and-m5-max-to-supercharge-the-most-demanding-pro-workflows/
- Apple M5 Ultra — https://www.apple.com/newsroom/2026/08/apple-introduces-new-mac-studio-with-m5-max-and-m5-ultra/
- NVIDIA DGX Spark — https://www.nvidia.com/en-us/products/workstations/dgx-spark/
- NVIDIA RTX 5090 — https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/
- AMD Strix Halo (Tom's Hardware) — https://www.tomshardware.com/pc-components/cpus/amds-beastly-strix-halo-ryzen-ai-max-debuts-with-radical-new-memory-tech-to-feed-rdna-3-5-graphics-and-zen-5-cpu-cores
