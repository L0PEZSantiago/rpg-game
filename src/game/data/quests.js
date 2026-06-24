// ── Système de quêtes ───────────────────────────────────────────────────────
// Chaque quête est liée à un PNJ dédié (role: 'quest') sur une map précise.
// objective.type détermine comment questProgress()/isQuestComplete() (engine.js)
// calculent l'avancement; rewards décrit ce qui est octroyé par turnInQuest().

export const QUESTS = [
  {
    id: 'quest_bone_collector',
    npcId: 'npc_bone_collector',
    mapId: 'ashen_meadow',
    name: 'Collecte d\'ossements',
    description: 'Orin recherche des poussières osseuses pour façonner ses premiers outils. Apporte-lui-en 3.',
    objective: {
      type: 'collect_material',
      material: 'bone_dust',
      amount: 3,
      targetLabel: 'Poussière osseuse',
    },
    rewards: {
      gold: 60,
      materials: {},
      consumables: [
        { name: 'Potion majeure', effect: 'heal_80', quantity: 2, rarity: 'uncommon', value: 70, icon: '/assets/Icons/potion.png' },
      ],
      loot: null,
    },
  },
  {
    id: 'quest_forge_ascension',
    npcId: 'npc_forge_ascetic',
    mapId: 'obsidian_citadel',
    name: 'L\'Ascension du Forgeron',
    description: 'Le Forgeron veut voir une arme ou une armure portée à son apogée: amène un équipement au niveau d\'amélioration +5.',
    objective: {
      type: 'upgrade_equipment',
      enhancementLevel: 5,
      targetLabel: 'Équipement +5',
    },
    rewards: {
      gold: 150,
      materials: { boss_shard: 1, obsidian_fragment: 4 },
      consumables: [],
      loot: null,
    },
  },
  {
    id: 'quest_cartographer',
    npcId: 'npc_cartographer_apprentice',
    mapId: 'obsidian_citadel',
    name: 'La Carte Inachevée',
    description: 'L\'apprenti cartographe cherche à localiser le Sanctuaire Lunaire, une zone secrète accessible depuis les prairies ou la citadelle.',
    objective: {
      type: 'discover_secret_room',
      mapId: 'lunar_shrine',
      targetLabel: 'Sanctuaire Lunaire',
    },
    rewards: {
      gold: 120,
      materials: { misty_heart: 1 },
      consumables: [],
      loot: null,
    },
  },
  {
    id: 'quest_void_hunter',
    npcId: 'npc_void_hunter',
    mapId: 'void_labyrinth',
    name: 'Chasse au Héraut du Vide',
    description: 'Un chasseur traque le gardien du labyrinthe depuis des semaines. Vaincs le boss de cette zone pour l\'aider.',
    objective: {
      type: 'defeat_boss',
      templateId: 'boss_void_harbinger',
      targetLabel: 'Héraut du Vide',
    },
    rewards: {
      gold: 400,
      materials: {},
      consumables: [],
      loot: { forcedRarity: 'epic', forcedSlot: null },
    },
  },
  {
    id: 'quest_web_clearing',
    npcId: 'npc_crypts_weaver',
    mapId: 'crypts_descendantes',
    name: 'Le Nettoyage des Toiles',
    description: 'Senna veut débarrasser les cryptes des araignées qui ont envahi les galeries. Élimine 5 araignées, peu importe leur espèce.',
    objective: {
      type: 'defeat_enemy_count',
      templateIds: [
        'ashen_spider',
        'crypt_spider',
        'obsidian_spider',
        'cave_spider',
        'broodmother_spider',
        'boss_spider_matriarch',
        'boss_spider_queen',
      ],
      amount: 5,
      targetLabel: 'Araignées vaincues',
    },
    rewards: {
      gold: 500,
      materials: {},
      consumables: [],
      loot: { forcedRarity: 'epic', forcedSlot: 'trinket' },
    },
  },
  {
    id: 'quest_onyx_pilgrim',
    npcId: 'npc_onyx_pilgrim',
    mapId: 'nether_citadel',
    name: 'Le Pèlerinage d\'Onyx',
    description: 'Le Pèlerin attend un compagnon de voyage digne du Trône d\'Onyx: atteins le niveau 24.',
    objective: {
      type: 'reach_level',
      level: 24,
      targetLabel: 'Niveau du héros',
    },
    rewards: {
      gold: 600,
      materials: {},
      consumables: [],
      loot: { forcedRarity: 'legendary', forcedSlot: null },
    },
  },
]

export const QUEST_ORDER = [
  'quest_bone_collector',
  'quest_forge_ascension',
  'quest_cartographer',
  'quest_void_hunter',
  'quest_onyx_pilgrim',
  'quest_web_clearing',
]

export function getQuestById(questId) {
  return QUESTS.find((quest) => quest.id === questId) ?? null
}
