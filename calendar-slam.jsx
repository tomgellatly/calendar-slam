import React, { useState, useMemo, useEffect } from "react";

// ============================================================================
// CALENDAR SLAM — prototype
// Spin a real player + era, draft ONE attribute, repeat. Build a composite
// player and find out whether it can win all four majors in a single year.
// ============================================================================

// --- Attribute definitions (the "shot card" slots you fill) -----------------
const ATTRS = [
  { key: "serve", label: "Serve" },
  { key: "return", label: "Return" },
  { key: "forehand", label: "Forehand" },
  { key: "backhand", label: "Backhand" },
  { key: "net", label: "Net game" },
  { key: "movement", label: "Movement" },
  { key: "defence", label: "Defence" },
  { key: "stamina", label: "Stamina" },
  { key: "mental", label: "Mental" },
  { key: "touch", label: "Touch / drop shot" },
];

// --- The four majors, in calendar order, with surface ------------------------
const SLAMS = [
  { key: "ao", name: "Australian Open", surface: "Hard", short: "AO" },
  { key: "rg", name: "Roland Garros", surface: "Clay", short: "RG" },
  { key: "wim", name: "Wimbledon", surface: "Grass", short: "W" },
  { key: "uso", name: "US Open", surface: "Hard", short: "US" },
];

// How much each attribute matters on each surface (the heart of the sim).
// Clay rewards movement/defence/stamina; grass rewards serve/net; hard is even.
const SURFACE_WEIGHTS = {
  Hard: { serve: 1.2, return: 1.1, forehand: 1.1, backhand: 1.0, net: 0.9, movement: 1.0, defence: 1.0, stamina: 1.0, mental: 1.1, touch: 0.8 },
  Clay: { serve: 0.8, return: 1.2, forehand: 1.1, backhand: 1.0, net: 0.7, movement: 1.3, defence: 1.3, stamina: 1.3, mental: 1.1, touch: 1.0 },
  Grass: { serve: 1.4, return: 0.9, forehand: 1.0, backhand: 0.9, net: 1.3, movement: 1.0, defence: 0.8, stamina: 0.8, mental: 1.1, touch: 1.1 },
};

// --- Player pool. Ratings are illustrative placeholders, NOT real data. ------
// In production these derive from Jeff Sackmann's tennis_atp / tennis_wta stats.
// Player-only (no specific season) keeps it accessible.
const POOL = [
  { name: "Pete Sampras", stats: { serve: 97, return: 78, forehand: 90, backhand: 84, net: 95, movement: 86, defence: 80, stamina: 84, mental: 92, touch: 88 } },
  { name: "Andre Agassi", stats: { serve: 80, return: 96, forehand: 93, backhand: 92, net: 78, movement: 85, defence: 88, stamina: 86, mental: 84, touch: 80 } },
  { name: "Roger Federer", stats: { serve: 92, return: 86, forehand: 97, backhand: 84, net: 92, movement: 95, defence: 88, stamina: 90, mental: 93, touch: 96 } },
  { name: "Rafael Nadal", stats: { serve: 85, return: 92, forehand: 98, backhand: 88, net: 82, movement: 96, defence: 97, stamina: 98, mental: 97, touch: 84 } },
  { name: "Novak Djokovic", stats: { serve: 88, return: 99, forehand: 92, backhand: 97, net: 84, movement: 97, defence: 96, stamina: 96, mental: 95, touch: 86 } },
  { name: "Ivan Lendl", stats: { serve: 88, return: 84, forehand: 94, backhand: 86, net: 76, movement: 84, defence: 86, stamina: 92, mental: 90, touch: 74 } },
  { name: "Boris Becker", stats: { serve: 95, return: 80, forehand: 88, backhand: 82, net: 93, movement: 82, defence: 78, stamina: 82, mental: 86, touch: 82 } },
  { name: "Stefan Edberg", stats: { serve: 89, return: 82, forehand: 80, backhand: 88, net: 97, movement: 90, defence: 84, stamina: 84, mental: 85, touch: 90 } },
  { name: "Bjorn Borg", stats: { serve: 86, return: 88, forehand: 92, backhand: 90, net: 80, movement: 94, defence: 93, stamina: 96, mental: 96, touch: 82 } },
  { name: "John McEnroe", stats: { serve: 87, return: 86, forehand: 84, backhand: 82, net: 96, movement: 88, defence: 82, stamina: 80, mental: 78, touch: 98 } },
  { name: "Andy Murray", stats: { serve: 84, return: 94, forehand: 86, backhand: 90, net: 85, movement: 93, defence: 95, stamina: 92, mental: 84, touch: 90 } },
  { name: "Stan Wawrinka", stats: { serve: 88, return: 84, forehand: 90, backhand: 96, net: 80, movement: 82, defence: 82, stamina: 84, mental: 82, touch: 84 } },
  { name: "Juan M. del Potro", stats: { serve: 91, return: 82, forehand: 98, backhand: 80, net: 78, movement: 78, defence: 80, stamina: 82, mental: 84, touch: 72 } },
  { name: "Goran Ivanisevic", stats: { serve: 99, return: 70, forehand: 82, backhand: 76, net: 86, movement: 76, defence: 70, stamina: 78, mental: 74, touch: 76 } },
  { name: "Gustavo Kuerten", stats: { serve: 84, return: 84, forehand: 93, backhand: 86, net: 78, movement: 88, defence: 90, stamina: 90, mental: 86, touch: 88 } },
  { name: "Marat Safin", stats: { serve: 93, return: 86, forehand: 92, backhand: 90, net: 82, movement: 84, defence: 82, stamina: 80, mental: 70, touch: 80 } },
  // Current era — draftable shots from today's tour
  { name: "Jannik Sinner", stats: { serve: 90, return: 92, forehand: 95, backhand: 94, net: 82, movement: 92, defence: 90, stamina: 92, mental: 93, touch: 80 } },
  { name: "Carlos Alcaraz", stats: { serve: 88, return: 90, forehand: 96, backhand: 88, net: 90, movement: 97, defence: 92, stamina: 93, mental: 90, touch: 95 } },
  { name: "Novak Djokovic", stats: { serve: 88, return: 99, forehand: 92, backhand: 97, net: 84, movement: 96, defence: 97, stamina: 94, mental: 96, touch: 88 } },
  { name: "Alexander Zverev", stats: { serve: 94, return: 86, forehand: 88, backhand: 92, net: 80, movement: 86, defence: 86, stamina: 88, mental: 80, touch: 78 } },
  { name: "Daniil Medvedev", stats: { serve: 88, return: 94, forehand: 86, backhand: 88, net: 76, movement: 90, defence: 95, stamina: 90, mental: 82, touch: 80 } },
  { name: "Ben Shelton", stats: { serve: 96, return: 80, forehand: 92, backhand: 80, net: 82, movement: 84, defence: 78, stamina: 84, mental: 82, touch: 76 } },
];

// --- The field: real current ATP players (top 10, June 2026). Each has a base
// level and per-surface adjustments reflecting their real strengths, plus a
// signature so loss narratives feel specific. Levels are illustrative. -------
const FIELD_PLAYERS = [
  { name: "Jannik Sinner", base: 88, surf: { Hard: 4, Clay: 1, Grass: 2 }, weapon: "relentless flat hitting", style: "baseline" },
  { name: "Carlos Alcaraz", base: 88, surf: { Hard: 2, Clay: 4, Grass: 3 }, weapon: "all-court variety", style: "allcourt" },
  { name: "Alexander Zverev", base: 84, surf: { Hard: 2, Clay: 4, Grass: 0 }, weapon: "heavy serve and clay-court grind", style: "baseline" },
  { name: "Felix Auger-Aliassime", base: 81, surf: { Hard: 3, Clay: 0, Grass: 3 }, weapon: "first-strike serving", style: "serve" },
  { name: "Ben Shelton", base: 81, surf: { Hard: 2, Clay: -1, Grass: 3 }, weapon: "an explosive lefty serve", style: "serve" },
  { name: "Alex De Minaur", base: 80, surf: { Hard: 2, Clay: 1, Grass: 2 }, weapon: "relentless speed and retrieving", style: "defence" },
  { name: "Taylor Fritz", base: 80, surf: { Hard: 3, Clay: -1, Grass: 3 }, weapon: "a big serve and forehand", style: "serve" },
  { name: "Novak Djokovic", base: 85, surf: { Hard: 4, Clay: 2, Grass: 3 }, weapon: "an impenetrable return and defence", style: "return" },
  { name: "Daniil Medvedev", base: 81, surf: { Hard: 4, Clay: -2, Grass: 1 }, weapon: "deep-court counterpunching", style: "defence" },
  { name: "Flavio Cobolli", base: 77, surf: { Hard: 1, Clay: 3, Grass: 1 }, weapon: "fearless ball-striking", style: "baseline" },
];

// COSMETIC ONLY. The real win/loss engine uses SURFACE_WEIGHTS above. These
// display weights are deliberately exaggerated so the three bars look clearly
// different as you draft — making the "am I balanced?" decision feel real even
// though the underlying maths is subtler. Not used in any match calculation.
const DISPLAY_WEIGHTS = {
  Clay:  { serve: 0.2, return: 1.4, forehand: 1.3, backhand: 1.0, net: 0.2, movement: 1.8, defence: 1.9, stamina: 1.8, mental: 1.1, touch: 1.2 },
  Grass: { serve: 2.0, return: 0.5, forehand: 1.0, backhand: 0.7, net: 1.9, movement: 0.9, defence: 0.4, stamina: 0.4, mental: 1.1, touch: 1.4 },
  Hard:  { serve: 1.3, return: 1.2, forehand: 1.2, backhand: 1.1, net: 0.8, movement: 1.0, defence: 1.0, stamina: 1.0, mental: 1.2, touch: 0.7 },
};

// Returns a 0-100 bar value. Each drafted shot contributes a clearly visible,
// weighted slice; unfilled slots contribute nothing, so the bar grows pick by
// pick and the surfaces visibly diverge based on what you've taken.
function displayMeter(build, surface) {
  const w = DISPLAY_WEIGHTS[surface];
  let total = 0, maxTotal = 0;
  for (const a of ATTRS) {
    maxTotal += w[a.key] * 99;
    const v = build[a.key];
    if (v != null) total += w[a.key] * v.rating;
  }
  return Math.round((total / maxTotal) * 100);
}

// ============================================================================

// Lower-ranked but real current tour players for the early rounds, so the draw
// looks like a real major rather than only the top 10. Levels are illustrative.
const DRAW_POOL = [
  { name: "Holger Rune", base: 78, surf: { Hard: 2, Clay: 2, Grass: 1 }, weapon: "a flashy all-court game", style: "baseline" },
  { name: "Lorenzo Musetti", base: 77, surf: { Hard: 0, Clay: 4, Grass: 1 }, weapon: "a one-handed backhand and clay craft", style: "baseline" },
  { name: "Andrey Rublev", base: 78, surf: { Hard: 2, Clay: 1, Grass: 1 }, weapon: "a thunderous forehand", style: "baseline" },
  { name: "Stefanos Tsitsipas", base: 77, surf: { Hard: 1, Clay: 3, Grass: 1 }, weapon: "a heavy serve and forehand", style: "serve" },
  { name: "Grigor Dimitrov", base: 75, surf: { Hard: 2, Clay: 0, Grass: 3 }, weapon: "elegant all-court variety", style: "allcourt" },
  { name: "Tommy Paul", base: 76, surf: { Hard: 2, Clay: 1, Grass: 2 }, weapon: "quick, scrappy court coverage", style: "defence" },
  { name: "Frances Tiafoe", base: 75, surf: { Hard: 2, Clay: 0, Grass: 2 }, weapon: "explosive athleticism", style: "allcourt" },
  { name: "Hubert Hurkacz", base: 75, surf: { Hard: 2, Clay: -1, Grass: 4 }, weapon: "a booming serve", style: "serve" },
  { name: "Karen Khachanov", base: 74, surf: { Hard: 2, Clay: 1, Grass: 1 }, weapon: "raw power off both wings", style: "baseline" },
  { name: "Jiri Lehecka", base: 73, surf: { Hard: 2, Clay: 0, Grass: 1 }, weapon: "flat, fearless hitting", style: "baseline" },
  { name: "Jakub Mensik", base: 73, surf: { Hard: 2, Clay: -1, Grass: 2 }, weapon: "a huge first serve", style: "serve" },
  { name: "Tomas Machac", base: 72, surf: { Hard: 1, Clay: 1, Grass: 1 }, weapon: "clean, compact strokes", style: "baseline" },
  { name: "Francisco Cerundolo", base: 73, surf: { Hard: 0, Clay: 4, Grass: -1 }, weapon: "relentless clay-court topspin", style: "defence" },
  { name: "Ugo Humbert", base: 73, surf: { Hard: 2, Clay: 0, Grass: 2 }, weapon: "a lefty serve and flat backhand", style: "serve" },
  { name: "Alexander Bublik", base: 72, surf: { Hard: 2, Clay: -1, Grass: 3 }, weapon: "unpredictable serve-and-trickery", style: "serve" },
];

const ROUNDS = ["Round 1", "Round 2", "Round 3", "Round 4", "Quarter-final", "Semi-final", "Final"];

// Build a 7-man draw for a major. Early rounds (1-4) pull realistic top-100
// names; the back end (QF/SF/F) draws from the top 10, ordered so the toughest
// surface threat is the likeliest final. Returns ordered opponents per round.
function buildDraw(slam, rand) {
  const withLevel = (arr) =>
    arr.map((p) => ({ ...p, level: p.base + p.surf[slam.surface] }));

  const lower = withLevel(DRAW_POOL).sort(() => rand() - 0.5);
  const top = withLevel(FIELD_PLAYERS).sort((a, b) => a.level - b.level);

  const draw = [];
  // Rounds 1-3: lower-ranked tour players
  for (let r = 0; r < 3; r++) draw.push(lower[r]);
  // Round 4: a strong lower player or a weaker top-10 name
  const r4Pool = [lower[3], top[0], top[1]];
  draw.push(r4Pool[Math.floor(rand() * r4Pool.length)]);
  // QF / SF / Final: progressively stronger top-10, surface king last
  const top5 = top.slice(-5);
  draw.push(top5[Math.floor(rand() * 2)]);
  draw.push(top5[2 + Math.floor(rand() * 2)]);
  draw.push(top[top.length - 1]);
  return draw;
}

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// What an opponent's style attacks in you. Phrasing adapts to how good your
// matching shot is. Each entry has variants so reasons don't repeat across majors.
const STYLE_PRESSURE = {
  serve: {
    key: "return",
    strong: ["even your return couldn't crack their serve on the big points", "you read the serve well but a handful of free points decided it"],
    weak: (v) => [`your ${v} return couldn't dent their serve and the tie-breaks slipped away`, `their serve fired and your ${v} return never got a look in`],
  },
  return: {
    key: "serve",
    strong: ["your serve held up but their returning was simply relentless", "you served well yet they returned everything and broke at the death"],
    weak: (v) => [`your ${v} serve got picked apart and you were broken in every set`, `your ${v} serve gave them too many looks and they pounced`],
  },
  defence: {
    key: "stamina",
    strong: ["you matched them stride for stride but they had one more gear", "the rallies were brutal and they edged the war of attrition"],
    weak: (v) => [`your ${v} stamina faded in the long rallies and you ran out of legs`, `your ${v} stamina cracked in the fourth hour and the legs went`],
  },
  baseline: {
    key: "forehand",
    strong: ["you traded blow for blow but they found the lines when it mattered", "a baseline slugfest that came down to a couple of points"],
    weak: (v) => [`your ${v} forehand broke down under relentless pace from the back`, `your ${v} forehand leaked errors as they upped the pace`],
  },
  allcourt: {
    key: "mental",
    strong: ["you stayed composed but couldn't solve their change of rhythm", "they kept changing the picture and nicked the key moments"],
    weak: (v) => [`your ${v} mentality wavered as they changed the rhythm and you never settled`, `your ${v} head dropped once they started mixing it up`],
  },
};

const RATING_WORD = (r) =>
  r >= 92 ? "elite" : r >= 86 ? "strong" : r >= 78 ? "solid" : r >= 68 ? "shaky" : "weak";

const WIN_NOTES = [
  "served big when it mattered and never looked back",
  "controlled the baseline and dictated from the first ball",
  "dug out the tight sets and pulled away late",
  "was simply too complete across every phase",
  "weathered an early storm then took over",
  "broke early in each set and held comfortably",
];

// Generate a realistic best-of-5 set score given your set-win probability.
// Returns { sets:[[you,opp],...], mySets, oppSets } with 6-4 / 7-6 / 7-5 style games.
function playMatch(pSet, rand) {
  const sets = [];
  let mySets = 0, oppSets = 0;
  while (mySets < 3 && oppSets < 3) {
    const iWin = rand() < pSet;
    // game score for the set
    let a, b;
    const r = rand();
    if (r < 0.18) { a = 7; b = 6; }           // tie-break
    else if (r < 0.34) { a = 7; b = 5; }
    else if (r < 0.64) { a = 6; b = 4; }
    else if (r < 0.86) { a = 6; b = 3; }
    else { a = 6; b = 2; }
    if (iWin) { sets.push([a, b]); mySets++; }
    else { sets.push([b, a]); oppSets++; }
  }
  return { sets, mySets, oppSets };
}

const fmtScore = (sets) => sets.map(([a, b]) => `${a}-${b}`).join(" ");

// Simulate one major: seven rounds against the real draw, each best-of-5 with
// per-set noise. Records the full path with real set scores. `usedReasons` is a
// Set shared across majors so loss explanations never repeat.
function simulateMajor(build, slam, rand, usedReasons) {
  const draw = buildDraw(slam, rand);
  const myForm = surfaceScore(build, slam.surface);
  const path = [];

  for (let r = 0; r < ROUNDS.length; r++) {
    const opp = draw[r];
    // average set probability for this match
    const noise = (rand() - 0.5) * 10;
    const pSet = 1 / (1 + Math.exp(-((myForm + noise - opp.level) / 6)));
    const m = playMatch(pSet, rand);
    const won = m.mySets === 3;
    path.push({
      round: ROUNDS[r],
      name: opp.name,
      won,
      score: won ? fmtScore(m.sets) : fmtScore(m.sets),
    });

    if (!won) {
      const press = STYLE_PRESSURE[opp.style] || STYLE_PRESSURE.baseline;
      const exploited = build[press.key] ? build[press.key].rating : 25;
      const options = exploited >= 88 ? press.strong : press.weak(RATING_WORD(exploited));
      // pick a variant not already used this year
      let reason = options.find((o) => !usedReasons.has(o)) || options[0];
      usedReasons.add(reason);
      return {
        wonTitle: false,
        lostRound: ROUNDS[r],
        opponent: opp.name,
        weapon: opp.weapon,
        setScore: fmtScore(m.sets),
        reason,
        path,
      };
    }
  }
  const note = WIN_NOTES[Math.floor(rand() * WIN_NOTES.length)];
  return {
    wonTitle: true,
    finalOpp: draw[6].name,
    finalScore: path[6].score,
    note,
    path,
  };
}

// Court zone each attribute maps to, for the live diagram.
// zones: serve box, baseline (deep), mid-court, net, full-court (movement/fitness).
const ATTR_ZONE = {
  serve: "serve", return: "baseline", forehand: "baselineR", backhand: "baselineL",
  net: "net", movement: "court", defence: "deep", stamina: "court",
  mental: "whole", touch: "mid",
};

// --- Helpers -----------------------------------------------------------------
const TOTAL_ROUNDS = ATTRS.length;

function rngPick(arr, exclude = []) {
  const opts = arr.filter((p) => !exclude.includes(p.name));
  return opts[Math.floor(Math.random() * opts.length)];
}

// Score one surface. Two parts: (1) the weighted average of your shots, and
// (2) a "weakest link" pull — your lowest surface-important shot drags the
// score down, so one bad pick in a surface-critical attribute really hurts.
function surfaceScore(build, surface) {
  const w = SURFACE_WEIGHTS[surface];
  let num = 0, fullDen = 0;
  let weakest = 99; // lowest rating among attributes that matter here
  for (const a of ATTRS) {
    fullDen += w[a.key];
    const v = build[a.key];
    if (v == null) {
      // empty slot counts as a severe gap (rating 30) and can be the weak link
      num += 30 * w[a.key];
      if (w[a.key] >= 1.0) weakest = Math.min(weakest, 30);
      continue;
    }
    num += v.rating * w[a.key];
    if (w[a.key] >= 1.1) weakest = Math.min(weakest, v.rating);
  }
  const avg = num / fullDen;
  // Pull the average toward the weakest surface-critical shot.
  return avg * 0.72 + weakest * 0.28;
}

// Convert a surface score into a win probability for that major. Tuned hard:
// the field is brutal, so you need genuinely elite, balanced ratings to clear
// 50% on all four surfaces. ~84 is roughly a coin-flip; below that you fade.
function winProb(score) {
  const x = (score - 84) / 6; // tighter band, higher floor than before
  const p = 1 / (1 + Math.exp(-x * 2.6));
  return Math.max(0.005, Math.min(0.985, p));
}

// ============================================================================

// Maps each attribute to one or more court zones to highlight.
const ZONE_OF = {
  serve: ["serveBox"],
  return: ["deepBase"],
  forehand: ["baseR"],
  backhand: ["baseL"],
  net: ["netZone"],
  movement: ["wings"],
  defence: ["deepBase"],
  stamina: ["wings"],
  mental: ["whole"],
  touch: ["midCourt"],
};

// Which parts of the player silhouette each attribute lights up.
// Parts: head, torso, racketArm, offArm, racket, hips, legs, feet, whole.
const BODY_ZONE = {
  serve: ["racketArm", "racket", "torso"],
  return: ["offArm", "racketArm", "racket"],
  forehand: ["racketArm", "racket", "torso"],
  backhand: ["offArm", "racketArm", "racket", "torso"],
  net: ["racketArm", "racket", "torso"],
  movement: ["legs", "feet"],
  defence: ["legs", "hips", "feet"],
  stamina: ["legs", "hips", "torso"],
  mental: ["head"],
  touch: ["racket"],
};

function Figure({ build, hovered }) {
  const filled = {};
  for (const a of ATTRS) {
    if (build[a.key]) for (const z of BODY_ZONE[a.key]) filled[z] = true;
  }
  const hot = hovered ? BODY_ZONE[hovered] : [];
  const cls = (z) =>
    `cs-bp${filled[z] ? " filled" : ""}${hot.includes(z) ? " hot" : ""}`;
  const wholeHot = hovered === "stamina";

  return (
    <svg className={`cs-figure ${wholeHot ? "pulse" : ""}`} viewBox="0 0 200 300" aria-hidden="true">
      {/* back leg */}
      <path className={cls("legs")} d="M88 150 Q74 190 58 226 Q48 252 34 274 Q30 282 38 285 Q47 286 53 278 Q68 250 82 222 Q94 196 102 168 Z" />
      <path className={cls("feet")} d="M34 272 Q22 278 17 287 Q14 294 25 295 L48 293 Q53 287 46 282 Q40 278 36 275 Z" />
      {/* front leg */}
      <path className={cls("legs")} d="M112 150 Q120 192 126 228 Q130 252 131 274 Q131 284 141 285 Q151 284 150 273 Q149 242 145 210 Q141 180 132 152 Z" />
      <path className={cls("feet")} d="M129 273 Q127 286 134 291 Q145 295 158 290 Q168 285 161 277 Q152 271 142 271 Q133 271 131 274 Z" />
      {/* hips */}
      <path className={cls("hips")} d="M84 134 Q100 128 120 134 Q128 146 130 160 Q130 168 124 170 Q108 174 92 170 Q84 168 84 158 Q83 146 84 134 Z" />
      {/* torso */}
      <path className={cls("torso")} d="M86 66 Q102 58 120 66 Q126 88 126 112 Q128 132 122 146 Q104 152 88 146 Q82 130 82 108 Q81 84 86 66 Z" />
      {/* off arm */}
      <path className={cls("offArm")} d="M90 78 Q76 86 72 102 Q70 116 80 124 Q90 128 124 110 Q128 104 122 98 Q108 104 94 106 Q88 100 92 90 Q96 82 90 78 Z" />
      {/* racket arm */}
      <path className={cls("racketArm")} d="M120 70 Q138 68 150 82 Q160 96 158 116 Q156 128 148 128 Q140 126 140 116 Q140 100 130 92 Q120 86 116 86 Q114 76 120 70 Z" />
      <path className={cls("racketArm")} d="M138 112 Q150 100 160 84 Q166 74 160 70 Q152 68 148 78 Q140 94 132 108 Z" />
      {/* racket */}
      <g className={cls("racket")}>
        <ellipse cx="170" cy="42" rx="19" ry="25" fill="none" strokeWidth="5" />
        <path d="M163 64 L156 80 M177 64 L170 80" strokeWidth="5" fill="none" />
      </g>
      {/* neck + head */}
      <path className={cls("torso")} d="M98 54 Q98 62 106 64 Q114 64 114 56 L114 50 L98 50 Z" />
      <path className={cls("head")} d="M96 28 Q96 16 108 16 Q122 16 122 32 Q122 47 109 51 Q97 49 96 36 Z" />
    </svg>
  );
}

function Court({ build, hovered }) {
  // A zone is "filled" if any attribute mapping to it has been drafted.
  const filledZones = {};
  for (const a of ATTRS) {
    if (build[a.key]) for (const z of ZONE_OF[a.key]) filledZones[z] = true;
  }
  const hotZones = hovered ? ZONE_OF[hovered] : [];
  const cls = (z) =>
    `cs-zone${filledZones[z] ? " filled" : ""}${hotZones.includes(z) ? " hot" : ""}`;

  return (
    <svg className="cs-court" viewBox="0 0 200 320" aria-hidden="true">
      {/* whole-court glow (mental) */}
      <rect className={cls("whole")} x="14" y="8" width="172" height="304" rx="2" />

      {/* court surface */}
      <rect x="14" y="8" width="172" height="304" fill="none" stroke="var(--ink)" strokeWidth="2" />

      {/* zones (drawn under the lines) */}
      <rect className={cls("deepBase")} x="14" y="8" width="172" height="58" />
      <rect className={cls("deepBase")} x="14" y="254" width="172" height="58" />
      <rect className={cls("baseL")} x="14" y="66" width="86" height="60" />
      <rect className={cls("baseR")} x="100" y="66" width="86" height="60" />
      <rect className={cls("serveBox")} x="14" y="126" width="172" height="0.1" />
      <rect className={cls("serveBox")} x="46" y="126" width="108" height="34" />
      <rect className={cls("serveBox")} x="46" y="160" width="108" height="34" />
      <rect className={cls("midCourt")} x="14" y="126" width="172" height="68" />
      <rect className={cls("netZone")} x="14" y="150" width="172" height="20" />
      <rect className={cls("wings")} x="14" y="8" width="14" height="304" />
      <rect className={cls("wings")} x="172" y="8" width="14" height="304" />

      {/* court lines */}
      <line x1="14" y1="160" x2="186" y2="160" stroke="var(--ink)" strokeWidth="2.5" strokeDasharray="4 3" />
      <line x1="14" y1="66" x2="186" y2="66" stroke="var(--line)" strokeWidth="1.5" />
      <line x1="14" y1="254" x2="186" y2="254" stroke="var(--line)" strokeWidth="1.5" />
      <line x1="46" y1="66" x2="46" y2="254" stroke="var(--line)" strokeWidth="1.5" />
      <line x1="154" y1="66" x2="154" y2="254" stroke="var(--line)" strokeWidth="1.5" />
      <line x1="46" y1="126" x2="154" y2="126" stroke="var(--line)" strokeWidth="1.5" />
      <line x1="46" y1="194" x2="154" y2="194" stroke="var(--line)" strokeWidth="1.5" />
      <line x1="100" y1="8" x2="100" y2="66" stroke="var(--line)" strokeWidth="1.5" />
      <line x1="100" y1="254" x2="100" y2="312" stroke="var(--line)" strokeWidth="1.5" />
    </svg>
  );
}

// ============================================================================

// Shareable result card. Shows the headline, the four-major surface trail as
// coloured squares, and offers a Wordle-style text block to copy/share.
const SURF_EMOJI = { Clay: "🟧", Grass: "🟩", Hard: "🟦" };

function ShareCard({ active, ranSim, build, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!active) return null;

  const squares = SLAMS.map((s) => {
    const leg = active.perSlam.find((p) => p.key === s.key);
    const won = ranSim ? leg.wonTitle : leg.win;
    return won ? "🏆" : SURF_EMOJI[s.surface];
  }).join(" ");

  const headline =
    active.won === 4 ? "CALENDAR SLAM 🎾" :
    active.won === 0 ? "No majors this year" :
    `${active.won}/4 majors`;

  const shareText =
    `Calendar Slam — ${headline}\n${squares}\n${ranSim ? "Simulated vs the 2026 field" : "Quick projection"}\nplay: calendarslam.com`;

  function copy() {
    try {
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      setCopied(false);
    }
  }

  return (
    <div className="cs-modal" onClick={onClose}>
      <div className="cs-card-share" onClick={(e) => e.stopPropagation()}>
        <button className="cs-modal-x" onClick={onClose} aria-label="Close">×</button>
        <div className="cs-share-brand">CALENDAR SLAM</div>
        <div className={`cs-share-headline ${active.won === 4 ? "slam" : ""}`}>{headline}</div>

        <div className="cs-share-trail">
          {SLAMS.map((s) => {
            const leg = active.perSlam.find((p) => p.key === s.key);
            const won = ranSim ? leg.wonTitle : leg.win;
            return (
              <div key={s.key} className={`cs-share-leg s-${s.surface.toLowerCase()} ${won ? "won" : ""}`}>
                <span className="cs-share-emoji">{won ? "🏆" : SURF_EMOJI[s.surface]}</span>
                <span className="cs-share-slam">{s.short}</span>
              </div>
            );
          })}
        </div>

        <div className="cs-share-mode">{ranSim ? "Simulated vs the 2026 ATP field" : "Quick projection"}</div>

        <button className="cs-cta cs-share-copy" onClick={copy}>
          {copied ? "Copied ✓" : "Copy result"}
        </button>
        <pre className="cs-share-preview">{shareText}</pre>
      </div>
    </div>
  );
}

// ============================================================================

export default function CalendarSlam() {
  const [phase, setPhase] = useState("intro"); // intro | draft | result
  const [round, setRound] = useState(0);
  const [build, setBuild] = useState({});
  const [current, setCurrent] = useState(null); // current spun player
  const [spinning, setSpinning] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [ranSim, setRanSim] = useState(false);
  const [seed, setSeed] = useState(1);
  const [showCard, setShowCard] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [previewKey, setPreviewKey] = useState(null); // touch: armed shot awaiting confirm

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(m.matches);
    // Treat as touch if the device has no fine pointer / supports hover poorly.
    const touch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    setIsTouch(touch);
  }, []);

  const drawnIds = useMemo(
    () => Object.values(build).filter(Boolean).map((b) => b.player),
    [build]
  );

  const filledCount = Object.values(build).filter(Boolean).length;

  function startDraft() {
    setBuild({});
    setRound(0);
    setRanSim(false);
    setShowCard(false);
    setPhase("draft");
    spin([]);
  }

  function spin(exclude) {
    setSpinning(true);
    setPreviewKey(null);
    setHovered(null);
    const final = rngPick(POOL, exclude);
    if (reduce) {
      setCurrent(final);
      setSpinning(false);
      return;
    }
    let ticks = 0;
    const iv = setInterval(() => {
      setCurrent(rngPick(POOL));
      ticks++;
      if (ticks > 12) {
        clearInterval(iv);
        setCurrent(final);
        setSpinning(false);
      }
    }, 55);
  }

  // Which attributes are still open AND present a meaningful pick on this card.
  function openAttrs() {
    return ATTRS.filter((a) => build[a.key] == null);
  }

  // Tap/click handler. On touch: first tap arms a preview, second tap on the
  // same shot confirms. On desktop: click confirms immediately (hover previews).
  function tapAttr(attrKey) {
    if (spinning || !current || build[attrKey] != null) return;
    if (isTouch) {
      if (previewKey === attrKey) {
        setPreviewKey(null);
        pickAttr(attrKey);
      } else {
        setPreviewKey(attrKey);
        setHovered(attrKey); // drives meter + figure preview
      }
    } else {
      pickAttr(attrKey);
    }
  }

  function pickAttr(attrKey) {
    if (spinning || !current) return;
    const next = {
      ...build,
      [attrKey]: { rating: current.stats[attrKey], player: current.name },
    };
    setBuild(next);
    const newRound = round + 1;
    if (newRound >= TOTAL_ROUNDS) {
      setRound(newRound);
      setPhase("result");
    } else {
      setRound(newRound);
      spin(drawnIds.concat(current.name));
    }
  }

  // ---- Tier from majors won ----
  function tierFor(won) {
    if (won === 4) return { name: "CALENDAR SLAM", note: "All four majors in one year. The rarest feat in tennis.", glow: true };
    if (won === 3) return { name: "Three majors", note: "A legendary year, but one surface broke you." };
    if (won === 2) return { name: "Two majors", note: "An all-time great season, short of immortality." };
    if (won === 1) return { name: "One major", note: "A Slam champion. Most players never get here." };
    return { name: "No majors", note: "Deep runs, no trophy. Find the gaps in your build." };
  }

  // ---- Instant projection (deterministic) ----
  const results = useMemo(() => {
    if (phase !== "result") return null;
    let won = 0;
    const perSlam = SLAMS.map((s) => {
      const score = surfaceScore(build, s.surface);
      const p = winProb(score);
      const win = p > 0.5;
      if (win) won++;
      return { ...s, score: Math.round(score), prob: Math.round(p * 100), win };
    });
    return { perSlam, won, tier: tierFor(won) };
  }, [phase, build]);

  // ---- Match-by-match simulation (probabilistic, harder) ----
  const simResults = useMemo(() => {
    if (phase !== "result" || !ranSim) return null;
    const rand = mulberry32(seed);
    const usedReasons = new Set();
    let won = 0;
    const perSlam = SLAMS.map((s) => {
      const r = simulateMajor(build, s, rand, usedReasons);
      if (r.wonTitle) won++;
      return { ...s, ...r };
    });
    return { perSlam, won, tier: tierFor(won) };
  }, [phase, build, ranSim, seed]);

  return (
    <div className="cs-page">
    <div className="cs-root">
      <style>{CSS}</style>

      <header className="cs-head">
        <div className="cs-wordmark">Calendar Slam</div>
        <div className="cs-tag">build a champion, shot by shot</div>
      </header>

      {phase === "intro" && (
        <section className="cs-intro">
          <h1 className="cs-h1">
            Can your player win<br />
            <em>all four majors</em> in one year?
          </h1>
          <p className="cs-lede">
            Spin real players from different eras, draft their iconic weapons, and
            build a tennis god. But beware — to win it all, you must conquer every
            surface.
          </p>
          <p className="cs-lede">
            Watch your <strong>Hard</strong>, <strong>Clay</strong> and{" "}
            <strong>Grass</strong> meters closely with every draft pick. Can you
            build the ultimate all-court champion and sweep the majors?
          </p>

          <div className="cs-surfaces">
            {SLAMS.map((s) => (
              <div key={s.key} className={`cs-surface-chip s-${s.surface.toLowerCase()}`}>
                <span className="cs-chip-name">{s.name}</span>
                <span className="cs-chip-surface">{s.surface}</span>
              </div>
            ))}
          </div>

          <p className="cs-fineprint">
            Player ratings in this prototype are placeholders. The real version
            derives them from public match data (Tennis Abstract).
          </p>

          <button className="cs-cta" onClick={startDraft}>Start drafting →</button>
        </section>
      )}

      {phase === "draft" && current && (
        <section className="cs-draft">
          <div className="cs-progress-row">
            <span className="cs-round">Round {round + 1} / {TOTAL_ROUNDS}</span>
            <div className="cs-dots">
              {ATTRS.map((a) => (
                <span key={a.key} className={`cs-dot ${build[a.key] ? "on" : ""}`} />
              ))}
            </div>
          </div>

          <div className="cs-stage">
            <div className={`cs-card ${spinning ? "spin" : ""}`}>
              <div className="cs-card-eyebrow">Now drafting from</div>
              <div className="cs-card-name">{current.name}</div>
              <div className="cs-card-hint">
                {spinning ? "Spinning…" : "Take one shot for your build"}
              </div>
            </div>
            <Figure build={build} hovered={hovered} />
          </div>

          <div className="cs-meters" role="group" aria-label="Surface readiness so far">
            {["Clay", "Grass", "Hard"].map((surf) => {
              const pct = displayMeter(build, surf);
              const previewPct = hovered && build[hovered] == null
                ? displayMeter({ ...build, [hovered]: { rating: current.stats[hovered], player: current.name } }, surf)
                : null;
              return (
                <div key={surf} className={`cs-meter s-${surf.toLowerCase()}`}>
                  <div className="cs-meter-top">
                    <span className="cs-meter-name">{surf}</span>
                    <span className="cs-meter-val">{pct}</span>
                  </div>
                  <div className="cs-meter-track">
                    {previewPct != null && previewPct !== pct && (
                      <div
                        className={`cs-meter-preview ${previewPct < pct ? "down" : ""}`}
                        style={{ width: `${Math.max(pct, previewPct)}%`, left: previewPct < pct ? `${previewPct}%` : 0 }}
                      />
                    )}
                    <div className="cs-meter-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="cs-attr-grid">
            {ATTRS.map((a) => {
              const taken = build[a.key] != null;
              const val = current.stats[a.key];
              const armed = isTouch && previewKey === a.key;
              return (
                <button
                  key={a.key}
                  className={`cs-attr ${taken ? "taken" : ""} ${armed ? "armed" : ""}`}
                  disabled={taken || spinning}
                  onClick={() => tapAttr(a.key)}
                  onMouseEnter={isTouch ? undefined : () => setHovered(a.key)}
                  onMouseLeave={isTouch ? undefined : () => setHovered(null)}
                  onFocus={isTouch ? undefined : () => setHovered(a.key)}
                  onBlur={isTouch ? undefined : () => setHovered(null)}
                  title={taken ? `Filled by ${build[a.key].player}` : `Draft ${a.label}`}
                >
                  <span className="cs-attr-label">{a.label}</span>
                  {taken ? (
                    <span className="cs-attr-owner">
                      {build[a.key].rating} · {build[a.key].player.split(" ").slice(-1)[0]}
                    </span>
                  ) : (
                    <span className="cs-attr-val">{val}</span>
                  )}
                  {armed && <span className="cs-attr-confirm">Tap again to pick</span>}
                </button>
              );
            })}
          </div>

          <p className="cs-draft-foot">
            {TOTAL_ROUNDS - filledCount} shots left to fill. The bars show how your
            build is shaping up on each surface — {isTouch ? "tap a shot to preview, tap again to pick." : "hover a shot to preview its effect."}
          </p>
        </section>
      )}

      {phase === "result" && results && (
        <section className="cs-result">
          {!ranSim && (
            <div className={`cs-tier ${results.tier.glow ? "glow" : ""}`}>
              <div className="cs-tier-eyebrow">Projected</div>
              <div className="cs-tier-count">{results.won} / 4</div>
              <div className="cs-tier-name">{results.tier.name}</div>
              <div className="cs-tier-note">{results.tier.note}</div>
            </div>
          )}

          {!ranSim && (
            <div className="cs-gauntlet">
              {results.perSlam.map((s) => (
                <div key={s.key} className={`cs-leg s-${s.surface.toLowerCase()} ${s.win ? "win" : "loss"}`}>
                  <div className="cs-leg-top">
                    <span className="cs-leg-name">{s.name}</span>
                    <span className="cs-leg-surface">{s.surface}</span>
                  </div>
                  <div className="cs-leg-bar-track">
                    <div className="cs-leg-bar" style={{ width: `${s.prob}%` }} />
                  </div>
                  <div className="cs-leg-bottom">
                    <span>{s.win ? "Champion" : "Eliminated"}</span>
                    <span>{s.prob}% form</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!ranSim && (
            <div className="cs-sim-prompt">
              <p>This is the quick projection. Want the real test? Play it out round by round against the field. It's harder, and the field is unforgiving.</p>
              <button className="cs-sim-btn" onClick={() => { setSeed(Math.floor(Math.random() * 1e9)); setRanSim(true); }}>
                ▶ Simulate match by match
              </button>
            </div>
          )}

          {ranSim && simResults && (
            <>
              <div className={`cs-tier ${simResults.tier.glow ? "glow" : ""}`}>
                <div className="cs-tier-eyebrow">Simulated · live field</div>
                <div className="cs-tier-count">{simResults.won} / 4</div>
                <div className="cs-tier-name">{simResults.tier.name}</div>
                <div className="cs-tier-note">{simResults.tier.note}</div>
              </div>

              <div className="cs-gauntlet">
                {simResults.perSlam.map((s) => (
                  <div key={s.key} className={`cs-leg s-${s.surface.toLowerCase()} ${s.wonTitle ? "win" : "loss"}`}>
                    <div className="cs-leg-top">
                      <span className="cs-leg-name">{s.name}</span>
                      <span className="cs-leg-surface">{s.surface}</span>
                    </div>

                    {s.wonTitle ? (
                      <div className="cs-leg-sim">
                        <span className="cs-sim-champ">🏆 Champion</span>
                        <span className="cs-sim-detail">
                          Beat {s.finalOpp} in the final, {s.finalScore}. You {s.note}.
                        </span>
                      </div>
                    ) : (
                      <div className="cs-leg-sim">
                        <span className="cs-sim-out">
                          Lost the {s.lostRound} to {s.opponent}, {s.setScore}
                        </span>
                        <span className="cs-sim-detail">
                          Up against {s.weapon}, {s.reason}.
                        </span>
                      </div>
                    )}

                    <details className="cs-path">
                      <summary>Round-by-round</summary>
                      <ol className="cs-path-list">
                        {s.path.map((p, i) => (
                          <li key={i} className={p.won ? "won" : "lost"}>
                            <span className="cs-path-round">{p.round}</span>
                            <span className="cs-path-opp">
                              {p.won ? "def." : "lost to"} {p.name}
                            </span>
                            <span className="cs-path-score">{p.score}</span>
                          </li>
                        ))}
                      </ol>
                    </details>
                  </div>
                ))}
              </div>

              <div className="cs-sim-prompt">
                <button className="cs-sim-btn" onClick={() => setSeed(Math.floor(Math.random() * 1e9))}>
                  ↻ Run the year again (new draw)
                </button>
                <button className="cs-sim-btn cs-share-btn" onClick={() => setShowCard(true)}>
                  ↗ Share result
                </button>
              </div>
            </>
          )}

          {!ranSim && (
            <div className="cs-sim-prompt" style={{ marginTop: "-6px" }}>
              <button className="cs-sim-btn cs-share-btn" onClick={() => setShowCard(true)}>
                ↗ Share result
              </button>
            </div>
          )}

          <details className="cs-breakdown">
            <summary>Show your build ▾</summary>
            <div className="cs-build-list">
              {ATTRS.map((a) => (
                <div key={a.key} className="cs-build-row">
                  <span>{a.label}</span>
                  <span className="cs-build-val">
                    {build[a.key] ? `${build[a.key].rating} — ${build[a.key].player}` : "— empty —"}
                  </span>
                </div>
              ))}
            </div>
          </details>

          <button className="cs-cta" onClick={startDraft}>Build another →</button>
        </section>
      )}

      {showCard && (
        <ShareCard
          active={ranSim ? simResults : results}
          ranSim={ranSim}
          build={build}
          onClose={() => setShowCard(false)}
        />
      )}
    </div>
    </div>
  );
}

const CSS = `
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; }
.cs-page {
  --grass-deep: #1f6b3f;
  --grass-mid: #2a7d4a;
  --grass-dark: #185733;
  --chalk: #f6fbef;
  --ball: #d8f000;
  --ball-soft: #e6ff3a;
  --clay: #d2693f;
  --grass: #6fbf73;
  --hard: #38a0d8;
  --ink: #0e2a1a;
  --line: rgba(246,251,239,.32);
  --line-soft: rgba(246,251,239,.16);
  --dim: rgba(246,251,239,.62);
  --paper: var(--grass-deep);

  background:
    repeating-linear-gradient(90deg, transparent 0 38px, rgba(246,251,239,.025) 38px 76px),
    var(--grass-deep);
  min-height: 100vh;
}
.cs-root {
  color: var(--chalk);
  font-family: "Barlow", ui-sans-serif, system-ui, sans-serif;
  padding: 22px clamp(16px, 5vw, 48px) 56px;
  max-width: 860px;
  margin: 0 auto;
  -webkit-font-smoothing: antialiased;
}
.cs-head { display:flex; align-items:baseline; gap:16px; flex-wrap:wrap; border-bottom:2.5px solid var(--chalk); padding-bottom:12px; }
.cs-wordmark { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:30px; letter-spacing:.5px; line-height:1; color:var(--chalk); text-transform:uppercase; }
.cs-wordmark::first-letter { color:var(--ball); }
.cs-tag { font-size:11px; letter-spacing:.16em; text-transform:uppercase; color:var(--dim); font-weight:600; }

/* INTRO */
.cs-intro { padding-top:34px; }
.cs-h1 { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:clamp(36px,8.5vw,64px); line-height:.96; letter-spacing:0; margin:0 0 22px; text-transform:uppercase; }
.cs-h1 em { color:var(--ball); font-style:normal; }
.cs-lede { font-size:16.5px; line-height:1.6; max-width:60ch; color:var(--chalk); margin:0 0 18px; }
.cs-lede:last-of-type { margin-bottom:28px; }
.cs-lede strong { color:var(--ball-soft); font-weight:700; }
.cs-surfaces { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:24px; }
.cs-surface-chip { border:2px solid var(--line); border-radius:4px; padding:12px 10px; display:flex; flex-direction:column; gap:3px; background:rgba(246,251,239,.04); }
.cs-chip-name { font-weight:700; font-size:13px; line-height:1.15; color:var(--chalk); }
.cs-chip-surface { font-size:10px; letter-spacing:.12em; text-transform:uppercase; font-weight:700; }
.cs-surface-chip.s-clay  { border-color:var(--clay); }
.cs-surface-chip.s-grass { border-color:var(--grass); }
.cs-surface-chip.s-hard  { border-color:var(--hard); }
.s-clay  .cs-chip-surface { color:var(--clay); }
.s-grass .cs-chip-surface { color:var(--grass); }
.s-hard  .cs-chip-surface { color:var(--hard); }
.cs-fineprint { font-size:12px; color:var(--dim); margin:0 0 26px; max-width:54ch; }

.cs-cta { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:18px; letter-spacing:.06em; text-transform:uppercase; background:var(--ball); color:var(--ink); border:none; border-radius:4px; padding:15px 30px; cursor:pointer; transition:transform .12s ease, box-shadow .2s; box-shadow:0 3px 0 rgba(14,42,26,.4); }
.cs-cta:hover { transform:translateY(-2px); box-shadow:0 5px 0 rgba(14,42,26,.4); }
.cs-cta:active { transform:translateY(1px); box-shadow:0 1px 0 rgba(14,42,26,.4); }
.cs-cta:focus-visible { outline:3px solid var(--chalk); outline-offset:3px; }

/* DRAFT */
.cs-draft { padding-top:28px; }
.cs-progress-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; }
.cs-round { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:17px; letter-spacing:.08em; text-transform:uppercase; color:var(--chalk); }
.cs-dots { display:flex; gap:5px; }
.cs-dot { width:9px; height:9px; border:1.5px solid var(--line); border-radius:50%; }
.cs-dot.on { background:var(--ball); border-color:var(--ball); }

.cs-stage { display:flex; gap:18px; align-items:stretch; margin-bottom:22px; }
.cs-card { flex:1; border:2.5px solid var(--chalk); border-radius:6px; padding:22px 24px; position:relative; overflow:hidden; background:rgba(246,251,239,.06); display:flex; flex-direction:column; justify-content:center; }
.cs-card.spin { animation:flick .09s linear infinite; }
@keyframes flick { 0%{opacity:.65} 50%{opacity:1} 100%{opacity:.65} }
.cs-card-eyebrow { font-size:11px; letter-spacing:.16em; text-transform:uppercase; color:var(--dim); font-weight:700; }
.cs-card-name { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:clamp(28px,5.8vw,42px); line-height:1; letter-spacing:0; margin:6px 0 10px; color:var(--chalk); text-transform:uppercase; }
.cs-card-hint { font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--ball-soft); font-weight:700; }

.cs-court { width:120px; flex:0 0 120px; display:block; align-self:center; }
.cs-zone { fill:transparent; transition:fill .25s ease; }
.cs-zone.filled { fill:rgba(63,125,78,.26); }
.cs-zone.hot { fill:rgba(200,99,63,.42); }
.cs-zone.filled.hot { fill:rgba(200,99,63,.5); }

/* player silhouette */
.cs-figure { width:128px; flex:0 0 128px; display:block; align-self:center; }
.cs-bp { fill:rgba(246,251,239,.22); stroke:none; transition:fill .25s ease, stroke .25s ease; }
.cs-bp.filled { fill:var(--chalk); }
.cs-bp.hot { fill:var(--ball); }
.cs-bp.filled.hot { fill:var(--ball); }
.cs-figure g.cs-bp { fill:none; }
.cs-figure g.cs-bp ellipse, .cs-figure g.cs-bp path { stroke:rgba(246,251,239,.34); }
.cs-figure g.cs-bp.filled ellipse, .cs-figure g.cs-bp.filled path { stroke:var(--chalk); }
.cs-figure g.cs-bp.hot ellipse, .cs-figure g.cs-bp.hot path { stroke:var(--ball); }
.cs-figure.pulse { animation:cs-pulse 1.1s ease-in-out infinite; }
@keyframes cs-pulse { 0%,100%{opacity:1} 50%{opacity:.72} }
@media (prefers-reduced-motion: reduce) { .cs-figure.pulse { animation:none; } }

.cs-attr-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:8px; }
.cs-attr { text-align:left; border:2px solid var(--line-soft); border-radius:5px; background:rgba(246,251,239,.05); padding:11px 13px; cursor:pointer; display:flex; flex-direction:column; gap:4px; transition:border-color .12s, transform .1s, background .15s; }
.cs-attr:hover:not(:disabled) { border-color:var(--ball); background:rgba(216,240,0,.08); transform:translateY(-2px); }
.cs-attr:focus-visible { outline:3px solid var(--ball); outline-offset:2px; }
.cs-attr.taken { background:rgba(246,251,239,.03); cursor:not-allowed; opacity:.5; }
.cs-attr.armed { border-color:var(--ball); background:rgba(216,240,0,.12); transform:translateY(-2px); }
.cs-attr-confirm { font-size:10px; letter-spacing:.06em; text-transform:uppercase; font-weight:800; color:var(--ball-soft); margin-top:2px; }
.cs-attr-label { font-size:11px; letter-spacing:.08em; text-transform:uppercase; font-weight:700; color:var(--dim); }
.cs-attr-val { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:32px; line-height:1; color:var(--chalk); }
.cs-attr-owner { font-size:12px; font-weight:600; color:var(--chalk); }

/* live surface meters */
.cs-meters { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:18px; }
.cs-meter-top { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:5px; }
.cs-meter-name { font-size:11px; letter-spacing:.1em; text-transform:uppercase; font-weight:800; }
.cs-meter-val { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:20px; }
.cs-meter.s-clay .cs-meter-name, .cs-meter.s-clay .cs-meter-val { color:var(--clay); }
.cs-meter.s-grass .cs-meter-name, .cs-meter.s-grass .cs-meter-val { color:var(--grass); }
.cs-meter.s-hard .cs-meter-name, .cs-meter.s-hard .cs-meter-val { color:var(--hard); }
.cs-meter-track { position:relative; height:11px; background:rgba(14,42,26,.45); border-radius:6px; overflow:hidden; border:1px solid var(--line-soft); }
.cs-meter-fill { position:absolute; inset:0 auto 0 0; transition:width .35s ease; z-index:2; }
.cs-meter-preview { position:absolute; inset:0 auto 0 0; opacity:.4; transition:width .15s ease; z-index:1; }
.cs-meter-preview.down { opacity:.3; background-image:repeating-linear-gradient(45deg, rgba(0,0,0,.2) 0 3px, transparent 3px 6px); }
.cs-meter.s-clay .cs-meter-fill, .cs-meter.s-clay .cs-meter-preview { background:var(--clay); }
.cs-meter.s-grass .cs-meter-fill, .cs-meter.s-grass .cs-meter-preview { background:var(--grass); }
.cs-meter.s-hard .cs-meter-fill, .cs-meter.s-hard .cs-meter-preview { background:var(--hard); }

.cs-tier-eyebrow { font-size:10px; letter-spacing:.18em; text-transform:uppercase; font-weight:800; color:var(--dim); margin-bottom:4px; }
.cs-sim-prompt { text-align:center; margin-bottom:22px; display:flex; flex-direction:column; align-items:center; gap:12px; }
.cs-sim-prompt p { font-size:14px; color:var(--dim); max-width:46ch; margin:0 auto; line-height:1.5; }
.cs-sim-btn { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:16px; letter-spacing:.06em; text-transform:uppercase; background:transparent; color:var(--chalk); border:2px solid var(--chalk); border-radius:4px; padding:12px 24px; cursor:pointer; transition:background .18s, color .18s; }
.cs-sim-btn:hover { background:var(--chalk); color:var(--grass-deep); }
.cs-sim-btn:focus-visible { outline:3px solid var(--ball); outline-offset:3px; }
.cs-share-btn { border-color:var(--ball); color:var(--ball); }
.cs-share-btn:hover { background:var(--ball); color:var(--ink); border-color:var(--ball); }

.cs-leg-sim { display:flex; flex-direction:column; gap:3px; margin-top:4px; }
.cs-sim-champ { color:var(--ball-soft); font-weight:800; font-size:14px; }
.cs-sim-out { color:var(--clay); font-weight:700; font-size:13.5px; }
.cs-sim-detail { font-size:13px; color:var(--dim); line-height:1.45; }
.cs-path { margin-top:8px; }
.cs-path summary { cursor:pointer; font-size:11px; letter-spacing:.1em; text-transform:uppercase; font-weight:700; color:var(--dim); }
.cs-path-list { list-style:none; margin:8px 0 0; padding:0; display:flex; flex-direction:column; gap:1px; }
.cs-path-list li { display:grid; grid-template-columns:88px 1fr auto; gap:8px; align-items:baseline; font-size:12.5px; padding:4px 0; border-bottom:1px solid var(--line-soft); }
.cs-path-round { font-weight:700; font-size:10px; letter-spacing:.06em; text-transform:uppercase; color:var(--dim); }
.cs-path-opp { color:var(--chalk); }
.cs-path-list li.lost .cs-path-opp { color:var(--clay); font-weight:700; }
.cs-path-score { font-variant-numeric:tabular-nums; font-weight:600; color:var(--dim); }

/* share modal */
.cs-modal { position:fixed; inset:0; background:rgba(7,28,16,.78); display:flex; align-items:center; justify-content:center; padding:20px; z-index:50; }
.cs-card-share { background:var(--grass-mid); border:2.5px solid var(--chalk); border-radius:8px; max-width:380px; width:100%; padding:28px 26px 24px; position:relative; text-align:center; }
.cs-modal-x { position:absolute; top:10px; right:14px; background:none; border:none; font-size:26px; line-height:1; cursor:pointer; color:var(--chalk); }
.cs-share-brand { font-family:"Barlow Condensed",sans-serif; font-weight:800; letter-spacing:.16em; font-size:13px; color:var(--ball); text-transform:uppercase; }
.cs-share-headline { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:34px; line-height:1.05; letter-spacing:0; margin:6px 0 18px; text-transform:uppercase; color:var(--chalk); }
.cs-share-headline.slam { color:var(--ball); }
.cs-share-trail { display:flex; justify-content:center; gap:10px; margin-bottom:16px; }
.cs-share-leg { display:flex; flex-direction:column; align-items:center; gap:5px; border:2px solid var(--line); border-bottom-width:4px; border-radius:4px; padding:10px 8px; min-width:52px; }
.cs-share-leg.s-clay { border-bottom-color:var(--clay); }
.cs-share-leg.s-grass { border-bottom-color:var(--grass); }
.cs-share-leg.s-hard { border-bottom-color:var(--hard); }
.cs-share-leg.won { background:rgba(216,240,0,.12); }
.cs-share-emoji { font-size:22px; }
.cs-share-slam { font-size:11px; font-weight:800; letter-spacing:.06em; color:var(--chalk); }
.cs-share-mode { font-size:12px; color:var(--dim); margin-bottom:18px; }
.cs-share-copy { width:100%; }
.cs-share-preview { font-family:ui-monospace,monospace; font-size:11px; text-align:left; background:rgba(7,28,16,.4); border-radius:4px; padding:10px; margin:14px 0 0; white-space:pre-wrap; line-height:1.5; color:var(--chalk); }
.cs-draft-foot { font-size:13px; color:var(--dim); margin-top:18px; }

/* RESULT */
.cs-result { padding-top:28px; }
.cs-tier { border:2.5px solid var(--chalk); border-radius:6px; padding:26px; text-align:center; margin-bottom:22px; background:rgba(246,251,239,.04); }
.cs-tier.glow { border-color:var(--ball); background:rgba(216,240,0,.1); box-shadow:0 0 0 4px rgba(216,240,0,.14); }
.cs-tier-eyebrow { font-size:10px; letter-spacing:.18em; text-transform:uppercase; font-weight:800; color:var(--dim); margin-bottom:4px; }
.cs-tier-count { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:58px; line-height:1; color:var(--chalk); }
.cs-tier-name { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:26px; letter-spacing:.04em; text-transform:uppercase; margin:4px 0; color:var(--chalk); }
.cs-tier.glow .cs-tier-name { color:var(--ball); }
.cs-tier-note { font-size:14px; color:var(--dim); max-width:44ch; margin:0 auto; }

.cs-gauntlet { display:flex; flex-direction:column; gap:10px; margin-bottom:22px; }
.cs-leg { border:2px solid var(--line-soft); border-left-width:5px; border-radius:4px; padding:12px 14px; background:rgba(246,251,239,.04); }
.cs-leg.s-clay  { border-left-color:var(--clay); }
.cs-leg.s-grass { border-left-color:var(--grass); }
.cs-leg.s-hard  { border-left-color:var(--hard); }
.cs-leg-top { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:8px; }
.cs-leg-name { font-weight:700; font-size:15px; color:var(--chalk); }
.cs-leg-surface { font-size:10px; letter-spacing:.12em; text-transform:uppercase; font-weight:700; color:var(--dim); }
.cs-leg-bar-track { height:8px; background:rgba(7,28,16,.4); border-radius:4px; overflow:hidden; }
.cs-leg-bar { height:100%; background:var(--dim); }
.cs-leg.win .cs-leg-bar { background:var(--ball); }
.cs-leg.loss .cs-leg-bar { background:var(--clay); }
.cs-leg-bottom { display:flex; justify-content:space-between; font-size:12px; font-weight:600; margin-top:6px; color:var(--chalk); }
.cs-leg.win .cs-leg-bottom span:first-child { color:var(--ball-soft); }
.cs-leg.loss .cs-leg-bottom span:first-child { color:var(--clay); }

.cs-breakdown { margin-bottom:22px; }
.cs-breakdown summary { cursor:pointer; font-weight:700; font-size:14px; padding:8px 0; color:var(--chalk); }
.cs-build-list { display:flex; flex-direction:column; gap:2px; margin-top:8px; }
.cs-build-row { display:flex; justify-content:space-between; gap:14px; font-size:13px; padding:7px 0; border-bottom:1px solid var(--line-soft); }
.cs-build-row span:first-child { font-weight:700; color:var(--chalk); }
.cs-build-val { color:var(--dim); text-align:right; }

@media (max-width:520px){
  .cs-surfaces { grid-template-columns:repeat(2,1fr); }
  .cs-attr-grid { grid-template-columns:repeat(2,1fr); }
  .cs-stage { flex-direction:column; align-items:center; }
  .cs-court { width:140px; flex-basis:auto; }
  .cs-figure { width:150px; flex-basis:auto; }
}
`;
