# Acte 3 — Le paysage (automne 2026)

> Recherche pour l'ouverture « paysage » de l'acte 3 de la présentation
> « LLM & développement agentique — tout ça tourne chez vous ».
> **Date de consultation de toutes les sources : 5 octobre 2026**, sauf mention
> contraire. Chaque fait porte sa source. Les étiquettes qui suivent indiquent sa nature :
>
> - **[éditeur]** : revendication de celui qui publie le modèle ou l'outil (model
>   card, billet d'annonce). Ces chiffres ne sont pas vérifiés de façon indépendante.
> - **[indépendant]** : classement ou mesure faits par un tiers (Artificial
>   Analysis, Vals.ai, llama.cpp sur matériel de référence…).
> - **[primaire]** : métadonnées factuelles (API Hugging Face, API GitHub, texte
>   de licence, documentation officielle).
> - **[secondaire]** : presse ou blogs. On les utilise faute de mieux et il faut les
>   recouper.

---

## 0. Les trois modèles du repo

| Modèle | Éditeur | Taille | Architecture | Contexte | Licence | Orientation | Sources |
|---|---|---|---|---|---|---|---|
| **Qwen3.8-Flash-Next** (démo, serveur LAN) | Qwen / Alibaba, publié le 24/08/2026 | **125 B** de paramètres « MoE » avec **6 B actifs**, plus **51 B d'embedding n-gram** et **4 B de MTP**. La somme fait ≈ 180 B : l'API HF compte 179 999 981 459 paramètres en safetensors, ce qui explique les « ~177 B » affichés par llama-server | Attention hybride : Gated DeltaNet (linéaire) + « Qwen Sparse Attention ». 48 couches, 512 experts (10 routés + 1 partagé), « Gated Residual » | 262 144 tokens en natif, extensible à 1 M | **Qwen Community License 1.0**, PAS Apache. Il faut une licence séparée pour un usage commercial en « Model as a Service » ou en « AI Work Assistant » (assistant de code ou de bureautique). L'usage interne est autorisé | Image + texte (+ vidéo). Raisonnement actif par défaut (`reasoning_effort`), « preserved thinking ». Présenté comme « preview expérimentale de l'architecture de Qwen4 » | [model card HF](https://huggingface.co/Qwen/Qwen3.8-Flash-Next) [primaire/éditeur] ; [API HF](https://huggingface.co/api/models/Qwen/Qwen3.8-Flash-Next) [primaire] ; [LICENSE](https://huggingface.co/Qwen/Qwen3.8-Flash-Next/raw/main/LICENSE) [primaire] |
| **Spark-X2.5-4B** (`models/`) | XHToken / équipe SparkLLM (iFlytek), publié le 24/08/2026 | 4,1 B, dense (4 112 079 360 paramètres d'après l'API HF) | Hybride : 1 couche d'attention pleine pour 3 couches à fenêtre glissante (SWA). GGUF : architecture `spark2_5` | **1 M de tokens en natif** (le GGUF local indique `context_length = 1 048 576`) | **Apache 2.0** | Agent, code, tool use. La card cite Codex, Claude Code, OpenClaw et Hermes comme harnais. Entraîné sur des clusters Huawei Ascend | [model card HF](https://huggingface.co/XHToken/Spark-X2.5-4B) [éditeur] ; [API HF](https://huggingface.co/api/models/XHToken/Spark-X2.5-4B) [primaire] ; [GitHub](https://github.com/XHToken/Spark-X2.5) ; lien avec iFlytek : [dev.to/sparkllm](https://dev.to/sparkllm/spark-x25-4b-17b-the-only-on-device-models-with-native-1m-token-context-now-open-source-d9o) [secondaire] |
| **LFM2.5-8B-A1B** (`models/`, live 1) | Liquid AI, publié le 28/05/2026 | **8,3 B au total, 1,5 B actifs** (MoE) | 24 couches : 18 de convolution « double-gated » et 6 de GQA, avec un MoE sparse | 128 000 tokens | `lfm1.0` (licence propre, « other ») | « Agentic workflows, tool use, structured outputs ». La card précise : **« not the best fit for heavy programming »**. Raisonnement. Un drafter DSpark (328 M) annonce ~2,5× en décodage | [model card HF](https://huggingface.co/LiquidAI/LFM2.5-8B-A1B) [éditeur] ; [API HF](https://huggingface.co/api/models/LiquidAI/LFM2.5-8B-A1B) [primaire] |

**Benchmarks revendiqués par Qwen pour Qwen3.8-Flash-Next** [éditeur] (tableau de
la model card, évaluations faites dans le harnais Claude Code) :

| Benchmark | Qwen3.8-Flash-Next | Qwen3.8-27B | DeepSeek-V4-Flash-0731 | Claude Opus 4.6 (Max) |
|---|---|---|---|---|
| SWE-bench Pro | **62,5** | 61,7 | 56,0 | 53,4 |
| SWE-bench Multilingual | **81,0** | 73,8 | — | 77,5 |
| DeepSWE 1.1 | **58,7** | 42,2 | 54,4 | — |
| Toolathlon Verified | **73,5** | 67,1 | 70,3 | — |

⚠️ Qwen compare son modèle à **Claude Opus 4.6**, alors que la génération
fermée actuelle est Opus 5.5 / Fable 5.1 / GPT-6.x / Gemini 4 (voir §1.3). Qwen
précise aussi avoir « corrigé des tâches problématiques » de SWE-bench Pro avant
de réévaluer tous les modèles. Ces chiffres ne sont donc pas comparables aux
classements publics.

**Spark-X2.5-4B** [éditeur] : SWE-bench Pro 44,4 ; SWE-bench Verified 41,6 ;
BFCL-V4 65,1 ; τ²-bench 75,1 ; GPQA 67,4. La card le compare à Qwen3.5-4B/9B et
à Gemma4-E4B/12B.

---

## 1. Modèles open-weights : l'état de l'art à l'automne 2026

### 1.1 Les familles et leurs dernières versions

Sources communes : API Hugging Face (`/api/models/<id>` pour la date, la licence
et le nombre de paramètres en safetensors) [primaire], plus la model card de
chaque modèle [éditeur].

| Famille | Dernière(s) version(s) (date HF) | Total / actifs | Contexte | Licence | Orientation agent/code | Source |
|---|---|---|---|---|---|---|
| **Qwen** (Alibaba) | Qwen3.8-27B (05/08/2026) ; Qwen3.8-Flash-Next (24/08) ; Qwen3.8-2.4T-A95B (08/08) ; Qwen3.6-35B-A3B (15/04) ; Qwen3-Coder-Next (30/01) | 27 B dense ; 125 B (+51 B n-gram) / 6 B ; 2,4 T / 95 B ; 35 B / 3 B ; 80 B / 3 B | 262 k natif → 1 M | **27B, 3.6 et Coder-Next : Apache 2.0** ; Flash-Next : qwen-community-1.0 ; 2.4T : « qwen3.8-max » | Toutes évaluées dans Claude Code et orientées « agentic coding ». Qwen3.5 est sortie en février 2026 (card 3.6) | [Qwen3.8-27B](https://huggingface.co/Qwen/Qwen3.8-27B), [2.4T-A95B](https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B), [3.6-35B-A3B](https://huggingface.co/Qwen/Qwen3.6-35B-A3B), [Coder-Next](https://huggingface.co/Qwen/Qwen3-Coder-Next) |
| **DeepSeek** | V4 (avril 2026) ; V4-Pro-0813 (13/08) ; V4.1-Flash (10/09) | V4-Pro : 1,6 T / 49 B ; V4-Flash : 284 B / 13 B ; V4.1-Flash : 552 B « backbone » / 8–16 B (+196 B de mémoire « Engram ») | 1 M | **MIT** | V4.1-Flash est multimodal, encodeur-décodeur causal, sparse attention « CSA2 ». Terminal-Bench évalué dans son propre harnais | [V4.1-Flash](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash), [V4-Pro-0813](https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro-0813) ; date V4 : [Lambda](https://lambda.ai/blog/deepseek-v4-the-most-expected-open-source-model) [secondaire] |
| **Kimi** (Moonshot) | Kimi K3 (dépôt du 13/06, poids publics fin juillet 2026) ; K2.7-Code (11/06) | K3 : **2,8 T / 104 B** (16 experts actifs sur 896) ; K2.7-Code : 1 T / 32 B | K3 : 1 M ; K2.7 : 256 k | K3 : « Kimi K3 License » ; K2.7 : modified-MIT | K3 : attention hybride KDA (linéaire) + Gated MLA, **poids MXFP4 avec QAT**, vision. Card : Terminal-Bench 2.1 = 88,3 | [Kimi-K3](https://huggingface.co/moonshotai/Kimi-K3), [K2.7-Code](https://huggingface.co/moonshotai/Kimi-K2.7-Code) |
| **GLM** (Zhipu / Z.ai) | GLM-5.3 et GLM-5.3-Flash (25/08/2026) ; GLM-5.2 (16/06) | 5.3 : ~753 B (safetensors) ; 5.3-Flash : **320 B / 18 B** | jusqu'à 1 M (évals en 1 M) | 5.3 : « glm-5.3 » (licence propre) ; **5.3-Flash : MIT** | 5.3-Flash : première attention hybride sparse + linéaire chez GLM, multimodal. L'éditeur le dit « approaching Claude Opus 4.8 » [éditeur] | [GLM-5.3](https://huggingface.co/zai-org/GLM-5.3), [GLM-5.3-Flash](https://huggingface.co/zai-org/GLM-5.3-Flash) |
| **MiniMax** | MiniMax-M3 (02/06/2026) | ~428 B / ~23 B | 1 M | minimax-community | Sparse attention « MSA », multimodal, livré aussi en MXFP8 | [MiniMax-M3](https://huggingface.co/MiniMaxAI/MiniMax-M3) |
| **MiMo** (Xiaomi) | MiMo-V2.6-Pro / Flash (septembre 2026) | Pro : **1,02 T / 42 B** ; Flash : ~311 B | 1 M [secondaire] | **MIT** | Meilleur open-weights sur l'AA Intelligence Index (46) [indépendant] | [MiMo-V2.6-Pro-RL](https://huggingface.co/XiaomiMiMo/MiMo-V2.6-Pro-RL) ; [AA open-source](https://artificialanalysis.ai/models/open-source) |
| **Mistral** | Mistral Medium 3.5 (31/03/2026) ; Mistral Small 4 (23/01/2026) ; Devstral 2 / Devstral Small 2 (déc. 2025) | Medium 3.5 : 128 B dense ; Small 4 : **119 B / 6,5 B** ; Devstral 2 : 123 B ; Devstral Small 2 : 24 B | 256 k | Medium 3.5 : **modified MIT** (exceptions pour les très grandes entreprises) ; **Small 4 et Devstral Small 2 : Apache 2.0** | Medium 3.5 « supersedes Devstral » et remplace Devstral 2 dans **Mistral Vibe**. SWE-bench Verified 77,6 [éditeur] | [Medium 3.5](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B), [Small 4](https://huggingface.co/mistralai/Mistral-Small-4-119B-2603), [Devstral 2](https://huggingface.co/mistralai/Devstral-2-123B-Instruct-2512) |
| **Gemma** (Google) | Gemma 4 (mars 2026 ; 12B en mai) + variantes **QAT** (juin 2026) | E2B, E4B (effectifs), 12B, 26B-A4B (25,2 B / 3,8 B), 31B | 128 k (petits) / 256 k | **Apache 2.0** (nouveauté par rapport aux Gemma précédents) | Multimodal (audio sur E2B/E4B/12B). Attention hybride locale/globale. GGUF Q4_0 QAT officiels | [gemma-4-26B-A4B-it](https://huggingface.co/google/gemma-4-26B-A4B-it), [gemma-4-12B-it-qat-q4_0-gguf](https://huggingface.co/google/gemma-4-12B-it-qat-q4_0-gguf) |
| **OpenAI gpt-oss** | gpt-oss-120b / 20b (04/08/2025). **Aucune nouvelle version sur HF depuis** (hors gpt-oss-safeguard, sept. 2025) | 117 B / ~5 B ; 21 B / ~3,6 B | 128 k | Apache 2.0 | Livrés nativement en **MXFP4**. Restent la référence des benchs matériels | [org openai sur HF](https://huggingface.co/openai) |
| **Meta** | Llama 4 Scout/Maverick (avril 2025) = la fin de la lignée Llama. **Muse Spark (avril 2026) est fermé**. **Muse Glimmer 30B (09/08/2026)** est le retour à l'open | Glimmer : ~29,6 B dense + encodeur de perception | n/v | Glimmer : **Apache 2.0** | Glimmer est « distilled from Muse Spark, purpose-built for autonomous agentic tasks on consumer hardware » [éditeur] | [Muse-Glimmer-30B](https://huggingface.co/meta-models/Muse-Glimmer-30B) ; pivot vers le fermé : [The Batch](https://www.deeplearning.ai/the-batch/with-muse-spark-meta-pivots-away-from-its-open-weights-llama-strategy) [secondaire] |
| **IBM Granite** | Granite 4.2 (3B / 8B / 30B, 07/08/2026, sortie annoncée le 25/08) | 30 B dense | 128 k natif → 512 k | Apache 2.0 | Card évaluée sur Terminal-Bench 2.1. Variantes MLX et NVFP4 officielles | [granite-4.2-30b](https://huggingface.co/ibm-granite/granite-4.2-30b) |
| **Liquid AI LFM** | LFM2.5 (1.2B, 2.6B, 8B-A1B, VL-3B) + drafters DSpark (août–sept. 2026) | 8,3 B / 1,5 B | 128 k | lfm1.0 | Edge/on-device | voir §0 |
| **Microsoft** | Pas de nouveau Phi généraliste repéré en 2026 (dernier : Phi-4-reasoning-vision-15B, janv. 2026). **FrogNano-4B** (22/09/2026) est un agent de code dérivé de Qwen3.5-4B | 4,66 B | ~131 k | MIT d'après les métadonnées HF, Apache 2.0 d'après le texte de la card (incohérence) | Spécialisé Python + harnais « Leaf » | [FrogNano-4B-2609](https://huggingface.co/microsoft/FrogNano-4B-2609) |
| **NVIDIA Nemotron** | Nemotron 3.5 Lightning 30B-A3B (sortie le 11/08/2026) | 30 B / 3 B | jusqu'à 1 M | OpenMDW-1.1 | Hybride **Mamba-2 + MoE** + quelques couches d'attention. Livré en **NVFP4** avec drafters | [Nemotron-3.5-Lightning-30B-A3B](https://huggingface.co/nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16) |

### 1.2 Tendances, chacune illustrée par un modèle réel

| Tendance | Exemples sourcés ci-dessus |
|---|---|
| **MoE partout, très peu de paramètres actifs** | Qwen3.8-Flash-Next (6 B actifs), Qwen3.6-35B-A3B et Qwen3-Coder-Next (3 B), Nemotron 3.5 (3 B), LFM2.5 (1,5 B), Gemma 4 26B-A4B (3,8 B), Mistral Small 4 (6,5 B). Les ratios vont de 1:20 à 1:30 |
| **Attention hybride, linéaire ou sparse** | Gated DeltaNet + QSA (Qwen3.8), KDA + MLA (Kimi K3), Mamba-2 (Nemotron), conv + GQA (LFM2.5), SWA + full (Spark-X2.5, Gemma 4), CSA2 (DeepSeek V4.1), MSA (MiniMax M3), sparse + linéaire (GLM-5.3-Flash) |
| **Poids livrés en faible précision** | MXFP4 natif (gpt-oss), **MXFP4 + QAT** (Kimi K3), FP8 officiel (Qwen3.8-*-FP8, GLM-5.2-FP8), MXFP8 (MiniMax M3), NVFP4 (Nemotron, Granite, conversions NVIDIA), QAT Q4_0 GGUF (Gemma 4) |
| **Contexte de 256 k à 1 M** | 1 M : DeepSeek V4, Kimi K3, MiniMax M3, Spark-X2.5-4B (1 M même à 4 B !). 262 k natif : Qwen3.8 |
| **Raisonnement réglable** | `reasoning_effort` low/high/max (GLM-5.3, DeepSeek V4-Pro, Qwen3.8), « preserved thinking » (Qwen3.6+) |
| **Mémoires / embeddings déportables** | N-gram embedding de 51 B (Qwen3.8-Flash-Next), « Engram » de 196 B (DeepSeek V4.1-Flash). Paramètres « bon marché » qu'on peut déporter. C'est pourquoi le total affiché par llama-server dépasse le « 125 B » du nom |
| **Décodage spéculatif livré avec le modèle** | MTP (Qwen3.8), drafters DSpark/DFlash/EAGLE (Liquid, NVIDIA, DeepSeek, Mistral) |
| **Licences « open-weights » ≠ open source** | MIT/Apache (DeepSeek, Gemma 4, Granite, Qwen3.8-27B, GLM-5.3-Flash, MiMo) contre licences maison restrictives (Qwen Community, Kimi K3, GLM-5.3, MiniMax, Mistral Medium modified MIT) |

### 1.3 Écart entre open-weights et modèles fermés (benchmarks indépendants)

| Mesure (indépendante) | Meilleur fermé | Meilleur open-weights | Écart | Source |
|---|---|---|---|---|
| **AA Intelligence Index v4.3.2** (10 évals dont Terminal-Bench 4.0, HLE, GDPval-AA…) | Claude Opus 5.5 (max) : **58** | MiMo-V2.6-Pro : **46** (GLM-5.3 max : 45 ; Kimi K3 max : 44) | ~12 points | [AA leaderboard](https://artificialanalysis.ai/leaderboards/models), [AA open-source](https://artificialanalysis.ai/models/open-source) [indépendant] |
| **Terminal-Bench 4.0** (Vals.ai, mis à jour le 01/10/2026) | Claude Opus 5.5 : **65,15 %** ; Sonnet 5.5 : 64,14 % ; GPT-6 Astra : 59,60 % ; Gemini 4 Argon : 57,58 % | GLM 5.3 : **38,89 %** (10e) | ~26 points | [vals.ai/benchmarks/terminal-bench-4](https://www.vals.ai/benchmarks/terminal-bench-4) [indépendant] |
| **SWE-bench Verified** (Vals.ai, mis à jour le 01/09/2026) | Claude Opus 5 : **97,0 %** | DeepSeek V4 Pro 0813 : **96,4 %** ; GLM 5.3 : 95,4 % ; Kimi K3 : 93,4 % | ~0,6 point : **benchmark saturé** | [vals.ai/benchmarks/swebench](https://www.vals.ai/benchmarks/swebench) [indépendant] |
| SWE-bench Pro (Scale, scaffold standardisé) | Les chiffres diffèrent beaucoup d'un agrégateur à l'autre (Scale ~60 % contre « 89,9 % » chez BenchLM) | — | **non retenu** | [Scale Labs](https://labs.scale.com/leaderboard/swe_bench_pro) ; voir §Limites |

**Lecture honnête.** Sur les tâches « classiques » de correction de bug
(SWE-bench Verified), l'open-weights a rattrapé les modèles fermés. Sur les
tâches agentiques longues et difficiles (Terminal-Bench 4.0, index composite
AA), le retard reste net : 12 à 26 points selon la mesure. Cet écart bouge à
chaque sortie. Fin juillet, AA mesurait seulement 4 points avec Kimi K3, sur une
version antérieure de l'index ([tweet AA](https://x.com/ArtificialAnlys/status/2081926991788626011)).
En avril 2026, l'écart était de 6 points (Kimi K2.6 54 contre GPT-5.5 60)
([AA, 30/04/2026](https://artificialanalysis.ai/articles/recent-open-weights-model-launches)).
**Les modèles open-weights qui tiennent ces scores font de 300 B à 2,8 T de
paramètres et ne tournent pas sur un laptop.**

---

## 2. Moteurs d'inférence locaux

| Moteur | Positionnement en une ligne | Basé sur llama.cpp ? | API OpenAI-compatible | Dernière release | Source |
|---|---|---|---|---|---|
| **llama.cpp** (`llama-server`) | Le moteur C/C++ de référence pour GGUF, CPU/GPU tous backends. **Nouveau : un binaire unifié `llama`** (`llama serve` = `llama-server`, comme `git commit`) et un installeur en une ligne sur **llama.app** (lancé le 29/05/2026). En juillet 2026, `llama-cli` devient un client léger de llama-server ; l'ancien mode direct est renommé `llama-completion` [secondaire pour ce dernier point] | — | **Oui** : `/v1/chat/completions`, `/v1/responses`, `/v1/embeddings` et **Anthropic `/v1/messages`** | Tags `bNNNNN` continus (b11418 le 05/10/2026) + releases versionnées **v0.5.0 (23/09/2026)**, celle du `Dockerfile` du repo | [Discussion #23875](https://github.com/ggml-org/llama.cpp/discussions/23875), [README serveur](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md), [releases](https://github.com/ggml-org/llama.cpp/releases) [primaire] |
| **Ollama** | Le « docker pull » des modèles : CLI + daemon, catalogue, offre cloud | Stack ggml/llama.cpp + moteur propre (MLX sur Mac) [secondaire] | Oui (sous-ensemble) : `localhost:11434/v1`, y compris `/v1/responses` | v0.35.1 (29/09/2026) | [docs OpenAI compat](https://docs.ollama.com/api/openai-compatibility), [GitHub](https://github.com/ollama/ollama) |
| **LM Studio** | Application desktop (GUI) + daemon headless `llmster` | Moteurs llama.cpp **et** MLX (+ moteur expérimental « Splash » sur Mac M3+) | Oui, plus Anthropic `/v1/messages` | 0.4.25 (19/09/2026) | [changelog](https://lmstudio.ai/changelog/lmstudio) |
| **vLLM** | Serveur GPU haut débit (PagedAttention, batching), standard en production | Non | Oui | v0.31.0 (05/10/2026) | [GitHub](https://github.com/vllm-project/vllm/releases) |
| **SGLang** | Serveur GPU haut débit, recettes « day-0 » des labos (Spark-X2.5, Qwen3.8…) | Non | Oui | v0.5.21 (02/10/2026) | [GitHub](https://github.com/sgl-project/sglang/releases) |
| **MLX / mlx-lm** (Apple) | Framework natif Apple Silicon, `mlx_lm.server` | Non | Oui (serveur intégré) | v0.31.3 (22/04/2026) | [GitHub](https://github.com/ml-explore/mlx-lm) |
| **ik_llama.cpp** | Fork de llama.cpp « with better CPU performance » et quantifs SOTA | Fork (divergé depuis août 2024) | Oui (llama-server) | pas de releases GitHub | [README](https://github.com/ikawrakow/ik_llama.cpp) |
| **KTransformers** | Inférence hétérogène CPU+GPU pour les MoE géants (experts sur CPU). Ex. : GLM-5.3-Flash sur GPU grand public (26/08/2026) | Non | Oui | v0.7.1 (15/09/2026) | [GitHub](https://github.com/kvcache-ai/ktransformers) |
| **Lemonade** (AMD) | Serveur local pour Ryzen AI : CPU, GPU et **NPU XDNA2** | En partie (GGUF via llama.cpp, plus FLM/ONNX pour le NPU) | Oui, plus Anthropic et Ollama | v2026.40.0 (30/09/2026) | [README](https://github.com/lemonade-sdk/lemonade) |
| **Docker Model Runner** | Modèles comme artefacts OCI dans Docker | Oui (images `ghcr.io/ggml-org/llama.cpp`) + backends vLLM et SGLang | Oui | v1.2.8 (12/08/2026) | [README](https://github.com/docker/model-runner) |
| **Jan** | App desktop open source, locale d'abord, avec option cloud | Oui (moteur llama.cpp embarqué) | Oui (`localhost:1337`) | v0.8.4 (23/07/2026) | [README](https://github.com/janhq/jan) |
| **llamafile** (Mozilla.ai) | Un modèle = un exécutable unique multi-OS (Cosmopolitan) | Oui | Oui | 0.10.6 (15/09/2026) | [README](https://github.com/mozilla-ai/llamafile) |

**À retenir pour la scène.** Presque tout le « local grand public » (Ollama, LM Studio,
Jan, llamafile, Docker Model Runner, une partie de Lemonade) repose sur
llama.cpp/ggml. Tous exposent la même API OpenAI. llama-server parle en plus
le format Anthropic et l'API Responses.

---

## 3. Matériel pour le local

Règle d'ordre de grandeur, déjà présente dans `execution-llm-local.md` : la
**génération** est limitée par la bande passante mémoire, à peu près
« bande passante ÷ octets des paramètres actifs ». Le **prefill** dépend
surtout du calcul.

| Machine | Mémoire | Bande passante | Prix indicatif | Ce qui y tourne (mesures) | Sources |
|---|---|---|---|---|---|
| **Mac Studio M5 Max** (annoncé le 25/08/2026) | jusqu'à 128 Go unifiés | **614 Go/s** | à partir de 2 499 $ | n/v (Apple ne publie aucun tok/s) | [Apple Newsroom](https://www.apple.com/newsroom/2026/08/apple-introduces-new-mac-studio-with-m5-max-and-m5-ultra/) [primaire/éditeur] |
| **Mac Studio M5 Ultra** | jusqu'à **512 Go** (cette config arrive « fin octobre ») | **1,2 To/s** | à partir de 5 499 $ | « hundreds of billions of parameters » [éditeur, sans chiffre] | idem + [annonce M6/M5 Ultra](https://www.apple.com/newsroom/2026/08/apple-introduces-m6-and-m5-ultra-for-a-big-leap-in-performance-and-ai-compute/) |
| **Mac mini M6** | jusqu'à 32 Go | 170 Go/s | n/v | — | idem |
| **NVIDIA DGX Spark** (GB10) | 128 Go LPDDR5X unifiés | **273 Go/s** | 3 999 $ au lancement, **4 699 $** depuis février 2026 (pénurie de LPDDR5X) [secondaire] | **gpt-oss-120b MXFP4 : tg 58,7 tok/s (contexte vide) → 42,8 tok/s à 32 k ; pp 2 444 → 1 567 tok/s.** Qwen3-Coder-30B-A3B Q8_0 : tg 61 → 30 tok/s ; pp 2 987 → 1 348 tok/s | **llama.cpp, mesures officielles** : [benches/dgx-spark](https://github.com/ggml-org/llama.cpp/blob/master/benches/dgx-spark/dgx-spark.md), [discussion #16578](https://github.com/ggml-org/llama.cpp/discussions/16578) (mise à jour du 05/02/2026) [indépendant] ; prix : [IntuitionLabs](https://intuitionlabs.ai/articles/nvidia-dgx-spark-review) [secondaire] |
| **AMD Ryzen AI Max+ 395** (Strix Halo) | 128 Go unifiés (≈ 96–120 Go allouables au GPU) | 256 Go/s théoriques (~212–215 mesurés) [secondaire] | mini-PC ~2–3 k$ [secondaire, à revérifier] | Qwen3-Coder-30B-A3B Q4_K_S : **tg 74 (ROCm) à 98 (Vulkan) tok/s**, pp 1 115 à 1 345 tok/s ; Qwen3.5-122B-A10B Q4 : tg ~21–23 tok/s (03/08/2026). gpt-oss-120b : **~50–56 tok/s** de tg selon plusieurs sources [secondaire] | [Soothill, 03/08/2026](https://www.soothill.io/blog/2026/08/03/llamacpp-vulkan-vs-rocm-strix-halo/) [secondaire, mesure llama-bench] ; [localaimaster](https://localaimaster.com/blog/strix-halo-ai-max-395-guide) [secondaire] ; toolboxes validées sur Qwen3.8-Flash-Next : [kyuz0](https://github.com/kyuz0/amd-strix-halo-toolboxes) |
| AMD « Gorgon Halo » (Ryzen AI Max 400) | jusqu'à **192 Go** | n/v | annoncé pour T3 2026 [secondaire / rumeur] | — | [TechPowerUp](https://www.techpowerup.com/345514/amd-gorgon-halo-linked-to-rumored-refresh-of-ryzen-ai-max-400-series), [HotHardware](https://hothardware.com/news/amd-ryzen-ai-max-495-leak) |
| **RTX 5090** | 32 Go GDDR7 | ~1,8 To/s (spec. NVIDIA, non revérifiée ici) | MSRP 1 999 $, **mais ~7 449 $ en boutique le 30/09/2026** | Tout modèle qui tient dans 32 Go (gpt-oss-20b, Qwen3.6-35B-A3B en Q4…) | prix : [videocardprices](https://videocardprices.com/card/nvidia-rtx-5090/) [secondaire] |
| **Intel Arc Pro B60** (Dual 48 Go) | 2 × 24 Go GDDR6 | 456 Go/s par GPU | ~1 200 $ [secondaire] | modèles ~30–40 B en Q4 | [fiche Intel](https://download.intel.com/newsroom/2025/client-computing/Intel-Arc-Pro-B60-Data-Sheet.pdf), [hardware-corner](https://www.hardware-corner.net/arc-pro-b60-dual-48gb-vram-1200-20250815/) |
| **NPU** (Intel Panther Lake, AMD XDNA2…) | mémoire système | celle de la RAM | inclus dans le SoC | Panther Lake : NPU 5 à **50 TOPS int8** [secondaire]. Utile pour les petits modèles (Lemonade/FLM sur XDNA2), pas pour un agent de code | [Wikipedia Panther Lake](https://en.wikipedia.org/wiki/Panther_Lake_(microprocessor)) [secondaire] |

**Contexte économique 2026.** TrendForce prévoit une hausse des prix contractuels
de la DRAM de **+13–18 % au T3 2026** et de **+10–15 % au T4 2026**, tirée par
les serveurs IA ([T3](https://www.trendforce.com/presscenter/news/20260703-13134.html),
[T4, 30/09/2026](https://www.trendforce.com/presscenter/news/20260930-13258.html)).
Le matériel « beaucoup de mémoire » est cher et rare cette année.

**La démo en perspective.** La démo tourne sur un serveur LAN : Qwen3.8-Flash-Next
à ~35 tok/s (mesuré, cf. `presentation/README.md`), 6 B actifs. C'est la même
classe de vitesse que gpt-oss-120b sur DGX Spark à 32 k de contexte.

---

## 4. Harnais de code agentique

« Local ? » = peut-on brancher un modèle local via une API compatible (base URL) ?
**Oui** = documenté par l'éditeur. **Bricolage** = possible mais non supporté, ou
via un proxy ou un tunnel. **Non** = pas de voie raisonnable.

| Harnais | Forme | Open source ? | Local ? | Détail / source | Dernière release (API GitHub) |
|---|---|---|---|---|---|
| **OpenCode** | Terminal (+ IDE, desktop) | Oui (MIT) ; dépôt déplacé de `sst/opencode` vers `anomalyco/opencode` | **Oui** | `@ai-sdk/openai-compatible` + `baseURL`. Exemples officiels pour llama.cpp `:8080/v1`, Ollama, LM Studio ([docs providers](https://opencode.ai/docs/providers/)) | v1.18.34 (30/09/2026) |
| **Claude Code** | Terminal, IDE, desktop, web | Non (dépôt public sans licence open source) | **Bricolage** | `ANTHROPIC_BASE_URL` → tout serveur qui parle Anthropic Messages, ce que fait llama-server. Mais la doc dit qu'Anthropic **« doesn't support routing Claude Code to non-Claude models through any gateway »** ([doc LLM gateway](https://code.claude.com/docs/en/llm-gateway)). Plusieurs labos évaluent pourtant leurs modèles open dans Claude Code (cards Qwen3.8, GLM-5.3) | v2.1.289 (03/10/2026) |
| **Codex CLI** (OpenAI) | Terminal (+ IDE) | Oui (Apache 2.0) | **Oui** | `--oss` avec les providers intégrés `ollama` / `lmstudio`, ou `[model_providers.x] base_url`. **Uniquement `wire_api = "responses"`** depuis février 2026 [secondaire], ce que llama-server sait servir (`/v1/responses`) ([doc config](https://developers.openai.com/codex/config-advanced), [morphllm](https://www.morphllm.com/codex-provider-configuration) [secondaire]) | rust-v0.160.0 (01/10/2026) |
| **Gemini CLI** | Terminal | Oui (Apache 2.0) | **Bricolage** | Modèles Gemini seulement. `GOOGLE_GEMINI_BASE_URL` attend le format Gemini, donc il faut un proxy (LiteLLM). Le support local natif reste une demande ouverte ([discussion #24166](https://github.com/google-gemini/gemini-cli/discussions/24166), [LiteLLM](https://docs.litellm.ai/docs/tutorials/litellm_gemini_cli)) | v0.62.0 (29/09/2026) |
| **Cursor** (+ Cursor CLI) | IDE (fork VS Code) + CLI | Non | **Bricolage** (IDE) / **Non** (CLI) | « Override OpenAI Base URL » existe, mais le trafic passe par le backend Cursor, d'où le besoin d'**un tunnel public**. Tab reste cloud. Pas de modèle custom dans l'Agent CLI ([forum Cursor](https://forum.cursor.com/t/agent-cli-custom-model-support/151351), [dev.to](https://dev.to/orchidfiles/why-localhost-doesnt-work-as-openai-base-url-in-cursor-and-how-to-fix-it-589e) [secondaire]) | n/a |
| **GitHub Copilot** (agent mode VS Code ; coding agent cloud) | IDE ; cloud | Extension chat open source ; service fermé | **Oui** (agent mode, chat) / **Non** (coding agent cloud, complétions) | BYOK avec **Ollama** et Foundry Local en provider intégré. GA Business/Enterprise le 22/04/2026. « BYOK does not apply to code completions » ([changelog GitHub](https://github.blog/changelog/2026-04-22-bring-your-own-language-model-key-in-vs-code-now-available/)) | n/a |
| **Cline** | VS Code, JetBrains, CLI, desktop | Oui (Apache 2.0) | **Oui** | « Ollama / LM Studio », « Any OpenAI-compatible API » ([README](https://github.com/cline/cline)) | v4.1.22 (30/09) ; cli-v3.0.68 / desktop-v0.0.43 (02/10/2026) |
| **Roo Code** | VS Code | Oui (Apache 2.0) | — | ⚠️ **Arrêté** : annoncé le 21/04/2026, dépôt **archivé le 15/05/2026** (pivot vers « Roomote ») ([GitHub](https://github.com/RooCodeInc/Roo-Code) [primaire : archived=true] ; [codeburn PR](https://github.com/getagentseal/codeburn/pull/1551) [secondaire]) | v3.54.0 (15/05/2026), la dernière |
| **Kilo Code** | VS Code, JetBrains, CLI | Oui (MIT) | **Oui** | Providers OpenAI-compatible, Ollama, LM Studio ([docs](https://kilo.ai/docs/providers/openai-compatible)) | v7.8.3 (01/10/2026) |
| **Aider** | Terminal | Oui (Apache 2.0) | **Oui** | « can connect to almost any LLM, including local models » ([README](https://github.com/Aider-AI/aider)). ⚠️ **Dernière release v0.86.0 le 09/08/2025**, dernier commit le 22/05/2026 : projet ralenti | v0.86.0 (09/08/2025) |
| **Continue** | VS Code / JetBrains + CLI | Oui (Apache 2.0) | **Oui** | Ollama, LM Studio, llama.cpp, OpenAI-compatible (docs Continue, non refetchées ici) | v2.0.0-vscode (19/06/2026) |
| **Zed** | Éditeur natif (Rust) | Oui (GPL/AGPL, « NOASSERTION » côté API) | **Oui** | llama.cpp, LM Studio, Ollama, « local OpenAI-compatible server » ([docs](https://zed.dev/docs/ai/use-a-local-model)). Initiateur d'ACP (§5) | v1.22.0 (30/09/2026) |
| **Goose** | Desktop + CLI | Oui (Apache 2.0). Projet de l'**AAIF** : dépôt passé de `block/goose` à `aaif-goose/goose` | **Oui** | 15+ providers dont Ollama ([README](https://github.com/aaif-goose/goose), [goose rejoint l'AAIF](https://goose-docs.ai/blog/2026/04/07/goose-moves-to-aaif/)) | v1.53.0 (02/10/2026) |
| **Crush** (Charm) | Terminal | Source disponible (FSL, « NOASSERTION ») | **Oui** | `provider add ollama --base-url http://localhost:11434/v1` ([README](https://github.com/charmbracelet/crush)) | v0.97.1 (29/09/2026) |
| **Qwen Code** | Terminal (+ desktop) | Oui (Apache 2.0) | **Oui** | « Supports OpenAI, Anthropic, Gemini, and Qwen APIs… local model (Ollama / vLLM) » ([README](https://github.com/QwenLM/qwen-code)) | v0.25.0 (05/10/2026) |
| **Mistral Vibe** | Terminal + extension VS Code | Oui (Apache 2.0) | **Oui** | Doc officielle « Using offline models » : provider `api_style = "openai"`, llama.cpp `:8080/v1` ([docs Mistral](https://docs.mistral.ai/mistral-vibe/local)) | v2.25.8 (23/09/2026) |

---

## 5. Standards et écosystème

| Élément | En une ligne | Gouvernance / état | Source |
|---|---|---|---|
| **MCP** (Model Context Protocol) | Le « port USB » entre un agent et des outils ou données (JSON-RPC : tools, resources, prompts) | Donné par Anthropic à l'**Agentic AI Foundation (AAIF)** de la Linux Foundation (déc. 2025). **Spec actuelle : `2026-07-28`**, qui rend le protocole **stateless** (suppression du handshake `initialize` et des sessions), introduit `server/discover`, sort Tasks en extension et déprécie Roots, Sampling et Logging. Version précédente : 2025-11-25 | [spec](https://modelcontextprotocol.io/specification/latest), [changelog 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/changelog), [release GitHub](https://github.com/modelcontextprotocol/modelcontextprotocol/releases) [primaire] ; [annonce LF AAIF](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation) |
| **AAIF** | Fondation neutre de la LF pour l'agentique | Projets fondateurs : MCP, goose, AGENTS.md. 146 membres et 8 sponsors platinum (AWS, Anthropic, Block, Bloomberg, Cloudflare, Google, Microsoft, OpenAI) en avril 2026 [secondaire] | [LF](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation), [goose → AAIF](https://goose-docs.ai/blog/2026/04/07/goose-moves-to-aaif/) |
| **AGENTS.md** | Le « README pour agents » : un fichier markdown d'instructions par repo | Hébergé par l'AAIF. « Used by over **60k open-source projects** ». 25+ outils (Codex, Jules, Cursor, VS Code, Copilot, Aider, Zed, Devin, Junie…) | [agents.md](https://agents.md/) [éditeur] |
| **Agent Skills** (`SKILL.md`) | Dossier + `SKILL.md` (name, description, instructions), chargé par **progressive disclosure** | Format créé par Anthropic puis ouvert (agentskills.io). Clients listés : Claude Code, Codex/ChatGPT, Gemini CLI, **OpenCode**, Cursor, GitHub Copilot, VS Code, Goose, OpenHands, Junie, Amp, Mistral Vibe, Kiro, TRAE, Factory, Letta, Spring AI… (40+) | [agentskills.io](https://agentskills.io) [primaire] |
| **A2A** (Agent2Agent) | Protocole entre agents opaques (découverte via « agent card », délégation de tâches) | Projet LF. **v1.0.1 (28/05/2026)** | [GitHub a2aproject/A2A](https://github.com/a2aproject/A2A) [primaire] |
| **ACP** (Agent Client Protocol) | « LSP des agents » : connecter n'importe quel éditeur à n'importe quel agent (JSON-RPC sur stdio) | Lancé par Zed, rejoint par JetBrains (registre commun début 2026) [secondaire]. Schéma v1.24.1 (30/09/2026). Agents : Claude Code, Codex, Gemini CLI, Copilot, Goose… | [agentclientprotocol.com](https://agentclientprotocol.com/), [zed.dev/acp](https://zed.dev/acp), [GitHub](https://github.com/agentclientprotocol/agent-client-protocol) |

**Frameworks d'agents (une ligne chacun)** — releases lues sur l'API GitHub :

| Framework | En une ligne | Dernière release |
|---|---|---|
| **LangGraph** (LangChain) | Graphes d'états pour agents durables, avec reprise et human-in-the-loop | cli 0.4.32 (23/09/2026) |
| **CrewAI** | Équipes d'agents à rôles (« crews ») et flows | 1.15.23 (28/09/2026) |
| **OpenAI Agents SDK** | SDK léger multi-agents (handoffs, guardrails, tracing) | v0.23.1 (02/10/2026) |
| **Claude Agent SDK** | Le harnais de Claude Code en bibliothèque (Python/TS) | v0.2.163 (30/09/2026) |
| **PydanticAI** | Agents typés de bout en bout, « every model » | v2.54.0 (03/10/2026) |
| **Google ADK** | Toolkit code-first pour construire, évaluer et déployer des agents | v2.11.0 (02/10/2026) |
| **Mastra** | Framework TypeScript pour agents et workflows | @mastra/core 1.74.0 (05/10/2026) |
| **AutoGen** → **Microsoft Agent Framework** | ⚠️ AutoGen est **en mode maintenance** ; son successeur est Microsoft Agent Framework (Python/.NET) | AutoGen v0.7.5 (30/09/2025) ; Agent Framework python-1.20.0 (02/10/2026) |

Sources : `https://github.com/<repo>/releases` pour chacun, README d'AutoGen
(« AutoGen is now in maintenance mode ») [primaire].

---

## 6. Économie et raisons d'aller en local

### 6.1 Les raisons

| Raison | Fait sourcé | Source |
|---|---|---|
| **Confidentialité / RGPD** | En local, le code et les prompts ne quittent pas la machine, donc pas de transfert vers un sous-traitant. Même chez Anthropic, l'inférence « US-only » coûte ×1,1 : la localisation des données est une option facturée | [pricing Anthropic, data residency](https://platform.claude.com/docs/en/about-claude/pricing) |
| **AI Act, calendrier** | Interdictions applicables depuis le **02/02/2025**. **Obligations des modèles GPAI depuis le 02/08/2025**. **Pouvoirs d'enforcement de l'AI Office et des États depuis le 02/08/2026**. Haut risque reporté par l'« AI Omnibus » au **02/12/2027** (systèmes autonomes) et au **02/08/2028** (intégrés à des produits) | [Commission européenne](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai) [primaire] ; Omnibus = Règlement (UE) 2026/1744, JO du 24/07/2026 [secondaire : [Cooley](https://cdp.cooley.com/digital-ai-omnibus-delays-key-deadlines-introduces-new-rules/)] |
| **AI Act et open source** | Art. 53(2) : les fournisseurs de GPAI publiés sous licence libre (poids publics) sont exemptés des obligations de documentation 53(1)(a)(b), **sauf risque systémique**. Utilisateur final : faire tourner un modèle chez soi ne fait pas de vous un « fournisseur GPAI » (interprétation, à faire valider par un juriste) | [art. 53](https://artificialintelligenceact.eu/article/53/) |
| **Souveraineté / dépendance** | Les licences évoluent : Meta a fermé sa lignée (Muse Spark, avril 2026) avant de rouvrir avec Glimmer. Qwen restreint certains usages commerciaux. Des poids téléchargés sous une licence donnée restent utilisables sous cette licence | §1.1 |
| **Offline / latence réseau** | La démo marche hors ligne, sauf Hugging Face (`PLAN.md`) | repo |

### 6.2 Coût : ordres de grandeur

| Poste | Valeur | Source |
|---|---|---|
| Claude Opus 5.5 | **4 $ / 20 $** par M tokens (entrée / sortie) ; lecture de cache 0,20 $ | [pricing Anthropic](https://platform.claude.com/docs/en/about-claude/pricing) [primaire] |
| Claude Sonnet 5.5 | 2 $ / 10 $ | idem |
| Claude Fable 5.1 | 10 $ / 50 $ | idem |
| GPT-6 Astra | 10 $ / 50 $ | [CloudZero](https://www.cloudzero.com/blog/gpt-6-pricing/) [secondaire ; openai.com/api/pricing a renvoyé 403] |
| DeepSeek via API (`deepseek-flash` / `deepseek-v4-pro`) | entrée 0,15–0,30 $ / sortie 0,60–1,20 $ ; pro : 0,66–1,32 $ / 1,98–3,96 $ (heures creuses = –50 %) | [DeepSeek pricing](https://api-docs.deepseek.com/quick_start/pricing) [primaire] |
| DGX Spark | 4 699 $ | §3 |

**Calcul illustratif (le nôtre, à présenter comme tel).** 4 699 $ correspondent à
~235 M tokens de **sortie** Opus 5.5 (4 699 / 20 $). À ~50 tok/s, générer
235 M tokens en local prend ~4,7 M s, soit **~54 jours de génération continue
24 h/24**. Face à une API open-weights à moins de 1 $/M, l'argument « coût »
du local est faible pour un développeur seul. Il devient défendable pour une
équipe qui mutualise un serveur, ou quand la confidentialité impose le local de
toute façon. Les sessions agentiques consomment surtout des tokens d'**entrée**,
souvent mis en cache côté API. Le ratio exact dépend donc fortement de l'usage.

### 6.3 Limites honnêtes

| Limite | Fait |
|---|---|
| **Qualité** | Écart de 12 à 26 points avec le meilleur modèle fermé sur les benchs agentiques durs (§1.3). Les open-weights « frontier » (300 B à 2,8 T) ne tiennent pas sur un poste de dev |
| **Prefill** | Même sur DGX Spark, le pp de gpt-oss-120b tombe de 2 444 à 1 567 tok/s à 32 k de contexte ([llama.cpp](https://github.com/ggml-org/llama.cpp/blob/master/benches/dgx-spark/dgx-spark.md)). Un contexte agentique de 100 k tokens représente donc plusieurs dizaines de secondes de prefill sans cache. Sur CPU, c'est bien pire |
| **Vitesse de génération qui baisse avec le contexte** | gpt-oss-120b : 58,7 → 42,8 tok/s de 0 à 32 k (même source) |
| **Maintenance** | Rythme de llama.cpp : plusieurs builds par jour (b11408 → b11418 le 05/10/2026). Templates de chat et parsers de tool calls à suivre. Exemple : correctif de config Mistral Medium 3.5 qui dégradait les GGUF ([card](https://huggingface.co/mistralai/Mistral-Medium-3.5-128B)) |
| **Matériel cher en 2026** | RTX 5090 à ~3,7× le MSRP, hausse continue de la DRAM (§3) |

---

## 7. Sécurité de l'agentique

| Sujet | Fait | Source |
|---|---|---|
| **Prompt injection** | Le modèle ne distingue pas de façon fiable les données à traiter des instructions. Aucune défense « au niveau du modèle » n'est garantie | [Simon Willison, tag lethal-trifecta](https://simonwillison.net/tags/lethal-trifecta/) |
| **Lethal trifecta** (Willison, 16/06/2025) | Accès à des données privées + exposition à du contenu non fiable + capacité de communiquer vers l'extérieur = exfiltration possible. Règle pratique : **retirer au moins un des trois** | [simonwillison.net/2025/Jun/16/the-lethal-trifecta](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/) |
| **GitHub MCP « toxic agent flow »** (26/05/2025) | Une issue piégée dans un repo public pousse l'agent à lire un repo privé puis à le publier dans une PR | [Invariant Labs](https://invariantlabs.ai/blog/mcp-github-vulnerability) |
| **s1ngularity / Nx** (26/08/2025) | Des paquets npm `nx` malveillants **lancent les CLI d'agents installés** (claude, gemini, q) avec `--dangerously-skip-permissions` / `--yolo` / `--trust-all-tools` pour inventorier et exfiltrer des secrets. **2 349 identifiants** volés. Premier cas connu d'agents de code utilisés comme outil d'attaque | [Nx post-mortem](https://nx.dev/blog/s1ngularity-postmortem), [The Hacker News](https://thehackernews.com/2025/08/malicious-nx-packages-in-s1ngularity.html), [Snyk](https://snyk.io/blog/weaponizing-ai-coding-agents-for-malware-in-the-nx-malicious-package/) |
| **postmark-mcp** (v1.0.16, 17/09/2025) | **Premier serveur MCP malveillant** repéré : une ligne ajoute un BCC à chaque email envoyé. 15 versions saines avant la version piégée ; 1 643 téléchargements | [The Hacker News](https://thehackernews.com/2025/09/first-malicious-mcp-server-found.html), [Snyk](https://snyk.io/blog/malicious-mcp-server-on-npm-postmark-mcp-harvests-emails/) |
| **LiteLLM sur PyPI** (24/03/2026) | Versions 1.82.7 et 1.82.8 backdoorées pendant ~3 h, via un CI compromis par l'intermédiaire de Trivy. Un `.pth` vole les clés SSH et cloud. LiteLLM sert de passerelle à de nombreux frameworks d'agents | [Trend Micro](https://www.trendmicro.com/en_us/research/26/c/your-ai-stack-just-handed-over-your-root-keys-inside-the-litellm-pypi-breach.html), [Snyk](https://snyk.io/blog/poisoned-security-scanner-backdooring-litellm/) |
| **MCP STDIO « by design »** (OX Security, 15/04/2026) | Dans les SDK officiels, la config STDIO exécute une commande système. Résultat : 10+ CVE dans des produits tiers (LiteLLM, LangFlow, Flowise, Windsurf…). Anthropic qualifie le comportement d'« expected » | [OX Security](https://www.ox.security/blog/the-mother-of-all-ai-supply-chains-critical-systemic-vulnerability-at-the-core-of-the-mcp/), [SecurityWeek](https://www.securityweek.com/by-design-flaw-in-mcp-could-enable-widespread-ai-supply-chain-attacks/) |
| **CVE-2026-39861 Claude Code** (21/04/2026) | Échappement du sandbox par symlink : écriture hors du workspace. Exploitable **via prompt injection**. Corrigé en v2.1.64 | [GHSA-vp62-r36r-9xqp](https://github.com/advisories/GHSA-vp62-r36r-9xqp), [NVD](https://nvd.nist.gov/vuln/detail/CVE-2026-39861) |
| CVE-2025-6514 (`mcp-remote`, CVSS 9,6) | RCE dans un composant MCP très utilisé | [AuthZed timeline](https://authzed.com/blog/timeline-mcp-breaches) [secondaire] |

**Bonnes pratiques à montrer**

1. **Sandbox** : conteneur ou VM jetable, workspace monté seul, pas de `$HOME`.
   Le repo le fait déjà avec Docker.
2. **Permissions** : approbation des commandes, pas de mode `--yolo` /
   `--dangerously-skip-permissions` hors sandbox (cf. s1ngularity).
3. **Casser la trifecta** : pas d'accès réseau sortant quand l'agent lit du
   contenu non fiable, ou pas de secrets dans son environnement.
4. **Chaîne d'approvisionnement** : épingler les versions des serveurs MCP et des
   paquets, n'installer que des serveurs de confiance (cf. postmark-mcp, LiteLLM).
5. **Mettre à jour les harnais** (cf. CVE-2026-39861 de Claude Code ;
   CVE-2026-22708 de Cursor, citée par une source secondaire non vérifiée).
6. Le spec MCP l'écrit lui-même : « Tools represent arbitrary code execution » et
   les descriptions d'outils sont « untrusted »
   ([spec](https://modelcontextprotocol.io/specification/latest)).

**Point clé pour ce public.** **Le local ne protège pas de la prompt injection.**
Il supprime l'exfiltration *vers le fournisseur du modèle*, pas celle que peut
déclencher un agent qui a accès au réseau.

---

## Messages clés pour la scène

1. **« Le modèle de cette démo affronte le haut de gamme d'il y a six mois, chez
   moi. »** Qwen3.8-Flash-Next : 6 B de paramètres actifs, environ 180 B au total,
   ~35 tok/s sur un serveur LAN. Qwen revendique 62,5 sur SWE-bench Pro contre 53,4
   pour Claude Opus 4.6. Le dire comme une *revendication de l'éditeur*, mesurée
   dans le harnais Claude Code.
2. **« Sur les tâches courantes, l'écart a disparu ; sur les tâches longues, il
   reste réel. »** SWE-bench Verified : 97,0 contre 96,4. Terminal-Bench 4.0 :
   65 contre 39. AA Index : 58 contre 46. Et ces open-weights-là pèsent de
   300 B à 2,8 T.
3. **« Le secret du local, c'est le MoE. »** Tous les modèles récents n'activent
   que 1,5 à 6 B de paramètres par token. La vitesse dépend de la bande passante
   mémoire divisée par les paramètres actifs, pas de la taille totale.
4. **« Le harnais et le modèle sont deux choses séparées : une base URL. »**
   llama-server parle les formats OpenAI Chat, Responses *et* Anthropic Messages.
   OpenCode, Codex, Cline, Kilo, Zed, Goose, Qwen Code, Mistral Vibe le
   documentent. Claude Code et Cursor : bricolage non supporté.
5. **« Les standards sont ouverts et neutres. »** MCP et AGENTS.md sont à la
   Linux Foundation (AAIF). `SKILL.md` est lu par 40+ outils, dont celui de la
   démo. Ce que vous écrivez aujourd'hui reste portable.
6. **« Open-weights ne veut pas dire open source : lisez la licence. »** MIT ou
   Apache chez DeepSeek, Gemma 4, Granite, Qwen3.8-27B. Licence Qwen Community
   pour le modèle de la démo : un usage interne est libre, un service commercial
   d'assistant de code ne l'est pas.
7. **« Le local, c'est d'abord la confidentialité, pas l'économie. »** Face à des
   API open-weights à moins de 1 $/M, le prix d'une machine à 128 Go (≈ 4,7 k$)
   représente des mois de génération continue. L'argument fort reste le RGPD,
   l'AI Act (enforcement depuis le 02/08/2026) et le hors ligne.
8. **« En local aussi, un agent peut se faire piéger. »** Lethal trifecta, agents
   CLI détournés par un paquet npm (s1ngularity), serveur MCP malveillant
   (postmark-mcp). La parade : sandbox, permissions, et jamais les trois éléments
   de la trifecta réunis.

---

## Ce qui va vieillir vite (à revérifier la veille)

- **Classements** : AA Intelligence Index (version de l'index et scores), Vals
  Terminal-Bench 4.0 / SWE-bench. Les écarts open/fermé changent à chaque
  sortie : MiMo-V2.6 est devenu n°1 open fin septembre.
- **Noms et numéros des modèles fermés** : Opus 5.5, Sonnet 5.5, Fable 5.1,
  GPT-6 Astra / 6.1 Sol, Gemini 4 Argon, et leurs **prix**.
- **Dernières versions des familles open** : Qwen (Qwen4 annoncé comme suite de
  Flash-Next), DeepSeek (V4.1 en cours), GLM (5.5 évoqué [secondaire]), Kimi.
- **Prix du matériel** : RTX 5090, DGX Spark, Mac Studio 512 Go (livré « fin
  octobre »), sortie de Gorgon Halo.
- **Versions des outils** : llama.cpp (`llama`/llama.app, nouvelles commandes),
  Ollama, LM Studio, OpenCode, Claude Code, Codex (plusieurs releases par
  semaine).
- **Local dans Gemini CLI, Cursor CLI et Claude Code** : ces politiques peuvent
  changer.
- **Spec MCP** : la `2026-07-28` vient de rendre MCP stateless, donc les SDK et
  serveurs sont en migration.
- **Statut des projets** : Roo Code (archivé), Aider (ralenti), AutoGen
  (maintenance). D'autres pourraient suivre.

## Limites / non vérifié

- **Benchmarks d'éditeur** (§0, §1.1) : non reproduits. Qwen et GLM évaluent
  dans Claude Code avec des sets « corrigés » maison. Ils ne sont pas comparables
  aux classements publics.
- **SWE-bench Pro** : les scores publics divergent fortement (Scale ~60 % contre
  BenchLM « 89,9 % » pour Opus 5.5). Non utilisé. Le leaderboard Scale n'a pas
  été consulté directement (seulement via un résultat de recherche).
- **Aider polyglot, LMArena** : non consultés. Le benchmark Aider risque d'être
  daté (pas de release Aider depuis août 2025).
- **Strix Halo** : pas de source « officielle » équivalente à la page
  llama.cpp DGX Spark. Les chiffres viennent de blogs (llama-bench) et varient
  de ~30 à ~56 tok/s pour gpt-oss-120b selon le backend.
- **Apple M5 Max / Ultra** : bande passante officielle, **aucun tok/s
  vérifié**. Le chiffre de 253 tok/s pour LFM2.5 sur M5 Max vient d'un blog non
  vérifié.
- **RTX 5090** : la bande passante (~1,8 To/s) n'a pas été revérifiée
  aujourd'hui. Le prix de 7 449 $ est un relevé ponctuel d'un tracker.
- **Prix GPT-6** : source secondaire (openai.com a répondu 403).
- **Dates de sortie Kimi K3** : le dépôt HF date du 13/06, mais la presse
  situe la publication des poids fin juillet [secondaire]. Le dépôt a pu être
  créé privé avant.
- **DeepSeek V4 « avril 2026 »**, **Muse Spark « avril 2026 »**, **arrêt de
  Roo Code**, **membres de l'AAIF**, **ACP/JetBrains**, **NPU Panther Lake 50
  TOPS** : sources secondaires seulement.
- **Ollama « moteur propre »** : formulation de source secondaire. Le README
  ne cite que llama.cpp dans ses remerciements.
- **Continue** : support local affirmé d'après sa documentation connue, sans
  refetch aujourd'hui.
- **Licence de FrogNano** : MIT dans les métadonnées HF, Apache 2.0 dans le
  texte de la card. Incohérence non résolue.
- **AI Act** : l'application à un usage purement interne de modèles open relève
  de l'interprétation juridique, pas d'un fait vérifié.
- **Calcul coût local / API** (§6.2) : calcul illustratif. Il ignore
  l'électricité, l'amortissement et le ratio entrée/sortie réel d'une session
  agentique.
