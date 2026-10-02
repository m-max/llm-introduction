# Plan de la présentation

« **LLM & développement agentique — tout ça tourne chez vous** »

- **Public** : développeurs, pour la plupart utilisateurs basiques d'assistants IA.
- **Objectif** : comprendre le fonctionnement d'un LLM, et avoir envie de tester
  des LLM en local.
- **Durée** : ~1 h, extensible ; questions pendant les lives ou en fin de session.
- **Langue** : narratif en français, termes techniques en anglais.
- **Architecture** : 3 actes, chacun terminé par un live ; la confidentialité est
  le fil rouge qui se déploie à travers les actes.
- **Matériel de scène** : laptop (conteneur Docker du repo, `llama-cli`) +
  machine d'inférence `192.168.0.110` (`llama-server`, modèle
  `Qwen3.8-Flash-Next`, ~35 tok/s mesurés) ; OpenCode branché dessus via
  `opencode.jsonc`.

## Ouverture (~5-10 min)

- **Hook** : « Vous utilisez des LLM tous les jours. Savez-vous vraiment ce qui
  se passe quand vous appuyez sur Entrée ? »
- **Sondage main levée** : qui code avec un assistant IA ? qui sait ce qu'est un
  token ? qui a déjà fait tourner un modèle chez soi ?
- **Promesse** : à la fin, vous comprendrez le fonctionnement de bout en bout,
  vous l'aurez vu tourner, et tout était local.

## Acte 1 — Comprendre un LLM, vraiment (~15-20 min)

Séquence théorie, vocabulaire dev, zéro maths :

1. **Machine à prédire le token suivant** — tokenisation montrée à l'écran sur
   une phrase française.
2. **« 14B paramètres »** : ce que c'est, conceptuellement.
3. **Fenêtre de contexte** : la mémoire de travail du modèle (concept mis en
   banque, payé à l'acte 2).
4. **Sampling & température** : pourquoi l'hallucination est structurelle, pas
   un bug.
5. **Entraînement** : pré-training vs post-training (SFT/RLHF), en survol.
6. **Quantification — le pont vers le local** : comment un modèle de ~500 Go
   tient en 6 Go de GGUF ; triangle taille / vitesse / qualité.

**⚡ Live 1 — Hugging Face & llama.cpp (5-7 min)** : page
`unsloth/LFM2.5-8B-A1B-GGUF` → arbre des fichiers GGUF → tableau des quantifs
et tailles → `hf download` en direct d'un petit modèle (~0,6B) → `llama-cli`
qui répond sur le laptop sans GPU.

*Transition : « Ça discute. Mais un chat, ça ne fait pas du développement. »*

## Acte 2 — Développement agentique : les harnais (~20 min)

1. **Du chat à l'agent : la boucle** — LLM → appel d'outil → résultat →
   re-boucle. *Le* diagramme du talk.
2. **Tool calling** : comment un modèle « appuie sur des boutons » (schémas
   JSON) ; pourquoi certains modèles y sont nuls.
3. **Le contexte, ressource rare** : prompt système, `AGENTS.md`, fichiers
   injectés, budget de contexte.
4. **KV cache** : « pourquoi ça ralentit quand la conversation grandit » — la
   banque d'acte 1 est payée.

**⚡ Live 2 — OpenCode branché sur le local (10-12 min)** :

- Mini-projet `demo/` : Python + tests, 3 tests rouges sur un bug volontaire
  (voir [`demo/README.md`](../demo/README.md)).
- Montrer `opencode.jsonc` : ~10 lignes, « toute la plomberie ».
- Boucle complète en direct : lire → diagnostiquer → éditer → tests verts,
  tool calls visibles, ~35 tok/s.
- **Punchline méta** : « L'agent qui pilote cette démo tourne sur le serveur
  local — y compris la session qui a préparé cette présentation. »

## Acte 3 — Skills, MCP, paysage (~15 min)

1. **Skills : démythification** — un skill = un fichier `SKILL.md`, dix lignes
   de markdown, progressive disclosure.
2. **⚡ Live 3 — `explain-file` (5 min)** : écriture du `SKILL.md` en direct,
   puis invocation sur `demo/pricing.py`.
3. **MCP en 2 min** : le port USB des outils — ce que ça change entre harnais
   et monde extérieur.
4. **Paysage, deux couches** :
   - *Harnais* sur deux axes (terminal ↔ IDE, open source ↔ propriétaire) avec
     colonne « compatible modèle local : oui / non / bricolage » — OpenCode,
     Claude Code, Codex CLI, Gemini CLI, Cursor, Cline/Aider ;
   - *Frameworks & standards* : LangChain/LangGraph, CrewAI, AutoGen,
     PydanticAI ; standards MCP, `AGENTS.md`, format Agent Skills ;
   - message : « rien de tout ça n'est requis pour démarrer — un harnais + un
     modèle local suffisent ».

## Clôture (~5-10 min, Q&A ouverte)

- **Les 3 modèles mentaux à emporter** : machine à prédire / la boucle / le
  contexte est la ressource rare.
- **Retour au hook** : inventaire de ce qui a quitté la salle aujourd'hui —
  *rien*.
- **Rampe** : QR → repo public (conteneur llama.cpp, démarrage en 3 commandes,
  démo + skills incluses).
- Q&A sans limite, prolongeable en démo live à la demande.

## Filets de sécurité

Banque de captures pour **chaque** live (page HF, sorties terminal, session
OpenCode, skill invoquée). Le réseau (Hugging Face + LAN vers la machine
d'inférence) est le seul point de défaillance ; tout le reste fonctionne hors
ligne.

## Take-away

Le repo public lui-même : README « 3 commandes », conteneur Docker, `demo/`
avec son bug volontaire re-verdissable chez soi, skill `explain-file`, et la
présentation.
