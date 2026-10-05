# Plan de la présentation

« **LLM & développement agentique — tout ça tourne chez vous** »
*Sous-titre proposé : « … à condition de savoir où passe la mémoire ».*

- **Public** : développeurs, pour la plupart utilisateurs basiques d'assistants IA.
- **Objectif** : comprendre ce qui se passe **à l'exécution** pour savoir
  choisir, dimensionner, servir et brancher un modèle local, puis l'utiliser
  dans un harnais agentique, avec un regard lucide sur le paysage. Pas de
  cours sur l'entraînement ni sur les mathématiques des transformeurs : on
  ne garde que ce qui explique **la RAM, la vitesse et le comportement**
  d'un modèle en local.
- **Durée** : ~60 min hors Q&A, pour un deck de 29 slides. Les points marqués
  « *(hors deck)* » ont été retirés des slides le 05/10/2026 ; ils restent
  à l'oral ou dans les notes orateur. Questions pendant les lives ou en fin
  de session.
- **Langue** : narratif en français, termes techniques en anglais.
- **Architecture** : 3 actes.
  1. **Exécuter** : la mécanique d'un modèle local.
  2. **Orchestrer** : le harnais et sa conversation avec le LLM.
  3. **Explorer** : le paysage à l'automne 2026.
- **Deux fils rouges** :
  1. **« La mémoire est la monnaie »** :
     - acte 1 : RAM et bande passante ;
     - acte 2 : KV cache et cache de prompt ;
     - acte 3 : le matériel se choisit à sa bande passante.
  2. **La confidentialité** : ce qui ne sort pas de la salle. Elle est
     nuancée à l'acte 2 : le local protège les données, pas de la prompt
     injection.
- **Matériel de scène** :
  - laptop : i7-1370P, 6 P-cores + 8 E-cores, 30 Go, CPU only, avec le
    conteneur du repo ;
  - serveur LAN `192.168.0.110:8080` : `llama-server` qui sert
    `Qwen3.8-Flash-Next` (≈177 B paramètres dont 6 B actifs, 111 Go en
    UD-Q4_K_XL, contexte 262 144, ~36 tok/s en decode, ~910 tok/s en prefill) ;
  - harnais : OpenCode **v2.0.21** branché sur ce serveur.
- **Sources** : chaque chiffre du deck renvoie à l'une de ces notes.

  | Note | Contenu |
  |---|---|
  | [`mesures-2026-10-05.md`](../docs/research/mesures-2026-10-05.md) | Mesures faites sur le laptop et le serveur. **Priorité aux chiffres mesurés.** |
  | [`acte1-mecanique-inference.md`](../docs/research/acte1-mecanique-inference.md) | Acte 1 : mmap, KV cache, quantification, prefill/decode, MoE. |
  | [`acte2-harnais.md`](../docs/research/acte2-harnais.md) | Acte 2 : code source d'OpenCode v2, template Qwen3.8, sessions mesurées. |
  | [`acte3-paysage.md`](../docs/research/acte3-paysage.md) | Acte 3 : modèles, moteurs, matériel, harnais, standards. |
  | [`execution-llm-local.md`](../docs/research/execution-llm-local.md) | Outillage llama.cpp et HF. **Contient des erreurs**, corrigées au §0 de la note acte 1. |

---

## Ce qui change par rapport à la version précédente, et pourquoi

| Version précédente | Problème constaté | Décision |
|---|---|---|
| Acte 1 « zéro théorie », réduit à de l'outillage (`hf download`, flags) | Sans mécanique, le public ne sait ni prédire si un modèle tient, ni expliquer pourquoi c'est lent. L'outillage seul est un tutoriel, pas un talk. | L'acte 1 explique la mécanique d'exécution : chargement, quantification, prefill/decode, KV cache, MoE. L'outillage est **montré** dans le live, pas listé en slides. |
| « Le prompt processing est 1 à 2 ordres de grandeur plus rapide que la génération » | Faux sur CPU. Mesuré sur le laptop, le prefill n'est que **×2 à ×4** plus rapide. Le ×25 du serveur ne vaut que pour sa configuration. | C'est l'insight central du lien acte 1 → acte 2 : **sur CPU, l'agentique meurt au prefill**. |
| « Le KV cache se paie en RAM », sans chiffre | La formule existe et se vérifie à l'octet près dans les logs. | Montrer la ligne `llama_kv_cache: size = …` en live : sur Qwen3-0.6B, le KV cache pèse **12× les poids**. |
| MoE « total vs actifs » classé non vérifiable | Mesuré : un MoE 8B décode **2,3× plus vite** qu'un dense 4B sur le même laptop. | C'est une slide-preuve, plus une affirmation. |
| Config OpenCode présentée en syntaxe v1 (`provider`/`npm`/`options`), « 10 lignes de plomberie » | OpenCode installé = v2 (`providers`/`package`/`settings`). La v2 ne lit plus `CLAUDE.md`. Les outils changent de nom (`bash` → `shell`, `task` → `subagent`). La vraie config fait ~30 lignes. | Montrer la vraie config v2. Punchline : « une base URL », pas « 10 lignes ». |
| Punchline : « la session qui a préparé cette présentation tourne sur le serveur local » | Invérifiable, et faux pour cette révision, préparée avec un modèle cloud. | La remplacer par un fait mesuré : **4,4 M tokens de prompt servis par ce serveur pendant la préparation, dont 94,6 % depuis le cache**. |
| Skills et MCP rangés à l'acte 3 « Étendre » | Ce sont des mécanismes du harnais, pas du paysage. | Ils passent à l'acte 2. L'acte 3 devient une vraie ouverture. |
| Promesse : « tout ça tourne chez vous » | Le chat tient sur un laptop. L'agent de la démo veut ~128 Go de mémoire rapide. | Dire honnêtement **ce qui tourne où** (slide 1.9 + clôture). |
| Paysage : 6 harnais, « octobre 2026 » non vérifié | Roo Code archivé, Aider sans release depuis août 2025, Claude Code non supporté hors modèles Claude. | Table re-sourcée (acte 3). |

---

## Coupes du 05/10/2026 : deck ramené de 39 à 29 slides

| Slide retirée | Où va son contenu |
|---|---|
| Hook « Vous appuyez sur Entrée » | À l'oral sur la slide titre (texte et sondage dans ses notes). |
| Ce que le modèle lit vraiment (chat template) | Le mécanisme est montré sur la slide tool calling (acte 2) ; « hi = 9 tokens » à l'oral pendant le live 1. |
| Trois leviers sur le KV cache | Notes de la slide KV cache : `-c`, `q8_0`, piège des 17,9 GiB, `--fit`. |
| Le contexte grossit, puis se compacte | Notes de la slide cache de prompt : 9,6 k → 191 k, troncature, compaction, `limit.context`. |
| Permissions et sécurité | Hors deck. À reprendre en Q&A ; le fil rouge confidentialité n'a plus sa nuance « injection ». |
| Moteurs et licences | Hors deck. |
| Harnais (base URL) | Hors deck. La slide « Brancher OpenCode » porte le message « une base URL ». |
| Standards ouverts | Hors deck. |
| Pourquoi le local, honnêtement | Hors deck. |
| Trois réflexes à emporter | Hors deck. La clôture passe directement à « RIEN. ». |

## Ouverture (~3 min)

- **Hook** *(à l'oral, sur la slide titre)* : « Vous utilisez des LLM tous les jours. À chaque appui sur
  Entrée, une partie de votre travail part sur le réseau d'un autre.
  Aujourd'hui, on fait la même chose sans que rien ne sorte de la salle — et
  on va regarder ce qui se passe dans la machine pendant ce temps. »
- **Sondage main levée** :
  - qui code avec un assistant IA ?
  - qui a déjà fait tourner un modèle chez soi ?
  - qui saurait dire si un modèle de 8 milliards de paramètres tient sur son
    laptop ? *(On y répond dans 20 minutes.)*
- **Promesse** : à la fin, vous saurez estimer la RAM et la vitesse d'un
  modèle avant de le télécharger. Vous saurez ce que fait un agent à chaque
  tour, et vous l'aurez vu tourner en local.

## Acte 1 — Exécuter : la mécanique d'un modèle local (~22 min, dont live 7)

**Question de l'acte** : « Qu'est-ce qui se passe entre l'appui sur Entrée et
le premier mot ? » Chaque étape est reliée à **un réglage** et à **une
mesure**.

1. **La carte de l'acte, en un schéma** :
   ```
   fichier .gguf → chargement (mmap) → chat template + tokenisation
     → prefill (remplit le KV cache) → decode (boucle : poids → logits → sampling)
     → détokenisation
   ```
   Le schéma revient en fil d'Ariane sur chaque slide de l'acte.
2. **Le fichier GGUF, un modèle auto-descriptif** :
   - un seul fichier qui contient les poids et des métadonnées : architecture,
     contexte d'entraînement, **chat template Jinja** ;
   - lire un nom de fichier, par exemple `LFM2.5-8B-A1B-UD-Q5_K_M` :
     famille, 8B au total dont 1B actifs, quant Unsloth Dynamic, Q5 mix M.
3. **Chargement : le modèle est mappé, pas copié** :
   - `mmap` : les poids vivent dans le **page cache de l'OS**. Le log
     affiche `CPU model buffer size = 0.00 MiB`, et `free` les range en
     « buff/cache » ;
   - le premier lancement est lent (lecture disque), le second instantané ;
   - si le fichier dépasse la RAM, il est **relu depuis le disque à chaque
     token** : plusieurs minutes par token ;
   - pour les plus curieux : `--no-mmap`/`--mlock` sont remplacés par
     `-lm/--load-mode` dans la version épinglée.
4. **Quantification : moins de bits par poids** :
   - principe : les poids sont stockés **par blocs**, avec un facteur
     d'échelle par bloc ;
   - règle à emporter : **Go ≈ milliards de paramètres × bits par poids ÷ 8**.
     En Q4_K_M, c'est ~0,6 Go par milliard ;
   - slide tueuse, table officielle Llama 3 8B (`tools/perplexity`) :
     15,0 GiB en F16 → **4,6 GiB en Q4_K_M** (÷3,3), pour une KLD de 0,028.
     Q4_K_M est le « coude » de la courbe : en dessous de 3 bits, la qualité
     s'effondre. Les « 32,1 Go » de la doc quantize sont l'original en F32 ;
   - **un gros modèle quantifié bat un petit modèle en pleine précision** :
     13B Q4_K_M (PPL 5,30, 7,3 Go) contre 7B F16 (PPL 5,91, 13 Go), PR
     #1684. Le papier de Dettmers conclut que 4 bits est optimal ;
   - ✂ suffixes : `_S`/`_M`/`_L` = tenseurs sensibles en plus haute
     précision ; `UD-`/imatrix = quant « calibré » (revendication éditeur) ;
     tendance aux modèles livrés déjà en MXFP4/FP8 ou QAT.
5. *(hors deck — à l'oral pendant le live 1)* **Chat template et tokenisation : ce que le modèle lit vraiment** :
   - montrer le prompt rendu réel (mesuré) : « hi » devient 17 tokens de
     balises système et utilisateur ;
   - message : un mauvais template, c'est un modèle qui « ne sait pas
     appeler d'outils ». Ce point est repris à l'acte 2.
6. **Prefill vs decode, la slide pivot** :
   - **prefill** : tout le prompt traité d'un coup, en parallèle. Limité par
     le **calcul** ;
   - **decode** : un token à la fois, en **relisant tous les poids actifs** à
     chaque token. Limité par la **bande passante mémoire** ;
   - règle : **tok/s en decode ≲ bande passante ÷ octets des poids actifs** ;
   - preuve mesurée : sur le laptop, deux modèles différents donnent la même
     bande passante effective, **~38 Go/s** (14,8 t/s × 2,4 Go et 34,6 t/s ×
     ~1,1 Go actifs) ;
   - ordres de grandeur :

     | Machine | prefill | decode | rapport |
     |---|---:|---:|---:|
     | laptop CPU | 98 t/s | 26–35 t/s | ×2 à ×4 |
     | serveur LAN | 912 t/s | 36 t/s | ×25 |

   - TTFT (time to first token) = prefill ; vitesse de lecture = decode.
7. **KV cache, la mémoire de la conversation** :
   - définition : pour chaque token déjà lu, on garde les clés et valeurs
     d'attention, pour ne pas tout recalculer à chaque nouveau token ;
   - formule : **2 × couches × têtes KV × dim tête × octets × tokens** ;
   - **réservé au démarrage pour tout `-c`** ;
   - table mesurée (taille du KV cache) :

     | Modèle | Poids | KV cache | Contexte |
     |---|---:|---:|---:|
     | Qwen3-0.6B (live 1) | 373 MiB | **4 480 MiB** | 40 960 |
     | Spark-X2.5-4B | — | 4,6 GiB | 128k |
     | LFM2.5-8B-A1B (hybride : 6 couches attention sur 24) | — | **1,5 GiB** | 128k |
     | dense type Llama-3.1-8B (calcul) | — | **16 GiB** | 128k |

   - leviers *(notes orateur)* :
     - `-c` : ne réserver que ce qu'on utilise ;
     - `-ctk/-ctv q8_0` : ÷1,9 mesuré, perte négligeable. Le V quantifié
       exige flash attention, activée automatiquement ;
     - les architectures hybrides ou à sliding window ;
   - piège mesuré *(notes orateur)* : `llama-server` sans option ouvre 4 slots (`-np auto`)
     et réserve 4 × le contexte du modèle. Sur Qwen3-0.6B, c'est **17,9 GiB
     de KV cache pour 373 Mo de poids**. Toujours fixer `-c` (et `-np 1`) ;
   - autre piège : `--fit` (défaut) peut **réduire le contexte en silence**
     quand la RAM manque.
8. **MoE : paramètres totaux vs paramètres actifs** :
   - la RAM paie les paramètres **totaux**, la vitesse dépend des paramètres
     **actifs** ;
   - preuve mesurée : LFM2.5-8B-A1B (5,9 Go) décode à **34,6 t/s**, contre
     **14,8 t/s** pour Spark-X2.5-4B dense (2,4 Go). Le fichier est 2,4× plus
     gros, et pourtant le décodage est 2,3× plus rapide ;
   - le serveur de la démo : 177 B au total, **6 B actifs** → 111 Go de RAM
     mais 36 t/s ;
   - ✂ décodage spéculatif / MTP : le serveur accepte 61 % des tokens
     proposés, soit ~2,8 tokens produits par passe. C'est une partie du
     « 36 t/s ».
9. **Dimensionner avant de télécharger** : la slide-réflexe de l'acte.
   - **RAM ≈ poids (fichier) + KV cache (contexte) + ~0,1–0,5 Go de calcul** ;
   - **tok/s ≈ bande passante ÷ octets actifs** ;
   - **threads** : `-t` = P-cores. L'auto-détection le fait déjà. Mesuré :
     14 threads au lieu de 6 **ralentissent** le decode de 24 % ;
   - « Ce qui tourne où » :

     | Machine | Usage réaliste |
     |---|---|
     | laptop 16–32 Go, CPU | chat et complétion avec un MoE de 4–8 B (~30 t/s) |
     | 128 Go en mémoire unifiée rapide | un agent de code |

   - ✂ sampling en une ligne : le serveur applique ses defaults
     (temperature 1.0, top_p 0.95, min_p 0.05, lus dans `/props`).

**⚡ Live 1 — De Hugging Face à la ligne de log (7 min)** :

1. Page `unsloth/LFM2.5-8B-A1B-GGUF`, onglet *Files* : les quants et leurs
   tailles, à lire avec la règle « Go ≈ B × bpw ÷ 8 ».
2. `hf download unsloth/Qwen3-0.6B-GGUF --include "Qwen3-0.6B-Q4_K_M.gguf"` :
   397 Mo en quelques secondes.
3. Lancer `llama-cli` sur ce modèle et pointer deux lignes :
   - `llama_kv_cache: size = 4480.00 MiB` ;
   - le breakdown `model 167 + context 4480`.
   « Le modèle pèse 373 Mo, sa mémoire de conversation 4,4 Go. »
4. Relancer avec `-c 4096` : le KV cache tombe à ~450 Mo.
5. Poser une question et lire la ligne de timings
   `[ Prompt: … t/s | Generation: … t/s ]` : prefill et decode, en vrai.
6. ✂ Montrer la table `llama-bench` pré-enregistrée (MoE contre dense).

*Transition : « Ça discute, et on sait pourquoi c'est rapide ou lent. Mais un
chat, ça ne corrige pas un bug. »*

## Acte 2 — Orchestrer : le harnais et sa conversation avec le LLM (~24 min, dont lives 10 + 5)

**Question de l'acte** : « Qu'est-ce qu'un agent envoie au modèle, et
pourquoi ça marche ? »

1. **Le modèle est une fonction sans état** :
   - entrée : du texte ; sortie : du texte. Il ne garde rien d'une requête à
     l'autre ;
   - le **harnais** est le programme autour. Il fait la boucle, exécute les
     outils, tient la mémoire, applique les permissions ;
   - schéma « qui fait quoi » : modèle, serveur (template, parser,
     KV cache), harnais.
2. **Anatomie d'une requête** :
   - empilement réel, dans l'ordre :
     ```
     schémas d'outils (rendus par le template, en tête)
     → prompt système → AGENTS.md → liste des skills → env/date
     → historique → résultats d'outils
     ```
   - mesuré dans les sessions OpenCode : **~9 500–10 000 tokens avant que
     vous ayez tapé quoi que ce soit** ;
   - dans ce repo, la liste des 49 skills pèse à elle seule ~3 800 tokens.
3. **Le tool calling de bout en bout** : six étapes, avec le rendu réel du
   template Qwen3.8.
   1. Le harnais envoie `tools` (des schémas JSON).
   2. Le template les écrit en texte dans le prompt.
   3. Le modèle génère `<tool_call><function=read><parameter=path>…`.
   4. llama-server parse ce texte et renvoie des `tool_calls` structurés. Une
      grammaire « lazy » contraint la sortie dès `<tool_call>`.
   5. Le harnais exécute l'outil.
   6. Le résultat revient dans `<tool_response>`, et on reboucle.

   Message : le tool calling n'est pas magique, c'est du **texte formaté +
   un parser**. Template inconnu = mode « Generic », moins fiable.
4. **La boucle, et quand elle s'arrête** :
   - elle s'arrête quand le modèle répond **sans** appel d'outil ;
   - pas de limite d'étapes par défaut ;
   - mesuré : 855 réponses `tool-calls` pour 101 `stop`, soit **~8 appels
     d'outils par réponse** à l'utilisateur.
5. *(hors deck — notes de la slide cache de prompt)* **Le contexte grossit, puis se compacte** :
   - mesuré : une session passe de 9,6 k à **191 k tokens**. Une seule sortie
     shell en a ajouté ~29 k ;
   - parades du harnais :
     - sorties tronquées (2 000 lignes / 50 Ko) ;
     - lectures par extraits ;
     - **compaction** à fenêtre − max(10 %, 16 k), soit ~236 k ici : le
       modèle résume lui-même l'ancien contexte ;
   - « context rot » (Chroma) : plus le contexte est long, moins le modèle
     est fiable ;
   - piège de config : sans `limit.context`, pas de compaction automatique.
     `limit.context` doit rester ≤ au `-c` du serveur.
6. **Le KV cache, deuxième acte : le cache de prompt** :
   - le début du prompt est identique d'un tour à l'autre, donc llama-server
     le garde (`cache_prompt`) ;
   - mesuré sur le serveur : **94,6 % des tokens de prompt servis par le
     cache**. Sans lui : ~81 min de prefill au lieu de 4 ;
   - TTFT : **~20 s** au premier tour, **~1 s** aux suivants ;
   - OpenCode ordonne ses blocs exprès pour préserver ce préfixe. Ajouter un
     serveur MCP en cours de session invalide tout le cache ;
   - **sur le laptop CPU** : ~10 k tokens à ~100 t/s, c'est **~100 s avant le
     premier token** de chaque nouvelle session. D'où le serveur.
7. **Brancher OpenCode** :
   - la config v2 réelle : `providers` → `package:
     "aisdk:@ai-sdk/openai-compatible"` → `settings.baseURL` ;
   - points d'attention : `capabilities.tools: true`, `limit.context` ;
   - test de vie : `curl /v1/models` ;
   - punchline : **« Le modèle et le harnais ne se connaissent que par une
     base URL. »**

**⚡ Live 2 — Un ticket client corrigé par l'agent, 100 % local (10 min)** :

- On part d'un **symptôme**, pas de tests rouges. La page « ticket de caisse »
  de `demo/web/` affiche « Remise (9 %) — annoncé 10 % » et 1,44 € facturés
  en trop (cf. [`demo/README.md`](../demo/README.md)).
- Prompt : « Corrige le ticket demo/TICKET.md. » L'agent trouve lui-même le
  code et les tests. Plan B : « Les tests de demo/ sont rouges, rends-les
  verts. »
- Commenter les appels qui défilent : lecture du ticket et de `pricing.py`,
  `shell` (tests rouges), `edit`, `shell` (tests verts).
- En parallèle, afficher le log du serveur : `prompt eval time … / eval
  time …`. On voit le cache travailler (prompt_n petit, cache_n grand).
- Rafraîchir la page : elle passe au vert, sans redémarrage, car elle relit
  `pricing.py` à chaque calcul.
- `git diff` : une seule valeur, `0.09` → `0.10`. « Il n'a pas deviné : il a
  mesuré. »
- **Punchline** : `curl /metrics`. 4,4 M tokens de prompt servis par ce
  serveur pendant la préparation du talk, 94,6 % depuis le cache, et rien
  n'a quitté le LAN.
- Remise à zéro entre deux répétitions : `demo/reset.sh`.

8. **Étendre sans coder** :
   - `AGENTS.md` : la v2 ne lit plus `CLAUDE.md` ;
   - **skills** : un `SKILL.md` en divulgation progressive. Nom + description
     au départ, le corps à la demande, les fichiers ensuite ;
   - **MCP** : un protocole client/serveur pour brancher des outils externes.
     Dans OpenCode v2, exposé par défaut via « Code Mode » : un catalogue
     texte + un outil `execute` ;
   - ✂ commandes et plugins ;
   - ironie mesurée : les skills sont « progressives », mais 49 descriptions
     pèsent quand même ~3 800 tokens à chaque session. **Chaque extension a
     un coût en contexte.**

**⚡ Live 3 — Écrire une skill en direct (5 min)** :

- `SKILL.md` de `explain-file`, ~15 lignes ;
- l'invoquer sur `demo/pricing.py` ;
- « Rien à redéployer : c'était un fichier. »

9. *(hors deck)* **Permissions et sécurité** :
   - par défaut, OpenCode autorise tout (`shell`, `edit`, `webfetch`). Son
     `SECURITY.md` dit : « does not sandbox the agent… permission system is a
     UX feature » ;
   - **le local protège vos données, pas de la prompt injection** : un
     fichier, une page web ou un résultat MCP peut contenir des
     instructions ;
   - règle de la « lethal trifecta » (Willison) : ne jamais réunir
     **données privées + contenu non fiable + canal de sortie** ;
   - parade : sandbox (le conteneur du repo !), mode `plan`, permissions en
     `ask`.

*Transition : « Vous avez vu une pile complète : un moteur, un modèle, un
harnais. Chacune de ces trois briques a des dizaines d'alternatives. »*

## Acte 3 — Explorer : le paysage à l'automne 2026 (~5 min)

Organisé selon les **trois briques de l'acte 2** (modèle, moteur + matériel,
harnais) + les standards qui les relient. Toutes les données sont datées et
sourcées dans la note acte 3. **À revérifier la veille.**

1. **Modèles open-weights** :
   - **le MoE est partout** : 1,5 à 6 B de paramètres actifs pour des totaux
     de 8 à 180 B et plus ;
   - attention hybride, contexte de 256 k à 1 M, modèles livrés quantifiés ;
   - écart avec les modèles fermés, selon des sources indépendantes :

     | Benchmark | Fermé | Open | Lecture |
     |---|---:|---:|---|
     | SWE-bench Verified | 97,0 | 96,4 | saturé, écart disparu |
     | Terminal-Bench 4.0 | 65 | 39 | tâches longues, écart réel |
     | Indice Artificial Analysis | 58 | 46 | |

   - les open-weights de tête pèsent 300 B à 2,8 T : ils ne tournent pas sur
     un laptop ;
   - le modèle de la démo revendique 62,5 sur SWE-bench Pro. **C'est une
     revendication de l'éditeur, à dire comme telle.**
2. *(hors deck)* **Open-weights ≠ open source : lisez la licence** :
   - MIT/Apache : DeepSeek, Gemma 4, Granite… ;
   - **Qwen Community License** pour le modèle de la démo : usage interne
     libre, un service commercial d'assistant de code soumis à licence.
3. *(hors deck)* **Moteurs** :
   - llama.cpp est sous le capot de presque tout le « local grand public » :
     Ollama, LM Studio, Jan… ;
   - vLLM/SGLang pour servir plusieurs utilisateurs ; MLX sur Apple ;
   - llama-server parle OpenAI Chat, Responses **et** Anthropic Messages.
4. **Matériel : lisez la bande passante, pas les TOPS** (retour à la règle
   1.9) :

   | Machine | Mémoire | Bande passante |
   |---|---:|---:|
   | laptop du talk | — | ~38 Go/s effectifs mesurés |
   | DGX Spark | 128 Go | 273 Go/s |
   | Strix Halo | 128 Go | ~215 Go/s mesurés |
   | Mac M5 Max | 128 Go | 614 Go/s |
   | M5 Ultra | 512 Go | 1,2 To/s |
   | RTX 5090 | 32 Go | ~1,8 To/s |

   - repère officiel llama.cpp : gpt-oss-120b sur DGX Spark → 59 t/s à vide,
     43 t/s à 32 k de contexte ;
   - contexte : la DRAM est chère en 2026 (TrendForce).
5. *(hors deck)* **Harnais** : la question est « accepte-t-il une base URL ? ».

   | Statut | Harnais |
   |---|---|
   | Oui, documenté | OpenCode, Codex CLI, Cline, Kilo, Zed, Goose, Crush, Qwen Code, Mistral Vibe, Copilot BYOK |
   | Bricolage | Claude Code (« not supported »), Cursor (tunnel), Gemini CLI (proxy) |
   | En déclin | Roo Code (archivé), Aider (plus de release depuis 08/2025) |

6. *(hors deck)* **Standards** :
   - MCP et AGENTS.md sont hébergés par l'Agentic AI Foundation (Linux
     Foundation) ;
   - Agent Skills est lu par 40+ outils ;
   - message : **ce que vous écrivez (AGENTS.md, skills, serveurs MCP) est
     portable d'un harnais à l'autre.**
7. *(hors deck)* **Pourquoi le local, honnêtement** :
   - l'argument fort : **la confidentialité et la souveraineté** (RGPD, AI
     Act, pouvoirs de contrôle actifs depuis le 02/08/2026) et le hors ligne ;
   - l'argument faible pour un dev seul : **le coût**. Une machine 128 Go
     (~4,7 k$) représente des mois d'API open-weights à moins de 1 $/M ;
   - ✂ incidents 2025-2026 : s1ngularity (agents CLI détournés par un paquet
     npm), postmark-mcp (serveur MCP malveillant).

## Clôture (~3 min + Q&A ouverte)

- *(hors deck)* **Les 3 réflexes à emporter** :
  1. **Dimensionner** : RAM = poids + KV cache ; tok/s = bande passante ÷
     poids actifs ; préférer un MoE.
  2. **Mesurer** : `llama-bench`, la ligne `llama_kv_cache`, les timings,
     `/metrics`.
  3. **Brancher et cadrer** : une base URL + un harnais, et une sandbox.
- **Par où commencer lundi** :
  - **laptop** : `llama-server -hf <MoE 4-8B>` + Web UI ;
  - **machine 64–128 Go** : OpenCode branché dessus.
- **Retour au hook** : inventaire de ce qui a quitté la salle aujourd'hui —
  *rien*.
- **Rampe** : QR → repo public. Il contient le conteneur, le démarrage en 3
  commandes, `demo/`, la skill, `opencode.jsonc` et les notes de recherche.

## Filets de sécurité

- Banque de captures pour **chaque** live : page HF, lignes de log
  KV/timings, session OpenCode, `/metrics`, skill invoquée.
- Les points de défaillance sont le réseau vers HF (live 1) et le LAN vers
  le serveur (lives 2-3) ; le reste fonctionne hors ligne.
- Live 1 : modèle pré-téléchargé + `HF_HUB_OFFLINE=1` en repli.

## Faits à remesurer ou revérifier la veille

- tok/s, taux de cache et compteurs `/metrics` du serveur (les compteurs
  sont cumulés depuis le démarrage : noter la valeur du jour) ;
- benchs du laptop (`llama-bench -t 6,14`) ;
- taille du prompt de base OpenCode : 1er tour, `timings.prompt_n` ;
- version d'OpenCode : v2.0.21 installée, alors que la note acte 3 voit
  v1.18.34 comme dernière release stable. **Clarifier le canal (v2 =
  bêta ?)** avant de montrer la config ;
- benchmarks et tableaux de l'acte 3 (section « Ce qui va vieillir vite » de
  la note).

## À faire après ce plan

1. ✅ **Deck** (`build_deck.js`) : régénéré le 05/10/2026 selon ce plan, puis
   réduit à 29 slides (voir « Coupes »), chacune avec sa source en pied de page. Le PDF et la table
   des faits mesurés de `presentation/README.md` sont à jour.
2. ✅ **`SCENARIOS.md`** :
   - live 1 réécrit : `-v | grep` est nécessaire, car sans `-v` la ligne
     `llama_kv_cache` n'apparaît pas ;
   - live 2 : outils renommés (`shell`), log serveur et `/metrics` ;
   - live 3 : déplacé à l'acte 2.
3. ✅ **Repo** (05/10/2026) :
   - `Dockerfile` : `hf_transfer` retiré, car déprécié et remplacé par hf-xet,
     installé avec `huggingface_hub`. `.env.example` propose
     `HF_XET_HIGH_PERFORMANCE`.
   - **Bug corrigé** : `-hf` était cassé (`HTTPS is not supported`).
     `-DLLAMA_CURL` n'existe plus en v0.5.0 : le HTTPS passe par OpenSSL. Le
     build utilise maintenant `libssl-dev` + `-DLLAMA_OPENSSL=ON`, et l'image
     d'exécution `libssl3t64`. `-DGGML_CPU=ON` est retiré (c'est le défaut).
     Vérifié : `llama-cli -hf unsloth/Qwen3-0.6B-GGUF:Q4_K_M` télécharge et
     répond.
   - `opencode.jsonc` ajouté à la racine (syntaxe v2) :
     - provider `llama-local`, distinct du `llama.cpp` global pour ne pas
       l'écraser ;
     - `baseURL` en `{env:LLAMA_BASE_URL}`, vérifié contre le serveur ;
     - `capabilities.input/output` obligatoires, sinon « Model unavailable ».
   - README :
     - la commande 3 du démarrage rapide était cassée (`\` suivi d'un
       commentaire) ;
     - l'auto-détection des threads est corrigée (6 P-cores, mesures à
       l'appui), et `-t 6` ajouté au benchmark ;
     - ajouts : le piège des 4 slots (« toujours fixer `-c` »), le raccourci
       `-hf`, et une section « 5. Brancher un agent (OpenCode) ».
4. ✅ **`execution-llm-local.md`** : un encadré d'errata en tête renvoie aux
   corrections E1–E11 (§0 de la note acte 1) et à la syntaxe v2 (§0 de la
   note acte 2). Le corps de la note est conservé tel quel.
