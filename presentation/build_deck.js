/* Build « LLM & développement agentique — tout ça tourne chez vous »
 * Structured deck: theme + layouts + sections, via pptxgenjs.
 * Build: node build_deck.js  (then apply_theme.js, then validate.py)
 * Contenu : presentation/PLAN.md — chiffres : docs/research/*.md
 */
const pptxgen = require("pptxgenjs");
const QRCode = require("qrcode");

const REPO_URL = "https://github.com/m-max/llm-introduction";
const REPO_SHORT = "github.com/m-max/llm-introduction";

const THEME = {
  name: "Local Terminal",
  headFontFace: "Cambria",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "1B2437", // ink navy — dark bg + text on light
    lt1: "FFFFFF", // white
    dk2: "5A6B85", // muted slate
    lt2: "EAF0F6", // ice tint (cards)
    accent1: "02C39A", // terminal green — tests verts
    accent2: "028090", // deep teal
    accent3: "F5A623", // amber — badges LIVE
    accent4: "1E2761",
    accent5: "94A7BF",
    accent6: "BFEFE3",
    hlink: "028090",
    folHlink: "5A6B85",
  },
};

const DARK = THEME.colors.dk1;
const WHITE = THEME.colors.lt1;
const INK = THEME.colors.dk1;
const MUTED = THEME.colors.dk2;
const TINT = THEME.colors.lt2;
const GREEN = THEME.colors.accent1;
const TEAL = THEME.colors.accent2;
const AMBER = THEME.colors.accent3;
const RED = "C0392B";
const CODEBG = "101828";
const CODEFG = "E6F1EC";
const CODEDIM = "A9B7C6";
const ON_DARK_MUT = "9FB0C9";
const GRID = "D9E2EC";

const W = 13.333, H = 7.5;
const MONO = "Courier New";
const SANS = "Calibri";
const SERIF = "Cambria";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.title = "LLM & développement agentique — tout ça tourne chez vous";
pres.author = "m-max";
pres.company = "llama-local";

/* ---------- masters (layouts) — syntax pptxgenjs 4.0.1 : objects:[{placeholder:{options}}] ---------- */
pres.defineSlideMaster({
  title: "MASTER_TITRE",
  background: { color: DARK },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.9, y: 2.35, w: 11.5, h: 1.9,
      color: WHITE, fontFace: SERIF, fontSize: 44, bold: true, align: "left", valign: "top", margin: 0 } } },
  ],
});

pres.defineSlideMaster({
  title: "MASTER_DIVISEUR",
  background: { color: DARK },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.9, y: 2.75, w: 11.5, h: 1.3,
      color: WHITE, fontFace: SERIF, fontSize: 40, bold: true, align: "left", valign: "top", margin: 0 } } },
  ],
});

pres.defineSlideMaster({
  title: "MASTER_CONTENU",
  background: { color: WHITE },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.38, w: 12.13, h: 0.72,
      color: INK, fontFace: SERIF, fontSize: 30, bold: true, valign: "top", margin: 0 } } },
  ],
  slideNumber: { x: 12.72, y: 7.06, w: 0.35, h: 0.3, color: MUTED, fontFace: SANS, fontSize: 10 },
});

pres.defineSlideMaster({
  title: "MASTER_LIVE",
  background: { color: DARK },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.9, y: 1.7, w: 11.5, h: 1.0,
      color: WHITE, fontFace: SERIF, fontSize: 36, bold: true, align: "left", valign: "top", margin: 0 } } },
  ],
});

/* ---------- helpers ---------- */
function chip(slide, text, x, y, w, opts = {}) {
  const h = opts.h || 0.5;
  slide.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.1,
    fill: { color: opts.fill || TINT },
    line: opts.line ? { color: opts.line, width: opts.lineW || 1 } : { color: opts.fill || TINT, width: 0 },
  });
  slide.addText(text, {
    x, y, w, h, align: "center", valign: "middle", margin: 0,
    fontFace: opts.mono ? MONO : SANS, fontSize: opts.fontSize || 13,
    bold: !!opts.bold, color: opts.color || INK,
  });
}

function arrow(slide, x1, y1, x2, y2, opts = {}) {
  slide.addShape(pres.ShapeType.line, {
    x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
    flipH: x2 < x1, flipV: y2 < y1,
    line: { color: opts.color || TEAL, width: opts.width || 2, endArrowType: "triangle" },
  });
}

function card(slide, x, y, w, h, fill) {
  slide.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.12,
    fill: { color: fill || TINT },
    shadow: { type: "outer", color: "8A97AC", blur: 6, offset: 2, angle: 90, opacity: 0.35 },
  });
}

function codeBlock(slide, x, y, w, h, lines, opts = {}) {
  slide.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.08, fill: { color: CODEBG },
  });
  const paras = lines.map((ln) => {
    if (typeof ln === "string")
      return { text: ln, options: { color: opts.color || CODEFG, breakLine: true } };
    return { text: ln.t, options: { color: ln.c || CODEFG, breakLine: true, bold: !!ln.b } };
  });
  slide.addText(paras, {
    x: x + 0.25, y: y + 0.16, w: w - 0.5, h: h - 0.32,
    fontFace: MONO, fontSize: opts.fontSize || 13, align: "left", valign: "top", margin: 0,
  });
}

/* Card with a bold heading and a list of lines. items: string | {t, b, c} */
function textCard(slide, x, y, w, h, heading, items, opts = {}) {
  const dark = !!opts.dark;
  card(slide, x, y, w, h, opts.fill || (dark ? DARK : TINT));
  const runs = [];
  if (heading) runs.push({ text: heading, options: { bold: true, fontSize: opts.headSize || 16,
    color: opts.headColor || (dark ? GREEN : INK), breakLine: items.length > 0 } });
  items.forEach((it, i) => {
    const o = typeof it === "string" ? { t: it } : it;
    runs.push({ text: o.t, options: {
      color: o.c || (o.b ? (dark ? WHITE : TEAL) : (dark ? ON_DARK_MUT : MUTED)),
      bold: !!o.b, breakLine: i < items.length - 1 } });
  });
  slide.addText(runs, {
    x: x + 0.3, y: y + 0.25, w: w - 0.6, h: h - 0.45, margin: 0,
    fontFace: SANS, fontSize: opts.fontSize || 14, valign: "top", paraSpaceAfter: opts.space || 8,
  });
}

/* Big number + label */
function stat(slide, x, y, w, h, big, label, opts = {}) {
  const dark = opts.dark !== false;
  card(slide, x, y, w, h, dark ? DARK : TINT);
  slide.addText(big, { x, y: y + 0.18, w, h: h * 0.52, margin: 0, align: "center", valign: "middle",
    fontFace: SERIF, fontSize: opts.size || 40, bold: true, color: opts.color || (dark ? GREEN : TEAL) });
  slide.addText(label, { x: x + 0.25, y: y + h * 0.58, w: w - 0.5, h: h * 0.38, margin: 0, align: "center",
    valign: "top", fontFace: SANS, fontSize: opts.labelSize || 13, color: dark ? ON_DARK_MUT : MUTED });
}

/* Dark strip carrying the slide's take-away */
function strip(slide, y, runs, opts = {}) {
  const h = opts.h || 0.9;
  slide.addShape(pres.ShapeType.roundRect, { x: 0.6, y, w: 12.13, h, rectRadius: 0.1, fill: { color: DARK } });
  slide.addText(runs, { x: 0.95, y, w: 11.45, h, margin: 0, valign: "middle", fontFace: SANS, fontSize: opts.fontSize || 16 });
}

/* Source / measurement footnote */
function src(slide, text) {
  slide.addText(text, { x: 0.6, y: 6.98, w: 11.9, h: 0.32, margin: 0, valign: "middle",
    fontFace: SANS, fontSize: 10, italic: true, color: MUTED });
}

/* Common chart options — fresh object at each call (pptxgenjs mutates options) */
function chartOpts(extra) {
  return Object.assign({
    showTitle: false, showLegend: false,
    showValue: true, dataLabelPosition: "outEnd", dataLabelColor: INK, dataLabelFontSize: 12,
    dataLabelFontFace: "+mn-lt",
    catAxisLabelColor: INK, catAxisLabelFontSize: 12, catAxisLabelFontFace: "+mn-lt",
    valAxisLabelColor: MUTED, valAxisLabelFontSize: 10, valAxisLabelFontFace: "+mn-lt",
    valGridLine: { color: GRID, size: 1 }, catGridLine: { style: "none" },
  }, extra);
}

function actDots(slide, current, y) {
  const labels = ["Exécuter", "Orchestrer", "Explorer"];
  labels.forEach((lbl, i) => {
    const x = 0.9 + i * 1.55;
    slide.addShape(pres.ShapeType.ellipse, {
      x, y, w: 0.22, h: 0.22,
      fill: { color: i === current ? GREEN : DARK },
      line: { color: i === current ? GREEN : ON_DARK_MUT, width: 1.25 },
    });
    slide.addText(lbl, {
      x: x - 0.4, y: y + 0.28, w: 1.05, h: 0.3, align: "center", margin: 0,
      fontFace: SANS, fontSize: 10, color: i === current ? GREEN : ON_DARK_MUT,
    });
  });
}

function liveBadge(slide) {
  slide.addShape(pres.ShapeType.roundRect, {
    x: 0.9, y: 0.85, w: 1.35, h: 0.52, rectRadius: 0.26, fill: { color: AMBER },
  });
  slide.addText("LIVE", {
    x: 0.9, y: 0.85, w: 1.35, h: 0.52, align: "center", valign: "middle", margin: 0,
    fontFace: SANS, fontSize: 16, bold: true, color: DARK, charSpacing: 2,
  });
}

function step(slide, n, x, y, w, titleTxt, descTxt, dark) {
  slide.addShape(pres.ShapeType.ellipse, {
    x, y, w: 0.44, h: 0.44, fill: { color: GREEN },
  });
  slide.addText(String(n), {
    x, y, w: 0.44, h: 0.44, align: "center", valign: "middle", margin: 0,
    fontFace: SANS, fontSize: 16, bold: true, color: DARK,
  });
  slide.addText(titleTxt, {
    x: x + 0.6, y: y - 0.04, w: w - 0.6, h: 0.42, margin: 0, valign: "middle",
    fontFace: SANS, fontSize: 17, bold: true, color: dark ? WHITE : INK,
  });
  slide.addText(descTxt, {
    x: x + 0.6, y: y + 0.42, w: w - 0.6, h: 0.75, margin: 0, valign: "top",
    fontFace: SANS, fontSize: 14, color: dark ? ON_DARK_MUT : MUTED,
  });
}

function divider(sectionTitle, kicker, title, act, notes) {
  const s = pres.addSlide({ masterName: "MASTER_DIVISEUR", sectionTitle });
  s.addText(kicker, { x: 0.9, y: 2.15, w: 10, h: 0.4, margin: 0, fontFace: SANS, fontSize: 15, bold: true, color: GREEN, charSpacing: 3 });
  s.addText(title, { placeholder: "title" });
  actDots(s, act, 4.7);
  s.addNotes(notes);
  return s;
}

const S_OUV = "Ouverture";
const S_A1 = "Acte 1 — Exécuter";
const S_A2 = "Acte 2 — Orchestrer";
const S_A3 = "Acte 3 — Explorer";
const S_CLO = "Clôture";
let s;

/* =====================================================================
   OUVERTURE (~4 min)
===================================================================== */
pres.addSection({ title: S_OUV });

// Titre
s = pres.addSlide({ masterName: "MASTER_TITRE", sectionTitle: S_OUV });
s.addText("SESSION LIVE · 60 MIN · ZÉRO CLOUD", {
  x: 0.9, y: 1.55, w: 11, h: 0.4, margin: 0, fontFace: SANS, fontSize: 14, bold: true, color: GREEN, charSpacing: 3,
});
s.addText("LLM & développement agentique", { placeholder: "title" });
s.addText("Tout ça tourne chez vous — à condition de savoir où passe la mémoire.", {
  x: 0.9, y: 4.35, w: 11.5, h: 0.6, margin: 0, fontFace: SANS, fontSize: 20, color: ON_DARK_MUT,
});
s.addText("m-max · octobre 2026 · un laptop CPU, un serveur sur le LAN, aucun cloud", {
  x: 0.9, y: 6.6, w: 11, h: 0.4, margin: 0, fontFace: SANS, fontSize: 13, color: ON_DARK_MUT,
});
s.addNotes("Accueil et hook (3 min). « Vous appuyez sur Entrée : votre code part chez quelqu'un d'autre. Aujourd'hui, la même chose sans que rien ne sorte de la salle — et on regarde ce que fait la machine. » Sondage à main levée : qui code avec un assistant IA ? qui a déjà fait tourner un modèle chez soi ? qui saurait dire si un 8B tient sur son laptop (réponse slide « Dimensionner ») ? Cadre : ~60 min, questions pendant les lives ou à la fin.");

// Programme
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: S_OUV });
s.addText("Le programme : exécuter, orchestrer, explorer", { placeholder: "title" });
const acts = [
  ["1", "Exécuter", "Ce qui se passe entre Entrée et le premier mot : mémoire, quantification, prefill, decode, KV cache.", "LIVE : de Hugging Face à la ligne de log"],
  ["2", "Orchestrer", "Ce qu'un agent envoie au modèle à chaque tour, et pourquoi ça marche : outils, boucle, contexte, cache.", "LIVE : un agent local corrige un bug · une skill en direct"],
  ["3", "Explorer", "Le paysage à l'automne 2026 : où en sont les modèles open-weights, et sur quel matériel les faire tourner.", "Les chiffres du jour, sourcés"],
];
acts.forEach(([n, t, d, live], i) => {
  const x = 0.6 + i * 4.18;
  card(s, x, 1.5, 3.85, 4.55);
  s.addText("ACTE " + n, { x: x + 0.35, y: 1.8, w: 2, h: 0.35, margin: 0, fontFace: SANS, fontSize: 13, bold: true, color: GREEN, charSpacing: 2 });
  s.addText(t, { x: x + 0.35, y: 2.2, w: 3.2, h: 0.6, margin: 0, fontFace: SERIF, fontSize: 26, bold: true, color: INK });
  s.addText(d, { x: x + 0.35, y: 2.95, w: 3.2, h: 1.9, margin: 0, fontFace: SANS, fontSize: 14, color: MUTED, valign: "top" });
  s.addText(live, { x: x + 0.35, y: 4.95, w: 3.2, h: 0.85, margin: 0, fontFace: SANS, fontSize: 14, bold: true, color: TEAL, valign: "top" });
});
strip(s, 6.25, [
  { text: "Deux fils rouges : ", options: { bold: true, color: GREEN } },
  { text: "la mémoire est la monnaie · rien ne sort de la salle.", options: { color: WHITE } },
], { h: 0.6 });
s.addNotes("Programme (1 min). Chaque acte a son live. Annoncer les deux fils rouges : (1) la mémoire — RAM, bande passante, KV cache — explique presque tout ; (2) la confidentialité, avec une nuance à l'acte 2.");

/* =====================================================================
   ACTE 1 — EXÉCUTER (~25 min dont live 7)
===================================================================== */
pres.addSection({ title: S_A1 });

divider(S_A1, "ACTE 1 · EXÉCUTER", "Entre Entrée et le premier mot", 0,
  "Question de l'acte : qu'est-ce qui se passe entre l'appui sur Entrée et le premier mot ? Chaque étape sera reliée à un réglage et à une mesure. Pas de maths, pas d'entraînement : uniquement ce qui explique la RAM et la vitesse.");

// Pipeline
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: S_A1 });
s.addText("Six étapes entre Entrée et le premier mot", { placeholder: "title" });
const pipe = [
  ["Fichier .gguf", "poids + métadonnées", "→ choix du quant"],
  ["Chargement", "mmap dans la RAM", "→ taille du fichier"],
  ["Template + tokens", "le texte que lit le modèle", "→ chat template"],
  ["Prefill", "tout le prompt d'un coup", "→ calcul · 1er mot"],
  ["Decode", "un token à la fois", "→ bande passante"],
  ["Texte", "streamé à l'écran", "→ tok/s"],
];
pipe.forEach(([t, d, k], i) => {
  const x = 0.6 + i * 2.08;
  const hot = i === 3 || i === 4;
  chip(s, t, x, 1.75, 1.7, { h: 0.85, bold: true, fontSize: 15, fill: hot ? DARK : TINT, color: hot ? WHITE : INK });
  s.addText(d, { x, y: 2.72, w: 1.7, h: 0.6, margin: 0, align: "center", valign: "top", fontFace: SANS, fontSize: 13, color: MUTED });
  s.addText(k, { x, y: 3.3, w: 1.7, h: 0.35, margin: 0, align: "center", fontFace: SANS, fontSize: 13, bold: true, color: TEAL });
  if (i < 5) arrow(s, x + 1.72, 2.175, x + 2.06, 2.175);
});
// decode loop
s.addText("↻ boucle : × chaque token", { x: 8.66, y: 1.35, w: 1.9, h: 0.32, margin: 0, align: "center", fontFace: SANS, fontSize: 12, bold: true, color: GREEN });
// KV cache band under prefill + decode
s.addShape(pres.ShapeType.roundRect, { x: 6.84, y: 3.85, w: 3.78, h: 0.62, rectRadius: 0.08, fill: { color: GREEN } });
s.addText("KV cache : rempli par le prefill, relu à chaque token", { x: 6.84, y: 3.85, w: 3.78, h: 0.62, margin: 0, align: "center", valign: "middle", fontFace: SANS, fontSize: 13, bold: true, color: DARK });
textCard(s, 0.6, 3.85, 5.9, 2.25, "Deux ressources, deux limites", [
  "La RAM : il faut y loger les poids et le KV cache.",
  "La bande passante mémoire : le decode relit les poids à chaque token.",
  { t: "Le calcul (CPU/GPU) ne limite vraiment que le prefill.", b: true },
]);
strip(s, 6.3, [
  { text: "Chaque étape a un réglage et une mesure. ", options: { color: WHITE } },
  { text: "On les prend une par une.", options: { bold: true, color: GREEN } },
], { h: 0.6 });
s.addNotes("La carte de l'acte (2 min). Dérouler les six étapes de gauche à droite. Insister sur les deux cases sombres (prefill, decode) : c'est là que se joue la vitesse. La bande verte (KV cache) reviendra deux fois : ici, puis à l'acte 2 comme cache de prompt.");

// GGUF
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: S_A1 });
s.addText("Un fichier GGUF se lit comme une étiquette", { placeholder: "title" });
const fname = [
  ["LFM2.5", "famille", 1.7], ["8B", "paramètres\ntotaux", 1.0], ["A1B", "≈ 1 B\nactifs (MoE)", 1.2],
  ["UD", "quant Unsloth\nDynamic", 1.2], ["Q5_K_M", "5 bits, mix M\n(tenseurs sensibles +)", 2.3], [".gguf", "format\nllama.cpp", 1.2],
];
let fx = 0.6;
fname.forEach(([t, d, w], i) => {
  chip(s, t, fx, 1.65, w, { h: 0.75, mono: true, bold: true, fontSize: 20, fill: i === 4 ? GREEN : DARK, color: i === 4 ? DARK : WHITE });
  s.addText(d, { x: fx - 0.1, y: 2.5, w: w + 0.2, h: 0.75, margin: 0, align: "center", valign: "top", fontFace: SANS, fontSize: 13, color: MUTED });
  fx += w + 0.12;
});
s.addText("LFM2.5-8B-A1B-UD-Q5_K_M.gguf · 5,92 GiB sur le disque", { x: 0.6, y: 3.3, w: 9, h: 0.3, margin: 0, fontFace: SANS, fontSize: 13, italic: true, color: TEAL });
textCard(s, 0.6, 3.85, 5.9, 2.65, "Dedans : les poids", [
  "Des milliards de nombres, rangés en tenseurs, déjà quantifiés.",
  "Un seul fichier, pensé pour être mappé en mémoire tel quel.",
  { t: "Taille du fichier ≈ RAM occupée par les poids.", b: true },
]);
textCard(s, 6.83, 3.85, 5.9, 2.65, "… et des métadonnées", [
  "Architecture, nombre de couches, contexte d'entraînement.",
  "Le chat template (Jinja) : comment formater une conversation.",
  { t: "D'où « rien à configurer » : -c 0 lit le contexte du modèle.", b: true },
]);
src(s, "Sources : spec GGUF (ggml-org/ggml docs/gguf.md) · model card unsloth/LFM2.5-8B-A1B-GGUF · taille : print_info du log llama.cpp.");
s.addNotes("GGUF (2 min). Lire le nom comme une étiquette de supermarché. A1B = environ 1 B de paramètres actifs : c'est ce qui fera la vitesse (slide MoE). Le chat template embarqué est la clé du tool calling à l'acte 2.");

// Chargement mmap
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: S_A1 });
s.addText("Charger un modèle : il est mappé, pas copié", { placeholder: "title" });
chip(s, "Disque\n.gguf 5,9 Go", 0.6, 1.8, 2.3, { h: 1.1, bold: true, fontSize: 15 });
arrow(s, 2.95, 2.35, 3.6, 2.35);
chip(s, "Page cache de l'OS\n(RAM « buff/cache »)", 3.65, 1.8, 3.0, { h: 1.1, bold: true, fontSize: 15, fill: GREEN, color: DARK });
arrow(s, 6.7, 2.35, 7.35, 2.35);
chip(s, "llama.cpp\nlit les poids en place", 7.4, 1.8, 2.6, { h: 1.1, bold: true, fontSize: 15, fill: DARK, color: WHITE });
s.addText("mmap", { x: 2.95, y: 1.85, w: 0.65, h: 0.3, margin: 0, align: "center", fontFace: MONO, fontSize: 12, bold: true, color: TEAL });
codeBlock(s, 0.6, 3.25, 9.4, 1.0, [
  { t: "load_tensors:  CPU model buffer size =     0.00 MiB", c: GREEN },
  { t: "# zéro copie : les poids restent dans le page cache", c: CODEDIM },
], { fontSize: 14 });
textCard(s, 0.6, 4.5, 9.4, 2.25, "Ce que ça change en pratique", [
  "1er lancement lent (lecture disque), 2e instantané : le fichier est encore en cache.",
  "free / top rangent les poids en « buff/cache », pas en « utilisé » : la RAM est bien prise.",
  { t: "Si le fichier dépasse la RAM : relu depuis le disque à chaque token → des minutes par token.", c: RED, b: true },
]);
stat(s, 10.3, 1.8, 2.43, 2.45, "RAM ≥ fichier", "mmap change qui possède la mémoire, pas combien il en faut", { size: 22, labelSize: 13 });
textCard(s, 10.3, 4.5, 2.43, 2.25, "Réglage", [
  "-lm / --load-mode",
  "(auto, mmap, mlock…)",
  { t: "remplace --no-mmap et --mlock", b: true },
], { fontSize: 13 });
src(s, "Sources : llama.cpp src/llama-mmap.cpp, discussion #638, tools/server/README (-lm) · log mesuré sur le laptop (Spark-X2.5-4B), build 7fe450e.");
s.addNotes("Chargement (2 min). Erreur répandue : « mmap permet de faire tourner un modèle plus gros que la RAM ». Faux en pratique : il sera relu depuis le disque à chaque token. La ligne de log 0.00 MiB est la preuve de la zéro-copie. Les anciens tutos parlent de --no-mmap/--mlock : dans la version épinglée, c'est -lm.");

// Quantification
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: S_A1 });
s.addText("Quantifier : 15 GiB → 4,6 GiB, presque la même tête", { placeholder: "title" });
s.addChart(pres.ChartType.bar, [
  { name: "Taille (GiB) — Llama 3 8B", labels: ["F16", "Q8_0", "Q6_K", "Q5_K_M", "Q4_K_M", "Q3_K_M", "Q2_K"], values: [14.97, 7.96, 6.14, 5.33, 4.58, 3.74, 2.96] },
], chartOpts({
  x: 0.6, y: 1.45, w: 6.9, h: 3.65, barDir: "col",
  chartColors: [MUTED, MUTED, MUTED, MUTED, GREEN, MUTED, RED],
  dataLabelFormatCode: '0.0" GiB"', valAxisHidden: true, valGridLine: { style: "none" },
}));
s.addText("Écart à l'original (KLD) : Q8_0 0,001 · Q6_K 0,006 · Q5_K_M 0,011 · Q4_K_M 0,028 · Q3_K_M 0,084 · Q2_K 0,445", {
  x: 0.6, y: 5.15, w: 6.9, h: 0.6, margin: 0, fontFace: SANS, fontSize: 13, color: MUTED, valign: "top",
});
textCard(s, 7.85, 1.45, 4.88, 4.3, "Lire le graphique", [
  "Les poids sont stockés par blocs, avec un facteur d'échelle par bloc : moins de bits par poids.",
  { t: "Go ≈ milliards de paramètres × bits par poids ÷ 8", b: true },
  "Q4_K_M ≈ 4,9 bits → ~0,6 Go par milliard.",
  "Q4_K_M est le coude : ÷3,3 en taille pour un écart minime. Sous 3 bits, la qualité s'effondre.",
]);
strip(s, 5.95, [
  { text: "Un gros modèle quantifié bat un petit modèle entier : ", options: { color: WHITE } },
  { text: "13B en Q4_K_M (7,3 Go) > 7B en F16 (13 Go).", options: { bold: true, color: GREEN } },
], { h: 0.8 });
src(s, "Sources : llama.cpp tools/perplexity/README (Llama 3 8B, KLD vs F16) · PR #1684 (PPL 5,30 vs 5,91) · Dettmers & Zettlemoyer, arXiv:2212.09720 (« 4-bit is almost universally optimal »).");
s.addNotes("Quantification (3 min). Le geste d'achat : prendre Q4_K_M par défaut (c'est aussi le défaut de llama-server -hf), monter en Q5/Q6 si la RAM le permet. La règle Go ≈ B × bpw / 8 permet de répondre à la question du sondage : un 8B en Q4_K_M ≈ 5 Go. Suffixes : _S/_M/_L = tenseurs sensibles en plus haute précision (PR #1684) ; UD-/imatrix = quant calibré (revendication éditeur). Tendance : modèles livrés déjà quantifiés (MXFP4 de gpt-oss, QAT).");

// Prefill vs decode
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: S_A1 });
s.addText("Prefill lit, decode écrit — pas au même prix", { placeholder: "title" });
textCard(s, 0.6, 1.5, 5.9, 2.35, "Prefill · le prompt d'un coup", [
  "Tous les tokens du prompt sont traités en parallèle et remplissent le KV cache.",
  { t: "Limité par le calcul. Mesure : temps avant le 1er mot (TTFT).", b: true },
]);
textCard(s, 6.83, 1.5, 5.9, 2.35, "Decode · un token à la fois", [
  "Pour chaque token : relire tous les poids actifs, produire un score par token possible, tirer au sort.",
  { t: "Limité par la bande passante mémoire. Mesure : tok/s.", b: true },
]);
strip(s, 4.05, [
  { text: "tok/s en decode  ≲  bande passante mémoire  ÷  octets des poids actifs", options: { bold: true, color: GREEN, fontFace: SERIF, fontSize: 22 } },
], { h: 0.85 });
const ppRows = [
  [{ text: "Mesuré", options: { bold: true, color: WHITE, fill: { color: DARK } } }, { text: "Prefill", options: { bold: true, color: WHITE, fill: { color: DARK } } }, { text: "Decode", options: { bold: true, color: WHITE, fill: { color: DARK } } }, { text: "Rapport", options: { bold: true, color: WHITE, fill: { color: DARK } } }],
  [{ text: "Laptop CPU (LFM2.5-8B-A1B)", options: { bold: true } }, "98 t/s", "26 – 35 t/s", { text: "× 2 à 4", options: { bold: true, color: RED } }],
  [{ text: "Serveur LAN (Qwen3.8-Flash-Next)", options: { bold: true } }, "912 t/s", "36 t/s", { text: "× 25", options: { bold: true, color: TEAL } }],
];
s.addTable(ppRows, {
  x: 0.6, y: 5.12, w: 12.13, colW: [4.73, 2.4, 2.6, 2.4],
  fontFace: SANS, fontSize: 14, color: INK, valign: "middle",
  border: { type: "solid", color: "D3DCE6", pt: 0.75 }, fill: { color: WHITE }, rowH: 0.48, autoPage: false,
});
src(s, "Mesures : llama-bench -p 512 -n 128 (laptop, 05/10/2026) · /metrics du serveur (prompt_tokens_seconds, predicted_tokens_seconds).");
s.addNotes("LA slide pivot (3 min). Deux phases, deux goulots. Sur CPU, le prefill n'est que 2 à 4 fois plus rapide que le decode — et non « un à deux ordres de grandeur » comme on le lit (c'est vrai sur GPU). Conséquence, à garder pour l'acte 2 : un agent qui envoie 10 000 tokens de prompt attend longtemps son premier mot sur un CPU.");

// Bande passante — MoE vs dense mesuré
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: S_A1 });
s.addText("Mesuré sur ce laptop : le decode lit la mémoire", { placeholder: "title" });
s.addChart(pres.ChartType.bar, [
  { name: "Decode (tok/s, 6 threads)", labels: ["Spark-X2.5-4B (dense) · 2,4 GiB", "LFM2.5-8B-A1B (MoE) · 5,9 GiB"], values: [14.8, 34.6] },
], chartOpts({
  x: 0.6, y: 1.45, w: 6.6, h: 4.3, barDir: "bar",
  chartColors: [MUTED, GREEN], dataLabelFormatCode: '0.0" tok/s"', dataLabelFontSize: 14,
  catAxisLabelFontSize: 13, valAxisHidden: true, valGridLine: { style: "none" }, valAxisMaxVal: 42,
}));
textCard(s, 7.5, 1.45, 5.23, 2.4, "Même bande passante effective", [
  { t: "Dense : 2,4 Go relus × 14,8 t/s ≈ 38 Go/s", c: INK },
  { t: "MoE : ~1,1 Go actifs × 34,6 t/s ≈ 39 Go/s", c: INK },
  "Le CPU ne calcule presque pas : il attend la mémoire.",
], { fontSize: 15 });
textCard(s, 7.5, 4.05, 5.23, 1.7, "Plus de threads ≠ plus vite", [
  "6 threads (P-cores) → 34,6 t/s",
  { t: "14 threads (+ E-cores) → 26,4 t/s : −24 %", c: RED, b: true },
]);
strip(s, 5.95, [
  { text: "Fichier 2,4× plus gros, decode 2,3× plus rapide : ", options: { color: WHITE } },
  { text: "seuls les poids actifs sont relus.", options: { bold: true, color: GREEN } },
], { h: 0.8 });
src(s, "Mesures : llama-bench tg128, -t 6,14, i7-1370P, 30 Go, 05/10/2026 (docs/research/mesures-2026-10-05.md). Octets actifs du MoE : estimation.");
s.addNotes("Preuve (2 min). Deux modèles très différents, une même limite : ~38 Go/s, la bande passante réelle de la RAM de ce laptop. C'est la règle de la slide précédente vérifiée en vrai. Threads : llama.cpp sans -t exclut déjà les E-cores et l'hyperthreading (6 ici) ; ajouter des threads sature la mémoire et ajoute de la synchronisation.");

// KV cache
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: S_A1 });
s.addText("Le KV cache : la mémoire de la conversation", { placeholder: "title" });
textCard(s, 0.6, 1.45, 5.6, 2.15, "Ce que c'est", [
  "Pour chaque token déjà lu, chaque couche d'attention garde ses clés et valeurs (K, V) : on ne recalcule pas le passé à chaque nouveau token.",
  { t: "Réservé en entier au démarrage, pour tout -c.", b: true },
]);
codeBlock(s, 0.6, 3.8, 5.6, 1.9, [
  { t: "2 × couches × têtes KV × dim tête", c: GREEN, b: true },
  { t: "  × octets × tokens", c: GREEN, b: true },
  { t: "", c: CODEFG },
  { t: "Llama-3.1-8B : 2×32×8×128×2 o", c: CODEFG },
  { t: "  = 128 Kio/token → 16 Gio à 128k", c: AMBER },
], { fontSize: 14 });
s.addChart(pres.ChartType.bar, [
  { name: "KV cache à 128k tokens (GiB)", labels: ["Dense type Llama-3.1-8B (calcul)", "Spark-X2.5-4B (9 couches globales)", "LFM2.5-8B-A1B (6 couches d'attention)", "LFM2.5-8B-A1B, cache q8_0"], values: [16, 4.6, 1.5, 0.8] },
], chartOpts({
  x: 6.5, y: 1.45, w: 6.23, h: 4.25, barDir: "bar",
  chartColors: [RED, MUTED, GREEN, TEAL], dataLabelFormatCode: '0.0" GiB"', dataLabelFontSize: 13,
  catAxisLabelFontSize: 12, valAxisHidden: true, valGridLine: { style: "none" }, valAxisMaxVal: 20,
  catAxisOrientation: "maxMin",
}));
strip(s, 5.95, [
  { text: "Le contexte se paie en RAM, ", options: { color: WHITE } },
  { text: "et l'architecture change tout : de 1,5 à 16 GiB pour la même longueur.", options: { bold: true, color: GREEN } },
], { h: 0.8 });
src(s, "Mesuré : ligne « llama_kv_cache: size = … MiB » des logs llama.cpp (laptop, 05/10/2026). La formule se vérifie à l'octet près sur les deux modèles mesurés.");
s.addNotes("KV cache (3 min). Le K et le V : ce que chaque couche d'attention a calculé pour les tokens passés. La formule est vérifiable : LFM2.5 = 6 couches × 8 têtes × 64 × 2 × 2 o = 12 Kio/token → 384 MiB à 32k, exactement la valeur du log. Les modèles récents réduisent ce coût : moins de têtes KV (GQA), couches sans attention (hybrides conv/SSM), fenêtre glissante. Le cache est réservé au démarrage : pas de surprise en cours de route, mais une grosse réservation si -c est grand. Leviers : -c (ne réserver que ce qu'on utilise : Qwen3-0.6B 4 480 MiB par défaut, ~450 MiB avec -c 4096), -ctk/-ctv q8_0 (÷1,9, le V quantifié exige flash attention, auto), et surtout le choix du modèle. Piège mesuré : llama-server sans option ouvre 4 slots → 163 840 tokens → 17,9 GiB de KV pour un modèle de 373 Mo ; fixer -c et -np 1. Autre piège : --fit (défaut) peut réduire le contexte en silence.");

// MoE
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: S_A1 });
s.addText("MoE : la RAM paie le total, la vitesse paie l'actif", { placeholder: "title" });
// experts grid
s.addText("Pour chaque token, un routeur choisit quelques experts :", { x: 0.6, y: 1.45, w: 6.2, h: 0.4, margin: 0, fontFace: SANS, fontSize: 15, color: INK });
chip(s, "routeur", 0.6, 2.95, 1.2, { h: 0.6, bold: true, fontSize: 14, fill: DARK, color: WHITE });
const hotCells = new Set([3, 18, 22, 37, 41, 50, 59, 66, 79, 85, 94]);
for (let r = 0; r < 6; r++) {
  for (let c = 0; c < 16; c++) {
    const idx = r * 16 + c;
    s.addShape(pres.ShapeType.rect, {
      x: 2.1 + c * 0.29, y: 2.0 + r * 0.42, w: 0.23, h: 0.34,
      fill: { color: hotCells.has(idx) ? GREEN : TINT }, line: { color: hotCells.has(idx) ? GREEN : "C9D4E2", width: 0.5 },
    });
  }
}
arrow(s, 1.82, 3.25, 2.05, 3.25);
s.addText("512 experts dans le modèle du serveur : 10 routés + 1 partagé par token (≈ 2 % actifs)", { x: 2.1, y: 4.6, w: 4.7, h: 0.6, margin: 0, fontFace: SANS, fontSize: 13, italic: true, color: MUTED, valign: "top" });
stat(s, 7.2, 1.45, 2.65, 1.85, "177 B", "paramètres au total → 111 Go de RAM", { size: 36 });
stat(s, 10.08, 1.45, 2.65, 1.85, "6 B", "actifs par token → ~36 tok/s", { size: 36 });
textCard(s, 7.2, 3.55, 5.53, 1.75, "Bonus : décodage spéculatif (MTP)", [
  "Le modèle propose plusieurs tokens d'avance et les vérifie en une passe : 61 % acceptés, ~2,8 tokens par passe sur le serveur.",
], { fontSize: 13 });
strip(s, 5.6, [
  { text: "Le secret du local en 2026 : ", options: { color: WHITE } },
  { text: "de gros modèles MoE avec peu de paramètres actifs, et beaucoup de RAM.", options: { bold: true, color: GREEN } },
], { h: 0.9 });
src(s, "Sources : model card Qwen3.8-Flash-Next (125 B MoE dont 6 B actifs + 51 B embedding n-gram + 4 B MTP) · /v1/models et /metrics du serveur (n_params, spec_decode_*), 05/10/2026.");
s.addNotes("MoE (2 min). Tous les poids doivent être en RAM (le routeur peut choisir n'importe quel expert au token suivant), mais seuls ceux des experts choisis sont relus : la vitesse suit les paramètres actifs. Le serveur de la démo : ~177 B au compteur de llama-server, 111 Go de fichier, mais 6 B actifs. Le décodage spéculatif (têtes MTP) explique une partie des 36 tok/s : ✂ coupable en version 60 min.");

// Dimensionner
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: S_A1 });
s.addText("Dimensionner avant de télécharger", { placeholder: "title" });
stat(s, 0.6, 1.45, 5.9, 1.55, "RAM ≈ poids + KV cache + ~0,3 Go", "fichier .gguf · contexte réservé (-c) · tampons de calcul", { size: 24, labelSize: 13 });
stat(s, 6.83, 1.45, 5.9, 1.55, "tok/s ≈ bande passante ÷ poids actifs", "Go/s de la mémoire · octets relus par token", { size: 24, labelSize: 13 });
codeBlock(s, 0.6, 3.2, 5.9, 2.3, [
  { t: "# Ce laptop · LFM2.5-8B-A1B Q5_K_M", c: CODEDIM },
  { t: "RAM  = 5,9 + 0,4 (32k) + 0,1", c: CODEFG },
  { t: "     ≈ 6,4 Go           ✓ sur 30 Go", c: GREEN, b: true },
  { t: "tok/s ≈ 38 Go/s ÷ ~1,1 Go", c: CODEFG },
  { t: "     ≈ 35 t/s    ✓ mesuré : 34,6", c: GREEN, b: true },
], { fontSize: 14 });
const sizeRows = [
  [{ text: "Machine", options: { bold: true, color: WHITE, fill: { color: DARK } } }, { text: "Ce qui y tourne bien", options: { bold: true, color: WHITE, fill: { color: DARK } } }],
  [{ text: "Laptop 16–32 Go, CPU", options: { bold: true } }, "Chat, complétion : MoE de 4–8 B, ~30 t/s"],
  [{ text: "64–128 Go, mémoire rapide", options: { bold: true } }, "Agent de code : MoE de 30 à 120 B"],
  [{ text: "Serveur de la démo", options: { bold: true } }, "MoE 177 B (6 B actifs), 111 Go"],
];
s.addTable(sizeRows, {
  x: 6.83, y: 3.2, w: 5.9, colW: [2.5, 3.4],
  fontFace: SANS, fontSize: 14, color: INK, valign: "middle",
  border: { type: "solid", color: "D3DCE6", pt: 0.75 }, fill: { color: WHITE }, rowH: 0.56, autoPage: false,
});
strip(s, 5.75, [
  { text: "Réponse au sondage : ", options: { bold: true, color: GREEN } },
  { text: "un 8B en Q4_K_M ≈ 5 Go de poids — il tient sur votre laptop. S'il est MoE, il y est même rapide.", options: { color: WHITE } },
], { h: 0.95 });
src(s, "Mesures laptop 05/10/2026 · règles déduites des sources de l'acte (quantize/perplexity README, Databricks « LLM inference performance engineering »).");
s.addNotes("Dimensionner (2 min). Les deux formules suffisent pour 90 % des décisions. Le calcul pour le laptop tombe juste sur la mesure. Honnêteté : le chat tient sur un laptop ; l'agent de la démo a besoin d'une machine à ~128 Go — on verra pourquoi à l'acte 2 (le prefill). ✂ Sampling en une ligne si le temps le permet : le serveur applique ses defaults (temperature 1.0, top_p 0.95, min_p 0.05, lus dans /props).");

// Live 1
s = pres.addSlide({ masterName: "MASTER_LIVE", sectionTitle: S_A1 });
liveBadge(s);
s.addText("De Hugging Face à la ligne de log", { placeholder: "title" });
step(s, 1, 0.9, 2.95, 5.6, "Lire une page de modèle", "unsloth/LFM2.5-8B-A1B-GGUF : les quants et leurs tailles, avec la règle Go ≈ B × bits ÷ 8.", true);
step(s, 2, 0.9, 4.15, 5.6, "hf download, 397 Mo", "Qwen3-0.6B en Q4_K_M, téléchargé pendant la phrase.", true);
step(s, 3, 0.9, 5.35, 5.6, "llama-cli : lire le log", "KV cache 4 480 MiB pour 373 Mo de poids. Puis -c 4096 : ~450 MiB.", true);
codeBlock(s, 6.9, 2.95, 5.6, 2.8, [
  { t: "$ hf download unsloth/Qwen3-0.6B-GGUF \\", c: GREEN },
  { t: "    --include \"Qwen3-0.6B-Q4_K_M.gguf\" \\", c: CODEFG },
  { t: "    --local-dir /models/Qwen3-0.6B", c: CODEFG },
  { t: "$ llama-cli -m …/Qwen3-0.6B-Q4_K_M.gguf \\", c: GREEN },
  { t: "    -p Bonjour -st -v 2>&1 \\", c: CODEFG },
  { t: "  | grep -E \"kv_cache|Prompt:\"", c: CODEFG },
  { t: "llama_kv_cache: size = 4480.00 MiB", c: AMBER, b: true },
  { t: "[ Prompt: 330.7 t/s | Generation: 97.3 t/s ]", c: CODEDIM },
], { fontSize: 12 });
s.addText("× 12 : la mémoire de la conversation pèse douze fois le modèle.", { x: 6.9, y: 5.85, w: 5.6, h: 0.5, margin: 0, fontFace: SANS, fontSize: 15, bold: true, color: GREEN });
actDots(s, 0, 6.6);
s.addNotes("LIVE 1 (7 min). Script : presentation/SCENARIOS.md. Points à montrer : (1) les tailles sur la page HF ; (2) le téléchargement ; (3) la ligne llama_kv_cache et le breakdown model/context ; (4) la relance avec -c 4096 ; (5) la ligne de timings Prompt/Generation : prefill et decode en vrai. Filet : modèle pré-téléchargé + HF_HUB_OFFLINE=1, captures des logs.");

/* =====================================================================
   ACTE 2 — ORCHESTRER (~27 min dont lives 10 + 5)
===================================================================== */
pres.addSection({ title: S_A2 });

divider(S_A2, "ACTE 2 · ORCHESTRER", "Le harnais et sa conversation avec le LLM", 1,
  "Transition : « Ça discute, et on sait pourquoi c'est rapide ou lent. Mais un chat ne corrige pas un bug. » Question de l'acte : qu'est-ce qu'un agent envoie au modèle, et pourquoi ça marche ?");

// Fonction sans état
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: S_A2 });
s.addText("Le modèle est une fonction sans état", { placeholder: "title" });
chip(s, "texte", 0.6, 1.75, 1.6, { h: 0.8, bold: true, fontSize: 18 });
arrow(s, 2.25, 2.15, 2.9, 2.15);
chip(s, "LLM", 2.95, 1.6, 2.2, { h: 1.1, bold: true, fontSize: 24, fill: DARK, color: WHITE });
arrow(s, 5.2, 2.15, 5.85, 2.15);
chip(s, "texte", 5.9, 1.75, 1.6, { h: 0.8, bold: true, fontSize: 18 });
s.addText("Il ne garde rien d'une requête à l'autre. Tout ce qui ressemble à de la mémoire, des outils ou de l'autonomie est fait par le programme autour : le harnais.", {
  x: 0.6, y: 3.0, w: 6.9, h: 1.3, margin: 0, fontFace: SANS, fontSize: 17, color: INK, valign: "top",
});
strip(s, 5.0, [
  { text: "Harnais = ", options: { bold: true, color: GREEN } },
  { text: "boucle + outils + mémoire + permissions, autour d'un modèle qui ne fait que compléter du texte.", options: { color: WHITE } },
], { h: 1.3, fontSize: 17 });
const roles = [
  [{ text: "Qui", options: { bold: true, color: WHITE, fill: { color: DARK } } }, { text: "Fait quoi", options: { bold: true, color: WHITE, fill: { color: DARK } } }],
  [{ text: "Modèle", options: { bold: true } }, "choisit l'outil et les arguments (du texte)"],
  [{ text: "Template Jinja", options: { bold: true } }, "traduit JSON ⇄ texte balisé"],
  [{ text: "llama-server", options: { bold: true } }, "parse les appels, KV cache"],
  [{ text: "Harnais", options: { bold: true } }, "prompts, exécution, contexte"],
  [{ text: "Vous", options: { bold: true, color: TEAL } }, "AGENTS.md, skills, permissions"],
];
s.addTable(roles, {
  x: 7.85, y: 1.5, w: 4.88, colW: [1.75, 3.13],
  fontFace: SANS, fontSize: 14, color: INK, valign: "middle",
  border: { type: "solid", color: "D3DCE6", pt: 0.75 }, fill: { color: WHITE }, rowH: 0.5, autoPage: false,
});
s.addNotes("Sans état (2 min). Point fondateur de l'acte : à chaque tour, le harnais renvoie TOUT au modèle. Le tableau « qui fait quoi » est la grille de lecture des slides suivantes.");

// Anatomie
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: S_A2 });
s.addText("Anatomie d'une requête d'agent", { placeholder: "title" });
const stack = [
  ["Schémas des outils (read, edit, shell…)", 0.5, DARK, WHITE],
  ["Prompt système du harnais", 0.42, DARK, WHITE],
  ["AGENTS.md du projet", 0.42, TEAL, WHITE],
  ["Liste des skills (nom + description)", 0.62, TEAL, WHITE],
  ["Date, environnement", 0.36, TEAL, WHITE],
  ["Votre question", 0.42, AMBER, DARK],
  ["Historique + résultats d'outils (grossit à chaque tour)", 1.25, TINT, INK],
];
let sy = 1.5;
stack.forEach(([lbl, hh, fill, fg]) => {
  s.addShape(pres.ShapeType.rect, { x: 0.6, y: sy, w: 6.4, h: hh, fill: { color: fill }, line: { color: WHITE, width: 1 } });
  s.addText(lbl, { x: 0.8, y: sy, w: 6.0, h: hh, margin: 0, valign: "middle", fontFace: SANS, fontSize: 14, bold: true, color: fg });
  sy += hh;
});
s.addText("préfixe stable", { x: 7.1, y: 1.5, w: 1.6, h: 2.32, margin: 0, valign: "middle", fontFace: SANS, fontSize: 13, bold: true, color: TEAL });
s.addText("append-only", { x: 7.1, y: 4.24, w: 1.6, h: 1.25, margin: 0, valign: "middle", fontFace: SANS, fontSize: 13, bold: true, color: MUTED });
stat(s, 8.75, 1.5, 3.98, 2.0, "~10 000", "tokens envoyés avant même votre question (1er tour, mesuré)", { size: 44 });
stat(s, 8.75, 3.7, 3.98, 1.8, "~3 800", "tokens rien que pour décrire 49 skills installées (mesure du 05/10)", { size: 36, dark: false });
strip(s, 5.85, [
  { text: "Chaque ligne d'AGENTS.md, chaque skill installée, chaque outil MCP ", options: { color: WHITE } },
  { text: "est payé à chaque tour.", options: { bold: true, color: GREEN } },
], { h: 0.8 });
src(s, "Mesuré : base locale d'OpenCode v2.0.21 (tokens.input au 1er tour : 9 492 – 9 653 dans ce repo ; skill-guidance 15 203 caractères ≈ 3 800 tokens, estimation 4 car./token).");
s.addNotes("Anatomie (3 min). L'ordre est l'ordre réel : les outils sont écrits en tête par le template Qwen, puis les blocs du harnais du plus stable au plus variable. Ce n'est pas un hasard : le préfixe stable est ce que le KV cache pourra réutiliser (slide « cache de prompt »).");

// Tool calling
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: S_A2 });
s.addText("Le tool calling, c'est du texte et un parser", { placeholder: "title" });
codeBlock(s, 0.6, 1.45, 6.9, 5.3, [
  { t: "<|im_start|>system", c: CODEDIM },
  { t: "# Tools", c: CODEFG },
  { t: "<tools>{\"name\": \"read\", \"parameters\": …}</tools>", c: CODEFG },
  { t: "…You are an AI agent running in OpenCode…", c: CODEDIM },
  { t: "<|im_start|>user", c: CODEDIM },
  { t: "Corrige le test qui échoue dans calc.py", c: AMBER },
  { t: "<|im_start|>assistant", c: CODEDIM },
  { t: "<think>Je dois d'abord lire calc.py.</think>", c: CODEDIM },
  { t: "<tool_call>", c: GREEN, b: true },
  { t: "<function=read>", c: GREEN, b: true },
  { t: "<parameter=path>calc.py</parameter>", c: GREEN, b: true },
  { t: "</function></tool_call>", c: GREEN, b: true },
  { t: "<|im_start|>user", c: CODEDIM },
  { t: "<tool_response>", c: CODEFG },
  { t: "2:     return a - b", c: CODEFG },
  { t: "</tool_response>", c: CODEFG },
], { fontSize: 12 });
const tc = [
  "Le harnais envoie tools (schémas JSON)",
  "Le template les écrit dans le prompt",
  "Le modèle génère <tool_call>…",
  "llama-server parse → tool_calls JSON",
  "Le harnais exécute l'outil",
  "Le résultat revient en <tool_response>",
];
tc.forEach((t, i) => {
  const y = 1.5 + i * 0.6;
  s.addShape(pres.ShapeType.ellipse, { x: 7.85, y, w: 0.42, h: 0.42, fill: { color: i === 2 || i === 3 ? GREEN : TEAL } });
  s.addText(String(i + 1), { x: 7.85, y, w: 0.42, h: 0.42, margin: 0, align: "center", valign: "middle", fontFace: SANS, fontSize: 14, bold: true, color: WHITE });
  s.addText(t, { x: 8.42, y: y - 0.04, w: 4.3, h: 0.5, margin: 0, valign: "middle", fontFace: SANS, fontSize: 14, color: INK });
});
textCard(s, 7.85, 5.2, 4.88, 1.55, null, [
  { t: "Grammaire « lazy » : dès <tool_call>, la sortie est contrainte au schéma.", c: INK },
  { t: "Template inconnu → mode Generic, moins fiable.", c: RED, b: true },
], { fontSize: 13, space: 4 });
src(s, "Rendu réel du chat_template.jinja de Qwen3.8-Flash-Next (extraits) · llama.cpp docs/function-calling.md, common/chat.cpp (parser Qwen3-Coder, grammaire lazy).");
s.addNotes("Tool calling (3 min). Le modèle n'appelle rien : il écrit du texte dans un format convenu (ici le XML de Qwen). Le serveur reconnaît ce format, le transforme en tool_calls JSON pour le harnais, et peut même contraindre la génération à rester dans le schéma dès que <tool_call> apparaît. Le résultat de l'outil revient au modèle comme un message utilisateur. C'est pourquoi le choix du modèle ET de son template compte autant que sa taille.");

// La boucle
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: S_A2 });
s.addText("La boucle — et quand elle s'arrête", { placeholder: "title" });
chip(s, "Vous :\n« rends les tests verts »", 0.6, 2.2, 2.4, { h: 1.0, bold: true, fontSize: 14, fill: AMBER, color: DARK });
arrow(s, 3.05, 2.7, 3.55, 2.7);
chip(s, "LLM", 3.6, 2.2, 1.6, { h: 1.0, bold: true, fontSize: 20, fill: DARK, color: WHITE });
arrow(s, 5.25, 2.7, 5.75, 2.7);
chip(s, "tool_call ?", 5.8, 2.2, 1.7, { h: 1.0, bold: true, fontSize: 15, line: TEAL, lineW: 1.5, fill: WHITE });
arrow(s, 7.55, 2.7, 8.05, 2.7);
s.addText("oui", { x: 7.5, y: 2.3, w: 0.6, h: 0.3, margin: 0, align: "center", fontFace: SANS, fontSize: 12, bold: true, color: GREEN });
chip(s, "permission\nallow · ask · deny", 8.1, 2.2, 2.0, { h: 1.0, bold: true, fontSize: 13 });
arrow(s, 10.15, 2.7, 10.65, 2.7);
chip(s, "exécute\nread · shell · edit", 10.7, 2.2, 2.03, { h: 1.0, bold: true, fontSize: 13, fill: GREEN, color: DARK });
// return path
s.addShape(pres.ShapeType.line, { x: 11.7, y: 3.25, w: 0, h: 0.75, line: { color: TEAL, width: 2 } });
s.addShape(pres.ShapeType.line, { x: 4.4, y: 4.0, w: 7.3, h: 0, line: { color: TEAL, width: 2 } });
arrow(s, 4.4, 4.0, 4.4, 3.25);
s.addText("résultat ajouté à l'historique (tronqué), puis on renvoie tout", { x: 5.3, y: 4.05, w: 5.6, h: 0.35, margin: 0, align: "center", fontFace: SANS, fontSize: 13, italic: true, color: MUTED });
arrow(s, 6.65, 2.15, 6.65, 1.55);
s.addText("non → réponse finale, la boucle s'arrête", { x: 6.85, y: 1.35, w: 5, h: 0.35, margin: 0, fontFace: SANS, fontSize: 13, bold: true, color: TEAL });
stat(s, 0.6, 4.75, 3.6, 1.95, "~8", "appels d'outils par réponse (855 tool-calls / 101 stop, mesuré)", { size: 44 });
textCard(s, 4.45, 4.75, 8.28, 1.95, "Ce qu'il faut savoir", [
  "Elle s'arrête quand le modèle répond sans appel d'outil — pas de limite d'étapes par défaut.",
  "Un modèle qui rate ses appels d'outils tourne en rond ou s'arrête trop tôt : c'est un critère de choix.",
  { t: "La boucle n'est pas dans le modèle : c'est le harnais qui la fait tourner.", b: true },
], { fontSize: 14 });
src(s, "Code source OpenCode v2.0.21 (fin de boucle, champ steps optionnel) · mesuré : finish_reason des réponses dans la base locale d'OpenCode.");
s.addNotes("La boucle (2 min). LE diagramme du talk, à dessiner du doigt. Montrer la sortie « non » : la seule condition d'arrêt est que le modèle réponde sans demander d'outil. ~8 appels d'outils pour chaque réponse finale : un agent, c'est surtout de la lecture et de l'exécution.");

// Cache de prompt
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: S_A2 });
s.addText("Le KV cache, deuxième acte : le cache de prompt", { placeholder: "title" });
s.addText("Le début du prompt est identique d'un tour à l'autre : llama-server garde son KV cache et ne calcule que la fin.", {
  x: 0.6, y: 1.4, w: 12.1, h: 0.6, margin: 0, fontFace: SANS, fontSize: 16, color: INK, valign: "top",
});
stat(s, 0.6, 2.15, 3.85, 2.2, "94,6 %", "des tokens de prompt servis par le cache du serveur", { size: 44 });
stat(s, 4.74, 2.15, 3.85, 2.2, "20 s → 1 s", "avant le 1er mot : 1er tour d'une session vs tours suivants", { size: 36 });
stat(s, 8.88, 2.15, 3.85, 2.2, "4 min", "de prefill au lieu de ~81 min sans le cache", { size: 40, dark: false });
textCard(s, 0.6, 4.6, 5.9, 1.95, "Sur le laptop CPU", [
  { t: "~10 000 tokens à ~100 t/s de prefill = ~100 s avant le 1er mot, à chaque nouvelle session.", c: RED, b: true },
  "D'où le serveur : le chat tient sur un laptop, l'agent veut une machine rapide.",
]);
textCard(s, 6.83, 4.6, 5.9, 1.95, "Ne touchez pas au début du prompt", [
  "OpenCode ordonne ses blocs du plus stable au plus variable, exprès.",
  { t: "Ajouter un serveur MCP en cours de session invalide tout le cache.", b: true },
]);
src(s, "Mesuré : /metrics du serveur (prompt_tokens_cached_total / total, prompt_seconds_total) · sessions OpenCode (TTFT) · laptop llama-bench pp512.");
s.addNotes("Cache de prompt (3 min). C'est le KV cache de l'acte 1, réutilisé d'une requête à l'autre. Sans lui, chaque tour recalculerait tout le préfixe. Manus en fait « la métrique la plus importante d'un agent en production ». Sur CPU, le premier tour reste douloureux : c'est la vraie raison pour laquelle la démo d'agent tourne sur le serveur. Si question sur la taille du contexte : une session réelle passe de 9,6 k à 191 k tokens (une seule sortie shell : +29 k) ; OpenCode tronque les sorties (2 000 lignes / 50 Ko) et compacte à fenêtre − max(10 %, 16 k) ; sans limit.context dans la config, pas de compaction.");

// Brancher OpenCode
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: S_A2 });
s.addText("Brancher OpenCode : une base URL", { placeholder: "title" });
codeBlock(s, 0.6, 1.45, 7.1, 5.2, [
  { t: "\"providers\": {", c: CODEFG },
  { t: "  \"llama.cpp\": {", c: GREEN, b: true },
  { t: "    \"package\": \"aisdk:@ai-sdk/openai-compatible\",", c: CODEFG },
  { t: "    \"settings\": {", c: CODEFG },
  { t: "      \"baseURL\": \"http://192.168.0.110:8080/v1\"", c: AMBER, b: true },
  { t: "    },", c: CODEFG },
  { t: "    \"models\": {", c: CODEFG },
  { t: "      \"Qwen3.8-Flash-Next\": {", c: CODEFG },
  { t: "        \"capabilities\": { \"tools\": true, … },", c: GREEN },
  { t: "        \"limit\": { \"context\": 262144 }", c: GREEN },
  { t: "      }", c: CODEFG },
  { t: "    }", c: CODEFG },
  { t: "  }", c: CODEFG },
  { t: "}", c: CODEFG },
], { fontSize: 13 });
chip(s, "Laptop\nOpenCode", 8.05, 1.55, 1.9, { h: 1.1, bold: true, fontSize: 14 });
arrow(s, 10.0, 2.1, 10.75, 2.1);
chip(s, "llama-server\n192.168.0.110", 10.8, 1.55, 1.93, { h: 1.1, bold: true, fontSize: 13, fill: DARK, color: WHITE });
s.addText("API compatible OpenAI, sur le LAN", { x: 8.05, y: 2.75, w: 4.68, h: 0.35, margin: 0, align: "center", fontFace: SANS, fontSize: 13, italic: true, color: MUTED });
textCard(s, 8.05, 3.3, 4.68, 3.35, "Trois points d'attention", [
  "capabilities.tools : sinon le modèle n'a pas d'outils.",
  "limit.context : la vraie fenêtre, pour la compaction.",
  "Test de vie : curl …/v1/models",
  { t: "Le modèle et le harnais ne se connaissent que par cette URL.", b: true },
], { fontSize: 14 });
src(s, "~/.config/opencode/opencode.jsonc (extrait, syntaxe OpenCode v2 : providers / package / settings — la doc v1 dit provider / npm / options).");
s.addNotes("Branchement (2 min). La config réelle, pas un slide marketing : ~30 lignes au total avec les variantes. Attention à la version : OpenCode v2 a changé les clés (providers/package/settings) et ne lit plus CLAUDE.md, seulement AGENTS.md. N'importe quel harnais qui parle l'API OpenAI se branche de la même façon.");

// Live 2
s = pres.addSlide({ masterName: "MASTER_LIVE", sectionTitle: S_A2 });
liveBadge(s);
s.addText("Un ticket client corrigé par l'agent, 100 % local", { placeholder: "title" });
step(s, 1, 0.9, 2.95, 5.6, "Le symptôme", "Page ticket : « Remise (9 %) — annoncé 10 % », 1,44 € facturés en trop. L'agent reçoit seulement TICKET.md.", true);
step(s, 2, 0.9, 4.15, 5.6, "L'agent enquête", "ticket → pricing.py → tests rouges → edit → tests verts. Le log serveur montre le cache au travail.", true);
step(s, 3, 0.9, 5.35, 5.6, "F5, puis git diff", "La page passe au vert. Une seule valeur a changé : « il n'a pas deviné, il a mesuré ».", true);
codeBlock(s, 6.9, 2.95, 5.6, 2.1, [
  { t: "$ curl -s 192.168.0.110:8080/metrics", c: GREEN },
  { t: "prompt_tokens_total          239 162", c: CODEFG },
  { t: "prompt_tokens_cached_total 4 212 240", c: AMBER, b: true },
  { t: "predicted_tokens_seconds        35.9", c: CODEFG },
], { fontSize: 13 });
s.addText([
  { text: "4,4 M tokens de prompt servis par ce serveur pendant la préparation du talk, ", options: { color: WHITE } },
  { text: "94,6 % depuis le cache. Rien n'a quitté le LAN.", options: { color: GREEN, bold: true } },
], { x: 6.9, y: 5.2, w: 5.6, h: 1.1, margin: 0, fontFace: SANS, fontSize: 15, valign: "top" });
actDots(s, 1, 6.6);
s.addNotes("LIVE 2 (10 min). Script : SCENARIOS.md. Avant : demo/reset.sh et python3 demo/web/server.py (http://127.0.0.1:8000). Prompt : « Corrige le ticket demo/TICKET.md. » (plan B : « Les tests de demo/ sont rouges, rends-les verts. »). Ne PAS révéler le bug avant le git diff. Pendant que l'agent travaille, montrer le log serveur : prompt eval time petit (seul le suffixe est recalculé) grâce au cache. Punchline : curl /metrics — chiffres du jour à relever avant la session (compteurs cumulés depuis le démarrage du serveur).");

// Étendre
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: S_A2 });
s.addText("Étendre l'agent sans coder", { placeholder: "title" });
const ext = [
  ["AGENTS.md", "Les règles du projet", "Un fichier markdown à la racine, injecté dans chaque requête. Court et précis : chaque ligne est payée à chaque tour."],
  ["SKILL.md", "Savoir-faire à la demande", "Divulgation progressive : nom + description au départ, le corps quand la tâche s'y prête, les fichiers annexes ensuite."],
  ["MCP", "Des outils externes", "Un protocole client/serveur : tickets, base de données, navigateur… OpenCode v2 les expose via un catalogue texte + un outil execute."],
];
ext.forEach(([k, t, d], i) => {
  const x = 0.6 + i * 4.18;
  card(s, x, 1.5, 3.85, 3.9);
  chip(s, k, x + 0.3, 1.8, 3.25, { h: 0.6, mono: true, bold: true, fontSize: 18, fill: DARK, color: GREEN });
  s.addText(t, { x: x + 0.3, y: 2.6, w: 3.25, h: 0.5, margin: 0, fontFace: SERIF, fontSize: 19, bold: true, color: INK });
  s.addText(d, { x: x + 0.3, y: 3.15, w: 3.25, h: 2.1, margin: 0, fontFace: SANS, fontSize: 14, color: MUTED, valign: "top" });
});
strip(s, 5.7, [
  { text: "Chaque extension a un coût en contexte : ", options: { color: WHITE } },
  { text: "même « progressives », 49 descriptions de skills pèsent ~3 800 tokens à chaque session.", options: { bold: true, color: GREEN } },
], { h: 0.9 });
src(s, "Sources : agents.md · agentskills.io · spec MCP (révision 2026-07-28) · docs et code OpenCode v2.0.21 (Code Mode, skill-guidance).");
s.addNotes("Extensions (2 min). Trois niveaux : des règles toujours présentes (AGENTS.md), du savoir-faire chargé à la demande (skills), des outils externes (MCP). Ironie mesurée sur ce repo : la liste des skills est le premier poste du prompt de base. Annoncer le live 3 : on écrit une skill en direct.");

// Live 3
s = pres.addSlide({ masterName: "MASTER_LIVE", sectionTitle: S_A2 });
liveBadge(s);
s.addText("Écrire une skill en direct", { placeholder: "title" });
step(s, 1, 0.9, 2.95, 5.6, "Un dossier, un fichier", ".opencode/skills/explain-file/SKILL.md, frontmatter name + description.", true);
step(s, 2, 0.9, 4.15, 5.6, "Quatre consignes", "Rôle · Structure · Subtilités · Limites. Quinze lignes en tout.", true);
step(s, 3, 0.9, 5.35, 5.6, "L'invocation", "« explique demo/pricing.py » : l'agent voit la skill, la charge, l'applique.", true);
codeBlock(s, 6.9, 2.95, 5.6, 3.2, [
  { t: "---", c: CODEDIM },
  { t: "name: explain-file", c: GREEN, b: true },
  { t: "description: Explique un fichier", c: CODEFG },
  { t: "  de code (rôle, structure,", c: CODEFG },
  { t: "  subtilités, limites)", c: CODEFG },
  { t: "---", c: CODEDIM },
  { t: "1. Lis le fichier en entier.", c: CODEFG },
  { t: "2. Rends : Rôle, Structure,", c: CODEFG },
  { t: "   Subtilités, Limites.", c: CODEFG },
], { fontSize: 13 });
actDots(s, 1, 6.6);
s.addNotes("LIVE 3 (5 min). Rien à redéployer : c'était un fichier. La description est ce que l'agent voit au départ ; le corps n'est chargé qu'à l'usage. Filet : git checkout de la version committée. ✂ Coupable en version 60 min (montrer le fichier committé à la place).");

/* =====================================================================
   ACTE 3 — EXPLORER (~12 min)
===================================================================== */
pres.addSection({ title: S_A3 });

divider(S_A3, "ACTE 3 · EXPLORER", "Le paysage, automne 2026", 2,
  "Transition : « Vous avez vu une pile complète : un modèle, un moteur, un harnais. Où en sont les modèles, et sur quoi les faire tourner ? » Tous les chiffres de cet acte sont datés et sourcés dans docs/research/acte3-paysage.md — à revérifier la veille.");

// Modèles
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: S_A3 });
s.addText("Open-weights : l'écart s'est fermé… sur les tâches courtes", { placeholder: "title" });
s.addChart(pres.ChartType.bar, [
  { name: "Meilleur modèle fermé", labels: ["SWE-bench Verified", "Terminal-Bench 4.0", "Indice Artificial Analysis"], values: [97.0, 65, 58] },
  { name: "Meilleur open-weights", labels: ["SWE-bench Verified", "Terminal-Bench 4.0", "Indice Artificial Analysis"], values: [96.4, 39, 46] },
], chartOpts({
  x: 0.6, y: 1.45, w: 7.0, h: 4.3, barDir: "col",
  chartColors: [DARK, GREEN], showLegend: true, legendPos: "b", legendFontSize: 13, legendColor: INK, legendFontFace: "+mn-lt",
  dataLabelFormatCode: "0.#", valAxisHidden: true, valGridLine: { style: "none" }, valAxisMaxVal: 110,
}));
textCard(s, 7.9, 1.45, 4.83, 4.3, "Ce qu'il faut retenir", [
  "MoE partout : 1,5 à 6 B actifs pour 8 à 180 B et plus au total.",
  "Attention hybride, contexte de 256 k à 1 M, modèles livrés quantifiés.",
  { t: "Les open-weights de tête pèsent 300 B à 2,8 T : pas sur un laptop.", b: true },
  "Le modèle de la démo revendique 62,5 sur SWE-bench Pro : revendication de l'éditeur.",
], { fontSize: 14 });
strip(s, 5.95, [
  { text: "SWE-bench Verified est saturé ; ", options: { color: WHITE } },
  { text: "sur les tâches longues en terminal, l'écart reste réel.", options: { bold: true, color: GREEN } },
], { h: 0.8 });
src(s, "Sources indépendantes, consultées le 05/10/2026 : swebench.com, Vals.ai (Terminal-Bench 4.0), Artificial Analysis · model card Qwen3.8-Flash-Next (revendication).");
s.addNotes("Modèles (2 min). Message honnête : sur les benchmarks courts, l'écart a disparu ; sur les tâches agentiques longues, les meilleurs modèles fermés gardent une avance nette. Et les open-weights qui s'en approchent sont énormes. Les chiffres bougent chaque mois : à revérifier la veille.");

// Matériel
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: S_A3 });
s.addText("Matériel : lisez la bande passante, pas les TOPS", { placeholder: "title" });
s.addChart(pres.ChartType.bar, [
  { name: "Bande passante mémoire (Go/s)", labels: ["Laptop du talk (mesuré, effectif)", "Strix Halo · 128 Go (mesuré)", "DGX Spark · 128 Go", "Mac M5 Max · 128 Go", "Mac M5 Ultra · 512 Go", "RTX 5090 · 32 Go"], values: [38, 215, 273, 614, 1200, 1800] },
], chartOpts({
  x: 0.6, y: 1.45, w: 7.4, h: 4.3, barDir: "bar",
  chartColors: [RED, MUTED, MUTED, TEAL, TEAL, DARK], dataLabelFormatCode: '0" Go/s"', dataLabelFontSize: 13,
  catAxisLabelFontSize: 13, valAxisHidden: true, valGridLine: { style: "none" }, valAxisMaxVal: 2200,
  catAxisOrientation: "maxMin",
}));
textCard(s, 8.3, 1.45, 4.43, 4.3, "Lire le graphique", [
  "Rappel acte 1 : tok/s ≈ bande passante ÷ poids actifs.",
  { t: "Repère officiel llama.cpp : gpt-oss-120b sur DGX Spark → 59 t/s à vide, 43 t/s à 32 k de contexte.", c: INK },
  "La RTX 5090 est la plus rapide, mais 32 Go seulement : les gros MoE n'y tiennent pas.",
  { t: "La DRAM est chère en 2026 (TrendForce : +10 à 18 % par trimestre).", b: true },
], { fontSize: 14 });
strip(s, 5.95, [
  { text: "Pour un agent local : ", options: { color: WHITE } },
  { text: "beaucoup de mémoire (≥ 128 Go) et de la bande passante, plutôt que de la puissance de calcul.", options: { bold: true, color: GREEN } },
], { h: 0.8 });
src(s, "Sources : Apple Newsroom (08/2026), NVIDIA, llama.cpp benches/dgx-spark, Soothill (Strix Halo, 08/2026), TrendForce (09/2026) · laptop : mesure du 05/10/2026.");
s.addNotes("Matériel (2 min). Le critère n°1 est la bande passante mémoire, et la quantité de mémoire qu'elle sert. Les chiffres constructeur sont théoriques ; le laptop est une mesure effective (le théorique LPDDR5 est autour de 80 Go/s). Prix volatils en 2026 : les donner oralement, à revérifier.");

/* =====================================================================
   CLÔTURE (~5 min + Q&A)
===================================================================== */
pres.addSection({ title: S_CLO });

// RIEN
s = pres.addSlide({ masterName: "MASTER_TITRE", sectionTitle: S_CLO });
s.addText("Bilan confidentiel — l'inventaire de la journée :", {
  x: 0.9, y: 1.75, w: 11.5, h: 0.6, margin: 0, fontFace: SANS, fontSize: 22, color: ON_DARK_MUT,
});
s.addText("RIEN.", {
  x: 0.9, y: 2.3, w: 11.5, h: 2.3, margin: 0, fontFace: SERIF, fontSize: 120, bold: true, color: GREEN,
});
s.addText("Les prompts, le code de la démo, les tests, la skill, les correctifs de l'agent :\ntout est resté sur les machines de cette salle.", {
  x: 0.9, y: 5.0, w: 11.5, h: 1.0, margin: 0, fontFace: SANS, fontSize: 20, color: WHITE,
});
s.addNotes("Punchline (1 min). Laisser « RIEN » seul à l'écran. Retour au hook : « ce que vous collez dans un chat cloud n'est, aujourd'hui, jamais sorti d'ici ».");

// Chez vous ce soir
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: S_CLO });
s.addText("Chez vous ce soir", { placeholder: "title" });
codeBlock(s, 0.6, 1.5, 7.6, 2.3, [
  { t: "$ git clone " + REPO_URL, c: GREEN },
  { t: "$ cd llm-introduction", c: CODEFG },
  { t: "$ docker compose build", c: CODEFG },
  { t: "$ docker compose run --rm llama bash", c: CODEFG },
  { t: "  # hf download <modèle> --local-dir /models/<modèle>", c: CODEDIM },
  { t: "  # llama-server -m /models/<modèle>/<fichier>.gguf", c: CODEDIM },
], { fontSize: 14 });
textCard(s, 0.6, 4.05, 7.6, 1.4, null, [
  { t: "Le repo contient tout : conteneur llama.cpp, démo avec son bug, skill explain-file, config OpenCode, notes de recherche et mesures.", c: INK },
], { fontSize: 15 });
card(s, 8.9, 1.5, 3.83, 4.4, WHITE);
const slideRepo = s; // le QR code y est ajouté à la fin (génération asynchrone)
s.addText(REPO_SHORT, {
  x: 8.9, y: 5.0, w: 3.83, h: 0.4, margin: 0, align: "center", fontFace: SANS, fontSize: 13, bold: true, color: TEAL,
});
s.addText("public · licence MIT", {
  x: 8.9, y: 5.38, w: 3.83, h: 0.35, margin: 0, align: "center", fontFace: SANS, fontSize: 12, color: MUTED,
});
s.addNotes("Take-away (1 min). Le QR mène au repo public. La démo est rejouable chez soi, bug compris, et toutes les mesures du talk sont dans docs/research.");

// Merci
s = pres.addSlide({ masterName: "MASTER_TITRE", sectionTitle: S_CLO });
s.addText("Merci.", { placeholder: "title" });
s.addText("Place aux questions — et si le serveur tient, à une démo improvisée.", {
  x: 0.9, y: 4.3, w: 11.5, h: 0.6, margin: 0, fontFace: SANS, fontSize: 20, color: ON_DARK_MUT,
});
s.addText("repo : " + REPO_SHORT + " · licence MIT · tout est rejouable", {
  x: 0.9, y: 6.6, w: 11.5, h: 0.4, margin: 0, fontFace: SANS, fontSize: 13, color: ON_DARK_MUT,
});
s.addNotes("Q&A. Proposer de prolonger les lives à la demande (« et si on essayait sur VOTRE projet ? »).");

QRCode.toDataURL(REPO_URL, { errorCorrectionLevel: "M", margin: 1, width: 720, color: { dark: "#" + INK + "FF", light: "#FFFFFFFF" } })
  .then((dataUrl) => {
    slideRepo.addImage({ data: dataUrl.replace(/^data:/, ""), x: 9.27, y: 1.75, w: 3.1, h: 3.1, altText: "QR code vers " + REPO_URL });
    return pres.writeFile({ fileName: "llm-agentique-local.pptx" });
  })
  .then(() => console.log("OK écrit"));
