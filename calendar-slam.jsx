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
  { name: "Pete Sampras",       flag: "🇺🇸", fact: "Serve-and-volley king who ruled the grass of the 1990s.", stats: { serve: 97, return: 78, forehand: 90, backhand: 84, net: 95, movement: 86, defence: 80, stamina: 84, mental: 92, touch: 88 } },
  { name: "Andre Agassi",       flag: "🇺🇸", fact: "The great returner whose ball-striking redefined the baseline.", stats: { serve: 80, return: 96, forehand: 93, backhand: 92, net: 78, movement: 85, defence: 88, stamina: 86, mental: 84, touch: 80 } },
  { name: "Roger Federer",      flag: "🇨🇭", fact: "The most elegant all-courter the game has ever seen.", stats: { serve: 92, return: 86, forehand: 97, backhand: 84, net: 92, movement: 95, defence: 88, stamina: 90, mental: 93, touch: 96 } },
  { name: "Rafael Nadal",       flag: "🇪🇸", fact: "The King of Clay, famed for relentless topspin and iron will.", stats: { serve: 85, return: 92, forehand: 98, backhand: 88, net: 82, movement: 96, defence: 97, stamina: 98, mental: 97, touch: 84 } },
  { name: "Novak Djokovic",     flag: "🇷🇸", fact: "The supreme returner and defender, bending matches to his will.", stats: { serve: 88, return: 99, forehand: 92, backhand: 97, net: 84, movement: 97, defence: 96, stamina: 96, mental: 95, touch: 86 } },
  { name: "Ivan Lendl",         flag: "🇨🇿", fact: "The ruthless baseliner who industrialised the modern forehand.", stats: { serve: 88, return: 84, forehand: 94, backhand: 86, net: 76, movement: 84, defence: 86, stamina: 92, mental: 90, touch: 74 } },
  { name: "Boris Becker",       flag: "🇩🇪", fact: "The diving teenage Wimbledon champion with a thunderous serve.", stats: { serve: 95, return: 80, forehand: 88, backhand: 82, net: 93, movement: 82, defence: 78, stamina: 82, mental: 86, touch: 82 } },
  { name: "Stefan Edberg",      flag: "🇸🇪", fact: "The most graceful serve-and-volleyer of his generation.", stats: { serve: 89, return: 82, forehand: 80, backhand: 88, net: 97, movement: 90, defence: 84, stamina: 84, mental: 85, touch: 90 } },
  { name: "Bjorn Borg",         flag: "🇸🇪", fact: "The ice-cool baseliner who conquered both clay and grass.", stats: { serve: 86, return: 88, forehand: 92, backhand: 90, net: 80, movement: 94, defence: 93, stamina: 96, mental: 96, touch: 82 } },
  { name: "John McEnroe",       flag: "🇺🇸", fact: "A touch artist at net with the finest hands in the game.", stats: { serve: 87, return: 86, forehand: 84, backhand: 82, net: 96, movement: 88, defence: 82, stamina: 80, mental: 78, touch: 98 } },
  { name: "Andy Murray",        flag: "🇬🇧", fact: "A brilliant counterpuncher and one of the best returners around.", stats: { serve: 84, return: 94, forehand: 86, backhand: 90, net: 85, movement: 93, defence: 95, stamina: 92, mental: 84, touch: 90 } },
  { name: "Stan Wawrinka",      flag: "🇨🇭", fact: "Owner of perhaps the most devastating one-handed backhand ever.", stats: { serve: 88, return: 84, forehand: 90, backhand: 96, net: 80, movement: 82, defence: 82, stamina: 84, mental: 82, touch: 84 } },
  { name: "Juan M. del Potro",  flag: "🇦🇷", fact: "A gentle giant whose forehand was one of the heaviest in history.", stats: { serve: 91, return: 82, forehand: 98, backhand: 80, net: 78, movement: 78, defence: 80, stamina: 82, mental: 84, touch: 72 } },
  { name: "Goran Ivanisevic",   flag: "🇭🇷", fact: "A wildcard with a left-handed serve that bordered on unplayable.", stats: { serve: 99, return: 70, forehand: 82, backhand: 76, net: 86, movement: 76, defence: 70, stamina: 78, mental: 74, touch: 76 } },
  { name: "Gustavo Kuerten",    flag: "🇧🇷", fact: "The joyful Brazilian whose topspin made him a clay-court hero.", stats: { serve: 84, return: 84, forehand: 93, backhand: 86, net: 78, movement: 88, defence: 90, stamina: 90, mental: 86, touch: 88 } },
  { name: "Marat Safin",        flag: "🇷🇺", fact: "A mercurial talent with raw power off both wings.", stats: { serve: 93, return: 86, forehand: 92, backhand: 90, net: 82, movement: 84, defence: 82, stamina: 80, mental: 70, touch: 80 } },
  { name: "Jim Courier",        flag: "🇺🇸", fact: "A ferociously fit baseliner who dominated clay in the early 1990s.", stats: { serve: 84, return: 86, forehand: 94, backhand: 82, net: 76, movement: 88, defence: 88, stamina: 95, mental: 88, touch: 76 } },
  { name: "Thomas Muster",      flag: "🇦🇹", fact: "The unstoppable clay-court machine with relentless topspin.", stats: { serve: 78, return: 88, forehand: 94, backhand: 82, net: 72, movement: 90, defence: 92, stamina: 98, mental: 90, touch: 76 } },
  { name: "Patrick Rafter",     flag: "🇦🇺", fact: "A serve-and-volley artist who made grass his personal playground.", stats: { serve: 90, return: 80, forehand: 82, backhand: 84, net: 95, movement: 86, defence: 80, stamina: 82, mental: 88, touch: 88 } },
  { name: "Lleyton Hewitt",     flag: "🇦🇺", fact: "A relentless retriever whose fighting spirit was unmatched.", stats: { serve: 82, return: 94, forehand: 86, backhand: 84, net: 80, movement: 96, defence: 96, stamina: 94, mental: 94, touch: 84 } },
  { name: "Yevgeny Kafelnikov", flag: "🇷🇺", fact: "A complete all-court player who won on both clay and hard.", stats: { serve: 84, return: 86, forehand: 90, backhand: 88, net: 82, movement: 84, defence: 84, stamina: 86, mental: 82, touch: 80 } },
  { name: "Michael Chang",      flag: "🇺🇸", fact: "The youngest male Slam champion, famed for extraordinary defence.", stats: { serve: 74, return: 90, forehand: 84, backhand: 84, net: 72, movement: 96, defence: 97, stamina: 98, mental: 92, touch: 86 } },
  { name: "Tommy Haas",         flag: "🇩🇪", fact: "A stylish all-courter who consistently troubled the very best.", stats: { serve: 90, return: 82, forehand: 90, backhand: 86, net: 84, movement: 86, defence: 82, stamina: 80, mental: 80, touch: 84 } },
  { name: "David Ferrer",       flag: "🇪🇸", fact: "The tireless workhorse who punched well above his talent level.", stats: { serve: 80, return: 88, forehand: 88, backhand: 84, net: 76, movement: 94, defence: 94, stamina: 99, mental: 92, touch: 78 } },
  { name: "Robin Soderling",    flag: "🇸🇪", fact: "The only man to beat Nadal at Roland Garros during his peak.", stats: { serve: 90, return: 82, forehand: 95, backhand: 82, net: 78, movement: 80, defence: 80, stamina: 82, mental: 80, touch: 74 } },
  { name: "Andy Roddick",       flag: "🇺🇸", fact: "A US Open champion with one of the hardest serves in history.", stats: { serve: 97, return: 80, forehand: 90, backhand: 78, net: 80, movement: 82, defence: 78, stamina: 84, mental: 84, touch: 74 } },
  { name: "Nikolay Davydenko",  flag: "🇷🇺", fact: "A technically pristine baseliner who troubled every top player.", stats: { serve: 80, return: 86, forehand: 88, backhand: 88, net: 78, movement: 88, defence: 86, stamina: 90, mental: 82, touch: 82 } },
  // Current era
  { name: "Jannik Sinner",      flag: "🇮🇹", fact: "The ice-cold Italian No. 1 with flat, relentless ball-striking.", stats: { serve: 90, return: 92, forehand: 95, backhand: 94, net: 82, movement: 92, defence: 90, stamina: 92, mental: 93, touch: 80 } },
  { name: "Carlos Alcaraz",     flag: "🇪🇸", fact: "The electric all-court prodigy with dazzling variety.", stats: { serve: 88, return: 90, forehand: 96, backhand: 88, net: 90, movement: 97, defence: 92, stamina: 93, mental: 90, touch: 95 } },
  { name: "Alexander Zverev",   flag: "🇩🇪", fact: "A towering baseliner with a heavy serve and clay-court grit.", stats: { serve: 94, return: 86, forehand: 88, backhand: 92, net: 80, movement: 86, defence: 86, stamina: 88, mental: 80, touch: 78 } },
  { name: "Daniil Medvedev",    flag: "🇷🇺", fact: "An unorthodox counterpuncher who defends from deep behind the line.", stats: { serve: 88, return: 94, forehand: 86, backhand: 88, net: 76, movement: 90, defence: 95, stamina: 90, mental: 82, touch: 80 } },
  { name: "Ben Shelton",        flag: "🇺🇸", fact: "A young American powerhouse with an explosive lefty serve.", stats: { serve: 96, return: 80, forehand: 92, backhand: 80, net: 82, movement: 84, defence: 78, stamina: 84, mental: 82, touch: 76 } },
  { name: "Holger Rune",        flag: "🇩🇰", fact: "A fiery competitor with huge talent and all-court aggression.", stats: { serve: 88, return: 84, forehand: 90, backhand: 86, net: 82, movement: 86, defence: 82, stamina: 82, mental: 78, touch: 82 } },
  { name: "Felix Auger-Aliassime", flag:"🇨🇦", fact:"A serve-and-forehand powerhouse who thrives on fast surfaces.", stats: { serve: 92, return: 82, forehand: 90, backhand: 82, net: 84, movement: 86, defence: 80, stamina: 84, mental: 80, touch: 78 } },
  { name: "Stefanos Tsitsipas", flag: "🇬🇷", fact: "A fluid one-handed backhand player with creative shot-making.", stats: { serve: 87, return: 83, forehand: 90, backhand: 88, net: 84, movement: 86, defence: 82, stamina: 84, mental: 80, touch: 88 } },
];

const POOL_WTA = [
  { name: "Serena Williams",    flag: "🇺🇸", fact: "The most dominant force in women's tennis, with a colossal serve.", stats: { serve: 98, return: 90, forehand: 95, backhand: 92, net: 84, movement: 88, defence: 86, stamina: 90, mental: 97, touch: 82 } },
  { name: "Steffi Graf",        flag: "🇩🇪", fact: "Owner of a fearsome forehand and the only Golden Slam in history.", stats: { serve: 90, return: 88, forehand: 98, backhand: 84, net: 86, movement: 96, defence: 90, stamina: 94, mental: 96, touch: 84 } },
  { name: "Martina Navratilova",flag: "🇺🇸", fact: "The serve-and-volley pioneer who redefined athleticism on tour.", stats: { serve: 92, return: 84, forehand: 88, backhand: 86, net: 98, movement: 92, defence: 84, stamina: 90, mental: 92, touch: 94 } },
  { name: "Justine Henin",      flag: "🇧🇪", fact: "A graceful all-courter with arguably the finest backhand in the game.", stats: { serve: 84, return: 90, forehand: 90, backhand: 98, net: 88, movement: 94, defence: 92, stamina: 88, mental: 90, touch: 92 } },
  { name: "Monica Seles",       flag: "🇷🇸", fact: "A ferocious two-fisted hitter who took the ball impossibly early.", stats: { serve: 84, return: 94, forehand: 95, backhand: 96, net: 76, movement: 84, defence: 86, stamina: 86, mental: 88, touch: 78 } },
  { name: "Venus Williams",     flag: "🇺🇸", fact: "A grass-court great with a huge serve and explosive movement.", stats: { serve: 94, return: 84, forehand: 90, backhand: 86, net: 86, movement: 94, defence: 84, stamina: 88, mental: 86, touch: 80 } },
  { name: "Chris Evert",        flag: "🇺🇸", fact: "The metronomic baseliner whose consistency was almost inhuman.", stats: { serve: 78, return: 90, forehand: 90, backhand: 94, net: 74, movement: 88, defence: 96, stamina: 92, mental: 96, touch: 84 } },
  { name: "Martina Hingis",     flag: "🇨🇭", fact: "A tactical genius who out-thought opponents with guile and angles.", stats: { serve: 78, return: 88, forehand: 84, backhand: 86, net: 90, movement: 92, defence: 90, stamina: 84, mental: 90, touch: 96 } },
  { name: "Maria Sharapova",    flag: "🇷🇺", fact: "A fierce competitor with flat, penetrating groundstrokes.", stats: { serve: 90, return: 86, forehand: 92, backhand: 92, net: 76, movement: 80, defence: 82, stamina: 86, mental: 94, touch: 74 } },
  { name: "Kim Clijsters",      flag: "🇧🇪", fact: "A supreme athlete famed for sliding splits and elastic defence.", stats: { serve: 86, return: 90, forehand: 90, backhand: 88, net: 84, movement: 95, defence: 94, stamina: 88, mental: 86, touch: 84 } },
  { name: "Lindsay Davenport",  flag: "🇺🇸", fact: "A powerful flat hitter who dominated on hard courts.", stats: { serve: 88, return: 84, forehand: 90, backhand: 86, net: 82, movement: 80, defence: 82, stamina: 84, mental: 86, touch: 78 } },
  { name: "Victoria Azarenka",  flag: "🇧🇾", fact: "A two-handed powerhouse who pressured from every part of the court.", stats: { serve: 84, return: 90, forehand: 90, backhand: 86, net: 78, movement: 90, defence: 90, stamina: 88, mental: 84, touch: 78 } },
  { name: "Arantxa Sanchez-Vicario", flag:"🇪🇸", fact:"A relentless clay-court fighter with incredible defence.", stats: { serve: 74, return: 90, forehand: 86, backhand: 84, net: 78, movement: 94, defence: 96, stamina: 96, mental: 90, touch: 84 } },
  { name: "Mary Pierce",        flag: "🇫🇷", fact: "A French Open and Australian Open champion with a powerful game.", stats: { serve: 86, return: 82, forehand: 92, backhand: 84, net: 80, movement: 82, defence: 80, stamina: 82, mental: 82, touch: 78 } },
  { name: "Amelie Mauresmo",    flag: "🇫🇷", fact: "A versatile all-courter with an exceptional serve-and-volley game.", stats: { serve: 88, return: 84, forehand: 86, backhand: 90, net: 92, movement: 88, defence: 84, stamina: 84, mental: 84, touch: 88 } },
  // Current era
  { name: "Aryna Sabalenka",    flag: "🇧🇾", fact: "The current world No. 1, hitting with overwhelming power.", stats: { serve: 92, return: 88, forehand: 95, backhand: 92, net: 80, movement: 86, defence: 84, stamina: 88, mental: 88, touch: 78 } },
  { name: "Iga Swiatek",        flag: "🇵🇱", fact: "A clay-court phenomenon with heavy topspin and relentless movement.", stats: { serve: 86, return: 92, forehand: 96, backhand: 88, net: 80, movement: 95, defence: 93, stamina: 92, mental: 90, touch: 86 } },
  { name: "Coco Gauff",         flag: "🇺🇸", fact: "A lightning-quick defender with a booming serve and big future.", stats: { serve: 90, return: 90, forehand: 84, backhand: 92, net: 82, movement: 96, defence: 94, stamina: 90, mental: 86, touch: 84 } },
  { name: "Elena Rybakina",     flag: "🇰🇿", fact: "A grass-court force with one of the biggest serves on tour.", stats: { serve: 95, return: 84, forehand: 92, backhand: 86, net: 80, movement: 84, defence: 82, stamina: 86, mental: 86, touch: 78 } },
  { name: "Jessica Pegula",     flag: "🇺🇸", fact: "A clean, consistent ball-striker who takes time away from rivals.", stats: { serve: 84, return: 90, forehand: 90, backhand: 90, net: 82, movement: 88, defence: 90, stamina: 88, mental: 86, touch: 84 } },
  { name: "Naomi Osaka",        flag: "🇯🇵", fact: "A hard-court champion with a thunderous serve and forehand.", stats: { serve: 94, return: 84, forehand: 94, backhand: 86, net: 78, movement: 82, defence: 80, stamina: 84, mental: 84, touch: 76 } },
  { name: "Simona Halep",       flag: "🇷🇴", fact: "A clay and grass champion with exceptional movement and defence.", stats: { serve: 80, return: 90, forehand: 88, backhand: 86, net: 80, movement: 94, defence: 94, stamina: 90, mental: 88, touch: 86 } },
  { name: "Angelique Kerber",   flag: "🇩🇪", fact: "A left-handed defensive master who excelled on every surface.", stats: { serve: 80, return: 92, forehand: 84, backhand: 90, net: 78, movement: 92, defence: 96, stamina: 90, mental: 86, touch: 84 } },
  { name: "Petra Kvitova",      flag: "🇨🇿", fact: "A two-time Wimbledon champion with a devastating lefty game.", stats: { serve: 88, return: 82, forehand: 88, backhand: 88, net: 86, movement: 86, defence: 80, stamina: 84, mental: 82, touch: 82 } },
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
// Which court zone each attribute lights up, and what surface colour it gets.
const ZONE_OF = {
  serve:    { zones: ["serveBox"], surfaceHint: "Grass" },
  return:   { zones: ["deepBase"], surfaceHint: "Clay" },
  forehand: { zones: ["baseR"], surfaceHint: "Clay" },
  backhand: { zones: ["baseL"], surfaceHint: "Clay" },
  net:      { zones: ["netZone"], surfaceHint: "Grass" },
  movement: { zones: ["wings", "deepBase"], surfaceHint: "Clay" },
  defence:  { zones: ["deepBase"], surfaceHint: "Clay" },
  stamina:  { zones: ["wings"], surfaceHint: "Clay" },
  mental:   { zones: ["whole"], surfaceHint: "Hard" },
  touch:    { zones: ["midCourt"], surfaceHint: "Grass" },
};

// Zone colours: each zone type glows in the colour of the surface it helps.
const ZONE_COLOUR = {
  serveBox:  "var(--grass)",   // grass = serve zone
  netZone:   "var(--grass)",
  deepBase:  "var(--clay)",    // clay = baseline/return
  baseL:     "var(--clay)",
  baseR:     "var(--clay)",
  wings:     "var(--clay)",
  midCourt:  "var(--ball)",    // ball yellow = touch/finesse
  whole:     "var(--hard)",    // hard blue = mental (all-court)
};

// Which surface an attribute most helps (for the hint pip on each shot button).
function attrSurfaceHint(attrKey) {
  return ZONE_OF[attrKey]?.surfaceHint || "Hard";
}

function CourtDiagram({ build, hovered }) {
  const filledZones = {};
  for (const a of ATTRS) {
    if (build[a.key]) {
      for (const z of (ZONE_OF[a.key]?.zones || [])) filledZones[z] = true;
    }
  }
  const hotZones = hovered ? (ZONE_OF[hovered]?.zones || []) : [];

  const zoneStyle = (z) => {
    if (hotZones.includes(z)) return { fill: ZONE_COLOUR[z], opacity: 0.78, transition: "fill .22s, opacity .22s" };
    if (filledZones[z]) return { fill: ZONE_COLOUR[z], opacity: 0.32, transition: "fill .22s, opacity .22s" };
    return { fill: "transparent", transition: "fill .22s, opacity .22s" };
  };

  const line = { stroke: "rgba(246,251,239,.55)", strokeWidth: 1.5 };
  const outerLine = { stroke: "rgba(246,251,239,.85)", strokeWidth: 2 };

  return (
    <svg className="cs-court" viewBox="0 0 160 260" aria-hidden="true">
      {/* court surface */}
      <rect x="8" y="6" width="144" height="248" rx="2" fill="rgba(14,42,26,.55)" />

      {/* zone fills (drawn before lines) */}
      <rect x="8"   y="6"   width="144" height="46" style={zoneStyle("deepBase")} />
      <rect x="8"   y="208" width="144" height="46" style={zoneStyle("deepBase")} />
      <rect x="8"   y="52"  width="72"  height="50" style={zoneStyle("baseL")} />
      <rect x="80"  y="52"  width="72"  height="50" style={zoneStyle("baseR")} />
      <rect x="34"  y="102" width="92"  height="28" style={zoneStyle("serveBox")} />
      <rect x="34"  y="130" width="92"  height="28" style={zoneStyle("serveBox")} />
      <rect x="8"   y="116" width="144" height="28" style={zoneStyle("netZone")} />
      <rect x="8"   y="102" width="144" height="56" style={zoneStyle("midCourt")} />
      <rect x="8"   y="6"   width="12"  height="248" style={zoneStyle("wings")} />
      <rect x="140" y="6"   width="12"  height="248" style={zoneStyle("wings")} />
      {/* whole court glow (mental) */}
      <rect x="8" y="6" width="144" height="248" rx="2" style={zoneStyle("whole")} />

      {/* court outer border */}
      <rect x="8" y="6" width="144" height="248" rx="2" fill="none" {...outerLine} />

      {/* baseline / service lines */}
      <line x1="8"  y1="52"  x2="152" y2="52"  {...line} />
      <line x1="8"  y1="208" x2="152" y2="208" {...line} />
      <line x1="34" y1="52"  x2="34"  y2="208" {...line} />
      <line x1="126"y1="52"  x2="126" y2="208" {...line} />
      <line x1="34" y1="102" x2="126" y2="102" {...line} />
      <line x1="34" y1="158" x2="126" y2="158" {...line} />
      <line x1="80" y1="52"  x2="80"  y2="102" {...line} />
      <line x1="80" y1="158" x2="80"  y2="208" {...line} />
      <line x1="8"  y1="52"  x2="8"   y2="52"  {...line} />

      {/* NET — thick white line with posts */}
      <rect x="4" y="126" width="152" height="8" rx="1"
        fill="rgba(246,251,239,.9)" />
      <rect x="4"   y="120" width="5" height="20" rx="1" fill="rgba(246,251,239,.9)" />
      <rect x="151" y="120" width="5" height="20" rx="1" fill="rgba(246,251,239,.9)" />

      {/* centre service mark */}
      <line x1="80" y1="126" x2="80" y2="134" stroke="rgba(246,251,239,.55)" strokeWidth="1.5" />

      {/* ball in play indicator when hovering (subtle tennis ball) */}
      {hovered && (
        <circle cx="80" cy="130" r="5"
          fill="var(--ball)" opacity="0.9">
          <animate attributeName="r" values="4;6;4" dur="1.2s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  );
}

// ============================================================================

// Shareable result card. Shows the headline, the four-major surface trail as
// coloured squares, and offers a Wordle-style text block to copy/share.
const SURF_EMOJI = { Clay: "🟧", Grass: "🟩", Hard: "🟦" };

function ShareCard({ active, ranSim, build, tourLabel, onClose }) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
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
    } catch (e) { setCopied(false); }
  }

  // Draw a share image on an offscreen canvas and download it.
  function downloadImage() {
    setDownloading(true);
    try {
      const W = 1080, H = 1080;
      const c = document.createElement("canvas");
      c.width = W; c.height = H;
      const ctx = c.getContext("2d");

      // Background — grass green with stripes
      ctx.fillStyle = "#1f6b3f";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(246,251,239,.025)";
      for (let x = 0; x < W; x += 76) ctx.fillRect(x, 0, 38, H);

      // Top wordmark
      ctx.fillStyle = "#f6fbef";
      ctx.font = "bold 52px Arial Narrow, Arial, sans-serif";
      ctx.letterSpacing = "4px";
      ctx.fillText("CALENDAR SLAM", 80, 100);

      // Score
      const scoreCol = active.won === 4 ? "#d8f000" : "#f6fbef";
      ctx.fillStyle = scoreCol;
      ctx.font = "bold 200px Arial Narrow, Arial, sans-serif";
      ctx.fillText(`${active.won}/4`, 80, 360);

      // Tier name
      ctx.fillStyle = scoreCol;
      ctx.font = "bold 72px Arial Narrow, Arial, sans-serif";
      ctx.fillText(active.tier.name.toUpperCase(), 80, 460);

      // Note
      ctx.fillStyle = "rgba(246,251,239,.65)";
      ctx.font = "36px Arial, sans-serif";
      ctx.fillText(active.tier.note, 80, 530);

      // Slam chips
      const SLAM_COLS = { ao: "#2b7de9", rg: "#e07a3f", wim: "#5a2d82", uso: "#1a8fd0" };
      SLAMS.forEach((s, i) => {
        const leg = active.perSlam.find((p) => p.key === s.key);
        const won = ranSim ? leg.wonTitle : leg.win;
        const x = 80 + i * 240;
        ctx.fillStyle = SLAM_COLS[s.key];
        ctx.beginPath();
        ctx.roundRect(x, 610, 210, 110, 12);
        ctx.fill();
        ctx.fillStyle = won ? "#d8f000" : "rgba(246,251,239,.5)";
        ctx.font = "bold 44px Arial Narrow, Arial, sans-serif";
        ctx.fillText(s.name.split(" ").slice(-1)[0].toUpperCase(), x + 14, 664);
        ctx.font = "52px serif";
        ctx.fillText(won ? "🏆" : "❌", x + 14, 710);
      });

      // Mode line
      ctx.fillStyle = "rgba(246,251,239,.55)";
      ctx.font = "32px Arial, sans-serif";
      ctx.fillText(ranSim ? `Simulated vs the ${tourLabel} field` : "Quick projection", 80, 800);

      // URL
      ctx.fillStyle = "#d8f000";
      ctx.font = "bold 36px Arial Narrow, Arial, sans-serif";
      ctx.fillText("calendarslam.com", 80, H - 60);

      c.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "calendar-slam-result.png";
        a.click();
        URL.revokeObjectURL(url);
        setDownloading(false);
      }, "image/png");
    } catch (e) { setDownloading(false); }
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
            const detail = ranSim
              ? (won ? `Champion · beat ${leg.finalOpp}` : `Out: ${leg.lostRound}${leg.opponent ? ` · lost to ${leg.opponent}` : ""}`)
              : (won ? "Champion" : `${leg.prob}% form`);
            return (
              <div key={s.key} className={`cs-share-slam-btn slam-${s.key} ${won ? "won" : "lost"}`}>
                <span className="cs-share-slam-name">{s.name}</span>
                <span className="cs-share-slam-result">{won ? "🏆" : "❌"}</span>
                <span className="cs-share-slam-detail">{detail}</span>
              </div>
            );
          })}
        </div>

        <div className="cs-share-mode">{ranSim ? `Simulated vs the ${tourLabel} field` : "Quick projection"}</div>

        <div className="cs-share-actions">
          <button className="cs-cta cs-share-copy" onClick={copy}>
            {copied ? "Copied ✓" : "Copy text"}
          </button>
          <button className="cs-cta cs-share-img" onClick={downloadImage} disabled={downloading}>
            {downloading ? "…" : "⬇ Save image"}
          </button>
        </div>
        <pre className="cs-share-preview">{shareText}</pre>
      </div>
    </div>
  );
}

// ============================================================================

// A simple tennis net graphic used as a divider / motif.
// ============================================================================
// RIVAL MODAL — newspaper reveal of the player's nemesis
// ============================================================================
function RivalModal({ rival, playerName, playerFlag, onClose }) {
  if (!rival) return null;
  const headlines = {
    baseline: [`TWO FORCES COLLIDE ON THE BASELINE`, `BATTLE OF THE GROUNDSTROKERS`],
    serve:    [`ACE VS ACE: A RIVALRY IS BORN`, `THE SERVE MASTERS CLASH`],
    defence:  [`ATTACK MEETS DEFENCE: RIVALS EMERGE`, `THE WALL MEETS ITS MATCH`],
    return:   [`RETURNER RISES TO CHALLENGE`, `THE COURT'S NEW RIVALRY`],
    allcourt: [`ALL-COURT NEMESIS EMERGES`, `VERSATILITY VS VERSATILITY`],
  };
  const headlineOpts = headlines[rival.style] || headlines.baseline;
  const headline = headlineOpts[Math.floor(rival.name.length % headlineOpts.length)];

  const bodies = {
    baseline: `Sources close to both camps confirm what the tennis world has already suspected: ${playerName} and ${rival.name} are destined to become the defining rivalry of their generation. "${rival.name}'s relentless ball-striking from the back of the court is precisely the kind of game that will test ${playerName} most," said one leading coach. "Watch this space."`,
    serve:    `The ${rival.flag} ${rival.name} possesses ${rival.weapon} that has already drawn comparisons to the greats. For ${playerName}, the challenge is clear: find a way through the biggest serve on the ${rival.surface} circuit, or risk being defined by the rivalry.`,
    defence:  `When ${rival.name} gets into a match, opponents often describe the same feeling — like hitting into a wall. "They just get everything back," said one analyst. For ${playerName}, breaking down ${rival.weapon} will define the next chapter of their career.`,
    return:   `Tennis aficionados have been quick to identify ${rival.name} as the player best placed to trouble ${playerName} going forward. Their secret weapon: ${rival.weapon} that turns defence into attack in the blink of an eye.`,
    allcourt: `The ${rival.flag} star brings ${rival.weapon} that makes them almost impossible to gameplan against. Coaches say ${playerName} will need to be at their absolute best to compete — and that this rivalry could produce some of the most entertaining tennis of the coming decade.`,
  };

  return (
    <div className="cs-modal cs-rival-modal" onClick={onClose}>
      <div className="cs-newspaper" onClick={e => e.stopPropagation()}>
        <div className="cs-newspaper-header">
          <div className="cs-newspaper-name">THE TENNIS TRIBUNE</div>
          <div className="cs-newspaper-date">EXCLUSIVE REPORT</div>
        </div>
        <div className="cs-newspaper-rule" />
        <h2 className="cs-newspaper-headline">{headline}</h2>
        <div className="cs-newspaper-subhead">
          {playerFlag} {playerName} vs {rival.flag} {rival.name} ({rival.country})
        </div>
        <div className="cs-newspaper-rule cs-newspaper-rule-thin" />
        <p className="cs-newspaper-body">{bodies[rival.style] || bodies.baseline}</p>
        <div className="cs-newspaper-caption">
          <em>"{rival.name} is the player I'll measure myself against. That's the rivalry I want."</em>
          <br />— {playerName}
        </div>
        <button className="cs-newspaper-close cs-cta" onClick={onClose}>
          Close →
        </button>
      </div>
    </div>
  );
}

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
// CAREER MODE
// ============================================================================

// --- Olympics schedule -------------------------------------------------------
// Best-of-3 sets. Real data where confirmed, projected/invented thereafter.
// careerYear = 2025 + careerSeason.
const OLYMPICS = {
  2028: { city: "Los Angeles", country: "USA",       flag: "🇺🇸", surface: "Hard",  venue: "Carson Courts" },
  2032: { city: "Brisbane",    country: "Australia", flag: "🇦🇺", surface: "Hard",  venue: "Queensland Tennis Centre" },
  2036: { city: "Madrid",      country: "Spain",     flag: "🇪🇸", surface: "Clay",  venue: "Caja Mágica" },
  2040: { city: "Seoul",       country: "South Korea",flag:"🇰🇷",  surface: "Hard",  venue: "Olympic Tennis Centre" },
  2044: { city: "Mumbai",      country: "India",     flag: "🇮🇳", surface: "Hard",  venue: "Brabourne Stadium Courts" },
};

// Returns Olympic data for a given career year, or null if not an Olympic year.
function getOlympics(year) { return OLYMPICS[year] || null; }

// Simulate a best-of-3 Olympic match against a strong opponent.
// Returns { wonGold, wonMedal, result: 'Gold'|'Silver'|'Bronze'|'Eliminated' }.
function simulateOlympics(build, surface, rand) {
  const myForm = surfaceScore(build, surface);
  // Olympic field is slightly weaker than slam level but still tough.
  // QF, SF, Final brackets.
  const opponents = [76, 80, 86]; // QF, SF, Final strength
  let survived = true;
  let roundsWon = 0;
  for (const oppLevel of opponents) {
    let mySets = 0, oppSets = 0;
    // Best of 3
    while (mySets < 2 && oppSets < 2) {
      const noise = (rand() - 0.5) * 12;
      const pSet = 1 / (1 + Math.exp(-((myForm + noise - oppLevel) / 6)));
      if (rand() < pSet) mySets++; else oppSets++;
    }
    if (mySets === 2) roundsWon++;
    else { survived = false; break; }
  }
  if (roundsWon === 3) return { wonGold: true, medal: "Gold 🥇" };
  if (roundsWon === 2) {
    // Lost in final — play bronze? No, tennis gives silver to finalist
    return { wonGold: false, medal: "Silver 🥈" };
  }
  if (roundsWon === 1) {
    // Lost in SF — bronze medal match (best of 3, easier opponent)
    const bronzeOpp = 78;
    let ms = 0, os = 0;
    while (ms < 2 && os < 2) {
      const noise = (rand() - 0.5) * 12;
      const pSet = 1 / (1 + Math.exp(-((myForm + noise - bronzeOpp) / 6)));
      if (rand() < pSet) ms++; else os++;
    }
    return ms === 2
      ? { wonGold: false, medal: "Bronze 🥉" }
      : { wonGold: false, medal: "Eliminated 4th" };
  }
  return { wonGold: false, medal: "Eliminated in QF" };
}

// --- Name generator ----------------------------------------------------------
const NAMES = {
  "🇪🇸": { country: "Spain",       first: ["Carlos","Rafael","Pablo","Jorge","Javier","Alejandro","Sergio","Miguel"], last: ["Garcia","Lopez","Martinez","Fernandez","Romero","Navarro","Torres","Molina"] },
  "🇮🇹": { country: "Italy",       first: ["Lorenzo","Matteo","Marco","Federico","Luca","Giovanni","Andrea","Filippo"], last: ["Rossi","Ferrari","Ricci","Conti","Esposito","Bianchi","Gallo","Moretti"] },
  "🇩🇪": { country: "Germany",     first: ["Felix","Lukas","Niklas","Jonas","Julian","Maximilian","Florian","Fabian"], last: ["Müller","Schmidt","Weber","Becker","Hoffmann","Wagner","Fischer","Braun"] },
  "🇷🇺": { country: "Russia",      first: ["Andrei","Dmitri","Ivan","Sergei","Pavel","Alexei","Nikolai","Viktor"], last: ["Ivanov","Petrov","Volkov","Sokolov","Lebedev","Kozlov","Novikov","Morozov"] },
  "🇫🇷": { country: "France",      first: ["Lucas","Thomas","Hugo","Nathan","Théo","Antoine","Mathieu","Pierre"], last: ["Martin","Dubois","Laurent","Bernard","Leroy","Moreau","Simon","Girard"] },
  "🇦🇷": { country: "Argentina",   first: ["Franco","Tomás","Nicolás","Matías","Santiago","Leandro","Rodrigo","Ezequiel"], last: ["Gonzalez","Rodriguez","Fernandez","Perez","Alvarez","Romero","Medina","Vega"] },
  "🇧🇷": { country: "Brazil",      first: ["Thiago","Felipe","Gustavo","Rafael","Bruno","Lucas","Gabriel","Eduardo"], last: ["Silva","Santos","Oliveira","Pereira","Alves","Costa","Lima","Ferreira"] },
  "🇺🇸": { country: "USA",         first: ["Tyler","Jordan","Austin","Brandon","Kevin","Chris","Dylan","Ryan"], last: ["Johnson","Williams","Brown","Davis","Miller","Wilson","Moore","Anderson"] },
  "🇬🇧": { country: "Great Britain",first: ["Jack","Oliver","Harry","Charlie","George","Ethan","Liam","James"], last: ["Smith","Jones","Taylor","Brown","Wilson","Evans","Thomas","Roberts"] },
  "🇦🇺": { country: "Australia",   first: ["Liam","Noah","Ethan","Mason","Jack","Ryan","Riley","Kyle"], last: ["Smith","Jones","Williams","Brown","Wilson","Taylor","Anderson","Thomas"] },
  "🇨🇿": { country: "Czech Rep.",  first: ["Jakub","Tomas","Jan","Petr","Martin","Pavel","Michal","Ondrej"], last: ["Novak","Dvorak","Cerny","Blaha","Horak","Kral","Pospisil","Stepanek"] },
  "🇷🇸": { country: "Serbia",      first: ["Novak","Stefan","Filip","Nikola","Marko","Milan","Igor","Luka"], last: ["Jovic","Milic","Petrovic","Nikolic","Markovic","Simic","Ilic","Djordjevic"] },
  "🇨🇦": { country: "Canada",      first: ["Ethan","Logan","Lucas","Nathan","Liam","Owen","Felix","Alexis"], last: ["Martin","Roy","Tremblay","Gagnon","Bouchard","Auger","Lapointe","Cote"] },
  "🇯🇵": { country: "Japan",       first: ["Kei","Sho","Ryota","Hiroki","Yuto","Ryu","Daiki","Sota"], last: ["Nishikori","Nakashima","Ito","Yamamoto","Suzuki","Tanaka","Watanabe","Sato"] },
  "🇵🇱": { country: "Poland",      first: ["Hubert","Jan","Piotr","Marek","Kamil","Michal","Tomasz","Lukasz"], last: ["Kowalski","Wisniewski","Wojcik","Kowalczyk","Kaminski","Lewandowski","Zielinski","Szymanski"] },
};

const FLAG_KEYS = Object.keys(NAMES);

function generatePlayer(rng) {
  const flag = FLAG_KEYS[Math.floor(rng() * FLAG_KEYS.length)];
  const { first, last } = NAMES[flag];
  const name = `${first[Math.floor(rng() * first.length)]} ${last[Math.floor(rng() * last.length)]}`;
  return { name, flag, country: NAMES[flag].country };
}

// --- Off-season upgrades -----------------------------------------------------
const UPGRADE_POOL = [
  { id: "serve_coach",   label: "Hire a Serve Coach",          desc: "Refine your toss and kick serve with a specialist.",      effects: { serve: 4 },                   longevity: 0 },
  { id: "fitness",       label: "Intensive Fitness Programme",  desc: "Pushing your body hard now. It'll pay off — for a while.", effects: { stamina: 3, movement: 2 },   longevity: -1, warning: "Heavy training can shorten careers. Proceed?" },
  { id: "nutritionist",  label: "Elite Nutritionist",           desc: "Precision fuelling slows your body's decline.",            effects: { stamina: 2 },                 longevity: 2 },
  { id: "mental_coach",  label: "Sports Psychologist",          desc: "Learn to thrive under pressure on the big points.",        effects: { mental: 4 },                  longevity: 0 },
  { id: "fh_coach",      label: "Forehand Specialist",          desc: "Rebuild your forehand from the ground up.",                effects: { forehand: 4, touch: 1 },      longevity: 0 },
  { id: "bh_coach",      label: "Backhand Specialist",          desc: "Work on disguise, slice, and two-handed drive.",           effects: { backhand: 4, touch: 1 },      longevity: 0 },
  { id: "net_coach",     label: "Net Game Coach",               desc: "Volley clinic and approach shot drills.",                  effects: { net: 4, touch: 2 },           longevity: 0 },
  { id: "return_coach",  label: "Return of Serve Coach",        desc: "Early ball, aggressive positioning.",                      effects: { return: 3, movement: 1 },     longevity: 0 },
  { id: "movement",      label: "Movement & Footwork Trainer",  desc: "Court coverage, split step timing, lateral speed.",        effects: { movement: 3, defence: 2 },    longevity: 0 },
  { id: "defence",       label: "Defensive Grinding Specialist",desc: "Learn to reset points and outlast opponents.",             effects: { defence: 3, stamina: 2 },     longevity: 0 },
  { id: "rest",          label: "Rest & Recovery Season",       desc: "No gains. But your body will thank you later.",            effects: {},                             longevity: 3, recovery: true },
];

// --- Injury pool (logical body mapping) --------------------------------------
const INJURIES = [
  { label: "Wrist injury",          desc: "A niggling wrist issue affects your racket arm.",      effects: { serve: -5, forehand: -5 } },
  { label: "Elbow tendinitis",      desc: "Inflammation in the elbow limits your swing speed.",   effects: { forehand: -5, backhand: -4 } },
  { label: "Knee injury",           desc: "Knee pain limits your movement and ability to load.",  effects: { movement: -5, defence: -5 } },
  { label: "Shoulder strain",       desc: "A strained shoulder takes power off your serve.",      effects: { serve: -5, net: -4 } },
  { label: "Back spasm",            desc: "Back tightness limits your service motion and reach.", effects: { serve: -4, stamina: -3 } },
  { label: "Ankle sprain",          desc: "An ankle roll disrupts your footwork all season.",     effects: { movement: -5, stamina: -3 } },
  { label: "Fatigue & burnout",     desc: "Mental and physical exhaustion after pushing too hard.",effects: { mental: -4, stamina: -3 } },
  { label: "Hip flexor strain",     desc: "Hip tightness affects your split step and reach.",     effects: { movement: -4, defence: -3 } },
];

// --- Rival generation --------------------------------------------------------
function generateRival(playerBuild, playerTour, rng) {
  const rival = generatePlayer(rng);
  // Assign a style that counters the player's weakest surface
  const scores = ["Clay","Grass","Hard"].map(s => ({ s, v: surfaceScore(playerBuild, s) }));
  scores.sort((a,b) => a.v - b.v);
  const weakestSurf = scores[0].s;
  const styles = {
    Clay:  { style: "baseline", surface: "Clay",  weapon: "relentless clay-court topspin" },
    Grass: { style: "serve",    surface: "Grass", weapon: "an unplayable grass-court serve" },
    Hard:  { style: "return",   surface: "Hard",  weapon: "aggressive all-court ball-striking" },
  };
  return { ...rival, ...styles[weakestSurf], slamCount: 0, h2hWins: 0, h2hLosses: 0, weakSurf: weakestSurf };
}

// --- Age decay curve ---------------------------------------------------------
// Returns attribute reductions per season based on age.
function ageDecay(age, longevity) {
  // Longevity bonus delays decay. Each +1 longevity adds ~1 year of peak.
  const adjustedAge = age - longevity * 0.8;
  if (adjustedAge <= 25) return {};
  if (adjustedAge <= 27) return { stamina: -1 };
  if (adjustedAge <= 29) return { stamina: -1, movement: -1 };
  if (adjustedAge <= 31) return { stamina: -2, movement: -1, defence: -1 };
  if (adjustedAge <= 33) return { stamina: -2, movement: -2, defence: -1, mental: -1 };
  return { stamina: -3, movement: -2, defence: -2, serve: -1, mental: -1 };
}

// Injury risk rises with age and heavy training history.
function injuryRisk(age, longevity, heavyTrainingSeason) {
  const base = Math.max(0, (age - 24) * 0.04);
  const decay = longevity < 0 ? 0.1 * Math.abs(longevity) : 0;
  const fatigue = heavyTrainingSeason ? 0.12 : 0;
  return Math.min(0.55, base + decay + fatigue);
}

// Should we prompt retirement? True if avg surface score < retirement threshold
// for two consecutive seasons, or age >= 39.
const RETIRE_THRESHOLD = 62;
function shouldRetire(stats, consecutiveLowSeasons, age) {
  if (age >= 39) return true;
  const avg = ["Clay","Grass","Hard"].reduce((s,surf) => s + surfaceScore(stats, surf), 0) / 3;
  return avg < RETIRE_THRESHOLD && consecutiveLowSeasons >= 2;
}

// Pick 3 distinct upgrades for the off-season choice.
// Pick 3 upgrade options, filtering out any whose primary effect would be wasted
// (stat already at 95+). Also trims effects so nothing advertises going over 99.
function pickUpgrades(rng, currentBuild) {
  const CAP = 99;
  const NEAR_CAP = 95; // won't offer an upgrade whose main stat is already this high

  // Filter: remove upgrades where ALL positive stat effects would be wasted
  const useful = UPGRADE_POOL.filter(u => {
    const positiveEffects = Object.entries(u.effects).filter(([,v]) => v > 0);
    if (positiveEffects.length === 0) return true; // rest/recovery always valid
    if (!currentBuild) return true;
    return positiveEffects.some(([k]) => {
      const cur = currentBuild[k]?.rating ?? 0;
      return cur < NEAR_CAP;
    });
  });

  // Use full pool as fallback if filtering left too few options
  const pool = [...(useful.length >= 3 ? useful : UPGRADE_POOL)];
  const chosen = [];
  while (chosen.length < 3 && pool.length > 0) {
    const i = Math.floor(rng() * pool.length);
    const u = pool.splice(i, 1)[0];
    // Trim advertised effects to show realistic headroom
    if (currentBuild) {
      const trimmedEffects = {};
      for (const [k, v] of Object.entries(u.effects)) {
        if (v > 0) {
          const cur = currentBuild[k]?.rating ?? 0;
          const actual = Math.min(v, CAP - cur);
          if (actual > 0) trimmedEffects[k] = actual;
        } else {
          trimmedEffects[k] = v; // keep negative effects (injuries etc) as-is
        }
      }
      chosen.push({ ...u, effects: trimmedEffects });
    } else {
      chosen.push(u);
    }
  }
  return chosen;
}

// Apply effects to a build (clamp 0-99).
function applyEffects(build, effects) {
  const next = { ...build };
  for (const [k, v] of Object.entries(effects)) {
    if (next[k] != null) {
      next[k] = { ...next[k], rating: Math.max(10, Math.min(99, next[k].rating + v)) };
    }
  }
  return next;
}

// Apply age decay to build stats.
function applyDecay(build, decay) {
  return applyEffects(build, decay);
}

// Simulate rival's season. They're a surface specialist, so they only seriously
// contend on their home surface. On average about 1 slam every 3-4 seasons.
function rivalSeason(rival, year, rng) {
  if (!rival) return 0;
  let wins = 0;
  for (const slam of SLAMS) {
    // Rival only has a real chance on their specialist surface
    const isHomeSlam = slam.surface === rival.weakSurf; // weakSurf = the surface they counter you on
    const baseChance = isHomeSlam ? 0.18 : 0.04;
    // Rival peaks around years 3-7 of your career
    const peak = Math.max(0, 1 - Math.abs(year - 5) * 0.07);
    if (rng() < baseChance * (0.7 + peak * 0.6)) wins++;
  }
  return wins;
}

// ============================================================================

export default function CalendarSlam() {
  const [phase, setPhase] = useState("mode"); // mode | tour | player-create | intro | draft | result | offseason | retirement
  const [gameMode, setGameMode] = useState("single"); // "single" | "career"
  const [tour, setTour] = useState("atp");
  const [round, setRound] = useState(0);
  const [build, setBuild] = useState({});
  const [current, setCurrent] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [ranSim, setRanSim] = useState(false);
  const [seed, setSeed] = useState(1);
  const [showCard, setShowCard] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [previewKey, setPreviewKey] = useState(null);
  const [reveal, setReveal] = useState({ slam: 0, round: 0, done: false });
  const [difficulty, setDifficulty] = useState("normal");
  const [eliteUsed, setEliteUsed] = useState(false);

  // Career mode state
  const [playerName, setPlayerName] = useState("");
  const [playerFlag, setPlayerFlag] = useState("🇬🇧");
  const [playerNameMode, setPlayerNameMode] = useState("generate"); // "generate" | "custom"
  const [careerSeason, setCareerSeason] = useState(1);
  const [careerAge, setCareerAge] = useState(20);
  const [careerStartAge, setCareerStartAge] = useState(20);
  const [careerLongevity, setCareerLongevity] = useState(0);
  const [careerSlamCount, setCareerSlamCount] = useState(0);
  const [careerSeasons, setCareerSeasons] = useState([]); // [{year, slams, upgrades, injury}]
  const [careerRival, setCareerRival] = useState(null);
  const [offseasonUpgrades, setOffseasonUpgrades] = useState([]);
  const [offseasonInjury, setOffseasonInjury] = useState(null);
  const [offseasonPendingBuild, setOffseasonPendingBuild] = useState(null);
  const [retirementPrompt, setRetirementPrompt] = useState(false);
  const [consecutiveLowSeasons, setConsecutiveLowSeasons] = useState(0);
  const [heavyTrainingLastSeason, setHeavyTrainingLastSeason] = useState(false);
  const [olympicResult, setOlympicResult] = useState(null);
  const [showRivalModal, setShowRivalModal] = useState(false);
  const [seasonSummary, setSeasonSummary] = useState(null); // {report, quotes} for current season
  const [chosenQuote, setChosenQuote] = useState(null);
  const [pressPhase, setPressPhase] = useState(false); // true = showing press quote picker
  const [upgradeArmed, setUpgradeArmed] = useState(null); // id of upgrade armed for double-tap
  const [generationalPlayers, setGenerationalPlayers] = useState([]); // fictional players added over career

  const T = TOURS[tour];
  const POOL = T.pool;

  // Career: derive a unique RNG from season number for off-season events.
  const careerRng = useMemo(() => mulberry32(careerSeason * 7919 + 42), [careerSeason]);

  // Career: generate a player identity (called on player-create screen).
  function generatePlayerIdentity() {
    const rng = mulberry32(Date.now() & 0xffffffff);
    const p = generatePlayer(rng);
    setPlayerName(p.name);
    setPlayerFlag(p.flag);
  }

  // Auto-generate on mount when arriving at player-create screen.
  useEffect(() => {
    if (phase === "player-create" && playerNameMode === "generate" && !playerName) {
      generatePlayerIdentity();
    }
  }, [phase]);

  // Career: start a brand-new career.
  function startCareer() {
    const rng = mulberry32((Date.now() & 0xffffffff) ^ 0xdeadbeef);
    // If name mode is generate, generate now.
    let name = playerName, flag = playerFlag;
    if (playerNameMode === "generate" || !playerName.trim()) {
      const p = generatePlayer(rng);
      name = p.name; flag = p.flag;
      setPlayerName(name); setPlayerFlag(flag);
    }
    setCareerSeason(1);
    setCareerAge(careerStartAge);
    setCareerLongevity(0);
    setCareerSlamCount(0);
    setCareerSeasons([]);
    setCareerRival(null);
    setConsecutiveLowSeasons(0);
    setHeavyTrainingLastSeason(false);
    setRetirementPrompt(false);
    setRanSim(false);
    setBuild({});
    setRound(0);
    setEliteUsed(false);
    setGenerationalPlayers([]);
    setPressPhase(false);
    setSeasonSummary(null);
    setChosenQuote(null);
    setShowRivalModal(false);
    setPhase("intro");
  }

  // --- Procedural season report generator -----------------------------------
  // Generates a fictional newspaper-style season summary from actual results.
  function generateSeasonReport(season, age, slamResults, slamWon, totalSlams, rival, quote, olympicRes) {
    const year = 2025 + season;
    const slams = slamResults.filter(r => !r.isOlympics);
    const wonSlams = slams.filter(r => r.wonTitle).map(r => r.name);
    const lostEarly = slams.find(r => !r.wonTitle && ["Round 1","Round 2","Round 3"].includes(r.lostRound));
    const finalLoss = slams.find(r => !r.wonTitle && r.lostRound === "Final");
    const sfLoss = slams.find(r => !r.wonTitle && r.lostRound === "Semi-final");
    const rivalResult = slamResults.find(r => r.opponent === rival?.name);

    let headline = "";
    let body = "";

    if (slamWon === 4) {
      headline = `${playerName.toUpperCase()} COMPLETES THE CALENDAR SLAM`;
      body = `In a season that will be written into the history books, ${playerName} won all four Grand Slams in a single calendar year — a feat achieved by only a handful of players across the sport's entire history. At ${age} years old, they have announced themselves as one of the all-time greats.`;
    } else if (slamWon >= 2) {
      headline = `${wonSlams.join(" AND ")} — ${playerName.toUpperCase()} DELIVERS`;
      body = `A banner year for ${playerName}. ${slamWon} Grand Slam titles in ${year} cement their status as one of the premier forces on the ${T.label} tour.${finalLoss ? ` The loss in the ${finalLoss.name} final to ${finalLoss.opponent} will sting — but the overall record speaks for itself.` : ""}`;
    } else if (slamWon === 1) {
      headline = `BREAKTHROUGH: ${playerName.toUpperCase()} CLAIMS ${wonSlams[0]?.toUpperCase()}`;
      body = `${playerName} claimed their ${totalSlams === 1 ? "first" : `${totalSlams}${totalSlams === 2 ? "nd" : totalSlams === 3 ? "rd" : "th"}`} Grand Slam title at ${wonSlams[0]}, a result that has the ${T.label} tour talking.${finalLoss ? ` A second title slipped away in the ${finalLoss.name} final against ${finalLoss.opponent}, but this was still a season to celebrate.` : ""}`;
    } else if (finalLoss) {
      headline = `SO CLOSE — ${playerName.toUpperCase()} FALLS IN THE ${finalLoss.name.toUpperCase()} FINAL`;
      body = `A season that promised so much ended in heartbreak at ${finalLoss.name}. ${playerName} — age ${age} — fell to ${finalLoss.opponent} in a match that went the distance. The title remains elusive, but the final appearance proves they belong.`;
    } else if (sfLoss) {
      headline = `PROGRESS STALLS: ${playerName.toUpperCase()} FALLS AT THE SEMI-FINAL STAGE`;
      body = `Semi-final appearances across the tour suggest ${playerName} is trending in the right direction, but the final breakthrough remains to come. ${rivalResult && !rivalResult.wonTitle ? `A loss to ${rival?.name} in the ${rivalResult.name} last four will particularly hurt.` : "They will hope to convert their form into titles next year."}`;
    } else if (lostEarly) {
      headline = `TOUGH YEAR FOR ${playerName.toUpperCase()} ON THE GRAND SLAM STAGE`;
      body = `${year} was not the season ${playerName} had hoped for. Early exits at ${lostEarly.name} and elsewhere raised questions the player will be eager to answer in the off-season. At ${age}, there is time to rebuild.`;
    } else {
      headline = `${playerName.toUpperCase()}: BUILDING TOWARDS THE SUMMIT`;
      body = `Another season on the road for ${playerName}. No titles yet, but the performances suggest a player who is understanding what it takes to compete at the highest level.`;
    }

    if (olympicRes?.medal?.includes("Gold")) {
      body += ` The gold medal at the ${olympicRes.city} Olympics was the undoubted highlight of a remarkable summer.`;
    } else if (olympicRes?.medal?.includes("Silver")) {
      body += ` Silver at the ${olympicRes.city} Olympics was scant consolation for a player who came so close to gold.`;
    }

    if (rival && rivalResult && !rivalResult.wonTitle && rivalResult.opponent === rival.name) {
      body += ` The rivalry with ${rival.flag} ${rival.name} continues to define ${playerName}'s career — another defeat against their nemesis will fuel the off-season preparation.`;
    }

    if (quote) {
      body += `\n\n"${quote}" — ${playerName}`;
    }

    return { headline, body };
  }

  // Press quotes — four bespoke options drawn directly from this season's results.
  function generatePressQuotes(slamWon, rival, age, slamResults, olympicRes, totalSlams) {
    const slams = (slamResults || []).filter(r => !r.isOlympics);
    const wonNames = slams.filter(r => r.wonTitle).map(r => r.name);
    const finalLoss = slams.find(r => !r.wonTitle && r.lostRound === "Final");
    const sfLoss = slams.find(r => !r.wonTitle && r.lostRound === "Semi-final");
    const rivalLoss = slams.find(r => !r.wonTitle && r.opponent === rival?.name);
    const rivalWin = slams.find(r => r.wonTitle && r.path?.[r.path.length-1]?.name === rival?.name);
    const hasOlympic = olympicRes?.medal;
    const isFirstSlam = totalSlams === 1 && slamWon === 1;

    // Build four quotes, each from a different emotional angle
    const q1 = wonNames.length > 0
      ? isFirstSlam
        ? `Winning ${wonNames[0]} for the first time — I genuinely can't put it into words. This is everything.`
        : wonNames.length >= 2
          ? `${wonNames[0]} and ${wonNames[1]} in the same year. That's the level I've always believed I could reach.`
          : `${wonNames[0]} means a lot to me right now. We put in a lot of work to be ready for that surface.`
      : finalLoss
        ? `Reaching the ${finalLoss.name} final proves I belong at this level. The title will come.`
        : sfLoss
          ? `I know I let a semi-final slip at ${sfLoss.name}. That one will sit with me over winter.`
          : `The results this year weren't what I'd hoped for. But I've identified what needs to change.`;

    const q2 = rivalLoss
      ? `${rival.name} got the better of me again at ${rivalLoss.name}. That's the match I'm building my whole off-season around.`
      : rivalWin
        ? `Beating ${rival.name} when it mattered most — that was the win that meant the most to me this year.`
        : rival
          ? `The rivalry with ${rival.name} pushes me to be better. I genuinely think that pressure brings out a level I couldn't reach otherwise.`
          : `Every week you're competing against the best in the world. That sharpens you in ways nothing else can.`;

    const q3 = hasOlympic
      ? olympicRes.medal.includes("Gold")
        ? `The gold medal is something I'll treasure for the rest of my life. Representing your country — nothing compares to that.`
        : olympicRes.medal.includes("Silver")
          ? `Silver at the Olympics hurts — you play for gold and nothing else. But I'll be back for it.`
          : `An Olympic medal, whatever colour, is something very few people can say they've won. I'm proud of that.`
      : age < 23
        ? `I'm still finding my level on the biggest stages. Each year I understand more about what it takes.`
        : age > 31
          ? `People underestimate what experience gives you. I know how to compete at this level in a way I didn't at 25.`
          : wonNames.length > 0
            ? `The preparation was different this year. We made some changes that I think are really starting to pay off.`
            : `I need to be more clinical when I get the chances. The performances are there — the results will follow.`;

    const q4 = slamWon === 4
      ? `A calendar slam. I'm not sure it's fully sunk in yet. I don't think it does for a while.`
      : slamWon === 0 && finalLoss
        ? `Two finals, no titles. That's the part that eats at you. Next year I want to be the one holding the trophy.`
        : slamWon >= 2
          ? `Multiple slam titles in a season — that's the goal every year, but delivering it is something else. I'm proud of what we did.`
          : wonNames.length > 0
            ? `I know I can win more of these. The ${wonNames[0]} title is the proof of that.`
            : `Seasons like this one make you dig deep and ask honest questions. The answers I've found give me real confidence for next year.`;

    return [q1, q2, q3, q4];
  }

  // Generate fictional new-generation players to seed into the draw from season 3+.
  function spawnGenerationalPlayer(season, rng) {
    const p = generatePlayer(rng);
    const surfaces = ["Clay","Grass","Hard"];
    const styles = ["baseline","serve","defence","allcourt","return"];
    const weapons = [
      "explosive groundstrokes", "a fearsome serve", "relentless retrieving",
      "all-court brilliance", "an aggressive return game", "tactical clay-court guile"
    ];
    const surf = surfaces[Math.floor(rng() * surfaces.length)];
    const style = styles[Math.floor(rng() * styles.length)];
    const wep = weapons[Math.floor(rng() * weapons.length)];
    const base = 72 + Math.floor(rng() * 8);
    return {
      name: p.name, flag: p.flag,
      base,
      surf: { Hard: Math.floor(rng()*5)-1, Clay: Math.floor(rng()*5)-1, Grass: Math.floor(rng()*5)-1, [surf]: 3 },
      weapon: wep, style,
      isGenerational: true, debutSeason: season,
    };
  }

  // Career: wrap up a season's results and set up off-season.
  function endCareerSeason(slamResults) {
    const wonThisSeason = slamResults.filter(r => !r.isOlympics && r.wonTitle).length;
    const newTotal = careerSlamCount + wonThisSeason;
    setCareerSlamCount(newTotal);
    // Create rival on first season if not yet set
    let activeRival = careerRival;
    if (!activeRival && gameMode === "career") {
      const rivalRng = mulberry32((careerSeason * 99991) & 0xffffffff);
      activeRival = generateRival(build, tour, rivalRng);
      setCareerRival(activeRival);
      setShowRivalModal(true); // trigger newspaper intro
    }

    // Track rival's season results
    const rivalRng2 = mulberry32((careerSeason * 31337 + 99) & 0xffffffff);
    const rivalWins = rivalSeason(activeRival, careerSeason, rivalRng2);
    const updatedRival = activeRival ? {
      ...activeRival,
      slamCount: activeRival.slamCount + rivalWins,
      h2hLosses: activeRival.h2hLosses + slamResults.filter(r =>
        !r.wonTitle && r.opponent === activeRival.name).length,
      h2hWins: activeRival.h2hWins + slamResults.filter(r =>
        r.wonTitle && r.path?.[r.path.length - 1]?.name === activeRival.name).length,
    } : null;
    if (updatedRival) setCareerRival(updatedRival);

    // Add season to history
    const careerYear = 2025 + careerSeason;
    // Pull Olympic result from the sim results (already computed there in real-time)
    const olympicsEvent = slamResults.find(r => r.isOlympics);
    const olympicsThisSeason = olympicsEvent ? {
      medal: olympicsEvent.medal,
      wonGold: olympicsEvent.wonTitle,
      city: olympicsEvent.olympicsData?.city,
      country: olympicsEvent.olympicsData?.country,
      flag: olympicsEvent.olympicsData?.flag,
      surface: olympicsEvent.surface,
      venue: olympicsEvent.olympicsData?.venue,
      year: careerYear,
    } : null;
    setOlympicResult(olympicsThisSeason);
    const seasonRecord = {
      season: careerSeason, age: careerAge, year: careerYear,
      slams: wonThisSeason, results: slamResults, olympics: olympicsThisSeason,
    };
    setCareerSeasons(prev => [...prev, seasonRecord]);

    // Check consecutive low seasons for retirement prompt
    const avgScore = ["Clay","Grass","Hard"].reduce((s,surf) => s + surfaceScore(build, surf), 0) / 3;
    const isLow = avgScore < RETIRE_THRESHOLD;
    const newLow = isLow ? consecutiveLowSeasons + 1 : 0;
    setConsecutiveLowSeasons(newLow);
    if (shouldRetire(build, newLow, careerAge + 1)) {
      setRetirementPrompt(true);
    }

    // Generate off-season options (pass build so stat-capped options are filtered out)
    const upgradeRng = mulberry32((careerSeason * 54321) & 0xffffffff);
    const upgrades = pickUpgrades(upgradeRng, build);

    // Roll for injury
    const risk = injuryRisk(careerAge, careerLongevity, heavyTrainingLastSeason);
    const injuryRng = mulberry32((careerSeason * 11111 + 7) & 0xffffffff);
    let injury = null;
    if (injuryRng() < risk) {
      injury = INJURIES[Math.floor(injuryRng() * INJURIES.length)];
    }

    setOffseasonUpgrades(upgrades);
    setOffseasonInjury(injury);
    setOffseasonPendingBuild(build);

    // Generate season report and press quotes — reuse olympicsEvent from above
    const oRes = olympicsEvent ? { medal: olympicsEvent.medal, wonGold: olympicsEvent.wonTitle, city: olympicsEvent.olympicsData?.city } : null;
    const report = generateSeasonReport(careerSeason, careerAge, slamResults, wonThisSeason, newTotal, updatedRival || activeRival, null, oRes);
    const quotes = generatePressQuotes(wonThisSeason, updatedRival || activeRival, careerAge, slamResults, oRes, newTotal);
    setSeasonSummary({ ...report, quotes });
    setChosenQuote(null);

    // Spawn fictional next-gen players. Seed 3 from season 1 to immediately
    // freshen the draw, then add more each season at rising probability.
    if (careerSeason === 1) {
      const seedRng = mulberry32((careerSeason * 11113) & 0xffffffff);
      const seedPlayers = [1, 2, 3].map(() => spawnGenerationalPlayer(1, seedRng));
      setGenerationalPlayers(seedPlayers);
    } else {
      const spawnRng = mulberry32((careerSeason * 88887) & 0xffffffff);
      const spawnChance = Math.min(0.85, 0.45 + (careerSeason - 2) * 0.07);
      if (spawnRng() < spawnChance) {
        const newPlayer = spawnGenerationalPlayer(careerSeason, spawnRng);
        setGenerationalPlayers(prev => [...prev, newPlayer]);
      }
    }

    // Show the press quote screen first, then move to offseason after
    setPressPhase(true);
    setPhase("offseason");
  }

  // Career: apply an upgrade choice and move to next season.
  function applyUpgrade(upgrade) {
    let nextBuild = applyEffects(offseasonPendingBuild, upgrade.effects);
    // Apply injury if present
    if (offseasonInjury) nextBuild = applyEffects(nextBuild, offseasonInjury.effects);
    // Apply age decay
    const decay = ageDecay(careerAge + 1, careerLongevity + (upgrade.longevity || 0));
    nextBuild = applyDecay(nextBuild, decay);
    const newLongevity = careerLongevity + (upgrade.longevity || 0);
    setCareerLongevity(newLongevity);
    setHeavyTrainingLastSeason(upgrade.id === "fitness");
    setBuild(nextBuild);
    setCareerSeason(s => s + 1);
    setCareerAge(a => a + 1);
    setRanSim(false);
    setReveal({ slam: 0, round: 0, done: false });
    setEliteUsed(false);
    setRound(0);
    setRetirementPrompt(false);
    setUpgradeArmed(null);
    setPressPhase(false);
    // Go straight to result screen (which shows "Begin season X") —
    // no new draft needed, the build carries over with the upgrade applied.
    setPhase("result");
  }

  // Career: retire and show the hall of fame summary.
  function retire() { setPhase("retirement"); }

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(m.matches);
    // Treat as touch if the device has no fine pointer / supports hover poorly.
    const touch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    setIsTouch(touch);
  }, []);

  // In challenge mode, the pool splits: top 5 players by average rating are
  // "elite" and can only be drawn ONCE per game. All others are "journeymen."
  const { elitePool, journeyPool } = useMemo(() => {
    const avg = (p) => Object.values(p.stats).reduce((s, v) => s + v, 0) / ATTRS.length;
    const sorted = [...POOL].sort((a, b) => avg(b) - avg(a));
    return { elitePool: sorted.slice(0, 5), journeyPool: sorted.slice(5) };
  }, [POOL]);

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
    setEliteUsed(false);
    setPhase("draft");
    spinNext([], false);
  }

  // Choose which sub-pool to spin from given challenge mode and elite status.
  function spinNext(exclude, eliteAlreadyUsed) {
    setSpinning(true);
    setPreviewKey(null);
    setHovered(null);
    let pool;
    if (difficulty === "challenge") {
      pool = eliteAlreadyUsed ? journeyPool : POOL; // before elite used: any; after: journeymen only
    } else {
      pool = POOL;
    }
    const final = rngPick(pool, exclude);
    if (reduce) {
      setCurrent(final);
      setSpinning(false);
      return;
    }
    let ticks = 0;
    const iv = setInterval(() => {
      setCurrent(rngPick(pool));
      ticks++;
      if (ticks > 12) {
        clearInterval(iv);
        setCurrent(final);
        setSpinning(false);
      }
    }, 55);
  }

  // Keep old spin() as alias for initial spin (elite not yet used)
  function spin(exclude) { spinNext(exclude, eliteUsed); }

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
    const isElitePick = difficulty === "challenge" && !eliteUsed &&
      elitePool.some((p) => p.name === current.name);
    const nextEliteUsed = eliteUsed || isElitePick;
    if (isElitePick) setEliteUsed(true);
    const next = {
      ...build,
      [attrKey]: {
        rating: current.stats[attrKey],
        player: current.name,
        flag: current.flag,
        elite: isElitePick,
      },
    };
    setBuild(next);
    const newRound = round + 1;
    if (newRound >= TOTAL_ROUNDS) {
      setRound(newRound);
      setPhase("result");
    } else {
      setRound(newRound);
      spinNext(drawnIds.concat(current.name), nextEliteUsed);
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

    // Build the list of events for this season.
    // In career mode, Olympic years include a 5th event between Wimbledon and US Open.
    const careerYear = gameMode === "career" ? 2025 + careerSeason : null;
    const olympicsData = careerYear ? getOlympics(careerYear) : null;

    const events = [];
    for (const s of SLAMS) {
      events.push(s);
      // Olympics slot: after Wimbledon (index 2), before US Open
      if (s.key === "wim" && olympicsData) {
        events.push({
          key: "olympics",
          name: `${olympicsData.city} Olympics`,
          surface: olympicsData.surface,
          short: "OLY",
          isOlympics: true,
          olympicsData,
        });
      }
    }

    const perSlam = events.map((s) => {
      if (s.isOlympics) {
        // Best-of-3 olympic sim
        const oResult = simulateOlympics(build, s.surface, rand);
        // Convert to a path-like structure for the reveal UI
        const path = [];
        const rounds = ["Quarter-final","Semi-final","Final"];
        const oppStrengths = [76, 80, 86];
        for (let i = 0; i < 3; i++) {
          let mySets = 0, oppSets = 0;
          while (mySets < 2 && oppSets < 2) {
            const noise = (rand() - 0.5) * 12;
            const pSet = 1 / (1 + Math.exp(-((surfaceScore(build, s.surface) + noise - oppStrengths[i]) / 6)));
            if (rand() < pSet) mySets++; else oppSets++;
          }
          const wonSet = mySets === 2;
          path.push({ round: rounds[i], name: "Field opponent", won: wonSet, score: `${mySets}-${oppSets}` });
          if (!wonSet) break;
        }
        const wonGold = oResult.wonGold;
        return {
          ...s,
          wonTitle: wonGold,
          medal: oResult.medal,
          path,
          finalOpp: "the field",
          finalScore: path[path.length-1]?.score || "",
          note: wonGold ? "delivered a gold-medal performance" : "",
          lostRound: !wonGold ? (path.find(p => !p.won)?.round || "Final") : null,
          opponent: "the field",
          setScore: path[path.length-1]?.score || "",
          reason: wonGold ? null : "the competition was fierce",
          weapon: "world-class competition",
        };
      }
      // Merge generational players into the draw pool for career mode
      const augmentedDraw = gameMode === "career" && generationalPlayers.length > 0
        ? [...T.draw, ...generationalPlayers.filter(p => p.debutSeason <= careerSeason)]
        : T.draw;
      const r = simulateMajor(build, s, rand, usedReasons, T.field, augmentedDraw);
      if (r.wonTitle) won++;
      return { ...s, ...r };
    });

    // Count grand slam titles (not Olympics)
    const slamWon = perSlam.filter(s => !s.isOlympics && s.wonTitle).length;
    return { perSlam, won: slamWon, tier: tierFor(slamWon), olympicsData };
  }, [phase, build, ranSim, seed, gameMode, careerSeason, generationalPlayers]);

  // Kick off a fresh live simulation: reset reveal, new seed, run sim.
  function startSim() {
    setReveal({ slam: 0, round: 0, done: false });
    setSeed(Math.floor(Math.random() * 1e9));
    setRanSim(true);
  }

  function skipSim() {
    const total = simResults ? simResults.perSlam.length : SLAMS.length;
    setReveal({ slam: total, round: 0, done: true });
  }

  // Drive the live reveal: step through each event's rounds, then the next.
  useEffect(() => {
    if (!ranSim || !simResults || reveal.done) return;
    const slam = simResults.perSlam[reveal.slam];
    if (!slam) { setReveal((r) => ({ ...r, done: true })); return; }
    const lastRound = slam.path.length - 1;
    const delay = reduce ? 0 : 480;
    const t = setTimeout(() => {
      setReveal((r) => {
        if (r.round < lastRound) return { ...r, round: r.round + 1 };
        if (r.slam + 1 >= simResults.perSlam.length) return { ...r, done: true };
        return { slam: r.slam + 1, round: 0, done: false };
      });
    }, reveal.round < lastRound ? delay : delay * 1.6);
    return () => clearTimeout(t);
  }, [ranSim, simResults, reveal, reduce]);

  return (
    <div className="cs-root">
      <style>{CSS}</style>

      <header className="cs-head">
        <div className="cs-wordmark">
          <span className="cs-wordmark-calendar">Calendar</span>
          <span className="cs-wordmark-slam">Slam</span>
        </div>
        <div className="cs-head-right">
          {phase !== "mode" && phase !== "tour" && phase !== "player-create" && (
            <button className="cs-tour-switch" onClick={() => setPhase("tour")}
              title="Switch tour">
              {T.label} ⇄
            </button>
          )}
          {gameMode === "career" && careerSeason > 1 && (
            <div className="cs-career-badge">
              {playerFlag} {playerName} · Season {careerSeason} · {careerSlamCount} slam{careerSlamCount !== 1 ? "s" : ""}
            </div>
          )}
          <div className="cs-tag">build a champion, shot by shot</div>
        </div>
      </header>

      {/* MODE SELECT */}
      {phase === "mode" && (
        <section className="cs-mode-pick">
          <h1 className="cs-h1">
            Can you build<br /><em>a tennis legend?</em>
          </h1>
          <p className="cs-lede">
            Draft iconic shots from real players across different eras. Build
            the ultimate all-court champion. Then find out how far they can go.
          </p>
          <NetGraphic />
          <p className="cs-tour-prompt">Choose your game</p>
          <div className="cs-mode-btns">
            <button className="cs-mode-btn" onClick={() => { setGameMode("single"); setPhase("tour"); }}>
              <span className="cs-mode-icon">🎾</span>
              <span className="cs-mode-label">Single Season</span>
              <span className="cs-mode-desc">Build the ultimate player and chase the Calendar Slam — all four majors in one year.</span>
            </button>
            <button className="cs-mode-btn career" onClick={() => { setGameMode("career"); setPhase("tour"); }}>
              <span className="cs-mode-icon">🏆</span>
              <span className="cs-mode-label">Career Mode</span>
              <span className="cs-mode-desc">Guide your player across 15-20 seasons. Hire coaches, survive injuries, build a rivalry, and write your legacy.</span>
            </button>
          </div>
        </section>
      )}

      {phase === "tour" && (
        <section className="cs-tourpick">
          <h1 className="cs-h1">
            Build a<br /><em>tennis god.</em>
          </h1>
          <p className="cs-lede">
            Spin real players, draft their iconic weapons, and chase the rarest
            prize in the sport: all four majors in a single year.
          </p>
          <div className="cs-surfaces cs-tour-slams">
            {SLAMS.map((s) => (
              <div key={s.key} className={`cs-surface-chip slam-${s.key}`}>
                <span className="cs-chip-name">{s.name}</span>
                <span className="cs-chip-surface">{s.surface}</span>
              </div>
            ))}
          </div>
          <NetGraphic />
          <p className="cs-tour-prompt">Choose your tour to begin</p>
          <div className="cs-tour-btns">
            <button
              className="cs-tour-btn atp"
              onClick={() => { setTour("atp"); setPhase(gameMode === "career" ? "player-create" : "intro"); }}
            >
              <span className="cs-tour-label">ATP</span>
              <span className="cs-tour-sub">Men's Tour</span>
            </button>
            <button
              className="cs-tour-btn wta"
              onClick={() => { setTour("wta"); setPhase(gameMode === "career" ? "player-create" : "intro"); }}
            >
              <span className="cs-tour-label">WTA</span>
              <span className="cs-tour-sub">Women's Tour</span>
            </button>
          </div>
        </section>
      )}

      {/* PLAYER CREATE (career mode only) */}
      {phase === "player-create" && (
        <section className="cs-player-create">
          <div className="cs-intro-tour">{T.label} · Career Mode</div>
          <h1 className="cs-h1">Create your <em>player</em></h1>
          <p className="cs-lede">Give your player an identity, or let us generate one for you.</p>

          <div className="cs-create-tabs">
            <button className={`cs-create-tab ${playerNameMode === "generate" ? "active" : ""}`}
              onClick={() => { setPlayerNameMode("generate"); generatePlayerIdentity(); }}>
              Generate
            </button>
            <button className={`cs-create-tab ${playerNameMode === "custom" ? "active" : ""}`}
              onClick={() => setPlayerNameMode("custom")}>
              Custom
            </button>
          </div>

          {playerNameMode === "generate" ? (
            <div className="cs-create-generated">
              <div className="cs-gen-player">
                <span className="cs-gen-flag">{playerFlag}</span>
                <span className="cs-gen-name">{playerName || "Generating…"}</span>
              </div>
              <button className="cs-text-btn" onClick={generatePlayerIdentity}>↻ Generate another</button>
            </div>
          ) : (
            <div className="cs-create-custom">
              <div className="cs-create-field">
                <label className="cs-create-label">Name</label>
                <input
                  className="cs-create-input"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder="Your player's name"
                  maxLength={32}
                />
              </div>
              <div className="cs-create-field">
                <label className="cs-create-label">Nationality</label>
                <select className="cs-create-select" value={playerFlag}
                  onChange={e => setPlayerFlag(e.target.value)}>
                  {FLAG_KEYS.map(f => (
                    <option key={f} value={f}>{f} {NAMES[f].country}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="cs-create-field">
            <label className="cs-create-label">Starting age</label>
            <div className="cs-age-btns">
              {[18, 19, 20, 21, 22].map(a => (
                <button key={a}
                  className={`cs-age-btn ${careerStartAge === a ? "active" : ""}`}
                  onClick={() => setCareerStartAge(a)}>{a}</button>
              ))}
            </div>
            <p className="cs-create-hint">Younger = more seasons but a slower peak. Older = ready sooner.</p>
          </div>

          <button className="cs-cta" onClick={startCareer}
            disabled={!playerName.trim() && playerNameMode === "custom"}>
            Begin career →
          </button>
        </section>
      )}

      {phase === "intro" && (
        <section className="cs-intro">
          {gameMode === "career" ? (
            <>
              <div className="cs-intro-tour">Career Mode · {T.label} · Season 1</div>
              <h1 className="cs-h1">
                Build your <em>player</em> from scratch.
              </h1>
              <p className="cs-lede">
                Spin legends from different eras and draft their iconic weapons into your player's game.
                You have <strong>10 picks</strong> — choose wisely. This build will carry through your career,
                shaped by coaches, injuries and the passage of time.
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
                <button className="cs-cta" onClick={startDraft}>Begin the draft →</button>
              </div>
            </>
          ) : (
            <>
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
              <div className="cs-difficulty">
                <span className="cs-diff-label">Mode</span>
                <button
                  className={`cs-diff-btn ${difficulty === "normal" ? "active" : ""}`}
                  onClick={() => setDifficulty("normal")}
                >Normal</button>
                <button
                  className={`cs-diff-btn ${difficulty === "challenge" ? "active" : ""}`}
                  onClick={() => setDifficulty("challenge")}
                >Challenge</button>
                {difficulty === "challenge" && (
                  <span className="cs-diff-hint">One elite pick, nine journeymen</span>
                )}
              </div>
              <div className="cs-intro-actions">
                <button className="cs-cta" onClick={startDraft}>Start drafting →</button>
              </div>
            </>
          )}
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
            {difficulty === "challenge" && (
              <span className={`cs-challenge-badge ${eliteUsed ? "used" : "avail"}`}>
                {eliteUsed ? "Elite used" : "★ Elite pick available"}
              </span>
            )}
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
              <CourtDiagram build={build} hovered={hovered} />
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
              const hint = attrSurfaceHint(a.key);
              const hintClass = `cs-hint-${hint.toLowerCase()}`;
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
                  <div className="cs-attr-top">
                    <span className="cs-attr-label">{a.label}</span>
                    {!taken && (
                      <span className={`cs-surface-badge cs-hint-${hint.toLowerCase()}`}>
                        {hint[0]}
                      </span>
                    )}
                    {taken && build[a.key].elite && <span className="cs-elite-badge">★</span>}
                  </div>
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
          {current && current.fact && (
            <div className="cs-mobile-fact">
              <span className="cs-mobile-fact-flag">{current.flag}</span>
              <span className="cs-mobile-fact-name">{current.name}</span>
              <span className="cs-mobile-fact-text">{current.fact}</span>
            </div>
          )}
        </section>
      )}

      {phase === "result" && results && (
        <section className="cs-result">
          {!ranSim && (
            <div className="cs-begin-season">
              {gameMode === "career" && (() => {
                const yr = 2025 + careerSeason;
                const ol = getOlympics(yr);
                return ol ? (
                  <div className="cs-olympic-banner">
                    <span className="cs-olympic-rings">🏅</span>
                    <div className="cs-olympic-text">
                      <strong>Olympic Year — {yr}</strong>
                      <span>{ol.flag} {ol.city} · {ol.surface} court · {ol.venue}</span>
                      <span className="cs-olympic-note">Olympics is best of 3 sets. Your result will be revealed at the end of the season.</span>
                    </div>
                  </div>
                ) : null;
              })()}
              <div className="cs-begin-copy">
                <h2 className="cs-begin-title">
                  {gameMode === "career"
                    ? `Season ${careerSeason} · ${2025 + careerSeason}`
                    : "Your player is ready."}
                </h2>
                <p className="cs-begin-sub">
                  {gameMode === "career"
                    ? `Age ${careerAge} · ${playerFlag} ${playerName}`
                    : `Send them out against the ${T.label} field. Melbourne, Paris, London, New York.`}
                </p>
              </div>
              <button className="cs-cta cs-begin-btn" onClick={startSim}>
                {gameMode === "career" ? `Play Season ${careerSeason} →` : "Begin the season →"}
              </button>
              <details className="cs-breakdown cs-breakdown-pre">
                <summary>Review your build first ▾</summary>
                <div className="cs-build-list">
                  {ATTRS.map((a) => (
                    <div key={a.key} className="cs-build-row">
                      <span>{a.label}</span>
                      <span className="cs-build-val">
                        {build[a.key]
                          ? `${build[a.key].flag} ${build[a.key].player} · ${build[a.key].rating}`
                          : "— empty —"}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
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
                <>
                  <div className="cs-live-banner">
                    <span className="cs-live-dot" />
                    Playing {simResults.perSlam[reveal.slam]?.name}…
                    <button className="cs-skip-btn" onClick={skipSim}>Skip ⏭</button>
                  </div>
                  <div className="cs-skip-float">
                    <button className="cs-skip-btn cs-skip-float-btn" onClick={skipSim}>Skip to results ⏭</button>
                  </div>
                </>
              )}

              <div className="cs-gauntlet">
                {simResults.perSlam.map((s, si) => {
                  if (si > reveal.slam) return null;
                  const isCurrent = si === reveal.slam && !reveal.done;
                  const roundsToShow = reveal.done || si < reveal.slam
                    ? s.path.length
                    : reveal.round + 1;
                  const resolved = roundsToShow >= s.path.length;
                  const isOly = s.isOlympics;
                  return (
                    <div key={s.key} className={`cs-leg ${isOly ? "cs-leg-olympics" : `slam-${s.key}`} ${resolved ? (s.wonTitle ? "win" : "loss") : "playing"}`}>
                      <div className="cs-leg-top">
                        <span className="cs-leg-name">
                          {isOly ? "🏅 " : ""}{s.name}
                        </span>
                        <span className="cs-leg-surface">
                          {isOly ? `${s.olympicsData?.flag} Best of 3` : s.surface}
                        </span>
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
                  {gameMode === "career" ? (
                    <>
                      <button className="cs-sim-btn cs-career-next" onClick={() => endCareerSeason(simResults.perSlam)}>
                        ✓ End season {careerSeason} →
                      </button>
                      {retirementPrompt && (
                        <div className="cs-retirement-prompt">
                          <p>Your body may not have many more seasons at this level. Retire now or keep pushing?</p>
                          <div className="cs-retire-actions">
                            <button className="cs-sim-btn" onClick={retire}>Retire</button>
                            <button className="cs-sim-btn" onClick={() => endCareerSeason(simResults.perSlam)}>One more season</button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <button className="cs-sim-btn" onClick={startSim}>
                      ↻ Run the year again (new draw)
                    </button>
                  )}
                  <button className="cs-sim-btn cs-share-btn" onClick={() => setShowCard(true)}>
                    ↗ Share result
                  </button>
                </div>
              )}
            </>
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

          {gameMode === "single" ? (
            <button className="cs-cta" onClick={() => { setPhase("mode"); }}>Play again →</button>
          ) : null}
        </section>
      )}

      {/* OFFSEASON (career mode) */}
      {phase === "offseason" && (
        <section className="cs-offseason">

          {/* PRESS QUOTE PHASE — shown first, before the upgrade choices */}
          {pressPhase && seasonSummary ? (
            <>
              <div className="cs-press-report">
                <div className="cs-press-header">
                  <span className="cs-press-masthead">THE TENNIS TRIBUNE</span>
                  <span className="cs-press-edition">Season {careerSeason} Review · {2025 + careerSeason}</span>
                </div>
                <h2 className="cs-press-headline">{seasonSummary.headline}</h2>
                <p className="cs-press-body">{seasonSummary.body}</p>
              </div>

              <div className="cs-quote-section">
                <h3 className="cs-upgrade-title">The press are waiting.</h3>
                <p className="cs-upgrade-sub">How do you sum up your {2025 + careerSeason}?</p>
                <div className="cs-quote-grid">
                  {seasonSummary.quotes.map((q, i) => (
                    <button key={i}
                      className={`cs-quote-btn ${chosenQuote === q ? "chosen" : ""}`}
                      onClick={() => setChosenQuote(q)}>
                      "{q}"
                    </button>
                  ))}
                </div>
                <button className="cs-cta cs-press-continue"
                  onClick={() => setPressPhase(false)}>
                  {chosenQuote ? "Continue to off-season →" : "Skip →"}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* TROPHY CABINET */}
              {careerSlamCount > 0 && (
                <div className="cs-trophy-cabinet">
                  <span className="cs-trophy-label">Trophy Cabinet</span>
                  <div className="cs-trophy-row">
                    {careerSeasons.flatMap(s =>
                      s.results?.filter(r => !r.isOlympics && r.wonTitle).map(r => (
                        <div key={`${s.season}-${r.key}`} className={`cs-trophy slam-${r.key}`} title={`${r.name} ${s.year}`}>
                          <span className="cs-trophy-icon">🏆</span>
                          <span className="cs-trophy-name">{r.short || r.name?.split(" ").pop()}</span>
                          <span className="cs-trophy-year">{s.year}</span>
                        </div>
                      ))
                    )}
                    {careerSeasons.flatMap(s =>
                      s.olympics?.medal?.includes("Gold") ? [
                        <div key={`oly-${s.season}`} className="cs-trophy cs-trophy-gold" title={`${s.olympics.city} Olympics`}>
                          <span className="cs-trophy-icon">🥇</span>
                          <span className="cs-trophy-name">Olympic</span>
                          <span className="cs-trophy-year">{s.year}</span>
                        </div>
                      ] : []
                    )}
                  </div>
                </div>
              )}

              {/* SEASON SUMMARY CARD */}
              {seasonSummary && (
                <div className="cs-season-report-card">
                  <div className="cs-report-source">The Tennis Tribune</div>
                  <h3 className="cs-report-headline">{seasonSummary.headline}</h3>
                  <p className="cs-report-body">{seasonSummary.body}</p>
                </div>
              )}

              <div className="cs-offseason-header">
                <div className="cs-intro-tour">Off-season · Season {careerSeason + 1} ahead · Age {careerAge + 1}</div>
              </div>

              {careerRival && (
                <div className="cs-rival-card">
                  <span className="cs-rival-label">Rivalry standings</span>
                  <div className="cs-rival-row">
                    <span>{playerFlag} {playerName}</span>
                    <span className="cs-rival-h2h">{careerSlamCount} – {careerRival.slamCount} slams</span>
                    <span>{careerRival.flag} {careerRival.name}</span>
                  </div>
                  <div className="cs-rival-note">
                    {careerRival.name} ({careerRival.country}) — your {careerRival.weakSurf} nemesis
                  </div>
                </div>
              )}

              {offseasonInjury && (
                <div className="cs-injury-card">
                  <span className="cs-injury-icon">🤕</span>
                  <div className="cs-injury-content">
                    <span className="cs-injury-title">{offseasonInjury.label}</span>
                    <span className="cs-injury-desc">{offseasonInjury.desc}</span>
                    <span className="cs-injury-effects">
                      {Object.entries(offseasonInjury.effects).map(([k,v]) =>
                        `${ATTRS.find(a=>a.key===k)?.label} ${v}`).join(" · ")}
                    </span>
                  </div>
                </div>
              )}

              {olympicResult && (
                <div className={`cs-olympic-result ${olympicResult.wonGold ? "gold" : ""}`}>
                  <div className="cs-olympic-result-top">
                    <span className="cs-olympic-result-icon">
                      {olympicResult.medal?.includes("Gold") ? "🥇"
                        : olympicResult.medal?.includes("Silver") ? "🥈"
                        : olympicResult.medal?.includes("Bronze") ? "🥉" : "🎾"}
                    </span>
                    <div>
                      <span className="cs-olympic-result-title">
                        {olympicResult.year} Olympics · {olympicResult.flag} {olympicResult.city}
                      </span>
                      <span className="cs-olympic-result-medal">{olympicResult.medal}</span>
                      <span className="cs-olympic-result-detail">
                        {olympicResult.surface} court · {olympicResult.venue}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="cs-upgrade-section">
                <h3 className="cs-upgrade-title">Off-season investment</h3>
                <p className="cs-upgrade-sub">Tap once to preview, tap again to confirm.</p>
                <div className="cs-upgrade-grid">
                  {offseasonUpgrades.map(u => {
                    const armed = upgradeArmed === u.id;
                    return (
                      <button key={u.id}
                        className={`cs-upgrade-btn ${u.recovery ? "recovery" : ""} ${armed ? "armed" : ""}`}
                        onClick={() => {
                          if (armed) applyUpgrade(u);
                          else setUpgradeArmed(u.id);
                        }}>
                        <span className="cs-upgrade-label">{u.label}</span>
                        <span className="cs-upgrade-desc">{u.desc}</span>
                        <div className="cs-upgrade-effects">
                          {Object.entries(u.effects).map(([k, v]) => (
                            <span key={k} className={`cs-upgrade-effect ${v > 0 ? "pos" : "neg"}`}>
                              {ATTRS.find(a => a.key === k)?.label} {v > 0 ? `+${v}` : v}
                            </span>
                          ))}
                          {u.longevity > 0 && <span className="cs-upgrade-effect pos">+{u.longevity} longevity</span>}
                          {u.longevity < 0 && <span className="cs-upgrade-effect neg">{u.longevity} longevity</span>}
                          {Object.keys(u.effects).length === 0 && <span className="cs-upgrade-effect pos">Body recovery</span>}
                        </div>
                        {armed && <span className="cs-upgrade-confirm">Tap again to confirm ✓</span>}
                        {u.warning && !armed && <span className="cs-upgrade-warning">⚠ {u.warning}</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Current stats panel — helps you decide where to invest */}
                <details className="cs-stats-panel">
                  <summary>View current stats ▾</summary>
                  <div className="cs-stats-grid">
                    {ATTRS.map(a => {
                      const val = offseasonPendingBuild?.[a.key]?.rating;
                      const pct = val ? Math.round((val / 99) * 100) : 0;
                      const tier = val >= 90 ? "elite" : val >= 80 ? "strong" : val >= 70 ? "solid" : "weak";
                      return (
                        <div key={a.key} className="cs-stat-row">
                          <span className="cs-stat-label">{a.label}</span>
                          <div className="cs-stat-bar-track">
                            <div className={`cs-stat-bar cs-stat-${tier}`} style={{width:`${pct}%`}} />
                          </div>
                          <span className="cs-stat-val">{val ?? "—"}</span>
                        </div>
                      );
                    })}
                  </div>
                </details>
              </div>

              {retirementPrompt && (
                <div className="cs-retirement-prompt">
                  <p>Your peak years may be behind you. Retire now and celebrate your legacy?</p>
                  <div className="cs-retire-actions">
                    <button className="cs-cta" onClick={retire}>Retire →</button>
                    <button className="cs-text-btn" onClick={() => setRetirementPrompt(false)}>Keep going</button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* RETIREMENT (career mode) */}
      {phase === "retirement" && (
        <section className="cs-retirement">
          <div className="cs-retire-hero">
            <span className="cs-retire-flag">{playerFlag}</span>
            <h1 className="cs-h1">{playerName}</h1>
            <p className="cs-retire-years">{2025 + 1}–{2025 + careerSeason} · {T.label}</p>
          </div>

          <div className="cs-retire-stat-grid">
            <div className="cs-retire-stat">
              <span className="cs-retire-val">{careerSlamCount}</span>
              <span className="cs-retire-key">Grand Slam{careerSlamCount !== 1 ? "s" : ""}</span>
            </div>
            <div className="cs-retire-stat">
              <span className="cs-retire-val">{careerSeason}</span>
              <span className="cs-retire-key">Seasons</span>
            </div>
            <div className="cs-retire-stat">
              <span className="cs-retire-val">{careerSeasons.reduce((s,r) => s + r.slams, 0)}</span>
              <span className="cs-retire-key">Total slams</span>
            </div>
          </div>

          <div className="cs-retire-tier">
            {careerSlamCount >= 10 ? "🐐 All-Time Great" :
             careerSlamCount >= 5  ? "⭐ Legendary Champion" :
             careerSlamCount >= 2  ? "🏆 Grand Slam Champion" :
             careerSlamCount === 1 ? "🎾 Grand Slam Winner" :
                                      "🎾 A Professional Career"}
          </div>

          {careerRival && (
            <div className="cs-rival-card">
              <span className="cs-rival-label">Career Rivalry</span>
              <div className="cs-rival-row">
                <span>{playerFlag} {playerName} — {careerSlamCount} slams</span>
                <span>vs.</span>
                <span>{careerRival.flag} {careerRival.name} — {careerRival.slamCount} slams</span>
              </div>
            </div>
          )}

          <div className="cs-season-log">
            <h3 className="cs-upgrade-title">Season by season</h3>
            {careerSeasons.map(s => (
              <div key={s.season} className="cs-season-row">
                <span className="cs-season-num">{s.year} · Age {s.age}</span>
                <span className="cs-season-result">
                  {s.slams > 0 ? `🏆 ${s.slams} slam${s.slams !== 1 ? "s" : ""}` : "No titles"}
                  {s.olympics ? ` · ${s.olympics.medal}` : ""}
                </span>
              </div>
            ))}
          </div>

          <button className="cs-cta" onClick={() => setPhase("mode")}>Play again →</button>
        </section>
      )}

      {showCard && simResults && (
        <ShareCard
          active={simResults}
          ranSim={true}
          build={build}
          tourLabel={T.label}
          onClose={() => setShowCard(false)}
        />
      )}

      {showRivalModal && careerRival && (
        <RivalModal
          rival={careerRival}
          playerName={playerName}
          playerFlag={playerFlag}
          onClose={() => setShowRivalModal(false)}
        />
      )}
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600;700&display=swap');

body { background: #1f6b3f; margin: 0; }

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
.cs-wordmark { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:28px; letter-spacing:.5px; line-height:1; display:flex; align-items:baseline; gap:7px; text-transform:uppercase; }
.cs-wordmark-calendar { color:var(--chalk); font-weight:700; letter-spacing:.06em; }
.cs-wordmark-slam { color:var(--ball); font-weight:900; font-style:italic; letter-spacing:-.01em; font-size:1.18em; text-shadow:2px 2px 0 rgba(14,42,26,.5), 0 0 18px rgba(216,240,0,.35); }
.cs-tag { font-size:11px; letter-spacing:.16em; text-transform:uppercase; color:var(--dim); font-weight:600; }

/* INTRO */
.cs-intro { padding-top:34px; }
.cs-h1 { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:clamp(36px,8.5vw,64px); line-height:.96; letter-spacing:0; margin:0 0 22px; text-transform:uppercase; }
.cs-h1 em { color:var(--ball); font-style:normal; }
.cs-lede { font-size:16.5px; line-height:1.6; max-width:60ch; color:var(--chalk); margin:0 0 18px; }
.cs-lede:last-of-type { margin-bottom:28px; }
.cs-lede strong { color:var(--ball-soft); font-weight:700; }
.cs-surfaces { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:24px; }
.cs-surface-chip { border:none; border-radius:10px; padding:14px 12px; display:flex; flex-direction:column; gap:5px; cursor:default; }
.cs-chip-name { font-weight:700; font-size:13px; line-height:1.15; color:#fff; }
.cs-chip-surface { font-size:10px; letter-spacing:.12em; text-transform:uppercase; font-weight:700; color:rgba(255,255,255,.75); }
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

/* court diagram */
.cs-court { width:120px; flex:0 0 120px; display:block; align-self:center; }

/* figure placeholder (unused but kept) */
.cs-figure { width:128px; flex:0 0 128px; display:block; align-self:center; }
.cs-figure.pulse { animation:cs-pulse 1.1s ease-in-out infinite; }
@keyframes cs-pulse { 0%,100%{opacity:1} 50%{opacity:.72} }
@media (prefers-reduced-motion: reduce) { .cs-figure.pulse { animation:none; } }

/* header nav */
.cs-head-right { display:flex; flex-direction:column; align-items:flex-end; gap:3px; margin-left:auto; }
.cs-tour-switch { background:rgba(246,251,239,.1); border:1.5px solid var(--line); border-radius:20px; color:var(--chalk); font-size:12px; font-weight:700; letter-spacing:.06em; padding:5px 12px; cursor:pointer; transition:background .18s, border-color .18s; }
.cs-tour-switch:hover { background:rgba(216,240,0,.15); border-color:var(--ball); }

/* slam buttons — solid filled pill cards, no border */
.cs-surface-chip.slam-ao  { background:linear-gradient(135deg,#1a5fb8,#2b7de9); border:none; box-shadow:0 3px 0 rgba(0,0,0,.3); }
.cs-surface-chip.slam-rg  { background:linear-gradient(135deg,#b84a1a,#e07a3f); border:none; box-shadow:0 3px 0 rgba(0,0,0,.3); }
.cs-surface-chip.slam-wim { background:linear-gradient(135deg,#3d1a6b,#5a2d82); border:none; box-shadow:0 3px 0 rgba(0,0,0,.3); }
.cs-surface-chip.slam-uso { background:linear-gradient(135deg,#0e6fa0,#1a8fd0); border:none; box-shadow:0 3px 0 rgba(0,0,0,.3); }
.slam-ao  .cs-chip-surface, .slam-rg  .cs-chip-surface,
.slam-wim .cs-chip-surface, .slam-uso .cs-chip-surface { color:rgba(255,255,255,.78); }

/* difficulty selector */
.cs-difficulty { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:22px; }
.cs-diff-label { font-size:12px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--dim); }
.cs-diff-btn { background:rgba(246,251,239,.07); border:1.5px solid var(--line-soft); border-radius:20px; color:var(--dim); font-size:13px; font-weight:700; padding:7px 18px; cursor:pointer; transition:background .18s, border-color .18s, color .18s; }
.cs-diff-btn.active { background:var(--ball); border-color:var(--ball); color:var(--ink); }
.cs-diff-btn:not(.active):hover { border-color:var(--ball); color:var(--chalk); }
.cs-diff-hint { font-size:11px; color:var(--ball-soft); font-weight:600; letter-spacing:.04em; }

/* challenge mode draft badge */
.cs-challenge-badge { font-size:11px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; padding:4px 10px; border-radius:20px; white-space:nowrap; }
.cs-challenge-badge.avail { background:var(--ball); color:var(--ink); }
.cs-challenge-badge.used  { background:rgba(246,251,239,.12); color:var(--dim); }

/* surface letter badge on attr buttons */
.cs-attr-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:2px; }
.cs-surface-badge { font-size:10px; font-weight:900; letter-spacing:.02em; border-radius:4px; padding:2px 5px; line-height:1; }
.cs-hint-clay  { background:rgba(210,105,63,.25); color:var(--clay); }
.cs-hint-grass { background:rgba(111,191,115,.2); color:var(--grass); }
.cs-hint-hard  { background:rgba(56,160,216,.2);  color:var(--hard); }

/* elite badge on locked shots */
.cs-elite-badge { font-size:13px; color:var(--ball); font-weight:800; }

/* share image button */
.cs-share-actions { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.cs-share-copy, .cs-share-img { font-size:15px !important; padding:12px 8px !important; }
.cs-share-img { background:rgba(246,251,239,.12); color:var(--chalk); border:2px solid var(--chalk); border-radius:4px; cursor:pointer; font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:15px; letter-spacing:.04em; text-transform:uppercase; transition:background .18s; }
.cs-share-img:hover { background:rgba(246,251,239,.22); }
.cs-share-img:disabled { opacity:.5; cursor:wait; }

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
.cs-tourpick { padding-top:20px; text-align:left; min-height:calc(100vh - 80px); display:flex; flex-direction:column; }
.cs-tour-slams { margin-bottom:20px; }
.cs-net { width:100%; height:44px; display:block; margin:18px 0 14px; opacity:.75; }
.cs-tour-prompt { font-size:12px; letter-spacing:.16em; text-transform:uppercase; font-weight:700; color:var(--dim); margin:0 0 12px; }
.cs-tour-btns { display:grid; grid-template-columns:1fr 1fr; gap:14px; max-width:520px; }
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

/* mobile player fact (shown below grid on small screens, hidden on desktop) */
.cs-mobile-fact { display:none; }
@media (max-width:520px) {
  .cs-mobile-fact { display:flex; flex-direction:column; gap:2px; margin-top:14px; padding:12px; background:rgba(246,251,239,.07); border-radius:6px; border-left:3px solid var(--ball); }
  .cs-mobile-fact-flag { font-size:18px; }
  .cs-mobile-fact-name { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:16px; color:var(--chalk); text-transform:uppercase; }
  .cs-mobile-fact-text { font-size:12.5px; color:var(--dim); line-height:1.4; }
}

/* live simulation banner + skip */
.cs-live-banner { display:flex; align-items:center; gap:10px; font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:18px; letter-spacing:.04em; text-transform:uppercase; color:var(--chalk); margin-bottom:16px; padding:12px 16px; border:2px solid var(--ball); border-radius:6px; background:rgba(216,240,0,.08); }
.cs-live-dot { width:10px; height:10px; border-radius:50%; background:var(--ball); animation:cs-blink 1s ease-in-out infinite; }
@keyframes cs-blink { 0%,100%{opacity:1} 50%{opacity:.25} }
.cs-skip-btn { margin-left:auto; background:var(--ball); color:var(--ink); border:none; border-radius:4px; font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:14px; letter-spacing:.06em; text-transform:uppercase; padding:7px 16px; cursor:pointer; }
.cs-skip-btn:hover { filter:brightness(1.08); }
.cs-skip-float { position:sticky; bottom:16px; display:flex; justify-content:center; pointer-events:none; margin-top:16px; }
.cs-skip-float-btn { pointer-events:all; box-shadow:0 3px 12px rgba(0,0,0,.4); font-size:15px; padding:10px 24px; border-radius:24px; }
.cs-leg.playing { border-color:var(--ball); animation:cs-legin .3s ease; }
@keyframes cs-legin { from{opacity:0; transform:translateY(6px)} to{opacity:1; transform:none} }
.cs-path-live li { animation:cs-rowin .25s ease; }
@keyframes cs-rowin { from{opacity:0} to{opacity:1} }
.cs-path-playing { opacity:.7; font-style:italic; }
.cs-path-playing .cs-path-opp { color:var(--ball-soft) !important; }
@media (prefers-reduced-motion: reduce) {
  .cs-live-dot, .cs-leg.playing, .cs-path-live li { animation:none; }
}

/* major colour identities — legs only (chips handled by the new solid rules above) */
.cs-leg.slam-ao { border-left-color:#2b7de9; }
.cs-leg.slam-rg { border-left-color:#e07a3f; }
.cs-leg.slam-wim { border-left-color:#5a2d82; }
.cs-leg.slam-uso { border-left-color:#1a8fd0; }
.cs-leg.cs-leg-olympics { border-left-color:#ffd700; background:rgba(255,215,0,.07); }
.cs-leg.cs-leg-olympics .cs-leg-name { color:#ffd700; }
.cs-leg.cs-leg-olympics.win { background:rgba(255,215,0,.14); }

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
/* begin the season screen */
/* ---- CAREER MODE CSS ---- */

/* Mode pick */
.cs-mode-pick { padding-top:24px; }
.cs-mode-btns { display:grid; grid-template-columns:1fr 1fr; gap:14px; max-width:600px; margin-top:4px; }
.cs-mode-btn { display:flex; flex-direction:column; align-items:flex-start; gap:8px; padding:22px 20px; border-radius:10px; border:2.5px solid var(--chalk); background:rgba(246,251,239,.05); cursor:pointer; text-align:left; transition:transform .12s, background .2s, border-color .2s; }
.cs-mode-btn:hover { transform:translateY(-3px); background:rgba(216,240,0,.1); border-color:var(--ball); }
.cs-mode-btn.career { border-color:var(--ball); background:rgba(216,240,0,.08); }
.cs-mode-icon { font-size:30px; }
.cs-mode-label { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:22px; text-transform:uppercase; color:var(--chalk); line-height:1; }
.cs-mode-desc { font-size:13px; color:var(--dim); line-height:1.45; }

/* Career badge in header */
.cs-career-badge { font-size:11px; font-weight:700; color:var(--ball-soft); letter-spacing:.04em; white-space:nowrap; }

/* Player create */
.cs-player-create { padding-top:28px; }
.cs-create-tabs { display:flex; gap:8px; margin:20px 0 18px; }
.cs-create-tab { background:rgba(246,251,239,.07); border:1.5px solid var(--line-soft); border-radius:20px; color:var(--dim); font-size:13px; font-weight:700; padding:7px 22px; cursor:pointer; transition:.18s; }
.cs-create-tab.active { background:var(--ball); border-color:var(--ball); color:var(--ink); }
.cs-create-generated { display:flex; align-items:center; gap:16px; margin-bottom:24px; }
.cs-gen-flag { font-size:42px; }
.cs-gen-name { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:32px; color:var(--chalk); text-transform:uppercase; }
.cs-create-custom { display:flex; flex-direction:column; gap:14px; margin-bottom:24px; }
.cs-create-field { display:flex; flex-direction:column; gap:6px; margin-bottom:18px; }
.cs-create-label { font-size:11px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; color:var(--dim); }
.cs-create-input, .cs-create-select { background:rgba(246,251,239,.08); border:1.5px solid var(--line); border-radius:6px; color:var(--chalk); font-size:17px; font-weight:600; padding:12px 14px; width:100%; box-sizing:border-box; }
.cs-create-input:focus, .cs-create-select:focus { outline:none; border-color:var(--ball); }
.cs-create-hint { font-size:12px; color:var(--dim); margin-top:4px; }
.cs-age-btns { display:flex; gap:8px; flex-wrap:wrap; }
.cs-age-btn { background:rgba(246,251,239,.07); border:1.5px solid var(--line-soft); border-radius:8px; color:var(--dim); font-size:18px; font-weight:800; padding:10px 20px; cursor:pointer; transition:.18s; }
.cs-age-btn.active { background:var(--ball); border-color:var(--ball); color:var(--ink); }

/* Off-season */
.cs-offseason { padding-top:28px; }
.cs-offseason-header { margin-bottom:22px; }
.cs-offseason-h { font-size:clamp(28px,6vw,46px); margin:6px 0 0; }
.cs-rival-card { background:rgba(216,240,0,.07); border:1.5px solid rgba(216,240,0,.3); border-radius:8px; padding:14px 16px; margin-bottom:18px; display:flex; flex-direction:column; gap:6px; }
.cs-rival-label { font-size:10px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; color:var(--ball-soft); }
.cs-rival-row { display:flex; justify-content:space-between; align-items:center; font-weight:700; font-size:14px; color:var(--chalk); }
.cs-rival-h2h { font-family:"Barlow Condensed",sans-serif; font-size:20px; font-weight:800; color:var(--ball); }
.cs-rival-note { font-size:12px; color:var(--dim); }
.cs-injury-card { background:rgba(210,105,63,.12); border:1.5px solid rgba(210,105,63,.4); border-radius:8px; padding:14px 16px; margin-bottom:18px; display:flex; gap:14px; align-items:flex-start; }
.cs-injury-icon { font-size:28px; flex-shrink:0; }
.cs-injury-content { display:flex; flex-direction:column; gap:3px; }
.cs-injury-title { font-weight:800; font-size:15px; color:var(--clay); }
.cs-injury-desc { font-size:13px; color:var(--dim); line-height:1.4; }
.cs-injury-effects { font-size:12px; color:var(--clay); font-weight:700; margin-top:2px; }
.cs-upgrade-section { margin-bottom:28px; }
.cs-upgrade-title { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:20px; text-transform:uppercase; color:var(--chalk); margin:0 0 4px; }
.cs-upgrade-sub { font-size:13px; color:var(--dim); margin:0 0 14px; }
.cs-upgrade-grid { display:flex; flex-direction:column; gap:10px; }
.cs-upgrade-btn { display:flex; flex-direction:column; gap:6px; padding:16px 18px; border:2px solid var(--line-soft); border-radius:8px; background:rgba(246,251,239,.05); cursor:pointer; text-align:left; transition:.18s; }
.cs-upgrade-btn:hover { border-color:var(--ball); background:rgba(216,240,0,.08); transform:translateX(4px); }
.cs-upgrade-btn.recovery { border-color:rgba(111,191,115,.4); background:rgba(111,191,115,.07); }
.cs-upgrade-label { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:18px; text-transform:uppercase; color:var(--chalk); }
.cs-upgrade-desc { font-size:13px; color:var(--dim); line-height:1.4; }
.cs-upgrade-effects { display:flex; gap:8px; flex-wrap:wrap; margin-top:2px; }
.cs-upgrade-effect { font-size:11px; font-weight:800; padding:2px 8px; border-radius:10px; }
.cs-upgrade-effect.pos { background:rgba(111,191,115,.2); color:var(--grass); }
.cs-upgrade-effect.neg { background:rgba(210,105,63,.18); color:var(--clay); }
.cs-upgrade-warning { font-size:11px; color:var(--ball-soft); font-weight:700; }
.cs-retirement-prompt { background:rgba(210,105,63,.1); border:1.5px solid rgba(210,105,63,.4); border-radius:8px; padding:16px; margin-top:16px; }
.cs-retirement-prompt p { font-size:14px; color:var(--chalk); margin:0 0 12px; }
.cs-retire-actions { display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
.cs-career-next { width:100%; }

/* Retirement screen */
.cs-retirement { padding-top:28px; text-align:center; }
.cs-retire-hero { margin-bottom:28px; }
.cs-retire-flag { font-size:64px; display:block; margin-bottom:8px; }
.cs-retire-years { font-size:14px; color:var(--dim); font-weight:600; }
.cs-retire-stat-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:22px; }
.cs-retire-stat { background:rgba(246,251,239,.06); border:1.5px solid var(--line-soft); border-radius:8px; padding:16px 8px; display:flex; flex-direction:column; gap:4px; }
.cs-retire-val { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:42px; color:var(--ball); line-height:1; }
.cs-retire-key { font-size:11px; letter-spacing:.1em; text-transform:uppercase; font-weight:700; color:var(--dim); }
.cs-retire-tier { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:26px; text-transform:uppercase; color:var(--chalk); margin:0 0 22px; }
.cs-season-log { text-align:left; margin-bottom:28px; }
.cs-season-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--line-soft); font-size:13.5px; }
.cs-season-num { color:var(--dim); font-weight:600; }
.cs-season-result { color:var(--chalk); font-weight:700; }

@media (max-width:520px) {
  .cs-mode-btns { grid-template-columns:1fr; }
  .cs-retire-stat-grid { grid-template-columns:repeat(3,1fr); gap:6px; }
  .cs-retire-val { font-size:32px; }
}

/* Olympic year banner */
.cs-olympic-banner { display:flex; align-items:flex-start; gap:14px; background:linear-gradient(135deg,rgba(255,215,0,.12),rgba(216,240,0,.08)); border:1.5px solid rgba(255,215,0,.45); border-radius:8px; padding:14px 16px; margin-bottom:2px; }
.cs-olympic-rings { font-size:32px; flex-shrink:0; }
.cs-olympic-text { display:flex; flex-direction:column; gap:3px; }
.cs-olympic-text strong { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:17px; text-transform:uppercase; color:#ffd700; letter-spacing:.04em; }
.cs-olympic-text span { font-size:13px; color:var(--dim); }
.cs-olympic-note { font-size:12px; color:rgba(255,215,0,.65) !important; font-style:italic; }

/* Olympic offseason result */
.cs-olympic-result { background:rgba(200,200,200,.07); border:1.5px solid rgba(200,200,200,.25); border-radius:8px; padding:14px 16px; margin-bottom:18px; }
.cs-olympic-result.gold { background:rgba(255,215,0,.12); border-color:rgba(255,215,0,.45); }
.cs-olympic-result-top { display:flex; gap:14px; align-items:flex-start; }
.cs-olympic-result-icon { font-size:32px; flex-shrink:0; }
.cs-olympic-result-title { display:block; font-size:11px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; color:var(--dim); }
.cs-olympic-result-medal { display:block; font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:22px; text-transform:uppercase; color:var(--chalk); margin:2px 0; }
.cs-olympic-result.gold .cs-olympic-result-medal { color:#ffd700; }
.cs-olympic-result-detail { display:block; font-size:12px; color:var(--dim); }

/* ---- END CAREER MODE CSS ---- */

/* Newspaper rivalry modal */
.cs-rival-modal { align-items:flex-start; padding-top:40px; }
.cs-newspaper { background:#f5f0e4; color:#1a1205; max-width:460px; width:100%; border-radius:4px; padding:0 0 24px; box-shadow:0 8px 40px rgba(0,0,0,.5); }
.cs-newspaper-header { display:flex; justify-content:space-between; align-items:baseline; padding:14px 20px 10px; border-bottom:3px solid #1a1205; }
.cs-newspaper-name { font-family:"Barlow Condensed",serif; font-weight:900; font-size:22px; letter-spacing:.08em; text-transform:uppercase; color:#1a1205; }
.cs-newspaper-date { font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:#555; font-weight:700; }
.cs-newspaper-rule { border:none; border-top:2px solid #1a1205; margin:0 20px; }
.cs-newspaper-rule-thin { border-top-width:1px; margin:8px 20px; }
.cs-newspaper-headline { font-family:"Barlow Condensed",serif; font-weight:900; font-size:clamp(22px,5vw,32px); line-height:1.05; text-transform:uppercase; margin:14px 20px 8px; color:#1a1205; }
.cs-newspaper-subhead { font-size:13px; font-weight:700; margin:0 20px 10px; color:#444; }
.cs-newspaper-body { font-size:14px; line-height:1.65; margin:0 20px 12px; color:#2a1f10; }
.cs-newspaper-caption { font-size:12px; line-height:1.55; margin:0 20px 18px; color:#555; font-style:italic; }
.cs-newspaper-close { margin:0 20px; font-size:15px; padding:11px 24px; }

/* Season press report card in offseason */
.cs-season-report-card { background:#f5f0e4; border-radius:6px; padding:16px 18px; margin-bottom:18px; }
.cs-report-source { font-size:10px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; color:#888; margin-bottom:6px; }
.cs-report-headline { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:20px; text-transform:uppercase; color:#1a1205; margin:0 0 8px; line-height:1.1; }
.cs-report-body { font-size:13.5px; line-height:1.6; color:#2a1f10; margin:0; }

/* Press quote section */
.cs-press-report { background:#f5f0e4; border-radius:6px; padding:16px 18px; margin-bottom:18px; }
.cs-press-header { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:10px; border-bottom:2px solid #1a1205; padding-bottom:8px; }
.cs-press-masthead { font-family:"Barlow Condensed",sans-serif; font-weight:900; font-size:16px; letter-spacing:.1em; text-transform:uppercase; color:#1a1205; }
.cs-press-edition { font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:#666; }
.cs-press-headline { font-family:"Barlow Condensed",sans-serif; font-weight:900; font-size:22px; text-transform:uppercase; line-height:1.05; color:#1a1205; margin:0 0 10px; }
.cs-press-body { font-size:13px; line-height:1.65; color:#2a1f10; margin:0; white-space:pre-line; }
.cs-quote-section { margin-bottom:24px; }
.cs-quote-grid { display:flex; flex-direction:column; gap:8px; margin:12px 0 16px; }
.cs-quote-btn { text-align:left; background:rgba(246,251,239,.06); border:1.5px solid var(--line-soft); border-radius:6px; padding:12px 14px; cursor:pointer; font-size:13.5px; line-height:1.5; color:var(--chalk); font-style:italic; transition:.18s; }
.cs-quote-btn:hover { border-color:var(--ball); background:rgba(216,240,0,.08); }
.cs-quote-btn.chosen { border-color:var(--ball); background:rgba(216,240,0,.12); color:var(--chalk); }
.cs-press-continue { margin-top:4px; }

/* Trophy cabinet */
.cs-trophy-cabinet { margin-bottom:18px; }
.cs-trophy-label { font-size:10px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; color:var(--dim); display:block; margin-bottom:8px; }
.cs-trophy-row { display:flex; gap:8px; flex-wrap:wrap; }
.cs-trophy { display:flex; flex-direction:column; align-items:center; gap:2px; padding:8px 10px; border-radius:8px; min-width:52px; }
.cs-trophy.slam-ao  { background:linear-gradient(135deg,#1a5fb8,#2b7de9); }
.cs-trophy.slam-rg  { background:linear-gradient(135deg,#b84a1a,#e07a3f); }
.cs-trophy.slam-wim { background:linear-gradient(135deg,#3d1a6b,#5a2d82); }
.cs-trophy.slam-uso { background:linear-gradient(135deg,#0e6fa0,#1a8fd0); }
.cs-trophy.cs-trophy-gold { background:linear-gradient(135deg,#b8860b,#ffd700); }
.cs-trophy-icon { font-size:20px; }
.cs-trophy-name { font-size:9px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:rgba(255,255,255,.9); }
.cs-trophy-year { font-size:9px; color:rgba(255,255,255,.65); }

/* Stats panel in offseason */
.cs-stats-panel { margin-top:18px; }
.cs-stats-panel summary { cursor:pointer; font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--dim); padding:6px 0; }
.cs-stats-grid { display:flex; flex-direction:column; gap:6px; margin-top:10px; }
.cs-stat-row { display:grid; grid-template-columns:90px 1fr 36px; align-items:center; gap:8px; }
.cs-stat-label { font-size:11px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--dim); }
.cs-stat-bar-track { height:8px; background:rgba(14,42,26,.45); border-radius:4px; overflow:hidden; }
.cs-stat-bar { height:100%; border-radius:4px; transition:width .3s ease; }
.cs-stat-elite { background:var(--ball); }
.cs-stat-strong { background:var(--grass); }
.cs-stat-solid { background:var(--hard); }
.cs-stat-weak { background:var(--clay); }
.cs-stat-val { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:16px; color:var(--chalk); text-align:right; }

/* Upgrade armed state */
.cs-upgrade-btn.armed { border-color:var(--ball); background:rgba(216,240,0,.1); transform:translateX(6px); }
.cs-upgrade-confirm { font-size:11px; font-weight:800; color:var(--ball); text-transform:uppercase; letter-spacing:.06em; margin-top:4px; }

.cs-begin-season { display:flex; flex-direction:column; align-items:center; text-align:center; padding:40px 0 28px; gap:20px; }
.cs-begin-copy { display:flex; flex-direction:column; gap:8px; }
.cs-begin-title { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:42px; line-height:1; text-transform:uppercase; color:var(--chalk); margin:0; }
.cs-begin-sub { font-size:16px; color:var(--dim); max-width:40ch; margin:0; line-height:1.5; }
.cs-begin-btn { font-size:22px; padding:18px 40px; }
.cs-breakdown-pre { width:100%; max-width:580px; margin-top:8px; }

/* share slam buttons — solid fills, stacked */
.cs-share-trail { display:flex; flex-direction:column; gap:8px; margin-bottom:16px; }
.cs-share-slam-btn { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:8px; }
.cs-share-slam-btn.slam-ao  { background:linear-gradient(135deg,#1a5fb8,#2b7de9); }
.cs-share-slam-btn.slam-rg  { background:linear-gradient(135deg,#b84a1a,#e07a3f); }
.cs-share-slam-btn.slam-wim { background:linear-gradient(135deg,#3d1a6b,#5a2d82); }
.cs-share-slam-btn.slam-uso { background:linear-gradient(135deg,#0e6fa0,#1a8fd0); }
.cs-share-slam-name { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:15px; text-transform:uppercase; color:#fff; min-width:130px; }
.cs-share-slam-result { font-size:20px; }
.cs-share-slam-detail { font-size:12px; color:rgba(255,255,255,.8); font-weight:600; flex:1; text-align:right; }
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
  .cs-court { width:70px; flex:0 0 70px; }
  .cs-figure { width:70px; flex:0 0 70px; }
  .cs-card { padding:14px 16px; }
  .cs-card-name { font-size:22px; }
  .cs-card-fact { font-size:12px; display:none; }
  .cs-mobile-fact { display:block; }
  .cs-tour-btns { grid-template-columns:1fr 1fr; }
  .cs-meters { gap:7px; margin-bottom:12px; }
  .cs-sticky { padding-top:6px; }
}
`;
