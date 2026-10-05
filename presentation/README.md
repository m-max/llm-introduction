# Présentation — notes de maintenance

Guide pour mettre à jour le deck depuis une autre session. **La source de vérité
du deck est `build_deck.js`** : on ne modifie jamais le `.pptx` à la main, on
modifie le script et on régénère.

## Contenu du dossier

| Fichier | Rôle |
|---|---|
| `build_deck.js` | Générateur du deck (pptxgenjs) — **à éditer pour tout changement** |
| `theme.json` | Couleurs du thème, consommé par `apply_theme.js` (doit rester aligné avec le `THEME` de `build_deck.js`) |
| `llm-agentique-local.pptx` | Deck final (29 slides, 5 sections, notes orateur) — régénéré, jamais édité |
| `llm-agentique-local.pdf` | Copie PDF (rendu LibreOffice via `Dockerfile.render`) |
| `PLAN.md` | Plan de la session (3 actes, argumentaire, minutage) — la logique éditoriale du deck |
| `SCENARIOS.md` | Scripts des 3 lives + filets + checklist jour J |
| `Dockerfile.render` | Image LibreOffice headless (avec Carlito/Caladea, substituables métriquement compatibles de Calibri/Cambria) pour le rendu PDF |
| `package.json` | Dépendance npm : `pptxgenjs` (installer via `npm install` dans ce dossier) |

## Régénérer le deck (après modification de `build_deck.js`)

```bash
cd presentation
npm install                                    # une seule fois (pptxgenjs)
node build_deck.js                             # écrit llm-agentique-local.pptx

# Appliquer le thème (sans ça, les couleurs de thème restent celles d'Office) :
SKILL=$(ls -d ~/.claude/skills/synced/*/pptx | head -1)   # chemin du skill « pptx », peut changer
NODE_PATH="$PWD/node_modules" node "$SKILL/scripts/apply_theme.js" \
    llm-agentique-local.pptx theme.json

# Validation OOXML (attrape les erreurs que PowerPoint refuse) :
uv run --with defusedxml --with lxml python "$SKILL/scripts/office/validate.py" \
    llm-agentique-local.pptx
```

## Rendre les slides en images (revue visuelle)

```bash
docker build -f Dockerfile.render -t lo-render .          # une seule fois
docker run --rm -v "$PWD":/data -w /data --entrypoint soffice lo-render \
    --headless --convert-to pdf --outdir /data llm-agentique-local.pptx
pdftoppm -jpeg -r 110 llm-agentique-local.pdf slide        # slide-01.jpg … slide-29.jpg
```

Toujours regarder le rendu après un changement : les défauts typiques sont le
débordement de texte, les chevauchements et — piège historique de ce deck —
**le texte sombre sur fond sombre** (ne jamais utiliser `MUTED` sur un fond
sombre : utiliser `ON_DARK_MUT` ou `A9B7C6` dans un bloc de code).

## Système de design

- Thème **« Local Terminal »** : `DARK 1B2437` (encre/fond sombre),
  `GREEN 02C39A` (accent principal — le vert des tests verts), `TEAL 028090`,
  `AMBER F5A623` (badges LIVE), blanc dominant. Motifs récurrents : badge
  LIVE, pastilles de progression des 3 actes (`actDots`), blocs de code
  sombres arrondis, sandwich sombre (titre/diviseurs/lives/clôture) / clair
  (contenu).
- Polices : **Cambria** (titres), **Calibri** (corps), **Courier New** (code) —
  toutes métriquement stables dans le rendu de QA.
- 4 masters : `MASTER_TITRE`, `MASTER_DIVISEUR`, `MASTER_CONTENU`, `MASTER_LIVE`.
- 5 sections (`addSection` + `sectionTitle` sur chaque slide) : Ouverture,
  Acte 1 — Exécuter, Acte 2 — Orchestrer, Acte 3 — Explorer, Clôture.
- Helpers dans `build_deck.js` : `chip`, `arrow`, `card`, `codeBlock`, `step`,
  `liveBadge`, `actDots`, `textCard`, `stat`, `strip`, `src`, `chartOpts`, `divider` — les utiliser pour la cohérence plutôt que des
  `addText` bruts positionnés à la main.

## Pièges pptxgenjs (version installée : 4.0.1)

- **Syntaxe des placeholders des masters (piège historique)** : en 4.0.1, c'est
  `objects: [{ placeholder: { options: { name, type, x, y, w, h, ...style } } }]`.
  La forme `placeholders: [{ layoutPlaceholder: ... }]` (doc récente) est
  **silencieusement ignorée** → les titres atterrissent en (0,0) sans style,
  invisibles sur fond sombre. Vérifier le rendu après tout toucher aux masters.
- Couleurs : hex 6 chiffres **sans `#`**, jamais d'alpha dans le hex.
- Une série `bar` avec `chartColors: [c1, c2, …]` colore les barres
  une à une (utilisé slide 7 pour mettre le Q4_K_M en vert).
- `addText` hors placeholder : mettre `isTextBox: true` ; `margin: 0` quand le
  texte doit s'aligner avec une forme.

## Faits mesurés cités dans le deck

Détail et commandes : [`docs/research/mesures-2026-10-05.md`](../docs/research/mesures-2026-10-05.md).
Chaque slide de contenu porte sa source en pied de page. À remesurer si le
matériel ou les modèles changent :

| Fait (slide) | Valeur | Source / date |
|---|---|---|
| Prefill / decode laptop (8, 9, 12, 19) | 98 t/s / 26–35 t/s ; dense 4B 14,8 t/s vs MoE 34,6 t/s ; ~38 Go/s effectifs | `llama-bench -p 512 -n 128 -t 6,14`, 05/10/2026 |
| Prefill / decode serveur (8, 11) | 912 t/s / 36 t/s | `/metrics` de `192.168.0.110`, 05/10/2026 |
| KV cache (10, 13 ; piège 17,9 GiB en notes de la 10) | Qwen3-0.6B 4 480 MiB à 40 960 ; LFM2.5 1,5 GiB et Spark 4,6 GiB à 128k | ligne `llama_kv_cache: size` (`llama-cli -v`), 05/10/2026 |
| Modèle serveur (11, 12) | 177 B (6 B actifs), 111 Go, MTP 61 % acceptés | `/v1/models`, `/metrics`, model card |
| Prompt de base OpenCode (16, 19) | ~10 000 tokens, skills ~3 800 | base locale OpenCode v2.0.21 |
| Boucle (18) ; contexte en notes de la 19 | ~8 tool calls par réponse ; 9,6 k → 191 k | base locale OpenCode |
| Cache de prompt (19, 21) | 94,6 % ; 4 212 240 / 239 162 tokens ; TTFT 20 s → 1 s | `/metrics` (compteurs cumulés : relever la veille) |
| Paysage (25, 26) | benchmarks, bande passante du matériel | `docs/research/acte3-paysage.md`, à revérifier la veille |

## Avant publication / jour J

- Remplacer `github.com/<vous>/llama` (slides 28 et 29) par l'URL réelle, puis
  régénérer ; générer le QR code vers ce repo et l'insérer slide 28 (remplacer
  le cadre en pointillés).
- S'assurer que `demo/` est à l'état rouge : `cd demo && python3 -m unittest`
  → 3 échecs (`git checkout -- demo/` sinon).
- Rejouer les 3 lives selon `SCENARIOS.md`.
- Le deck vit dans le repo public : c'est lui qui sert de take-away (slide 28).
