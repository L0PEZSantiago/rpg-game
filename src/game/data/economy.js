export const RESOURCE_TABLE = {
  tree: {
    name: 'Arbre',
    icon: '/assets/Weapons/Wood/Wood.png',
    drops: [
      { material: 'wood', min: 2, max: 4, chance: 1 },
      { material: 'resin', min: 1, max: 2, chance: 0.5 },
    ],
  },
  ore: {
    name: 'Veine de minerai',
    icon: '/assets/Weapons/Bone/Bone.png',
    drops: [
      { material: 'ore', min: 2, max: 4, chance: 1 },
      { material: 'obsidian_fragment', min: 1, max: 2, chance: 0.4 },
    ],
  },
  herb: {
    name: 'Herbes de brume',
    icon: '/assets/Weapons/Hands/Hands.png',
    drops: [
      { material: 'herb', min: 2, max: 3, chance: 1 },
      { material: 'ether_drop', min: 1, max: 2, chance: 0.35 },
    ],
  },
}

export const MATERIAL_LABELS = {
  wood: 'Bois brut',
  resin: 'Résine vive',
  ore: 'Minerai brut',
  obsidian_fragment: 'Fragment d\'obsidienne',
  herb: 'Herbe de brume',
  ether_drop: 'Goutte d\'ether',
  bone_dust: 'Poussière osseuse',
  boss_shard: 'Eclat de boss',
}

export const RECIPES = [
  {
    id: 'recipe_major_potion',
    name: 'Potion majeure',
    rarity: 'uncommon',
    description: 'Soin rapide en combat.',
    materials: { herb: 4, resin: 1 },
    result: {
      kind: 'consumable',
      name: 'Potion majeure',
      effect: 'heal_80',
      quantity: 1,
    },
  },
  {
    id: 'recipe_hunter_bow',
    name: 'Arc du traqueur',
    rarity: 'rare',
    description: 'Arme offensive polyvalente.',
    materials: { wood: 6, ore: 3, resin: 2 },
    result: {
      kind: 'equipment',
      slot: 'weapon',
      baseName: 'Arc du traqueur',
      attack: 6,
      defense: 1,
      value: 140,
      rarity: 'rare',
      weaponType: 'bow',
      rangeMin: 2,
      rangeMax: 3,
      icon: '/assets/Weapons/Wood/Wood.png',
    },
  },
  {
    id: 'recipe_bone_dagger',
    name: 'Dague osseuse',
    rarity: 'uncommon',
    description: 'Arme melee rapide.',
    materials: { bone_dust: 4, ore: 2 },
    result: {
      kind: 'equipment',
      slot: 'weapon',
      baseName: 'Dague osseuse',
      attack: 7,
      defense: 0,
      value: 96,
      rarity: 'uncommon',
      weaponType: 'melee',
      rangeMin: 1,
      rangeMax: 1,
      icon: '/assets/Weapons/Bone/Bone.png',
    },
  },
  {
    id: 'recipe_ritual_staff',
    name: 'Baton rituel',
    rarity: 'epic',
    description: 'Baton de lanceur a moyenne portee.',
    materials: { wood: 7, ether_drop: 3, obsidian_fragment: 2 },
    result: {
      kind: 'equipment',
      slot: 'weapon',
      baseName: 'Baton rituel',
      attack: 6,
      defense: 2,
      value: 240,
      rarity: 'epic',
      weaponType: 'staff',
      rangeMin: 2,
      rangeMax: 3,
      icon: '/assets/Weapons/Wood/Wood.png',
    },
  },
  {
    id: 'recipe_bark_armor',
    name: 'Armure d ecorce',
    rarity: 'rare',
    description: 'Armure polyvalente legere.',
    materials: { wood: 6, resin: 3, herb: 3 },
    result: {
      kind: 'equipment',
      slot: 'armor',
      baseName: 'Armure d ecorce',
      attack: 1,
      defense: 7,
      value: 180,
      rarity: 'rare',
      icon: '/assets/Weapons/Hands/Hands.png',
    },
  },
  {
    id: 'recipe_bastion_plate',
    name: 'Plastron bastion',
    rarity: 'epic',
    description: 'Armure defensive lourde.',
    materials: { ore: 8, obsidian_fragment: 4, bone_dust: 3 },
    result: {
      kind: 'equipment',
      slot: 'armor',
      baseName: 'Plastron bastion',
      attack: 2,
      defense: 10,
      value: 260,
      rarity: 'epic',
      icon: '/assets/Weapons/Hands/Hands.png',
    },
  },
  {
    id: 'recipe_void_charm',
    name: 'Charme du vide',
    rarity: 'legendary',
    description: 'Relique legendaire de support.',
    materials: { ether_drop: 6, obsidian_fragment: 6, boss_shard: 2 },
    result: {
      kind: 'equipment',
      slot: 'trinket',
      baseName: 'Charme du vide',
      attack: 6,
      defense: 6,
      value: 420,
      rarity: 'legendary',
      icon: '/assets/Weapons/Bone/Bone.png',
    },
  },
]

export const CONSUMABLES_SHOP = [
  {
    id: 'shop_potion',
    name: 'Potion majeure',
    price: 45,
    effect: 'heal_80',
  },
  {
    id: 'shop_mana',
    name: 'Elixir de mana',
    price: 40,
    effect: 'mana_60',
  },
  {
    id: 'shop_resist_tonic',
    name: 'Tonique de resistance',
    price: 62,
    effect: 'buff_resistance',
  },
  {
    id: 'shop_fury_draft',
    name: 'Fiole de furie',
    price: 64,
    effect: 'buff_damage',
  },
  {
    id: 'shop_focus_oil',
    name: 'Huile de focus',
    price: 68,
    effect: 'buff_crit',
  },
  {
    id: 'shop_recovery_kit',
    name: 'Kit de recuperation',
    price: 58,
    effect: 'heal_45_mana_35',
  },
  {
    id: 'shop_clarity_orb',
    name: 'Orbe de clarte',
    price: 72,
    effect: 'cleanse_and_guard',
  },
]

export const RARITY_BONUS_RULES = {
  epic: { min: 1, max: 1 },
  legendary: { min: 1, max: 2, secondChance: 0.36 },
  mythic: { min: 3, max: 3 },
}

export const EQUIPMENT_BONUS_POOL = [
  { id: 'bonus_hp', label: 'PV max', key: 'maxHpFlat', min: 16, max: 42, weight: 14 },
  { id: 'bonus_attack', label: 'Degats', key: 'attackFlat', min: 2, max: 7, weight: 11 },
  { id: 'bonus_defense', label: 'Armure', key: 'defenseFlat', min: 2, max: 6, weight: 12 },
  { id: 'bonus_crit', label: 'Chance crit', key: 'critChanceFlat', min: 0.02, max: 0.07, weight: 9, percent: true },
  { id: 'bonus_crit_damage', label: 'Degats crit', key: 'critDamageFlat', min: 0.08, max: 0.22, weight: 9, percent: true },
  { id: 'bonus_dodge', label: 'Chance esquive', key: 'dodgeChanceFlat', min: 0.02, max: 0.08, weight: 10, percent: true },
  { id: 'bonus_parry', label: 'Chance parade', key: 'parryChanceFlat', min: 0.02, max: 0.08, weight: 9, percent: true },
  { id: 'bonus_status', label: 'Chance desorienter', key: 'statusChanceFlat', min: 0.03, max: 0.1, weight: 8, percent: true },
  { id: 'bonus_resist', label: 'Resistance etats', key: 'statusResistFlat', min: 0.03, max: 0.12, weight: 8, percent: true },
  { id: 'bonus_regen', label: 'Regen PV/tour', key: 'lifeRegenFlat', min: 2, max: 7, weight: 7 },
  { id: 'bonus_mana_regen', label: 'Regen mana/tour', key: 'manaRegenFlat', min: 3, max: 9, weight: 7 },
]

export const LOOT_BASES = {
  weapon: [
    {
      name: 'Lame fendue',
      attack: 6,
      defense: 0,
      value: 60,
      weaponType: 'melee',
      rangeMin: 1,
      rangeMax: 1,
      icon: '/assets/Weapons/Hands/Hands.png',
    },
    {
      name: 'Glaive du voile',
      attack: 7,
      defense: 1,
      value: 78,
      weaponType: 'melee',
      rangeMin: 1,
      rangeMax: 1,
      icon: '/assets/Weapons/Bone/Bone.png',
    },
    {
      name: 'Fendoir des catacombes',
      attack: 5,
      defense: 1,
      value: 96,
      weaponType: 'staff',
      rangeMin: 2,
      rangeMax: 3,
      icon: '/assets/Weapons/Wood/Wood.png',
    },
    {
      name: 'Arc osseux',
      attack: 5,
      defense: 0,
      value: 88,
      weaponType: 'bow',
      rangeMin: 2,
      rangeMax: 3,
      icon: '/assets/Weapons/Wood/Wood.png',
    },
  ],
  armor: [
    { name: 'Cuir recousu', attack: 0, defense: 4, value: 58, icon: '/assets/Weapons/Hands/Hands.png' },
    { name: 'Plastron noirci', attack: 1, defense: 6, value: 82, icon: '/assets/Weapons/Hands/Hands.png' },
    { name: 'Armure nervuree', attack: 0, defense: 8, value: 110, icon: '/assets/Weapons/Hands/Hands.png' },
  ],
  trinket: [
    { name: 'Talisman fendu', attack: 2, defense: 2, value: 70, icon: '/assets/Weapons/Bone/Bone.png' },
    { name: 'Anneau de cendre', attack: 3, defense: 1, value: 84, icon: '/assets/Weapons/Bone/Bone.png' },
    { name: 'Idole des ruines', attack: 4, defense: 2, value: 122, icon: '/assets/Weapons/Bone/Bone.png' },
  ],
}

export const EQUIPMENT_SLOTS = ['weapon', 'armor', 'trinket']

