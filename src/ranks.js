export const PSP_RANKS = [
  { id: 'str', name: 'Strażak', short: 'str.', xpRequired: 0, korpus: 'Szeregowi' },
  { id: 'st_str', name: 'Starszy strażak', short: 'st. str.', xpRequired: 50, korpus: 'Szeregowi' },
  { id: 'sekc', name: 'Sekcyjny', short: 'sekc.', xpRequired: 120, korpus: 'Podoficerowie' },
  { id: 'st_sekc', name: 'Starszy sekcyjny', short: 'st. sekc.', xpRequired: 250, korpus: 'Podoficerowie' },
  { id: 'ml_ogn', name: 'Młodszy ogniomistrz', short: 'mł. ogn.', xpRequired: 400, korpus: 'Podoficerowie' },
  { id: 'ogn', name: 'Ogniomistrz', short: 'ogn.', xpRequired: 600, korpus: 'Podoficerowie' },
  { id: 'st_ogn', name: 'Starszy ogniomistrz', short: 'st. ogn.', xpRequired: 850, korpus: 'Podoficerowie' },
  { id: 'ml_asp', name: 'Młodszy aspirant', short: 'mł. asp.', xpRequired: 1200, korpus: 'Aspiranci' },
  { id: 'asp', name: 'Aspirant', short: 'asp.', xpRequired: 1600, korpus: 'Aspiranci' },
  { id: 'st_asp', name: 'Starszy aspirant', short: 'st. asp.', xpRequired: 2100, korpus: 'Aspiranci' },
  { id: 'asp_sztab', name: 'Aspirant sztabowy', short: 'asp. sztab.', xpRequired: 2700, korpus: 'Aspiranci' },
  { id: 'ml_kpt', name: 'Młodszy kapitan', short: 'mł. kpt.', xpRequired: 3500, korpus: 'Oficerowie' },
  { id: 'kpt', name: 'Kapitan', short: 'kpt.', xpRequired: 4500, korpus: 'Oficerowie' },
  { id: 'st_kpt', name: 'Starszy kapitan', short: 'st. kpt.', xpRequired: 5800, korpus: 'Oficerowie' },
  { id: 'ml_bryg', name: 'Młodszy brygadier', short: 'mł. bryg.', xpRequired: 7500, korpus: 'Oficerowie' },
  { id: 'bryg', name: 'Brygadier', short: 'bryg.', xpRequired: 9500, korpus: 'Oficerowie' },
  { id: 'st_bryg', name: 'Starszy brygadier', short: 'st. bryg.', xpRequired: 12000, korpus: 'Oficerowie' }
];

export const getRankByXp = (xp, customRankId = null) => {
  // If a user has a manually overridden rank by admin, use it
  if (customRankId) {
    const customRank = PSP_RANKS.find(r => r.id === customRankId);
    if (customRank) return customRank;
  }
  
  // Otherwise, calculate rank by XP
  let currentRank = PSP_RANKS[0];
  for (const rank of PSP_RANKS) {
    if (xp >= rank.xpRequired) {
      currentRank = rank;
    } else {
      break;
    }
  }
  return currentRank;
};
