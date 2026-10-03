# Présentation — notes de maintenance

Guide pour mettre à jour le deck depuis une autre session. **La source de vérité
du deck est `build_deck.js`** : on ne modifie jamais le `.pptx` à la main, on
modifie le script et on régénère.

## Contenu du dossier

| Fichier | Rôle |
|---|---|
| `build_deck.js` | Générateur du deck (pptxgenjs) — **à éditer pour tout changement** |
| `theme.json` | Couleurs du thème, consommé par `apply_theme.js` (doit rester aligné avec le `THEME` de `build_deck.js`) |
| `llm-agentique-local.pptx` | Deck final (30 slides, 5 sections, notes orateur) — régénéré, jamais édité |
| `llm-agentique-local.pdf` | Copie PDF (rendu LibreOffice ; appartient à `root`, créé via Docker — `sudo chown` pour le remplacer depuis l'hôte) |
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
pdftoppm -jpeg -r 110 llm-agentique-local.pdf slide        # slide-01.jpg … slide-30.jpg
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
  Acte 1 — Comprendre, Acte 2 — Agir, Acte 3 — Étendre, Clôture.
- Helpers dans `build_deck.js` : `chip`, `arrow`, `card`, `codeBlock`, `step`,
  `liveBadge`, `actDots` — les utiliser pour la cohérence plutôt que des
  `addText` bruts positionnés à la main.

## Pièges pptxgenjs (version installée : 4.0.1)

- **Syntaxe des placeholders des masters (piège historique)** : en 4.0.1, c'est
  `objects: [{ placeholder: { options: { name, type, x, y, w, h, ...style } } }]`.
  La forme `placeholders: [{ layoutPlaceholder: ... }]` (doc récente) est
  **silencieusement ignorée** → les titres atterrissent en (0,0) sans style,
  invisibles sur fond sombre. Vérifier le rendu après tout toucher aux masters.
- Couleurs : hex 6 chiffres **sans `#`**, jamais d'alpha dans le hex.
- Une série `bar` avec `chartColors: [c1, c2, …]` colore les barres
  une à une (utilisé slide 12 pour mettre le Q5 en vert).
- `addText` hors placeholder : mettre `isTextBox: true` ; `margin: 0` quand le
  texte doit s'aligner avec une forme.

## Faits mesurés cités dans le deck

À remesurer si le matériel ou les modèles changent :

| Fait (slide) | Valeur | Source / date |
|---|---|---|
| Vitesse de génération (18, 20) | ≈ 35 tok/s | `POST /v1/chat/completions` sur `192.168.0.110` (`Qwen3.8-Flash-Next`), 03/10/2026 |
| Taille LFM2.5-8B-A1B Q5_K_M (12, 13) | 6,0 Go | `du -h models/…` sur le serveur |
| Fenêtre de contexte (8, 17, 18) | 262 144 tokens | `~/.config/opencode/opencode.jsonc` |
| Modèle du live 1 (13) | Qwen3-0.6B-Q4_K_M, 397 Mo | HF `unsloth/Qwen3-0.6B-GGUF`, vérifié 03/10/2026 |
| Démo live 2 (20) | 9 tests, 3 échecs | `demo/` — dépend de l'état rouge du repo (voir `demo/README.md`) |
| Paysage des harnais (25) | daté « octobre 2026 » | statuts « compatible local » à revérifier si la session est reportée |

## Avant publication / jour J

- Remplacer `github.com/<vous>/llama` (slides 29 et 30) par l'URL réelle, puis
  régénérer ; générer le QR code vers ce repo et l'insérer slide 29 (remplacer
  le cadre en pointillés).
- S'assurer que `demo/` est à l'état rouge : `cd demo && python3 -m unittest`
  → 3 échecs (`git checkout -- demo/` sinon).
- Rejouer les 3 lives selon `SCENARIOS.md`.
- Le deck vit dans le repo public : c'est lui qui sert de take-away (slide 29).
