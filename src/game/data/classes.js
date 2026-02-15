import { PLAYER_ASSET, ROGUE_ASSET, SKELETON_MAGE_ASSET, WIZZARD_ASSET } from './constants'
import skilltreeData from '../skilltree.json'

const sharedPassives = {
  survival_instinct: {
    id: 'survival_instinct',
    tier: 1,
    name: 'Instinct de survie',
    description: '+16 PV max.',
    requires: null,
    bonuses: { maxHpFlat: 16 },
  },
  soul_pulse: {
    id: 'soul_pulse',
    tier: 2,
    name: 'Impulsion de l\'âme',
    description: '+8% Dégâts globaux.',
    requires: 'survival_instinct',
    bonuses: { damagePercent: 0.08 },
  },
  iron_focus: {
    id: 'iron_focus',
    tier: 3,
    name: 'Focus de fer',
    description: 'Limite de PA +1 de combat.',
    requires: 'soul_pulse',
    bonuses: { apFlat: 1 },
  },
}

const RAW_CLASS_DEFINITIONS = [
  {
    id: 'mage',
    name: 'Mage',
    fantasy: 'Arcaniste de rupture',
    intro: 'Un mage aguéri, servant le bien et contrôlant la puissance du mana.',
    portrait: WIZZARD_ASSET,
    weapon: '/assets/Weapons/Wood/Wood.png',
    baseStats: {
      maxHp: 92,
      maxMana: 162,
      attack: 11,
      defense: 8,
      speed: 10,
      critChance: 0.12,
      ap: 6,
      mp: 3,
    },
    skills: [
      {
        id: 'mage_arc_burst',
        name: 'Eclair runique',
        unlockLevel: 1,
        description: 'Projectile arcanique rapide.',
        apCost: 3,
        manaCost: 10,
        cooldown: 1,
        effect: 'damage',
        power: 1.65,
      },
      {
        id: 'mage_nova',
        name: 'Nova de verre',
        unlockLevel: 2,
        description: 'Explosion concentree qui ignore une partie de l\'armure de la cible.',
        apCost: 4,
        manaCost: 16,
        cooldown: 2,
        effect: 'damage',
        power: 2.2,
        armorPen: 0.28,
      },
      {
        id: 'mage_astral_wall',
        name: 'Mur astral',
        unlockLevel: 4,
        description: 'Vous protège avec un bouclier magique temporaire.',
        apCost: 3,
        manaCost: 14,
        cooldown: 3,
        effect: 'shield',
        shieldRatio: 0.42,
      },
      {
        id: 'mage_entropy_mark',
        name: 'Marque d\'entropie',
        unlockLevel: 6,
        description: 'Pose une marque sur la cible infligeant des dégâts pendant 3 tours.',
        apCost: 4,
        manaCost: 19,
        cooldown: 3,
        effect: 'dot',
        power: 0.75,
        dotKind: 'burn',
        impactPower: 0.55,
        dotTurns: 3,
      },
      {
        id: 'mage_void_ray',
        name: 'Rayon du vide',
        unlockLevel: 8,
        description: 'Canalise le mana pour envoyer un rayon à haute energie.',
        apCost: 5,
        manaCost: 28,
        cooldown: 4,
        effect: 'damage',
        power: 2.75,
      },
    ],
    passives: [
      sharedPassives.survival_instinct,
      {
        id: 'mana_well',
        tier: 1,
        name: 'Puits de mana',
        description: '+30 mana max.',
        requires: null,
        bonuses: { maxManaFlat: 30 },
      },
      {
        id: 'sigil_overdrive',
        tier: 2,
        name: 'Sceau en surchauffe',
        description: '+18% Dégâts magiques.',
        requires: 'mana_well',
        bonuses: { damagePercent: 0.18 },
      },
      {
        ...sharedPassives.iron_focus,
        requires: 'sigil_overdrive',
      },
      {
        id: 'mist_memory',
        tier: 4,
        name: 'Mémoire de la Brume',
        description: 'Regagne 8 de mana à chaque tour.',
        requires: 'sigil_overdrive',
        bonuses: { manaRegenFlat: 8 },
      },
    ],
  },
  {
    id: 'druid',
    name: 'Druide',
    fantasy: 'Gardien du cycle sauvage',
    intro: 'La forêt parle en lui, les ruines tremblent.',
    portrait: PLAYER_ASSET,
    weapon: '/assets/Weapons/Wood/Wood.png',
    baseStats: {
      maxHp: 116,
      maxMana: 134,
      attack: 11,
      defense: 11,
      speed: 8,
      critChance: 0.08,
      ap: 6,
      mp: 3,
    },
    skills: [
      {
        id: 'druid_thorn',
        name: 'Dard epineux',
        unlockLevel: 1,
        description: 'Inflige des degats de nature continus.',
        apCost: 3,
        manaCost: 9,
        cooldown: 0,
        effect: 'damage',
        power: 1.65,
      },
      {
        id: 'druid_regrowth',
        name: 'Regermination',
        unlockLevel: 2,
        description: 'Soin direct et régenération courte.',
        apCost: 4,
        manaCost: 13,
        cooldown: 2,
        effect: 'heal',
        healRatio: 0.78,
      },
      {
        id: 'druid_barkskin',
        name: 'Ecorce de guerre',
        unlockLevel: 4,
        description: 'Augmente l\'armure de 30% pendant 2 tours.',
        apCost: 3,
        manaCost: 12,
        cooldown: 3,
        effect: 'buff',
        buffType: 'defensePercent',
        buffValue: 0.3,
        buffTurns: 2,
      },
      {
        id: 'druid_rot',
        name: 'Douce pourriture',
        unlockLevel: 6,
        description: 'Empoissone l\'ennemi infligeant des dégâts pendant 4 tours.',
        apCost: 4,
        manaCost: 16,
        cooldown: 3,
        effect: 'dot',
        power: 0.68,
        dotKind: 'poison',
        impactPower: 0.45,
        dotTurns: 4,
      },
      {
        id: 'druid_wild_stampede',
        name: 'Charge de fauve',
        unlockLevel: 8,
        description: 'Attaque frontale lourde.',
        apCost: 5,
        manaCost: 21,
        cooldown: 4,
        effect: 'damage',
        power: 2.75,
      },
    ],
    passives: [
      sharedPassives.survival_instinct,
      {
        id: 'sap_blood',
        tier: 1,
        name: 'Sêve guerriere',
        description: '+12% soins reçus.',
        requires: null,
        bonuses: { healingTakenPercent: 0.12 },
      },
      {
        id: 'rooted_guard',
        tier: 2,
        name: 'Armure d\'écorce',
        description: '+3 défense.',
        requires: 'sap_blood',
        bonuses: { defenseFlat: 3 },
      },
      sharedPassives.soul_pulse,
      {
        id: 'moon_harvest',
        tier: 4,
        name: 'Moisson lunaire',
        description: '+20% ressources recoltees.',
        requires: 'rooted_guard',
        bonuses: { gatherBonus: 0.2 },
      },
    ],
  },
  {
    id: 'assassin',
    name: 'Assassin',
    fantasy: 'Lame du crépuscule',
    intro: 'Il frappe avant que le combat commence.',
    portrait: ROGUE_ASSET,
    weapon: '/assets/Weapons/Bone/Bone.png',
    baseStats: {
      maxHp: 97,
      maxMana: 108,
      attack: 13,
      defense: 8,
      speed: 14,
      critChance: 0.2,
      ap: 7,
      mp: 4,
    },
    skills: [
      {
        id: 'assassin_shadow_stab',
        name: 'Estoc d\'ombre',
        unlockLevel: 1,
        description: 'Attaque de mêlée précise et rapide.',
        apCost: 3,
        manaCost: 6,
        cooldown: 1,
        effect: 'damage',
        power: 1.65,
      },
      {
        id: 'assassin_fade',
        name: 'Pas de fadeur',
        unlockLevel: 2,
        description: 'Gagne +2 PA.',
        apCost: 0,
        manaCost: 10,
        cooldown: 3,
        effect: 'buff',
        buffType: 'apOnly',
        restoreAp: 2,
      },
      {
        id: 'assassin_rupture',
        name: 'Rupture arterielle',
        unlockLevel: 4,
        description: 'Coupe les artères de la cible infligeant un violent saignement.',
        apCost: 4,
        manaCost: 12,
        cooldown: 2,
        effect: 'dot',
        power: 0.86,
        dotKind: 'bleed',
        impactPower: 0.65,
        dotTurns: 3,
      },
      {
        id: 'assassin_blade_fan',
        name: 'Eventail de lames',
        unlockLevel: 6,
        description: 'Pluie de dagues concentree.',
        apCost: 4,
        manaCost: 14,
        cooldown: 2,
        effect: 'damage',
        power: 2.2,
      },
      {
        id: 'assassin_execution',
        name: 'Execution noire',
        unlockLevel: 8,
        description: 'Dégâts amplifiés sur les cibles faibles.',
        apCost: 5,
        manaCost: 20,
        cooldown: 4,
        effect: 'execute',
        power: 2.75,
        executeBonus: 0.65,
      },
    ],
    passives: [
      {
        id: 'venom_edge',
        tier: 1,
        name: 'Taillade vénimeuse',
        description: '+10% de dégâts sur la durée.',
        requires: null,
        bonuses: { dotPercent: 0.1 },
      },
      {
        id: 'night_stride',
        tier: 2,
        name: 'Foulée nocturne',
        description: 'Limite de PA +1.',
        requires: 'venom_edge',
        bonuses: { apFlat: 1 },
      },
      {
        ...sharedPassives.soul_pulse,
        requires: 'night_stride',
      },
      {
        id: 'killer_instinct',
        tier: 3,
        name: 'Instinct de tueur',
        description: '+8% chance de critique.',
        requires: 'night_stride',
        bonuses: { critChanceFlat: 0.08 },
      },
      {
        id: 'final_whisper',
        tier: 4,
        name: 'Dernier murmure',
        description: '+20% Dégâts contre les boss.',
        requires: 'killer_instinct',
        bonuses: { bossDamagePercent: 0.2 },
      },
    ],
  },
  {
    id: 'warrior',
    name: 'Guerrier',
    fantasy: 'Briseur de bastions',
    intro: 'Un mur d\'acier contre les tempêtes du Voile.',
    portrait: PLAYER_ASSET,
    weapon: '/assets/Weapons/Hands/Hands.png',
    baseStats: {
      maxHp: 138,
      maxMana: 88,
      attack: 12,
      defense: 15,
      speed: 7,
      critChance: 0.07,
      ap: 6,
      mp: 3,
    },
    skills: [
      {
        id: 'warrior_slash',
        name: 'Entaille lourde',
        unlockLevel: 1,
        description: 'Frappe mêlée fiable.',
        apCost: 3,
        manaCost: 4,
        cooldown: 1,
        effect: 'damage',
        power: 1.65,
      },
      {
        id: 'warrior_bulwark',
        name: 'Bastion d\'acier',
        unlockLevel: 2,
        description: 'Vous arme d\'un bouclier massif permettant de bloquer les coups ennemi.',
        apCost: 3,
        manaCost: 8,
        cooldown: 3,
        effect: 'shield',
        shieldRatio: 0.5,
      },
      {
        id: 'warrior_charge',
        name: 'Charge brise-ligne',
        unlockLevel: 4,
        description: 'Charge avec violence et desoriente la cible.',
        apCost: 3,
        manaCost: 9,
        cooldown: 3,
        effect: 'control',
        power: 1.05,
        statusEffect: { kind: 'topple', chance: 0.4, turns: 1, value: 1 },
      },
      {
        id: 'warrior_rally',
        name: 'Cri de ralliement',
        unlockLevel: 6,
        description: 'Attaque +30% pendant 2 tours.',
        apCost: 3,
        manaCost: 11,
        cooldown: 3,
        effect: 'buff',
        buffType: 'attackPercent',
        buffValue: 0.30,
        buffTurns: 2,
      },
      {
        id: 'warrior_titan_split',
        name: 'Fente titanique',
        unlockLevel: 8,
        description: 'Coup fatal très couteux.',
        apCost: 6,
        manaCost: 18,
        cooldown: 4,
        effect: 'damage',
        power: 3.3,
      },
    ],
    passives: [
      sharedPassives.survival_instinct,
      {
        id: 'steel_hide',
        tier: 1,
        name: 'Peau d\'acier',
        description: 'défense +4.',
        requires: null,
        bonuses: { defenseFlat: 4 },
      },
      {
        id: 'march_of_iron',
        tier: 2,
        name: 'Marche de fer',
        description: '+10% Dégâts quand tant que vos PV sont supérieurs 70%.',
        requires: 'steel_hide',
        bonuses: { highHpDamagePercent: 0.1 },
      },
      {
        ...sharedPassives.iron_focus,
        requires: 'march_of_iron',
      },
      {
        id: 'last_stand',
        tier: 4,
        name: 'Dernier rempart',
        description: 'Quand vos PV sont inférieurs à 30%, gagnez +25% armure.',
        requires: 'march_of_iron',
        bonuses: { lowHpDefensePercent: 0.25 },
      },
    ],
  },
  {
    id: 'archer',
    name: 'Archer',
    fantasy: 'Tireur des lignes perdues',
    intro: 'Chaque flèche corrige une erreur de l\'histoire.',
    portrait: ROGUE_ASSET,
    weapon: '/assets/Weapons/Wood/Wood.png',
    baseStats: {
      maxHp: 102,
      maxMana: 114,
      attack: 12,
      defense: 9,
      speed: 12,
      critChance: 0.16,
      ap: 6,
      mp: 4,
    },
    skills: [
      {
        id: 'archer_precise_shot',
        name: 'Tir de précision',
        unlockLevel: 1,
        description: 'Tir precis perçant.',
        apCost: 3,
        manaCost: 8,
        cooldown: 1,
        effect: 'damage',
        power: 1.65,
      },
      {
        id: 'archer_pin',
        name: 'Flèche d\'ancrage',
        unlockLevel: 2,
        description: 'Réduit les PA de la cible de 1 au tour suivant.',
        apCost: 3,
        manaCost: 10,
        cooldown: 2,
        effect: 'debuff',
        debuffType: 'enemyApPenalty',
        debuffValue: 1,
        debuffTurns: 1,
        power: 0.95,
      },
      {
        id: 'archer_rain',
        name: 'Pluie de flèches',
        unlockLevel: 4,
        description: 'Fais tomber une pluie de flèches sur les ennemis.',
        apCost: 5,
        manaCost: 15,
        cooldown: 3,
        effect: 'damage',
        power: 2.75,
      },
      {
        id: 'archer_camouflage',
        name: 'Camouflage tactique',
        unlockLevel: 6,
        description: 'Esquive la prochaine attaque.',
        apCost: 3,
        manaCost: 12,
        cooldown: 3,
        effect: 'buff',
        buffType: 'dodge',
        buffValue: 1,
        buffTurns: 1,
      },
      {
        id: 'archer_starfall',
        name: 'Chute stellaire',
        unlockLevel: 8,
        description: 'Fait tomber des cieux une flèche chargée en mana infligeant de lourds dégâts.',
        apCost: 6,
        manaCost: 22,
        cooldown: 4,
        effect: 'damage',
        power: 3.3,
      },
    ],
    passives: [
      {
        id: 'falcon_eyes',
        tier: 1,
        name: 'Oeil du faucon',
        description: '+3% degats globaux.',
        requires: null,
        bonuses: { damagePercent: 0.03 },
      },
      {
        id: 'hunter_stride',
        tier: 2,
        name: 'Foulée du chasseur',
        description: 'Limite de PA +1.',
        requires: 'falcon_eyes',
        bonuses: { apFlat: 1 },
      },
      {
        id: 'critical_draw',
        tier: 3,
        name: 'Tir critique',
        description: '+7% crit.',
        requires: 'hunter_stride',
        bonuses: { critChanceFlat: 0.07 },
      },
      {
        ...sharedPassives.soul_pulse,
        requires: 'critical_draw',
      },
      {
        id: 'predator_mark',
        tier: 4,
        name: 'Marque du prédateur',
        description: '+15% Dégâts globaux.',
        requires: 'critical_draw',
        bonuses: { damagePercent: 0.15 },
      },
    ],
  },
  {
    id: 'necromancer',
    name: 'Nécromancien',
    fantasy: 'Architecte des os et des dettes',
    intro: 'Maître dans la magie occulte',
    portrait: SKELETON_MAGE_ASSET,
    weapon: '/assets/Weapons/Bone/Bone.png',
    baseStats: {
      maxHp: 104,
      maxMana: 156,
      attack: 10,
      defense: 9,
      speed: 9,
      critChance: 0.1,
      ap: 6,
      mp: 3,
    },
    skills: [
      {
        id: 'necro_bone_spike',
        name: 'Piques osseuses',
        unlockLevel: 1,
        description: 'Envoie une déferlante de piques osseusses.',
        apCost: 3,
        manaCost: 9,
        cooldown: 0,
        effect: 'damage',
        power: 1.65,
      },
      {
        id: 'necro_drain',
        name: 'Drain vital',
        unlockLevel: 2,
        description: 'Draîne la vie de la cible.',
        apCost: 4,
        manaCost: 12,
        cooldown: 2,
        effect: 'lifesteal',
        power: 2.2,
        stealRatio: 0.45,
      },
      {
        id: 'necro_skeleton_oath',
        name: 'Serment des morts',
        unlockLevel: 4,
        description: 'Dégâts +20% pendant 3 tours.',
        apCost: 3,
        manaCost: 14,
        cooldown: 3,
        effect: 'buff',
        buffType: 'damagePercent',
        buffValue: 0.20,
        buffTurns: 3,
      },
      {
        id: 'necro_plague',
        name: 'Peste sepulcrale',
        unlockLevel: 6,
        description: 'Inflige des dégâts pendant 4 tours, idéal sur les boss.',
        apCost: 4,
        manaCost: 17,
        cooldown: 3,
        effect: 'dot',
        power: 0.78,
        dotKind: 'curse',
        impactPower: 0.5,
        dotTurns: 4,
      },
      {
        id: 'necro_oblivion',
        name: 'Pacte d\'Oblivion',
        unlockLevel: 8,
        description: 'Puissante rafale d\'orbes démoniaques.',
        apCost: 6,
        manaCost: 26,
        cooldown: 4,
        effect: 'damage',
        power: 3.3,
      },
    ],
    passives: [
      sharedPassives.survival_instinct,
      {
        id: 'grave_echo',
        tier: 1,
        name: 'Echo des tombes',
        description: '+12 mana regen/tour.',
        requires: null,
        bonuses: { manaRegenFlat: 12 },
      },
      {
        id: 'ossuary_shell',
        tier: 2,
        name: 'Carapace ossuaire',
        description: '+3 défense.',
        requires: 'grave_echo',
        bonuses: { defenseFlat: 3 },
      },
      {
        id: 'siphon_mastery',
        tier: 3,
        name: 'Maitrise du siphon',
        description: '+18% vol de vie.',
        requires: 'ossuary_shell',
        bonuses: { lifeStealPercent: 0.18 },
      },
      {
        ...sharedPassives.iron_focus,
        requires: 'siphon_mastery',
      },
    ],
  },
  {
    id: 'bard',
    name: 'Barde',
    fantasy: 'Chef d\'orchestre des ruines',
    intro: 'Ses accords plient les nerfs, les lames et la brume elle-même.',
    portrait: ROGUE_ASSET,
    weapon: '/assets/Weapons/Wood/Wood.png',
    baseStats: {
      maxHp: 108,
      maxMana: 132,
      attack: 10,
      defense: 10,
      speed: 11,
      critChance: 0.1,
      ap: 6,
      mp: 3,
    },
    skills: [
      {
        id: 'bard_harmony',
        name: 'Vive harmonie',
        unlockLevel: 1,
        description: 'Inflige des dégâts et vous soigne.',
        apCost: 3,
        manaCost: 12,
        cooldown: 2,
        effect: 'heal_and_damage',
        power: 1.5,
        healRatio: 0.5,
      },
      {
        id: 'bard_note_sharp',
        name: 'Note acérée',
        unlockLevel: 2,
        description: 'Dégâts sonore direct.',
        apCost: 3,
        manaCost: 8,
        cooldown: 0,
        effect: 'damage',
        power: 1.65,
      },
      {
        id: 'bard_march',
        name: 'Marche héroïque',
        unlockLevel: 4,
        description: '+25% d\'attaque et +2 vitesse de tour.',
        apCost: 3,
        manaCost: 13,
        cooldown: 3,
        effect: 'buff',
        buffType: 'attackPercent',
        buffValue: 0.25,
        buffTurns: 2,
      },
      {
        id: 'bard_discord',
        name: 'Discordance',
        unlockLevel: 6,
        description: 'Affaiblit l\'armure de l\'ennemie de 20% pendant 2 tours.',
        apCost: 4,
        manaCost: 16,
        cooldown: 3,
        effect: 'debuff',
        debuffType: 'enemyDefensePercent',
        debuffValue: 0.20,
        debuffTurns: 2,
        power: 0.9,
      },
      {
        id: 'bard_finale',
        name: 'Finale du voile',
        unlockLevel: 8,
        description: 'Crescendo dévastateur infligeant de lourds dégâts.',
        apCost: 6,
        manaCost: 24,
        cooldown: 4,
        effect: 'damage',
        power: 3.3,
      },
    ],
    passives: [
      {
        id: 'chorus_blood',
        tier: 1,
        name: 'Choeur de sang',
        description: '+10% d\'efficacité de guérison',
        requires: null,
        bonuses: { healingDonePercent: 0.1 },
      },
      {
        id: 'tempo_step',
        tier: 2,
        name: 'Pas tempo',
        description: 'Point d\'action +1.',
        requires: 'chorus_blood',
        bonuses: { apFlat: 1 },
      },
      {
        ...sharedPassives.soul_pulse,
        requires: 'tempo_step',
      },
      {
        id: 'resonance_skin',
        tier: 3,
        name: 'Résonance défensive',
        description: '+2 défense et +12 mana max.',
        requires: 'tempo_step',
        bonuses: { defenseFlat: 2, maxManaFlat: 12 },
      },
      {
        id: 'battle_refrain',
        tier: 4,
        name: 'Refrain de bataille',
        description: '+15% Dégâts tant que votre mana est supérieur à 50%.',
        requires: 'resonance_skin',
        bonuses: { highManaDamagePercent: 0.15 },
      },
    ],
  },
]

const BASE_COMBAT_DEFAULTS = {
  dodgeChance: 0.05,
  parryChance: 0.05,
  critDamage: 0.45,
  toppleChance: 0.06,
  statusResist: 0.03,
}

const CLASS_INNATE_PASSIVES = {
  mage: {
    id: 'innate_arcane_mastery',
    name: 'Maitrise arcanique',
    description: '+4 mana/tour et +8% Dégâts critiques.',
    bonuses: { manaRegenFlat: 4, critDamageFlat: 0.08 },
  },
  druid: {
    id: 'innate_life_cycle',
    name: 'Cycle vital',
    description: '+5 régen PV/tour et +5% résistance aux états.',
    bonuses: { lifeRegenFlat: 5, statusResistFlat: 0.05 },
  },
  assassin: {
    id: 'innate_shadow_edge',
    name: 'Lame de l\'ombre',
    description: '+5% critique de base et +5% esquive.',
    bonuses: { critChanceFlat: 0.05, dodgeChanceFlat: 0.05 },
  },
  warrior: {
    id: 'innate_iron_stance',
    name: 'Posture de fer',
    description: '+3 défense et +5% parade.',
    bonuses: { defenseFlat: 3, parryChanceFlat: 0.05 },
  },
  archer: {
    id: 'innate_hunter_instinct',
    name: 'Instinct du chasseur',
    description: '+5% esquive et +8% Dégâts.',
    bonuses: { dodgeChanceFlat: 0.05, damagePercent: 0.08 },
  },
  necromancer: {
    id: 'innate_grave_ritual',
    name: 'Rituel des tombes',
    description: '+7% vol de vie et +12 mana max.',
    bonuses: { lifeStealPercent: 0.07, maxManaFlat: 12 },
  },
  bard: {
    id: 'innate_battle_rhythm',
    name: 'Rythme de bataille',
    description: '+3 mana/tour et +10% efficacité des soins.',
    bonuses: { manaRegenFlat: 3, healingDonePercent: 0.1 },
  },
}

const SKILL_STATUS_AUGMENTS = {
  mage_nova: {
    statusEffect: { kind: 'disorient', chance: 0.35, turns: 1, value: 1 },
  },
  mage_entropy_mark: {
    statusEffect: { kind: 'weaken', chance: 0.3, turns: 2, value: 0.1 },
  },
  assassin_blade_fan: {
    statusEffect: { kind: 'disorient', chance: 0.24, turns: 1, value: 1 },
  },
  warrior_charge: {
    statusEffect: { kind: 'topple', chance: 0.45, turns: 1, value: 1 },
  },
  archer_pin: {
    statusEffect: { kind: 'disorient', chance: 0.25, turns: 1, value: 1 },
  },
  necro_plague: {
    statusEffect: { kind: 'weaken', chance: 0.35, turns: 2, value: 0.12 },
  },
  bard_discord: {
    statusEffect: { kind: 'weaken', chance: 0.38, turns: 2, value: 0.14 },
  },
}

const TREE_CLASS_ALIASES = {
  mage: ['mage'],
  druid: ['druide', 'druid'],
  assassin: ['assassin'],
  warrior: ['guerrier', 'warrior'],
  archer: ['archer'],
  necromancer: ['necroman', 'necromancien', 'necromancer'],
  bard: ['barde', 'bard'],
}

const TREE_BRANCH_REBALANCE = {
  assassin_shadow: 1.1,
  assassin_agility: 1.22,
  assassin_deadly_blades: 1.16,
  archer_precision: 1.12,
  archer_rapid_fire: 1.16,
  archer_hunter_survival: 1.24,
  warrior_defender: 1.2,
  warrior_berserker: 1.1,
  warrior_weapon_mastery: 1.13,
  necro_dark_magic: 1.12,
  necro_drain: 1.24,
  necro_ritual_mana: 1.18,
  druid_nature_guard: 1.22,
  druid_harmony: 1.18,
  druid_wild_form: 1.13,
  bard_support_melodies: 1.24,
  bard_inspiration: 1.13,
  bard_virtuoso: 1.18,
  mage_pure_arcana: 1.1,
  mage_mana_pool: 1.16,
  mage_control: 1.16,
}

const TREE_MAJOR_MULTIPLIER = 1.06

const TREE_EFFECT_META_KEYS = new Set([
  'condition',
  'threshold',
  'durationTurns',
  'maxTurns',
  'value',
  'scalesPerMissingHpPct',
  'maxPct',
])

const TREE_EFFECT_NOT_SCALABLE = new Set([
  'threshold',
  'durationTurns',
  'maxTurns',
  'value',
  'scalesPerMissingHpPct',
  'maxPct',
])

const TREE_EFFECT_LABELS = {
  maxHpPct: 'PV max',
  maxManaPct: 'Mana max',
  atkPct: 'ATK',
  defPct: 'DEF',
  armorPct: 'Armure',
  speedPct: 'Vitesse',
  critChancePct: 'Chance critique',
  magicCritChancePct: 'Chance critique magique',
  critDamagePct: 'Dégâts critiques',
  dodgeChancePct: 'Esquive',
  dodgeChanceVsPhysicalPct: 'Esquive vs physique',
  dodgeChanceConditionalPct: 'Esquive conditionnelle',
  dodgeChanceScalingPct: 'Esquive scalable',
  bonusCritChanceConditionalPct: 'Critique conditionnel',
  blockChancePct: 'Parade',
  manaRegenPct: 'Regen mana',
  hpRegenPct: 'Regen PV',
  healingDonePct: 'Soin prodigue',
  healingSkillBonusPct: 'Puissance des soins',
  healingReceivedPct: 'Soins recus',
  lifestealPct: 'Vol de vie',
  magicLifestealPct: 'Vol de vie magique',
  healFromDamagePct: 'Soin sur degats',
  manaCostReductionPct: 'Reduction cout mana',
  cooldownReductionPct: 'Reduction cooldown',
  damagePct: 'Dégâts',
  skillDamagePct: 'Dégâts de competence',
  basicAttackDamagePct: 'Dégâts attaque de base',
  singleTargetDamagePct: 'Dégâts monocible',
  singleTargetSkillDamagePct: 'Dégâts monocible de competence',
  weaponDamagePct: 'Dégâts d\'arme',
  damageIn1v1Pct: 'Dégâts en duel',
  damageAfterSkillPct: 'Dégâts apres competence',
  damageAfterCritPct: 'Dégâts apres critique',
  damageAfterBeingHitPct: 'Dégâts après avoir été touché',
  damageWhenActFirstPct: 'Dégâts en initiative',
  damageWhileBuffedPct: 'Dégâts sous buff',
  damageVsDebuffedPct: 'Dégâts sur cible affaiblie',
  damageVsCursedPct: 'Dégâts sur cible maudite',
  magicDamagePct: 'Dégâts magiques',
  magicPenPct: 'Penetration magique',
  armorPenPct: 'Penetration armure',
  spellPowerPct: 'Puissance magique',
  spellAccuracyPct: 'Precision magique',
  accuracyPct: 'Precision',
  damageVarianceReductionPct: 'Stabilite des degats',
  spellStabilityPct: 'Stabilite des sorts',
  supportSkillEffectivenessPct: 'Efficacite support',
  buffEffectivenessPct: 'Efficacite des buffs',
  buffDebuffDurationPct: 'Duree buff/debuff',
  buffDurationPct: 'Duree des buffs',
  positiveEffectivenessPct: 'Efficacite des effets positifs',
  effectivenessPct: 'Efficacite globale',
  shieldStrengthPct: 'Force des boucliers',
  damageVsBossPct: 'Dégâts contre boss',
  firstTurnDamagePct: 'Dégâts tour 1',
  damageVsHighHpPct: 'Dégâts contre cible haute vie',
  damageWhenHighHpPct: 'Dégâts avec PV élevés',
  damageVsFullHpPct: 'Dégâts contre cible pleine vie',
  damageWhenManaAbovePct: 'Dégâts avec mana élevé',
  damageWhenBelowHpPct: 'Dégâts avec PV bas',
  damageWhenLowHpPct: 'Dégâts avec PV bas',
  damageVsLowHpPct: 'Dégâts contre cible basse vie',
  damageScalingPerTurnPct: 'Dégâts par tour',
  damageReductionAfterDodgePct: 'Reduction apres esquive',
  damageReductionAfterSpellPct: 'Reduction apres sort',
  damageTakenReductionPct: 'Reduction de degats',
  damageTakenReductionWhenHighHpPct: 'Reduction avec PV élevés',
  physicalDamageTakenReductionPct: 'Reduction physique',
  physicalResistPct: 'Resistance physique',
  magicResistPct: 'Resistance magique',
  critDamageTakenReductionPct: 'Reduction degats critiques recus',
  enemyCritChanceReductionPct: 'Reduction critique ennemi',
  debuffResistPct: 'Resistance debuffs',
  slowResistPct: 'Resistance ralentissement',
  interruptResistPct: 'Resistance interruption',
}

const TREE_DAMAGE_KEYS = new Set([
  'damagePct',
  'skillDamagePct',
  'basicAttackDamagePct',
  'singleTargetDamagePct',
  'singleTargetSkillDamagePct',
  'weaponDamagePct',
  'damageIn1v1Pct',
  'damageAfterSkillPct',
  'damageAfterCritPct',
  'damageWhenActFirstPct',
  'damageWhileBuffedPct',
  'damageVsDebuffedPct',
  'damageVsCursedPct',
  'magicDamagePct',
  'magicPenPct',
  'armorPenPct',
])

const TREE_SUPPORT_KEYS = new Set([
  'supportSkillEffectivenessPct',
  'buffEffectivenessPct',
  'buffDebuffDurationPct',
  'buffDurationPct',
  'positiveEffectivenessPct',
  'effectivenessPct',
  'spellStabilityPct',
  'damageVarianceReductionPct',
])

const TREE_DEFENSIVE_KEYS = new Set([
  'damageReductionAfterDodgePct',
  'damageReductionAfterSpellPct',
  'damageTakenReductionPct',
  'damageTakenReductionWhenHighHpPct',
  'physicalDamageTakenReductionPct',
  'physicalResistPct',
  'magicResistPct',
  'critDamageTakenReductionPct',
  'enemyCritChanceReductionPct',
  'debuffResistPct',
  'slowResistPct',
  'interruptResistPct',
])

function normalizeLabel(value) {
  return (value ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function passiveTreeForClass(classId) {
  const aliases = TREE_CLASS_ALIASES[classId] ?? [classId]
  for (const entry of skilltreeData?.passiveTrees ?? []) {
    const normalized = normalizeLabel(entry.class)
    if (aliases.some((alias) => normalized.includes(normalizeLabel(alias)))) {
      return entry
    }
  }
  return null
}

function addBonus(out, key, value) {
  if (!value) {
    return
  }
  out[key] = (out[key] ?? 0) + value
}

function percent(value) {
  return (Number(value) || 0) / 100
}

function formatPct(value) {
  const pct = Math.abs(value) * 100
  const rounded = Number.parseFloat(pct.toFixed(1))
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`
}

function formatRawPercent(value) {
  const rounded = Number.parseFloat(Math.abs(value).toFixed(1))
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`
}

function formatSignedPercent(value) {
  return `${value >= 0 ? '+' : '-'}${formatRawPercent(value)}%`
}

function effectSuffix(key, effect) {
  if (key === 'firstTurnDamagePct') {
    return ' (tour 1 uniquement)'
  }
  if (
    key === 'damageAfterSkillPct' ||
    key === 'damageAfterCritPct' ||
    key === 'damageAfterBeingHitPct' ||
    key === 'damageReductionAfterDodgePct' ||
    key === 'damageReductionAfterSpellPct'
  ) {
    const turns = Math.max(1, Math.round(effect.durationTurns ?? 1))
    return ` (${turns} tour${turns > 1 ? 's' : ''})`
  }
  if (key === 'damageScalingPerTurnPct') {
    const maxTurns = Math.max(1, Math.round(effect.maxTurns ?? 3))
    return ` (cumul max ${maxTurns} tours)`
  }
  if (key === 'damageVsLowHpPct') {
    return ` (cible <= ${Math.round(effect.threshold ?? 50)}% PV)`
  }
  if (key === 'damageVsHighHpPct' || key === 'damageVsFullHpPct') {
    return ` (cible >= ${Math.round(effect.threshold ?? 70)}% PV)`
  }
  if (key === 'damageWhenLowHpPct' || key === 'damageWhenBelowHpPct') {
    return ` (si PV <= ${Math.round(effect.threshold ?? 50)}%)`
  }
  if (key === 'damageWhenHighHpPct') {
    return ` (si PV >= ${Math.round(effect.threshold ?? 70)}%)`
  }
  if (key === 'damageWhenManaAbovePct') {
    return ` (si mana >= ${Math.round(effect.threshold ?? 50)}%)`
  }
  if (key === 'dodgeChanceConditionalPct' || key === 'bonusCritChanceConditionalPct') {
    if (effect.condition === 'mana_above_pct') {
      return ` (si mana >= ${Math.round(effect.value ?? 50)}%)`
    }
    if (effect.condition === 'advantage_state') {
      return ' (si la cible est déjà sous un état)'
    }
  }
  if (key === 'dodgeChanceScalingPct') {
    const maxPct = Math.round(effect.maxPct ?? effect[key] ?? 0)
    const scaleStep = Math.round(effect.scalesPerMissingHpPct ?? 50)
    return ` (max +${maxPct}%, tous les ${scaleStep}% PV manquants)`
  }
  return ''
}

function toSentenceCaseLabel(key) {
  if (TREE_EFFECT_LABELS[key]) {
    return TREE_EFFECT_LABELS[key]
  }
  const plain = key.replace(/Pct$/g, '').replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  return plain.charAt(0).toUpperCase() + plain.slice(1).toLowerCase()
}

function describeTreeEffect(effect = {}) {
  const lines = []
  for (const [key, rawValue] of Object.entries(effect)) {
    if (TREE_EFFECT_META_KEYS.has(key)) {
      continue
    }
    if (typeof rawValue !== 'number') {
      continue
    }
    const label = toSentenceCaseLabel(key)
    const text = `${label} ${formatSignedPercent(rawValue)}${effectSuffix(key, effect)}`
    lines.push(text)
  }
  return lines
}

function rebalanceEffectValue(rawValue, multiplier) {
  if (typeof rawValue !== 'number') {
    return rawValue
  }
  const scaled = rawValue * multiplier
  const rounded = Number.parseFloat(scaled.toFixed(1))
  return rounded
}

function rebalanceTreeEffect(effect = {}, branchId, isMajor) {
  const branchMultiplier = TREE_BRANCH_REBALANCE[branchId] ?? 1
  const multiplier = branchMultiplier * (isMajor ? TREE_MAJOR_MULTIPLIER : 1)
  if (multiplier === 1) {
    return { ...effect }
  }

  const tuned = {}
  for (const [key, rawValue] of Object.entries(effect)) {
    if (typeof rawValue !== 'number') {
      tuned[key] = rawValue
      continue
    }
    if (TREE_EFFECT_NOT_SCALABLE.has(key)) {
      tuned[key] = rawValue
      continue
    }
    tuned[key] = rebalanceEffectValue(rawValue, multiplier)
  }
  return tuned
}

function mapTreeEffectToBonuses(effect = {}) {
  const out = {}

  for (const [key, rawValue] of Object.entries(effect)) {
    if (typeof rawValue !== 'number') {
      continue
    }
    const value = Number(rawValue)
    const scaled = percent(value)

    if (key === 'maxHpPct') {
      addBonus(out, 'maxHpPercent', scaled)
      continue
    }
    if (key === 'maxManaPct') {
      addBonus(out, 'maxManaPercent', scaled)
      continue
    }
    if (key === 'atkPct') {
      addBonus(out, 'attackPercent', scaled)
      continue
    }
    if (key === 'defPct' || key === 'armorPct') {
      addBonus(out, 'defensePercent', scaled)
      continue
    }
    if (key === 'speedPct') {
      addBonus(out, 'speedPercent', scaled)
      continue
    }
    if (key === 'critChancePct' || key === 'magicCritChancePct' || key === 'bonusCritChanceConditionalPct') {
      addBonus(out, 'critChanceFlat', scaled)
      continue
    }
    if (key === 'critDamagePct') {
      addBonus(out, 'critDamageFlat', scaled)
      continue
    }
    if (key === 'dodgeChancePct' || key === 'dodgeChanceConditionalPct' || key === 'dodgeChanceVsPhysicalPct') {
      addBonus(out, 'dodgeChanceFlat', scaled)
      continue
    }
    if (key === 'blockChancePct') {
      addBonus(out, 'parryChanceFlat', scaled)
      continue
    }
    if (key === 'manaRegenPct') {
      addBonus(out, 'manaRegenFlat', Math.max(1, Math.round(value / 2)))
      continue
    }
    if (key === 'hpRegenPct') {
      addBonus(out, 'lifeRegenFlat', Math.max(1, Math.round(value / 2)))
      continue
    }
    if (key === 'healingDonePct' || key === 'healingSkillBonusPct') {
      addBonus(out, 'healingDonePercent', scaled)
      continue
    }
    if (key === 'healingReceivedPct') {
      addBonus(out, 'healingTakenPercent', scaled)
      continue
    }
    if (key === 'lifestealPct' || key === 'magicLifestealPct' || key === 'healFromDamagePct') {
      addBonus(out, 'lifeStealPercent', scaled)
      continue
    }
    if (key === 'manaCostReductionPct') {
      addBonus(out, 'manaCostReductionPercent', scaled)
      continue
    }
    if (key === 'cooldownReductionPct') {
      addBonus(out, 'cooldownReductionPercent', scaled)
      continue
    }
    if (key === 'damageVsBossPct') {
      addBonus(out, 'bossDamagePercent', scaled)
      continue
    }
    if (key === 'damageVsHighHpPct' || key === 'damageWhenHighHpPct' || key === 'damageVsFullHpPct' || key === 'firstTurnDamagePct') {
      addBonus(out, 'highHpDamagePercent', scaled)
      continue
    }
    if (key === 'damageWhenManaAbovePct') {
      addBonus(out, 'highManaDamagePercent', scaled)
      continue
    }
    if (key === 'damageWhenBelowHpPct' || key === 'damageWhenLowHpPct' || key === 'damageVsLowHpPct') {
      addBonus(out, 'lowHpDamagePercent', scaled)
      continue
    }
    if (TREE_DEFENSIVE_KEYS.has(key)) {
      const reductionScale = key === 'damageTakenReductionWhenHighHpPct' ? 0.85 : 0.72
      addBonus(out, 'damageReductionPercent', scaled * reductionScale)
      addBonus(out, 'statusResistFlat', scaled * 0.45)
      continue
    }
    if (key === 'dodgeChanceScalingPct') {
      addBonus(out, 'dodgeChanceFlat', scaled * 0.75)
      continue
    }
    if (key === 'shieldStrengthPct') {
      addBonus(out, 'defensePercent', scaled * 0.72)
      continue
    }
    if (key === 'spellPowerPct') {
      addBonus(out, 'spellPowerPercent', scaled)
      continue
    }
    if (key === 'damageScalingPerTurnPct' || key === 'damageAfterBeingHitPct') {
      addBonus(out, 'damagePercent', scaled * 0.7)
      continue
    }
    if (key === 'spellAccuracyPct' || key === 'accuracyPct') {
      addBonus(out, 'damagePercent', scaled * 0.65)
      addBonus(out, 'critChanceFlat', scaled * 0.35)
      continue
    }
    if (TREE_SUPPORT_KEYS.has(key)) {
      addBonus(out, 'damagePercent', scaled * 0.55)
      addBonus(out, 'healingDonePercent', scaled * 0.55)
      addBonus(out, 'damageReductionPercent', scaled * 0.35)
      continue
    }
    if (TREE_DAMAGE_KEYS.has(key)) {
      addBonus(out, 'damagePercent', scaled)
      continue
    }
  }

  if (!Object.keys(out).length) {
    out.damagePercent = 0.01
  }
  return out
}

function summarizeBonusesLines(bonuses) {
  const lines = []
  if (bonuses.maxHpPercent) {
    lines.push(`PV max +${formatPct(bonuses.maxHpPercent)}%`)
  }
  if (bonuses.maxManaPercent) {
    lines.push(`Mana max +${formatPct(bonuses.maxManaPercent)}%`)
  }
  if (bonuses.attackPercent) {
    lines.push(`ATK +${formatPct(bonuses.attackPercent)}%`)
  }
  if (bonuses.defensePercent) {
    lines.push(`DEF +${formatPct(bonuses.defensePercent)}%`)
  }
  if (bonuses.speedPercent) {
    lines.push(`Vitesse +${formatPct(bonuses.speedPercent)}%`)
  }
  if (bonuses.critChanceFlat) {
    lines.push(`Critique +${formatPct(bonuses.critChanceFlat)}%`)
  }
  if (bonuses.critDamageFlat) {
    lines.push(`Dégâts critiques +${formatPct(bonuses.critDamageFlat)}%`)
  }
  if (bonuses.dodgeChanceFlat) {
    lines.push(`Esquive +${formatPct(bonuses.dodgeChanceFlat)}%`)
  }
  if (bonuses.parryChanceFlat) {
    lines.push(`Parade +${formatPct(bonuses.parryChanceFlat)}%`)
  }
  if (bonuses.statusResistFlat) {
    lines.push(`Resistance aux états +${formatPct(bonuses.statusResistFlat)}%`)
  }
  if (bonuses.damagePercent) {
    lines.push(`Dégâts +${formatPct(bonuses.damagePercent)}%`)
  }
  if (bonuses.bossDamagePercent) {
    lines.push(`Dégâts boss +${formatPct(bonuses.bossDamagePercent)}%`)
  }
  if (bonuses.highHpDamagePercent) {
    lines.push(`Dégâts (haute vie) +${formatPct(bonuses.highHpDamagePercent)}%`)
  }
  if (bonuses.lowHpDamagePercent) {
    lines.push(`Dégâts (basse vie) +${formatPct(bonuses.lowHpDamagePercent)}%`)
  }
  if (bonuses.highManaDamagePercent) {
    lines.push(`Dégâts (mana élevé) +${formatPct(bonuses.highManaDamagePercent)}%`)
  }
  if (bonuses.manaRegenFlat) {
    lines.push(`Regen mana +${bonuses.manaRegenFlat}`)
  }
  if (bonuses.lifeRegenFlat) {
    lines.push(`Regen PV +${bonuses.lifeRegenFlat}`)
  }
  if (bonuses.healingDonePercent) {
    lines.push(`Soins prodigues +${formatPct(bonuses.healingDonePercent)}%`)
  }
  if (bonuses.healingTakenPercent) {
    lines.push(`Soins recus +${formatPct(bonuses.healingTakenPercent)}%`)
  }
  if (bonuses.lifeStealPercent) {
    lines.push(`Vol de vie +${formatPct(bonuses.lifeStealPercent)}%`)
  }
  if (bonuses.manaCostReductionPercent) {
    lines.push(`Cout mana -${formatPct(bonuses.manaCostReductionPercent)}%`)
  }
  if (bonuses.cooldownReductionPercent) {
    lines.push(`Cooldown -${formatPct(bonuses.cooldownReductionPercent)}%`)
  }
  if (bonuses.damageReductionPercent) {
    lines.push(`Reduction des degats +${formatPct(bonuses.damageReductionPercent)}%`)
  }
  if (bonuses.spellPowerPercent) {
    lines.push(`Puissance magique +${formatPct(bonuses.spellPowerPercent)}%`)
  }
  if (bonuses.gatherBonus) {
    lines.push(`Recolte +${formatPct(bonuses.gatherBonus)}%`)
  }
  return lines
}

function summarizeBonuses(bonuses) {
  return summarizeBonusesLines(bonuses).join(' | ')
}

function buildPassiveTree(classId, fallbackPassives) {
  const tree = passiveTreeForClass(classId)
  if (!tree?.branches?.length) {
    return {
      branches: [],
      passives: fallbackPassives,
    }
  }

  const branches = tree.branches.map((branch) => {
    let previousPassive = null
    const passives = (branch.passives ?? []).map((node, index) => {
      const isMajor = node.tier === 'major'
      const tunedEffect = rebalanceTreeEffect(node.effect ?? {}, branch.id, isMajor)
      const bonuses = mapTreeEffectToBonuses(tunedEffect)
      const statLines = summarizeBonusesLines(bonuses)
      const effectLines = describeTreeEffect(tunedEffect)
      const passive = {
        id: node.id,
        tier: isMajor ? 9 : index + 1,
        name: node.name,
        description: summarizeBonuses(bonuses) || branch.description || 'Bonus passif.',
        requires: previousPassive?.id ?? null,
        requiresName: previousPassive?.name ?? null,
        bonuses,
        effectLines,
        statLines,
        tunedEffect,
        branchId: branch.id,
        branchName: branch.name,
        isMajor,
      }
      previousPassive = passive
      return passive
    })
    return {
      id: branch.id,
      name: branch.name,
      description: branch.description,
      passives,
    }
  })

  return {
    branches,
    passives: branches.flatMap((branch) => branch.passives),
  }
}

export const CLASS_DEFINITIONS = RAW_CLASS_DEFINITIONS.map((entry) => {
  const innate = CLASS_INNATE_PASSIVES[entry.id]
  const passiveTree = buildPassiveTree(entry.id, entry.passives ?? [])
  return {
    ...entry,
    baseStats: {
      ...BASE_COMBAT_DEFAULTS,
      ...entry.baseStats,
    },
    innatePassive: innate,
    passiveTree: passiveTree.branches,
    passives: passiveTree.passives,
    skills: entry.skills.map((skill) => ({
      ...skill,
      ...SKILL_STATUS_AUGMENTS[skill.id],
    })),
  }
})

export const CLASS_BY_ID = Object.fromEntries(CLASS_DEFINITIONS.map((item) => [item.id, item]))

export function pickClass(classId) {
  return CLASS_BY_ID[classId] ?? CLASS_DEFINITIONS[0]
}

export function getClassSkillById(classId, skillId) {
  const selectedClass = pickClass(classId)
  return selectedClass.skills.find((skill) => skill.id === skillId) ?? null
}




