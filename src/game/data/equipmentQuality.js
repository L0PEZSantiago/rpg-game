// Système de qualité d'équipement : chaque objet (arme, armure, bijou) roule une
// qualité indépendamment de sa rareté, qui détermine ses stats principales dans une
// plage fixe et resserrée par rareté — plus de scaling exponentiel avec le niveau du
// joueur, qui produisait des objets aberrants (ex: arme épique à 35 d'attaque).

export const EQUIPMENT_QUALITY_ORDER = ['poor', 'good', 'perfect']

export const EQUIPMENT_QUALITY = {
  poor: {
    id: 'poor',
    label: 'Piètre qualité',
    dropWeight: 60,
    icon: '/assets/Icons/quality_poor.svg',
  },
  good: {
    id: 'good',
    label: 'De bonne facture',
    dropWeight: 30,
    icon: '/assets/Icons/quality_good.svg',
  },
  perfect: {
    id: 'perfect',
    label: 'Forgé par les dieux',
    dropWeight: 10,
    icon: '/assets/Icons/quality_perfect.svg',
  },
}

// Armes : attaque uniquement.
export const WEAPON_ATTACK_RANGES = {
  common: { poor: [3, 4], good: [5, 6], perfect: [7, 8] },
  uncommon: { poor: [8, 9], good: [10, 11], perfect: [12, 13] },
  rare: { poor: [13, 14], good: [14, 15], perfect: [16, 17] },
  epic: { poor: [17, 18], good: [19, 20], perfect: [21, 22] },
  legendary: { poor: [22, 23], good: [24, 25], perfect: [26, 27] },
  mythic: { poor: [27, 28], good: [29, 30], perfect: [31, 32] },
}

// Armures : défense principale, avec un bonus d'attaque supplémentaire réservé à la
// qualité "Forgé par les dieux" à partir du rare.
export const ARMOR_DEFENSE_RANGES = {
  common: { poor: [4, 5], good: [6, 7], perfect: [7, 8] },
  uncommon: { poor: [8, 9], good: [10, 11], perfect: [12, 13] },
  rare: { poor: [13, 14], good: [15, 16], perfect: [16, 17] },
  epic: { poor: [17, 18], good: [19, 20], perfect: [21, 22] },
  legendary: { poor: [22, 23], good: [24, 25], perfect: [26, 27] },
  mythic: { poor: [27, 28], good: [29, 30], perfect: [31, 32] },
}

export const ARMOR_PERFECT_ATTACK_BONUS = {
  common: 0,
  uncommon: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
  mythic: 4,
}

// Bijoux : même plage appliquée indépendamment à l'attaque et à la défense.
export const TRINKET_STAT_RANGES = {
  // Même échelle/progression que les autres emplacements, mais toutes les valeurs
  // divisées par 2 : les bijoux donnaient trop de stats brutes par rapport aux autres.
  common: { poor: [1, 2], good: [3, 3], perfect: [4, 4] },
  uncommon: { poor: [4, 5], good: [5, 6], perfect: [6, 7] },
  rare: { poor: [7, 7], good: [8, 8], perfect: [8, 9] },
  epic: { poor: [9, 9], good: [10, 10], perfect: [11, 11] },
  legendary: { poor: [11, 12], good: [12, 13], perfect: [13, 14] },
  mythic: { poor: [14, 14], good: [15, 15], perfect: [16, 16] },
}

// Distribution de rareté du loot d'équipement (somme = 100).
export const EQUIPMENT_RARITY_DROP_WEIGHTS = {
  common: 49,
  uncommon: 20,
  rare: 15,
  epic: 10,
  legendary: 5,
  mythic: 1,
}
