// ── SVG Full Island Road Loop ─────────────────────────────────────────────────
// Follows real SVG coastal road network clockwise:
// Kingstown → Leeward Highway north → Chateaubelair →
// Georgetown (windward) → Argyle Airport → Calliaqua → Kingstown
//
// Elevation clamped to coastal max 50 — road never climbs mountains
// When roadDist reaches totalLength it wraps to 0 — infinite loop

export const COASTAL_MAX_Y = 50;

export const ROAD_LOOP = [

  // ── KINGSTOWN CENTRE ──────────────────────────────────────────────────────
  [5278,  -8550],  // spawn / Kingstown harbour
  [5200,  -8300],
  [5100,  -8100],
  [5000,  -7900],

  // ── LEEWARD HIGHWAY GOING NORTH ───────────────────────────────────────────
  [4900,  -7600],
  [4780,  -7300],
  [4650,  -7000],
  [4520,  -6700],
  [4400,  -6400],  // Questelles area
  [4280,  -6100],
  [4160,  -5800],
  [4050,  -5500],  // Layou river crossing
  [3950,  -5200],
  [3860,  -4900],
  [3780,  -4600],
  [3720,  -4300],  // Barrouallie
  [3670,  -4000],
  [3630,  -3700],
  [3600,  -3400],
  [3580,  -3100],
  [3570,  -2800],
  [3580,  -2500],
  [3600,  -2200],
  [3630,  -1900],
  [3670,  -1600],
  [3710,  -1300],
  [3760,  -1000],
  [3820,   -700],
  [3890,   -400],
  [3970,   -100],  // Chateaubelair
  [4060,    200],
  [4150,    500],

  // ── NORTH TIP ─────────────────────────────────────────────────────────────
  [4300,    800],
  [4500,   1000],
  [4700,   1100],  // Sandy Bay / Fancy area
  [4900,   1050],
  [5100,    900],
  [5300,    700],

  // ── WINDWARD HIGHWAY GOING SOUTH ─────────────────────────────────────────
  [5500,    400],
  [5650,    100],
  [5780,   -200],
  [5880,   -500],
  [5960,   -800],
  [6020,  -1100],
  [6060,  -1400],
  [6080,  -1700],
  [6080,  -2000],
  [6060,  -2300],
  [6020,  -2600],
  [5970,  -2900],
  [5900,  -3200],  // Georgetown
  [5820,  -3500],
  [5740,  -3800],
  [5650,  -4100],
  [5560,  -4400],
  [5470,  -4700],
  [5380,  -5000],
  [5300,  -5300],
  [5230,  -5600],
  [5180,  -5900],  // Biabou area
  [5150,  -6200],
  [5140,  -6500],

  // ── ARGYLE AIRPORT APPROACH ───────────────────────────────────────────────
  [5160,  -6800],
  [5200,  -7100],
  [5260,  -7400],  // Argyle airport frontage — terminal visible east
  [5340,  -7700],
  [5400,  -7900],  // Passing airport runway threshold

  // ── CALLIAQUA / VILLA BACK TO KINGSTOWN ───────────────────────────────────
  [5420,  -8050],
  [5380,  -8150],
  [5340,  -8250],
  [5310,  -8380],
  [5278,  -8550],  // Back to Kingstown — loop complete
];