/* Build « LLM & développement agentique — tout ça tourne chez vous »
 * Structured deck: theme + layouts + sections, via pptxgenjs.
 * Build: node build_deck.js  (then apply_theme.js, then validate.py)
 */
const pptxgen = require("pptxgenjs");

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
const CODEBG = "101828";
const CODEFG = "E6F1EC";
const ON_DARK_MUT = "9FB0C9";

const W = 13.333, H = 7.5;
const MONO = "Courier New";
const SANS = "Calibri";
const SERIF = "Cambria";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.title = "LLM & développement agentique — tout ça tourne chez vous";
pres.author = "m-max";
pres.company = "llama-local";
const C = pres.SchemeColor;

/* ---------- masters (layouts) — syntax pptxgenjs 4.0.1 : objects:[{placeholder:{options}}] ---------- */
pres.defineSlideMaster({
  title: "MASTER_TITRE",
  background: { color: DARK },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.9, y: 2.35, w: 11.5, h: 1.9,
      color: WHITE, fontFace: SERIF, fontSize: 44, bold: true, valign: "top", margin: 0 } } },
  ],
});

pres.defineSlideMaster({
  title: "MASTER_DIVISEUR",
  background: { color: DARK },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.9, y: 2.75, w: 11.5, h: 1.3,
      color: WHITE, fontFace: SERIF, fontSize: 40, bold: true, valign: "top", margin: 0 } } },
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
      color: WHITE, fontFace: SERIF, fontSize: 36, bold: true, valign: "top", margin: 0 } } },
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
    x: x1, y: y1, w: x2 - x1, h: y2 - y1,
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
  const paras = lines.map((ln, i) => {
    if (typeof ln === "string")
      return { text: ln, options: { color: opts.color || CODEFG, breakLine: true } };
    return { text: ln.t, options: { color: ln.c || CODEFG, breakLine: true, bold: !!ln.b } };
  });
  slide.addText(paras, {
    x: x + 0.25, y: y + 0.16, w: w - 0.5, h: h - 0.32,
    fontFace: MONO, fontSize: opts.fontSize || 13, align: "left", valign: "top", margin: 0,
  });
}

function actDots(slide, current, y) {
  const labels = ["Comprendre", "Agir", "Étendre"];
  labels.forEach((lbl, i) => {
    const x = 0.9 + i * 1.55;
    slide.addShape(pres.ShapeType.ellipse, {
      x, y, w: 0.22, h: 0.22,
      fill: { color: i === current ? GREEN : DARK },
      line: { color: i === current ? GREEN : ON_DARK_MUT, width: 1.25 },
    });
    slide.addText(lbl, {
      x: x - 0.35, y: y + 0.28, w: 0.95, h: 0.3, align: "center", margin: 0,
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
    x: x + 0.6, y: y + 0.42, w: w - 0.6, h: 0.85, margin: 0, valign: "top",
    fontFace: SANS, fontSize: 13, color: dark ? ON_DARK_MUT : MUTED,
  });
}

/* =====================================================================
   SECTION — OUVERTURE
===================================================================== */
pres.addSection({ title: "Ouverture" });

// 1 — Titre
let s = pres.addSlide({ masterName: "MASTER_TITRE", sectionTitle: "Ouverture" });
s.addText("SESSION LIVE · 1 HEURE · ZÉRO CLOUD", {
  x: 0.9, y: 1.55, w: 11, h: 0.4, margin: 0, fontFace: SANS, fontSize: 14,
  bold: true, color: GREEN, charSpacing: 3,
});
s.addText("LLM & développement agentique", { placeholder: "title" });
s.addText("Comprendre les modèles de bout en bout — et les faire tourner chez soi.", {
  x: 0.9, y: 4.35, w: 11, h: 0.6, margin: 0, fontFace: SANS, fontSize: 20, color: ON_DARK_MUT,
});
s.addText("m-max · octobre 2026 · un laptop, un serveur CPU, aucun cloud", {
  x: 0.9, y: 6.6, w: 11, h: 0.4, margin: 0, fontFace: SANS, fontSize: 13, color: ON_DARK_MUT,
});
s.addNotes("Accueil. Annoncer le cadre : 1 h, questions pendant les lives ou en fin. Toutes les démos du jour tournent sur du matériel local — on le prouvera à chaque acte.");

// 2 — Hook
s = pres.addSlide({ masterName: "MASTER_TITRE", sectionTitle: "Ouverture" });
s.addText("Vous appuyez sur Entrée.", {
  x: 0.9, y: 1.7, w: 11.5, h: 0.9, margin: 0, fontFace: SERIF, fontSize: 38, bold: true, color: WHITE,
});
s.addText([
  { text: "Que se passe-t-il, ", options: { color: WHITE } },
  { text: "vraiment", options: { color: GREEN } },
  { text: " ?", options: { color: WHITE } },
], { x: 0.9, y: 2.62, w: 11.5, h: 0.9, margin: 0, fontFace: SERIF, fontSize: 38, bold: true });
s.addText("Vous utilisez un LLM tous les jours. Aujourd'hui, on ouvre la boîte.", {
  x: 0.9, y: 3.85, w: 11, h: 0.5, margin: 0, fontFace: SANS, fontSize: 19, color: ON_DARK_MUT,
});
card(s, 0.9, 4.9, 11.5, 1.5, DARK);
s.addText([
  { text: "À main levée : ", options: { bold: true, color: GREEN, breakLine: true } },
  { text: "Qui code avec un assistant IA ? · Qui sait ce qu'est un token ? · Qui a déjà fait tourner un modèle chez soi ?", options: { color: ON_DARK_MUT } },
], { x: 1.25, y: 5.15, w: 10.8, h: 1.0, margin: 0, fontFace: SANS, fontSize: 16, valign: "top" });
s.addNotes("Hook (2 min). Sonder la salle pour calibrer le vocabulaire de la suite. Promettre : à la fin, la boîte est ouverte et tout était local.");

// 3 — Programme
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: "Ouverture" });
s.addText("Le programme : comprendre, agir, étendre", { placeholder: "title" });
const acts = [
  ["1", "Comprendre", "Un LLM, vraiment : tokens, contexte, sampling, quantification. Et on en télécharge un en direct."],
  ["2", "Agir", "Le développement agentique : la boucle, les outils. Un agent corrige un vrai bug, branché sur un modèle local."],
  ["3", "Étendre", "Skills, MCP, paysage des harnais. On écrit une skill en direct et on l'invoque."],
];
acts.forEach(([n, t, d], i) => {
  const x = 0.6 + i * 4.18;
  card(s, x, 1.55, 3.85, 4.3);
  s.addText("ACTE " + n, { x: x + 0.35, y: 1.9, w: 2, h: 0.35, margin: 0, fontFace: SANS, fontSize: 13, bold: true, color: GREEN, charSpacing: 2 });
  s.addText(t, { x: x + 0.35, y: 2.3, w: 3.2, h: 0.6, margin: 0, fontFace: SERIF, fontSize: 26, bold: true, color: INK });
  s.addText(d, { x: x + 0.35, y: 3.05, w: 3.2, h: 2.5, margin: 0, fontFace: SANS, fontSize: 14, color: MUTED, valign: "top" });
});
s.addText("… et à chaque acte, une démonstration en direct. À la fin : tout ça tourne chez vous.", {
  x: 0.6, y: 6.25, w: 12.1, h: 0.5, margin: 0, fontFace: SANS, fontSize: 16, italic: true, color: TEAL,
});
s.addNotes("Programme (1 min). Insister sur l'alternance théorie/live : chaque acte se termine par une démo réelle sur le matériel de la salle.");

/* =====================================================================
   SECTION — ACTE 1 : COMPRENDRE
===================================================================== */
pres.addSection({ title: "Acte 1 — Comprendre" });

// 4 — Diviseur acte 1
s = pres.addSlide({ masterName: "MASTER_DIVISEUR", sectionTitle: "Acte 1 — Comprendre" });
s.addText("ACTE 1 · COMPRENDRE", { x: 0.9, y: 2.15, w: 10, h: 0.4, margin: 0, fontFace: SANS, fontSize: 15, bold: true, color: GREEN, charSpacing: 3 });
s.addText("Comprendre un LLM, vraiment", { placeholder: "title" });
actDots(s, 0, 4.7);
s.addNotes("Transition : la théorie d'abord, quinze minutes, puis le premier live.");

// 5 — Machine à prédire
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: "Acte 1 — Comprendre" });
s.addText("Un LLM prédit le token suivant. C'est tout.", { placeholder: "title" });
chip(s, "« Le chat noir »", 0.6, 1.9, 1.9, { bold: true, fontSize: 14 });
arrow(s, 2.55, 2.15, 3.15, 2.15);
s.addShape(pres.ShapeType.roundRect, { x: 3.2, y: 1.62, w: 2.5, h: 1.05, rectRadius: 0.12, fill: { color: DARK } });
s.addText("LLM\n8 000 000 000 poids", { x: 3.2, y: 1.62, w: 2.5, h: 1.05, align: "center", valign: "middle", margin: 0, fontFace: SANS, fontSize: 13, bold: true, color: WHITE });
arrow(s, 5.75, 2.15, 6.35, 2.15);
s.addShape(pres.ShapeType.roundRect, { x: 6.4, y: 1.35, w: 3.1, h: 1.6, rectRadius: 0.1, fill: { color: TINT } });
[["Le", 12], ["Un", 14], ["Mon", 16]].forEach(([w_, off], i) => {
  const probs = [["saute", "68 %"], ["dort", "19 %"], ["chante", "7 %"]];
  chip(s, probs[i][0] + "  " + probs[i][1], 6.6, 1.5 + i * 0.48, 2.7, { fill: i === 0 ? GREEN : WHITE, bold: i === 0, fontSize: 13, color: i === 0 ? DARK : INK });
});
arrow(s, 9.55, 2.15, 10.15, 2.15);
chip(s, "« saute »", 10.2, 1.9, 1.5, { bold: true, fill: DARK, color: WHITE, fontSize: 15 });
s.addText("Le token choisi est ajouté à l'entrée, et le modèle recommence. Token après token. Il ne « sait » rien d'autre que prédire la suite la plus probable.", {
  x: 0.6, y: 3.35, w: 7.4, h: 1.4, margin: 0, fontFace: SANS, fontSize: 16, color: INK, valign: "top",
});
card(s, 8.3, 3.35, 4.4, 3.0);
s.addText([
  { text: "Pourquoi c'est important", options: { bold: true, fontSize: 16, color: INK, breakLine: true } },
  { text: "· Pas de base de connaissances : des probabilités apprises.", options: { color: MUTED, breakLine: true } },
  { text: "· Une réponse = des milliers d'appels du même moteur.", options: { color: MUTED, breakLine: true } },
  { text: "· Toute la suite de la session repose sur cette phrase.", options: { color: MUTED } },
], { x: 8.62, y: 3.62, w: 3.8, h: 2.5, margin: 0, fontFace: SANS, valign: "top", paraSpaceAfter: 8 });
s.addNotes("Le concept fondateur (3 min). Le diagramme : entrée → modèle → distribution → token choisi → re-boucle. Dire : « tout le reste de la présentation ne fait qu'exploiter cette phrase ».");

// 6 — Tokens
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: "Acte 1 — Comprendre" });
s.addText("Le token : la monnaie du modèle", { placeholder: "title" });
s.addText("« Le développeur comprend » vu par le modèle :", { x: 0.6, y: 1.5, w: 8, h: 0.4, margin: 0, fontFace: SANS, fontSize: 16, color: INK });
const toks = ["ĠLe", " Ġd", "éve", "lo", "peur", " Ġcom", "prend"];
let tx = 0.6;
toks.forEach((tk, i) => {
  const wd = 0.55 + tk.length * 0.14;
  chip(s, tk, tx, 2.0, wd, { fill: i % 2 ? TINT : WHITE, line: TEAL, lineW: 1, mono: true, fontSize: 15 });
  tx += wd + 0.22;
});
card(s, 0.6, 2.95, 6.1, 3.3);
s.addText([
  { text: "Les ordres de grandeur", options: { bold: true, fontSize: 16, color: INK, breakLine: true } },
  { text: "· ≈ 4 caractères = 1 token en anglais.", options: { color: MUTED, breakLine: true } },
  { text: "· Le français coûte 20-30 % de tokens de plus.", options: { color: MUTED, breakLine: true } },
  { text: "· « développeur » → « d » + « éve » + « lopeur » : le modèle ne voit pas des mots, des morceaux.", options: { color: MUTED, breakLine: true } },
  { text: "· Facturation, fenêtre de contexte, lenteur : tout se compte en tokens.", options: { color: MUTED } },
], { x: 0.92, y: 3.22, w: 5.5, h: 2.85, margin: 0, fontFace: SANS, valign: "top", paraSpaceAfter: 8 });
card(s, 7.0, 2.95, 5.7, 3.3, DARK);
s.addText([
  { text: "Chez vous aussi", options: { bold: true, fontSize: 15, color: GREEN, breakLine: true } },
  { text: "Le petit modèle du live n'a pas de mot « français » : il a des morceaux de français, appris comme les autres. La langue n'est pas une option de compilation.", options: { color: WHITE, breakLine: true } },
], { x: 7.32, y: 3.25, w: 5.1, h: 2.7, margin: 0, fontFace: SANS, fontSize: 14, valign: "top" });
s.addNotes("Tokens (2 min). Montrer les morceaux : le modèle ne voit jamais un mot entier. Enchaîner : « le token, c'est aussi l'unité de la fenêtre de contexte, vue juste après ».");

// 7 — Paramètres
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: "Acte 1 — Comprendre" });
s.addText("« 8B paramètres », ça veut dire quoi ?", { placeholder: "title" });
s.addText("8 000 000 000", { x: 0.6, y: 1.7, w: 6.0, h: 1.3, margin: 0, fontFace: SERIF, fontSize: 64, bold: true, color: GREEN });
s.addText("nombres appris pendant l'entraînement — c'est tout ce qu'est le « cerveau »", {
  x: 0.6, y: 3.0, w: 6.0, h: 0.6, margin: 0, fontFace: SANS, fontSize: 15, color: MUTED,
});
card(s, 0.6, 3.85, 6.0, 2.6);
s.addText([
  { text: "· Chaque token qui traverse le modèle est multiplié contre ces nombres, couche après couche.", options: { color: MUTED, breakLine: true } },
  { text: "· Le code du modèle est ouvert ; ce qui compte, ce sont les poids — de vrais fichiers, téléchargeables.", options: { color: MUTED } },
], { x: 0.92, y: 4.1, w: 5.4, h: 2.1, margin: 0, fontFace: SANS, fontSize: 15, valign: "top", paraSpaceAfter: 8 });
card(s, 7.1, 1.7, 5.6, 4.75);
s.addText([
  { text: "Conséquence directe", options: { bold: true, fontSize: 16, color: INK, breakLine: true } },
  { text: "Un poids est un nombre, pas un circuit : il peut être calculé par un CPU. Avec moins de précision (quantification, juste après), un 8 milliards de poids tient sur un laptop.", options: { color: MUTED, breakLine: true } },
  { text: "8B = un modèle de « poche ». Les modèles frontieres en font 10 à 100 fois plus — là, il faut une salle de serveurs.", options: { color: MUTED } },
], { x: 7.42, y: 2.0, w: 5.0, h: 4.2, margin: 0, fontFace: SANS, valign: "top", paraSpaceAfter: 10 });
s.addNotes("Paramètres (2 min). Démystifier les chiffres marketing. Le pont est posé : des nombres → moins de précision → CPU. La quantification arrive en fin d'acte.");

// 8 — Fenêtre de contexte
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: "Acte 1 — Comprendre" });
s.addText("La fenêtre de contexte : sa mémoire de travail", { placeholder: "title" });
s.addShape(pres.ShapeType.roundRect, { x: 0.6, y: 1.55, w: 7.0, h: 4.9, rectRadius: 0.1, fill: { color: WHITE }, line: { color: INK, width: 1.5 } });
const layers = [
  ["Prompt système", 0.55, DARK, WHITE],
  ["AGENTS.md / règles du projet", 0.7, TEAL, WHITE],
  ["Fichiers versés", 1.0, GREEN, DARK],
  ["Historique de la conversation", 1.45, TINT, INK],
  ["Votre question", 0.55, AMBER, DARK],
];
let ly = 1.75;
layers.forEach(([lbl, hh, fill, fg]) => {
  s.addShape(pres.ShapeType.rect, { x: 0.8, y: ly, w: 6.6, h: hh, fill: { color: fill } });
  s.addText(lbl, { x: 0.95, y: ly, w: 6.3, h: hh, margin: 0, valign: "middle", fontFace: SANS, fontSize: 14, bold: true, color: fg });
  ly += hh + 0.12;
});
card(s, 8.0, 1.55, 4.7, 4.9);
s.addText([
  { text: "Ce que ça implique", options: { bold: true, fontSize: 16, color: INK, breakLine: true } },
  { text: "· Le modèle ne « retient » rien entre deux sessions : tout doit tenir dans la fenêtre.", options: { color: MUTED, breakLine: true } },
  { text: "· Plus la conversation grossit, moins il reste de place pour le code.", options: { color: MUTED, breakLine: true } },
  { text: "· Ordres de grandeur : 8k (2023) → 128k → 262k chez nous.", options: { color: MUTED, breakLine: true } },
  { text: "· Le contexte est une ressource rare → acte 2.", options: { bold: true, color: TEAL } },
], { x: 8.32, y: 1.85, w: 4.1, h: 4.3, margin: 0, fontFace: SANS, fontSize: 14.5, valign: "top", paraSpaceAfter: 9 });
s.addNotes("Contexte (2 min). Le dessin « tiroirs » : tout ce qui est payé à chaque tour. Concept mis en banque : il ressort à l'acte 2 (budget de contexte) et au KV cache.");

// 9 — Sampling / température
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: "Acte 1 — Comprendre" });
s.addText("La température : un dé plus ou moins pipé", { placeholder: "title" });
s.addChart(pres.ChartType.bar, [
  { name: "t = 0,5 (sûr)", labels: ["saute", "dort", "chante", "votate"], values: [78, 15, 5.5, 0.5] },
  { name: "t = 2,0 (créatif)", labels: ["saute", "dort", "chante", "votate"], values: [34, 28, 20, 12] },
], {
  x: 0.6, y: 1.6, w: 7.2, h: 4.7,
  barDir: "col", chartColors: [TEAL, GREEN],
  showTitle: false, showLegend: true, legendPos: "b", legendFontSize: 12, legendColor: INK,
  showValue: true, dataLabelPosition: "outEnd", dataLabelColor: INK, dataLabelFontSize: 11, dataLabelFormatCode: '0.#"%"',
  catAxisLabelColor: INK, catAxisLabelFontSize: 13, catAxisLabelFontFace: "+mn-lt",
  valAxisLabelColor: MUTED, valAxisLabelFontSize: 10, valAxisLabelFontFace: "+mn-lt",
  valAxisMaxVal: 90, valGridLine: { color: "D9E2EC", size: 1 }, catGridLine: { style: "none" },
});
card(s, 8.2, 1.6, 4.5, 4.7);
s.addText([
  { text: "Lire le graphique", options: { bold: true, fontSize: 16, color: INK, breakLine: true } },
  { text: "· t basse : le modèle écrase sa confiance sur un seul token. Répétable, ennuyeux, prévisible.", options: { color: MUTED, breakLine: true } },
  { text: "· t haute : la distribution s'aplatit — « votate » devient possible.", options: { color: MUTED, breakLine: true } },
  { text: "· t = 0 : purement déterministe (le même token à chaque fois).", options: { color: MUTED, breakLine: true } },
  { text: "Code à produire : température basse. Poésie : haute.", options: { bold: true, color: TEAL } },
], { x: 8.52, y: 1.9, w: 3.9, h: 4.1, margin: 0, fontFace: SANS, fontSize: 14, valign: "top", paraSpaceAfter: 9 });
s.addNotes("Sampling (2 min). « votate » n'existe pas — c'est le but : à température haute, un token absurde devient crédible. Le lien avec l'hallucination est fait pour la slide suivante.");

// 10 — Hallucinations
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: "Acte 1 — Comprendre" });
s.addText("L'hallucination n'est pas un bug", { placeholder: "title" });
card(s, 0.6, 1.55, 6.0, 3.4);
s.addText([
  { text: "Ce que le modèle fait", options: { bold: true, fontSize: 17, color: INK, breakLine: true } },
  { text: "Prolonger le plausible. « API la plus probable après cette phrase » ≠ « API qui existe ».", options: { color: MUTED, breakLine: true } },
], { x: 0.92, y: 1.85, w: 5.4, h: 2.8, margin: 0, fontFace: SANS, fontSize: 15, valign: "top", paraSpaceAfter: 8 });
card(s, 6.85, 1.55, 6.0, 3.4);
s.addText([
  { text: "Ce qu'il n'a pas", options: { bold: true, fontSize: 17, color: INK, breakLine: true } },
  { text: "Un mode « je vérifie ». Pas de base de faits à consulter, pas de signal de certitude fiable.", options: { color: MUTED, breakLine: true } },
], { x: 7.17, y: 1.85, w: 5.4, h: 2.8, margin: 0, fontFace: SANS, fontSize: 15, valign: "top", paraSpaceAfter: 8 });
s.addShape(pres.ShapeType.roundRect, { x: 0.6, y: 5.25, w: 12.25, h: 1.25, rectRadius: 0.1, fill: { color: DARK } });
s.addText([
  { text: "D'où la doctrine : ", options: { bold: true, color: GREEN } },
  { text: "on ne demande pas au modèle d'être sûr, on lui donne de quoi vérifier — tests, compilateur, outils. C'est tout l'acte 2.", options: { color: WHITE } },
], { x: 0.95, y: 5.25, w: 11.6, h: 1.25, margin: 0, valign: "middle", fontFace: SANS, fontSize: 17 });
s.addNotes("Hallucinations (2 min). Pas moraliser : expliquer structurellement. La conclusion est la porte vers l'agentique : les tests et les outils sont la réponse outillée au problème probabilitaire.");

// 11 — Entraînement
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: "Acte 1 — Comprendre" });
s.addText("Comment on fabrique un LLM", { placeholder: "title" });
const train = [
  ["1 · Pré-training", "Des billions de pages du web. Objectif unique : prédire le token suivant. Naît un modèle qui « parle », mais qui finit tout.", TINT, INK],
  ["2 · SFT", "Fine-tuning sur conversations exemplaires : on lui apprend le format question → réponse, les outils, le ton.", TINT, INK],
  ["3 · Alignement (RLHF)", "Des humains comparent des réponses ; le modèle apprend à préférer ce qui est utile et honnête.", TINT, INK],
];
train.forEach(([t, d, f, c], i) => {
  const x = 0.6 + i * 4.18;
  card(s, x, 1.7, 3.85, 3.5, f);
  s.addText(t, { x: x + 0.3, y: 2.0, w: 3.25, h: 0.45, margin: 0, fontFace: SERIF, fontSize: 19, bold: true, color: TEAL });
  s.addText(d, { x: x + 0.3, y: 2.55, w: 3.25, h: 2.4, margin: 0, fontFace: SANS, fontSize: 14, color: INK, valign: "top" });
  if (i < 2) arrow(s, x + 3.85, 3.45, x + 4.18, 3.45);
});
s.addText("Un modèle « instruct » que vous téléchargez a passé les trois étapes. Le pré-training coûte des millions ; les deux autres, des semaines. Vous, vous prenez le résultat.", {
  x: 0.6, y: 5.6, w: 12.2, h: 0.9, margin: 0, fontFace: SANS, fontSize: 16, italic: true, color: MUTED, valign: "top",
});
s.addNotes("Entraînement (2 min). Survol — pas de maths. Important : distinguer le modèle brut (complète) du modèle instruct (obéit), et situer ce qu'on télécharge.");

// 12 — Quantification
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: "Acte 1 — Comprendre" });
s.addText("La quantification : 16 Go → 6 Go, presque la même tête", { placeholder: "title" });
s.addChart(pres.ChartType.bar, [
  { name: "Taille du fichier modèle 8B", labels: ["FP16 (brut)", "Q8_0", "Q5_K_M (le nôtre)", "Q4_K_M"], values: [16.0, 8.6, 6.0, 4.8] },
], {
  x: 0.6, y: 1.6, w: 7.0, h: 4.6,
  barDir: "col", chartColors: [MUTED, MUTED, GREEN, MUTED],
  showTitle: false, showLegend: false,
  showValue: true, dataLabelPosition: "outEnd", dataLabelColor: INK, dataLabelFontSize: 12, dataLabelFormatCode: '0.0" Go"',
  catAxisLabelColor: INK, catAxisLabelFontSize: 12, catAxisLabelFontFace: "+mn-lt",
  valAxisLabelColor: MUTED, valAxisLabelFontSize: 10, valAxisLabelFontFace: "+mn-lt",
  valGridLine: { color: "D9E2EC", size: 1 }, catGridLine: { style: "none" },
  dataLabelFontFace: "+mn-lt",
});
card(s, 8.0, 1.6, 4.7, 4.6);
s.addText([
  { text: "Le triangle", options: { bold: true, fontSize: 16, color: INK, breakLine: true } },
  { text: "Taille · Vitesse · Qualité : en réduire un paye les autres.", options: { color: MUTED, breakLine: true } },
  { text: "· Q4-Q5 : la perte de qualité est faible pour un gain énorme en mémoire et vitesse CPU.", options: { color: MUTED, breakLine: true } },
  { text: "· GGUF = le format de llama.cpp, avec les variantes de quantification alignées sur la RAM dispo.", options: { color: MUTED, breakLine: true } },
  { text: "· Le Q5_K_M de la slide : 6,0 Go mesurés sur le disque du serveur.", options: { bold: true, color: TEAL } },
], { x: 8.32, y: 1.9, w: 4.1, h: 4.0, margin: 0, fontFace: SANS, fontSize: 14, valign: "top", paraSpaceAfter: 8 });
s.addNotes("Quantification (3 min). LE pont vers le local : c'est ce qui rend la suite possible. Valeur Q5 mesurée sur disque (6,0 Go), les autres approximatives pour un 8B. Annoncer le live : « on va en télécharger un, là, maintenant ».");

// 13 — Live 1
s = pres.addSlide({ masterName: "MASTER_LIVE", sectionTitle: "Acte 1 — Comprendre" });
liveBadge(s);
s.addText("Hugging Face & llama.cpp, en direct", { placeholder: "title" });
step(s, 1, 0.9, 3.1, 5.4, "La page du modèle", "huggingface.co/unsloth/LFM2.5-8B-A1B-GGUF : les fichiers GGUF par quantification, comme vu slide précédente.", true);
step(s, 2, 0.9, 4.45, 5.4, "hf download, en direct", "On télécharge un petit modèle (~500 Mo) devant vous. Le temps de ma phrase.", true);
step(s, 3, 6.9, 3.1, 5.5, "llama-cli répond", "Sur le CPU du laptop. Pas de clé API, pas de facture, pas de réseau — sauf pour le téléchargement.", true);
s.addShape(pres.ShapeType.roundRect, { x: 6.9, y: 4.6, w: 5.5, h: 1.35, rectRadius: 0.1, fill: { color: CODEBG } });
s.addText([
  { text: "$ hf download unsloth/LFM2.5-8B-A1B-GGUF \\", options: { color: GREEN, breakLine: true } },
  { text: "    --include \"...UD-Q5_K_M.gguf*\" \\", options: { color: CODEFG, breakLine: true } },
  { text: "    --local-dir /models/LFM2.5-8B-A1B", options: { color: CODEFG } },
], { x: 7.15, y: 4.75, w: 5.0, h: 1.05, margin: 0, fontFace: MONO, fontSize: 12, valign: "top" });
actDots(s, 0, 6.6);
s.addNotes("LIVE 1 (5-7 min). Script détaillé : presentation/SCENARIOS.md. Messages : un LLM se télécharge comme un paquet ; il tourne sur un CPU. Filet : captures HF + terminal si le réseau tombe.");

/* =====================================================================
   SECTION — ACTE 2 : AGIR
===================================================================== */
pres.addSection({ title: "Acte 2 — Agir" });

// 14 — Diviseur acte 2
s = pres.addSlide({ masterName: "MASTER_DIVISEUR", sectionTitle: "Acte 2 — Agir" });
s.addText("ACTE 2 · AGIR", { x: 0.9, y: 2.15, w: 10, h: 0.4, margin: 0, fontFace: SANS, fontSize: 15, bold: true, color: GREEN, charSpacing: 3 });
s.addText("Développement agentique : les harnais", { placeholder: "title" });
actDots(s, 1, 4.7);
s.addNotes("Transition : « ça discute — on l'a vu. Mais un chat ne développe rien. Ce qui manque : la boucle. »");

// 15 — La boucle
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: "Acte 2 — Agir" });
s.addText("Du chat à l'agent : la boucle", { placeholder: "title" });
chip(s, "Objectif\n« rends les tests verts »", 0.6, 3.0, 2.35, { h: 1.0, bold: true, fontSize: 13 });
arrow(s, 3.0, 3.5, 3.55, 3.5);
s.addShape(pres.ShapeType.roundRect, { x: 3.6, y: 3.0, w: 2.0, h: 1.0, rectRadius: 0.5, fill: { color: DARK } });
s.addText("LLM", { x: 3.6, y: 3.0, w: 2.0, h: 1.0, align: "center", valign: "middle", margin: 0, fontFace: SANS, fontSize: 20, bold: true, color: WHITE });
arrow(s, 5.65, 3.5, 6.2, 3.5);
chip(s, "Tool call\nbash · edit · read", 6.25, 3.0, 2.2, { h: 1.0, fill: GREEN, bold: true, fontSize: 13, color: DARK });
arrow(s, 8.5, 3.5, 9.05, 3.5);
chip(s, "Outil\nexécute vraiment", 9.1, 3.0, 2.2, { h: 1.0, bold: true, fontSize: 13 });
s.addShape(pres.ShapeType.line, { x: 10.2, y: 4.05, w: 0, h: 1.0, line: { color: TEAL, width: 2 } });
s.addShape(pres.ShapeType.line, { x: 10.2, y: 5.05, w: -6.0, h: 0, line: { color: TEAL, width: 2 } });
s.addShape(pres.ShapeType.line, { x: 4.2, y: 5.05, w: 0, h: -1.1, line: { color: TEAL, width: 2, endArrowType: "triangle" } });
s.addText("résultat (sortie des tests, contenu du fichier…)", {
  x: 5.2, y: 4.65, w: 4.2, h: 0.35, margin: 0, align: "center", fontFace: SANS, fontSize: 12, italic: true, color: MUTED,
});
s.addText("réponse finale", { x: 11.35, y: 2.92, w: 1.7, h: 0.35, margin: 0, align: "center", fontFace: SANS, fontSize: 12, italic: true, color: MUTED });
arrow(s, 11.3, 3.5, 12.0, 3.5);
card(s, 0.6, 5.8, 12.25, 1.0);
s.addText([
  { text: "L'innovation n'est pas dans le LLM — c'est le même moteur qu'à l'acte 1. ", options: { color: INK } },
  { text: "Tout est dans la boucle : un modèle + des outils + un critère de réussite mesurable.", options: { bold: true, color: TEAL } },
], { x: 0.95, y: 5.8, w: 11.6, h: 1.0, margin: 0, valign: "middle", fontFace: SANS, fontSize: 16 });
s.addNotes("La boucle (3 min). LE diagramme du talk — le dessiner du doigt à l'écran. Insister : le LLM ne change pas, c'est le montage autour qui fait un agent. Le critère mesurable (tests) prépare le live.");

// 16 — Tool calling
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: "Acte 2 — Agir" });
s.addText("Tool calling : appuyer sur des boutons", { placeholder: "title" });
s.addText("Le harnais déclare ses outils (schéma JSON) ; le modèle ne renvoie pas du texte libre, mais un appel structuré :", {
  x: 0.6, y: 1.5, w: 12.1, h: 0.65, margin: 0, fontFace: SANS, fontSize: 16, color: INK, valign: "top",
});
codeBlock(s, 0.6, 2.3, 7.2, 2.5, [
  { t: "{", c: CODEFG },
  { t: '  "name": "bash",', c: GREEN },
  { t: '  "input": {', c: CODEFG },
  { t: '    "command": "python3 -m unittest"', c: CODEFG },
  { t: "  }", c: CODEFG },
  { t: "}", c: CODEFG },
], { fontSize: 14 });
card(s, 8.1, 2.3, 4.6, 2.5);
s.addText([
  { text: "Le modèle n'exécute rien.", options: { bold: true, fontSize: 15, color: INK, breakLine: true } },
  { text: "C'est le harnais qui lance la commande, récupère la sortie et la réinjecte dans le contexte du tour suivant.", options: { color: MUTED } },
], { x: 8.42, y: 2.55, w: 4.0, h: 2.0, margin: 0, fontFace: SANS, fontSize: 14, valign: "top", paraSpaceAfter: 8 });
card(s, 0.6, 5.15, 12.1, 1.6, DARK);
s.addText([
  { text: "Attention : ", options: { bold: true, color: AMBER } },
  { text: "tous les modèles n'y arrivent pas aussi bien. Un petit modèle local peut rater ses appels d'outils — c'est un critère de choix, pas un détail. (On vérifie ça au live suivant.)", options: { color: WHITE } },
], { x: 0.95, y: 5.15, w: 11.4, h: 1.6, margin: 0, valign: "middle", fontFace: SANS, fontSize: 16 });
s.addNotes("Tool calling (2-3 min). Montrer le JSON : c'est exactement ce qui défilera au live 2. La mise en garde est honnête et crédibilise : les capacités de tool calling varient beaucoup entre modèles.");

// 17 — Contexte ressource rare
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: "Acte 2 — Agir" });
s.addText("Le contexte est la ressource rare", { placeholder: "title" });
s.addText("Rappel de l'acte 1 : chaque tour repaie toute la fenêtre. Un agent, c'est une conversation qui grossit vite :", {
  x: 0.6, y: 1.5, w: 12.1, h: 0.6, margin: 0, fontFace: SANS, fontSize: 16, color: INK, valign: "top",
});
const budget = [
  ["Prompt système + AGENTS.md", 2.6, DARK, WHITE],
  ["Outils déclarés + résultats des tours précédents", 3.9, TEAL, WHITE],
  ["Fichiers lus (le code !)", 3.0, GREEN, DARK],
  ["Place restante pour raisonner", 2.4, TINT, MUTED],
];
let bx = 0.6;
budget.forEach(([lbl, wd, fill, fg]) => {
  s.addShape(pres.ShapeType.rect, { x: bx, y: 2.35, w: wd, h: 0.9, fill: { color: fill } });
  s.addText(lbl, { x: bx + 0.1, y: 2.35, w: wd - 0.2, h: 0.9, margin: 0, valign: "middle", fontFace: SANS, fontSize: 12, bold: true, color: fg });
  bx += wd;
});
s.addShape(pres.ShapeType.line, { x: 0.6, y: 2.2, w: 11.9, h: 0, line: { color: INK, width: 1.5 } });
s.addText("fenêtre de contexte (262 144 tokens ici)", { x: 0.6, y: 3.35, w: 11.9, h: 0.35, margin: 0, align: "center", fontFace: SANS, fontSize: 12, italic: true, color: MUTED });
card(s, 0.6, 4.15, 12.25, 2.4);
s.addText([
  { text: "Ce que font les bons harnais (et les bons drivers)", options: { bold: true, fontSize: 16, color: INK, breakLine: true } },
  { text: "· Lisent peu : grep avant lecture complète, extraient plutôt que verser.", options: { color: MUTED, breakLine: true } },
  { text: "· Compactent : résument les tours anciens pour libérer de la fenêtre.", options: { color: MUTED, breakLine: true } },
  { text: "· Externalisent : notes, fichiers, skills — ce qui doit survivre sort de la conversation.", options: { color: MUTED, breakLine: true } },
  { text: "· Un AGENTS.md court et précis bat un pavé : chaque ligne est payée à chaque tour.", options: { bold: true, color: TEAL } },
], { x: 0.95, y: 4.4, w: 11.6, h: 2.0, margin: 0, fontFace: SANS, fontSize: 14.5, valign: "top", paraSpaceAfter: 7 });
s.addNotes("Contexte ressource rare (2-3 min). La barre : le budget réel d'un agent en pleine tâche. C'est LE conseil pratique de l'acte — les gens peuvent l'appliquer dès demain avec n'importe quel harnais.");

// 18 — KV cache + vitesse
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: "Acte 2 — Agir" });
s.addText("Pourquoi ça ralentit — et à quelle vitesse ça va", { placeholder: "title" });
card(s, 0.6, 1.6, 7.0, 4.8);
s.addText([
  { text: "Le KV cache, en une image", options: { bold: true, fontSize: 17, color: INK, breakLine: true } },
  { text: "Pour ne pas recalculer tout le passé à chaque token, le modèle met en mémoire ses calculs intermédiaires (les clés et valeurs d'attention).", options: { color: MUTED, breakLine: true } },
  { text: "· Plus la conversation est longue, plus le cache est gros : il mange la mémoire vive avant la fenêtre théorique.", options: { color: MUTED, breakLine: true } },
  { text: "· Le premier token d'une longue requête est lent (prefill) ; les suivants sont rapides (décode).", options: { color: MUTED, breakLine: true } },
  { text: "· Un agent qui lit dix fichiers « paye » ces dix fichiers à chaque tour suivant.", options: { color: MUTED } },
], { x: 0.95, y: 1.9, w: 6.3, h: 4.2, margin: 0, fontFace: SANS, fontSize: 15, valign: "top", paraSpaceAfter: 9 });
card(s, 7.95, 1.6, 4.8, 2.2, DARK);
s.addText("≈ 35 tok/s", { x: 7.95, y: 1.85, w: 4.8, h: 0.95, margin: 0, align: "center", fontFace: SERIF, fontSize: 44, bold: true, color: GREEN });
s.addText("génération — llama-server sur CPU, mesuré", { x: 8.2, y: 2.85, w: 4.3, h: 0.5, margin: 0, align: "center", fontFace: SANS, fontSize: 13, color: ON_DARK_MUT });
card(s, 7.95, 4.05, 4.8, 2.35);
s.addText("262 144", { x: 7.95, y: 4.3, w: 4.8, h: 0.85, margin: 0, align: "center", fontFace: SERIF, fontSize: 40, bold: true, color: TEAL });
s.addText("tokens de fenêtre sur notre serveur local — de quoi tenir une vraie session agentique", { x: 8.25, y: 5.2, w: 4.2, h: 1.0, margin: 0, align: "center", fontFace: SANS, fontSize: 13, color: MUTED });
s.addNotes("KV cache (2 min). Payer la banque d'acte 1 : la fenêtre a un coût mémoire. Les deux stats sont mesurées sur NOTRE matériel (35 tok/s au benchmark API) — pas des chiffres brochure.");

// 19 — Le branchement
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: "Acte 2 — Agir" });
s.addText("Le branchement : dix lignes de configuration", { placeholder: "title" });
codeBlock(s, 0.6, 1.6, 6.6, 4.0, [
  { t: '"providers": {', c: CODEFG },
  { t: '  "llama.cpp": {', c: GREEN },
  { t: '    "package": "…/openai-compatible",', c: CODEFG },
  { t: '    "settings": {', c: CODEFG },
  { t: '      "baseURL":', c: CODEFG },
  { t: '        "http://192.168.0.110:8080/v1"', c: AMBER },
  { t: '    }', c: CODEFG },
  { t: "  }", c: CODEFG },
  { t: "}", c: CODEFG },
], { fontSize: 13 });
s.addText("opencode.jsonc — extrait", { x: 0.6, y: 5.7, w: 6.6, h: 0.35, margin: 0, align: "center", fontFace: SANS, fontSize: 12, italic: true, color: MUTED });
s.addShape(pres.ShapeType.roundRect, { x: 7.7, y: 2.1, w: 2.3, h: 1.3, rectRadius: 0.12, fill: { color: TINT } });
s.addText("Laptop\n(démo, OpenCode)", { x: 7.7, y: 2.1, w: 2.3, h: 1.3, align: "center", valign: "middle", margin: 0, fontFace: SANS, fontSize: 13, bold: true, color: INK });
arrow(s, 10.05, 2.75, 10.75, 2.75);
s.addShape(pres.ShapeType.roundRect, { x: 10.8, y: 2.1, w: 2.0, h: 1.3, rectRadius: 0.12, fill: { color: DARK } });
s.addText("Serveur CPU\n192.168.0.110", { x: 10.8, y: 2.1, w: 2.0, h: 1.3, align: "center", valign: "middle", margin: 0, fontFace: SANS, fontSize: 12, bold: true, color: WHITE });
s.addText("API compatible OpenAI, sur le LAN", { x: 9.5, y: 3.55, w: 3.6, h: 0.4, margin: 0, align: "center", fontFace: SANS, fontSize: 12, italic: true, color: MUTED });
card(s, 7.7, 4.35, 5.1, 2.0);
s.addText([
  { text: "Le cloud, remplacé par :", options: { bold: true, fontSize: 15, color: INK, breakLine: true } },
  { text: "une adresse IP locale. N'importe quel harnais qui parle l'API OpenAI se branche ici — mêmes outils, mêmes usages, données qui ne sortent pas.", options: { color: MUTED } },
], { x: 8.0, y: 4.6, w: 4.5, h: 1.6, margin: 0, fontFace: SANS, fontSize: 14, valign: "top", paraSpaceAfter: 8 });
s.addNotes("Branchement (2 min). Démystifier l'intégration : pas d'SDK maison, pas de compte — une URL. C'est LE slide « je peux faire pareil ».");

// 20 — Live 2
s = pres.addSlide({ masterName: "MASTER_LIVE", sectionTitle: "Acte 2 — Agir" });
liveBadge(s);
s.addText("OpenCode + modèle local : 3 tests rouges", { placeholder: "title" });
step(s, 1, 0.9, 3.1, 5.6, "Le constat", "python3 -m unittest dans demo/ : 9 tests, 3 échecs. Un bug de facturation. Je ne dis pas où.", true);
step(s, 2, 0.9, 4.55, 5.6, "L'agent travaille", "« Les tests sont rouges, rends-les verts. » — lire, diagnostiquer, éditer, revérifier. Commenter les tool calls en direct.", true);
step(s, 3, 6.9, 3.1, 5.5, "git diff", "Une valeur a changé : le palier de remise à 9 % au lieu de 10 %... d'après le code. La docstring, elle, disait la vérité.", true);
card(s, 6.9, 4.75, 5.5, 1.6, CODEBG);
s.addText([
  { text: "L'agent qui fait ça tourne sur le serveur local,", options: { color: GREEN, breakLine: true } },
  { text: "à 35 tokens/s. La session qui a PRÉPARÉ cette présentation aussi.", options: { color: WHITE } },
], { x: 7.2, y: 4.95, w: 4.95, h: 1.25, margin: 0, fontFace: SANS, fontSize: 15, bold: true, valign: "top" });
actDots(s, 1, 6.6);
s.addNotes("LIVE 2 (10-12 min). Le moment clé. Script détaillé dans SCENARIOS.md. Ne PAS révéler le bug avant le git diff final. Punchline méta : cette présentation elle-même a été écrite par un agent sur ce modèle local.");

/* =====================================================================
   SECTION — ACTE 3 : ÉTENDRE
===================================================================== */
pres.addSection({ title: "Acte 3 — Étendre" });

// 21 — Diviseur acte 3
s = pres.addSlide({ masterName: "MASTER_DIVISEUR", sectionTitle: "Acte 3 — Étendre" });
s.addText("ACTE 3 · ÉTENDRE", { x: 0.9, y: 2.15, w: 10, h: 0.4, margin: 0, fontFace: SANS, fontSize: 15, bold: true, color: GREEN, charSpacing: 3 });
s.addText("Skills, MCP, paysage", { placeholder: "title" });
actDots(s, 2, 4.7);
s.addNotes("Transition : l'agent sait lire, éditer, exécuter. Comment lui apprendre NOS façons de faire, sans re-entraîner quoi que ce soit ?");

// 22 — Skills
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: "Acte 3 — Étendre" });
s.addText("Une skill = un fichier markdown", { placeholder: "title" });
codeBlock(s, 0.6, 1.6, 6.4, 4.6, [
  { t: "---", c: "A9B7C6" },
  { t: "name: explain-file", c: GREEN, b: true },
  { t: "description: Explique un fichier", c: CODEFG },
  { t: "  de code (rôle, structure,", c: CODEFG },
  { t: "  subtilités, limites)", c: CODEFG },
  { t: "---", c: "A9B7C6" },
  { t: "1. Lis le fichier en entier.", c: CODEFG },
  { t: "2. Rends : Rôle, Structure,", c: CODEFG },
  { t: "   Subtilités, Limites.", c: CODEFG },
  { t: "3. Moins de 20 lignes.", c: CODEFG },
], { fontSize: 13 });
s.addText(".opencode/skills/explain-file/SKILL.md", { x: 0.6, y: 6.3, w: 6.4, h: 0.35, margin: 0, align: "center", fontFace: SANS, fontSize: 12, italic: true, color: MUTED });
card(s, 7.5, 1.6, 5.25, 4.9);
s.addText([
  { text: "Comment ça marche", options: { bold: true, fontSize: 16, color: INK, breakLine: true } },
  { text: "· Le harnais liste name + description à l'agent — c'est tout ce qui coûte du contexte au repos.", options: { color: MUTED, breakLine: true } },
  { text: "· Quand la situation colle, l'agent charge le corps du fichier et l'applique.", options: { color: MUTED, breakLine: true } },
  { text: "· Progressive disclosure : la connaissance est versée à la demande, pas en permanence.", options: { color: MUTED, breakLine: true } },
  { text: "· Rien à re-entraîner, rien à déployer. Un fichier. Git-able, partageable, relisible dans dix ans.", options: { bold: true, color: TEAL } },
], { x: 7.82, y: 1.9, w: 4.6, h: 4.3, margin: 0, fontFace: SANS, fontSize: 14.5, valign: "top", paraSpaceAfter: 9 });
s.addNotes("Skills (2-3 min). Montrer le VRAI fichier de la démo. Le point qui claque pour des devs : c'est du markdown versionné, pas de la config propriétaire.");

// 23 — Live 3
s = pres.addSlide({ masterName: "MASTER_LIVE", sectionTitle: "Acte 3 — Étendre" });
liveBadge(s);
s.addText("Écrire une skill en direct", { placeholder: "title" });
step(s, 1, 0.9, 3.1, 5.6, "mkdir + SKILL.md", "Un dossier, un fichier, le frontmatter (name + description). On le tape devant vous.", true);
step(s, 2, 0.9, 4.55, 5.6, "Quatre consignes", "Rôle · Structure · Subtilités · Limites. La skill entière fait quinze lignes.", true);
step(s, 3, 6.9, 3.1, 5.5, "L'invocation", "« explique demo/pricing.py » — l'agent voit la nouvelle skill, la charge, l'applique.", true);
s.addShape(pres.ShapeType.roundRect, { x: 6.9, y: 4.75, w: 5.5, h: 1.2, rectRadius: 0.1, fill: { color: CODEBG } });
s.addText([
  { text: "> explique demo/pricing.py", options: { color: GREEN, breakLine: true } },
  { text: "skill: explain-file chargée ✓", options: { color: CODEFG } },
], { x: 7.15, y: 4.95, w: 5.0, h: 0.85, margin: 0, fontFace: MONO, fontSize: 13, valign: "top" });
actDots(s, 2, 6.6);
s.addNotes("LIVE 3 (5 min). Frappe en direct — si ça dérape, git checkout de la version committée (déjà faite, cf. repo). Vérifié : OpenCode détecte la skill sans redémarrage.");

// 24 — MCP
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: "Acte 3 — Étendre" });
s.addText("MCP : le port USB des outils", { placeholder: "title" });
s.addShape(pres.ShapeType.roundRect, { x: 5.15, y: 3.0, w: 3.0, h: 1.2, rectRadius: 0.15, fill: { color: DARK } });
s.addText("Harnais\n(OpenCode…)", { x: 5.15, y: 3.0, w: 3.0, h: 1.2, align: "center", valign: "middle", margin: 0, fontFace: SANS, fontSize: 15, bold: true, color: WHITE });
const mcpNodes = [
  ["Repos Git", 1.0, 1.7], ["Tickets / tracker", 5.35, 1.55], ["Bases de données", 9.9, 1.7],
  ["Navigateur", 1.0, 4.9], ["Fichiers d'entreprise", 5.15, 5.15], ["API métier", 9.9, 4.9],
];
mcpNodes.forEach(([lbl, x, y]) => {
  chip(s, lbl, x, y, 2.5, { h: 0.62, bold: true, fontSize: 13, line: TEAL, lineW: 1, fill: WHITE });
  const cx = x + 1.25, cy = y + 0.31;
  arrow(s, 6.65, 3.6, cx, cy, { width: 1.5, color: GREEN });
});
s.addText("Un serveur MCP expose des outils ; tous les harnais qui parlent MCP les voient. Standard ouvert, indépendant du vendeur.", {
  x: 0.6, y: 6.0, w: 12.2, h: 0.8, margin: 0, align: "center", fontFace: SANS, fontSize: 15, color: MUTED, valign: "top",
});
s.addNotes("MCP (2 min, survol). L'analogie USB suffit pour une session d'une heure. Message : outiller un agent sur VOS systèmes est un problème résolu, pas une usine à gaz à réinventer.");

// 25 — Paysage harnais
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: "Acte 3 — Étendre" });
s.addText("Le paysage des harnais (octobre 2026)", { placeholder: "title" });
const rows = [
  [{ text: "Outil", options: { bold: true, color: WHITE, fill: { color: DARK } } }, { text: "Interface", options: { bold: true, color: WHITE, fill: { color: DARK } } }, { text: "Code", options: { bold: true, color: WHITE, fill: { color: DARK } } }, { text: "Modèle local", options: { bold: true, color: WHITE, fill: { color: DARK } } }],
  [{ text: "OpenCode", options: { bold: true } }, "terminal + IDE", "open source", { text: "oui (comme ici)", options: { bold: true, color: GREEN } }],
  [{ text: "Claude Code", options: { bold: true } }, "terminal", "propriétaire", "oui (serveur compatible)"],
  [{ text: "Codex CLI", options: { bold: true } }, "terminal", "open source", "oui (provider custom)"],
  [{ text: "Gemini CLI", options: { bold: true } }, "terminal", "open source", { text: "partiel", options: { color: AMBER, bold: true } }],
  [{ text: "Cursor", options: { bold: true } }, "IDE", "propriétaire", { text: "non (cloud d'abord)", options: { color: "C0392B", bold: true } }],
  [{ text: "Cline", options: { bold: true } }, "extension VS Code", "open source", "oui"],
];
s.addTable(rows, {
  x: 0.6, y: 1.7, w: 12.1, colW: [2.7, 3.1, 2.7, 3.6],
  fontFace: SANS, fontSize: 14, color: INK, valign: "middle",
  border: { type: "solid", color: "D3DCE6", pt: 0.75 },
  fill: { color: WHITE }, rowH: 0.55,
  autoPage: false,
});
s.addText("Terminal ↔ IDE, vertical ↔ éditeur étendu : la vraie ligne de partage est la dernière colonne.", {
  x: 0.6, y: 6.15, w: 12.2, h: 0.5, margin: 0, align: "center", fontFace: SANS, fontSize: 15, italic: true, color: TEAL,
});
s.addNotes("Paysage (2 min). Ne pas faire la guerre des cloches : le critère qui compte pour CE public est la colonne locale. Statuts à revérifier la veille — l'écosystème bouge vite.");

// 26 — Frameworks & standards
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: "Acte 3 — Étendre" });
s.addText("Frameworks & standards — sans obligation", { placeholder: "title" });
card(s, 0.6, 1.6, 6.0, 3.9);
s.addText([
  { text: "Frameworks d'agents", options: { bold: true, fontSize: 17, color: TEAL, breakLine: true } },
  { text: "LangChain / LangGraph · CrewAI · AutoGen · PydanticAI", options: { bold: true, color: INK, breakLine: true } },
  { text: "Pour CONSTRUIRE votre propre agent dans du code : workflows multi-agents, routage, états durables. Pertinent quand vous vendez de l'agentique — pas pour coder au quotidien.", options: { color: MUTED } },
], { x: 0.95, y: 1.9, w: 5.4, h: 3.3, margin: 0, fontFace: SANS, fontSize: 14.5, valign: "top", paraSpaceAfter: 9 });
card(s, 6.85, 1.6, 6.0, 3.9);
s.addText([
  { text: "Standards ouverts", options: { bold: true, fontSize: 17, color: TEAL, breakLine: true } },
  { text: "MCP · AGENTS.md · format Agent Skills", options: { bold: true, color: INK, breakLine: true } },
  { text: "Des conventions, pas des bibliothèques : les outils se conforment, vous changez de harnais sans rien perdre. Ce sont eux qui durent.", options: { color: MUTED } },
], { x: 7.2, y: 1.9, w: 5.4, h: 3.3, margin: 0, fontFace: SANS, fontSize: 14.5, valign: "top", paraSpaceAfter: 9 });
s.addShape(pres.ShapeType.roundRect, { x: 0.6, y: 5.8, w: 12.25, h: 1.0, rectRadius: 0.1, fill: { color: DARK } });
s.addText([
  { text: "Pour démarrer, rien de tout ça n'est requis : ", options: { color: WHITE } },
  { text: "un harnais + un modèle local. Le reste est optionnel.", options: { bold: true, color: GREEN } },
], { x: 0.95, y: 5.8, w: 11.6, h: 1.0, margin: 0, valign: "middle", fontFace: SANS, fontSize: 17 });
s.addNotes("Frameworks (2 min). Dégonfler l'anxiété technique : on n'a PAS besoin de LangChain pour coder avec un agent. Distinguer construire un produit agentique vs développer avec un agent.");

/* =====================================================================
   SECTION — CLÔTURE
===================================================================== */
pres.addSection({ title: "Clôture" });

// 27 — Trois modèles mentaux
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: "Clôture" });
s.addText("Trois modèles mentaux à emporter", { placeholder: "title" });
const mm = [
  ["1", "Machine à prédire", "Le token suivant, encore et encore. L'hallucination est structurelle : on outille la vérification, on ne la demande pas au modèle."],
  ["2", "La boucle", "Un agent = LLM + outils + critère mesurable. Le LLM ne change rien ; c'est le montage qui développe."],
  ["3", "Contexte rare", "Chaque token dans la fenêtre est payé à chaque tour. Bien coder avec un agent, c'est gérer ce budget."],
];
mm.forEach(([n, t, d], i) => {
  const x = 0.6 + i * 4.18;
  card(s, x, 1.6, 3.85, 4.4);
  s.addText(n, { x: x + 0.3, y: 1.85, w: 1.0, h: 0.9, margin: 0, fontFace: SERIF, fontSize: 48, bold: true, color: GREEN });
  s.addText(t, { x: x + 0.3, y: 2.85, w: 3.25, h: 0.5, margin: 0, fontFace: SERIF, fontSize: 20, bold: true, color: INK });
  s.addText(d, { x: x + 0.3, y: 3.45, w: 3.25, h: 2.3, margin: 0, fontFace: SANS, fontSize: 14, color: MUTED, valign: "top" });
});
s.addNotes("Synthèse (2 min). Une minute par modèle. Si le public ne retient que ces trois phrases, le talk a réussi.");

// 28 — RIEN
s = pres.addSlide({ masterName: "MASTER_TITRE", sectionTitle: "Clôture" });
s.addText("Bilan confidentiel — l'inventaire de la journée :", {
  x: 0.9, y: 1.75, w: 11.5, h: 0.6, margin: 0, fontFace: SANS, fontSize: 22, color: ON_DARK_MUT,
});
s.addText("RIEN.", {
  x: 0.9, y: 2.3, w: 11.5, h: 2.3, margin: 0, fontFace: SERIF, fontSize: 120, bold: true, color: GREEN,
});
s.addText("Vos prompts, le code de la démo, les tests, la skill, les correctifs de l'agent :\ntout est resté sur les machines de cette salle.", {
  x: 0.9, y: 5.0, w: 11.5, h: 1.0, margin: 0, fontFace: SANS, fontSize: 20, color: WHITE,
});
s.addNotes("Punchline (1-2 min). Laisser le mot « RIEN » seul à l'écran. Rappel discret du hook d'ouverture : « ce que vous collez dans un chat cloud, aujourd'hui, n'est jamais sorti d'ici ».");

// 29 — Chez vous ce soir
s = pres.addSlide({ masterName: "MASTER_CONTENU", sectionTitle: "Clôture" });
s.addText("Chez vous ce soir — trois commandes", { placeholder: "title" });
codeBlock(s, 0.6, 1.6, 7.6, 3.6, [
  { t: "$ git clone <le repo de cette présentation>", c: GREEN },
  { t: "$ docker compose build", c: CODEFG },
  { t: "$ docker compose run --rm llama bash", c: CODEFG },
  { t: "  # hf download <modèle> --local-dir /models/<modèle>", c: "A9B7C6" },
  { t: "  # llama-cli -m /models/<modèle>/<fichier>.gguf", c: "A9B7C6" },
], { fontSize: 14 });
card(s, 0.6, 5.5, 7.6, 1.3);
s.addText([
  { text: "Le repo contient tout : ", options: { bold: true, color: INK } },
  { text: "conteneur llama.cpp, la démo avec son bug re-verdissable, la skill explain-file, le plan et les scripts des lives.", options: { color: MUTED } },
], { x: 0.95, y: 5.65, w: 7.0, h: 1.0, margin: 0, valign: "top", fontFace: SANS, fontSize: 14.5 });
s.addShape(pres.ShapeType.roundRect, { x: 8.9, y: 1.7, w: 3.6, h: 3.6, rectRadius: 0.1, fill: { color: WHITE }, line: { color: INK, width: 1.5, dashType: "dash" } });
s.addText("QR → repo public\ngithub.com/<vous>/llama\n\n(à générer avant le jour J)", {
  x: 9.1, y: 1.95, w: 3.2, h: 3.1, margin: 0, align: "center", valign: "middle", fontFace: SANS, fontSize: 14, color: MUTED,
});
s.addNotes("Take-away (1-2 min). Le QR mène au repo public — LE cadeau. Insister : la démo est rejouable chez soi, bug compris.");

// 30 — Q&A
s = pres.addSlide({ masterName: "MASTER_TITRE", sectionTitle: "Clôture" });
s.addText("Merci.", { placeholder: "title" });
s.addText("Place aux questions — et si le serveur tient, à une démo improvisée.", {
  x: 0.9, y: 4.3, w: 11.5, h: 0.6, margin: 0, fontFace: SANS, fontSize: 20, color: ON_DARK_MUT,
});
s.addText("repo : github.com/<vous>/llama · licence MIT · tout est rejouable", {
  x: 0.9, y: 6.6, w: 11.5, h: 0.4, margin: 0, fontFace: SANS, fontSize: 13, color: ON_DARK_MUT,
});
s.addNotes("Q&A. Rester disponible pour prolonger les lives à la demande (« et si on essayait avec VOTRE projet ? »).");

pres.writeFile({ fileName: "llm-agentique-local.pptx" }).then(() => console.log("OK écrit"));
