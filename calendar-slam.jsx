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

// --- Player pools. Ratings are illustrative estimates, NOT real data. --------
// Each player: stats, country flag (emoji), and a one-line career fact.
const POOL_ATP = [
  { name: "Pete Sampras", flag: "🇺🇸", fact: "Serve-and-volley king who ruled the grass of the 1990s.", stats: { serve: 97, return: 78, forehand: 90, backhand: 84, net: 95, movement: 86, defence: 80, stamina: 84, mental: 92, touch: 88 } },
  { name: "Andre Agassi", flag: "🇺🇸", fact: "The great returner whose ball-striking redefined the baseline.", stats: { serve: 80, return: 96, forehand: 93, backhand: 92, net: 78, movement: 85, defence: 88, stamina: 86, mental: 84, touch: 80 } },
  { name: "Roger Federer", flag: "🇨🇭", fact: "The most elegant all-courter the game has ever seen.", stats: { serve: 92, return: 86, forehand: 97, backhand: 84, net: 92, movement: 95, defence: 88, stamina: 90, mental: 93, touch: 96 } },
  { name: "Rafael Nadal", flag: "🇪🇸", fact: "The King of Clay, famed for relentless topspin and iron will.", stats: { serve: 85, return: 92, forehand: 98, backhand: 88, net: 82, movement: 96, defence: 97, stamina: 98, mental: 97, touch: 84 } },
  { name: "Novak Djokovic", flag: "🇷🇸", fact: "The supreme returner and defender, bending matches to his will.", stats: { serve: 88, return: 99, forehand: 92, backhand: 97, net: 84, movement: 97, defence: 96, stamina: 96, mental: 95, touch: 86 } },
  { name: "Ivan Lendl", flag: "🇨🇿", fact: "The ruthless baseliner who industrialised the modern forehand.", stats: { serve: 88, return: 84, forehand: 94, backhand: 86, net: 76, movement: 84, defence: 86, stamina: 92, mental: 90, touch: 74 } },
  { name: "Boris Becker", flag: "🇩🇪", fact: "The diving teenage Wimbledon champion with a thunderous serve.", stats: { serve: 95, return: 80, forehand: 88, backhand: 82, net: 93, movement: 82, defence: 78, stamina: 82, mental: 86, touch: 82 } },
  { name: "Stefan Edberg", flag: "🇸🇪", fact: "The most graceful serve-and-volleyer of his generation.", stats: { serve: 89, return: 82, forehand: 80, backhand: 88, net: 97, movement: 90, defence: 84, stamina: 84, mental: 85, touch: 90 } },
  { name: "Bjorn Borg", flag: "🇸🇪", fact: "The ice-cool baseliner who conquered both clay and grass.", stats: { serve: 86, return: 88, forehand: 92, backhand: 90, net: 80, movement: 94, defence: 93, stamina: 96, mental: 96, touch: 82 } },
  { name: "John McEnroe", flag: "🇺🇸", fact: "A touch artist at net with the finest hands in the game.", stats: { serve: 87, return: 86, forehand: 84, backhand: 82, net: 96, movement: 88, defence: 82, stamina: 80, mental: 78, touch: 98 } },
  { name: "Andy Murray", flag: "🇬🇧", fact: "A brilliant counterpuncher and one of the best returners around.", stats: { serve: 84, return: 94, forehand: 86, backhand: 90, net: 85, movement: 93, defence: 95, stamina: 92, mental: 84, touch: 90 } },
  { name: "Stan Wawrinka", flag: "🇨🇭", fact: "Owner of perhaps the most devastating one-handed backhand ever.", stats: { serve: 88, return: 84, forehand: 90, backhand: 96, net: 80, movement: 82, defence: 82, stamina: 84, mental: 82, touch: 84 } },
  { name: "Juan M. del Potro", flag: "🇦🇷", fact: "A gentle giant whose forehand was one of the heaviest in history.", stats: { serve: 91, return: 82, forehand: 98, backhand: 80, net: 78, movement: 78, defence: 80, stamina: 82, mental: 84, touch: 72 } },
  { name: "Goran Ivanisevic", flag: "🇭🇷", fact: "A wildcard with a left-handed serve that bordered on unplayable.", stats: { serve: 99, return: 70, forehand: 82, backhand: 76, net: 86, movement: 76, defence: 70, stamina: 78, mental: 74, touch: 76 } },
  { name: "Gustavo Kuerten", flag: "🇧🇷", fact: "The joyful Brazilian whose topspin made him a clay-court hero.", stats: { serve: 84, return: 84, forehand: 93, backhand: 86, net: 78, movement: 88, defence: 90, stamina: 90, mental: 86, touch: 88 } },
  { name: "Marat Safin", flag: "🇷🇺", fact: "A mercurial talent with raw power off both wings.", stats: { serve: 93, return: 86, forehand: 92, backhand: 90, net: 82, movement: 84, defence: 82, stamina: 80, mental: 70, touch: 80 } },
  // Current era
  { name: "Jannik Sinner", flag: "🇮🇹", fact: "The ice-cold Italian No. 1 with flat, relentless ball-striking.", stats: { serve: 90, return: 92, forehand: 95, backhand: 94, net: 82, movement: 92, defence: 90, stamina: 92, mental: 93, touch: 80 } },
  { name: "Carlos Alcaraz", flag: "🇪🇸", fact: "The electric all-court prodigy with dazzling variety.", stats: { serve: 88, return: 90, forehand: 96, backhand: 88, net: 90, movement: 97, defence: 92, stamina: 93, mental: 90, touch: 95 } },
  { name: "Alexander Zverev", flag: "🇩🇪", fact: "A towering baseliner with a heavy serve and clay-court grit.", stats: { serve: 94, return: 86, forehand: 88, backhand: 92, net: 80, movement: 86, defence: 86, stamina: 88, mental: 80, touch: 78 } },
  { name: "Daniil Medvedev", flag: "🇷🇺", fact: "An unorthodox counterpuncher who defends from deep behind the line.", stats: { serve: 88, return: 94, forehand: 86, backhand: 88, net: 76, movement: 90, defence: 95, stamina: 90, mental: 82, touch: 80 } },
  { name: "Ben Shelton", flag: "🇺🇸", fact: "A young American powerhouse with an explosive lefty serve.", stats: { serve: 96, return: 80, forehand: 92, backhand: 80, net: 82, movement: 84, defence: 78, stamina: 84, mental: 82, touch: 76 } },
];

const POOL_WTA = [
  { name: "Serena Williams", flag: "🇺🇸", fact: "The most dominant force in women's tennis, with a colossal serve.", stats: { serve: 98, return: 90, forehand: 95, backhand: 92, net: 84, movement: 88, defence: 86, stamina: 90, mental: 97, touch: 82 } },
  { name: "Steffi Graf", flag: "🇩🇪", fact: "Owner of a fearsome forehand and the only Golden Slam in history.", stats: { serve: 90, return: 88, forehand: 98, backhand: 84, net: 86, movement: 96, defence: 90, stamina: 94, mental: 96, touch: 84 } },
  { name: "Martina Navratilova", flag: "🇺🇸", fact: "The serve-and-volley pioneer who redefined athleticism on tour.", stats: { serve: 92, return: 84, forehand: 88, backhand: 86, net: 98, movement: 92, defence: 84, stamina: 90, mental: 92, touch: 94 } },
  { name: "Justine Henin", flag: "🇧🇪", fact: "A graceful all-courter with arguably the finest backhand in the game.", stats: { serve: 84, return: 90, forehand: 90, backhand: 98, net: 88, movement: 94, defence: 92, stamina: 88, mental: 90, touch: 92 } },
  { name: "Monica Seles", flag: "🇷🇸", fact: "A ferocious two-fisted hitter who took the ball impossibly early.", stats: { serve: 84, return: 94, forehand: 95, backhand: 96, net: 76, movement: 84, defence: 86, stamina: 86, mental: 88, touch: 78 } },
  { name: "Venus Williams", flag: "🇺🇸", fact: "A grass-court great with a huge serve and explosive movement.", stats: { serve: 94, return: 84, forehand: 90, backhand: 86, net: 86, movement: 94, defence: 84, stamina: 88, mental: 86, touch: 80 } },
  { name: "Chris Evert", flag: "🇺🇸", fact: "The metronomic baseliner whose consistency was almost inhuman.", stats: { serve: 78, return: 90, forehand: 90, backhand: 94, net: 74, movement: 88, defence: 96, stamina: 92, mental: 96, touch: 84 } },
  { name: "Martina Hingis", flag: "🇨🇭", fact: "A tactical genius who out-thought opponents with guile and angles.", stats: { serve: 78, return: 88, forehand: 84, backhand: 86, net: 90, movement: 92, defence: 90, stamina: 84, mental: 90, touch: 96 } },
  { name: "Maria Sharapova", flag: "🇷🇺", fact: "A fierce competitor with flat, penetrating groundstrokes.", stats: { serve: 90, return: 86, forehand: 92, backhand: 92, net: 76, movement: 80, defence: 82, stamina: 86, mental: 94, touch: 74 } },
  { name: "Kim Clijsters", flag: "🇧🇪", fact: "A supreme athlete famed for sliding splits and elastic defence.", stats: { serve: 86, return: 90, forehand: 90, backhand: 88, net: 84, movement: 95, defence: 94, stamina: 88, mental: 86, touch: 84 } },
  // Current era
  { name: "Aryna Sabalenka", flag: "🇧🇾", fact: "The current world No. 1, hitting with overwhelming power.", stats: { serve: 92, return: 88, forehand: 95, backhand: 92, net: 80, movement: 86, defence: 84, stamina: 88, mental: 88, touch: 78 } },
  { name: "Iga Swiatek", flag: "🇵🇱", fact: "A clay-court phenomenon with heavy topspin and relentless movement.", stats: { serve: 86, return: 92, forehand: 96, backhand: 88, net: 80, movement: 95, defence: 93, stamina: 92, mental: 90, touch: 86 } },
  { name: "Coco Gauff", flag: "🇺🇸", fact: "A lightning-quick defender with a booming serve and big future.", stats: { serve: 90, return: 90, forehand: 84, backhand: 92, net: 82, movement: 96, defence: 94, stamina: 90, mental: 86, touch: 84 } },
  { name: "Elena Rybakina", flag: "🇰🇿", fact: "A grass-court force with one of the biggest serves on tour.", stats: { serve: 95, return: 84, forehand: 92, backhand: 86, net: 80, movement: 84, defence: 82, stamina: 86, mental: 86, touch: 78 } },
  { name: "Jessica Pegula", flag: "🇺🇸", fact: "A clean, consistent ball-striker who takes time away from rivals.", stats: { serve: 84, return: 90, forehand: 90, backhand: 90, net: 82, movement: 88, defence: 90, stamina: 88, mental: 86, touch: 84 } },
  { name: "Naomi Osaka", flag: "🇯🇵", fact: "A hard-court champion with a thunderous serve and forehand.", stats: { serve: 94, return: 84, forehand: 94, backhand: 86, net: 78, movement: 82, defence: 80, stamina: 84, mental: 84, touch: 76 } },
];

// --- The field: real current tour players. Each has a base level and
// per-surface adjustments, plus a signature for loss narratives. Estimates. ---
const FIELD_ATP = [
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

const FIELD_WTA = [
  { name: "Aryna Sabalenka", base: 88, surf: { Hard: 4, Clay: 1, Grass: 2 }, weapon: "overwhelming power", style: "baseline" },
  { name: "Iga Swiatek", base: 88, surf: { Hard: 2, Clay: 4, Grass: 1 }, weapon: "heavy topspin and relentless movement", style: "defence" },
  { name: "Coco Gauff", base: 84, surf: { Hard: 3, Clay: 2, Grass: 2 }, weapon: "lightning speed and a big serve", style: "defence" },
  { name: "Elena Rybakina", base: 83, surf: { Hard: 3, Clay: 0, Grass: 4 }, weapon: "one of the biggest serves on tour", style: "serve" },
  { name: "Jessica Pegula", base: 80, surf: { Hard: 3, Clay: 1, Grass: 2 }, weapon: "clean, early ball-striking", style: "baseline" },
  { name: "Jasmine Paolini", base: 79, surf: { Hard: 1, Clay: 3, Grass: 2 }, weapon: "fearless attacking tennis", style: "allcourt" },
  { name: "Qinwen Zheng", base: 81, surf: { Hard: 3, Clay: 1, Grass: 1 }, weapon: "a powerful serve and forehand", style: "serve" },
  { name: "Madison Keys", base: 80, surf: { Hard: 3, Clay: 0, Grass: 2 }, weapon: "thunderous flat hitting", style: "baseline" },
  { name: "Mirra Andreeva", base: 80, surf: { Hard: 2, Clay: 2, Grass: 2 }, weapon: "precocious all-court maturity", style: "allcourt" },
  { name: "Barbora Krejcikova", base: 78, surf: { Hard: 1, Clay: 3, Grass: 3 }, weapon: "craft, variety and slice", style: "allcourt" },
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

// Lower-ranked but real current tour players for the early rounds. Estimates.
const DRAW_ATP = [
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

const DRAW_WTA = [
  { name: "Emma Navarro", base: 77, surf: { Hard: 2, Clay: 1, Grass: 1 }, weapon: "tireless retrieving", style: "defence" },
  { name: "Daria Kasatkina", base: 76, surf: { Hard: 1, Clay: 3, Grass: 1 }, weapon: "clever variety and touch", style: "allcourt" },
  { name: "Beatriz Haddad Maia", base: 75, surf: { Hard: 1, Clay: 3, Grass: 2 }, weapon: "a heavy lefty forehand", style: "baseline" },
  { name: "Liudmila Samsonova", base: 75, surf: { Hard: 3, Clay: 0, Grass: 2 }, weapon: "flat, powerful hitting", style: "baseline" },
  { name: "Ekaterina Alexandrova", base: 74, surf: { Hard: 3, Clay: 0, Grass: 2 }, weapon: "early, aggressive ball-striking", style: "baseline" },
  { name: "Elina Svitolina", base: 76, surf: { Hard: 2, Clay: 2, Grass: 2 }, weapon: "rock-solid counterpunching", style: "defence" },
  { name: "Diana Shnaider", base: 74, surf: { Hard: 2, Clay: 2, Grass: 1 }, weapon: "a fearless lefty game", style: "baseline" },
  { name: "Donna Vekic", base: 73, surf: { Hard: 2, Clay: 0, Grass: 2 }, weapon: "big first-strike tennis", style: "serve" },
  { name: "Marketa Vondrousova", base: 75, surf: { Hard: 1, Clay: 2, Grass: 4 }, weapon: "crafty lefty slice and angles", style: "allcourt" },
  { name: "Anna Kalinskaya", base: 73, surf: { Hard: 2, Clay: 1, Grass: 1 }, weapon: "clean, compact groundstrokes", style: "baseline" },
  { name: "Paula Badosa", base: 74, surf: { Hard: 2, Clay: 2, Grass: 1 }, weapon: "powerful baseline hitting", style: "baseline" },
  { name: "Victoria Azarenka", base: 75, surf: { Hard: 3, Clay: 1, Grass: 1 }, weapon: "relentless two-handed pressure", style: "return" },
  { name: "Karolina Muchova", base: 76, surf: { Hard: 2, Clay: 3, Grass: 2 }, weapon: "exquisite all-court variety", style: "allcourt" },
  { name: "Leylah Fernandez", base: 73, surf: { Hard: 2, Clay: 2, Grass: 1 }, weapon: "scrappy lefty defence", style: "defence" },
  { name: "Sofia Kenin", base: 72, surf: { Hard: 2, Clay: 1, Grass: 1 }, weapon: "sharp, flat angles", style: "baseline" },
];

const ROUNDS = ["Round 1", "Round 2", "Round 3", "Round 4", "Quarter-final", "Semi-final", "Final"];

// Build a 7-man draw for a major. Early rounds (1-4) pull realistic top-100
// names; the back end (QF/SF/F) draws from the top 10, ordered so the toughest
// surface threat is the likeliest final. Returns ordered opponents per round.
function buildDraw(slam, rand, field, drawPool) {
  const withLevel = (arr) =>
    arr.map((p) => ({ ...p, level: p.base + p.surf[slam.surface] }));

  const lower = withLevel(drawPool).sort(() => rand() - 0.5);
  const top = withLevel(field).sort((a, b) => a.level - b.level);

  const draw = [];
  // Rounds 1-3: lower-ranked tour players
  for (let r = 0; r < 3; r++) draw.push(lower[r]);
  // Round 4: a strong lower player or a weaker top-10 name
  const r4Pool = [lower[3], top[0], top[1]];
  draw.push(r4Pool[Math.floor(rand() * r4Pool.length)]);
  // QF / SF / Final: the genuine contenders, with a championship-week boost so
  // the back half plays at peak. Keeps the calendar slam genuinely rare.
  const top5 = top.slice(-5);
  const boost = (p, by) => ({ ...p, level: p.level + by });
  draw.push(boost(top5[Math.floor(rand() * 2)], 1));        // QF
  draw.push(boost(top5[2 + Math.floor(rand() * 2)], 2));    // SF
  draw.push(boost(top[top.length - 1], 3));                 // Final: surface king at his best
  return draw;
}

// Bundles for each tour, selected at runtime.
const TOURS = {
  atp: { pool: POOL_ATP, field: FIELD_ATP, draw: DRAW_ATP, label: "ATP", sub: "Men's Tour" },
  wta: { pool: POOL_WTA, field: FIELD_WTA, draw: DRAW_WTA, label: "WTA", sub: "Women's Tour" },
};

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
function simulateMajor(build, slam, rand, usedReasons, field, drawPool) {
  const draw = buildDraw(slam, rand, field, drawPool);
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
    <svg className={`cs-figure ${wholeHot ? "pulse" : ""}`} viewBox="0 0 220 300" aria-hidden="true">
      {/* back leg */}
      <path className={cls("legs")} d="M96 150 C92 168 84 186 74 206 C66 222 54 240 44 258 C40 266 36 274 38 280 C40 285 48 285 52 280 C62 266 72 250 82 234 C92 218 100 200 106 180 C110 168 110 158 106 150 Z" />
      <path className={cls("feet")} d="M44 256 C36 262 30 272 28 280 C27 286 32 289 40 288 C50 286 58 282 60 276 C61 270 56 264 50 262 C47 260 45 258 44 256 Z" />
      {/* front leg */}
      <path className={cls("legs")} d="M118 150 C124 170 128 190 132 212 C135 230 137 250 137 270 C137 278 140 283 146 283 C153 283 156 277 155 269 C153 248 150 226 146 206 C142 184 138 166 132 150 Z" />
      <path className={cls("feet")} d="M133 268 C131 276 132 283 138 286 C146 289 156 287 160 281 C163 276 159 270 152 268 C145 266 138 266 133 268 Z" />
      {/* hips */}
      <path className={cls("hips")} d="M92 132 C104 126 122 126 132 134 C137 144 138 154 136 162 C124 168 108 168 96 164 C90 158 89 144 92 132 Z" />
      {/* torso */}
      <path className={cls("torso")} d="M94 64 C104 56 122 56 130 66 C134 84 135 104 134 122 C133 134 130 144 124 150 C112 154 100 153 92 148 C88 138 88 122 88 104 C88 86 90 72 94 64 Z" />
      {/* off arm */}
      <path className={cls("offArm")} d="M96 76 C84 80 74 90 70 104 C67 116 70 128 78 134 C84 137 90 133 90 126 C89 116 92 106 100 100 C108 94 118 92 126 96 C130 92 128 84 120 80 C112 76 102 74 96 76 Z" />
      {/* racket arm */}
      <path className={cls("racketArm")} d="M128 64 C142 60 156 66 164 80 C170 92 170 106 166 118 C163 126 156 128 150 124 C146 120 147 110 148 100 C148 90 142 82 132 80 C124 78 120 76 120 70 C121 64 124 64 128 64 Z" />
      <path className={cls("racketArm")} d="M158 96 C168 82 176 66 180 52 C182 44 178 38 172 40 C166 42 164 50 160 62 C156 74 150 86 146 96 C150 100 154 100 158 96 Z" />
      {/* racket */}
      <g className={cls("racket")}>
        <ellipse cx="186" cy="34" rx="22" ry="28" fill="none" strokeWidth="5" />
        <ellipse cx="186" cy="34" rx="14" ry="19" fill="none" strokeWidth="1.5" opacity="0.5" />
        <path d="M178 58 L170 76 M192 58 L184 76" strokeWidth="5" fill="none" />
      </g>
      {/* neck + head */}
      <path className={cls("torso")} d="M106 50 C106 58 112 62 119 62 C126 62 128 54 127 48 L127 42 L107 42 Z" />
      <path className={cls("head")} d="M105 24 C105 12 116 8 124 12 C132 16 134 28 130 38 C127 46 118 48 111 44 C106 41 104 32 105 24 Z" />
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

function ShareCard({ active, ranSim, build, tourLabel, onClose }) {
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
    `Calendar Slam — ${headline}\n${squares}\n${ranSim ? `Simulated vs the ${tourLabel} field` : "Quick projection"}\nplay: calendarslam.com`;

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

        <div className="cs-share-mode">{ranSim ? `Simulated vs the ${tourLabel} field` : "Quick projection"}</div>

        <button className="cs-cta cs-share-copy" onClick={copy}>
          {copied ? "Copied ✓" : "Copy result"}
        </button>
        <pre className="cs-share-preview">{shareText}</pre>
      </div>
    </div>
  );
}

// ============================================================================

// A simple tennis net graphic used as a divider / motif.
function NetGraphic() {
  return (
    <svg className="cs-net" viewBox="0 0 400 70" aria-hidden="true" preserveAspectRatio="none">
      {/* net band top */}
      <rect x="0" y="6" width="400" height="7" fill="var(--chalk)" />
      {/* posts */}
      <rect x="2" y="6" width="4" height="60" fill="var(--chalk)" />
      <rect x="394" y="6" width="4" height="60" fill="var(--chalk)" />
      {/* mesh */}
      <g stroke="var(--line)" strokeWidth="1">
        {Array.from({ length: 33 }).map((_, i) => (
          <line key={`v${i}`} x1={6 + i * 12} y1="13" x2={6 + i * 12} y2="66" />
        ))}
        {Array.from({ length: 5 }).map((_, i) => (
          <line key={`h${i}`} x1="6" y1={20 + i * 11} x2="394" y2={20 + i * 11} />
        ))}
      </g>
    </svg>
  );
}

// ============================================================================

export default function CalendarSlam() {
  const [phase, setPhase] = useState("tour"); // tour | intro | draft | result
  const [tour, setTour] = useState("atp");
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
  const [reveal, setReveal] = useState({ slam: 0, round: 0, done: false }); // live sim progress

  const T = TOURS[tour];
  const POOL = T.pool;

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
    setReveal({ slam: 0, round: 0, done: false });
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
      [attrKey]: { rating: current.stats[attrKey], player: current.name, flag: current.flag },
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
      const r = simulateMajor(build, s, rand, usedReasons, T.field, T.draw);
      if (r.wonTitle) won++;
      return { ...s, ...r };
    });
    return { perSlam, won, tier: tierFor(won) };
  }, [phase, build, ranSim, seed]);

  // Kick off a fresh live simulation: reset reveal, new seed, run sim.
  function startSim() {
    setReveal({ slam: 0, round: 0, done: false });
    setSeed(Math.floor(Math.random() * 1e9));
    setRanSim(true);
  }

  function skipSim() {
    setReveal({ slam: SLAMS.length, round: 0, done: true });
  }

  // Drive the live reveal: step through each major's rounds, then the next major.
  useEffect(() => {
    if (!ranSim || !simResults || reveal.done) return;
    const slam = simResults.perSlam[reveal.slam];
    if (!slam) { setReveal((r) => ({ ...r, done: true })); return; }
    const lastRound = slam.path.length - 1;
    const delay = reduce ? 0 : 480;
    const t = setTimeout(() => {
      setReveal((r) => {
        if (r.round < lastRound) return { ...r, round: r.round + 1 };
        // finished this major's rounds; pause, then move to next major
        if (r.slam + 1 >= SLAMS.length) return { ...r, done: true };
        return { slam: r.slam + 1, round: 0, done: false };
      });
    }, reveal.round < lastRound ? delay : delay * 1.6);
    return () => clearTimeout(t);
  }, [ranSim, simResults, reveal, reduce]);

  return (
    <div className="cs-root">
      <style>{CSS}</style>

      <header className="cs-head">
        <div className="cs-wordmark">Calendar Slam</div>
        <div className="cs-tag">build a champion, shot by shot</div>
      </header>

      {phase === "tour" && (
        <section className="cs-tourpick">
          <NetGraphic />
          <h1 className="cs-h1">
            Build a<br /><em>tennis god.</em>
          </h1>
          <p className="cs-lede">
            Spin real players, draft their iconic weapons, and chase the rarest
            prize in the sport: all four majors in a single year. Choose your tour.
          </p>
          <div className="cs-tour-btns">
            <button
              className="cs-tour-btn atp"
              onClick={() => { setTour("atp"); setPhase("intro"); }}
            >
              <span className="cs-tour-label">ATP</span>
              <span className="cs-tour-sub">Men's Tour</span>
            </button>
            <button
              className="cs-tour-btn wta"
              onClick={() => { setTour("wta"); setPhase("intro"); }}
            >
              <span className="cs-tour-label">WTA</span>
              <span className="cs-tour-sub">Women's Tour</span>
            </button>
          </div>
        </section>
      )}

      {phase === "intro" && (
        <section className="cs-intro">
          <div className="cs-intro-tour">{T.label} · {T.sub}</div>
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
              <div key={s.key} className={`cs-surface-chip slam-${s.key}`}>
                <span className="cs-chip-name">{s.name}</span>
                <span className="cs-chip-surface">{s.surface}</span>
              </div>
            ))}
          </div>

          <div className="cs-intro-actions">
            <button className="cs-cta" onClick={startDraft}>Start drafting →</button>
            <button className="cs-text-btn" onClick={() => setPhase("tour")}>← Change tour</button>
          </div>
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

          <div className="cs-sticky">
            <div className="cs-stage">
              <div className={`cs-card ${spinning ? "spin" : ""}`}>
                <div className="cs-card-eyebrow">Now drafting from</div>
                <div className="cs-card-name">
                  <span className="cs-card-flag">{current.flag}</span>
                  {current.name}
                </div>
                {!spinning && current.fact && (
                  <div className="cs-card-fact">{current.fact}</div>
                )}
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
                    <span className="cs-attr-locked">
                      <span className="cs-attr-lock">🔒 Locked</span>
                      <span className="cs-attr-owner">
                        <span className="cs-attr-flag">{build[a.key].flag}</span>
                        {build[a.key].player} · {build[a.key].rating}
                      </span>
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
              <p>This is the quick projection. Want the real test? Play it out round by round against the field, live. It's harder, and the field is unforgiving.</p>
              <button className="cs-sim-btn" onClick={startSim}>
                ▶ Simulate match by match
              </button>
            </div>
          )}

          {ranSim && simResults && (
            <>
              {reveal.done ? (
                <div className={`cs-tier ${simResults.tier.glow ? "glow" : ""}`}>
                  <div className="cs-tier-eyebrow">Simulated · live {T.label} field</div>
                  <div className="cs-tier-count">{simResults.won} / 4</div>
                  <div className="cs-tier-name">{simResults.tier.name}</div>
                  <div className="cs-tier-note">{simResults.tier.note}</div>
                </div>
              ) : (
                <div className="cs-live-banner">
                  <span className="cs-live-dot" />
                  Playing {simResults.perSlam[reveal.slam]?.name}…
                  <button className="cs-skip-btn" onClick={skipSim}>Skip ⏭</button>
                </div>
              )}

              <div className="cs-gauntlet">
                {simResults.perSlam.map((s, si) => {
                  if (si > reveal.slam) return null; // not reached yet
                  const isCurrent = si === reveal.slam && !reveal.done;
                  const roundsToShow = reveal.done || si < reveal.slam
                    ? s.path.length
                    : reveal.round + 1;
                  const resolved = roundsToShow >= s.path.length;
                  return (
                    <div key={s.key} className={`cs-leg slam-${s.key} ${resolved ? (s.wonTitle ? "win" : "loss") : "playing"}`}>
                      <div className="cs-leg-top">
                        <span className="cs-leg-name">{s.name}</span>
                        <span className="cs-leg-surface">{s.surface}</span>
                      </div>

                      {resolved && (
                        s.wonTitle ? (
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
                        )
                      )}

                      <ol className="cs-path-list cs-path-live">
                        {s.path.slice(0, roundsToShow).map((p, i) => (
                          <li key={i} className={p.won ? "won" : "lost"}>
                            <span className="cs-path-round">{p.round}</span>
                            <span className="cs-path-opp">
                              {p.won ? "def." : "lost to"} {p.name}
                            </span>
                            <span className="cs-path-score">{p.score}</span>
                          </li>
                        ))}
                        {isCurrent && !resolved && (
                          <li className="cs-path-playing">
                            <span className="cs-path-round">{ROUNDS[roundsToShow]}</span>
                            <span className="cs-path-opp">playing…</span>
                            <span className="cs-path-score">—</span>
                          </li>
                        )}
                      </ol>
                    </div>
                  );
                })}
              </div>

              {reveal.done && (
                <div className="cs-sim-prompt">
                  <button className="cs-sim-btn" onClick={startSim}>
                    ↻ Run the year again (new draw)
                  </button>
                  <button className="cs-sim-btn cs-share-btn" onClick={() => setShowCard(true)}>
                    ↗ Share result
                  </button>
                </div>
              )}
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
          tourLabel={T.label}
          onClose={() => setShowCard(false)}
        />
      )}
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600;700&display=swap');

.cs-root {
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
  color: var(--chalk);
  font-family: "Barlow", ui-sans-serif, system-ui, sans-serif;
  min-height: 100%;
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
.cs-attr.taken { background:rgba(216,240,0,.1); border-color:rgba(216,240,0,.4); cursor:default; opacity:1; }
.cs-attr.armed { border-color:var(--ball); background:rgba(216,240,0,.12); transform:translateY(-2px); }
.cs-attr-confirm { font-size:10px; letter-spacing:.06em; text-transform:uppercase; font-weight:800; color:var(--ball-soft); margin-top:2px; }
.cs-attr-label { font-size:11px; letter-spacing:.08em; text-transform:uppercase; font-weight:700; color:var(--dim); }
.cs-attr-val { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:32px; line-height:1; color:var(--chalk); }
.cs-attr-locked { display:flex; flex-direction:column; gap:3px; }
.cs-attr-lock { font-size:10px; letter-spacing:.08em; text-transform:uppercase; font-weight:800; color:var(--ball-soft); }
.cs-attr-owner { font-size:12.5px; font-weight:700; color:var(--chalk); line-height:1.25; }
.cs-attr-flag { margin-right:4px; }

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

/* card flag + fact */
.cs-card-flag { margin-right:8px; }
.cs-card-fact { font-size:13px; line-height:1.45; color:var(--dim); margin:0 0 10px; max-width:42ch; }

/* sticky stage on scroll so you always see who you're drafting */
.cs-sticky { position:sticky; top:0; z-index:10; background:
  repeating-linear-gradient(90deg, transparent 0 38px, rgba(246,251,239,.025) 38px 76px),
  var(--grass-deep);
  padding:10px 0 12px; margin-bottom:8px; border-bottom:1px solid var(--line-soft); }

/* tour picker */
.cs-tourpick { padding-top:20px; text-align:left; }
.cs-net { width:100%; height:54px; display:block; margin-bottom:24px; opacity:.85; }
.cs-tour-btns { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:8px; max-width:520px; }
.cs-tour-btn { display:flex; flex-direction:column; align-items:flex-start; gap:4px; padding:22px 24px; border-radius:8px; border:2.5px solid var(--chalk); background:rgba(246,251,239,.05); cursor:pointer; transition:transform .12s, background .2s, border-color .2s; }
.cs-tour-btn:hover { transform:translateY(-3px); background:rgba(216,240,0,.1); border-color:var(--ball); }
.cs-tour-btn:focus-visible { outline:3px solid var(--ball); outline-offset:3px; }
.cs-tour-label { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:40px; line-height:1; letter-spacing:.02em; color:var(--chalk); }
.cs-tour-btn:hover .cs-tour-label { color:var(--ball); }
.cs-tour-sub { font-size:12px; letter-spacing:.12em; text-transform:uppercase; font-weight:700; color:var(--dim); }
.cs-intro-tour { font-size:11px; letter-spacing:.16em; text-transform:uppercase; font-weight:800; color:var(--ball); margin-bottom:10px; }
.cs-intro-actions { display:flex; align-items:center; gap:18px; flex-wrap:wrap; }
.cs-text-btn { background:none; border:none; color:var(--dim); font-size:14px; font-weight:600; cursor:pointer; padding:8px 4px; }
.cs-text-btn:hover { color:var(--chalk); }

/* live simulation banner + skip */
.cs-live-banner { display:flex; align-items:center; gap:10px; font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:18px; letter-spacing:.04em; text-transform:uppercase; color:var(--chalk); margin-bottom:16px; padding:12px 16px; border:2px solid var(--ball); border-radius:6px; background:rgba(216,240,0,.08); }
.cs-live-dot { width:10px; height:10px; border-radius:50%; background:var(--ball); animation:cs-blink 1s ease-in-out infinite; }
@keyframes cs-blink { 0%,100%{opacity:1} 50%{opacity:.25} }
.cs-skip-btn { margin-left:auto; background:var(--ball); color:var(--ink); border:none; border-radius:4px; font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:14px; letter-spacing:.06em; text-transform:uppercase; padding:7px 16px; cursor:pointer; }
.cs-skip-btn:hover { filter:brightness(1.08); }
.cs-leg.playing { border-color:var(--ball); animation:cs-legin .3s ease; }
@keyframes cs-legin { from{opacity:0; transform:translateY(6px)} to{opacity:1; transform:none} }
.cs-path-live li { animation:cs-rowin .25s ease; }
@keyframes cs-rowin { from{opacity:0} to{opacity:1} }
.cs-path-playing { opacity:.7; font-style:italic; }
.cs-path-playing .cs-path-opp { color:var(--ball-soft) !important; }
@media (prefers-reduced-motion: reduce) {
  .cs-live-dot, .cs-leg.playing, .cs-path-live li { animation:none; }
}

/* major colour identities */
.slam-ao .cs-chip-surface { color:#2b7de9; }
.slam-rg .cs-chip-surface { color:#e07a3f; }
.slam-wim .cs-chip-surface { color:#5a2d82; }
.slam-uso .cs-chip-surface { color:#1a8fd0; }
.cs-surface-chip.slam-ao { border-color:#2b7de9; background:rgba(43,125,233,.14); }
.cs-surface-chip.slam-rg { border-color:#e07a3f; background:rgba(224,122,63,.14); }
.cs-surface-chip.slam-wim { border-color:#5a2d82; background:rgba(90,45,130,.18); }
.cs-surface-chip.slam-uso { border-color:#1a8fd0; background:rgba(26,143,208,.14); }
.cs-leg.slam-ao { border-left-color:#2b7de9; }
.cs-leg.slam-rg { border-left-color:#e07a3f; }
.cs-leg.slam-wim { border-left-color:#5a2d82; }
.cs-leg.slam-uso { border-left-color:#1a8fd0; }

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
  /* keep stage as a row on mobile so the sticky header stays short */
  .cs-stage { flex-direction:row; align-items:stretch; gap:12px; }
  .cs-figure { width:74px; flex:0 0 74px; }
  .cs-card { padding:14px 16px; }
  .cs-card-name { font-size:24px; }
  .cs-card-fact { display:none; }
  .cs-tour-btns { grid-template-columns:1fr 1fr; }
  .cs-meters { gap:7px; margin-bottom:12px; }
  .cs-sticky { padding-top:6px; }
}
`;
