export const MAIN_LORE = `Aelys Nox est le dernier Cartographe du Voile. Son ordre a disparu quand le Coeur d'Onyx a ete fracture en sept eclats. Depuis, chaque region est recouverte d'une brume vivante qui devore memoires et royaumes. Aelys porte une marque qui revele les zones oubliees mais attire aussi les seigneurs du Neant. Son serment: reunir les eclats, fermer les failles, et decider si le monde merite encore d'etre sauve.`

export const DIFFICULTY_CONFIG = {
  normal: {
    id: 'normal',
    label: 'Normal',
    enemyHpMultiplier: 1,
    enemyDamageMultiplier: 1,
    enemyArmorMultiplier: 1,
    enemyTacticsMultiplier: 1,
    playerStatusMultiplier: 1,
    enemyStatusMultiplier: 1,
    xpMultiplier: 1,
    lootMultiplier: 1,
    permadeath: false,
  },
  hard: {
    id: 'hard',
    label: 'Difficile',
    enemyHpMultiplier: 1.28,
    enemyDamageMultiplier: 1.25,
    enemyArmorMultiplier: 1.1,
    enemyTacticsMultiplier: 1.16,
    playerStatusMultiplier: 0.93,
    enemyStatusMultiplier: 1.1,
    xpMultiplier: 1.2,
    lootMultiplier: 1.1,
    permadeath: false,
  },
  hardcore: {
    id: 'hardcore',
    label: 'Hardcore',
    enemyHpMultiplier: 1.45,
    enemyDamageMultiplier: 1.4,
    enemyArmorMultiplier: 1.2,
    enemyTacticsMultiplier: 1.28,
    playerStatusMultiplier: 0.86,
    enemyStatusMultiplier: 1.2,
    xpMultiplier: 1.35,
    lootMultiplier: 1.2,
    permadeath: true,
  },
}

export const RARITIES = {
  common: {
    id: 'common',
    label: 'Commun',
    color: '#b3bac5',
    powerMultiplier: 1,
    valueMultiplier: 1,
  },
  uncommon: {
    id: 'uncommon',
    label: 'Peu commun',
    color: '#4eba74',
    powerMultiplier: 1.18,
    valueMultiplier: 1.35,
  },
  rare: {
    id: 'rare',
    label: 'Rare',
    color: '#4ea5ff',
    powerMultiplier: 1.4,
    valueMultiplier: 1.7,
  },
  epic: {
    id: 'epic',
    label: 'Epique',
    color: '#a468ff',
    powerMultiplier: 1.7,
    valueMultiplier: 2.2,
  },
  legendary: {
    id: 'legendary',
    label: 'Legendaire',
    color: '#ffb347',
    powerMultiplier: 2.05,
    valueMultiplier: 3,
  },
  mythic: {
    id: 'mythic',
    label: 'Mythique',
    color: '#ff5d86',
    powerMultiplier: 2.45,
    valueMultiplier: 5,
  },
}

export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']

export const PLAYER_ASSET = '/assets/Entities/Characters/Body_A/Animations/Idle_Base/Idle_Down-Sheet.png'
export const KNIGHT_ASSET = "/assets/Entities/Npc's/Knight/Idle/Idle-Sheet.png"
export const ROGUE_ASSET = "/assets/Entities/Npc's/Rogue/Idle/Idle-Sheet.png"
export const WIZZARD_ASSET = "/assets/Entities/Npc's/Wizzard/Idle/Idle-Sheet.png"
export const ORC_ASSET = '/assets/Entities/Mobs/Orc Crew/Orc/Idle/Idle-Sheet.png'
export const ORC_ROGUE_ASSET = '/assets/Entities/Mobs/Orc Crew/Orc - Rogue/Idle/Idle-Sheet.png'
export const ORC_SHAMAN_ASSET = '/assets/Entities/Mobs/Orc Crew/Orc - Shaman/Idle/Idle-Sheet.png'
export const ORC_WARRIOR_ASSET = '/assets/Entities/Mobs/Orc Crew/Orc - Warrior/Idle/Idle-Sheet.png'
export const SKELETON_ASSET = '/assets/Entities/Mobs/Skeleton Crew/Skeleton - Base/Idle/Idle-Sheet.png'
export const SKELETON_MAGE_ASSET = '/assets/Entities/Mobs/Skeleton Crew/Skeleton - Mage/Idle/Idle-Sheet.png'
export const SKELETON_ROGUE_ASSET = '/assets/Entities/Mobs/Skeleton Crew/Skeleton - Rogue/Idle/Idle-Sheet.png'
export const SKELETON_WARRIOR_ASSET = '/assets/Entities/Mobs/Skeleton Crew/Skeleton - Warrior/Idle/Idle-Sheet.png'

