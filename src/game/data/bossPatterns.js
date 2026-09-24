// Patterns de boss : chaque boss a sa propre rotation de compétences, ses phases (déclenchées
// par un seuil de PV), une ou deux attaques ANNONCÉES (telegraph : le boss se prépare un tour,
// puis frappe plus fort au tour suivant — un étourdissement l'interrompt) et parfois un
// enrage qui punit les combats trop longs.
//
// Format d'un pattern :
//   extraSkills : compétences propres au boss (s'ajoutent à ses skills existants)
//   phases      : [{ hpBelow, rotation: [skillId...], onEnter?: { text, heal?, shield?, buff?, cleanse? } }]
//   enrage      : { turn, text, buff: { stat, value } } (optionnel)
// Une compétence avec `telegraph: { text, chargeMult }` est annoncée avant d'être exécutée.

const stun = (chance, turns = 1) => ({ kind: 'stun', chance, bossChance: chance, turns })

export const BOSS_PATTERNS = {
  // Map 1 — brute lente : gros coups annoncés, puis furie quand elle est blessée.
  boss_ash_colossus: {
    extraSkills: [
      {
        id: 'colossus_quake', name: 'Séisme cendreux', apCost: 4, manaCost: 0, effect: 'damage', power: 2.0, cooldown: 3,
        telegraph: { text: 'Le Colosse lève ses poings au-dessus de sa tête…', chargeMult: 1.45 },
      },
    ],
    phases: [
      { hpBelow: 1, rotation: ['colossus_crush', 'colossus_roar', 'colossus_quake', 'colossus_regen'] },
      {
        hpBelow: 0.5,
        onEnter: { text: 'Le Colosse rugit : la cendre s\'embrase autour de lui, il entre en furie !', buff: { stat: 'attackPercent', value: 0.25 } },
        rotation: ['colossus_crush', 'colossus_quake', 'colossus_roar'],
      },
    ],
  },

  // Map 2 — nécromancien : malédictions, contrôle, puis requiem annoncé.
  boss_bone_emperor: {
    extraSkills: [
      {
        id: 'emperor_terror', name: 'Regard du néant', apCost: 4, manaCost: 14, effect: 'debuff', power: 0.8, cooldown: 4,
        debuffType: 'enemyAttackPercent', debuffValue: 0.15, debuffTurns: 2,
        statusEffect: { kind: 'fear', chance: 0.4, bossChance: 0.4, turns: 2, fearChance: 0.5 },
      },
      {
        id: 'emperor_requiem', name: 'Requiem des os', apCost: 4, manaCost: 0, effect: 'damage', power: 2.1, cooldown: 3,
        telegraph: { text: 'Les os de la salle vibrent : l\'Empereur entonne un requiem funèbre…', chargeMult: 1.5 },
      },
    ],
    phases: [
      { hpBelow: 1, rotation: ['emperor_hex', 'emperor_slam', 'emperor_guard', 'emperor_slam', 'emperor_regen'] },
      {
        hpBelow: 0.6,
        onEnter: { text: 'L\'Empereur rassemble ses os : un rempart de squelettes le protège.', shield: 0.15 },
        rotation: ['emperor_terror', 'emperor_hex', 'emperor_requiem', 'emperor_slam'],
      },
      {
        hpBelow: 0.3,
        onEnter: { text: 'L\'Empereur, acculé, abandonne toute retenue !', buff: { stat: 'attackPercent', value: 0.3 } },
        rotation: ['emperor_requiem', 'emperor_slam', 'emperor_terror'],
      },
    ],
  },

  // Map 3 — forge : chauffe progressive, marteau annoncé.
  boss_forge_titan: {
    extraSkills: [
      {
        id: 'titan_overheat', name: 'Surchauffe', apCost: 4, manaCost: 0, effect: 'dot', power: 0.9, cooldown: 3,
        dotKind: 'burn', dotTurns: 3, impactPower: 0.9,
      },
      {
        id: 'titan_anvil', name: 'Chute d\'enclume', apCost: 5, manaCost: 0, effect: 'damage', power: 2.3, cooldown: 4,
        telegraph: { text: 'Le Titan hisse une enclume incandescente au-dessus de lui…', chargeMult: 1.45 },
      },
    ],
    phases: [
      { hpBelow: 1, rotation: ['titan_hammer', 'titan_fire', 'titan_hammer', 'titan_temper'] },
      {
        hpBelow: 0.55,
        onEnter: { text: 'La forge du Titan s\'emballe : ses coups deviennent brûlants.', buff: { stat: 'attackPercent', value: 0.2 } },
        rotation: ['titan_overheat', 'titan_hammer', 'titan_anvil', 'titan_hammer'],
      },
    ],
    enrage: { turn: 12, text: 'Le Titan est en surchauffe totale !', buff: { stat: 'attackPercent', value: 0.35 } },
  },

  // Map 4 — miroirs : reflets à éviter, illusions.
  boss_mirror_eater: {
    extraSkills: [
      {
        id: 'mirror_illusion', name: 'Mille reflets', apCost: 3, manaCost: 0, effect: 'buff', buffType: 'dodge', buffValue: 1, buffTurns: 1, cooldown: 4,
      },
      {
        id: 'mirror_shatter', name: 'Éclatement des miroirs', apCost: 4, manaCost: 0, effect: 'damage', power: 2.1, cooldown: 3,
        telegraph: { text: 'Tous les miroirs se tournent vers vous et brillent d\'un éclat aveuglant…', chargeMult: 1.5 },
        statusEffect: { kind: 'disorient', chance: 0.5, bossChance: 0.5, turns: 1, missChance: 0.4 },
      },
    ],
    phases: [
      { hpBelow: 1, rotation: ['mirror_shard', 'mirror_shard', 'mirror_reflect', 'mirror_shard'] },
      {
        hpBelow: 0.5,
        onEnter: { text: 'Le Dévorant se multiplie dans les miroirs !', shield: 0.12 },
        rotation: ['mirror_illusion', 'mirror_shard', 'mirror_reflect', 'mirror_shatter'],
      },
    ],
  },

  // Map 5 — obsidienne : brûlures, carapace, éruption annoncée.
  boss_obsidian_archon: {
    extraSkills: [
      {
        id: 'archon_eruption', name: 'Éruption d\'obsidienne', apCost: 5, manaCost: 16, effect: 'damage', power: 2.2, cooldown: 4,
        telegraph: { text: 'Le sol se fissure : l\'Archonte concentre un torrent de magma…', chargeMult: 1.5 },
      },
      {
        id: 'archon_shackle', name: 'Chaînes de basalte', apCost: 4, manaCost: 12, effect: 'debuff', power: 0.7, cooldown: 4,
        debuffType: 'enemyApPenalty', debuffValue: 1, debuffTurns: 1,
      },
    ],
    phases: [
      { hpBelow: 1, rotation: ['archon_lance', 'archon_storm', 'archon_lance', 'archon_absorb'] },
      {
        hpBelow: 0.5,
        onEnter: { text: 'L\'Archonte se recouvre d\'une carapace de basalte.', shield: 0.15, buff: { stat: 'defensePercent', value: 0.2 } },
        rotation: ['archon_shackle', 'archon_storm', 'archon_eruption', 'archon_lance'],
      },
    ],
  },

  // Cristal : cristallisation puis écrasement annoncé.
  boss_crystal_sovereign: {
    extraSkills: [
      {
        id: 'sovereign_prism', name: 'Prisme brisant', apCost: 4, manaCost: 14, effect: 'debuff', power: 1.0, cooldown: 3,
        debuffType: 'enemyDefensePercent', debuffValue: 0.2, debuffTurns: 2,
      },
      {
        id: 'sovereign_cataclysm', name: 'Cataclysme de gemmes', apCost: 5, manaCost: 0, effect: 'damage', power: 2.4, cooldown: 4,
        telegraph: { text: 'Les cristaux vibrent, prêts à éclater tous ensemble…', chargeMult: 1.5 },
      },
    ],
    phases: [
      { hpBelow: 1, rotation: ['sovereign_shards', 'sovereign_crush', 'sovereign_fortress', 'sovereign_drain'] },
      {
        hpBelow: 0.6,
        onEnter: { text: 'Le Souverain se cristallise : sa peau devient un miroir de gemmes.', shield: 0.15 },
        rotation: ['sovereign_prism', 'sovereign_shards', 'sovereign_cataclysm', 'sovereign_drain'],
      },
      {
        hpBelow: 0.3,
        onEnter: { text: 'Le cristal se fend, libérant une énergie instable.', buff: { stat: 'attackPercent', value: 0.3 } },
        rotation: ['sovereign_cataclysm', 'sovereign_crush', 'sovereign_drain'],
      },
    ],
  },

  // Vide : esquive, dérobades, renaissance unique.
  boss_void_harbinger: {
    extraSkills: [
      {
        id: 'harbinger_silence', name: 'Silence du vide', apCost: 4, manaCost: 18, effect: 'debuff', power: 0.8, cooldown: 4,
        debuffType: 'enemyApPenalty', debuffValue: 2, debuffTurns: 1,
      },
      {
        id: 'harbinger_collapse', name: 'Effondrement', apCost: 5, manaCost: 0, effect: 'damage', power: 2.5, cooldown: 4,
        telegraph: { text: 'L\'espace se plie autour de vous : le Précurseur prépare un effondrement…', chargeMult: 1.5 },
      },
    ],
    phases: [
      { hpBelow: 1, rotation: ['harbinger_phase', 'harbinger_slash', 'harbinger_burn', 'harbinger_slash'] },
      {
        hpBelow: 0.55,
        onEnter: { text: 'Le Précurseur se dédouble dans le néant.', cleanse: true, buff: { stat: 'dodgeChance', value: 0.15 } },
        rotation: ['harbinger_silence', 'harbinger_burn', 'harbinger_collapse', 'harbinger_slash'],
      },
      {
        hpBelow: 0.25,
        onEnter: { text: 'Le vide s\'effondre sur le Précurseur : il puise dans ses dernières forces.', heal: 0.15, buff: { stat: 'attackPercent', value: 0.3 } },
        rotation: ['harbinger_collapse', 'harbinger_slash', 'harbinger_silence'],
      },
    ],
  },

  // Colisée : champion en arène, cri de guerre, coups étourdissants.
  boss_colosseum_champion: {
    extraSkills: [
      {
        id: 'champion_charge', name: 'Charge du champion', apCost: 5, manaCost: 0, effect: 'damage', power: 2.5, cooldown: 4,
        telegraph: { text: 'Le Champion recule d\'un pas, la foule hurle : il va charger !', chargeMult: 1.5 },
        statusEffect: stun(0.35),
      },
    ],
    phases: [
      { hpBelow: 1, rotation: ['champion_cry', 'champion_crush', 'champion_crush', 'champion_endure'] },
      {
        hpBelow: 0.5,
        onEnter: { text: 'La foule rugit ! Le Champion arrache son casque, déchaîné.', buff: { stat: 'attackPercent', value: 0.25 } },
        rotation: ['champion_charge', 'champion_crush', 'champion_regen', 'champion_crush'],
      },
    ],
    enrage: { turn: 10, text: 'La patience de la foule s\'épuise : le Champion frappe sans retenue !', buff: { stat: 'attackPercent', value: 0.3 } },
  },

  // Ombre : drains, esquive, éclipse annoncée.
  boss_shadow_monarch: {
    extraSkills: [
      {
        id: 'monarch_nightmare', name: 'Cauchemar', apCost: 4, manaCost: 18, effect: 'debuff', power: 0.9, cooldown: 4,
        debuffType: 'enemyAttackPercent', debuffValue: 0.18, debuffTurns: 2,
        statusEffect: { kind: 'sleep', chance: 0.3, bossChance: 0.3, turns: 1 },
      },
    ],
    phases: [
      { hpBelow: 1, rotation: ['monarch_shroud', 'monarch_curse', 'monarch_drain', 'monarch_curse'] },
      {
        hpBelow: 0.55,
        onEnter: { text: 'Les ombres du Monarque s\'épaississent, le rendant presque insaisissable.', buff: { stat: 'dodgeChance', value: 0.12 } },
        rotation: ['monarch_nightmare', 'monarch_drain', 'monarch_eclipse', 'monarch_curse'],
      },
      {
        hpBelow: 0.3,
        onEnter: { text: 'Le Monarque fusionne avec les ténèbres.', heal: 0.1, buff: { stat: 'attackPercent', value: 0.25 } },
        rotation: ['monarch_eclipse', 'monarch_drain', 'monarch_nightmare'],
      },
    ],
  },

  // Enfer : ordres de guerre, marque de mort, écrasement annoncé.
  boss_nether_warlord: {
    extraSkills: [
      {
        id: 'warlord_warcry', name: 'Cri du champ de bataille', apCost: 4, manaCost: 0, effect: 'debuff', power: 1.0, cooldown: 4,
        debuffType: 'enemyDefensePercent', debuffValue: 0.2, debuffTurns: 2,
      },
      {
        id: 'warlord_executioner', name: 'Hache du bourreau', apCost: 5, manaCost: 0, effect: 'damage', power: 2.8, cooldown: 4,
        telegraph: { text: 'Le Seigneur de guerre lève sa hache : le coup sera fatal…', chargeMult: 1.5 },
      },
    ],
    phases: [
      { hpBelow: 1, rotation: ['warlord_command', 'warlord_crush', 'warlord_storm', 'warlord_death_mark'] },
      {
        hpBelow: 0.6,
        onEnter: { text: 'Le Seigneur de guerre hurle ses ordres : sa fureur redouble.', buff: { stat: 'attackPercent', value: 0.2 } },
        rotation: ['warlord_warcry', 'warlord_executioner', 'warlord_crush', 'warlord_storm'],
      },
      {
        hpBelow: 0.3,
        onEnter: { text: 'Blessé, le Seigneur de guerre ne songe plus qu\'à tuer.', buff: { stat: 'attackPercent', value: 0.3 } },
        rotation: ['warlord_executioner', 'warlord_death_mark', 'warlord_crush'],
      },
    ],
  },

  // Onyx : héraut au dogme, bouclier puis décret.
  boss_onyx_herald: {
    extraSkills: [
      {
        id: 'herald_silence', name: 'Silence d\'Onyx', apCost: 4, manaCost: 20, effect: 'debuff', power: 1.0, cooldown: 4,
        debuffType: 'enemyApPenalty', debuffValue: 2, debuffTurns: 1,
        statusEffect: stun(0.25),
      },
      {
        id: 'herald_judgement', name: 'Jugement d\'Onyx', apCost: 5, manaCost: 0, effect: 'damage', power: 3.0, cooldown: 4,
        telegraph: { text: 'L\'Héraut d\'Onyx lève la main : un jugement se prépare…', chargeMult: 1.5 },
      },
    ],
    phases: [
      { hpBelow: 1, rotation: ['herald_command', 'herald_rupture', 'herald_fortress', 'herald_eclipse'] },
      {
        hpBelow: 0.6,
        onEnter: { text: 'Le Héraut proclame un décret : l\'onyx recouvre sa chair.', shield: 0.15 },
        rotation: ['herald_silence', 'herald_eclipse', 'herald_judgement', 'herald_rupture'],
      },
      {
        hpBelow: 0.3,
        onEnter: { text: 'Le Héraut invoque la résurrection noire.', heal: 0.12, buff: { stat: 'attackPercent', value: 0.25 } },
        rotation: ['herald_judgement', 'herald_rupture', 'herald_silence', 'herald_rebirth'],
      },
    ],
    enrage: { turn: 14, text: 'La patience du Héraut est épuisée !', buff: { stat: 'attackPercent', value: 0.3 } },
  },

  // Cryptes : pourriture lente, rempart, jugement.
  boss_crypt_warden: {
    extraSkills: [
      {
        id: 'warden_toll', name: 'Glas des cryptes', apCost: 4, manaCost: 18, effect: 'debuff', power: 1.0, cooldown: 4,
        debuffType: 'enemyDefensePercent', debuffValue: 0.2, debuffTurns: 2,
        statusEffect: { kind: 'fear', chance: 0.4, bossChance: 0.4, turns: 2, fearChance: 0.5 },
      },
      {
        id: 'warden_entomb', name: 'Ensevelissement', apCost: 5, manaCost: 0, effect: 'damage', power: 3.0, cooldown: 4,
        telegraph: { text: 'La terre tremble : le Gardien s\'apprête à vous ensevelir…', chargeMult: 1.5 },
      },
    ],
    phases: [
      { hpBelow: 1, rotation: ['warden_decay', 'warden_judgement', 'warden_bulwark', 'warden_command'] },
      {
        hpBelow: 0.6,
        onEnter: { text: 'Les tombes s\'ouvrent : les morts soutiennent leur Gardien.', shield: 0.15 },
        rotation: ['warden_toll', 'warden_decay', 'warden_entomb', 'warden_judgement'],
      },
      {
        hpBelow: 0.3,
        onEnter: { text: 'Le Gardien puise dans les os des tombes.', heal: 0.1, buff: { stat: 'attackPercent', value: 0.25 } },
        rotation: ['warden_entomb', 'warden_judgement', 'warden_resolve'],
      },
    ],
  },

  // Araignées : venin, soie, essaim.
  boss_spider_matriarch: {
    extraSkills: [
      {
        id: 'matriarch_web', name: 'Toile paralysante', apCost: 4, manaCost: 20, effect: 'debuff', power: 0.9, cooldown: 4,
        debuffType: 'enemyApPenalty', debuffValue: 1, debuffTurns: 1,
        statusEffect: { kind: 'stun', chance: 0.3, bossChance: 0.3, turns: 1 },
      },
      {
        id: 'matriarch_pounce', name: 'Bond meurtrier', apCost: 5, manaCost: 0, effect: 'damage', power: 3.0, cooldown: 4,
        telegraph: { text: 'La Matriarche se ramasse sur ses pattes, prête à bondir…', chargeMult: 1.5 },
      },
    ],
    phases: [
      { hpBelow: 1, rotation: ['matriarch_venom_storm', 'matriarch_impale', 'matriarch_web_shroud', 'matriarch_devour'] },
      {
        hpBelow: 0.6,
        onEnter: { text: 'La Matriarche appelle son essaim : les petites araignées grouillent autour d\'elle.', shield: 0.12, buff: { stat: 'attackPercent', value: 0.15 } },
        rotation: ['matriarch_web', 'matriarch_venom_storm', 'matriarch_pounce', 'matriarch_swarm_call'],
      },
      {
        hpBelow: 0.3,
        onEnter: { text: 'La Matriarche, enragée, ne cherche plus qu\'à dévorer.', buff: { stat: 'attackPercent', value: 0.3 } },
        rotation: ['matriarch_pounce', 'matriarch_devour', 'matriarch_impale'],
      },
    ],
  },

  boss_spider_queen: {
    extraSkills: [
      {
        id: 'queen_web', name: 'Linceul de la Reine', apCost: 4, manaCost: 24, effect: 'debuff', power: 1.0, cooldown: 4,
        debuffType: 'enemyApPenalty', debuffValue: 2, debuffTurns: 1,
        statusEffect: { kind: 'stun', chance: 0.3, bossChance: 0.3, turns: 1 },
      },
      {
        id: 'queen_devour', name: 'Festin royal', apCost: 5, manaCost: 0, effect: 'damage', power: 3.3, cooldown: 4,
        telegraph: { text: 'La Reine ouvre grand ses chélicères : le festin va commencer…', chargeMult: 1.5 },
      },
    ],
    phases: [
      { hpBelow: 1, rotation: ['queen_plague', 'queen_impale', 'queen_carapace', 'queen_decree'] },
      {
        hpBelow: 0.65,
        onEnter: { text: 'L\'essaim de la Reine déferle sur le champ de bataille.', shield: 0.15 },
        rotation: ['queen_web', 'queen_plague', 'queen_swarm', 'queen_impale'],
      },
      {
        hpBelow: 0.35,
        onEnter: { text: 'La Reine se régénère dans un cri strident.', heal: 0.12, buff: { stat: 'attackPercent', value: 0.25 } },
        rotation: ['queen_devour', 'queen_swarm', 'queen_rebirth', 'queen_impale'],
      },
    ],
    enrage: { turn: 16, text: 'La Reine perd patience !', buff: { stat: 'attackPercent', value: 0.3 } },
  },
}
