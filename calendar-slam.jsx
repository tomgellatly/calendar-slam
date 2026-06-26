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
  { key: "movement", label: "Court coverage" },
  { key: "defence", label: "Defence" },
  { key: "stamina", label: "Stamina" },
  { key: "mental", label: "Mental" },
  { key: "slice", label: "Slice" },
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
  Hard: { serve: 1.2, return: 1.1, forehand: 1.1, backhand: 1.0, net: 0.9, movement: 1.0, defence: 1.0, stamina: 1.0, mental: 1.1, slice: 0.8 },
  Clay: { serve: 0.8, return: 1.2, forehand: 1.1, backhand: 1.0, net: 0.7, movement: 1.3, defence: 1.3, stamina: 1.3, mental: 1.1, slice: 1.0 },
  Grass: { serve: 1.4, return: 0.9, forehand: 1.0, backhand: 0.9, net: 1.3, movement: 1.0, defence: 0.8, stamina: 0.8, mental: 1.1, slice: 1.3 },
};

// --- Player pools. Ratings are illustrative estimates, NOT real data. --------
// Each player: stats, country flag (emoji), and a one-line career fact.
const POOL_ATP = [
  { name: "Pete Sampras",       flag: "🇺🇸", fact: "Serve-and-volley king who ruled the grass of the 1990s.", stats: { serve: 97, return: 78, forehand: 90, backhand: 84, net: 95, movement: 86, defence: 80, stamina: 84, mental: 92, slice: 88 } },
  { name: "Andre Agassi",       flag: "🇺🇸", fact: "The great returner whose ball-striking redefined the baseline.", stats: { serve: 80, return: 96, forehand: 93, backhand: 92, net: 78, movement: 85, defence: 88, stamina: 86, mental: 84, slice: 83 } },
  { name: "Roger Federer",      flag: "🇨🇭", fact: "The most elegant all-courter the game has ever seen.", stats: { serve: 92, return: 86, forehand: 97, backhand: 84, net: 92, movement: 95, defence: 88, stamina: 90, mental: 93, slice: 99 } },
  { name: "Rafael Nadal",       flag: "🇪🇸", fact: "The King of Clay, famed for relentless topspin and iron will.", stats: { serve: 85, return: 92, forehand: 98, backhand: 88, net: 82, movement: 96, defence: 97, stamina: 98, mental: 97, slice: 85 } },
  { name: "Novak Djokovic",     flag: "🇷🇸", fact: "The supreme returner and defender, bending matches to his will.", stats: { serve: 88, return: 99, forehand: 92, backhand: 97, net: 84, movement: 97, defence: 96, stamina: 96, mental: 95, slice: 89 } },
  { name: "Ivan Lendl",         flag: "🇨🇿", fact: "The ruthless baseliner who industrialised the modern forehand.", stats: { serve: 88, return: 84, forehand: 94, backhand: 86, net: 76, movement: 84, defence: 86, stamina: 92, mental: 90, slice: 78 } },
  { name: "Boris Becker",       flag: "🇩🇪", fact: "The diving teenage Wimbledon champion with a thunderous serve.", stats: { serve: 95, return: 80, forehand: 88, backhand: 82, net: 93, movement: 82, defence: 78, stamina: 82, mental: 86, slice: 84 } },
  { name: "Stefan Edberg",      flag: "🇸🇪", fact: "The most graceful serve-and-volleyer of his generation.", stats: { serve: 89, return: 82, forehand: 80, backhand: 88, net: 97, movement: 90, defence: 84, stamina: 84, mental: 85, slice: 97 } },
  { name: "Bjorn Borg",         flag: "🇸🇪", fact: "The ice-cool baseliner who conquered both clay and grass.", stats: { serve: 86, return: 88, forehand: 92, backhand: 90, net: 80, movement: 94, defence: 93, stamina: 96, mental: 96, slice: 84 } },
  { name: "John McEnroe",       flag: "🇺🇸", fact: "A touch artist at net with the finest hands in the game.", stats: { serve: 87, return: 86, forehand: 84, backhand: 82, net: 96, movement: 88, defence: 82, stamina: 80, mental: 78, slice: 99 } },
  { name: "Andy Murray",        flag: "🇬🇧", fact: "A brilliant counterpuncher and one of the best returners around.", stats: { serve: 84, return: 94, forehand: 86, backhand: 90, net: 85, movement: 93, defence: 95, stamina: 92, mental: 84, slice: 95 } },
  { name: "Stan Wawrinka",      flag: "🇨🇭", fact: "Owner of perhaps the most devastating one-handed backhand ever.", stats: { serve: 88, return: 84, forehand: 90, backhand: 96, net: 80, movement: 82, defence: 82, stamina: 84, mental: 82, slice: 87 } },
  { name: "Juan M. del Potro",  flag: "🇦🇷", fact: "A gentle giant whose forehand was one of the heaviest in history.", stats: { serve: 91, return: 82, forehand: 98, backhand: 80, net: 78, movement: 78, defence: 80, stamina: 82, mental: 84, slice: 76 } },
  { name: "Goran Ivanisevic",   flag: "🇭🇷", fact: "A wildcard with a left-handed serve that bordered on unplayable.", stats: { serve: 99, return: 70, forehand: 82, backhand: 76, net: 86, movement: 76, defence: 70, stamina: 78, mental: 74, slice: 78 } },
  { name: "Gustavo Kuerten",    flag: "🇧🇷", fact: "The joyful Brazilian whose topspin made him a clay-court hero.", stats: { serve: 84, return: 84, forehand: 93, backhand: 86, net: 78, movement: 88, defence: 90, stamina: 90, mental: 86, slice: 89 } },
  { name: "Marat Safin",        flag: "🇷🇺", fact: "A mercurial talent with raw power off both wings.", stats: { serve: 93, return: 86, forehand: 92, backhand: 90, net: 82, movement: 84, defence: 82, stamina: 80, mental: 70, slice: 83 } },
  { name: "Jim Courier",        flag: "🇺🇸", fact: "A ferociously fit baseliner who dominated clay in the early 1990s.", stats: { serve: 84, return: 86, forehand: 94, backhand: 82, net: 76, movement: 88, defence: 88, stamina: 95, mental: 88, slice: 78 } },
  { name: "Thomas Muster",      flag: "🇦🇹", fact: "The unstoppable clay-court machine with relentless topspin.", stats: { serve: 78, return: 88, forehand: 94, backhand: 82, net: 72, movement: 90, defence: 92, stamina: 98, mental: 90, slice: 77 } },
  { name: "Patrick Rafter",     flag: "🇦🇺", fact: "A serve-and-volley artist who made grass his personal playground.", stats: { serve: 90, return: 80, forehand: 82, backhand: 84, net: 95, movement: 86, defence: 80, stamina: 82, mental: 88, slice: 94 } },
  { name: "Lleyton Hewitt",     flag: "🇦🇺", fact: "A relentless retriever whose fighting spirit was unmatched.", stats: { serve: 82, return: 94, forehand: 86, backhand: 84, net: 80, movement: 96, defence: 96, stamina: 94, mental: 94, slice: 83 } },
  { name: "Yevgeny Kafelnikov", flag: "🇷🇺", fact: "A complete all-court player who won on both clay and hard.", stats: { serve: 84, return: 86, forehand: 90, backhand: 88, net: 82, movement: 84, defence: 84, stamina: 86, mental: 82, slice: 83 } },
  { name: "Michael Chang",      flag: "🇺🇸", fact: "The youngest male Slam champion, famed for extraordinary defence.", stats: { serve: 74, return: 90, forehand: 84, backhand: 84, net: 72, movement: 96, defence: 97, stamina: 98, mental: 92, slice: 83 } },
  { name: "Tommy Haas",         flag: "🇩🇪", fact: "A stylish all-courter who consistently troubled the very best.", stats: { serve: 90, return: 82, forehand: 90, backhand: 86, net: 84, movement: 86, defence: 82, stamina: 80, mental: 80, slice: 85 } },
  { name: "David Ferrer",       flag: "🇪🇸", fact: "The tireless workhorse who punched well above his talent level.", stats: { serve: 80, return: 88, forehand: 88, backhand: 84, net: 76, movement: 94, defence: 94, stamina: 99, mental: 92, slice: 79 } },
  { name: "Robin Soderling",    flag: "🇸🇪", fact: "The only man to beat Nadal at Roland Garros during his peak.", stats: { serve: 90, return: 82, forehand: 95, backhand: 82, net: 78, movement: 80, defence: 80, stamina: 82, mental: 80, slice: 77 } },
  { name: "Andy Roddick",       flag: "🇺🇸", fact: "A US Open champion with one of the hardest serves in history.", stats: { serve: 97, return: 80, forehand: 90, backhand: 78, net: 80, movement: 82, defence: 78, stamina: 84, mental: 84, slice: 76 } },
  { name: "Nikolay Davydenko",  flag: "🇷🇺", fact: "A technically pristine baseliner who troubled every top player.", stats: { serve: 80, return: 86, forehand: 88, backhand: 88, net: 78, movement: 88, defence: 86, stamina: 90, mental: 82, slice: 83 } },
  { name: "Marin Cilic",        flag: "🇭🇷", fact: "A US Open champion who could blast opponents off the court on a hot day.", stats: { serve: 93, return: 82, forehand: 91, backhand: 86, net: 80, movement: 80, defence: 80, stamina: 84, mental: 80, slice: 80 } },
  { name: "Kei Nishikori",      flag: "🇯🇵", fact: "A lightning-quick shotmaker who took the ball early off both wings.", stats: { serve: 80, return: 88, forehand: 90, backhand: 90, net: 80, movement: 92, defence: 88, stamina: 84, mental: 82, slice: 82 } },
  { name: "Grigor Dimitrov",    flag: "🇧🇬", fact: "An elegant all-courter whose one-hander drew Federer comparisons.", stats: { serve: 88, return: 82, forehand: 89, backhand: 86, net: 86, movement: 88, defence: 84, stamina: 84, mental: 78, slice: 92 } },
  { name: "Gael Monfils",       flag: "🇫🇷", fact: "An electric athlete and showman with freakish defensive range.", stats: { serve: 88, return: 86, forehand: 88, backhand: 82, net: 80, movement: 97, defence: 94, stamina: 84, mental: 76, slice: 82 } },
  { name: "Jo-Wilfried Tsonga", flag: "🇫🇷", fact: "A powerful, athletic attacker with explosive serve-and-forehand.", stats: { serve: 92, return: 80, forehand: 92, backhand: 80, net: 88, movement: 84, defence: 78, stamina: 82, mental: 80, slice: 80 } },
  { name: "Tomas Berdych",      flag: "🇨🇿", fact: "A tall, flat-hitting ball-striker who overpowered opponents from the back.", stats: { serve: 91, return: 82, forehand: 92, backhand: 88, net: 80, movement: 80, defence: 80, stamina: 84, mental: 78, slice: 78 } },
  { name: "David Nalbandian",   flag: "🇦🇷", fact: "A supreme ball-striker with arguably the best backhand of his era.", stats: { serve: 84, return: 90, forehand: 90, backhand: 94, net: 82, movement: 86, defence: 88, stamina: 82, mental: 80, slice: 84 } },
  { name: "Nick Kyrgios",       flag: "🇦🇺", fact: "A mercurial talent with a colossal serve and pure shotmaking instinct.", stats: { serve: 96, return: 80, forehand: 90, backhand: 84, net: 88, movement: 84, defence: 76, stamina: 76, mental: 70, slice: 88 } },
  { name: "Dominic Thiem",      flag: "🇦🇹", fact: "A US Open champion with a ferocious one-handed backhand and heavy topspin.", stats: { serve: 88, return: 86, forehand: 93, backhand: 92, net: 80, movement: 86, defence: 86, stamina: 88, mental: 84, slice: 84 } },
  { name: "Casper Ruud",        flag: "🇳🇴", fact: "A clay-court specialist with relentless topspin and a heavy forehand.", stats: { serve: 84, return: 84, forehand: 91, backhand: 84, net: 76, movement: 88, defence: 90, stamina: 90, mental: 86, slice: 80 } },
  { name: "Taylor Fritz",       flag: "🇺🇸", fact: "A big-serving American who thrives on quick surfaces.", stats: { serve: 92, return: 82, forehand: 90, backhand: 84, net: 80, movement: 82, defence: 80, stamina: 84, mental: 82, slice: 78 } },
  // Current era
  { name: "Jannik Sinner",      flag: "🇮🇹", fact: "The ice-cold Italian No. 1 with flat, relentless ball-striking.", stats: { serve: 90, return: 92, forehand: 95, backhand: 94, net: 82, movement: 92, defence: 90, stamina: 92, mental: 93, slice: 85 } },
  { name: "Carlos Alcaraz",     flag: "🇪🇸", fact: "The electric all-court prodigy with dazzling variety.", stats: { serve: 88, return: 90, forehand: 96, backhand: 88, net: 90, movement: 97, defence: 92, stamina: 93, mental: 90, slice: 92 } },
  { name: "Alexander Zverev",   flag: "🇩🇪", fact: "A towering baseliner with a heavy serve and clay-court grit.", stats: { serve: 94, return: 86, forehand: 88, backhand: 92, net: 80, movement: 86, defence: 86, stamina: 88, mental: 80, slice: 83 } },
  { name: "Daniil Medvedev",    flag: "🇷🇺", fact: "An unorthodox counterpuncher who defends from deep behind the line.", stats: { serve: 88, return: 94, forehand: 86, backhand: 88, net: 76, movement: 90, defence: 95, stamina: 90, mental: 82, slice: 82 } },
  { name: "Ben Shelton",        flag: "🇺🇸", fact: "A young American powerhouse with an explosive lefty serve.", stats: { serve: 96, return: 80, forehand: 92, backhand: 80, net: 82, movement: 84, defence: 78, stamina: 84, mental: 82, slice: 78 } },
  { name: "Holger Rune",        flag: "🇩🇰", fact: "A fiery competitor with huge talent and all-court aggression.", stats: { serve: 88, return: 84, forehand: 90, backhand: 86, net: 82, movement: 86, defence: 82, stamina: 82, mental: 78, slice: 83 } },
  { name: "Felix Auger-Aliassime", flag:"🇨🇦", fact:"A serve-and-forehand powerhouse who thrives on fast surfaces.", stats: { serve: 92, return: 82, forehand: 90, backhand: 82, net: 84, movement: 86, defence: 80, stamina: 84, mental: 80, slice: 80 } },
  { name: "Stefanos Tsitsipas", flag: "🇬🇷", fact: "A fluid one-handed backhand player with creative shot-making.", stats: { serve: 87, return: 83, forehand: 90, backhand: 88, net: 84, movement: 86, defence: 82, stamina: 84, mental: 80, slice: 91 } },
];

const POOL_WTA = [
  { name: "Serena Williams",    flag: "🇺🇸", fact: "The most dominant force in women's tennis, with a colossal serve.", stats: { serve: 98, return: 90, forehand: 95, backhand: 92, net: 84, movement: 88, defence: 86, stamina: 90, mental: 97, slice: 85 } },
  { name: "Steffi Graf",        flag: "🇩🇪", fact: "Owner of a fearsome forehand and the only Golden Slam in history.", stats: { serve: 90, return: 88, forehand: 98, backhand: 84, net: 86, movement: 96, defence: 90, stamina: 94, mental: 96, slice: 90 } },
  { name: "Martina Navratilova",flag: "🇺🇸", fact: "The serve-and-volley pioneer who redefined athleticism on tour.", stats: { serve: 92, return: 84, forehand: 88, backhand: 86, net: 98, movement: 92, defence: 84, stamina: 90, mental: 92, slice: 99 } },
  { name: "Justine Henin",      flag: "🇧🇪", fact: "A graceful all-courter with arguably the finest backhand in the game.", stats: { serve: 84, return: 90, forehand: 90, backhand: 98, net: 88, movement: 94, defence: 92, stamina: 88, mental: 90, slice: 99 } },
  { name: "Monica Seles",       flag: "🇷🇸", fact: "A ferocious two-fisted hitter who took the ball impossibly early.", stats: { serve: 84, return: 94, forehand: 95, backhand: 96, net: 76, movement: 84, defence: 86, stamina: 86, mental: 88, slice: 83 } },
  { name: "Venus Williams",     flag: "🇺🇸", fact: "A grass-court great with a huge serve and explosive movement.", stats: { serve: 94, return: 84, forehand: 90, backhand: 86, net: 86, movement: 94, defence: 84, stamina: 88, mental: 86, slice: 83 } },
  { name: "Chris Evert",        flag: "🇺🇸", fact: "The metronomic baseliner whose consistency was almost inhuman.", stats: { serve: 78, return: 90, forehand: 90, backhand: 94, net: 74, movement: 88, defence: 96, stamina: 92, mental: 96, slice: 89 } },
  { name: "Martina Hingis",     flag: "🇨🇭", fact: "A tactical genius who out-thought opponents with guile and angles.", stats: { serve: 78, return: 88, forehand: 84, backhand: 86, net: 90, movement: 92, defence: 90, stamina: 84, mental: 90, slice: 98 } },
  { name: "Maria Sharapova",    flag: "🇷🇺", fact: "A fierce competitor with flat, penetrating groundstrokes.", stats: { serve: 90, return: 86, forehand: 92, backhand: 92, net: 76, movement: 80, defence: 82, stamina: 86, mental: 94, slice: 80 } },
  { name: "Kim Clijsters",      flag: "🇧🇪", fact: "A supreme athlete famed for sliding splits and elastic defence.", stats: { serve: 86, return: 90, forehand: 90, backhand: 88, net: 84, movement: 95, defence: 94, stamina: 88, mental: 86, slice: 85 } },
  { name: "Lindsay Davenport",  flag: "🇺🇸", fact: "A powerful flat hitter who dominated on hard courts.", stats: { serve: 88, return: 84, forehand: 90, backhand: 86, net: 82, movement: 80, defence: 82, stamina: 84, mental: 86, slice: 81 } },
  { name: "Victoria Azarenka",  flag: "🇧🇾", fact: "A two-handed powerhouse who pressured from every part of the court.", stats: { serve: 84, return: 90, forehand: 90, backhand: 86, net: 78, movement: 90, defence: 90, stamina: 88, mental: 84, slice: 80 } },
  { name: "Arantxa Sanchez-Vicario", flag:"🇪🇸", fact:"A relentless clay-court fighter with incredible defence.", stats: { serve: 74, return: 90, forehand: 86, backhand: 84, net: 78, movement: 94, defence: 96, stamina: 96, mental: 90, slice: 83 } },
  { name: "Mary Pierce",        flag: "🇫🇷", fact: "A French Open and Australian Open champion with a powerful game.", stats: { serve: 86, return: 82, forehand: 92, backhand: 84, net: 80, movement: 82, defence: 80, stamina: 82, mental: 82, slice: 80 } },
  { name: "Amelie Mauresmo",    flag: "🇫🇷", fact: "A versatile all-courter with an exceptional serve-and-volley game.", stats: { serve: 88, return: 84, forehand: 86, backhand: 90, net: 92, movement: 88, defence: 84, stamina: 84, mental: 84, slice: 95 } },
  // Current era
  { name: "Aryna Sabalenka",    flag: "🇧🇾", fact: "The current world No. 1, hitting with overwhelming power.", stats: { serve: 92, return: 88, forehand: 95, backhand: 92, net: 80, movement: 86, defence: 84, stamina: 88, mental: 88, slice: 83 } },
  { name: "Iga Swiatek",        flag: "🇵🇱", fact: "A clay-court phenomenon with heavy topspin and relentless movement.", stats: { serve: 86, return: 92, forehand: 96, backhand: 88, net: 80, movement: 95, defence: 93, stamina: 92, mental: 90, slice: 85 } },
  { name: "Coco Gauff",         flag: "🇺🇸", fact: "A lightning-quick defender with a booming serve and big future.", stats: { serve: 90, return: 90, forehand: 84, backhand: 92, net: 82, movement: 96, defence: 94, stamina: 90, mental: 86, slice: 86 } },
  { name: "Elena Rybakina",     flag: "🇰🇿", fact: "A grass-court force with one of the biggest serves on tour.", stats: { serve: 95, return: 84, forehand: 92, backhand: 86, net: 80, movement: 84, defence: 82, stamina: 86, mental: 86, slice: 81 } },
  { name: "Jessica Pegula",     flag: "🇺🇸", fact: "A clean, consistent ball-striker who takes time away from rivals.", stats: { serve: 84, return: 90, forehand: 90, backhand: 90, net: 82, movement: 88, defence: 90, stamina: 88, mental: 86, slice: 85 } },
  { name: "Naomi Osaka",        flag: "🇯🇵", fact: "A hard-court champion with a thunderous serve and forehand.", stats: { serve: 94, return: 84, forehand: 94, backhand: 86, net: 78, movement: 82, defence: 80, stamina: 84, mental: 84, slice: 79 } },
  { name: "Simona Halep",       flag: "🇷🇴", fact: "A clay and grass champion with exceptional movement and defence.", stats: { serve: 80, return: 90, forehand: 88, backhand: 86, net: 80, movement: 94, defence: 94, stamina: 90, mental: 88, slice: 89 } },
  { name: "Angelique Kerber",   flag: "🇩🇪", fact: "A left-handed defensive master who excelled on every surface.", stats: { serve: 80, return: 92, forehand: 84, backhand: 90, net: 78, movement: 92, defence: 96, stamina: 90, mental: 86, slice: 89 } },
  { name: "Petra Kvitova",      flag: "🇨🇿", fact: "A two-time Wimbledon champion with a devastating lefty game.", stats: { serve: 88, return: 82, forehand: 88, backhand: 88, net: 86, movement: 86, defence: 80, stamina: 84, mental: 82, slice: 85 } },
];

// --- The field: real current tour players. Each has a base level and
// per-surface adjustments, plus a signature for loss narratives. Estimates. ---
const FIELD_ATP = [
  { name: "Jannik Sinner",        base: 88, born: 2001, surf: { Hard: 4, Clay: 1, Grass: 2 }, weapon: "relentless flat hitting", style: "baseline" },
  { name: "Carlos Alcaraz",       base: 88, born: 2003, surf: { Hard: 2, Clay: 4, Grass: 3 }, weapon: "all-court variety", style: "allcourt" },
  { name: "Alexander Zverev",     base: 84, born: 1997, surf: { Hard: 2, Clay: 4, Grass: 0 }, weapon: "heavy serve and clay-court grind", style: "baseline" },
  { name: "Felix Auger-Aliassime",base: 81, born: 2000, surf: { Hard: 3, Clay: 0, Grass: 3 }, weapon: "first-strike serving", style: "serve" },
  { name: "Ben Shelton",          base: 81, born: 2002, surf: { Hard: 2, Clay: -1, Grass: 3 }, weapon: "an explosive lefty serve", style: "serve" },
  { name: "Alex De Minaur",       base: 80, born: 1999, surf: { Hard: 2, Clay: 1, Grass: 2 }, weapon: "relentless speed and retrieving", style: "defence" },
  { name: "Taylor Fritz",         base: 80, born: 1997, surf: { Hard: 3, Clay: -1, Grass: 3 }, weapon: "a big serve and forehand", style: "serve" },
  { name: "Novak Djokovic",       base: 85, born: 1987, surf: { Hard: 4, Clay: 2, Grass: 3 }, weapon: "an impenetrable return and defence", style: "return" },
  { name: "Daniil Medvedev",      base: 81, born: 1996, surf: { Hard: 4, Clay: -2, Grass: 1 }, weapon: "deep-court counterpunching", style: "defence" },
  { name: "Flavio Cobolli",       base: 77, born: 2002, surf: { Hard: 1, Clay: 3, Grass: 1 }, weapon: "fearless ball-striking", style: "baseline" },
];

const FIELD_WTA = [
  { name: "Aryna Sabalenka",      base: 88, born: 1998, surf: { Hard: 4, Clay: 1, Grass: 2 }, weapon: "overwhelming power", style: "baseline" },
  { name: "Iga Swiatek",          base: 88, born: 2001, surf: { Hard: 2, Clay: 4, Grass: 1 }, weapon: "heavy topspin and relentless movement", style: "defence" },
  { name: "Coco Gauff",           base: 84, born: 2004, surf: { Hard: 3, Clay: 2, Grass: 2 }, weapon: "lightning speed and a big serve", style: "defence" },
  { name: "Elena Rybakina",       base: 83, born: 1999, surf: { Hard: 3, Clay: 0, Grass: 4 }, weapon: "one of the biggest serves on tour", style: "serve" },
  { name: "Jessica Pegula",       base: 80, born: 1994, surf: { Hard: 3, Clay: 1, Grass: 2 }, weapon: "clean, early ball-striking", style: "baseline" },
  { name: "Jasmine Paolini",      base: 79, born: 1996, surf: { Hard: 1, Clay: 3, Grass: 2 }, weapon: "fearless attacking tennis", style: "allcourt" },
  { name: "Qinwen Zheng",         base: 81, born: 2002, surf: { Hard: 3, Clay: 1, Grass: 1 }, weapon: "a powerful serve and forehand", style: "serve" },
  { name: "Madison Keys",         base: 80, born: 1995, surf: { Hard: 3, Clay: 0, Grass: 2 }, weapon: "thunderous flat hitting", style: "baseline" },
  { name: "Mirra Andreeva",       base: 80, born: 2007, surf: { Hard: 2, Clay: 2, Grass: 2 }, weapon: "precocious all-court maturity", style: "allcourt" },
  { name: "Barbora Krejcikova",   base: 78, born: 1995, surf: { Hard: 1, Clay: 3, Grass: 3 }, weapon: "craft, variety and slice", style: "allcourt" },
];

// COSMETIC ONLY. The real win/loss engine uses SURFACE_WEIGHTS above. These
// display weights are deliberately exaggerated so the three bars look clearly
// different as you draft — making the "am I balanced?" decision feel real even
// though the underlying maths is subtler. Not used in any match calculation.
const DISPLAY_WEIGHTS = {
  Clay:  { serve: 0.2, return: 1.4, forehand: 1.3, backhand: 1.0, net: 0.2, movement: 1.8, defence: 1.9, stamina: 1.8, mental: 1.1, slice: 1.0 },
  Grass: { serve: 2.0, return: 0.5, forehand: 1.0, backhand: 0.7, net: 1.9, movement: 0.9, defence: 0.4, stamina: 0.4, mental: 1.1, slice: 1.6 },
  Hard:  { serve: 1.3, return: 1.2, forehand: 1.2, backhand: 1.1, net: 0.8, movement: 1.0, defence: 1.0, stamina: 1.0, mental: 1.2, slice: 0.7 },
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
// surface threat is the likeliest final. If a rival is supplied and this is
// their specialist surface, they're placed as the SF or Final opponent so the
// player actually meets them deep in the draw. Returns ordered opponents.
function buildDraw(slam, rand, field, drawPool, rival) {
  const withLevel = (arr) =>
    arr.map((p) => ({ ...p, level: p.base + (p.surf?.[slam.surface] ?? 0) }));

  const lower = withLevel(drawPool).sort(() => rand() - 0.5);
  const top = withLevel(field).sort((a, b) => a.level - b.level);

  const draw = [];
  // Rounds 1-3: lower-ranked tour players
  for (let r = 0; r < 3; r++) draw.push(lower[r % lower.length]);
  // Round 4: a strong lower player or a weaker top-10 name
  const r4Pool = [lower[3 % lower.length], top[0], top[1]];
  draw.push(r4Pool[Math.floor(rand() * r4Pool.length)]);
  // QF / SF / Final: the genuine contenders, with a small championship-week
  // boost so the back half plays near peak (kept modest now winProb is steeper).
  const top5 = top.slice(-5);
  const boost = (p, by) => ({ ...p, level: p.level + by });
  draw.push(top5[Math.floor(rand() * 2)]);                 // QF (no boost — easier to reach SF)
  draw.push(top5[2 + Math.floor(rand() * 2)]);             // SF (no boost now — eases reaching the final)
  draw.push(boost(top[top.length - 1], 1));                // Final: surface king

  // Inject the rival deep in the draw on their specialist surface. They become
  // a genuine threat the player must beat to win this major.
  if (rival) {
    const rivalOpp = {
      name: rival.name,
      level: (rival.level ?? 85) + 2,
      weapon: rival.weapon,
      style: rival.style,
      flag: rival.flag,
      isRival: true,
    };
    const isSpecialist = rival.surface === slam.surface;
    // On specialist surface: rival appears in Final 70% or SF 20%.
    // On other surfaces: rival still appears in SF 25% — they're top-10, they reach late rounds.
    const r = rand();
    if (isSpecialist) {
      if (r < 0.70) draw[6] = rivalOpp;
      else if (r < 0.90) draw[5] = rivalOpp;
    } else {
      if (r < 0.25) draw[5] = rivalOpp;
    }
  }
  return draw;
}

// Bundles for each tour, selected at runtime.
const TOURS = {
  atp: { pool: POOL_ATP, field: FIELD_ATP, draw: DRAW_ATP, label: "ATP", sub: "Men's Tour" },
  wta: { pool: POOL_WTA, field: FIELD_WTA, draw: DRAW_WTA, label: "WTA", sub: "Women's Tour" },
};

// --- Sound + Haptics engine --------------------------------------------------
// Sound: Web Audio synthesised entirely in JS — no asset files, works offline.
// The key browser rule: AudioContext must be created (or resumed) INSIDE a user
// gesture handler. We solve this with a one-time "unlock" listener that fires on
// the first pointerdown anywhere in the document, creates the context there and
// then immediately plays a silent buffer — after which the context stays running
// for the session.
//
// Haptics: navigator.vibrate is called for short taps on supporting browsers.
// Chrome on Android supports it; iOS Safari doesn't, but the call is safe.
const Sound = (() => {
  let ctx = null;
  let muted = false;
  let unlocked = false;

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      // Play a silent buffer to fully unlock autoplay policy (esp. iOS Safari)
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
    } catch (e) { ctx = null; unlocked = false; }
  }

  // Wire unlock to the first interaction. iOS Safari is fussy: listen for
  // touchend AND pointerdown AND click, on both document and window, and keep
  // them until one fires (some only unlock on touchend, not pointerdown).
  if (typeof document !== "undefined") {
    const onFirst = () => { unlock(); };
    ["touchend", "pointerdown", "click", "keydown"].forEach(ev => {
      document.addEventListener(ev, onFirst, { once: false, passive: true });
    });
  }

  function ac() {
    if (!ctx) { unlock(); }       // last-ditch attempt to create it
    if (!ctx) return null;
    if (ctx.state === "suspended") { ctx.resume().catch(() => {}); }
    if (ctx.state === "closed") return null;
    return ctx;
  }

  function setMuted(m) { muted = m; }
  function isMuted() { return muted; }

  // A subtle soft click — quiet, short, non-intrusive. Used for all taps/picks.
  function softClick(vol) {
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(440, t);
    o.frequency.exponentialRampToValueAtTime(280, t + 0.04);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + 0.08);
  }

  // Light tap for general buttons — very quiet
  function tap() {
    if (muted) return;
    if (navigator.vibrate) navigator.vibrate(6);
    softClick(0.05);
  }

  // Slightly more present click for confirming a draft pick
  function pick() {
    if (muted) return;
    if (navigator.vibrate) navigator.vibrate(10);
    softClick(0.09);
  }

  // Soft celebratory chime — gentle rising two notes, not a roaring crowd
  function cheer() {
    if (muted) return;
    if (navigator.vibrate) navigator.vibrate([15, 30, 20]);
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    [[523, 0], [784, 0.12]].forEach(([freq, offset]) => {
      const o = c.createOscillator(); const g = c.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(freq, t + offset);
      g.gain.setValueAtTime(0.0001, t + offset);
      g.gain.exponentialRampToValueAtTime(0.11, t + offset + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.4);
      o.connect(g); g.connect(c.destination);
      o.start(t + offset); o.stop(t + offset + 0.42);
    });
  }

  // Subtle low pulse before a championship-deciding match — quiet tension
  function heartbeat() {
    if (muted) return;
    const c = ac(); if (!c) return;
    const t = c.currentTime;
    [0, 0.3].forEach((offset) => {
      const o = c.createOscillator(); const g = c.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(72, t + offset);
      o.frequency.exponentialRampToValueAtTime(48, t + offset + 0.12);
      g.gain.setValueAtTime(0.0001, t + offset);
      g.gain.exponentialRampToValueAtTime(0.12, t + offset + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.16);
      o.connect(g); g.connect(c.destination);
      o.start(t + offset); o.stop(t + offset + 0.18);
    });
  }

  // Keep old aliases so existing call sites still work
  const shot = pick;
  const prime = () => {};  // no longer needed — unlock fires on first touch

  return { tap, pick, shot, cheer, heartbeat, prime, setMuted, isMuted };
})();

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

// Describe how close a match actually was, from the real set scores, so the
// written summary always tallies with the scoreboard. Counts tight sets
// (tie-breaks and 7-5s) and whether it went the distance.
function matchCloseness(sets) {
  const tight = sets.filter(([a, b]) => Math.max(a, b) === 7).length; // 7-6 or 7-5
  const tiebreaks = sets.filter(([a, b]) => Math.min(a, b) === 6 && Math.max(a, b) === 7).length;
  const total = sets.length;
  const distance = total >= 5; // best-of-5 went to a decider
  if (tiebreaks >= 2 || (tight >= 3)) return { word: "an epic", adj: "razor-thin", wentLong: true };
  if (tight >= 2 || (tight >= 1 && distance)) return { word: "a tight", adj: "hard-fought", wentLong: distance };
  if (distance) return { word: "a grinding", adj: "gruelling", wentLong: true };
  const margin = sets.reduce((s, [a, b]) => s + Math.abs(a - b), 0);
  if (margin >= 10) return { word: "a routine", adj: "comfortable", wentLong: false };
  return { word: "a solid", adj: "controlled", wentLong: false };
}

// Parse a "6-4 7-6 6-3" score string back into set pairs.
function parseScore(scoreStr) {
  return (scoreStr || "").split(" ").filter(Boolean).map(s => s.split("-").map(Number));
}
function matchClosenessFromScore(scoreStr) {
  return matchCloseness(parseScore(scoreStr));
}

// Simulate one major: seven rounds against the real draw, each best-of-5 with
// per-set noise. Records the full path with real set scores. `usedReasons` is a
// Set shared across majors so loss explanations never repeat.
function simulateMajor(build, slam, rand, usedReasons, field, drawPool, rival) {
  const draw = buildDraw(slam, rand, field, drawPool, rival);
  const myForm = surfaceScore(build, slam.surface);
  const path = [];

  for (let r = 0; r < ROUNDS.length; r++) {
    const opp = draw[r];
    // average set probability for this match. Noise narrowed (±8 → fewer flukey
    // upsets) so genuine quality wins out more often — the "earned" feel.
    const noise = (rand() - 0.5) * 8;
    const pSet = 1 / (1 + Math.exp(-((myForm + noise - opp.level) / 7)));
    const m = playMatch(pSet, rand);
    const won = m.mySets === 3;
    const close = matchCloseness(m.sets);
    path.push({
      round: ROUNDS[r],
      name: opp.name,
      won,
      isRival: !!opp.isRival,
      score: fmtScore(m.sets),
    });

    if (!won) {
      const press = STYLE_PRESSURE[opp.style] || STYLE_PRESSURE.baseline;
      const exploited = build[press.key] ? build[press.key].rating : 25;
      const options = exploited >= 88 ? press.strong : press.weak(RATING_WORD(exploited));
      // pick a variant not already used this year
      let reason = options.find((o) => !usedReasons.has(o)) || options[0];
      usedReasons.add(reason);
      // Prefix with a closeness phrase drawn from the real scoreline so the
      // narrative always matches the scoreboard.
      const lead = close.wentLong
        ? `In ${close.word} battle that went the distance, `
        : `In ${close.word} contest, `;
      // How close was it? Estimate how many rating points on this surface would
      // have tipped it. The gap between your form and the opponent's level, in
      // surface-score terms, roughly maps to rating points needed. Tie-breaks /
      // deciders mean you were a hair away.
      const formGap = opp.level - myForm; // positive = you were behind
      const pointsNeeded = Math.max(2, Math.min(12, Math.round((formGap + 2) + (close.wentLong ? -3 : 2))));
      const nearMiss = close.wentLong || formGap <= 4;
      return {
        wonTitle: false,
        lostRound: ROUNDS[r],
        opponent: opp.name,
        weapon: opp.weapon,
        setScore: fmtScore(m.sets),
        reason: lead + reason,
        closeness: close,
        lostToRival: !!opp.isRival,
        nearMiss,
        pointsNeeded,
        oppWeapon: opp.weapon,
        oppStyle: opp.style,
        path,
      };
    }
  }
  // Win note should reflect how the final actually went.
  const note = path[6] && matchClosenessFromScore(path[6].score).wentLong
    ? "came through an epic final to seal it"
    : WIN_NOTES[Math.floor(rand() * WIN_NOTES.length)];
  return {
    wonTitle: true,
    finalOpp: draw[6].name,
    finalScore: path[6].score,
    beatRival: !!draw[6].isRival,
    note,
    path,
  };
}

// Court zone each attribute maps to, for the live diagram.
// zones: serve box, baseline (deep), mid-court, net, full-court (movement/fitness).
const ATTR_ZONE = {
  serve: "serve", return: "baseline", forehand: "baselineR", backhand: "baselineL",
  net: "net", movement: "court", defence: "deep", stamina: "court",
  mental: "whole", slice: "mid",
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
      // empty slot counts as a severe gap (rating 28) and can be the weak link
      num += 28 * w[a.key];
      if (w[a.key] >= 1.0) weakest = Math.min(weakest, 28);
      continue;
    }
    num += v.rating * w[a.key];
    if (w[a.key] >= 1.1) weakest = Math.min(weakest, v.rating);
  }
  const avg = num / fullDen;
  // Pull the average toward the weakest surface-critical shot. A heavier pull
  // (0.35) means one soft pick in a key attribute drags a surface down hard —
  // so an all-rounder of genuine 90s is rewarded, a lopsided build is not.
  return avg * 0.65 + weakest * 0.35;
}

// Convert a surface score into a win probability for that major. Tuned for an
// "earned" feel: the curve is steep and centred at 86, so a genuinely elite,
// balanced build (high 80s/90s across the surface-critical shots) clears 50%
// comfortably and wins often, while a merely-good build fades fast. ~86 is a
// coin-flip; 90+ is a strong favourite; below ~80 you rarely survive the field.
function winProb(score) {
  const x = (score - 86) / 5.5;
  const p = 1 / (1 + Math.exp(-x * 2.9));
  return Math.max(0.004, Math.min(0.99, p));
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
  slice:    { zones: ["midCourt", "netZone"], surfaceHint: "Grass" },
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
  const [showBuild, setShowBuild] = useState(false);
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

  // Build the 1080×1080 share canvas from current results.
  function buildShareCanvas() {
    const canvas = document.createElement("canvas");
    canvas.width = 1080; canvas.height = 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // Background
    ctx.fillStyle = "#1f6b3f";
    ctx.fillRect(0, 0, 1080, 1080);
    // Mowing stripes
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,.03)" : "rgba(0,0,0,.03)";
      ctx.fillRect(0, i * 90, 1080, 90);
    }
    // Header wordmark — measure CALENDAR so SLAM sits right after it, no gap.
    ctx.textAlign = "left";
    ctx.fillStyle = "#f6fbef";
    ctx.font = "bold 48px 'Arial Narrow', Arial, sans-serif";
    ctx.fillText("CALENDAR", 80, 100);
    const calW = ctx.measureText("CALENDAR").width;
    ctx.fillStyle = "#d8f000";
    ctx.font = "italic bold 50px 'Arial Narrow', Arial, sans-serif";
    ctx.fillText("SLAM", 80 + calW + 12, 100);
    // Tour
    ctx.fillStyle = "rgba(246,251,239,.5)";
    ctx.font = "24px 'Arial Narrow', Arial, sans-serif";
    ctx.fillText(tourLabel.toUpperCase() + " TOUR", 80, 148);
    // Result headline
    const headline = active.won === 4 ? "CALENDAR SLAM 🎾" :
      active.won > 0 ? `${active.won} SLAM${active.won > 1 ? "S" : ""}` : "NO TITLES";
    const scoreCol = active.won === 4 ? "#d8f000" : "#f6fbef";
    ctx.fillStyle = scoreCol;
    ctx.font = `bold ${active.won === 4 ? 84 : 72}px 'Arial Narrow', Arial, sans-serif`;
    ctx.fillText(headline, 80, 252);
    // Slam breakdown — slightly tighter so the build has room below
    const SLAM_COLS = { ao: "#2b7de9", rg: "#e07a3f", wim: "#5a2d82", uso: "#0e3f80" };
    let y = 320;
    (active.perSlam || []).filter(s => !s.isOlympics).forEach(s => {
      ctx.fillStyle = SLAM_COLS[s.key] || "#555";
      ctx.fillRect(80, y, 920, 72);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 27px 'Arial Narrow', Arial, sans-serif";
      ctx.fillText(s.name, 100, y + 29);
      const result = ranSim
        ? (s.wonTitle ? `🏆 Champion · def. ${s.finalOpp} ${s.finalScore}` : `❌ Out ${s.lostRound}`)
        : (s.win ? "🏆 Projected win" : `${s.prob}% chance`);
      ctx.font = "21px 'Arial Narrow', Arial, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,.85)";
      ctx.fillText(result, 100, y + 56);
      y += 86;
    });

    // Build summary — two columns of 5, each: attribute · rating · player.
    y += 10;
    ctx.fillStyle = "#d8f000";
    ctx.font = "bold 24px 'Arial Narrow', Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("YOUR BUILD", 80, y + 20);
    y += 36;
    const colW = 470;
    const cols = [80, 80 + colW + 20];
    const rowH = 38;
    ATTRS.forEach((a, i) => {
      const b = build[a.key];
      const colX = cols[i < 5 ? 0 : 1];
      const rowY = y + (i % 5) * rowH;
      // Attribute label
      ctx.fillStyle = "rgba(246,251,239,.9)";
      ctx.font = "bold 21px 'Arial Narrow', Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(a.label, colX, rowY + 15);
      // Rating
      ctx.fillStyle = b ? "#d8f000" : "rgba(246,251,239,.3)";
      ctx.font = "bold 22px 'Arial Narrow', Arial, sans-serif";
      ctx.fillText(b ? String(b.rating) : "—", colX + 175, rowY + 15);
      // Player it came from
      if (b && b.player) {
        ctx.fillStyle = "rgba(246,251,239,.55)";
        ctx.font = "18px 'Arial Narrow', Arial, sans-serif";
        const nm = b.player.length > 16 ? b.player.slice(0, 15) + "…" : b.player;
        ctx.fillText(`${b.flag || ""} ${nm}`, colX + 230, rowY + 15);
      }
    });
    y += 5 * rowH;

    // Footer — clear of the build now
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(246,251,239,.4)";
    ctx.font = "20px 'Arial Narrow', Arial, sans-serif";
    ctx.fillText("calendarslam.com", 80, Math.min(1058, y + 30));
    return canvas;
  }

  // Download or share the canvas image.
  async function downloadImage() {
    setDownloading(true);
    try {
      const canvas = await buildShareCanvas();
      if (!canvas) { setDownloading(false); return; }
      // Try Web Share API first (saves to camera roll on iOS/Android)
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], 'calendar-slam.png', { type: 'image/png' })] })) {
        await navigator.share({
          files: [new File([blob], 'calendar-slam.png', { type: 'image/png' })],
          title: 'Calendar Slam',
        });
      } else {
        // Fallback: regular download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'calendar-slam.png'; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
    } catch (e) {
      console.error('share/download failed', e);
    }
    setDownloading(false);
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

        <button className="cs-share-build-toggle" onClick={() => setShowBuild(v => !v)}>
          {showBuild ? "Hide build ▴" : "Show your build ▾"}
        </button>
        {showBuild && (
          <div className="cs-share-build">
            {ATTRS.map((a) => (
              <div key={a.key} className="cs-share-build-row">
                <span className="cs-share-build-attr">{a.label}</span>
                <span className="cs-share-build-val">
                  {build[a.key]
                    ? <>{build[a.key].flag} {build[a.key].player} · <strong>{build[a.key].rating}</strong></>
                    : "— empty —"}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="cs-share-actions">
          <button className="cs-cta cs-share-copy" onClick={copy}>
            {copied ? "Copied ✓" : "Copy text"}
          </button>
          <button className="cs-cta cs-share-img" onClick={downloadImage} disabled={downloading}>
            {downloading ? "…" : "📸 Save image"}
          </button>
        </div>
        <pre className="cs-share-preview">{shareText}</pre>
        <button className="cs-share-done" onClick={onClose}>← Back to results</button>
      </div>
    </div>
  );
}

// ============================================================================
// CAREER SHARE CARD — shareable summary of a whole career at retirement
// ============================================================================
function CareerShareCard({ playerName, playerFlag, tourLabel, careerSlamCount, careerSeasons, careerAge, careerRival, build, onClose }) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const olympicGolds = careerSeasons.filter(s => s.olympics?.medal?.includes("Gold")).length;
  const tier = careerSlamCount >= 10 ? "ALL-TIME GREAT" :
               careerSlamCount >= 5  ? "LEGENDARY CHAMPION" :
               careerSlamCount >= 2  ? "GRAND SLAM CHAMPION" :
               careerSlamCount === 1 ? "GRAND SLAM WINNER" : "TOUR PROFESSIONAL";
  // Slam wins by major
  const slamsByType = {};
  careerSeasons.forEach(s => (s.results || []).filter(r => !r.isOlympics && r.wonTitle).forEach(r => {
    slamsByType[r.name] = (slamsByType[r.name] || 0) + 1;
  }));

  const shareText =
    `${playerFlag} ${playerName} — ${tier}\n${careerSlamCount} Grand Slam title${careerSlamCount!==1?"s":""}${olympicGolds?` · ${olympicGolds} Olympic gold${olympicGolds>1?"s":""}`:""}\n${careerSeasons.length} seasons on the ${tourLabel} tour\nplay: calendarslam.com`;

  function copy() {
    try { navigator.clipboard.writeText(shareText); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch (e) { setCopied(false); }
  }

  function buildCareerCanvas() {
    const canvas = document.createElement("canvas");
    canvas.width = 1080; canvas.height = 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#1f6b3f"; ctx.fillRect(0, 0, 1080, 1080);
    for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,.03)" : "rgba(0,0,0,.03)"; ctx.fillRect(0, i * 90, 1080, 90); }
    ctx.textAlign = "left";
    // Wordmark
    ctx.fillStyle = "#f6fbef"; ctx.font = "bold 44px 'Arial Narrow', Arial, sans-serif";
    ctx.fillText("CALENDAR", 80, 92);
    const calW = ctx.measureText("CALENDAR").width;
    ctx.fillStyle = "#d8f000"; ctx.font = "italic bold 46px 'Arial Narrow', Arial, sans-serif";
    ctx.fillText("SLAM", 80 + calW + 12, 92);
    ctx.fillStyle = "rgba(246,251,239,.5)"; ctx.font = "22px 'Arial Narrow', Arial, sans-serif";
    ctx.fillText("CAREER RETROSPECTIVE", 80, 132);
    // Player name + flag
    ctx.fillStyle = "#f6fbef"; ctx.font = "bold 72px 'Arial Narrow', Arial, sans-serif";
    ctx.fillText(`${playerFlag} ${playerName}`, 80, 230);
    // Tier
    ctx.fillStyle = "#d8f000"; ctx.font = "bold 40px 'Arial Narrow', Arial, sans-serif";
    ctx.fillText(tier, 80, 290);
    // Big stats
    let y = 380;
    const bigStat = (label, val, color) => {
      ctx.fillStyle = color || "#f6fbef"; ctx.font = "bold 84px 'Arial Narrow', Arial, sans-serif";
      ctx.fillText(String(val), 80, y);
      ctx.fillStyle = "rgba(246,251,239,.6)"; ctx.font = "26px 'Arial Narrow', Arial, sans-serif";
      ctx.fillText(label, 230, y - 12);
      y += 96;
    };
    bigStat("Grand Slam titles", careerSlamCount, "#d8f000");
    if (olympicGolds) bigStat("Olympic gold medals", olympicGolds, "#ffd24a");
    bigStat("Seasons on tour", careerSeasons.length);
    // Slam breakdown
    y += 10;
    ctx.fillStyle = "#d8f000"; ctx.font = "bold 24px 'Arial Narrow', Arial, sans-serif";
    ctx.fillText("TITLES BY MAJOR", 80, y); y += 40;
    const majors = ["Australian Open", "Roland Garros", "Wimbledon", "US Open"];
    majors.forEach(m => {
      ctx.fillStyle = "rgba(246,251,239,.85)"; ctx.font = "22px 'Arial Narrow', Arial, sans-serif";
      ctx.fillText(m, 80, y);
      ctx.fillStyle = "#d8f000"; ctx.font = "bold 24px 'Arial Narrow', Arial, sans-serif";
      ctx.fillText(`× ${slamsByType[m] || 0}`, 500, y);
      y += 36;
    });
    if (careerRival) {
      y += 16;
      ctx.fillStyle = "rgba(246,251,239,.7)"; ctx.font = "italic 22px 'Arial Narrow', Arial, sans-serif";
      ctx.fillText(`Career rival: ${careerRival.flag} ${careerRival.name} (${careerRival.slamCount} slams)`, 80, y);
    }
    ctx.fillStyle = "rgba(246,251,239,.4)"; ctx.font = "20px 'Arial Narrow', Arial, sans-serif";
    ctx.fillText("calendarslam.com", 80, 1052);
    return canvas;
  }

  async function downloadImage() {
    setDownloading(true);
    try {
      const canvas = buildCareerCanvas();
      if (!canvas) { setDownloading(false); return; }
      const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], "career.png", { type: "image/png" })] })) {
        await navigator.share({ files: [new File([blob], "calendar-slam-career.png", { type: "image/png" })], title: "Calendar Slam" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "calendar-slam-career.png"; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
    } catch (e) { /* ignore */ }
    setDownloading(false);
  }

  return (
    <div className="cs-modal" onClick={onClose}>
      <div className="cs-card-share" onClick={(e) => e.stopPropagation()}>
        <button className="cs-modal-x" onClick={onClose} aria-label="Close">×</button>
        <div className="cs-share-brand">CALENDAR SLAM</div>
        <div className="cs-share-headline">{playerFlag} {playerName}</div>
        <div className="cs-career-share-tier">{tier}</div>
        <div className="cs-career-share-stats">
          <div className="cs-career-share-stat"><span className="cs-css-num">{careerSlamCount}</span><span className="cs-css-lbl">Grand Slams</span></div>
          {olympicGolds > 0 && <div className="cs-career-share-stat"><span className="cs-css-num">{olympicGolds}</span><span className="cs-css-lbl">Olympic golds</span></div>}
          <div className="cs-career-share-stat"><span className="cs-css-num">{careerSeasons.length}</span><span className="cs-css-lbl">Seasons</span></div>
        </div>
        <div className="cs-share-actions">
          <button className="cs-cta cs-share-copy" onClick={copy}>{copied ? "Copied ✓" : "Copy text"}</button>
          <button className="cs-cta cs-share-img" onClick={downloadImage} disabled={downloading}>{downloading ? "…" : "📸 Save image"}</button>
        </div>
        <pre className="cs-share-preview">{shareText}</pre>
        <button className="cs-share-done" onClick={onClose}>← Back</button>
      </div>
    </div>
  );
}

// ============================================================================


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
  // Olympic field is real top-tier: QF/SF/Final climb toward slam-final level,
  // so gold is earned, not automatic.
  const opponents = [84, 88, 92]; // QF, SF, Final strength
  let survived = true;
  let roundsWon = 0;
  for (const oppLevel of opponents) {
    let mySets = 0, oppSets = 0;
    // Best of 3
    while (mySets < 2 && oppSets < 2) {
      const noise = (rand() - 0.5) * 10;
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
    // Lost in SF — bronze medal match (best of 3, slightly easier opponent)
    const bronzeOpp = 85;
    let ms = 0, os = 0;
    while (ms < 2 && os < 2) {
      const noise = (rand() - 0.5) * 10;
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
  "🇪🇸": { country: "Spain",       first: ["Pablo","Jorge","Javier","Alejandro","Sergio","Diego","Adrián","Ismael"], last: ["Garcia","Lopez","Martinez","Romero","Navarro","Molina","Castillo","Reyes"] },
  "🇮🇹": { country: "Italy",       first: ["Marco","Federico","Giovanni","Andrea","Filippo","Davide","Riccardo","Simone"], last: ["Rossi","Ricci","Conti","Esposito","Gallo","Moretti","Greco","Bruno"] },
  "🇩🇪": { country: "Germany",     first: ["Lukas","Niklas","Jonas","Julian","Maximilian","Florian","Fabian","Tobias"], last: ["Schmidt","Weber","Hoffmann","Wagner","Fischer","Braun","Krause","Werner"] },
  "🇷🇺": { country: "Russia",      first: ["Dmitri","Pavel","Alexei","Nikolai","Viktor","Roman","Maxim","Anton"], last: ["Ivanov","Sokolov","Lebedev","Romanov","Egorov","Fedorov","Orlov","Belov"] },
  "🇫🇷": { country: "France",      first: ["Théo","Antoine","Mathieu","Pierre","Romain","Clément","Maxime","Adrien"], last: ["Dubois","Laurent","Leroy","Moreau","Girard","Lefebvre","Mercier","Faure"] },
  "🇦🇷": { country: "Argentina",   first: ["Franco","Matías","Santiago","Leandro","Rodrigo","Ezequiel","Joaquín","Bautista"], last: ["Gimenez","Sosa","Acosta","Medina","Vega","Ortiz","Rios","Aguirre"] },
  "🇧🇷": { country: "Brazil",      first: ["Thiago","Felipe","Bruno","Gabriel","Eduardo","Rafael","Caio","Vinicius"], last: ["Souza","Almeida","Barbosa","Cardoso","Rocha","Ribeiro","Carvalho","Mendes"] },
  "🇺🇸": { country: "USA",         first: ["Tyler","Jordan","Austin","Brandon","Kevin","Dylan","Cole","Trevor"], last: ["Johnson","Brooks","Hayes","Parker","Mitchell","Bennett","Reed","Coleman"] },
  "🇬🇧": { country: "Great Britain",first: ["Oliver","Harry","Charlie","George","Ethan","Archie","Freddie","Toby"], last: ["Hughes","Walker","Turner","Hall","Ward","Cooper","Gray","Holt"] },
  "🇦🇺": { country: "Australia",   first: ["Mason","Riley","Kyle","Cooper","Lachlan","Hayden","Brodie","Flynn"], last: ["Hayes","Carter","Mills","Lawson","Dixon","Reid","Fletcher","Brennan"] },
  "🇨🇿": { country: "Czech Rep.",  first: ["Petr","Pavel","Michal","Ondrej","Vojtech","Radek","Lukas","Marek"], last: ["Dvorak","Cerny","Horak","Kral","Benes","Marek","Kucera","Vesely"] },
  "🇷🇸": { country: "Serbia",      first: ["Stefan","Filip","Nikola","Marko","Milan","Igor","Vuk","Lazar"], last: ["Milic","Markovic","Simic","Ilic","Lukic","Pavlovic","Savic","Tomic"] },
  "🇨🇦": { country: "Canada",      first: ["Logan","Owen","Mason","Carter","Liam","Nathan","Evan","Cole"], last: ["Roy","Tremblay","Gagnon","Bouchard","Lapointe","Cote","Belanger","Caron"] },
  "🇯🇵": { country: "Japan",       first: ["Sho","Ryota","Hiroki","Yuto","Ryu","Daiki","Sota","Haruto"], last: ["Yamada","Kobayashi","Kato","Yoshida","Yamamoto","Inoue","Mori","Hayashi"] },
  "🇵🇱": { country: "Poland",      first: ["Piotr","Marek","Kamil","Michal","Tomasz","Bartosz","Mateusz","Pawel"], last: ["Kowalski","Wojcik","Kaminski","Zielinski","Szymanski","Mazur","Krawczyk","Pawlak"] },
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
  { id: "serve_coach",   label: "Hire a Serve Coach",           desc: "Refine your toss and kick serve with a specialist.",      effects: { serve: 4 } },
  { id: "fitness",       label: "Intensive Fitness Programme",  desc: "Pushing your body hard. It will pay off.",               effects: { stamina: 3, movement: 2 } },
  { id: "nutritionist",  label: "Elite Nutritionist",           desc: "Precision fuelling to stay sharp deep into the year.",   effects: { stamina: 2 } },
  { id: "mental_coach",  label: "Sports Psychologist",          desc: "Learn to thrive under pressure on the big points.",      effects: { mental: 4 } },
  { id: "fh_coach",      label: "Forehand Specialist",          desc: "Rebuild your forehand from the ground up.",              effects: { forehand: 4 } },
  { id: "bh_coach",      label: "Backhand Specialist",          desc: "Work on disguise, slice, and two-handed drive.",         effects: { backhand: 4 } },
  { id: "net_coach",     label: "Net Game Coach",               desc: "Volley clinic and approach shot drills.",                effects: { net: 4 } },
  { id: "return_coach",  label: "Return of Serve Coach",        desc: "Early ball, aggressive positioning.",                    effects: { return: 3, movement: 1 } },
  { id: "movement",      label: "Movement & Footwork Trainer",  desc: "Court coverage, split step timing, lateral speed.",      effects: { movement: 3, defence: 2 } },
  { id: "defence",       label: "Defensive Grinding Specialist",desc: "Learn to reset points and outlast opponents.",           effects: { defence: 3, stamina: 2 } },
  { id: "rest",          label: "Rest & Recovery Season",       desc: "No stat gains. The body will thank you later.",         effects: {}, recovery: true },
  { id: "slice_clinic",  label: "Slice Clinic",                 desc: "Master the low skidder on grass and clay.",             effects: { slice: 5 } },
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
  return {
    ...rival, ...styles[weakestSurf],
    slamCount: 0, h2hWins: 0, h2hLosses: 0,
    weakSurf: weakestSurf,   // the surface they specialise in (your weakest)
    level: 86,               // base field-level strength
  };
}

// --- Age decay curve ---------------------------------------------------------
// Returns attribute reductions per season based on age. Tuned so a career
// naturally winds down by the mid-30s: peak to ~27, gentle decline to 30,
// real erosion from 31, steep past 33.
function ageDecay(age) {
  const adjustedAge = age;
  if (adjustedAge <= 24) return {};
  if (adjustedAge <= 26) return { stamina: -1 };
  if (adjustedAge <= 28) return { stamina: -2, movement: -1 };
  if (adjustedAge <= 30) return { stamina: -2, movement: -2, defence: -1, serve: -1 };
  if (adjustedAge <= 32) return { stamina: -3, movement: -2, defence: -2, serve: -1, forehand: -1 };
  if (adjustedAge <= 34) return { stamina: -3, movement: -3, defence: -2, serve: -2, forehand: -1, backhand: -1, mental: -1 };
  return { stamina: -4, movement: -3, defence: -3, serve: -2, forehand: -2, backhand: -2, mental: -1 };
}

// Injury risk rises with age and heavy training history.
function injuryRisk(age, longevity, heavyTrainingSeason) {
  const base = Math.max(0, (age - 24) * 0.04);
  const decay = longevity < 0 ? 0.1 * Math.abs(longevity) : 0;
  const fatigue = heavyTrainingSeason ? 0.12 : 0;
  return Math.min(0.55, base + decay + fatigue);
}

// Retirement logic. Forced at 35 (career naturally winds down by mid-30s).
// Earlier, we prompt when the build can no longer realistically win a major —
// i.e. the player's best surface win probability has fallen below a threshold
// for two straight seasons.
const RETIRE_AGE = 35;
const SLAM_HOPE_THRESHOLD = 0.12; // best-surface winProb below this = unlikely to win again
function bestSurfaceWinProb(build) {
  return Math.max(...["Clay","Grass","Hard"].map(s => winProb(surfaceScore(build, s))));
}
function shouldRetire(stats, consecutiveLowSeasons, age) {
  if (age >= RETIRE_AGE) return true;
  // No realistic slam hope for two consecutive seasons.
  return bestSurfaceWinProb(stats) < SLAM_HOPE_THRESHOLD && consecutiveLowSeasons >= 2;
}
// True when the build almost certainly can't win another major — used to surface
// a clear "your slam-winning days are behind you" retirement suggestion.
function slamHopeGone(build) {
  return bestSurfaceWinProb(build) < SLAM_HOPE_THRESHOLD;
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

  // Identify the build's single weakest surface-critical attribute, so we can
  // GUARANTEE at least one offered upgrade addresses it. This stops the off-season
  // feeling pointless when the random draw never offers what you actually need.
  let targetUpgrade = null;
  if (currentBuild) {
    // Find weakest surface, then its weakest high-weight attribute.
    const surfScore = (surf) => {
      const w = SURFACE_WEIGHTS[surf]; let num = 0, den = 0;
      for (const a of ATTRS) { den += w[a.key]; num += (currentBuild[a.key]?.rating ?? 0) * w[a.key]; }
      return num / den;
    };
    const weakestSurf = ["Clay","Grass","Hard"].sort((a,b) => surfScore(a) - surfScore(b))[0];
    const w = SURFACE_WEIGHTS[weakestSurf];
    let worstKey = null, worstVal = 999;
    for (const a of ATTRS) {
      const v = currentBuild[a.key]?.rating ?? 0;
      if (w[a.key] >= 1.0 && v < worstVal && v < NEAR_CAP) { worstVal = v; worstKey = a.key; }
    }
    // Find an upgrade whose main positive effect boosts that attribute.
    if (worstKey) {
      const candidates = UPGRADE_POOL.filter(u => (u.effects[worstKey] ?? 0) > 0);
      if (candidates.length) targetUpgrade = candidates[Math.floor(rng() * candidates.length)];
    }
  }

  // Use full pool as fallback if filtering left too few options
  const pool = [...(useful.length >= 3 ? useful : UPGRADE_POOL)];
  const chosen = [];

  // Seed the guaranteed weakness-targeting upgrade first.
  if (targetUpgrade) {
    const idx = pool.findIndex(u => u.id === targetUpgrade.id);
    if (idx >= 0) pool.splice(idx, 1);
    chosen.push(targetUpgrade);
  }

  while (chosen.length < 3 && pool.length > 0) {
    const i = Math.floor(rng() * pool.length);
    const u = pool.splice(i, 1)[0];
    if (chosen.some(c => c.id === u.id)) continue;
    chosen.push(u);
  }

  // Trim advertised effects to realistic headroom, for every chosen upgrade.
  return chosen.map(u => {
    if (!currentBuild) return u;
    const trimmedEffects = {};
    for (const [k, v] of Object.entries(u.effects)) {
      if (v > 0) {
        const cur = currentBuild[k]?.rating ?? 0;
        const actual = Math.min(v, CAP - cur);
        if (actual > 0) trimmedEffects[k] = actual;
      } else {
        trimmedEffects[k] = v;
      }
    }
    return { ...u, effects: trimmedEffects };
  });
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

// Simulate the rival's own slam haul for a season. They're a surface specialist
// who seriously contends mainly on their home surface. `playerWonOnRival` is how
// many slams the player won by beating the rival in the final this season — those
// can't also be rival titles. Net ~0.4–0.6 slams/season at peak.
function rivalSeason(rival, year, rng, playerBeatRivalCount = 0) {
  if (!rival) return 0;
  let wins = 0;
  for (const slam of SLAMS) {
    const isHomeSlam = slam.surface === rival.weakSurf;
    const baseChance = isHomeSlam ? 0.30 : 0.06;
    // Rival peaks around years 4-9 of your career (same generation, slightly
    // later bloom), so they don't dominate early or linger forever.
    const peak = Math.max(0, 1 - Math.abs(year - 6) * 0.09);
    if (rng() < baseChance * (0.5 + peak * 0.8)) wins++;
  }
  // Don't double-count: if the player beat the rival in a final, the rival
  // didn't win that one.
  return Math.max(0, wins - playerBeatRivalCount);
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
  const [showCareerCard, setShowCareerCard] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [previewKey, setPreviewKey] = useState(null);
  const [reveal, setReveal] = useState({ slam: 0, round: 0, done: false, scoreShown: true });
  const [difficulty, setDifficulty] = useState("normal");
  const [eliteUsed, setEliteUsed] = useState(false);
  const [playerSkipUsed, setPlayerSkipUsed] = useState(false);
  const [nameRolling, setNameRolling] = useState(false);
  const [trophyDetail, setTrophyDetail] = useState(null);
  const [soundOn, setSoundOn] = useState(true);

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

  // Persistent player record (saved across sessions via the artifact storage API).
  // Tracks lifetime stats so the game has a progression / streak layer.
  const [playerStats, setPlayerStats] = useState({
    seasonsPlayed: 0,
    slamsWon: 0,
    calendarSlams: 0,
    bestTier: null,
    currentStreak: 0,   // consecutive seasons winning ≥1 slam
    bestStreak: 0,
    careersCompleted: 0,
    loaded: false,
  });
  const statsRecorded = React.useRef(false); // guard so we only record a result once

  // Load saved stats on mount (localStorage — persists on the live site).
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = window.localStorage.getItem("cs_player_stats");
        if (raw) {
          const saved = JSON.parse(raw);
          setPlayerStats({ ...saved, loaded: true });
          return;
        }
      }
    } catch (e) { /* no saved stats yet / storage blocked */ }
    setPlayerStats(s => ({ ...s, loaded: true }));
  }, []);

  // Persist stats whenever they change (after initial load).
  function saveStats(next) {
    setPlayerStats(next);
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem("cs_player_stats", JSON.stringify(next));
      }
    } catch (e) { /* storage unavailable */ }
  }

  const T = TOURS[tour];
  const POOL = T.pool;

  // Career: derive a unique RNG from season number for off-season events.
  const careerRng = useMemo(() => mulberry32(careerSeason * 7919 + 42), [careerSeason]);

  // Career: generate a player identity (called on player-create screen).
  function generatePlayerIdentity() {
    const rng = mulberry32((Date.now() & 0xffffffff) ^ Math.floor(Math.random() * 1e9));
    const final = generatePlayer(rng);
    if (reduce) {
      setPlayerName(final.name); setPlayerFlag(final.flag);
      return;
    }
    // Roll through a handful of random names, then settle on the final one.
    setNameRolling(true);
    let ticks = 0;
    const iv = setInterval(() => {
      const r = mulberry32((Date.now() & 0xffffffff) ^ (ticks * 2654435761));
      const p = generatePlayer(r);
      setPlayerName(p.name); setPlayerFlag(p.flag);
      ticks++;
      if (ticks > 11) {
        clearInterval(iv);
        setPlayerName(final.name); setPlayerFlag(final.flag);
        setNameRolling(false);
      }
    }, 70);
  }

  // Auto-generate on mount when arriving at player-create screen.
  useEffect(() => {
    if (phase === "player-create" && playerNameMode === "generate" && !playerName) {
      generatePlayerIdentity();
    }
  }, [phase]);

  // Career: start a brand-new career.
  function startCareer() {
    // Use whatever the generator/user already set. Only fall back to generating
    // a new name if both are genuinely empty (shouldn't happen in practice).
    let name = playerName.trim();
    let flag = playerFlag;
    if (!name) {
      const rng = mulberry32((Date.now() & 0xffffffff) ^ 0xdeadbeef);
      const p = generatePlayer(rng);
      name = p.name; flag = p.flag;
      setPlayerName(name); setPlayerFlag(flag);
    }
    setCareerSeason(1);
    setCareerAge(20);
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
    setPlayerSkipUsed(false);
    setGenerationalPlayers([]);
    setPressPhase(false);
    setSeasonSummary(null);
    setChosenQuote(null);
    setShowRivalModal(false);
    // Go straight to draft — no intro screen for career mode.
    setPhase("draft");
    spinNext([], false);
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
    // The rival emerges a couple of seasons in (end of season 2 → active from
    // season 3), so they're an established same-generation force, not there from
    // day one. Name is freshly random each career.
    let activeRival = careerRival;
    if (!activeRival && gameMode === "career" && careerSeason >= 2) {
      const rivalRng = mulberry32(((Date.now() & 0xffffffff) ^ (careerSeason * 2654435761)) >>> 0);
      activeRival = generateRival(build, tour, rivalRng);
      setCareerRival(activeRival);
      setShowRivalModal(true); // trigger newspaper intro
    }

    // Count this season's head-to-heads from the actual sim paths.
    const playerBeatRival = activeRival ? slamResults.filter(r =>
      !r.isOlympics && r.wonTitle && r.beatRival).length : 0;
    const playerLostToRival = activeRival ? slamResults.filter(r =>
      !r.isOlympics && !r.wonTitle && r.lostToRival).length : 0;

    // Track rival's own slam haul (excluding any the player took off them).
    const rivalRng2 = mulberry32(((Date.now() & 0xffffffff) ^ (careerSeason * 40503 + 99)) >>> 0);
    const rivalWins = rivalSeason(activeRival, careerSeason, rivalRng2, playerBeatRival);
    const updatedRival = activeRival ? {
      ...activeRival,
      slamCount: activeRival.slamCount + rivalWins,
      h2hLosses: activeRival.h2hLosses + playerBeatRival,   // rival's losses to you
      h2hWins: activeRival.h2hWins + playerLostToRival,     // rival's wins over you
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

    // Check for fading slam hope across consecutive seasons → retirement prompt.
    const isLow = slamHopeGone(build);
    const newLow = isLow ? consecutiveLowSeasons + 1 : 0;
    setConsecutiveLowSeasons(newLow);
    const nextAge = careerAge + 1;
    // Force retirement at the age cap, or prompt when slam hope has gone.
    if (nextAge >= RETIRE_AGE || shouldRetire(build, newLow, nextAge)) {
      setRetirementPrompt(true);
    }

    // Generate off-season options (pass build so stat-capped options are filtered out)
    const upgradeRng = mulberry32((careerSeason * 54321) & 0xffffffff);
    const upgrades = pickUpgrades(upgradeRng, build);

    // Roll for injury
    const risk = injuryRisk(careerAge, heavyTrainingLastSeason);
    const injuryRng = mulberry32((careerSeason * 11111 + 7) & 0xffffffff);
    let injury = null;
    if (injuryRng() < risk) {
      injury = INJURIES[Math.floor(injuryRng() * INJURIES.length)];
    }

    setOffseasonUpgrades(upgrades);
    setOffseasonInjury(injury);
    setOffseasonPendingBuild(build);

    // Generate the season report with one bespoke quote baked straight in
    // (no separate picker screen). The quote is chosen from this season's story.
    const oRes = olympicsEvent ? { medal: olympicsEvent.medal, wonGold: olympicsEvent.wonTitle, city: olympicsEvent.olympicsData?.city } : null;
    const quotes = generatePressQuotes(wonThisSeason, updatedRival || activeRival, careerAge, slamResults, oRes, newTotal);
    const bakedQuote = quotes[0];
    const report = generateSeasonReport(careerSeason, careerAge, slamResults, wonThisSeason, newTotal, updatedRival || activeRival, bakedQuote, oRes);
    setSeasonSummary({ ...report });

    // Spawn fictional next-gen players. Seed 3 from season 1, then add 1–2 every
    // season so the tour visibly turns over and gen players reach the draw fast.
    if (careerSeason === 1) {
      const seedRng = mulberry32(((Date.now() & 0xffffffff) ^ 11113) >>> 0);
      const seedPlayers = [1, 2, 3].map(() => spawnGenerationalPlayer(1, seedRng));
      setGenerationalPlayers(seedPlayers);
    } else {
      const spawnRng = mulberry32(((Date.now() & 0xffffffff) ^ (careerSeason * 88887)) >>> 0);
      // Always add at least one new player each season; sometimes two.
      const count = spawnRng() < 0.5 ? 2 : 1;
      const fresh = Array.from({ length: count }, () => spawnGenerationalPlayer(careerSeason, spawnRng));
      setGenerationalPlayers(prev => [...prev, ...fresh]);
    }

    // Straight to the off-season — no separate press-quote picker.
    setPressPhase(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setPhase("offseason");
  }

  // Career: apply an upgrade choice and move to next season.
  function applyUpgrade(upgrade) {
    let nextBuild = applyEffects(offseasonPendingBuild, upgrade.effects);
    // Apply injury if present
    if (offseasonInjury) nextBuild = applyEffects(nextBuild, offseasonInjury.effects);
    // Apply age decay
    const decay = ageDecay(careerAge + 1);
    nextBuild = applyDecay(nextBuild, decay);

    setHeavyTrainingLastSeason(upgrade.id === "fitness");
    setBuild(nextBuild);
    setCareerSeason(s => s + 1);
    setCareerAge(a => a + 1);
    setRanSim(false);
    setReveal({ slam: 0, round: 0, done: false, scoreShown: false });
    setEliteUsed(false);
    setRound(0);
    setRetirementPrompt(false);
    setUpgradeArmed(null);
    setPressPhase(false);
    // Go straight to result screen (which shows "Begin season X") —
    // no new draft needed, the build carries over with the upgrade applied.
    setPhase("result");
  }

  // Inject a tennis-ball favicon. We render it to a PNG via canvas because PNG
  // data-URIs are far more reliable than SVG ones across browsers — especially
  // on mobile, where SVG favicons often silently fail.
  useEffect(() => {
    try {
      const size = 64;
      const cv = document.createElement("canvas");
      cv.width = size; cv.height = size;
      const x = cv.getContext("2d");
      if (!x) return;
      const c = size / 2;
      // Green backing circle
      x.fillStyle = "#1f6b3f";
      x.beginPath(); x.arc(c, c, c, 0, Math.PI * 2); x.fill();
      // Yellow ball
      x.fillStyle = "#d8f000";
      x.beginPath(); x.arc(c, c, size * 0.34, 0, Math.PI * 2); x.fill();
      // Seam curves
      x.strokeStyle = "#1f6b3f";
      x.lineWidth = size * 0.07;
      x.lineCap = "round";
      x.beginPath(); x.moveTo(size * 0.16, c); x.quadraticCurveTo(c, size * 0.26, size * 0.84, c); x.stroke();
      x.beginPath(); x.moveTo(size * 0.16, c); x.quadraticCurveTo(c, size * 0.74, size * 0.84, c); x.stroke();

      const url = cv.toDataURL("image/png");

      document.querySelectorAll("link[rel~='icon'], link[rel='apple-touch-icon'], link[rel='shortcut icon']").forEach(el => el.remove());

      const mk = (rel) => {
        const link = document.createElement("link");
        link.rel = rel;
        link.type = "image/png";
        link.href = url;
        document.head.appendChild(link);
      };
      mk("icon");
      mk("shortcut icon");
      mk("apple-touch-icon");

      document.title = "Calendar Slam";
    } catch (e) { /* favicon optional */ }
  }, []);

  useEffect(() => { Sound.setMuted(!soundOn); }, [soundOn]);

  // Career: retire and show the hall of fame summary.
  function retire() { setPhase("retirement"); }

  // Coach's read on where to invest, from the build's weakest surface and the
  // most damaging slam result this season (e.g. an early Wimbledon exit → grass).
  function coachAssessment() {
    const b = offseasonPendingBuild || build;
    if (!b || Object.keys(b).length === 0) return null;
    const lastSeason = careerSeasons[careerSeasons.length - 1];
    const results = lastSeason?.results?.filter(r => !r.isOlympics) || [];
    const surfScores = ["Clay","Grass","Hard"].map(s => ({ s, v: surfaceScore(b, s) }));
    surfScores.sort((a, b2) => a.v - b2.v);
    const weakestSurf = surfScores[0].s;
    const surfName = { Clay: "clay", Grass: "grass", Hard: "hard courts" };
    const w = SURFACE_WEIGHTS[weakestSurf];
    let worstAttr = null, worstVal = 999;
    for (const a of ATTRS) {
      const val = b[a.key]?.rating ?? 0;
      if (w[a.key] >= 1.1 && val < worstVal) { worstVal = val; worstAttr = a; }
    }

    // Pull real match data for season-specific insight.
    const earlyExit = results.find(r => !r.wonTitle && ["Round 1","Round 2","Round 3"].includes(r.lostRound));
    const finalLoss = results.find(r => !r.wonTitle && r.lostRound === "Final");
    const sfLoss = results.find(r => !r.wonTitle && r.lostRound === "Semi-final");
    const rivalLoss = results.find(r => !r.wonTitle && r.lostToRival);
    const closeLoss = results.find(r => !r.wonTitle && r.reason?.includes("epic"));
    const wonCount = results.filter(r => r.wonTitle).length;

    let line;

    if (rivalLoss) {
      // Lost to rival specifically
      const lines = [
        `${rivalLoss.opponent} had your number again at ${rivalLoss.name} — that's becoming a pattern. We need to work on ${surfName[rivalLoss.surface]} specifically, because that's where they keep hurting us.`,
        `The loss to ${rivalLoss.opponent} in the ${rivalLoss.lostRound} at ${rivalLoss.name} wasn't just bad luck. They're targeting your ${worstAttr?.label.toLowerCase() || "weakest shot"} every time. We fix that this winter.`,
      ];
      line = lines[careerSeason % lines.length];
    } else if (finalLoss) {
      // Lost a final
      const mentalLines = [
        `You were right there in the ${finalLoss.name} final — the scoreline doesn't show how close it was. I think the pressure got to you on the big points. A session with a psychologist this off-season. Trust me.`,
        `Losing the ${finalLoss.name} final to ${finalLoss.opponent} — that one's going to hurt for a while. But look at it this way: you belong in finals. Now we learn how to win them.`,
      ];
      line = mentalLines[careerSeason % mentalLines.length];
    } else if (closeLoss) {
      // An epic match loss
      line = `That match at ${closeLoss.name} — the one that went the distance — you were a hair away. Your ${worstAttr?.label.toLowerCase() || "stamina"} in the deciding set let you down. That's our target this winter.`;
    } else if (earlyExit) {
      // Shock early exit
      const earlyLines = [
        `I'm not going to sugarcoat the early exit at ${earlyExit.name}. Your ${surfName[earlyExit.surface]} game is where we're losing matches before they've even started. That changes now.`,
        `${earlyExit.name}, Round ${earlyExit.lostRound?.replace("Round ","")} — that result hurt the whole team. ${earlyExit.opponent} exposed your ${worstAttr?.label.toLowerCase() || "movement"} and we both know it. Let's be honest about it and fix it.`,
      ];
      line = earlyLines[careerSeason % earlyLines.length];
    } else if (wonCount >= 2) {
      // Great season — keep building
      line = `Two titles this year — brilliant. But I still see the ${surfName[weakestSurf]} as the ceiling on what you can achieve. If we can close that gap this off-season, a Calendar Slam is genuinely within reach.`;
    } else if (sfLoss) {
      line = `Semi-finals are progress — genuinely. But ${sfLoss.opponent} in the last four at ${sfLoss.name} showed us exactly where the ceiling is right now. Your ${worstAttr?.label.toLowerCase() || "mental game"} under pressure. We work on that.`;
    } else {
      // Generic but still specific to surface
      const generic = [
        `Your ${surfName[weakestSurf]} results are the soft spot in your game. If we want more deep runs, that's where the work goes this off-season — no shortcuts.`,
        `I've been watching the tape from this season. The ${surfName[weakestSurf]} losses all share the same pattern — your ${worstAttr?.label.toLowerCase() || "game"} breaks down under pressure. We can fix it.`,
      ];
      line = generic[careerSeason % generic.length];
    }
    return { weakestSurf, line, worstAttr: worstAttr?.label };
  }

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
    setReveal({ slam: 0, round: 0, done: false, scoreShown: false });
    setShowCard(false);
    setEliteUsed(false);
    setPlayerSkipUsed(false);
    setPhase("draft");
    spinNext([], false);
  }

  // Single season: called from the tour screen with the chosen tour key.
  // Sets tour, resets draft state, and spins immediately — no intro screen.
  function startSingleDraft(tourKey) {
    const pool = TOURS[tourKey].pool;
    setTour(tourKey);
    setBuild({});
    setRound(0);
    setRanSim(false);
    setReveal({ slam: 0, round: 0, done: false, scoreShown: false });
    setShowCard(false);
    setEliteUsed(false);
    setPlayerSkipUsed(false);
    setPhase("draft");
    spinNext([], false, pool); // pass pool explicitly before tour state updates
  }

  // Draft: skip the currently spun player once per draft — re-spins a fresh one.
  function skipPlayer() {
    if (spinning || playerSkipUsed || !lockedPlayer.current) return;
    setPlayerSkipUsed(true);
    const usedNames = Object.values(build).filter(Boolean).map((b) => b.player);
    spinNext(usedNames.concat(lockedPlayer.current.name), eliteUsed);
  }

  // Choose which sub-pool to spin from given challenge mode and elite status.
  // The player that will be LOCKED when the user picks. Stored in a ref so
  // pickAttr always reads the authoritative value, never the animation frame.
  const lockedPlayer = React.useRef(null);

  function spinNext(exclude, eliteAlreadyUsed, explicitPool) {
    setSpinning(true);
    setPreviewKey(null);
    setHovered(null);
    let pool = explicitPool;
    if (!pool) {
      if (difficulty === "challenge") {
        pool = eliteAlreadyUsed ? journeyPool : POOL;
      } else {
        pool = POOL;
      }
    }
    const final = rngPick(pool, exclude);
    lockedPlayer.current = final; // always authoritative
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

  // Tap/click handler. On mobile: first tap arms a preview, second tap on the
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
    if (spinning || !lockedPlayer.current) return;
    const locked = lockedPlayer.current; // always the final spun player
    const isElitePick = difficulty === "challenge" && !eliteUsed &&
      elitePool.some((p) => p.name === locked.name);
    const nextEliteUsed = eliteUsed || isElitePick;
    if (isElitePick) setEliteUsed(true);
    const next = {
      ...build,
      [attrKey]: {
        rating: locked.stats[attrKey],
        player: locked.name,
        flag: locked.flag,
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
      // Exclude every player already used in the FRESH build (not the stale
      // memoised drawnIds, which hasn't updated yet this tick) so no player is
      // ever drawn twice and the card you see is always the card you lock.
      const usedNames = Object.values(next).filter(Boolean).map((b) => b.player);
      spinNext(usedNames, nextEliteUsed);
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

    // --- Evolving field & draw (career mode) ---------------------------------
    // As seasons pass, today's tour stars age out. By ~5 seasons in, the oldest
    // names fade (drop in level, then disappear) and are replaced by the
    // procedurally generated next generation, so the tour feels alive and the
    // 90s-born players don't linger past their time.
    const gens = generationalPlayers.filter(p => p.debutSeason <= careerSeason);
    let activeField = T.field;
    let activeDraw = T.draw;
    if (gameMode === "career") {
      const currentYear = 2024 + careerSeason;
      // A real player retires from the elite field once they're ~37+, or earlier
      // if they were born in the 80s (they'd be 40+ by the mid-career seasons).
      // Level also decays once they pass peak age (~32).
      const survivors = T.field.map(p => {
        const age = p.born ? currentYear - p.born : 30;
        if (age >= 38) return null; // retired
        const decayFrom = 31;
        const levelDrop = age > decayFrom ? Math.min(10, (age - decayFrom) * 1.5) : 0;
        return { ...p, base: Math.max(68, p.base - levelDrop) };
      }).filter(Boolean);
      const promoted = gens
        .filter(p => p.base >= 74 || careerSeason >= 4)
        .slice(0, Math.max(0, 10 - survivors.length) + 2)
        .map(p => ({ ...p, base: p.base + Math.min(8, careerSeason) }));
      activeField = [...survivors, ...promoted].slice(0, Math.max(8, survivors.length));
      activeDraw = [...T.draw, ...gens];
    }

    // Rival as a field-level threat (career mode), with a real level.
    let rivalForDraw = null;
    if (gameMode === "career" && careerRival) {
      rivalForDraw = {
        ...careerRival,
        level: 86 + Math.min(6, careerSeason), // strengthens as the career goes on
      };
    }

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
        // Best-of-3 Olympic bracket with REAL opponent names drawn from the
        // current field, climbing toward slam-final strength. Gold is earned.
        const myForm = surfaceScore(build, s.surface);
        const fieldByLevel = [...activeField]
          .map(p => ({ ...p, level: p.base + (p.surf?.[s.surface] ?? 0) }))
          .sort((a, b) => a.level - b.level);
        const oppPicks = [
          fieldByLevel[Math.max(0, fieldByLevel.length - 5)],
          fieldByLevel[Math.max(0, fieldByLevel.length - 3)],
          fieldByLevel[fieldByLevel.length - 1],
        ];
        const oppStrengths = [84, 88, 92];
        const rounds = ["Quarter-final", "Semi-final", "Final"];
        const path = [];
        let roundsWon = 0;
        for (let i = 0; i < 3; i++) {
          let mySets = 0, oppSets = 0;
          while (mySets < 2 && oppSets < 2) {
            const noise = (rand() - 0.5) * 10;
            const pSet = 1 / (1 + Math.exp(-((myForm + noise - oppStrengths[i]) / 6)));
            if (rand() < pSet) mySets++; else oppSets++;
          }
          const wonSet = mySets === 2;
          path.push({
            round: rounds[i],
            name: oppPicks[i]?.name || "the field",
            won: wonSet,
            score: `${mySets}-${oppSets}`,
          });
          if (wonSet) roundsWon++; else break;
        }
        let medal, wonGold = false;
        if (roundsWon === 3) { medal = "Gold 🥇"; wonGold = true; }
        else if (roundsWon === 2) medal = "Silver 🥈";
        else {
          // bronze playoff
          let ms = 0, os = 0;
          const bronzeName = fieldByLevel[Math.max(0, fieldByLevel.length - 4)]?.name || "the field";
          while (ms < 2 && os < 2) {
            const noise = (rand() - 0.5) * 10;
            const pSet = 1 / (1 + Math.exp(-((myForm + noise - 85) / 6)));
            if (rand() < pSet) ms++; else os++;
          }
          medal = roundsWon === 1 && ms === 2 ? "Bronze 🥉"
            : roundsWon === 1 ? "4th place"
            : "Eliminated";
        }
        const lastOpp = path[path.length - 1];
        return {
          ...s,
          wonTitle: wonGold,
          medal,
          path,
          finalOpp: lastOpp?.name || "the field",
          finalScore: lastOpp?.score || "",
          note: wonGold ? "delivered a gold-medal performance" : "",
          lostRound: !wonGold ? (path.find(p => !p.won)?.round || "Final") : null,
          opponent: lastOpp?.name || "the field",
          setScore: lastOpp?.score || "",
          reason: wonGold ? null : "the Olympic field proved too strong on the day",
          weapon: "the world's best",
        };
      }
      const r = simulateMajor(build, s, rand, usedReasons, activeField, activeDraw, rivalForDraw);
      if (r.wonTitle) won++;
      return { ...s, ...r };
    });

    // Count grand slam titles (not Olympics)
    const slamWon = perSlam.filter(s => !s.isOlympics && s.wonTitle).length;
    return { perSlam, won: slamWon, tier: tierFor(slamWon), olympicsData };
  }, [phase, build, ranSim, seed, gameMode, careerSeason, generationalPlayers, careerRival]);

  // Kick off a fresh live simulation: reset reveal, new seed, run sim.
  function startSim() {
    setReveal({ slam: 0, round: 0, done: false, scoreShown: false });
    setSeed(Math.floor(Math.random() * 1e9));
    statsRecorded.current = false;
    setRanSim(true);
  }

  // Record lifetime stats once each completed sim resolves (single + career seasons).
  useEffect(() => {
    if (!reveal.done || !simResults || statsRecorded.current || !playerStats.loaded) return;
    statsRecorded.current = true;
    const won = simResults.won;
    const wonAny = won >= 1;
    const newStreak = wonAny ? playerStats.currentStreak + 1 : 0;
    const tierRank = { "CALENDAR SLAM": 5, "Three majors": 4, "Two majors": 3, "One major": 2, "No majors": 1 };
    const curBestRank = tierRank[playerStats.bestTier] || 0;
    const thisRank = tierRank[simResults.tier?.name] || 0;
    saveStats({
      ...playerStats,
      loaded: true,
      seasonsPlayed: playerStats.seasonsPlayed + 1,
      slamsWon: playerStats.slamsWon + won,
      calendarSlams: playerStats.calendarSlams + (won === 4 ? 1 : 0),
      bestTier: thisRank > curBestRank ? simResults.tier?.name : playerStats.bestTier,
      currentStreak: newStreak,
      bestStreak: Math.max(playerStats.bestStreak, newStreak),
    });
  }, [reveal.done, simResults, playerStats.loaded]);

  function skipSim() {
    const total = simResults ? simResults.perSlam.length : SLAMS.length;
    setReveal({ slam: total, round: 0, done: true, scoreShown: true });
  }

  // Drive the live reveal. Each round reveals in two beats: the opponent appears
  // (scoreShown:false), then the score lands. Pacing is deliberately uneven so
  // you FOLLOW the story rather than watch a uniform crawl: routine early rounds
  // move briskly, the business end of the draw slows down, the final is an event,
  // and there's a beat to absorb each major's outcome before the next one starts.
  useEffect(() => {
    if (!ranSim || !simResults || reveal.done) return;
    const slam = simResults.perSlam[reveal.slam];
    if (!slam) { setReveal((r) => ({ ...r, done: true })); return; }
    const lastRound = slam.path.length - 1;
    const r = reveal.round;
    const isFinalRound = r === lastRound;
    const isSemi = r === lastRound - 1;
    const isQF = r === lastRound - 2;
    const justLost = slam.path[r] && !slam.path[r].won; // an upset loss is a moment too

    // Beat durations. Early rounds (R1-R4) are quick; QF/SF build; the final is
    // an event. A loss at any stage gets extra dwell because it ends your run.
    let nameBeat, scoreBeat;
    if (reduce) {
      nameBeat = 0; scoreBeat = 0;
    } else if (isFinalRound) {
      nameBeat = 700; scoreBeat = 1100;       // championship: real suspense
    } else if (isSemi) {
      nameBeat = 480; scoreBeat = 700;
    } else if (isQF) {
      nameBeat = 380; scoreBeat = 560;
    } else {
      nameBeat = 230; scoreBeat = 360;        // routine early rounds — brisk
    }
    // If you just lost (run over), linger so it sinks in before moving on.
    if (justLost && reveal.scoreShown && !reduce) scoreBeat = Math.max(scoreBeat, 1000);

    if (!reveal.scoreShown) {
      if (isFinalRound && !reduce) Sound.heartbeat();
      const t = setTimeout(() => {
        // Only sound the meaningful rounds (QF onward) to avoid constant clicking
        if (isQF || isSemi || isFinalRound) Sound.tap();
        setReveal((rr) => ({ ...rr, scoreShown: true }));
      }, nameBeat);
      return () => clearTimeout(t);
    }

    const isLastRound = r >= lastRound;
    if (isLastRound && slam.wonTitle) Sound.cheer();

    // After the last shown round of a slam, hold on the RESULT before the next
    // major begins, so each slam reads as its own chapter.
    const isSlamResolved = r >= lastRound || justLost;
    const moreSlams = reveal.slam + 1 < simResults.perSlam.length;
    const interSlamHold = (isSlamResolved && moreSlams && !reduce) ? 900 : 0;

    const t = setTimeout(() => {
      setReveal((rr) => {
        if (rr.round < lastRound) return { ...rr, round: rr.round + 1, scoreShown: false };
        if (rr.slam + 1 >= simResults.perSlam.length) return { ...rr, done: true };
        return { slam: rr.slam + 1, round: 0, done: false, scoreShown: false };
      });
    }, scoreBeat + interSlamHold);
    return () => clearTimeout(t);
  }, [ranSim, simResults, reveal, reduce]);

  return (
    <div className="cs-root" onPointerDown={() => Sound.tap()}>
      <style>{CSS}</style>

      <header className="cs-head">
        <button className="cs-wordmark cs-wordmark-btn" onClick={() => {
          if (phase === "mode") return;
          if (window.confirm("Return to the home screen? Any unfinished season will be lost.")) {
            setPhase("mode");
            setRanSim(false);
            setReveal({ slam: 0, round: 0, done: false, scoreShown: false });
          }
        }} title="Return to home">
          <span className="cs-wordmark-calendar">Calendar</span>
          <span className="cs-wordmark-slam">Slam</span>
        </button>
        <div className="cs-head-right">
          <button className="cs-sound-toggle" onClick={() => setSoundOn(v => !v)}
            title={soundOn ? "Mute sound" : "Unmute sound"} aria-label="Toggle sound">
            {soundOn ? "🔊" : "🔇"}
          </button>
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
          {playerStats.loaded && playerStats.seasonsPlayed > 0 && (
            <div className="cs-stats-bar">
              <div className="cs-stat">
                <span className="cs-stat-num">{playerStats.slamsWon}</span>
                <span className="cs-stat-label">Slams won</span>
              </div>
              <div className="cs-stat">
                <span className="cs-stat-num">{playerStats.currentStreak}🔥</span>
                <span className="cs-stat-label">Streak</span>
              </div>
              <div className="cs-stat">
                <span className="cs-stat-num">{playerStats.bestStreak}</span>
                <span className="cs-stat-label">Best streak</span>
              </div>
              <div className="cs-stat">
                <span className="cs-stat-num">{playerStats.calendarSlams}</span>
                <span className="cs-stat-label">Calendar Slams</span>
              </div>
            </div>
          )}
          <div className="cs-mode-btns">
            <button type="button" className="cs-mode-btn"
              onClick={() => { setGameMode("single"); setPhase("tour"); }}>
              <span className="cs-mode-icon">🎾</span>
              <span className="cs-mode-label">Single Season</span>
              <span className="cs-mode-desc">Build the ultimate player and chase the Calendar Slam — all four majors in one year.</span>
            </button>
            <button type="button" className="cs-mode-btn career"
              onClick={() => { setGameMode("career"); setPhase("tour"); }}>
              <span className="cs-mode-icon">🏆</span>
              <span className="cs-mode-label">Career Mode</span>
              <span className="cs-mode-desc">Guide your player from age 20 to retirement. Hire coaches, survive injuries, build a rivalry, and write your legacy before time catches up.</span>
            </button>
          </div>
        </section>
      )}

      {phase === "tour" && (
        <section className="cs-tourpick">
          {gameMode === "single" ? (
            <>
              <h1 className="cs-h1">Build a<br /><em>tennis god.</em></h1>
              <p className="cs-lede">
                Spin real players from across eras, draft their iconic weapons, and build
                a composite champion. You get 11 picks — one attribute per round. To win
                the Calendar Slam you'll need to conquer all three surfaces.
              </p>
              <div className="cs-surfaces cs-tour-slams">
                {SLAMS.map((s) => (
                  <div key={s.key} className={`cs-surface-chip slam-${s.key}`}>
                    <span className="cs-chip-name">{s.name}</span>
                    <span className="cs-chip-surface">{s.surface}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <h1 className="cs-h1">Build your<br /><em>player.</em></h1>
              <p className="cs-lede">
                Create a named player, draft their game from scratch, then guide them
                through a full career — injuries, off-seasons, a rival, and the slow
                march of time. Retire at 35 with a legacy worth remembering.
              </p>
            </>
          )}
          <NetGraphic />
          <p className="cs-tour-prompt">Choose your tour</p>
          <div className="cs-tour-btns">
            <button
              className="cs-tour-btn atp"
              onClick={() => gameMode === "career" ? (setTour("atp"), setPhase("player-create")) : startSingleDraft("atp")}
            >
              <span className="cs-tour-label">ATP</span>
              <span className="cs-tour-sub">Men's Tour</span>
            </button>
            <button
              className="cs-tour-btn wta"
              onClick={() => gameMode === "career" ? (setTour("wta"), setPhase("player-create")) : startSingleDraft("wta")}
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
              <div className={`cs-gen-player ${nameRolling ? "rolling" : ""}`}>
                <span className="cs-gen-flag">{playerFlag}</span>
                <span className="cs-gen-name">{playerName || "Generating…"}</span>
              </div>
              <button className="cs-text-btn" onClick={generatePlayerIdentity} disabled={nameRolling}>↻ Generate another</button>
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
            <div className="cs-start-note">
              <span className="cs-start-age">Age 20</span>
              <p className="cs-create-hint">You start at 20, already a rising force on tour. Careers peak in the mid-20s and wind down by 35 — make every season count.</p>
            </div>
          </div>

          <button className="cs-cta" onClick={startCareer}
            disabled={playerNameMode === "custom" && !playerName.trim()}>
            Begin drafting →
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
                You have <strong>11 picks</strong> — choose wisely. This build will carry through your career,
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
          {gameMode === "career" && (
            <div className="cs-draft-career-banner">
              {playerFlag} <strong>{playerName}</strong> · {T.label} Career · Season {careerSeason} · Age {careerAge}
            </div>
          )}
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
                <div className="cs-skip-slot">
                  <button
                    className={`cs-skip-player-btn ${(spinning || playerSkipUsed) ? "cs-skip-hidden" : ""}`}
                    onClick={skipPlayer}
                    disabled={spinning || playerSkipUsed}
                    aria-hidden={spinning || playerSkipUsed}
                    title="Skip this player — once per draft"
                  >
                    ↻ Skip this player <span className="cs-skip-once">(once per draft)</span>
                  </button>
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
                <>
                  {simResults.won === 4 && (
                    <div className="cs-confetti" aria-hidden>
                      {Array.from({length: 48}).map((_,i) => (
                        <div key={i} className="cs-confetti-piece" style={{
                          '--i': i,
                          '--x': `${(i * 37 + 11) % 100}%`,
                          '--hue': `${(i * 47) % 360}`,
                          '--delay': `${(i * 0.04).toFixed(2)}s`,
                          '--dur': `${0.9 + (i % 5) * 0.18}s`,
                        }} />
                      ))}
                    </div>
                  )}
                  <div className={`cs-tier ${simResults.tier.glow ? "glow" : ""}`}>
                  <div className="cs-tier-eyebrow">Simulated · live {T.label} field</div>
                  <div className="cs-tier-count">{simResults.won} / 4</div>
                  <div className="cs-tier-name">{simResults.tier.name}</div>
                  <div className="cs-tier-note">{simResults.tier.note}</div>
                </div>
                {gameMode === "single" && simResults.won < 4 && (() => {
                  const lost = simResults.perSlam.filter(s => !s.isOlympics && !s.wonTitle);
                  if (lost.length === 0) return null;
                  const surfScores = ["Clay","Grass","Hard"].map(s => ({ s, v: surfaceScore(build, s) }));
                  surfScores.sort((a,b) => a.v - b.v);
                  const weak = surfScores[0].s;
                  const surfName = { Clay:"clay", Grass:"grass", Hard:"hard courts" };
                  const surfShot = { Clay:"clay", Grass:"grass", Hard:"hard-court" };
                  const w = SURFACE_WEIGHTS[weak];
                  let worstAttr = null, worstVal = 999;
                  for (const a of ATTRS) {
                    const v = build[a.key]?.rating ?? 0;
                    if (w[a.key] >= 1.1 && v < worstVal) { worstVal = v; worstAttr = a; }
                  }
                  // Find the closest loss — the near-miss that stings most.
                  const roundOrder = ["Round 1","Round 2","Round 3","Round 4","Quarter-final","Semi-final","Final"];
                  const nearMisses = lost.filter(l => l.nearMiss).sort((a,b) =>
                    roundOrder.indexOf(b.lostRound) - roundOrder.indexOf(a.lostRound));
                  const tease = nearMisses[0];

                  // For the specific near-miss match, work out the EXACT attribute the
                  // opponent exploited (from their style), so the analysis is coherent:
                  // the stat we tell you to improve is the one that actually lost it,
                  // and the opponent's edge is phrased to match.
                  const STYLE_KEY = { serve:"return", return:"serve", defence:"stamina", baseline:"forehand", allcourt:"mental" };
                  // How the opponent's strength reads, by the player's exploited weakness:
                  const EDGE_PHRASE = {
                    return: "their serve was firing and you couldn't get a look on return",
                    serve:  "they picked your serve apart and broke at the worst moments",
                    stamina:"they outlasted you once the rallies turned into a war of attrition",
                    forehand:"they overpowered you from the baseline",
                    mental: "their superior mentality gave them the edge in the big points",
                  };
                  const ATTR_LABEL = { return:"return", serve:"serve", stamina:"stamina", forehand:"forehand", mental:"mentality" };
                  const teaseKey = tease ? (STYLE_KEY[tease.oppStyle] || "return") : null;
                  const teaseAttrLabel = teaseKey ? ATTR_LABEL[teaseKey] : null;
                  const teaseEdge = teaseKey ? EDGE_PHRASE[teaseKey] : null;
                  return (
                    <div className="cs-diagnosis">
                      <div className="cs-diagnosis-title">📋 The post-match analysis</div>
                      {tease ? (
                        <p className="cs-diagnosis-body">
                          So close at {tease.name}. You pushed {tease.opponent} hard in
                          the {tease.lostRound.toLowerCase()}, but {teaseEdge}. If your{" "}
                          <strong>{teaseAttrLabel}</strong> had been a few points higher,
                          that match — and the title — might have been yours. Draft to
                          shore it up next time.
                        </p>
                      ) : (
                        <p className="cs-diagnosis-body">
                          {simResults.won === 0
                            ? `No titles this time — your ${surfName[weak]} game was the weak link`
                            : `${simResults.won} title${simResults.won>1?"s":""}, but no Slam. Your ${surfName[weak]} game held you back`}
                          {worstAttr && worstVal < 88 ? `, your ${worstAttr.label.toLowerCase()} (${worstVal}) especially. ` : ". "}
                          Draft stronger there next time.
                        </p>
                      )}
                    </div>
                  );
                })()}
                </>
              ) : (
                <>
                  {(() => {
                    const s = simResults.perSlam[reveal.slam];
                    if (!s) return null;
                    const p = s.path[reveal.round];
                    if (!p) return null;
                    const isFinal = reveal.round === s.path.length - 1;
                    const roundName = p.round;
                    return (
                      <div className={`cs-now-playing ${s.isOlympics ? "oly" : `slam-${s.key}`} ${isFinal ? "is-final" : ""}`}>
                        <div className="cs-now-meta">
                          <span className="cs-now-event">{s.isOlympics ? "🏅 " : ""}{s.name}</span>
                          <span className="cs-now-round">{roundName}{isFinal ? " · CHAMPIONSHIP" : ""}</span>
                        </div>
                        <div className="cs-now-match">
                          <span className="cs-now-you">{playerFlag || "🎾"} You</span>
                          <span className="cs-now-vs">vs</span>
                          <span className="cs-now-opp">
                            {p.name}{p.isRival ? " ⚔" : ""}
                          </span>
                        </div>
                        <div className={`cs-now-score ${reveal.scoreShown ? "shown" : "pending"} ${reveal.scoreShown ? (p.won ? "won" : "lost") : ""}`}>
                          {reveal.scoreShown
                            ? <>{p.won ? "WON" : "LOST"} <span className="cs-now-score-line">{p.score}</span></>
                            : <span className="cs-now-serving">{isFinal ? "Championship point…" : "Playing…"}</span>}
                        </div>
                        {reveal.scoreShown && (isFinal || !p.won) && (
                          <div className={`cs-now-outcome ${p.won && isFinal ? "champ" : "out"}`}>
                            {p.won && isFinal
                              ? `🏆 ${s.isOlympics ? "GOLD MEDAL" : "CHAMPION"}`
                              : `Knocked out · ${p.round}`}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <div className="cs-live-banner">
                    <span className="cs-live-dot" />
                    Playing {simResults.perSlam[reveal.slam]?.name}…
                    <button className="cs-skip-btn" onClick={skipSim}>Skip to results ⏭</button>
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
                        {s.path.slice(0, roundsToShow).map((p, i) => {
                          // The most-recently revealed row of the CURRENT event waits
                          // a beat: show the opponent name, then land the score.
                          const isFreshRow = isCurrent && i === roundsToShow - 1 && !reveal.scoreShown && !reveal.done;
                          return (
                            <li key={i} className={isFreshRow ? "fresh" : (p.won ? "won" : "lost")}>
                              <span className="cs-path-round">{p.round}</span>
                              <span className="cs-path-opp">
                                {isFreshRow ? `vs ${p.name}` : `${p.won ? "def." : "lost to"} ${p.name}`}
                                {p.isRival && <span className="cs-rival-tag"> ⚔ rival</span>}
                              </span>
                              <span className="cs-path-score">
                                {isFreshRow ? <span className="cs-score-loading">· · ·</span> : p.score}
                              </span>
                            </li>
                          );
                        })}
                        {isCurrent && !resolved && reveal.scoreShown && roundsToShow < s.path.length && (
                          <li className="cs-path-playing">
                            <span className="cs-path-round">{(s.path[roundsToShow]?.round) || ROUNDS[roundsToShow]}</span>
                            <span className="cs-path-opp">up next…</span>
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

          {ranSim && (
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
          )}
          {gameMode === "single" ? (
            <button className="cs-cta" onClick={() => { setPhase("mode"); }}>Play again →</button>
          ) : null}
        </section>
      )}

      {/* OFFSEASON (career mode) */}
      {phase === "offseason" && (
        <section className="cs-offseason">
          <>
            <>
              {/* TROPHY CABINET */}
              {careerSlamCount > 0 && (
                <div className="cs-trophy-cabinet">
                  <span className="cs-trophy-label">Trophy Cabinet</span>
                  <div className="cs-trophy-row">
                    {careerSeasons.flatMap(s =>
                      s.results?.filter(r => !r.isOlympics && r.wonTitle).map(r => (
                        <button key={`${s.season}-${r.key}`} className={`cs-trophy slam-${r.key}`}
                          title={`${r.name} ${s.year} — tap for detail`}
                          onClick={() => setTrophyDetail({
                            name: r.name, year: s.year, finalOpp: r.finalOpp,
                            finalScore: r.finalScore, surface: r.surface, beatRival: r.beatRival,
                          })}>
                          <span className="cs-trophy-icon">🏆</span>
                          <span className="cs-trophy-name">{r.short || r.name?.split(" ").pop()}</span>
                          <span className="cs-trophy-year">{s.year}</span>
                        </button>
                      ))
                    )}
                    {careerSeasons.flatMap(s =>
                      s.olympics?.medal?.includes("Gold") ? [
                        <button key={`oly-${s.season}`} className="cs-trophy cs-trophy-gold"
                          title={`${s.olympics.city} Olympics — tap for detail`}
                          onClick={() => setTrophyDetail({
                            name: `${s.olympics.city} Olympics`,
                            year: s.year,
                            finalOpp: s.results?.find(r => r.isOlympics)?.finalOpp || "the field",
                            finalScore: s.results?.find(r => r.isOlympics)?.finalScore || "",
                            surface: s.results?.find(r => r.isOlympics)?.surface || "Hard",
                            beatRival: false,
                            isOlympics: true,
                          })}>
                          <span className="cs-trophy-icon">🥇</span>
                          <span className="cs-trophy-name">Olympic</span>
                          <span className="cs-trophy-year">{s.year}</span>
                        </button>
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
                {(() => {
                  const coach = coachAssessment();
                  return coach ? (
                    <div className="cs-coach-card">
                      <span className="cs-coach-avatar">🎾</span>
                      <div className="cs-coach-body">
                        <span className="cs-coach-name">Your coach</span>
                        <p className="cs-coach-line">"{coach.line}"</p>
                      </div>
                    </div>
                  ) : null;
                })()}
                <p className="cs-upgrade-sub">Tap once to preview, tap again to confirm.</p>
                <div className="cs-upgrade-grid">
                  {offseasonUpgrades.map((u, ui) => {
                    const armed = upgradeArmed === u.id;
                    const isCoachPick = ui === 0; // first slot is the guaranteed weakness-targeting upgrade
                    return (
                      <button key={u.id}
                        className={`cs-upgrade-btn ${u.recovery ? "recovery" : ""} ${armed ? "armed" : ""} ${isCoachPick ? "coach-pick" : ""}`}
                        onClick={() => {
                          if (armed) applyUpgrade(u);
                          else setUpgradeArmed(u.id);
                        }}>
                        {isCoachPick && <span className="cs-coach-pick-badge">⭐ Coach recommends</span>}
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

              {careerAge >= RETIRE_AGE - 2 && !retirementPrompt && (
                <div className="cs-final-season-banner">
                  ⏳ <strong>Final chapter.</strong> You'll turn {RETIRE_AGE} in {RETIRE_AGE - careerAge <= 1 ? "one season" : "two seasons"} — make it count.
                </div>
              )}

              {retirementPrompt && (
                <div className="cs-retirement-prompt">
                  <p>{careerAge + 1 >= RETIRE_AGE
                    ? "At 35, your body is telling you it's time. This will be your final season — finish on your terms, or retire now and celebrate your legacy."
                    : "Your slam-winning days look to be behind you. Retire now and celebrate your legacy, or push on for one more shot?"}</p>
                  <div className="cs-retire-actions">
                    <button className="cs-cta" onClick={retire}>Retire →</button>
                    {careerAge + 1 < RETIRE_AGE && (
                      <button className="cs-text-btn" onClick={() => setRetirementPrompt(false)}>Keep going</button>
                    )}
                  </div>
                </div>
              )}
            </>
          </>
        </section>
      )}

      {/* RETIREMENT (career mode) */}
      {phase === "retirement" && (
        <section className="cs-retirement">
          {/* Retirement press clipping */}
          {(() => {
            const retireYear = 2025 + careerSeason;
            const tier = careerSlamCount >= 10 ? "All-Time Great" :
                         careerSlamCount >= 5  ? "Legendary Champion" :
                         careerSlamCount >= 2  ? "Grand Slam Champion" :
                         careerSlamCount === 1 ? "Grand Slam Winner" : "Tour Professional";
            const rivalLine = careerRival
              ? ` The rivalry with ${careerRival.flag} ${careerRival.name} — ${careerRival.slamCount > careerSlamCount ? "won by their nemesis" : careerSlamCount > careerRival.slamCount ? "ultimately won" : "evenly matched"} — defined an era.`
              : "";
            const bodyText = careerSlamCount >= 10
              ? `${playerName} retires at ${careerAge} as one of the most decorated players in the history of the sport. ${careerSlamCount} Grand Slam titles across a ${careerSeason}-season career speak for themselves.${rivalLine}`
              : careerSlamCount >= 2
              ? `After ${careerSeason} seasons on tour, ${playerName} hangs up the racket at ${careerAge} with ${careerSlamCount} Grand Slam titles to their name. A career that will be remembered.${rivalLine}`
              : careerSlamCount === 1
              ? `${playerName} retires after ${careerSeason} seasons. One Grand Slam title — a result that will always guarantee their place in the sport's history.${rivalLine}`
              : `${playerName} retires after ${careerSeason} seasons of competing at the highest level. The title proved elusive — but few who saw them play would deny their commitment to the game.${rivalLine}`;
            return (
              <div className="cs-legacy-clipping">
                <div className="cs-legacy-masthead">THE TENNIS TRIBUNE</div>
                <div className="cs-legacy-subhead">RETIREMENT SPECIAL · {retireYear}</div>
                <h2 className="cs-legacy-headline">{playerFlag} {playerName.toUpperCase()} RETIRES: {tier.toUpperCase()}</h2>
                <p className="cs-legacy-body">{bodyText}</p>
              </div>
            );
          })()}
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

          <div className="cs-retire-actions-row">
            <button className="cs-sim-btn cs-share-btn" onClick={() => setShowCareerCard(true)}>↗ Share career</button>
            <button className="cs-cta" onClick={() => setPhase("mode")}>Play again →</button>
          </div>
        </section>
      )}

      {showCareerCard && gameMode === "career" && (
        <CareerShareCard
          playerName={playerName}
          playerFlag={playerFlag}
          tourLabel={T.label}
          careerSlamCount={careerSlamCount}
          careerSeasons={careerSeasons}
          careerAge={careerAge}
          careerRival={careerRival}
          build={build}
          onClose={() => setShowCareerCard(false)}
        />
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

      {trophyDetail && (
        <div className="cs-modal" onClick={() => setTrophyDetail(null)}>
          <div className="cs-trophy-detail" onClick={e => e.stopPropagation()}>
            <button className="cs-modal-x" onClick={() => setTrophyDetail(null)} aria-label="Close">×</button>
            <span className="cs-trophy-detail-icon">{trophyDetail.isOlympics ? "🥇" : "🏆"}</span>
            <h3 className="cs-trophy-detail-title">{trophyDetail.name}</h3>
            <span className="cs-trophy-detail-year">{trophyDetail.year} · {trophyDetail.surface} court</span>
            <div className="cs-trophy-detail-final">
              <span className="cs-trophy-detail-label">Final</span>
              <span className="cs-trophy-detail-opp">
                def. {trophyDetail.finalOpp}{trophyDetail.beatRival ? " ⚔" : ""}
              </span>
              <span className="cs-trophy-detail-score">{trophyDetail.finalScore}</span>
            </div>
            {trophyDetail.beatRival && (
              <p className="cs-trophy-detail-note">You beat your great rival to lift this one.</p>
            )}
          </div>
        </div>
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
.cs-wordmark-btn { background:none; border:none; padding:0; margin:0; cursor:pointer; }
.cs-wordmark-btn:hover .cs-wordmark-slam { filter:brightness(1.12); }
.cs-wordmark-btn:focus-visible { outline:3px solid var(--ball); outline-offset:4px; border-radius:4px; }
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
.cs-draft-career-banner { font-size:13px; color:var(--ball-soft); font-weight:700; letter-spacing:.04em; margin-bottom:12px; padding-bottom:10px; border-bottom:1px solid var(--line); }
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
.cs-skip-slot { min-height:42px; display:flex; align-items:center; margin-top:10px; }
.cs-skip-player-btn { background:transparent; border:2px solid var(--ball); color:var(--ball); font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:13px; letter-spacing:.1em; text-transform:uppercase; padding:7px 18px; border-radius:20px; cursor:pointer; transition:background .15s, color .15s, opacity .15s; }
.cs-skip-player-btn:hover { background:var(--ball); color:var(--ink); }
.cs-skip-player-btn.cs-skip-hidden { opacity:0; pointer-events:none; }
.cs-skip-once { font-size:11px; font-weight:600; letter-spacing:.04em; opacity:.7; text-transform:none; }

/* court diagram */
.cs-court { width:120px; flex:0 0 120px; display:block; align-self:center; }

/* figure placeholder (unused but kept) */
.cs-figure { width:128px; flex:0 0 128px; display:block; align-self:center; }
.cs-figure.pulse { animation:cs-pulse 1.1s ease-in-out infinite; }
@keyframes cs-pulse { 0%,100%{opacity:1} 50%{opacity:.72} }
@media (prefers-reduced-motion: reduce) { .cs-figure.pulse { animation:none; } }

/* header nav */
.cs-head-right { display:flex; flex-direction:column; align-items:flex-end; gap:3px; margin-left:auto; }
.cs-sound-toggle { background:rgba(246,251,239,.1); border:1.5px solid var(--line); border-radius:20px; font-size:14px; padding:3px 10px; cursor:pointer; line-height:1.4; }
.cs-sound-toggle:hover { background:rgba(216,240,0,.15); border-color:var(--ball); }
.cs-tour-switch { background:rgba(246,251,239,.1); border:1.5px solid var(--line); border-radius:20px; color:var(--chalk); font-size:12px; font-weight:700; letter-spacing:.06em; padding:5px 12px; cursor:pointer; transition:background .18s, border-color .18s; }
.cs-tour-switch:hover { background:rgba(216,240,0,.15); border-color:var(--ball); }

/* slam buttons — solid filled pill cards, no border */
.cs-surface-chip.slam-ao  { background:linear-gradient(135deg,#1a5fb8,#2b7de9); border:none; box-shadow:0 3px 0 rgba(0,0,0,.3); }
.cs-surface-chip.slam-rg  { background:linear-gradient(135deg,#b84a1a,#e07a3f); border:none; box-shadow:0 3px 0 rgba(0,0,0,.3); }
.cs-surface-chip.slam-wim { background:linear-gradient(135deg,#3d1a6b,#5a2d82); border:none; box-shadow:0 3px 0 rgba(0,0,0,.3); }
.cs-surface-chip.slam-uso { background:linear-gradient(135deg,#0a2e63,#1456b0); border:none; box-shadow:0 3px 0 rgba(0,0,0,.3); }
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
.cs-now-playing { border-radius:10px; padding:22px 20px 26px; margin-bottom:14px; background:rgba(246,251,239,.05); border:2px solid var(--line); border-left-width:6px; text-align:center; transition:border-color .3s; }
.cs-now-playing.is-final { border-color:var(--ball); box-shadow:0 0 28px rgba(216,240,0,.18); animation:cs-final-pulse 1.4s ease-in-out infinite; }
@keyframes cs-final-pulse { 0%,100%{box-shadow:0 0 20px rgba(216,240,0,.12)} 50%{box-shadow:0 0 36px rgba(216,240,0,.3)} }
.cs-now-meta { display:flex; flex-direction:column; gap:2px; margin-bottom:14px; }
.cs-now-event { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:22px; text-transform:uppercase; color:var(--chalk); letter-spacing:.02em; }
.cs-now-round { font-size:11px; letter-spacing:.18em; text-transform:uppercase; font-weight:800; color:var(--ball-soft); }
.cs-now-match { display:flex; align-items:center; justify-content:center; gap:14px; margin-bottom:16px; flex-wrap:wrap; }
.cs-now-you { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:24px; color:var(--ball); }
.cs-now-vs { font-size:13px; color:var(--dim); text-transform:uppercase; letter-spacing:.1em; }
.cs-now-opp { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:24px; color:var(--chalk); }
.cs-now-score { font-family:"Barlow Condensed",sans-serif; font-weight:900; font-size:30px; letter-spacing:.04em; min-height:38px; }
.cs-now-score.pending { color:var(--dim); }
.cs-now-score.won { color:var(--ball); animation:cs-pop .35s ease; }
.cs-now-score.lost { color:var(--clay); animation:cs-pop .35s ease; }
.cs-now-score-line { font-size:24px; opacity:.9; margin-left:8px; }
.cs-now-serving { font-size:18px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; animation:cs-blink .8s ease-in-out infinite; }
.cs-now-outcome { margin-top:12px; font-family:"Barlow Condensed",sans-serif; font-weight:900; font-size:20px; letter-spacing:.08em; text-transform:uppercase; animation:cs-pop .4s ease; }
.cs-now-outcome.champ { color:var(--ball); }
.cs-now-outcome.out { color:var(--clay); }
@keyframes cs-pop { 0%{transform:scale(.7);opacity:0} 60%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
.cs-now-playing.slam-ao { border-left-color:#2b7de9; }
.cs-now-playing.slam-rg { border-left-color:#e07a3f; }
.cs-now-playing.slam-wim { border-left-color:#5a2d82; }
.cs-now-playing.slam-uso { border-left-color:#1456b0; }
.cs-now-playing.oly { border-left-color:#d8b500; }
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
.cs-path-list li.fresh { animation:cs-rowin .2s ease; }
.cs-path-list li.fresh .cs-path-opp { color:var(--chalk); font-weight:700; }
.cs-score-loading { color:var(--ball-soft); letter-spacing:2px; animation:cs-blink .7s ease-in-out infinite; }
.cs-rival-tag { color:var(--clay); font-weight:800; font-size:11px; letter-spacing:.04em; }
@media (prefers-reduced-motion: reduce) {
  .cs-live-dot, .cs-leg.playing, .cs-path-live li { animation:none; }
}

/* major colour identities — legs only (chips handled by the new solid rules above) */
.cs-leg.slam-ao { border-left-color:#2b7de9; }
.cs-leg.slam-rg { border-left-color:#e07a3f; }
.cs-leg.slam-wim { border-left-color:#5a2d82; }
.cs-leg.slam-uso { border-left-color:#1456b0; }
.cs-leg.cs-leg-olympics { border-left-color:#ffd700; background:rgba(255,215,0,.07); }
.cs-leg.cs-leg-olympics .cs-leg-name { color:#ffd700; }
.cs-leg.cs-leg-olympics.win { background:rgba(255,215,0,.14); }

.cs-tier-eyebrow { font-size:10px; letter-spacing:.18em; text-transform:uppercase; font-weight:800; color:var(--dim); margin-bottom:4px; }
.cs-sim-prompt { text-align:center; margin-bottom:22px; display:flex; flex-direction:column; align-items:center; gap:12px; }
.cs-sim-prompt p { font-size:14px; color:var(--dim); max-width:46ch; margin:0 auto; line-height:1.5; }
.cs-sim-btn { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:16px; letter-spacing:.06em; text-transform:uppercase; background:rgba(246,251,239,.12); color:var(--chalk); border:none; border-radius:6px; padding:14px 26px; cursor:pointer; transition:transform .12s, filter .18s; box-shadow:0 3px 0 rgba(14,42,26,.4); }
.cs-sim-btn:hover { transform:translateY(-2px); box-shadow:0 5px 0 rgba(14,42,26,.4); filter:brightness(1.08); }
.cs-sim-btn:active { transform:translateY(1px); box-shadow:0 1px 0 rgba(14,42,26,.4); }
.cs-sim-btn:focus-visible { outline:3px solid var(--ball); outline-offset:3px; }
/* End/continue season — solid yellow primary */
.cs-career-next { width:100%; background:var(--ball); color:var(--ink); }
.cs-career-next:hover { background:var(--ball-soft); }
/* Share — solid green-blue accent */
.cs-share-btn { background:var(--hard); color:#fff; }
.cs-share-btn:hover { background:#46b0e8; color:#fff; }

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
.cs-modal { position:fixed; inset:0; background:rgba(7,28,16,.78); display:flex; align-items:center; justify-content:center; padding:20px; z-index:50; overflow-y:auto; }
.cs-card-share { background:var(--grass-mid); border:2.5px solid var(--chalk); border-radius:8px; max-width:380px; width:100%; padding:28px 26px 24px; position:relative; text-align:center; max-height:90vh; overflow-y:auto; }
.cs-modal-x { position:sticky; top:0; float:right; margin:-12px -10px 0 0; background:var(--grass-mid); border:none; font-size:30px; line-height:1; cursor:pointer; color:var(--chalk); z-index:2; width:40px; height:40px; border-radius:50%; }
.cs-modal-x:hover { color:var(--ball); }
.cs-share-done { margin-top:14px; width:100%; background:transparent; border:2px solid var(--chalk); color:var(--chalk); font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:15px; letter-spacing:.06em; text-transform:uppercase; padding:12px; border-radius:6px; cursor:pointer; transition:background .15s,color .15s; }
.cs-share-done:hover { background:var(--chalk); color:var(--grass-deep); }
.cs-career-share-tier { font-family:"Barlow Condensed",sans-serif; font-weight:900; font-size:20px; letter-spacing:.04em; color:var(--ball); text-transform:uppercase; margin:4px 0 16px; }
.cs-career-share-stats { display:flex; justify-content:center; gap:18px; margin-bottom:18px; }
.cs-career-share-stat { display:flex; flex-direction:column; align-items:center; }
.cs-css-num { font-family:"Barlow Condensed",sans-serif; font-weight:900; font-size:40px; color:var(--ball); line-height:1; }
.cs-css-lbl { font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:var(--dim); font-weight:700; }
.cs-retire-actions-row { display:flex; flex-direction:column; gap:10px; max-width:340px; margin:0 auto; }
.cs-share-brand { font-family:"Barlow Condensed",sans-serif; font-weight:800; letter-spacing:.16em; font-size:13px; color:var(--ball); text-transform:uppercase; }
.cs-share-headline { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:34px; line-height:1.05; letter-spacing:0; margin:6px 0 18px; text-transform:uppercase; color:var(--chalk); }
.cs-share-headline.slam { color:var(--ball); }
/* begin the season screen */
/* ---- CAREER MODE CSS ---- */

/* Mode pick */
.cs-mode-pick { padding-top:24px; }
.cs-mode-btns { display:flex; flex-direction:column; gap:14px; max-width:520px; margin-top:4px; }
.cs-stats-bar { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; max-width:520px; margin:16px 0 8px; }
.cs-stat { display:flex; flex-direction:column; align-items:center; gap:2px; padding:12px 6px; background:rgba(246,251,239,.05); border-radius:8px; border:1px solid var(--line-soft); }
.cs-stat-num { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:26px; color:var(--ball); line-height:1; }
.cs-stat-label { font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--dim); font-weight:700; text-align:center; }
.cs-mode-single-wrap { border:2.5px solid var(--chalk); border-radius:8px; padding:20px 22px; background:rgba(246,251,239,.05); display:flex; flex-direction:column; gap:10px; position:relative; z-index:0; }
.cs-mode-single-label { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:22px; text-transform:uppercase; color:var(--chalk); }
.cs-mode-single-desc { font-size:14px; color:var(--dim); line-height:1.5; }
.cs-mode-tour-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:4px; }
.cs-mode-tour-btn { display:flex; flex-direction:column; align-items:center; gap:2px; padding:12px 8px; border-radius:6px; border:2px solid var(--ball); background:rgba(216,240,0,.08); cursor:pointer; transition:background .15s,transform .1s; font-family:inherit; touch-action:manipulation; -webkit-tap-highlight-color:rgba(216,240,0,.3); position:relative; z-index:1; }
.cs-mode-tour-btn:hover { background:var(--ball); transform:translateY(-2px); }
.cs-mode-tour-btn:hover .cs-mode-tour-name,.cs-mode-tour-btn:hover .cs-mode-tour-sub { color:var(--ink); }
.cs-mode-tour-name { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:26px; color:var(--ball); line-height:1; }
.cs-mode-tour-sub { font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--dim); font-weight:700; }
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
.cs-gen-player.rolling .cs-gen-name { animation:cs-roll .07s linear infinite; color:var(--ball-soft); }
.cs-gen-player.rolling .cs-gen-flag { animation:cs-roll .07s linear infinite; }
@keyframes cs-roll { 0%{opacity:.5; transform:translateY(-1px)} 50%{opacity:1} 100%{opacity:.5; transform:translateY(1px)} }
@media (prefers-reduced-motion: reduce){ .cs-gen-player.rolling .cs-gen-name, .cs-gen-player.rolling .cs-gen-flag { animation:none; } }
.cs-gen-flag { font-size:42px; }
.cs-gen-name { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:32px; color:var(--chalk); text-transform:uppercase; }
.cs-create-custom { display:flex; flex-direction:column; gap:14px; margin-bottom:24px; }
.cs-create-field { display:flex; flex-direction:column; gap:6px; margin-bottom:18px; }
.cs-create-label { font-size:11px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; color:var(--dim); }
.cs-create-input, .cs-create-select { background:rgba(246,251,239,.08); border:1.5px solid var(--line); border-radius:6px; color:var(--chalk); font-size:17px; font-weight:600; padding:12px 14px; width:100%; box-sizing:border-box; }
.cs-create-input:focus, .cs-create-select:focus { outline:none; border-color:var(--ball); }
.cs-create-hint { font-size:12px; color:var(--dim); margin-top:4px; }
.cs-age-btns { display:flex; gap:8px; flex-wrap:wrap; }
.cs-start-note { display:flex; flex-direction:column; gap:6px; }
.cs-start-age { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:28px; color:var(--ball); text-transform:uppercase; }.cs-age-btn { background:rgba(246,251,239,.07); border:1.5px solid var(--line-soft); border-radius:8px; color:var(--dim); font-size:18px; font-weight:800; padding:10px 20px; cursor:pointer; transition:.18s; }
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
.cs-coach-card { display:flex; gap:12px; align-items:flex-start; background:rgba(216,240,0,.08); border:1px solid var(--ball); border-radius:8px; padding:12px 14px; margin:8px 0 14px; }
.cs-coach-avatar { font-size:26px; line-height:1; flex:0 0 auto; }
.cs-coach-body { display:flex; flex-direction:column; gap:2px; }
.cs-coach-name { font-size:10px; letter-spacing:.16em; text-transform:uppercase; font-weight:800; color:var(--ball-soft); }
.cs-coach-line { font-size:14px; line-height:1.5; color:var(--chalk); margin:0; font-style:italic; }
.cs-upgrade-title { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:20px; text-transform:uppercase; color:var(--chalk); margin:0 0 4px; }
.cs-upgrade-sub { font-size:13px; color:var(--dim); margin:0 0 14px; }
.cs-upgrade-grid { display:flex; flex-direction:column; gap:10px; }
.cs-upgrade-btn { display:flex; flex-direction:column; gap:6px; padding:16px 18px; border:2px solid var(--line-soft); border-radius:8px; background:rgba(246,251,239,.05); cursor:pointer; text-align:left; transition:.18s; position:relative; }
.cs-upgrade-btn.coach-pick { border-color:var(--ball); background:rgba(216,240,0,.07); }
.cs-coach-pick-badge { font-size:10px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--ink); background:var(--ball); border-radius:10px; padding:2px 8px; align-self:flex-start; margin-bottom:2px; }
.cs-upgrade-btn:hover { border-color:var(--ball); background:rgba(216,240,0,.08); transform:translateX(4px); }
.cs-upgrade-btn.recovery { border-color:rgba(111,191,115,.4); background:rgba(111,191,115,.07); }
.cs-upgrade-label { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:18px; text-transform:uppercase; color:var(--chalk); }
.cs-upgrade-desc { font-size:13px; color:var(--dim); line-height:1.4; }
.cs-upgrade-effects { display:flex; gap:8px; flex-wrap:wrap; margin-top:2px; }
.cs-upgrade-effect { font-size:11px; font-weight:800; padding:2px 8px; border-radius:10px; }
.cs-upgrade-effect.pos { background:rgba(111,191,115,.2); color:var(--grass); }
.cs-upgrade-effect.neg { background:rgba(210,105,63,.18); color:var(--clay); }
.cs-upgrade-warning { font-size:11px; color:var(--ball-soft); font-weight:700; }
.cs-final-season-banner { background:rgba(216,240,0,.1); border:1.5px solid var(--ball); border-radius:8px; padding:12px 16px; font-size:14px; color:var(--chalk); margin-bottom:16px; line-height:1.5; }
.cs-final-season-banner strong { color:var(--ball); }
.cs-retirement-prompt { background:rgba(210,105,63,.1); border:1.5px solid rgba(210,105,63,.4); border-radius:8px; padding:16px; margin-top:16px; }
.cs-retirement-prompt p { font-size:14px; color:var(--chalk); margin:0 0 12px; }
.cs-retire-actions { display:flex; gap:12px; align-items:center; flex-wrap:wrap; }

/* Retirement screen */
.cs-legacy-clipping { background:#f5f0e4; color:#1a1a1a; border-radius:8px; padding:20px 22px; margin-bottom:28px; text-align:left; }
.cs-legacy-masthead { font-family:"Barlow Condensed",sans-serif; font-weight:900; font-size:11px; letter-spacing:.32em; text-transform:uppercase; color:#555; border-bottom:2px solid #1a1a1a; padding-bottom:6px; margin-bottom:4px; }
.cs-legacy-subhead { font-size:10px; letter-spacing:.2em; text-transform:uppercase; color:#777; font-weight:700; margin-bottom:10px; }
.cs-legacy-headline { font-family:"Barlow Condensed",sans-serif; font-weight:900; font-size:22px; line-height:1.1; text-transform:uppercase; margin:0 0 10px; color:#111; }
.cs-legacy-body { font-size:14px; line-height:1.6; color:#333; margin:0; }
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
button.cs-trophy { border:none; font-family:inherit; cursor:pointer; transition:transform .12s; }
button.cs-trophy:hover { transform:translateY(-3px); }
button.cs-trophy:focus-visible { outline:3px solid var(--ball); outline-offset:2px; }
.cs-trophy-detail { background:var(--grass-dark); border:2.5px solid var(--ball); border-radius:12px; padding:28px 26px; max-width:360px; width:90%; text-align:center; position:relative; box-shadow:0 18px 50px rgba(0,0,0,.5); }
.cs-trophy-detail-icon { font-size:48px; display:block; margin-bottom:6px; }
.cs-trophy-detail-title { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:26px; text-transform:uppercase; margin:0 0 4px; color:var(--chalk); }
.cs-trophy-detail-year { font-size:12px; letter-spacing:.1em; text-transform:uppercase; color:var(--dim); font-weight:700; }
.cs-trophy-detail-final { display:flex; flex-direction:column; gap:4px; margin:18px 0 0; padding:14px; background:rgba(14,42,26,.4); border-radius:8px; }
.cs-trophy-detail-label { font-size:10px; letter-spacing:.16em; text-transform:uppercase; color:var(--dim); font-weight:800; }
.cs-trophy-detail-opp { font-size:16px; font-weight:700; color:var(--chalk); }
.cs-trophy-detail-score { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:24px; color:var(--ball-soft); letter-spacing:.04em; }
.cs-trophy-detail-note { font-size:13px; color:var(--clay); font-weight:600; margin:12px 0 0; }.cs-trophy.slam-rg  { background:linear-gradient(135deg,#b84a1a,#e07a3f); }
.cs-trophy.slam-wim { background:linear-gradient(135deg,#3d1a6b,#5a2d82); }
.cs-trophy.slam-uso { background:linear-gradient(135deg,#0a2e63,#1456b0); }
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
.cs-share-build-toggle { background:rgba(246,251,239,.1); border:1px solid var(--line); color:var(--chalk); font-weight:700; font-size:12px; letter-spacing:.06em; text-transform:uppercase; padding:8px 14px; border-radius:6px; cursor:pointer; margin-bottom:10px; width:100%; }
.cs-share-build-toggle:hover { background:rgba(216,240,0,.14); border-color:var(--ball); }
.cs-share-build { display:flex; flex-direction:column; gap:1px; margin-bottom:14px; background:rgba(14,42,26,.3); border-radius:6px; padding:6px 10px; }
.cs-share-build-row { display:flex; justify-content:space-between; gap:10px; font-size:12.5px; padding:5px 0; border-bottom:1px solid var(--line-soft); }
.cs-share-build-row:last-child { border-bottom:none; }
.cs-share-build-attr { font-weight:700; color:var(--chalk); }
.cs-share-build-val { color:var(--dim); text-align:right; }
.cs-share-build-val strong { color:var(--ball-soft); }.cs-share-slam-btn { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:8px; }
.cs-share-slam-btn.slam-ao  { background:linear-gradient(135deg,#1a5fb8,#2b7de9); }
.cs-share-slam-btn.slam-rg  { background:linear-gradient(135deg,#b84a1a,#e07a3f); }
.cs-share-slam-btn.slam-wim { background:linear-gradient(135deg,#3d1a6b,#5a2d82); }
.cs-share-slam-btn.slam-uso { background:linear-gradient(135deg,#0a2e63,#1456b0); }
.cs-share-slam-name { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:15px; text-transform:uppercase; color:#fff; min-width:130px; }
.cs-share-slam-result { font-size:20px; }
.cs-share-slam-detail { font-size:12px; color:rgba(255,255,255,.8); font-weight:600; flex:1; text-align:right; }
.cs-share-mode { font-size:12px; color:var(--dim); margin-bottom:18px; }
.cs-share-copy { width:100%; }
.cs-share-preview { font-family:ui-monospace,monospace; font-size:11px; text-align:left; background:rgba(7,28,16,.4); border-radius:4px; padding:10px; margin:14px 0 0; white-space:pre-wrap; line-height:1.5; color:var(--chalk); }
.cs-draft-foot { font-size:13px; color:var(--dim); margin-top:18px; }

/* RESULT */
.cs-result { padding-top:28px; }
.cs-confetti { position:fixed; inset:0; pointer-events:none; z-index:9999; overflow:hidden; }
.cs-confetti-piece { position:absolute; top:-16px; left:var(--x); width:10px; height:10px; border-radius:2px; background:hsl(var(--hue),90%,60%); animation:cs-fall var(--dur,1s) var(--delay,0s) ease-in 1 forwards; transform-origin:center; }
@keyframes cs-fall { 0%{transform:translateY(0) rotate(0deg) scale(1);opacity:1} 80%{opacity:1} 100%{transform:translateY(105vh) rotate(720deg) scale(0.7);opacity:0} }
.cs-tier { border:2.5px solid var(--chalk); border-radius:6px; padding:26px; text-align:center; margin-bottom:22px; background:rgba(246,251,239,.04); }
.cs-tier.glow { border-color:var(--ball); background:rgba(216,240,0,.1); box-shadow:0 0 0 4px rgba(216,240,0,.14); }
.cs-tier-eyebrow { font-size:10px; letter-spacing:.18em; text-transform:uppercase; font-weight:800; color:var(--dim); margin-bottom:4px; }
.cs-tier-count { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:58px; line-height:1; color:var(--chalk); }
.cs-tier-name { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:26px; letter-spacing:.04em; text-transform:uppercase; margin:4px 0; color:var(--chalk); }
.cs-tier.glow .cs-tier-name { color:var(--ball); }
.cs-tier-note { font-size:14px; color:var(--dim); max-width:44ch; margin:0 auto; }
.cs-diagnosis { background:rgba(246,251,239,.06); border-left:3px solid var(--ball); border-radius:6px; padding:14px 16px; margin-bottom:22px; text-align:left; }
.cs-diagnosis-title { font-family:"Barlow Condensed",sans-serif; font-weight:800; font-size:14px; letter-spacing:.06em; text-transform:uppercase; color:var(--ball-soft); margin-bottom:6px; }
.cs-diagnosis-body { font-size:14px; line-height:1.55; color:var(--chalk); margin:0; }

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
  .cs-court { width:104px; flex:0 0 104px; filter:drop-shadow(0 2px 8px rgba(0,0,0,.35)); }
  .cs-figure { width:104px; flex:0 0 104px; }
  .cs-card { padding:14px 16px; }
  .cs-card-name { font-size:22px; }
  .cs-card-fact { font-size:12px; }
  .cs-mobile-fact { display:block; }
  .cs-tour-btns { grid-template-columns:1fr 1fr; }
  .cs-meters { gap:7px; margin-bottom:12px; }
  .cs-sticky { padding-top:6px; }
}
`;
