import {
  BOSS_DROP_SHARD_CHANCE,
  CLASS_BY_ID,
  CONSUMABLES_SHOP,
  DIFFICULTY_CONFIG,
  EQUIPMENT_BONUS_POOL,
  ENEMY_TEMPLATES,
  KNIGHT_ASSET,
  LOOT_BASES,
  MAPS,
  MAP_ORDER,
  TUTORIAL_MAP_ID,
  MATERIAL_FROM_ENEMY,
  MATERIAL_LABELS,
  QUESTS,
  getQuestById,
  RARITY_BONUS_RULES,
  RARITIES,
  RARITY_ORDER,
  RECIPES,
  RESOURCE_TABLE,
  ROGUE_ASSET,
  WIZZARD_ASSET,
  mapIsWalkable,
  SOCKET_RULES_BY_RARITY,
  SOCKET_CAP_BY_RARITY,
  SPIRIT_STONE_BONUS_COUNT_BY_RARITY,
  SPIRIT_STONE_SOCKET_SUCCESS_RATE,
  SPIRIT_STONE_ICON,
  IDENTIFY_XP_COST_BY_RARITY,
  EQUIPMENT_QUALITY,
  EQUIPMENT_QUALITY_ORDER,
  WEAPON_ATTACK_RANGES,
  ARMOR_DEFENSE_RANGES,
  ARMOR_PERFECT_ATTACK_BONUS,
  TRINKET_STAT_RANGES,
  EQUIPMENT_RARITY_DROP_WEIGHTS,
  TRAP_TYPES,
} from './data'
import { chance, clamp, deepClone, randomChoice, randomInt, toKey, uid, weightedChoice } from './utils'

const MAX_LOG_ENTRIES = 120
const MAX_EVENT_LENGTH = 170
const CHEST_ICON = '/assets/Environment/Props/Static/Resources.png'
const COMBAT_NORMAL_ATTACK_COST = 2
const MAP_LAYOUT_VARIANTS = ['none', 'flip_x', 'flip_y', 'flip_xy']
const ENEMY_BASE_STAT_BOOST = 1.05
const PASSIVE_LIFESTEAL_MAX_RATIO = 0.3
const PASSIVE_LIFESTEAL_HIT_CAP_MAX_HP_RATIO = 0.12
const NON_BOSS_EQUIPMENT_DROP_CHANCE = 0.35
/** Poids mythique boss : avec biais mythic (+4), (w+4)/(84+w) ≤ 0.10 => max 10% */
const BOSS_MYTHIC_WEIGHT = 2.2 // rendu plus rare (au lieu de re-nerfer ses stats une deuxième fois)
const CHEST_MYTHIC_CHANCE = 0.012
const CHEST_TYPE_WEIGHTS = [
  { value: 'normal', weight: 54 },
  { value: 'trapped', weight: 16 },
  { value: 'bonus', weight: 30 },
]
const SECRET_ROOM_IDS = ['secret_room_vault', 'secret_room_hollow', 'secret_room_sanctum']
const SECRET_DUNGEON_IDS = ['library_underweb', 'ember_cache', 'lunar_shrine', 'forgotten_foundry', 'echoing_vault']
const CHALLENGER_NPC_SPAWN_CHANCE = 0.42
const WANDERING_MERCHANT_SPAWN_CHANCE = 0.15
const RANDOM_TRAP_SPAWN_CHANCE = 0.4
const CHALLENGER_NAMES = ['Mercenaire Borgne', 'Duelliste des Ombres', 'Champion Errant', 'Vétéran des Ruines', 'Gladiateur Exilé']
const WANDERING_MERCHANT_NAMES = ['Caravane Spectrale', 'Marchand Sans Visage', 'Trafiquant des Ombres', 'Colporteur Maudit']
const SPIRIT_SOCKETER_NAMES = ['Sertisseur Errant', 'Artisan des Châsses', 'Ancienne des Pierres']
const SPIRIT_IDENTIFIER_NAMES = ['Voyante des Reliques', 'Sage des Murmures', 'Oracle des Pierres']
const SPIRIT_SOCKETER_MIN_GAP = 2
const SPIRIT_SOCKETER_SPAWN_CHANCE = 0.55
const SPIRIT_IDENTIFIER_MIN_GAP = 4
const SPIRIT_IDENTIFIER_SPAWN_CHANCE = 0.4
const PROCEDURAL_SPIDER_SPAWN_CHANCE = 0.58
const PROCEDURAL_SPIDER_MAX_COUNT = 2
const UPGRADE_COSTS_BY_RARITY = {
  common: [
    { goldCost: 15,  materials: {},              successRate: 1.00 },
    { goldCost: 25,  materials: {},              successRate: 1.00 },
    { goldCost: 40,  materials: {},              successRate: 0.90 },
    { goldCost: 60,  materials: {},              successRate: 0.80 },
    { goldCost: 80,  materials: {},              successRate: 0.70 },
  ],
  uncommon: [
    { goldCost: 25,  materials: {},              successRate: 1.00 },
    { goldCost: 45,  materials: {},              successRate: 1.00 },
    { goldCost: 70,  materials: {},              successRate: 0.85 },
    { goldCost: 100, materials: {},              successRate: 0.70 },
    { goldCost: 140, materials: {},              successRate: 0.60 },
  ],
  rare: [
    { goldCost: 40,  materials: {},              successRate: 1.00 },
    { goldCost: 80,  materials: {},              successRate: 1.00 },
    { goldCost: 140, materials: {},              successRate: 0.80 },
    { goldCost: 220, materials: {},              successRate: 0.65 },
    { goldCost: 320, materials: { ore: 1 },      successRate: 0.50 },
  ],
  epic: [
    { goldCost: 50,  materials: {},              successRate: 1.00 },
    { goldCost: 120, materials: {},              successRate: 1.00 },
    { goldCost: 200, materials: { ore: 2 },      successRate: 0.75 },
    { goldCost: 320, materials: { boss_shard: 1 }, successRate: 0.60 },
    { goldCost: 450, materials: { boss_shard: 2, obsidian_fragment: 1 }, successRate: 0.45 },
  ],
  legendary: [
    { goldCost: 50,  materials: {},              successRate: 1.00 },
    { goldCost: 120, materials: {},              successRate: 1.00 },
    { goldCost: 250, materials: { ore: 2 },      successRate: 0.70 },
    { goldCost: 400, materials: { boss_shard: 2 }, successRate: 0.55 },
    { goldCost: 600, materials: { boss_shard: 3, obsidian_fragment: 2 }, successRate: 0.40 },
  ],
  mythic: [
    { goldCost: 60,  materials: {},              successRate: 1.00 },
    { goldCost: 150, materials: {},              successRate: 1.00 },
    { goldCost: 300, materials: { ore: 3 },      successRate: 0.70 },
    { goldCost: 500, materials: { boss_shard: 3 }, successRate: 0.55 },
    { goldCost: 750, materials: { boss_shard: 4, obsidian_fragment: 3 }, successRate: 0.40 },
  ],
}
// Fallback for unknown rarities
const UPGRADE_COSTS = UPGRADE_COSTS_BY_RARITY.legendary

const CHEST_MISTY_HEART_CHANCE = 0.05 // relevé : la transcendance vers le mythique peut désormais échouer

const SELL_PRICE_FACTOR = 0.12 // 12% du prix d'achat, pour changer la valeur de vente des objets
const SELL_RARITY_MULTIPLIER = {
  common: 1,
  uncommon: 1.05,
  rare: 1.1,
  epic: 1.15,
  legendary: 1.2,
  mythic: 1.3,
}
// La qualité (piètre/bonne facture/divine) et le niveau d'optimisation en forge (+1..+5)
// influent maintenant sur la valeur d'un équipement — vente comme recyclage.
const QUALITY_VALUE_MULTIPLIER = {
  poor: 0.8,
  good: 1,
  perfect: 1.3,
}
const ENHANCEMENT_VALUE_MULTIPLIER_PER_LEVEL = 0.1

function itemOptimizationMultiplier(item) {
  if (item?.kind !== 'equipment') {
    return 1
  }
  const qualityMult = QUALITY_VALUE_MULTIPLIER[item.quality] ?? 1
  const level = item.enhancementLevel ?? 0
  const enhancementMult = 1 + level * ENHANCEMENT_VALUE_MULTIPLIER_PER_LEVEL
  return qualityMult * enhancementMult
}
const RECYCLE_RULES_BY_RARITY = {
  common: { min: 1, max: 2, secondaryChance: 0.15, bossShardChance: 0 },
  uncommon: { min: 2, max: 3, secondaryChance: 0.25, bossShardChance: 0 },
  rare: { min: 3, max: 4, secondaryChance: 0.35, bossShardChance: 0 },
  epic: { min: 4, max: 6, secondaryChance: 0.55, bossShardChance: 0 },
  legendary: { min: 5, max: 8, secondaryChance: 0.8, bossShardChance: 0.35 },
  mythic: { min: 7, max: 10, secondaryChance: 1, bossShardChance: 0.75, bossShardMax: 2 },
}
const RECYCLE_MATERIALS_BY_SLOT = {
  weapon: { primary: 'ore', secondary: 'wood' },
  armor: { primary: 'ore', secondary: 'resin' },
  trinket: { primary: 'ether_drop', secondary: 'obsidian_fragment' },
}
const ENEMY_GOLD_REWARD_FACTOR = 0.25 // relevé pour compenser le recentrage sur le craft (était 0.12)
const BOSS_GOLD_MULTIPLIER = 6
const CRAFT_COST_MULTIPLIER = 1.4
const PASSIVE_RESET_COST = 200
const PASSIVE_RESET_LIMIT = 1
export const PASSIVE_RESET_RULES = {
  cost: PASSIVE_RESET_COST,
  limit: PASSIVE_RESET_LIMIT,
}

const SLOT_DEFAULT_ICON = {
  weapon: '/assets/Weapons/Wood/Wood.png',
  armor: '/assets/Weapons/Hands/Hands.png',
  trinket: '/assets/Icons/anneau.png',
}

const STARTER_WEAPON_BY_CLASS = {
  warrior: {
    name: 'Epee de garnison',
    icon: '/assets/Weapons/Hands/Hands.png',
    weaponType: 'melee',
    attack: 5,
    defense: 1,
  },
  assassin: {
    name: 'Dague de nuit',
    icon: '/assets/Weapons/Bone/Bone.png',
    weaponType: 'melee',
    attack: 6,
    defense: 0,
  },
  archer: {
    name: 'Arc de frêne',
    icon: '/assets/Weapons/Wood/Wood.png',
    weaponType: 'bow',
    attack: 5,
    defense: 1,
  },
  mage: {
    name: 'Baton runique',
    icon: '/assets/Weapons/Wood/Wood.png',
    weaponType: 'staff',
    attack: 5,
    defense: 1,
  },
  druid: {
    name: 'Baton de seve',
    icon: '/assets/Weapons/Wood/Wood.png',
    weaponType: 'staff',
    attack: 5,
    defense: 1,
  },
  necromancer: {
    name: 'Baton d\'os',
    icon: '/assets/Weapons/Bone/Bone.png',
    weaponType: 'staff',
    attack: 5,
    defense: 1,
  },
  bard: {
    name: 'Luth ferrugineux',
    icon: '/assets/Weapons/Wood/Wood.png',
    weaponType: 'staff',
    attack: 5,
    defense: 1,
  },
}

function difficultyFor(run) {
  return DIFFICULTY_CONFIG[run.metadata.difficulty] ?? DIFFICULTY_CONFIG.normal
}

function classById(classId) {
  return CLASS_BY_ID[classId] ?? Object.values(CLASS_BY_ID)[0]
}

function enemyById(templateId) {
  return ENEMY_TEMPLATES[templateId] ?? null
}

function timestamp() {
  const now = new Date()
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
}

export function appendLog(run, message) {
  const text = message.slice(0, MAX_EVENT_LENGTH)
  run.eventLog.unshift(`[${timestamp()}] ${text}`)
  if (run.eventLog.length > MAX_LOG_ENTRIES) {
    run.eventLog.length = MAX_LOG_ENTRIES
  }
}

function xpForLevel(level) {
  return Math.floor(120 + (level - 1) * 90 + (level - 1) * (level - 1) * 40)
}

function createMaterialBag() {
  const bag = {}
  for (const key of Object.keys(MATERIAL_LABELS)) {
    bag[key] = 0
  }
  // Ensure misty_heart exists even if not yet in saved states
  bag.misty_heart ??= 0
  return bag
}

function currentMapById(mapId) {
  return MAPS[mapId] ?? null
}

function mapEntries() {
  return Object.entries(MAPS)
}

// ─── Maps secrètes/loot procédurales et infinies ──────────────────────────────
// Les salles de butin et donjons secrets ne sont plus un pool fixe de maps
// réutilisées telles quelles : à chaque déclenchement, une nouvelle instance
// (id unique) est clonée depuis l'une des formes existantes puis recalibrée
// (rareté des coffres, puissance des ennemis) sur le niveau de la map d'origine,
// pour ne jamais s'épuiser et rester pertinente quel que soit le niveau atteint.

function levelRangeMid(map) {
  const raw = String(map?.levelRange ?? '1-1')
  const [a, b] = raw.split('-').map((n) => Number.parseInt(n, 10) || 1)
  return (a + (b ?? a)) / 2
}

function currentSourceLevelMid(run) {
  const map = currentMap(run)
  return map ? levelRangeMid(map) : Math.max(1, run.player?.level ?? 1)
}

// Bande de rareté de coffres en fonction du niveau de la map d'origine (1..36+).
function chestRarityBandForLevel(level) {
  if (level <= 5) return ['common', 'uncommon', 'uncommon']
  if (level <= 10) return ['uncommon', 'rare', 'rare']
  if (level <= 16) return ['rare', 'rare', 'epic']
  if (level <= 22) return ['rare', 'epic', 'epic']
  if (level <= 28) return ['epic', 'epic', 'legendary']
  return ['epic', 'legendary', 'legendary', 'mythic']
}

export function generateProceduralSecretRoom(run) {
  const templateId = randomChoice(SECRET_ROOM_IDS)
  const template = MAPS[templateId]
  if (!template) return templateId
  const sourceLevel = currentSourceLevelMid(run)
  const rarities = chestRarityBandForLevel(sourceLevel)
  const newId = `secret_room_gen_${uid('room')}`
  const clone = deepClone(template)
  clone.id = newId
  clone.name = `${template.name} (Écho)`
  clone.levelRange = `${Math.max(1, Math.round(sourceLevel - 1))}-${Math.round(sourceLevel + 1)}`
  clone.chests = (clone.chests ?? []).map((chest, idx) => ({
    ...chest,
    rarityBias: rarities[idx % rarities.length],
  }))
  clone.originTemplateId = templateId
  MAPS[newId] = clone
  run.world.generatedMaps ??= {}
  run.world.generatedMaps[newId] = clone
  return newId
}

export function generateProceduralSecretDungeon(run) {
  const sourceLevel = currentSourceLevelMid(run)
  // Choisit la forme de donjon dont le niveau natif est le plus proche du niveau d'origine.
  const templateId = [...SECRET_DUNGEON_IDS].sort((a, b) => {
    const da = Math.abs(levelRangeMid(MAPS[a]) - sourceLevel)
    const db = Math.abs(levelRangeMid(MAPS[b]) - sourceLevel)
    return da - db
  })[0]
  const template = MAPS[templateId]
  if (!template) return templateId
  const nativeLevel = levelRangeMid(template)
  const rarities = chestRarityBandForLevel(sourceLevel)
  const newId = `secret_dungeon_gen_${uid('dungeon')}`
  const clone = deepClone(template)
  clone.id = newId
  clone.name = `${template.name.replace(' (Secret)', '')} (Écho)`
  clone.levelRange = `${Math.max(1, Math.round(sourceLevel - 1))}-${Math.round(sourceLevel + 1)}`
  clone.chests = (clone.chests ?? []).map((chest, idx) => ({
    ...chest,
    rarityBias: rarities[idx % rarities.length],
  }))
  // Recalibre la puissance des ennemis/boss (mêmes templates que la forme d'origine,
  // mais rééchelonnés pour coller au niveau réel de la map d'où vient le portail).
  clone.levelScale = clamp(sourceLevel / Math.max(1, nativeLevel), 0.55, 2.4)
  clone.originTemplateId = templateId
  MAPS[newId] = clone
  run.world.generatedMaps ??= {}
  run.world.generatedMaps[newId] = clone
  return newId
}

function mapNeighbors(x, y) {
  return [
    [x + 1, y],
    [x - 1, y],
    [x, y + 1],
    [x, y - 1],
  ]
}

function transformPoint(point, variant, width, height) {
  if (!point) {
    return null
  }
  if (variant === 'flip_x') {
    return { ...point, x: width - 1 - point.x }
  }
  if (variant === 'flip_y') {
    return { ...point, y: height - 1 - point.y }
  }
  if (variant === 'flip_xy') {
    return { ...point, x: width - 1 - point.x, y: height - 1 - point.y }
  }
  return { ...point }
}

function transformTiles(tiles, variant, width, height) {
  if (!tiles?.length || variant === 'none') {
    return [...(tiles ?? [])]
  }
  const out = Array.from({ length: height }, () => Array.from({ length: width }, () => '#'))
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const source = transformPoint({ x, y }, variant, width, height)
      out[y][x] = tiles[source.y]?.[source.x] ?? '#'
    }
  }
  return out.map((row) => row.join(''))
}

function transformRect(rect, variant, width, height) {
  if (!rect) {
    return null
  }
  const box = {
    x: Math.max(0, Math.floor(rect.x ?? 0)),
    y: Math.max(0, Math.floor(rect.y ?? 0)),
    width: Math.max(1, Math.floor(rect.width ?? 1)),
    height: Math.max(1, Math.floor(rect.height ?? 1)),
  }
  if (variant === 'flip_x') {
    box.x = width - box.x - box.width
  } else if (variant === 'flip_y') {
    box.y = height - box.y - box.height
  } else if (variant === 'flip_xy') {
    box.x = width - box.x - box.width
    box.y = height - box.y - box.height
  }
  return box
}

function transformedNoSpawnZones(map, variant) {
  return (map.noSpawnZones ?? [])
    .map((zone) => transformRect(zone, variant, map.width, map.height))
    .filter(Boolean)
}

function markNoSpawnZones(map, tiles, blockedSet, zones) {
  for (const zone of zones) {
    const maxX = Math.min(map.width - 1, zone.x + zone.width - 1)
    const maxY = Math.min(map.height - 1, zone.y + zone.height - 1)
    for (let y = Math.max(0, zone.y); y <= maxY; y += 1) {
      for (let x = Math.max(0, zone.x); x <= maxX; x += 1) {
        if (mapIsWalkable(map, x, y, tiles)) {
          blockedSet.add(toKey(x, y))
        }
      }
    }
  }
}

function walkablePool(map, tiles, blockedSet) {
  const pool = []
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const key = toKey(x, y)
      if (!blockedSet.has(key) && mapIsWalkable(map, x, y, tiles)) {
        pool.push({ x, y })
      }
    }
  }
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const swap = randomInt(0, i)
    const tmp = pool[i]
    pool[i] = pool[swap]
    pool[swap] = tmp
  }
  return pool
}

function manhattanDistance(a, b) {
  if (!a || !b) {
    return 0
  }
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

function takeCellFromPool(pool, blockedSet, anchor = null, minDistance = 0) {
  if (!pool.length) {
    return null
  }
  let candidates = pool
    .map((cell, index) => ({ index, cell }))
    .filter((entry) => !blockedSet.has(toKey(entry.cell.x, entry.cell.y)))

  if (minDistance > 0 && anchor) {
    const distant = candidates.filter((entry) => manhattanDistance(anchor, entry.cell) >= minDistance)
    if (distant.length) {
      candidates = distant
    }
  }

  if (!candidates.length) {
    return null
  }

  const picked = candidates[randomInt(0, candidates.length - 1)]
  const [cell] = pool.splice(picked.index, 1)
  blockedSet.add(toKey(cell.x, cell.y))
  return cell
}

function findNearestWalkable(map, x, y, blockedSet = new Set(), tiles = map.tiles) {
  if (mapIsWalkable(map, x, y, tiles) && !blockedSet.has(toKey(x, y))) {
    return { x, y }
  }

  const visited = new Set([toKey(x, y)])
  const queue = [{ x, y }]
  while (queue.length) {
    const cell = queue.shift()
    for (const [nx, ny] of mapNeighbors(cell.x, cell.y)) {
      const key = toKey(nx, ny)
      if (visited.has(key)) {
        continue
      }
      visited.add(key)
      if (mapIsWalkable(map, nx, ny, tiles) && !blockedSet.has(key)) {
        return { x: nx, y: ny }
      }
      if (nx >= 0 && ny >= 0 && nx < map.width && ny < map.height) {
        queue.push({ x: nx, y: ny })
      }
    }
  }
  for (let yy = 0; yy < map.height; yy += 1) {
    for (let xx = 0; xx < map.width; xx += 1) {
      if (mapIsWalkable(map, xx, yy, tiles) && !blockedSet.has(toKey(xx, yy))) {
        return { x: xx, y: yy }
      }
    }
  }
  return { x: 1, y: 1 }
}

function placeRandomizedEntities(map, tiles, entities, pool, blockedSet, startCell, minDistance, mapper) {
  return entities.map((entry) => {
    let cell
    if (entry.fixed && entry.x != null && entry.y != null && mapIsWalkable(map, entry.x, entry.y, tiles)) {
      cell = { x: entry.x, y: entry.y }
    } else {
      const randomCell = takeCellFromPool(pool, blockedSet, startCell, minDistance)
      cell = randomCell ?? findNearestWalkable(map, entry.x ?? startCell?.x ?? 1, entry.y ?? startCell?.y ?? 1, blockedSet, tiles)
    }
    blockedSet.add(toKey(cell.x, cell.y))
    return mapper(entry, cell)
  })
}

const TRAP_CLUSTER_DIRECTIONS = [
  { dx: 1, dy: 0 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 0, dy: -1 },
]

function shuffled(list) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// Place une grappe de pièges sur 2-3 cases voisines alignées, en vérifiant à chaque
// étape que la case est bien du sol franc (jamais un mur ni une case déjà occupée) —
// avec repli sur une grappe plus courte, voire une case unique, si l'espace manque.
function placeTrapCluster(map, tiles, trapDef, pool, blockedSet, startCell) {
  const isFreeFloor = (x, y) => mapIsWalkable(map, x, y, tiles) && !blockedSet.has(toKey(x, y))

  // Note : takeCellFromPool réserve déjà la case dans blockedSet en la retournant —
  // ne pas la re-vérifier avec isFreeFloor (qui échouerait systématiquement).
  let origin = null
  if (trapDef.fixed && trapDef.x != null && trapDef.y != null && isFreeFloor(trapDef.x, trapDef.y)) {
    origin = { x: trapDef.x, y: trapDef.y }
  } else {
    origin = takeCellFromPool(pool, blockedSet, startCell, 2)
  }
  if (!origin) {
    return []
  }

  const desiredCount = Math.max(1, trapDef.count ?? randomInt(2, 3))
  const directions =
    trapDef.direction === 'horizontal'
      ? [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }]
      : trapDef.direction === 'vertical'
        ? [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }]
        : shuffled(TRAP_CLUSTER_DIRECTIONS)

  for (let size = desiredCount; size >= 1; size -= 1) {
    for (const dir of directions) {
      const cells = [origin]
      let ok = true
      for (let i = 1; i < size; i += 1) {
        const nx = origin.x + dir.dx * i
        const ny = origin.y + dir.dy * i
        if (!isFreeFloor(nx, ny)) {
          ok = false
          break
        }
        cells.push({ x: nx, y: ny })
      }
      if (ok) {
        for (const cell of cells) {
          blockedSet.add(toKey(cell.x, cell.y))
        }
        return cells.map((cell, idx) => ({
          id: `${trapDef.id}_${idx}`,
          type: trapDef.type,
          x: cell.x,
          y: cell.y,
          triggered: false,
        }))
      }
    }
  }

  blockedSet.add(toKey(origin.x, origin.y))
  return [{ id: `${trapDef.id}_0`, type: trapDef.type, x: origin.x, y: origin.y, triggered: false }]
}

function placeTrapGroups(map, tiles, trapDefs, pool, blockedSet, startCell) {
  const traps = []
  for (const trapDef of trapDefs) {
    traps.push(...placeTrapCluster(map, tiles, trapDef, pool, blockedSet, startCell))
  }
  return traps
}

function defaultBackPortalForMap(mapId, map) {
  const index = MAP_ORDER.indexOf(mapId)
  if (index <= 0 || !map || mapId === TUTORIAL_MAP_ID) {
    return map?.backPortal ?? null
  }
  return map.backPortal ?? {
    x: map.start?.x ?? 1,
    y: map.start?.y ?? 1,
    targetMapId: MAP_ORDER[index - 1],
  }
}

function proceduralSpiderTemplateForMap(map) {
  const minLevel = Number.parseInt(String(map?.levelRange ?? '1').split('-')[0], 10) || 1
  if (minLevel >= 28) return randomChoice(['cave_spider', 'broodmother_spider', 'crypt_spider']) ?? 'cave_spider'
  if (minLevel >= 16) return randomChoice(['obsidian_spider', 'crypt_spider']) ?? 'obsidian_spider'
  if (minLevel >= 5) return randomChoice(['crypt_spider', 'ashen_spider']) ?? 'crypt_spider'
  return 'ashen_spider'
}

function proceduralSpiderSpawnsForMap(mapId, map) {
  if (!map || mapId === TUTORIAL_MAP_ID || map.isSecretRoom) {
    return []
  }
  const minLevel = Number.parseInt(String(map.levelRange ?? '1').split('-')[0], 10) || 1
  const baseChance = map.isSecret ? 0.72 : PROCEDURAL_SPIDER_SPAWN_CHANCE
  if (!chance(baseChance)) {
    return []
  }
  const maxCount = map.isSecret ? 1 : PROCEDURAL_SPIDER_MAX_COUNT
  const count = minLevel >= 12 && chance(0.45) ? maxCount : 1
  return Array.from({ length: count }, (_, index) => ({
    id: uid(`spider_${mapId}_${index}`),
    templateId: proceduralSpiderTemplateForMap(map),
  }))
}
function createEnemyInstance(spawn, cell, isBoss = false) {
  const template = enemyById(spawn.templateId)
  return {
    id: spawn.id ?? uid('enemy'),
    templateId: spawn.templateId,
    x: cell.x,
    y: cell.y,
    isBoss,
    alive: true,
    currentHp: template?.maxHp ?? 1,
    currentMana: template?.maxMana ?? 0,
  }
}

function rollAuxiliaryNpcSpawns(map, mapId, pool, blocked, start, npcs, counters) {
  if (map.isSecret || map.isSecretRoom || mapId === TUTORIAL_MAP_ID) {
    return
  }
  counters.sinceSocketer = (counters.sinceSocketer ?? 0) + 1
  counters.sinceIdentifier = (counters.sinceIdentifier ?? 0) + 1

  let spawnedSocketer = false
  if (counters.sinceSocketer >= SPIRIT_SOCKETER_MIN_GAP && chance(SPIRIT_SOCKETER_SPAWN_CHANCE)) {
    const cell = takeCellFromPool(pool, blocked, start, 2)
    if (cell) {
      blocked.add(toKey(cell.x, cell.y))
      npcs.push({
        id: uid('spirit_socketer'),
        name: randomChoice(SPIRIT_SOCKETER_NAMES),
        role: 'spirit_socketer',
        portrait: WIZZARD_ASSET,
        dialogue: 'Apporte-moi tes pierres d\'esprit, je les sertirai dans ton équipement.',
        x: cell.x,
        y: cell.y,
      })
      counters.sinceSocketer = 0
      spawnedSocketer = true
    }
  }

  // Jamais sur la même map que le sertisseur.
  if (!spawnedSocketer && counters.sinceIdentifier >= SPIRIT_IDENTIFIER_MIN_GAP && chance(SPIRIT_IDENTIFIER_SPAWN_CHANCE)) {
    const cell = takeCellFromPool(pool, blocked, start, 2)
    if (cell) {
      blocked.add(toKey(cell.x, cell.y))
      npcs.push({
        id: uid('spirit_identifier'),
        name: randomChoice(SPIRIT_IDENTIFIER_NAMES),
        role: 'spirit_identifier',
        portrait: ROGUE_ASSET,
        dialogue: 'Une pierre non identifiée ? Je peux en révéler la nature, contre un peu de ton expérience.',
        x: cell.x,
        y: cell.y,
      })
      counters.sinceIdentifier = 0
    }
  }
}

function createMapState(mapId, spawnCounters = { sinceSocketer: 0, sinceIdentifier: 0 }) {
  const map = currentMapById(mapId)
  const layoutVariant = map.noVariants ? 'none' : (randomChoice(MAP_LAYOUT_VARIANTS) ?? 'none')
  const tiles = transformTiles(map.tiles, layoutVariant, map.width, map.height)
  const transformedStart = transformPoint(map.start, layoutVariant, map.width, map.height)
  const transformedSecret = transformPoint(map.secretPortal ?? null, layoutVariant, map.width, map.height)
  const transformedBack = transformPoint(map.backPortal ?? null, layoutVariant, map.width, map.height)
  const noSpawnZones = transformedNoSpawnZones(map, layoutVariant)

  const blocked = new Set()
  const start = findNearestWalkable(map, transformedStart.x, transformedStart.y, blocked, tiles)
  blocked.add(toKey(start.x, start.y))

  let exit = null
  if (map.exit) {
    const transformedExit = transformPoint(map.exit, layoutVariant, map.width, map.height)
    const exitCell = findNearestWalkable(map, transformedExit.x, transformedExit.y, blocked, tiles)
    exit = { ...map.exit, x: exitCell.x, y: exitCell.y }
    blocked.add(toKey(exit.x, exit.y))
  }

  let secretPortal = null
  if (map.secretPortal) {
    const secretCell = findNearestWalkable(
      map,
      transformedSecret.x,
      transformedSecret.y,
      blocked,
      tiles,
    )
    secretPortal = {
      ...map.secretPortal,
      x: secretCell.x,
      y: secretCell.y,
    }
    blocked.add(toKey(secretPortal.x, secretPortal.y))
  }

  const baseBackPortal = defaultBackPortalForMap(mapId, map)
  let backPortal = null
  if (baseBackPortal) {
    const backPoint = map.backPortal ? transformedBack : transformPoint(baseBackPortal, layoutVariant, map.width, map.height)
    const backCell = findNearestWalkable(map, backPoint.x, backPoint.y, blocked, tiles)
    backPortal = {
      ...baseBackPortal,
      x: backCell.x,
      y: backCell.y,
    }
    blocked.add(toKey(backPortal.x, backPortal.y))
  }

  markNoSpawnZones(map, tiles, blocked, noSpawnZones)

  const pool = walkablePool(map, tiles, blocked)

  // Portail de camp : uniquement sur la toute première map de la progression, pour
  // permettre d'aller se préparer (forge/craft) avant d'affronter son boss sans
  // attendre de l'avoir vaincu. Pas sur les maps suivantes (elles ont déjà le portail
  // de retour au camp normal une fois leur propre boss vaincu), ni sur les secrètes/tutoriel.
  let campPortal = null
  if (mapId === MAP_ORDER[0] && !map.isSecret && !map.isSecretRoom && mapId !== TUTORIAL_MAP_ID) {
    const campCell = takeCellFromPool(pool, blocked, start, 2)
    if (campCell) {
      blocked.add(toKey(campCell.x, campCell.y))
      campPortal = { x: campCell.x, y: campCell.y }
    }
  }

  // Filtre les PNJ optionnels selon leur spawnChance (défaut 1.0 = toujours présent)
  const eligibleNpcs = (map.npcs ?? []).filter((npc) => chance(npc.spawnChance ?? 1.0))

  const npcs = placeRandomizedEntities(map, tiles, eligibleNpcs, pool, blocked, start, 1, (npc, cell) => ({
    ...npc,
    x: cell.x,
    y: cell.y,
  }))

  const resources = placeRandomizedEntities(map, tiles, map.resources ?? [], pool, blocked, start, 2, (resource, cell) => ({
    ...resource,
    x: cell.x,
    y: cell.y,
  }))

  const chests = placeRandomizedEntities(map, tiles, map.chests ?? [], pool, blocked, start, 3, (chest, cell) => ({
    ...chest,
    x: cell.x,
    y: cell.y,
    opened: false,
    icon: CHEST_ICON,
  }))

  // Pièges de terrain : visibles sur la carte (contrairement aux coffres piégés),
  // à usage unique — désamorcés après un premier passage. Placés par grappes de 2-3
  // cases voisines en ligne droite, jamais dans un mur. En plus des pièges authorés à
  // la main (ex: tutoriel), une map régulière a une chance d'en générer une grappe
  // aléatoire — pas systématique, pour que ça reste une surprise ponctuelle.
  const effectiveTrapDefs = [...(map.traps ?? [])]
  if (!map.isSecret && !map.isSecretRoom && mapId !== TUTORIAL_MAP_ID && chance(RANDOM_TRAP_SPAWN_CHANCE)) {
    effectiveTrapDefs.push({ id: uid('trap_spike'), type: 'spike', fixed: false })
  }
  const traps = placeTrapGroups(map, tiles, effectiveTrapDefs, pool, blocked, start)

  const enemySpawns = [
    ...(map.enemies ?? []),
    ...proceduralSpiderSpawnsForMap(mapId, map),
  ]
  const enemies = placeRandomizedEntities(map, tiles, enemySpawns, pool, blocked, start, 3, (enemySpawn, cell) =>
    createEnemyInstance(enemySpawn, cell, false),
  )

  let bossDefeatedInitial = false
  if (map.boss) {
    let bossCell
    if (map.boss.fixed && map.boss.x != null && map.boss.y != null && mapIsWalkable(map, map.boss.x, map.boss.y, tiles)) {
      bossCell = { x: map.boss.x, y: map.boss.y }
    } else {
      const randomBossCell = takeCellFromPool(pool, blocked, start, 6)
      const transformedBoss = transformPoint(map.boss, layoutVariant, map.width, map.height)
      bossCell = randomBossCell ?? findNearestWalkable(map, transformedBoss.x, transformedBoss.y, blocked, tiles)
    }
    blocked.add(toKey(bossCell.x, bossCell.y))
    enemies.push(createEnemyInstance(map.boss, bossCell, true))
  } else {
    bossDefeatedInitial = true
  }

  // Spawn aléatoire : PNJ Défi + Marchand itinérant (hors maps secrètes et hors tutoriel)
  if (!map.isSecret && !map.isSecretRoom && mapId !== TUTORIAL_MAP_ID) {
    if (chance(CHALLENGER_NPC_SPAWN_CHANCE)) {
      const cell = takeCellFromPool(pool, blocked, start, 2)
      if (cell) {
        blocked.add(toKey(cell.x, cell.y))
        npcs.push({
          id: uid('challenger'),
          name: randomChoice(CHALLENGER_NAMES),
          role: 'challenger',
          portrait: randomChoice([KNIGHT_ASSET, ROGUE_ASSET]),
          dialogue: 'Je défie tout aventurier qui croise mon chemin. As-tu le cran ?',
          completed: false,
          x: cell.x,
          y: cell.y,
        })
      }
    }
    if (chance(WANDERING_MERCHANT_SPAWN_CHANCE)) {
      const cell = takeCellFromPool(pool, blocked, start, 2)
      if (cell) {
        blocked.add(toKey(cell.x, cell.y))
        npcs.push({
          id: uid('wandering_merchant'),
          name: randomChoice(WANDERING_MERCHANT_NAMES),
          role: 'wandering_merchant',
          portrait: WIZZARD_ASSET,
          dialogue: 'Des reliques uniques. Chères. Mais ça en vaut le prix.',
          stock: null,
          x: cell.x,
          y: cell.y,
        })
      }
    }
  }

  rollAuxiliaryNpcSpawns(map, mapId, pool, blocked, start, npcs, spawnCounters)

  const levers = Object.fromEntries((map.levers ?? []).map((l) => [l.id, false]))

  return {
    layoutVariant,
    tiles,
    start,
    exit,
    secretPortal,
    backPortal,
    campPortal,
    npcs,
    discovered: [],
    enemies,
    resources,
    chests,
    traps,
    solvedRiddles: [],
    failedRiddles: [],
    selectedRiddles: {},
    bossDefeated: bossDefeatedInitial,
    secretPortalRevealed: false,
    noSpawnZones,
    levers,
    leverSequenceProgress: [],
  }
}

function starterWeaponForClass(classId) {
  return STARTER_WEAPON_BY_CLASS[classId] ?? STARTER_WEAPON_BY_CLASS.warrior
}

function createStarterInventory(selectedClass, difficulty) {
  const starter = starterWeaponForClass(selectedClass.id)
  const startingTorches = difficulty === 'hardcore' ? 2 : 1
  return [
    {
      id: uid('consumable'),
      kind: 'consumable',
      name: 'Potion de soin',
      effect: 'heal_50',
      quantity: 2,
      rarity: 'common',
      value: 24,
      icon: '/assets/Icons/life_potion.png',
    },
    {
      id: uid('consumable'),
      kind: 'consumable',
      name: 'Elixir de mana',
      effect: 'mana_60',
      quantity: 1,
      rarity: 'common',
      value: 22,
      icon: '/assets/Icons/mana_potion.png',
    },
    {
      id: uid('consumable'),
      kind: 'consumable',
      name: 'Torche runique',
      effect: 'vision_boost',
      quantity: startingTorches,
      rarity: 'common',
      value: 30,
      icon: '/assets/Icons/torche-runique.png',
    },
    {
      id: uid('equipment'),
      kind: 'equipment',
      slot: 'weapon',
      name: starter.name,
      rarity: 'common',
      quality: 'good',
      attack: starter.attack,
      defense: starter.defense,
      value: 45,
      icon: starter.icon,
      weaponType: starter.weaponType,
    },
  ]
}

function createShopStock() {
  const stock = {}
  for (const item of CONSUMABLES_SHOP) {
    if ((item.stock ?? 0) > 0) {
      stock[item.id] = item.stock
    }
  }
  return stock
}

export function createRun({ name, classId, difficulty }) {
  const selectedClass = classById(classId)
  const firstMapId = MAP_ORDER[0]
  const firstMapState = createMapState(firstMapId)
  const firstStart = firstMapState.start ?? MAPS[firstMapId].start

  const run = {
    metadata: {
      createdAt: new Date().toISOString(),
      difficulty,
      difficultyLabel: difficultyFor({ metadata: { difficulty } }).label,
      lore: 'Le serment des Cartographes perdu.',
    },
    player: {
      name: name.trim() || 'Aelys',
      classId: selectedClass.id,
      level: 1,
      xp: 0,
      nextXp: xpForLevel(1),
      hp: selectedClass.baseStats.maxHp,
      mana: selectedClass.baseStats.maxMana,
      gold: 75,
      passivePoints: 1,
      unlockedPassives: [],
      inventory: createStarterInventory(selectedClass, difficulty),
      equipment: {
        weapon: null,
        armor: null,
        trinket: null,
      },
      materials: createMaterialBag(),
      deaths: 0,
      passiveResetsUsed: 0,
      quests: { active: [], completed: [], killCounts: {} },
      discoveredSecretRooms: [],
      shrineBlessing: {},
      lunarBlessingReceived: false,
    },
    world: {
      currentMapId: firstMapId,
      currentMapIndex: 0,
      returnMapId: null,
      playerPosition: { ...firstStart },
      maps: { [firstMapId]: firstMapState },
      shopStock: createShopStock(),
      spawnCounters: { sinceSocketer: 0, sinceIdentifier: 0 },
      generatedMaps: {},
    },
    combat: null,
    pendingLootModal: null,
    levelUpModal: null,
    eventLog: [],
    phase: 'exploring',
    gameOver: false,
    hardcoreDeath: false,
    victory: false,
  }

  const starterWeapon = run.player.inventory.find((item) => item.kind === 'equipment' && item.slot === 'weapon')
  if (starterWeapon) {
    run.player.equipment.weapon = starterWeapon
    run.player.inventory = run.player.inventory.filter((item) => item.id !== starterWeapon.id)
  }

  revealAround(run, firstMapId, run.world.playerPosition.x, run.world.playerPosition.y, 2)
  syncVitals(run, true)
  const innate = selectedClass.innatePassive ? ` Passif de classe: ${selectedClass.innatePassive.name}.` : ''
  appendLog(
    run,
    `Debut de campagne: ${run.player.name}, classe ${selectedClass.name}, mode ${run.metadata.difficultyLabel}.${innate}`,
  )
  return run
}

function ensureMapState(run, mapId) {
  run.world.maps ??= {}
  if (!run.world.maps[mapId]) {
    run.world.spawnCounters ??= { sinceSocketer: 0, sinceIdentifier: 0 }
    run.world.maps[mapId] = createMapState(mapId, run.world.spawnCounters)
  }
  return run.world.maps[mapId]
}

function ensurePlayerState(run) {
  run.player.materials ??= createMaterialBag()
  for (const key of Object.keys(MATERIAL_LABELS)) {
    run.player.materials[key] ??= 0
  }
  run.player.inventory ??= []
  run.player.equipment ??= { weapon: null, armor: null, trinket: null }
  run.player.unlockedPassives ??= []
  run.player.passivePoints ??= 0
  run.player.passiveResetsUsed ??= 0
  run.player.deaths ??= 0
  run.player.nextXp ??= xpForLevel(run.player.level || 1)
  run.player.preparedBuffs ??= []
  // Migration : l'idole de renaissance était un simple booléen, elle devient un
  // objet cumulable (run.player.materials.revive_charm).
  if (run.player.hasRevive) {
    run.player.materials ??= {}
    run.player.materials.revive_charm = (run.player.materials.revive_charm ?? 0) + 1
  }
  delete run.player.hasRevive
  run.player.quests ??= { active: [], completed: [], killCounts: {} }
  run.player.quests.active ??= []
  run.player.quests.completed ??= []
  run.player.quests.killCounts ??= {}
  run.player.discoveredSecretRooms ??= []
  run.player.shrineBlessing ??= {}
  run.player.lunarBlessingReceived ??= false
  // Migration : les objets créés avant l'introduction du système de qualité n'ont pas
  // de champ `quality` — on leur attribue "bonne facture" par défaut (ni le pire, ni
  // le meilleur), sans retoucher leurs stats déjà attribuées.
  const allEquipment = [
    ...run.player.inventory.filter((i) => i.kind === 'equipment'),
    ...Object.values(run.player.equipment).filter(Boolean),
  ]
  for (const item of allEquipment) {
    item.quality ??= 'good'
  }
}

function ensureShopStockState(run) {
  run.world.shopStock ??= {}
  for (const item of CONSUMABLES_SHOP) {
    if ((item.stock ?? 0) <= 0) {
      continue
    }
    if (run.world.shopStock[item.id] == null) {
      run.world.shopStock[item.id] = item.stock
    }
  }
}

export function hydrateRun(rawSnapshot) {
  if (!rawSnapshot) {
    return null
  }

  const run = deepClone(rawSnapshot)
  run.metadata ??= {}
  run.eventLog ??= []
  run.levelUpModal ??= null
  run.world ??= {}
  run.world.generatedMaps ??= {}
  // Réinjecte les maps procédurales générées lors de parties précédentes dans le
  // registre global MAPS (celui-ci n'est pas sérialisé — seule sa définition l'est).
  Object.assign(MAPS, run.world.generatedMaps)
  run.world.currentMapId ??= MAP_ORDER[0]
  run.world.playerPosition ??= { ...MAPS[run.world.currentMapId].start }
  run.world.returnMapId ??= null
  run.world.shopStock ??= createShopStock()
  run.world.spawnCounters ??= { sinceSocketer: 0, sinceIdentifier: 0 }
  run.combat ??= null
  run.pendingLootModal ??= null
  run.gameOver ??= false
  run.hardcoreDeath ??= false
  run.victory ??= false
  run.phase ??= 'exploring'
  run.hubReturnMapId ??= null
  run.world.currentMapIndex ??= MAP_ORDER.indexOf(run.world.currentMapId)

  ensurePlayerState(run)
  ensureShopStockState(run)

  // N'hydrate que les maps déjà existantes dans la sauvegarde (pas de création lazily pour les maps non encore atteintes)
  for (const mapId of Object.keys(run.world.maps ?? {})) {
    const map = MAPS[mapId]
    if (!map) continue
    const state = run.world.maps[mapId]
    state.tiles ??= [...map.tiles]
    state.start ??= { ...map.start }
    if (state.exit == null) {
      state.exit = map.exit != null ? { ...map.exit } : null
    }
    state.secretPortal ??= map.secretPortal ? { ...map.secretPortal } : null
    state.backPortal ??= defaultBackPortalForMap(mapId, map) ? { ...defaultBackPortalForMap(mapId, map) } : null
    state.campPortal ??= null
    state.traps ??= []
    if (state.exit && map.exit) {
      state.exit.targetMapId = map.exit.targetMapId
    }
    if (state.secretPortal && map.secretPortal && !state.secretPortalRevealed) {
      // Ne resynchronise sur la cible statique que tant que le portail n'a pas
      // déjà été révélé — une fois révélé, sa cible est une map générée à la volée
      // (voir generateProceduralSecretDungeon) qu'il ne faut pas écraser au reload.
      state.secretPortal.targetMapId = map.secretPortal.targetMapId
    }
    if (state.backPortal) {
      state.backPortal.targetMapId = (defaultBackPortalForMap(mapId, map) ?? state.backPortal).targetMapId
    }
    state.npcs ??= (map.npcs ?? []).map((npc) => ({ ...npc }))
    state.discovered ??= []
    state.resources ??= []
    state.chests ??= []
    state.enemies ??= []
    state.solvedRiddles ??= []
    state.failedRiddles ??= []
    state.selectedRiddles ??= {}
    state.bossDefeated ??= false
    state.secretPortalRevealed ??= false
    state.noSpawnZones ??= []
    state.leverSequenceProgress ??= []
  }
  // S'assure que la map courante est toujours présente
  ensureMapState(run, run.world.currentMapId)

  syncVitals(run, false)
  revealAround(run, run.world.currentMapId, run.world.playerPosition.x, run.world.playerPosition.y, 1)
  return run
}

function addBonuses(target, source) {
  for (const [key, value] of Object.entries(source)) {
    target[key] = (target[key] ?? 0) + value
  }
}

function passiveBonuses(run) {
  const selectedClass = classById(run.player.classId)
  const out = {}
  for (const passiveId of run.player.unlockedPassives) {
    const passive = selectedClass.passives.find((entry) => entry.id === passiveId)
    if (passive?.bonuses) {
      addBonuses(out, passive.bonuses)
    }
  }
  return out
}

function innateBonuses(run) {
  return classById(run.player.classId).innatePassive?.bonuses ?? {}
}

function equipmentBonusStats(run) {
  const out = {}
  for (const item of Object.values(run.player.equipment).filter(Boolean)) {
    if (item.bonusStats) {
      addBonuses(out, item.bonusStats)
    }
    for (const socket of item.sockets ?? []) {
      if (socket?.bonusStats) {
        addBonuses(out, socket.bonusStats)
      }
    }
  }
  return out
}

export function derivedStats(run) {
  const selectedClass = classById(run.player.classId)
  const level = run.player.level
  const passives = passiveBonuses(run)
  const innate = innateBonuses(run)
  const gearBonuses = equipmentBonusStats(run)
  const gear = Object.values(run.player.equipment).filter(Boolean)
  const allBonuses = {}
  addBonuses(allBonuses, passives)
  addBonuses(allBonuses, innate)
  addBonuses(allBonuses, gearBonuses)
  addBonuses(allBonuses, run.player.shrineBlessing ?? {})

  const equipmentAttack = gear.reduce((sum, item) => sum + (item.attack ?? 0), 0)
  const equipmentDefense = gear.reduce((sum, item) => sum + (item.defense ?? 0), 0)

  const stats = {
    maxHp: selectedClass.baseStats.maxHp + (level - 1) * 11,
    maxMana: selectedClass.baseStats.maxMana + (level - 1) * 8,
    attack: selectedClass.baseStats.attack + Math.floor((level - 1) * 2.2) + equipmentAttack,
    defense: selectedClass.baseStats.defense + Math.floor((level - 1) * 1.5) + equipmentDefense,
    speed: selectedClass.baseStats.speed + Math.floor((level - 1) * 0.35),
    critChance: selectedClass.baseStats.critChance + (level - 1) * 0.004,
    dodgeChance: selectedClass.baseStats.dodgeChance ?? 0.05,
    parryChance: selectedClass.baseStats.parryChance ?? 0.05,
    critDamage: selectedClass.baseStats.critDamage ?? 0.45,
    toppleChance: selectedClass.baseStats.toppleChance ?? 0.06,
    statusChance: 0,
    statusResist: selectedClass.baseStats.statusResist ?? 0.03,
    ap: selectedClass.baseStats.ap,
    damagePercent: 0,
    magicDamagePercent: 0,
    dotPercent: 0,
    manaRegenFlat: 0,
    lifeRegenFlat: 0,
    healingDonePercent: 0,
    healingTakenPercent: 0,
    maxHpPercent: 0,
    maxManaPercent: 0,
    attackPercent: 0,
    defensePercent: 0,
    speedPercent: 0,
    spellPowerPercent: 0,
    lowHpDamagePercent: 0,
    manaCostReductionPercent: 0,
    cooldownReductionPercent: 0,
    damageReductionPercent: 0,
    gatherBonus: 0,
    bossDamagePercent: 0,
    highHpDamagePercent: 0,
    lowHpDefensePercent: 0,
    highManaDamagePercent: 0,
    lifeStealPercent: 0,
    normalAttackCost: COMBAT_NORMAL_ATTACK_COST,
  }

  stats.maxHp += allBonuses.maxHpFlat ?? 0
  stats.maxMana += allBonuses.maxManaFlat ?? 0
  stats.attack += allBonuses.attackFlat ?? 0
  stats.defense += allBonuses.defenseFlat ?? 0
  stats.speed += allBonuses.speedFlat ?? 0
  stats.critChance += allBonuses.critChanceFlat ?? 0
  stats.critDamage += allBonuses.critDamageFlat ?? 0
  stats.dodgeChance += allBonuses.dodgeChanceFlat ?? 0
  stats.parryChance += allBonuses.parryChanceFlat ?? 0
  stats.toppleChance += allBonuses.toppleChanceFlat ?? 0
  stats.toppleChance += allBonuses.statusChanceFlat ?? 0
  stats.statusChance += allBonuses.statusChanceFlat ?? 0
  stats.statusResist += allBonuses.statusResistFlat ?? 0
  stats.ap += allBonuses.apFlat ?? 0
  stats.damagePercent += allBonuses.damagePercent ?? 0
  stats.magicDamagePercent += allBonuses.magicDamagePercent ?? 0
  stats.dotPercent += allBonuses.dotPercent ?? 0
  stats.manaRegenFlat += allBonuses.manaRegenFlat ?? 0
  stats.lifeRegenFlat += allBonuses.lifeRegenFlat ?? 0
  stats.healingDonePercent += allBonuses.healingDonePercent ?? 0
  stats.healingTakenPercent += allBonuses.healingTakenPercent ?? 0
  stats.maxHpPercent += allBonuses.maxHpPercent ?? 0
  stats.maxManaPercent += allBonuses.maxManaPercent ?? 0
  stats.attackPercent += allBonuses.attackPercent ?? 0
  stats.defensePercent += allBonuses.defensePercent ?? 0
  stats.speedPercent += allBonuses.speedPercent ?? 0
  stats.spellPowerPercent += allBonuses.spellPowerPercent ?? 0
  stats.lowHpDamagePercent += allBonuses.lowHpDamagePercent ?? 0
  stats.manaCostReductionPercent += allBonuses.manaCostReductionPercent ?? 0
  stats.cooldownReductionPercent += allBonuses.cooldownReductionPercent ?? 0
  stats.damageReductionPercent += allBonuses.damageReductionPercent ?? 0
  stats.gatherBonus += allBonuses.gatherBonus ?? 0
  stats.bossDamagePercent += allBonuses.bossDamagePercent ?? 0
  stats.highHpDamagePercent += allBonuses.highHpDamagePercent ?? 0
  stats.lowHpDefensePercent += allBonuses.lowHpDefensePercent ?? 0
  stats.highManaDamagePercent += allBonuses.highManaDamagePercent ?? 0
  stats.lifeStealPercent += allBonuses.lifeStealPercent ?? 0

  if (stats.maxHpPercent !== 0) {
    stats.maxHp = Math.floor(stats.maxHp * (1 + stats.maxHpPercent))
  }
  if (stats.maxManaPercent !== 0) {
    stats.maxMana = Math.floor(stats.maxMana * (1 + stats.maxManaPercent))
  }
  if (stats.attackPercent !== 0) {
    stats.attack = Math.floor(stats.attack * (1 + stats.attackPercent))
  }
  if (stats.defensePercent !== 0) {
    stats.defense = Math.floor(stats.defense * (1 + stats.defensePercent))
  }
  if (stats.speedPercent !== 0) {
    stats.speed = Math.floor(stats.speed * (1 + stats.speedPercent))
  }
  if (stats.spellPowerPercent !== 0) {
    stats.magicDamagePercent += stats.spellPowerPercent
  }

  if (run.player.hp / Math.max(1, stats.maxHp) > 0.7) {
    stats.damagePercent += stats.highHpDamagePercent
  }
  if (run.player.hp / Math.max(1, stats.maxHp) < 0.3) {
    stats.defense = Math.floor(stats.defense * (1 + stats.lowHpDefensePercent))
    stats.damagePercent += stats.lowHpDamagePercent
  }
  if (run.player.mana / Math.max(1, stats.maxMana) > 0.5) {
    stats.damagePercent += stats.highManaDamagePercent
  }

  stats.maxHp = Math.max(1, Math.floor(stats.maxHp))
  stats.maxMana = Math.max(0, Math.floor(stats.maxMana))
  stats.attack = Math.max(1, Math.floor(stats.attack))
  stats.defense = Math.max(0, Math.floor(stats.defense))
  stats.speed = Math.max(1, Math.floor(stats.speed))
  stats.critChance = clamp(stats.critChance, 0, 0.72)
  stats.critDamage = clamp(stats.critDamage, 0.2, 1.25)
  stats.dodgeChance = clamp(stats.dodgeChance, 0, 0.6)
  stats.parryChance = clamp(stats.parryChance, 0, 0.55)
  stats.toppleChance = clamp(stats.toppleChance, 0, 0.5)
  stats.statusChance = clamp(stats.statusChance, 0, 0.35)
  stats.statusResist = clamp(stats.statusResist, 0, 0.75)
  stats.manaCostReductionPercent = clamp(stats.manaCostReductionPercent, 0, 0.6)
  stats.cooldownReductionPercent = clamp(stats.cooldownReductionPercent, 0, 0.45)
  stats.damageReductionPercent = clamp(stats.damageReductionPercent, 0, 0.55)
  return stats
}

export function syncVitals(run, fullRestore = false) {
  const stats = derivedStats(run)
  run.player.hp = fullRestore ? stats.maxHp : clamp(run.player.hp, 0, stats.maxHp)
  run.player.mana = fullRestore ? stats.maxMana : clamp(run.player.mana, 0, stats.maxMana)
}

export function unlockedSkills(run) {
  const selectedClass = classById(run.player.classId)
  return selectedClass.skills.filter((skill) => skill.unlockLevel <= run.player.level)
}

export function unlockPassive(run, passiveId) {
  const selectedClass = classById(run.player.classId)
  const passive = selectedClass.passives.find((entry) => entry.id === passiveId)
  if (!passive) {
    return { ok: false, reason: 'Passif inconnu.' }
  }
  if (run.player.unlockedPassives.includes(passive.id)) {
    return { ok: false, reason: 'Passif déjà débloqué.' }
  }
  if (passive.requires && !run.player.unlockedPassives.includes(passive.requires)) {
    return { ok: false, reason: 'Prerequis manquant.' }
  }
  if (run.player.passivePoints <= 0) {
    return { ok: false, reason: 'Pas de points passifs.' }
  }
  run.player.passivePoints -= 1
  run.player.unlockedPassives.push(passive.id)
  syncVitals(run, false)
  appendLog(run, `Passif appris: ${passive.name}.`)
  return { ok: true, passive }
}

export function resetPassiveTree(run) {
  const resetCount = run.player.passiveResetsUsed ?? 0
  if (resetCount >= PASSIVE_RESET_LIMIT) {
    return { ok: false, reason: 'La réinitialisation des talents est déjà utilisee pour cette partie.' }
  }
  if (run.player.gold < PASSIVE_RESET_COST) {
    return { ok: false, reason: `Il faut ${PASSIVE_RESET_COST} or pour réinitialiser les talents.` }
  }

  const unlocked = run.player.unlockedPassives ?? []
  if (!unlocked.length) {
    return { ok: false, reason: 'Aucun passif à réinitialiser.' }
  }

  run.player.gold -= PASSIVE_RESET_COST
  run.player.passivePoints += unlocked.length
  run.player.unlockedPassives = []
  run.player.passiveResetsUsed = resetCount + 1
  syncVitals(run, false)
  appendLog(
    run,
    `Talents réinitialisés (${unlocked.length} points rendus) pour ${PASSIVE_RESET_COST} or. Réinitialisation unique consommée.`,
  )
  return {
    ok: true,
    refunded: unlocked.length,
    cost: PASSIVE_RESET_COST,
    used: run.player.passiveResetsUsed,
    limit: PASSIVE_RESET_LIMIT,
  }
}

export function dismissLevelUpModal(run) {
  run.levelUpModal = null
}

export function currentMap(run) {
  return currentMapById(run.world.currentMapId)
}

export function currentMapState(run) {
  return ensureMapState(run, run.world.currentMapId)
}

function isHardcoreFog(run) {
  return run.metadata?.difficulty === (DIFFICULTY_CONFIG.hardcore?.id ?? 'hardcore')
}

export function isTileDiscovered(run, mapId, x, y) {
  if (isHardcoreFog(run) && mapId === run.world?.currentMapId) {
    const px = run.world.playerPosition?.x ?? 0
    const py = run.world.playerPosition?.y ?? 0
    const boost = run.player?.visionBoostSteps ?? 0
    const visRadius = boost > 0 ? 2 : 1
    return Math.max(Math.abs(x - px), Math.abs(y - py)) <= visRadius
  }
  return ensureMapState(run, mapId).discovered.includes(toKey(x, y))
}

export function revealAround(run, mapId, x, y, radius = 2) {
  const map = currentMapById(mapId)
  const mapState = ensureMapState(run, mapId)
  if (isHardcoreFog(run)) {
    const r = radius
    const keys = []
    for (let dy = -r; dy <= r; dy += 1) {
      for (let dx = -r; dx <= r; dx += 1) {
        const tx = x + dx
        const ty = y + dy
        if (tx >= 0 && ty >= 0 && tx < map.width && ty < map.height) {
          keys.push(toKey(tx, ty))
        }
      }
    }
    mapState.discovered = keys
    return
  }
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (Math.abs(dx) + Math.abs(dy) > radius + 1) {
        continue
      }
      const tx = x + dx
      const ty = y + dy
      if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) {
        continue
      }
      const key = toKey(tx, ty)
      if (!mapState.discovered.includes(key)) {
        mapState.discovered.push(key)
      }
    }
  }
}

export function enemyAtPosition(run, x, y, mapId = run.world.currentMapId) {
  return ensureMapState(run, mapId).enemies.find((enemy) => enemy.alive && enemy.x === x && enemy.y === y) ?? null
}

/** Retourne un ennemi vivant adjacent à la position (x, y), ou null. Utilisé pour engager le combat en s’approchant. */
export function enemyAdjacentToPosition(run, x, y, mapId = run.world.currentMapId) {
  const mapState = ensureMapState(run, mapId)
  return (
    mapState.enemies.find((enemy) => {
      if (!enemy.alive) return false
      const dx = Math.abs(enemy.x - x)
      const dy = Math.abs(enemy.y - y)
      return dx + dy === 1
    }) ?? null
  )
}

export function isCellFreeForEnemy(run, mapId, x, y, excludeEnemyId = null) {
  const map = currentMapById(mapId)
  const mapState = ensureMapState(run, mapId)
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) {
    return false
  }
  if (!mapIsWalkable(map, x, y, mapState.tiles)) {
    return false
  }
  const px = run.world.playerPosition.x
  const py = run.world.playerPosition.y
  if (px === x && py === y) {
    return false
  }
  const hasNpc = (mapState.npcs ?? []).some((npc) => npc.x === x && npc.y === y)
  if (hasNpc) {
    return false
  }
  const other = mapState.enemies.find(
    (e) => e.alive && e.x === x && e.y === y && (excludeEnemyId == null || e.id !== excludeEnemyId),
  )
  return other == null
}

/** Déplacements possibles : 1 case (8 directions dont diagonales) et 2 cases (chemin dégagé). */
export function getEnemyMoveOptions(run, enemy) {
  const mapId = run.world.currentMapId
  const ex = enemy.x
  const ey = enemy.y
  const options = []

  const add = (nx, ny) => {
    if (isCellFreeForEnemy(run, mapId, nx, ny, enemy.id)) {
      options.push({ nx, ny })
    }
  }

  const oneStep = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ]
  for (const [dx, dy] of oneStep) {
    add(ex + dx, ey + dy)
  }

  const twoStepOrtho = [
    [0, -2, 0, -1],
    [0, 2, 0, 1],
    [-2, 0, -1, 0],
    [2, 0, 1, 0],
  ]
  for (const [dx2, dy2, midDx, midDy] of twoStepOrtho) {
    if (!isCellFreeForEnemy(run, mapId, ex + midDx, ey + midDy, enemy.id)) continue
    add(ex + dx2, ey + dy2)
  }

  const twoStepDiag = [
    [-2, -2, -1, -1],
    [-2, 2, -1, 1],
    [2, -2, 1, -1],
    [2, 2, 1, 1],
  ]
  for (const [dx2, dy2, midDx, midDy] of twoStepDiag) {
    if (!isCellFreeForEnemy(run, mapId, ex + midDx, ey + midDy, enemy.id)) continue
    add(ex + dx2, ey + dy2)
  }

  return options
}

export function moveEnemyTo(run, enemy, nx, ny) {
  enemy.x = nx
  enemy.y = ny
}

function chestAtPosition(run, x, y, mapId = run.world.currentMapId) {
  return ensureMapState(run, mapId).chests.find((chest) => !chest.opened && chest.x === x && chest.y === y) ?? null
}

function trapAtPosition(run, x, y, mapId = run.world.currentMapId) {
  return ensureMapState(run, mapId).traps?.find((trap) => !trap.triggered && trap.x === x && trap.y === y) ?? null
}

function triggerTrap(run, trap) {
  trap.triggered = true
  const def = TRAP_TYPES[trap.type] ?? TRAP_TYPES.spike
  const stats = derivedStats(run)
  const hpLost = Math.max(1, Math.floor(stats.maxHp * def.damagePercent))
  run.player.hp = Math.max(1, run.player.hp - hpLost)
  appendLog(run, `${def.label} ! ${def.triggerText} (−${hpLost} PV)`)
  if (def.debuff) {
    pushPreparedBuff(run, { type: 'debuff', stat: def.debuff.stat, value: def.debuff.value, turns: def.debuff.turns })
  }
  return { type: trap.type, label: def.label, icon: def.icon, hpLost }
}

export function nearbyNpc(run) {
  const mapState = currentMapState(run)
  const px = run.world.playerPosition.x
  const py = run.world.playerPosition.y
  return (
    mapState.npcs.find((npc) => Math.abs(npc.x - px) + Math.abs(npc.y - py) <= 1) ??
    mapState.npcs.find((npc) => npc.x === px && npc.y === py) ??
    null
  )
}

export function nearbyResource(run) {
  const px = run.world.playerPosition.x
  const py = run.world.playerPosition.y
  return (
    currentMapState(run).resources.find(
      (resource) => resource.charges > 0 && Math.abs(resource.x - px) + Math.abs(resource.y - py) <= 1,
    ) ?? null
  )
}

export function nearbyChest(run) {
  const px = run.world.playerPosition.x
  const py = run.world.playerPosition.y
  return (
    currentMapState(run).chests.find(
      (chest) => !chest.opened && Math.abs(chest.x - px) + Math.abs(chest.y - py) <= 1,
    ) ?? null
  )
}

export function nearbyLever(run) {
  const map = currentMapById(run.world.currentMapId)
  const mapState = currentMapState(run)
  const px = run.world.playerPosition.x
  const py = run.world.playerPosition.y
  const levers = map?.levers ?? []
  return (
    levers.find(
      (lever) =>
        !(mapState.levers?.[lever.id] ?? false) &&
        Math.abs(lever.x - px) + Math.abs(lever.y - py) <= 1,
    ) ?? null
  )
}

export function activateLever(run, leverId) {
  const map = currentMapById(run.world.currentMapId)
  const mapState = currentMapState(run)
  const lever = (map?.levers ?? []).find((l) => l.id === leverId)
  if (!lever) return { ok: false, reason: 'Levier introuvable.' }
  if (mapState.levers?.[leverId]) return { ok: false, reason: 'Levier déjà activé.' }

  mapState.levers ??= {}
  mapState.leverSequenceProgress ??= []

  // ── Puzzle séquentiel ────────────────────────────────────────────────────
  const puzzle = map.leverPuzzle
  if (puzzle?.order?.includes(leverId)) {
    const expectedNext = puzzle.order[mapState.leverSequenceProgress.length]

    if (leverId !== expectedNext) {
      // Mauvais ordre : reset de tous les leviers du puzzle
      const resetLevers = puzzle.order.slice()
      for (const id of resetLevers) {
        mapState.levers[id] = false
      }
      mapState.leverSequenceProgress = []
      appendLog(run, 'Mauvais ordre — les leviers se réinitialisent dans un cliquetis.')
      return { ok: true, wrongSequence: true, resetLevers, openedPositions: [] }
    }

    // Bon levier dans l'ordre
    mapState.levers[leverId] = true
    mapState.leverSequenceProgress.push(leverId)

    if (mapState.leverSequenceProgress.length === puzzle.order.length) {
      // Séquence complète : ouvrir les murs
      const openedPositions = []
      for (const pos of puzzle.opensWalls ?? []) {
        const row = mapState.tiles[pos.y]
        if (row && row[pos.x] === '#') {
          mapState.tiles[pos.y] = row.substring(0, pos.x) + '.' + row.substring(pos.x + 1)
          openedPositions.push({ x: pos.x, y: pos.y })
        }
      }
      mapState.leverSequenceProgress = []
      appendLog(run, 'Séquence correcte ! Un passage s\'ouvre dans les ombres...')
      return { ok: true, puzzleComplete: true, openedPositions }
    }

    const step = mapState.leverSequenceProgress.length
    appendLog(run, `Levier ${step}/${puzzle.order.length} — continuez la séquence.`)
    return { ok: true, puzzleProgress: true, step, total: puzzle.order.length, openedPositions: [] }
  }

  // ── Levier standard ──────────────────────────────────────────────────────
  mapState.levers[leverId] = true
  const openedPositions = []
  for (const pos of lever.opensWalls ?? []) {
    const row = mapState.tiles[pos.y]
    if (row && row[pos.x] === '#') {
      mapState.tiles[pos.y] = row.substring(0, pos.x) + '.' + row.substring(pos.x + 1)
      openedPositions.push({ x: pos.x, y: pos.y })
    }
  }
  appendLog(run, `Levier actionné : un passage secret s'ouvre dans la pierre.`)
  return { ok: true, openedPositions }
}

function addMaterial(run, material, amount) {
  run.player.materials[material] = (run.player.materials[material] ?? 0) + amount
}

function addInventoryItem(run, item) {
  if (item.kind === 'consumable') {
    const existing = run.player.inventory.find(
      (entry) => entry.kind === 'consumable' && entry.effect === item.effect && entry.rarity === item.rarity,
    )
    if (existing) {
      existing.quantity += item.quantity
      return
    }
  }
  run.player.inventory.push(item)
}

function removeInventoryItem(run, itemId) {
  const index = run.player.inventory.findIndex((item) => item.id === itemId)
  if (index >= 0) {
    run.player.inventory.splice(index, 1)
  }
}

function recordQuestKill(run, templateId) {
  run.player.quests.killCounts[templateId] = (run.player.quests.killCounts[templateId] ?? 0) + 1
}

export function availableQuestsForNpc(run, npcId) {
  return QUESTS.filter((quest) => quest.npcId === npcId && !run.player.quests.completed.includes(quest.id))
}

export function acceptQuest(run, questId) {
  const quest = getQuestById(questId)
  if (!quest) {
    return { ok: false, reason: 'Quete introuvable.' }
  }
  if (run.player.quests.active.includes(questId) || run.player.quests.completed.includes(questId)) {
    return { ok: false, reason: 'Quete deja acceptee.' }
  }
  run.player.quests.active.push(questId)
  appendLog(run, `Nouvelle quete acceptee : ${quest.name}.`)
  return { ok: true }
}

export function questProgress(run, questId) {
  const quest = getQuestById(questId)
  if (!quest) {
    return { current: 0, target: 1 }
  }
  const objective = quest.objective
  switch (objective.type) {
    case 'collect_material': {
      const current = Math.min(run.player.materials[objective.material] ?? 0, objective.amount)
      return { current, target: objective.amount }
    }
    case 'upgrade_equipment': {
      const items = [
        run.player.equipment.weapon,
        run.player.equipment.armor,
        run.player.equipment.trinket,
        ...run.player.inventory,
      ]
      const reached = items.some(
        (item) => item?.kind === 'equipment' && (item.enhancementLevel ?? 0) >= objective.enhancementLevel,
      )
      return { current: reached ? 1 : 0, target: 1 }
    }
    case 'discover_secret_room': {
      const found = run.player.discoveredSecretRooms.includes(objective.mapId)
      return { current: found ? 1 : 0, target: 1 }
    }
    case 'defeat_boss': {
      const defeated = (run.player.quests.killCounts[objective.templateId] ?? 0) > 0
      return { current: defeated ? 1 : 0, target: 1 }
    }
    case 'defeat_enemy_count': {
      const current = objective.templateIds.reduce(
        (sum, templateId) => sum + (run.player.quests.killCounts[templateId] ?? 0),
        0,
      )
      return { current: Math.min(current, objective.amount), target: objective.amount }
    }
    case 'reach_level': {
      return { current: Math.min(run.player.level, objective.level), target: objective.level }
    }
    default:
      return { current: 0, target: 1 }
  }
}

export function isQuestComplete(run, questId) {
  const { current, target } = questProgress(run, questId)
  return current >= target
}

export function turnInQuest(run, questId) {
  if (!run.player.quests.active.includes(questId)) {
    return { ok: false, reason: 'Quete non acceptee.' }
  }
  const quest = getQuestById(questId)
  if (!quest || !isQuestComplete(run, questId)) {
    return { ok: false, reason: 'Objectif non atteint.' }
  }

  if (quest.objective.type === 'collect_material') {
    addMaterial(run, quest.objective.material, -quest.objective.amount)
  }

  const rewards = quest.rewards
  const grantedMaterials = []
  const grantedItems = []
  if (rewards.gold) {
    run.player.gold += rewards.gold
  }
  for (const [material, amount] of Object.entries(rewards.materials ?? {})) {
    addMaterial(run, material, amount)
    grantedMaterials.push({ material, quantity: amount })
  }
  for (const consumable of rewards.consumables ?? []) {
    const quantity = consumable.quantity ?? 1
    for (let i = 0; i < quantity; i += 1) {
      const instance = { id: uid('consumable'), kind: 'consumable', ...consumable }
      addInventoryItem(run, instance)
      grantedItems.push(instance)
    }
  }
  if (rewards.loot) {
    const item = buildLootItem({
      run,
      isBoss: true,
      sourceName: quest.name,
      forcedRarity: rewards.loot.forcedRarity ?? null,
      forcedSlot: rewards.loot.forcedSlot ?? null,
    })
    addInventoryItem(run, item)
    grantedItems.push(item)
  }

  run.player.quests.active = run.player.quests.active.filter((id) => id !== questId)
  run.player.quests.completed.push(questId)
  appendLog(run, `Quete accomplie : ${quest.name}.`)
  return {
    ok: true,
    questName: quest.name,
    rewards: {
      gold: rewards.gold ?? 0,
      materials: grantedMaterials,
      items: grantedItems,
    },
  }
}

export function equipItem(run, itemId) {
  const item = run.player.inventory.find((entry) => entry.id === itemId)
  if (!item || item.kind !== 'equipment') {
    return { ok: false, reason: 'Objet non equipable.' }
  }

  const previous = run.player.equipment[item.slot]
  if (previous) {
    addInventoryItem(run, previous)
  }
  run.player.equipment[item.slot] = item
  removeInventoryItem(run, item.id)
  syncVitals(run, false)
  appendLog(run, `Equipe: ${item.name} (${RARITIES[item.rarity].label}).`)
  return { ok: true, item }
}

export function unequipItem(run, slot) {
  const item = run.player.equipment[slot]
  if (!item) {
    return { ok: false, reason: 'Aucun equipement sur ce slot.' }
  }
  run.player.equipment[slot] = null
  addInventoryItem(run, item)
  syncVitals(run, false)
  appendLog(run, `Retire: ${item.name}.`)
  return { ok: true, item }
}

export function harvestNearby(run) {
  const resource = nearbyResource(run)
  if (!resource) {
    return { ok: false, reason: 'Aucune ressource à proximité.' }
  }

  const table = RESOURCE_TABLE[resource.type]
  if (!table) {
    return { ok: false, reason: 'Ressource invalide.' }
  }

  const stats = derivedStats(run)
  const gained = []
  for (const drop of table.drops) {
    if (!chance(drop.chance)) {
      continue
    }
    const qty = randomInt(drop.min, drop.max) + Math.floor(randomInt(drop.min, drop.max) * stats.gatherBonus)
    addMaterial(run, drop.material, qty)
    gained.push({ material: drop.material, quantity: qty })
  }

  resource.charges = Math.max(0, resource.charges - 1)
  if (gained.length) {
    appendLog(
      run,
      `Recolte ${table.name}: ${gained.map((entry) => `${entry.quantity} ${MATERIAL_LABELS[entry.material]}`).join(', ')}.`,
    )
  } else {
    appendLog(run, `Recolte ${table.name}: rien de notable.`)
  }
  return { ok: true, resource, gained }
}

/** Récolte toutes les charges de la ressource à proximité en une fois. Retourne { ok, reason? } ou { ok: true, resourceName, gained }. */
export function harvestNearbyAllCharges(run) {
  const resource = nearbyResource(run)
  if (!resource) {
    return { ok: false, reason: 'Aucune ressource à proximité.' }
  }

  const table = RESOURCE_TABLE[resource.type]
  if (!table) {
    return { ok: false, reason: 'Ressource invalide.' }
  }

  const stats = derivedStats(run)
  const aggregated = /** @type {Record<string, number>} */ ({})

  while (resource.charges > 0) {
    for (const drop of table.drops) {
      if (!chance(drop.chance)) continue
      const qty = randomInt(drop.min, drop.max) + Math.floor(randomInt(drop.min, drop.max) * stats.gatherBonus)
      addMaterial(run, drop.material, qty)
      aggregated[drop.material] = (aggregated[drop.material] ?? 0) + qty
    }
    resource.charges -= 1
  }

  const gained = Object.entries(aggregated).map(([material, quantity]) => ({ material, quantity }))
  if (gained.length) {
    appendLog(
      run,
      `Recolte ${table.name} (tout): ${gained.map((e) => `${e.quantity} ${MATERIAL_LABELS[e.material]}`).join(', ')}.`,
    )
  } else {
    appendLog(run, `Recolte ${table.name} (tout): rien de notable.`)
  }
  return { ok: true, resourceName: table.name, gained }
}
function rarityWeights(isBoss) {
  if (isBoss) {
    return [
      { value: 'common', weight: 26 },
      { value: 'uncommon', weight: 26 },
      { value: 'rare', weight: 22 },
      { value: 'epic', weight: 14 },
      { value: 'legendary', weight: 9 },
      { value: 'mythic', weight: BOSS_MYTHIC_WEIGHT },
    ]
  }
  return RARITY_ORDER.map((value) => ({ value, weight: EQUIPMENT_RARITY_DROP_WEIGHTS[value] ?? 0 }))
}

function rarityRoll({ isBoss, bias }) {
  const base = rarityWeights(isBoss).map((entry) => ({ ...entry }))
  if (bias && RARITY_ORDER.includes(bias)) {
    const index = RARITY_ORDER.indexOf(bias)
    base.forEach((entry, idx) => {
      if (idx >= index) {
        entry.weight += isBoss ? 2 : 1
      }
      if (idx < index - 1) {
        entry.weight = Math.max(0, entry.weight - 2)
      }
    })
  }
  return weightedChoice(base) ?? 'common'
}

// Qualité d'un objet, indépendante de sa rareté : détermine où, dans la plage fixe de
// la rareté, tombent ses stats principales. `forcedWeights` permet au craft d'exclure
// la piètre qualité pour rester strictement meilleur que le loot aléatoire.
function rollEquipmentQuality(forcedWeights = null) {
  const weights = forcedWeights ?? EQUIPMENT_QUALITY_ORDER.map((id) => ({
    value: id,
    weight: EQUIPMENT_QUALITY[id].dropWeight,
  }))
  return weightedChoice(weights) ?? 'poor'
}

function rollInRange(range) {
  if (!range) return 0
  const [min, max] = range
  return randomInt(min, max)
}

function rollEquipmentPrimaryStats(slot, rarity, quality) {
  if (slot === 'weapon') {
    const range = WEAPON_ATTACK_RANGES[rarity]?.[quality] ?? WEAPON_ATTACK_RANGES.common.poor
    return { attack: rollInRange(range), defense: 0 }
  }
  if (slot === 'armor') {
    const range = ARMOR_DEFENSE_RANGES[rarity]?.[quality] ?? ARMOR_DEFENSE_RANGES.common.poor
    const attackBonus = quality === 'perfect' ? (ARMOR_PERFECT_ATTACK_BONUS[rarity] ?? 0) : 0
    return { attack: attackBonus, defense: rollInRange(range) }
  }
  const range = TRINKET_STAT_RANGES[rarity]?.[quality] ?? TRINKET_STAT_RANGES.common.poor
  return { attack: rollInRange(range), defense: rollInRange(range) }
}

function enemyMaterialDrops(enemy) {
  const drops = MATERIAL_FROM_ENEMY[enemy.templateId] ?? []
  const gained = []
  for (const drop of drops) {
    if (!chance(drop.chance)) {
      continue
    }
    gained.push({ material: drop.material, quantity: randomInt(drop.min, drop.max) })
  }
  if (enemy.isBoss && chance(BOSS_DROP_SHARD_CHANCE)) {
    gained.push({ material: 'boss_shard', quantity: 1 })
  }
  if (enemy.isBoss) {
    if (chance(0.05)) {
      gained.push({ material: 'spirit_chisel', quantity: 1 })
    }
    if (chance(0.04)) {
      gained.push({ material: 'stability_shard', quantity: 1 })
    }
    if (chance(0.04)) {
      gained.push({ material: 'misty_heart', quantity: 1 })
    }
  }
  return gained
}

function lootBaseScore(base) {
  const attack = base.attack ?? 0
  const defense = base.defense ?? 0
  return attack + defense * 0.8
}

function pickLootBase(slot, rarity) {
  const bases = LOOT_BASES[slot] ?? []
  if (!bases.length) {
    return null
  }

  const sorted = [...bases].sort((a, b) => lootBaseScore(a) - lootBaseScore(b))
  const rarityBands = {
    common: [0, 0.45],
    uncommon: [0.2, 0.65],
    rare: [0.35, 0.82],
    epic: [0.52, 1],
    legendary: [0.72, 1],
    mythic: [0.82, 1],
  }
  const [minRatio, maxRatio] = rarityBands[rarity] ?? [0, 1]
  const maxIndex = sorted.length - 1
  const startIndex = Math.min(maxIndex, Math.floor(maxIndex * minRatio))
  const endIndex = Math.max(startIndex, Math.min(maxIndex, Math.ceil(maxIndex * maxRatio)))
  const pool = sorted.slice(startIndex, endIndex + 1)
  return randomChoice(pool) ?? sorted[maxIndex]
}

function rollSocketCount(rarity) {
  const rule = SOCKET_RULES_BY_RARITY[rarity]
  if (!rule || rule.max <= 0) {
    return []
  }
  let count = rule.min
  if (rule.max > rule.min && chance(rule.chance ?? 0.5)) {
    count = rule.max
  }
  return new Array(count).fill(null)
}

function bonusCountForRarity(rarity) {
  const rule = RARITY_BONUS_RULES[rarity]
  if (!rule) {
    return 0
  }
  if (rule.min === rule.max) {
    return rule.min
  }
  let count = rule.min
  const extraSlots = Math.max(0, rule.max - rule.min)
  for (let i = 0; i < extraSlots; i += 1) {
    const chanceValue = rule.secondChance ?? 0.5
    if (chance(chanceValue)) {
      count += 1
    }
  }
  return count
}

function rollEquipmentBonuses(run, rarity) {
  const count = bonusCountForRarity(rarity)
  if (count <= 0) {
    return { bonusStats: null, affixes: [] }
  }

  const bonusStats = {}
  const affixes = []
  const pool = EQUIPMENT_BONUS_POOL.map((entry) => ({ ...entry }))

  for (let i = 0; i < count; i += 1) {
    if (!pool.length) {
      break
    }
    const pickedId = weightedChoice(pool.map((entry) => ({ value: entry.id, weight: entry.weight ?? 1 })))
    const index = pool.findIndex((entry) => entry.id === pickedId)
    if (index < 0) {
      continue
    }
    const picked = pool.splice(index, 1)[0]
    const rarityScale = rarity === 'mythic' ? 1.15 : rarity === 'legendary' ? 1.08 : 1
    const levelScale = 1 + run.player.level * 0.02
    const rolled = picked.min + Math.random() * (picked.max - picked.min)
    const value = picked.percent
      ? Number.parseFloat((rolled * rarityScale).toFixed(3))
      : Math.max(1, Math.round(rolled * rarityScale * levelScale))
    bonusStats[picked.key] = (bonusStats[picked.key] ?? 0) + value
    affixes.push(picked.percent ? `+${Math.round(value * 100)}% ${picked.label}` : `+${value} ${picked.label}`)
  }

  return { bonusStats, affixes }
}

function applyRandomBonusesToItem(run, item) {
  if (!item || item.kind !== 'equipment') {
    return item
  }
  const rolled = rollEquipmentBonuses(run, item.rarity)
  if (!rolled.affixes.length) {
    return item
  }
  item.bonusStats = rolled.bonusStats
  item.affixes = rolled.affixes
  item.value += rolled.affixes.length * 24
  return item
}

function buildLootItem({ run, isBoss, sourceName = 'Relique', rarityBias = null, forcedRarity = null, forcedSlot = null }) {
  const slot = forcedSlot ?? weightedChoice([
    { value: 'weapon', weight: 44 },
    { value: 'armor', weight: 33 },
    { value: 'trinket', weight: 23 },
  ])

  const rarity = forcedRarity ?? rarityRoll({ isBoss, bias: rarityBias })
  const base = pickLootBase(slot, rarity) ?? randomChoice(LOOT_BASES[slot])
  const difficulty = difficultyFor(run)
  const rarityData = RARITIES[rarity]
  const scale = 1 + run.player.level * 0.045
  const quality = rollEquipmentQuality()
  const primaryStats = rollEquipmentPrimaryStats(slot, rarity, quality)

  const item = {
    id: uid('loot'),
    kind: 'equipment',
    slot,
    name: base.name,
    rarity,
    quality,
    attack: primaryStats.attack,
    defense: primaryStats.defense,
    value: Math.max(1, Math.floor(base.value * rarityData.valueMultiplier * scale * difficulty.lootMultiplier)),
    icon: base.icon ?? SLOT_DEFAULT_ICON[slot],
  }

  if (slot === 'weapon') {
    item.weaponType = base.weaponType ?? 'melee'
  }

  if (isBoss && rarity === 'mythic') {
    item.name = `Relique mythique: ${sourceName}`
    item.value += 420
  }

  item.sockets = rollSocketCount(rarity)

  return applyRandomBonusesToItem(run, item)
}

export function openNearbyChest(run) {
  const chest = nearbyChest(run)
  if (!chest) {
    return { ok: false, reason: 'Aucun coffre à proximité.' }
  }

  chest.opened = true

  const map = currentMap(run)
  if (map?.isTutorial) {
    const tutRarity = weightedChoice([
      { value: 'common', weight: 35 },
      { value: 'uncommon', weight: 65 },
    ])
    const loots = [
      buildLootItem({ run, isBoss: false, sourceName: 'Coffre', forcedRarity: tutRarity }),
      buildLootItem({ run, isBoss: false, sourceName: 'Coffre', forcedRarity: tutRarity }),
    ]
    for (const item of loots) {
      addInventoryItem(run, item)
    }
    appendLog(run, `Coffre ouvert : ${loots.map(l => l.baseName ?? l.name ?? 'objet').join(', ')}.`)
    return { ok: true, chest, loots, gold: 0, materials: [], chestEvent: null }
  }

  const isSecretRoom = Boolean(map?.isSecretRoom)

  const chestType = isSecretRoom
    ? weightedChoice([
        { value: 'normal', weight: 54 },
        { value: 'bonus',  weight: 46 },
      ])
    : weightedChoice(CHEST_TYPE_WEIGHTS)

  if (chestType === 'trapped') {
    const trapTypes = ['poison_blade', 'gold_thief', 'curse', 'attack_debuff', 'xp_drain']
    const trap = randomChoice(trapTypes)
    let chestEvent
    if (trap === 'poison_blade') {
      const stats = derivedStats(run)
      const hpLost = Math.max(1, Math.floor(stats.maxHp * 0.2))
      run.player.hp = Math.max(1, run.player.hp - hpLost)
      appendLog(run, `Coffre piégé ! Une lame empoisonnée vous inflige ${hpLost} dégâts.`)
      chestEvent = { type: 'trap', title: 'Piège !', desc: `Une lame empoisonnée jaillit du mécanisme. −${hpLost} PV.` }
    } else if (trap === 'gold_thief') {
      const stolen = Math.min(run.player.gold, randomInt(50, 90))
      run.player.gold = Math.max(0, run.player.gold - stolen)
      appendLog(run, `Coffre piégé ! Un mécanisme dérobe ${stolen} or.`)
      chestEvent = { type: 'trap', title: 'Piège !', desc: `Un ressort catapulte votre bourse dans l'ombre. −${stolen} or.` }
    } else if (trap === 'attack_debuff') {
      pushPreparedBuff(run, { type: 'debuff', stat: 'attackPercent', value: 0.25, turns: 3 })
      appendLog(run, `Coffre maudit ! Une malédiction affaiblit votre attaque lors du prochain combat.`)
      chestEvent = { type: 'trap', title: 'Malédiction !', desc: `Une malédiction ronge vos muscles. −25% d'attaque pendant 3 tours au prochain combat.` }
    } else if (trap === 'xp_drain') {
      const drained = Math.min(run.player.xp, randomInt(100, 250))
      run.player.xp = Math.max(0, run.player.xp - drained)
      appendLog(run, `Coffre piégé ! Un vortex dévore ${drained} XP.`)
      chestEvent = { type: 'trap', title: 'Drain d\'expérience !', desc: `Un vortex dévore votre expérience. −${drained} XP.` }
    } else {
      const matKeys = Object.keys(run.player.materials ?? {}).filter((k) => k !== 'misty_heart' && (run.player.materials[k] ?? 0) > 0)
      if (matKeys.length > 0) {
        const lostMat = randomChoice(matKeys)
        const lostQty = Math.min(run.player.materials[lostMat], 2)
        run.player.materials[lostMat] = Math.max(0, run.player.materials[lostMat] - lostQty)
        appendLog(run, `Coffre maudit ! La malédiction consume ${lostQty} ${MATERIAL_LABELS[lostMat]}.`)
        chestEvent = { type: 'trap', title: 'Malédiction !', desc: `Un sortilège corrompt vos ressources. −${lostQty} ${MATERIAL_LABELS[lostMat]}.` }
      } else {
        const stats = derivedStats(run)
        const hpLost = Math.max(1, Math.floor(stats.maxHp * 0.15))
        run.player.hp = Math.max(1, run.player.hp - hpLost)
        appendLog(run, `Coffre piégé ! Une lame jaillit du mécanisme (${hpLost} dégâts).`)
        chestEvent = { type: 'trap', title: 'Piège !', desc: `Une lame jaillit du mécanisme. −${hpLost} PV.` }
      }
    }
    return { ok: true, chest, loots: [], gold: 0, materials: [], chestEvent }
  }

  if (chestType === 'bonus') {
    const bonusPool = isSecretRoom
      ? [
          { value: 'healing',           weight: 22 },
          { value: 'consumable_heal',   weight: 22 },
          { value: 'consumable_mana',   weight: 20 },
          { value: 'damage_boost',      weight: 18 },
          { value: 'xp_surge',          weight: 18 },
          { value: 'consumable_vision', weight: 12 },
          { value: 'revive_charm',      weight: 8 },
        ]
      : [
          { value: 'healing',           weight: 22 },
          { value: 'consumable_heal',   weight: 22 },
          { value: 'consumable_mana',   weight: 20 },
          { value: 'damage_boost',      weight: 18 },
          { value: 'xp_surge',          weight: 14 },
          { value: 'consumable_vision', weight: 8 },
          { value: 'teleport_room',     weight: 10 },
          { value: 'revive_charm',      weight: 4 },
        ]
    const bonus = weightedChoice(bonusPool)
    let chestEvent
    if (bonus === 'healing') {
      const stats = derivedStats(run)
      const healed = Math.max(5, Math.floor(stats.maxHp * 0.35))
      run.player.hp = Math.min(stats.maxHp, run.player.hp + healed)
      appendLog(run, `Coffre béni ! Une source curative restaure ${healed} PV.`)
      chestEvent = { type: 'bonus', title: 'Bénédiction !', desc: `Une source curative était cachée dans ce coffre. +${healed} PV restaurés.` }
    } else if (bonus === 'consumable_heal') {
      addInventoryItem(run, { id: uid('consumable'), kind: 'consumable', name: 'Potion de soin', effect: 'heal_50', quantity: 2, rarity: 'common', value: 24, icon: '/assets/Icons/life_potion.png' })
      appendLog(run, `Coffre béni ! Deux potions de soin vous attendent.`)
      chestEvent = { type: 'bonus', title: 'Provisions !', desc: `Deux potions de soin étaient soigneusement emballées à l'intérieur. +2 Potions de soin.` }
    } else if (bonus === 'consumable_mana') {
      addInventoryItem(run, { id: uid('consumable'), kind: 'consumable', name: 'Elixir de mana', effect: 'mana_60', quantity: 2, rarity: 'common', value: 22, icon: '/assets/Icons/mana_potion.png' })
      appendLog(run, `Coffre béni ! Deux élixirs de mana vous attendent.`)
      chestEvent = { type: 'bonus', title: 'Énergie runique !', desc: `Des fioles d'énergie runique scintillent dans l'ombre. +2 Élixirs de mana.` }
    } else if (bonus === 'consumable_vision') {
      addInventoryItem(run, { id: uid('consumable'), kind: 'consumable', name: 'Torche runique', effect: 'vision_boost', quantity: 2, rarity: 'common', value: 30, icon: '/assets/Icons/torche-runique.png' })
      appendLog(run, `Coffre béni ! Des torches runiques illuminent le coffre.`)
      chestEvent = { type: 'bonus', title: 'Torches runiques !', desc: `Deux torches runiques augmentent votre vision pour 30 pas chacune. +2 Torches runiques.` }
    } else if (bonus === 'damage_boost') {
      pushPreparedBuff(run, { type: 'buff', stat: 'attackPercent', value: 0.30, turns: 3 })
      appendLog(run, `Coffre béni ! Une rune de puissance vous galvanise pour le prochain combat.`)
      chestEvent = { type: 'bonus', title: 'Rune de puissance !', desc: `Une rune ancienne vous galvanise. +30% d'attaque pendant 3 tours au prochain combat.` }
    } else if (bonus === 'revive_charm') {
      addMaterial(run, 'revive_charm', 1)
      appendLog(run, `Coffre béni ! Une idole de renaissance rejoint votre bourse.`)
      chestEvent = { type: 'bonus', title: 'Idole de renaissance !', desc: `Une idole ancienne rejoint ta bourse (x${run.player.materials.revive_charm}). Si tu tombes à 0 PV, une idole se brise et te ramène à 50% de tes PV.` }
    } else if (bonus === 'xp_surge') {
      const xpGain = randomInt(200, 450)
      grantXp(run, xpGain)
      appendLog(run, `Coffre béni ! Un fragment de savoir vous accorde ${xpGain} XP.`)
      chestEvent = { type: 'bonus', title: 'Éveil du savoir !', desc: `Un fragment de connaissance ancienne illumine votre esprit. +${xpGain} XP.` }
    } else {
      const roomId = generateProceduralSecretRoom(run)
      const roomMap = currentMapById(roomId)
      transitionToMap(run, roomId)
      appendLog(run, `Coffre béni ! Un vortex vous aspire vers ${roomMap?.name ?? 'une salle secrète'}.`)
      chestEvent = { type: 'bonus', title: 'Téléportation !', desc: `Un vortex vous aspire vers ${roomMap?.name ?? 'une salle secrète'}. Explorez et revenez via le portail de retour.`, teleport: true }
    }
    return { ok: true, chest, loots: [], gold: 0, materials: [], chestEvent }
  }

  const lootCount = (map?.isSecret || map?.isSecretRoom) ? 2 : 1
  const chestHasMythic = chance(CHEST_MYTHIC_CHANCE)
  const mythicIndex = chestHasMythic ? randomInt(0, lootCount - 1) : -1
  const loots = Array.from({ length: lootCount }, (_, index) =>
    buildLootItem({
      run,
      isBoss: false,
      sourceName: 'Coffre',
      rarityBias: chest.rarityBias ?? null,
      forcedRarity: index === mythicIndex ? 'mythic' : null,
    }),
  )
  for (const item of loots) {
    addInventoryItem(run, item)
  }
  const gold = randomInt(25, 75)
  run.player.gold += gold
  const chestMaterial = randomChoice(['ore', 'wood', 'resin', 'herb', 'obsidian_fragment'])
  const materialQty = randomInt(1, 3)
  addMaterial(run, chestMaterial, materialQty)
  const materials = [{ material: chestMaterial, quantity: materialQty }]
  if (chance(CHEST_MISTY_HEART_CHANCE)) {
    addMaterial(run, 'misty_heart', 1)
    materials.push({ material: 'misty_heart', quantity: 1 })
  }
  if (chance(0.035)) {
    const specialMaterial = randomChoice(['spirit_chisel', 'stability_shard'])
    addMaterial(run, specialMaterial, 1)
    materials.push({ material: specialMaterial, quantity: 1 })
  }
  const isBonusLootMap = Boolean(map?.isSecret || map?.isSecretRoom)
  if (chance(isBonusLootMap ? 0.18 : 0.07)) {
    const stone = buildSpiritStone(run, rarityRoll({ isBoss: false, bias: isBonusLootMap ? 'rare' : null }))
    addInventoryItem(run, stone)
    loots.push(stone)
  }
  appendLog(run, `Coffre ouvert: +${gold} or, ${materials.map((m) => `+${MATERIAL_LABELS[m.material]}`).join(', ')}, loot ${loots.map((item) => item.name).join(', ')}.`)
  return { ok: true, chest, loots, gold, materials, chestEvent: null }
}

function grantXp(run, xp) {
  run.player.xp += xp
  let gained = 0
  while (run.player.xp >= run.player.nextXp) {
    run.player.xp -= run.player.nextXp
    run.player.level += 1
    run.player.passivePoints += 1
    run.player.nextXp = xpForLevel(run.player.level)
    gained += 1
  }

  if (gained > 0) {
    const skillsNow = unlockedSkills(run)
    const newSkills = skillsNow.filter((skill) => skill.unlockLevel > run.player.level - gained).map((skill) => skill.name)
    syncVitals(run, true)
    run.levelUpModal = {
      gained,
      level: run.player.level,
      newSkills,
    }
    appendLog(run, `${run.player.name} gagne ${gained} niveau(x). Niveau actuel: ${run.player.level}.`)
  }
}

// Au-delà du niveau 15, l'équipement mythique/transcendé commence à trivialiser
// les combats (voir plan de rééquilibrage) : on ajoute un facteur d'échelle
// supplémentaire sur HP/attaque des ennemis de haut niveau pour compenser,
// sans toucher au début de partie.
function endgameEnemyScale(level) {
  return 1 + Math.max(0, level - 15) * 0.02
}

function applyDifficultyToEnemy(template, difficulty, extraScale = 1) {
  const tactical = difficulty.enemyTacticsMultiplier ?? 1
  const statBoost = ENEMY_BASE_STAT_BOOST
  const endgameScale = endgameEnemyScale(template.level ?? 1) * extraScale
  return {
    maxHp: Math.floor(template.maxHp * difficulty.enemyHpMultiplier * statBoost * endgameScale),
    maxMana: template.maxMana,
    attack: Math.floor(template.attack * difficulty.enemyDamageMultiplier * statBoost * endgameScale),
    defense: Math.floor(template.defense * difficulty.enemyArmorMultiplier * statBoost * extraScale),
    speed: template.speed,
    ap: template.ap,
    critChance: clamp((template.critChance ?? 0.06) * tactical, 0.02, 0.5),
    dodgeChance: clamp((template.dodgeChance ?? 0.03) * tactical, 0, 0.45),
    parryChance: clamp((template.parryChance ?? 0.03) * tactical, 0, 0.42),
    critDamage: clamp((template.critDamage ?? 0.4) * tactical, 0.2, 1.1),
    toppleChance: clamp((template.toppleChance ?? 0.05) * tactical, 0, 0.35),
    statusResist: clamp((template.statusResist ?? 0.05) * tactical, 0, 0.7),
  }
}

function mapEnemyByBattleRef(run) {
  if (!run.combat) {
    return null
  }
  return currentMapState(run).enemies.find((enemy) => enemy.id === run.combat.enemyRefId) ?? null
}

function persistBattleEnemy(run) {
  const enemy = mapEnemyByBattleRef(run)
  if (!enemy || !run.combat) {
    return
  }
  enemy.currentHp = Math.max(1, Math.floor(run.combat.enemyHp))
  enemy.currentMana = Math.max(0, Math.floor(run.combat.enemyMana))
}

function resolveEnemyDeath(run, enemyRef) {
  const mapState = currentMapState(run)
  const enemy = mapState.enemies.find((entry) => entry.id === enemyRef.id)
  if (!enemy) {
    return
  }

  enemy.alive = false
  enemy.currentHp = 0
  enemy.currentMana = 0

  recordQuestKill(run, enemy.templateId)

  const template = enemyById(enemy.templateId)
  const difficulty = difficultyFor(run)
  const xp = Math.floor((template?.xpReward ?? 50) * difficulty.xpMultiplier)
  const bossMultiplier = enemy.isBoss ? BOSS_GOLD_MULTIPLIER : 1
  const gold = Math.max(1, Math.floor((template?.goldReward ?? 20) * difficulty.lootMultiplier * ENEMY_GOLD_REWARD_FACTOR * bossMultiplier))

  run.player.gold += gold
  grantXp(run, xp)

  const materialDrops = enemyMaterialDrops(enemy)
  for (const drop of materialDrops) {
    addMaterial(run, drop.material, drop.quantity)
  }

  const shouldDropEquipment = enemy.isBoss || chance(NON_BOSS_EQUIPMENT_DROP_CHANCE)
  const lootCount = enemy.isBoss ? 2 : shouldDropEquipment ? 1 : 0
  const loots = Array.from({ length: lootCount }, () =>
    buildLootItem({ run, isBoss: enemy.isBoss, sourceName: template?.name ?? 'Boss' }),
  )
  if (enemy.isBoss) {
    const map = currentMap(run)
    const isBonusLootMap = Boolean(map?.isSecret || map?.isSecretRoom)
    if (chance(isBonusLootMap ? 0.28 : 0.15)) {
      loots.push(buildSpiritStone(run, rarityRoll({ isBoss: true, bias: isBonusLootMap ? 'epic' : null })))
    }
  }
  loots.forEach((item) => addInventoryItem(run, item))

  run.pendingLootModal = {
    enemyName: template?.name ?? 'Ennemi',
    xp,
    gold,
    materials: materialDrops.map((entry) => ({
      material: entry.material,
      quantity: entry.quantity,
    })),
    items: loots.map((item) => ({ ...item })),
  }

  const lootLine = loots.length
    ? `loot ${loots.map((item) => `${RARITIES[item.rarity].label} ${item.name}`).join(', ')}`
    : 'aucun equipement'
  appendLog(run, `${template?.name ?? 'Ennemi'} vaincu: +${xp} XP, +${gold} or, ${lootLine}.`)

  if (enemy.isBoss) {
    mapState.bossDefeated = true
    appendLog(run, `Boss de ${currentMap(run).name} vaincu. La sortie est desormais ouverte.`)
  }
}

function transitionToMap(run, targetMapId) {
  if (targetMapId === 'ending') {
    run.victory = true
    run.gameOver = true
    appendLog(run, `Victoire: ${run.player.name} referme la faille d\'onyx.`)
    return { ok: true, ending: true }
  }

  let nextMapId = targetMapId
  if (targetMapId === 'return') {
    nextMapId = run.world.returnMapId || MAP_ORDER[0]
  }

  const nextMap = currentMapById(nextMapId)
  if (!nextMap) {
    return { ok: false, reason: 'Map introuvable.' }
  }
  const nextState = ensureMapState(run, nextMapId)

  const leavingMap = currentMap(run)
  const nextIsHidden = nextMap.isSecret || nextMap.isSecretRoom
  const leavingIsHidden = leavingMap.isSecret || leavingMap.isSecretRoom
  if (nextIsHidden && !leavingIsHidden) {
    run.world.returnMapId = leavingMap.id
  }
  if (nextIsHidden) {
    for (const discoveredId of [nextMap.id, nextMap.originTemplateId].filter(Boolean)) {
      if (!run.player.discoveredSecretRooms.includes(discoveredId)) {
        run.player.discoveredSecretRooms.push(discoveredId)
      }
    }
  }
  if (!nextIsHidden && targetMapId === 'return') {
    run.world.returnMapId = null
  }

  run.world.currentMapId = nextMapId
  const mapOrderIndex = MAP_ORDER.indexOf(nextMapId)
  if (mapOrderIndex >= 0) {
    run.world.currentMapIndex = mapOrderIndex
  }
  run.world.playerPosition = { ...nextState.start }
  revealAround(run, nextMapId, nextState.start.x, nextState.start.y, 2)
  appendLog(run, `Transition vers ${nextMap.name}.`)
  return { ok: true, mapId: nextMapId }
}

function portalAtPosition(run, mapState, x, y) {
  if (mapState.exit?.x === x && mapState.exit?.y === y) {
    return { type: 'exit', targetMapId: mapState.exit.targetMapId }
  }
  if (
    mapState.secretPortal &&
    mapState.secretPortalRevealed &&
    mapState.secretPortal.x === x &&
    mapState.secretPortal.y === y
  ) {
    return { type: 'secret', targetMapId: mapState.secretPortal.targetMapId }
  }
  if (mapState.backPortal && mapState.backPortal.x === x && mapState.backPortal.y === y) {
    return { type: 'back', targetMapId: mapState.backPortal.targetMapId }
  }
  if (mapState.campPortal && mapState.campPortal.x === x && mapState.campPortal.y === y) {
    return { type: 'camp', targetMapId: null }
  }
  return null
}

function resolvePortal(run, portal, mapState) {
  if (portal.type === 'exit' && MAP_ORDER.includes(run.world.currentMapId)) {
    return { ok: true, exitChoice: true, portalType: 'exit' }
  }
  if (portal.type === 'secret') {
    return { ok: true, exitChoice: true, portalType: 'secret', targetMapId: portal.targetMapId }
  }
  if (portal.type === 'camp') {
    return enterHub(run, run.world.currentMapId)
  }
  return transitionToMap(run, portal.targetMapId)
}

export function usePortalAtPosition(run) {
  if (run.gameOver) {
    return { ok: false, reason: 'Partie terminee.' }
  }
  if (run.combat) {
    return { ok: false, reason: 'Impossible de prendre un portail en combat.' }
  }

  const mapState = currentMapState(run)
  const position = run.world.playerPosition
  const portal = portalAtPosition(run, mapState, position.x, position.y)
  if (!portal) {
    return { ok: false, reason: 'Aucun portail sur cette case.' }
  }
  if (portal.type === 'exit' && !mapState.bossDefeated) {
    appendLog(run, 'Sortie verrouillee: le boss de la zone est encore vivant.')
    return { ok: true, blockedExit: true }
  }
  return resolvePortal(run, portal, mapState)
}

export function attemptMove(run, dx, dy, options = {}) {
  if (run.gameOver) {
    return { ok: false, reason: 'Partie terminée.' }
  }
  if (run.combat) {
    return { ok: false, reason: 'Impossible de se déplacer en combat.' }
  }

  const map = currentMap(run)
  const mapState = currentMapState(run)
  const px = run.world.playerPosition.x
  const py = run.world.playerPosition.y
  const nx = px + dx
  const ny = py + dy

  if (!mapIsWalkable(map, nx, ny, mapState.tiles)) {
    return { ok: false, reason: 'Case bloquee.' }
  }

  run.world.playerPosition = { x: nx, y: ny }
  const visionBoost = run.player.visionBoostSteps ?? 0
  revealAround(run, map.id, nx, ny, visionBoost > 0 ? 3 : 2)
  if (visionBoost > 0) {
    run.player.visionBoostSteps = visionBoost - 1
  }

  const trap = trapAtPosition(run, nx, ny, map.id)
  const trapEvent = trap ? triggerTrap(run, trap) : null

  const enemy = enemyAtPosition(run, nx, ny)
  if (enemy) {
    startCombat(run, enemy)
    return { ok: true, combat: true, trapEvent }
  }
  const adjacentEnemy = enemyAdjacentToPosition(run, nx, ny, map.id)
  if (adjacentEnemy) {
    startCombat(run, adjacentEnemy)
    return { ok: true, combat: true, trapEvent }
  }

  const deferPortalTransition = options.deferPortalTransition ?? false
  const portal = portalAtPosition(run, mapState, nx, ny)
  if (portal) {
    if (portal.type === 'exit' && !mapState.bossDefeated) {
      appendLog(run, 'Sortie verrouillee: le boss de la zone est encore vivant.')
      return { ok: true, blockedExit: true, trapEvent }
    }
    if (deferPortalTransition) {
      return { ok: true, portalPrompt: portal, trapEvent }
    }
    return { ...resolvePortal(run, portal, mapState), trapEvent }
  }

  const chest = chestAtPosition(run, nx, ny)
  if (chest) {
    appendLog(run, 'Un coffre ancien est à proximité. Ouvre-le pour récupèrer son contenu.')
  }

  return { ok: true, trapEvent }
}

function consumeCooldowns(cooldowns) {
  for (const key of Object.keys(cooldowns)) {
    cooldowns[key] = Math.max(0, cooldowns[key] - 1)
  }
}

function effectAmount(effects, type, stat) {
  return effects
    .filter((effect) => effect.type === type && (!stat || effect.stat === stat))
    .reduce((sum, effect) => sum + (effect.value ?? 0), 0)
}

function reduceEffects(effects) {
  for (const effect of effects) {
    effect.turns -= 1
  }
  return effects.filter((effect) => effect.turns > 0 && (effect.type !== 'shield' || effect.value > 0))
}

function takeDamage(targetHp, targetEffects, incomingDamage, targetStats = {}, options = {}) {
  const ignoreAvoidance = options.ignoreAvoidance ?? false
  let damage = incomingDamage
  const damageReduction = clamp(targetStats.damageReductionPercent ?? 0, 0, 0.55)
  if (damageReduction > 0) {
    damage = Math.max(0, Math.floor(damage * (1 - damageReduction)))
  }

  const guardEffect = !ignoreAvoidance && targetEffects.find((e) => e.type === 'guard' && e.value > 0)
  if (guardEffect) {
    guardEffect.value = 0
    guardEffect.turns = 0
    const beforeGuard = damage
    damage = Math.max(1, Math.floor(damage * 0.25))
    const guardBlocked = beforeGuard - damage
    let shieldAbsorbed = 0
    for (const shield of targetEffects.filter((effect) => effect.type === 'shield' && effect.value > 0)) {
      if (damage <= 1) break
      const absorbed = Math.min(shield.value, damage - 1)
      shield.value -= absorbed
      damage -= absorbed
      shieldAbsorbed += absorbed
    }
    for (let i = targetEffects.length - 1; i >= 0; i--) {
      if (targetEffects[i].type === 'shield' && targetEffects[i].value <= 0) targetEffects.splice(i, 1)
    }
    return { hp: Math.max(0, targetHp - damage), damage, dodged: false, parried: true, parryBlocked: guardBlocked, shieldAbsorbed }
  }

  const guaranteedDodge = targetEffects.find(
    (effect) =>
      effect.value > 0 &&
      (effect.type === 'dodge' || (effect.type === 'buff' && (effect.stat === 'dodge' || effect.stat === 'dodgeChance'))),
  )
  if (!ignoreAvoidance && guaranteedDodge) {
    guaranteedDodge.value = 0
    guaranteedDodge.turns = 0
    return { hp: targetHp, damage: 0, dodged: true, parried: false, shieldAbsorbed: 0 }
  }

  if (!ignoreAvoidance) {
    const dodgeChance = clamp(
      (targetStats.dodgeChance ?? 0) +
      effectAmount(targetEffects, 'buff', 'dodgeChance') -
      effectAmount(targetEffects, 'debuff', 'dodgeChance'),
      0,
      0.72,
    )
    if (chance(dodgeChance)) {
      return { hp: targetHp, damage: 0, dodged: true, parried: false, shieldAbsorbed: 0 }
    }

    const parryChance = clamp(
      (targetStats.parryChance ?? 0) +
      effectAmount(targetEffects, 'buff', 'parryChance') -
      effectAmount(targetEffects, 'debuff', 'parryChance'),
      0,
      0.62,
    )
    if (chance(parryChance)) {
      const reduction = clamp(targetStats.parryReduction ?? 0.45, 0.2, 0.85)
      const beforeParry = damage
      damage = Math.max(0, Math.floor(damage * (1 - reduction)))
      const parryBlocked = beforeParry - damage
      if (damage <= 0) {
        return { hp: targetHp, damage: 0, dodged: false, parried: true, parryBlocked, shieldAbsorbed: 0 }
      }
      let shieldAbsorbed = 0
      for (const shield of targetEffects.filter((effect) => effect.type === 'shield' && effect.value > 0)) {
        if (damage <= 0) break
        const absorbed = Math.min(shield.value, damage)
        shield.value -= absorbed
        damage -= absorbed
        shieldAbsorbed += absorbed
      }
      for (let i = targetEffects.length - 1; i >= 0; i--) {
        if (targetEffects[i].type === 'shield' && targetEffects[i].value <= 0) targetEffects.splice(i, 1)
      }
      if (damage > 0) {
        const sleepIdxParry = targetEffects.findIndex((e) => e.type === 'debuff' && e.stat === 'sleep' && e.turns > 0)
        if (sleepIdxParry >= 0) targetEffects.splice(sleepIdxParry, 1)
      }
      return { hp: Math.max(0, targetHp - damage), damage, dodged: false, parried: true, parryBlocked, shieldAbsorbed }
    }
  }

  if (damage > 0) {
    const sleepIdx = targetEffects.findIndex((e) => e.type === 'debuff' && e.stat === 'sleep' && e.turns > 0)
    if (sleepIdx >= 0) targetEffects.splice(sleepIdx, 1)
  }

  let shieldAbsorbed = 0
  for (const shield of targetEffects.filter((effect) => effect.type === 'shield' && effect.value > 0)) {
    if (damage <= 0) break
    const blocked = Math.min(shield.value, damage)
    shield.value -= blocked
    damage -= blocked
    shieldAbsorbed += blocked
  }
  for (let i = targetEffects.length - 1; i >= 0; i--) {
    if (targetEffects[i].type === 'shield' && targetEffects[i].value <= 0) targetEffects.splice(i, 1)
  }

  return { hp: Math.max(0, targetHp - damage), damage, dodged: false, parried: false, shieldAbsorbed }
}

function computeDamage(attacker, defender, power, extraPercent = 0, armorPen = 0) {
  const base = attacker.attack * power + randomInt(-4, 6)
  const didCrit = chance(attacker.critChance ?? 0)
  const crit = didCrit ? 1 + (attacker.critDamage ?? 0.45) : 1
  const mitigatedDefense = defender.defense * (1 - armorPen)
  const mitigation = 100 / (100 + mitigatedDefense * 5)
  return {
    damage: Math.max(1, Math.floor(base * crit * mitigation * (1 + extraPercent))),
    crit: didCrit,
  }
}

function skillPowerByAp(side, skill, attacker) {
  const power = skill.power ?? 1
  if (side !== 'player') {
    return power
  }
  const normalAttackCost = Math.max(1, attacker.normalAttackCost ?? COMBAT_NORMAL_ATTACK_COST)
  const expectedEquivalent = Math.max(1, (skill.apCost ?? normalAttackCost) / normalAttackCost)
  return Math.max(power, expectedEquivalent)
}

function statusChance(run, side, attacker, defender, baseChance = 0) {
  const difficulty = difficultyFor(run)
  const difficultyFactor = side === 'player' ? difficulty.playerStatusMultiplier ?? 1 : difficulty.enemyStatusMultiplier ?? 1
  const attackerBonus = side === 'player' ? attacker.statusChance ?? 0 : (attacker.toppleChance ?? 0) * 0.35
  const resist = defender.statusResist ?? 0
  return clamp((baseChance + attackerBonus - resist * 0.45) * difficultyFactor, 0.03, 0.95)
}

function statMultiplier(buffPercent = 0, debuffPercent = 0) {
  return Math.max(0.2, 1 + buffPercent - debuffPercent)
}

function ailmentLabel(kind) {
  if (kind === 'bleed') {
    return 'saignement'
  }
  if (kind === 'burn') {
    return 'brulure'
  }
  if (kind === 'poison') {
    return 'poison'
  }
  if (kind === 'curse') {
    return 'malediction'
  }
  return 'corruption'
}

function statusLabel(kind) {
  if (kind === 'disorient') return 'désorientation'
  if (kind === 'topple') return 'renversement'
  if (kind === 'weaken') return 'affaiblissement'
  if (kind === 'stun') return 'étourdissement'
  if (kind === 'fear') return 'peur'
  if (kind === 'sleep') return 'sommeil'
  return 'alteration'
}

function consumeNextAttackMissChance(effects) {
  if (!effects?.length) {
    return 0
  }
  const missEffect = effects.find(
    (effect) =>
      effect.type === 'debuff' &&
      effect.stat === 'nextAttackMissChance' &&
      (effect.turns ?? 0) > 0 &&
      (effect.value ?? 0) > 0,
  )
  if (!missEffect) {
    return 0
  }

  const chanceValue = clamp(missEffect.value ?? 0.35, 0, 0.95)
  missEffect.value = 0
  missEffect.turns = 0
  return chanceValue
}

function applyPassiveLifeSteal(run, battle, side, attacker, dealtDamage) {
  const ratio = clamp(attacker?.lifeStealPercent ?? 0, 0, PASSIVE_LIFESTEAL_MAX_RATIO)
  if (dealtDamage <= 0 || ratio <= 0) {
    return 0
  }

  const maxHp = Math.max(1, Math.floor(attacker?.maxHp ?? 1))
  const healCap = Math.max(1, Math.floor(maxHp * PASSIVE_LIFESTEAL_HIT_CAP_MAX_HP_RATIO))
  const heal = Math.min(healCap, Math.max(1, Math.round(dealtDamage * ratio)))
  if (side === 'player') {
    const before = run.player.hp
    run.player.hp = clamp(run.player.hp + heal, 0, maxHp)
    return Math.max(0, run.player.hp - before)
  }

  const before = battle.enemyHp
  const enemyMaxHp = battle.enemyStats.maxHp ?? before
  battle.enemyHp = clamp(battle.enemyHp + heal, 0, enemyMaxHp)
  return Math.max(0, battle.enemyHp - before)
}

function applySkillStatusEffect(run, side, statusEffect, attacker, defender, targetEffects, targetName) {
  if (!statusEffect?.kind) {
    return null
  }

  const battle = run.combat
  const isBossTarget = side === 'player' && battle?.enemyIsBoss
  const baseChance = (isBossTarget && statusEffect.bossChance != null)
    ? statusEffect.bossChance
    : (statusEffect.chance ?? 0.2)
  const chanceToApply = statusChance(run, side, attacker, defender, baseChance)
  if (!chance(chanceToApply)) {
    return null
  }

  const minTurns = statusEffect.minTurns ?? statusEffect.turns ?? 1
  const maxTurns = statusEffect.maxTurns ?? statusEffect.turns ?? 1
  const turns = minTurns === maxTurns ? minTurns : randomInt(minTurns, maxTurns)
  const value = statusEffect.value ?? 1
  if (statusEffect.kind === 'disorient') {
    targetEffects.push({
      id: uid('status'),
      type: 'debuff',
      stat: 'nextAttackMissChance',
      value: clamp(statusEffect.missChance ?? 0.35, 0.05, 0.95),
      turns,
    })
    return `${targetName} subit ${statusLabel(statusEffect.kind)}.`
  }

  if (statusEffect.kind === 'topple') {
    targetEffects.push({
      id: uid('status'),
      type: 'debuff',
      stat: 'enemyApPenalty',
      value: Math.max(1, Math.floor(value)),
      turns,
    })
    return `${targetName} subit ${statusLabel(statusEffect.kind)}.`
  }

  if (statusEffect.kind === 'weaken') {
    targetEffects.push({
      id: uid('status'),
      type: 'debuff',
      stat: 'enemyDefensePercent',
      value: value,
      turns,
    })
    return `${targetName} subit ${statusLabel(statusEffect.kind)}.`
  }

  if (statusEffect.kind === 'stun') {
    targetEffects.push({
      id: uid('status'),
      type: 'debuff',
      stat: 'stun',
      value: 1,
      turns,
    })
    return `${targetName} est ${statusLabel(statusEffect.kind)} !`
  }

  if (statusEffect.kind === 'fear') {
    targetEffects.push({
      id: uid('status'),
      type: 'debuff',
      stat: 'fear',
      value: statusEffect.fearChance ?? 0.5,
      turns,
    })
    return `${targetName} est saisi de ${statusLabel(statusEffect.kind)} !`
  }

  if (statusEffect.kind === 'sleep') {
    targetEffects.push({
      id: uid('status'),
      type: 'debuff',
      stat: 'sleep',
      value: 1,
      turns,
    })
    return `${targetName} s'endort !`
  }

  return null
}

function currentEnemyTemplate(run) {
  if (!run.combat) {
    return null
  }
  return enemyById(run.combat.enemyTemplateId)
}

function startTurn(run) {
  const battle = run.combat
  if (!battle) {
    return
  }

  if (battle.actor === 'player') {
    battle.bonusTurnUsed = false
    const stats = derivedStats(run)
    battle.playerAp = stats.ap
    consumeCooldowns(battle.playerCooldowns)

    const apPenalty = Math.floor(
      effectAmount(battle.playerEffects, 'debuff', 'enemyApPenalty') +
      effectAmount(battle.playerEffects, 'debuff', 'enemyMpPenalty'),
    )
    if (apPenalty > 0) {
      battle.playerAp = Math.max(0, battle.playerAp - apPenalty)
      appendLog(run, `Ralentissement: ${run.player.name} perd ${apPenalty} PA ce tour.`)
    }

    const stunEffect = battle.playerEffects.find((e) => e.type === 'debuff' && e.stat === 'stun' && e.turns > 0)
    const sleepEffect = battle.playerEffects.find((e) => e.type === 'debuff' && e.stat === 'sleep' && e.turns > 0)
    const fearEffect = battle.playerEffects.find((e) => e.type === 'debuff' && e.stat === 'fear' && e.turns > 0)
    if (stunEffect) {
      battle.playerAp = 0
      appendLog(run, `${run.player.name} est étourdi et ne peut pas agir.`)
    } else if (sleepEffect) {
      battle.playerAp = 0
      appendLog(run, `${run.player.name} dort et ne peut pas agir.`)
    } else if (fearEffect && !chance(fearEffect.value ?? 0.5)) {
      battle.playerAp = 0
      const selfDmg = Math.max(1, Math.floor(stats.attack * 0.4))
      run.player.hp = clamp(run.player.hp - selfDmg, 0, stats.maxHp)
      appendLog(run, `${run.player.name} cède à la peur et se blesse (${selfDmg} dégâts) !`)
      if (run.player.hp <= 0) {
        resolvePlayerDeath(run)
        return
      }
    }

    const dotDamage = battle.playerEffects
      .filter((effect) => effect.type === 'dot')
      .reduce((sum, effect) => sum + effect.value, 0)

    if (dotDamage > 0) {
      const result = takeDamage(run.player.hp, battle.playerEffects, dotDamage, stats, { ignoreAvoidance: true })
      run.player.hp = result.hp
      appendLog(run, `La corruption te blesse (${result.damage}).`)
      if (run.player.hp <= 0) {
        resolvePlayerDeath(run)
        return
      }
    }

    return
  }

  battle.enemyAp = battle.enemyStats.ap
  consumeCooldowns(battle.enemyCooldowns)

  const enemyApPenalty = Math.floor(
    effectAmount(battle.enemyEffects, 'debuff', 'enemyApPenalty') +
    effectAmount(battle.enemyEffects, 'debuff', 'enemyMpPenalty'),
  )
  if (enemyApPenalty > 0) {
    battle.enemyAp = Math.max(0, battle.enemyAp - enemyApPenalty)
    appendLog(run, `${battle.enemyName} perd ${enemyApPenalty} PA ce tour.`)
  }

  const enemyStunEffect = battle.enemyEffects.find((e) => e.type === 'debuff' && e.stat === 'stun' && e.turns > 0)
  const enemySleepEffect = battle.enemyEffects.find((e) => e.type === 'debuff' && e.stat === 'sleep' && e.turns > 0)
  const enemyFearEffect = battle.enemyEffects.find((e) => e.type === 'debuff' && e.stat === 'fear' && e.turns > 0)
  if (enemyStunEffect) {
    battle.enemyAp = 0
    appendLog(run, `${battle.enemyName} est étourdi et ne peut pas agir.`)
  } else if (enemySleepEffect) {
    battle.enemyAp = 0
    appendLog(run, `${battle.enemyName} dort et ne peut pas agir.`)
  } else if (enemyFearEffect && !chance(enemyFearEffect.value ?? 0.5)) {
    battle.enemyAp = 0
    const enemySelfDmg = Math.max(1, Math.floor((battle.enemyStats.attack ?? 5) * 0.4))
    battle.enemyHp = clamp(battle.enemyHp - enemySelfDmg, 0, battle.enemyStats.maxHp)
    appendLog(run, `${battle.enemyName} cède à la peur et se blesse (${enemySelfDmg} dégâts) !`)
    if (battle.enemyHp <= 0) {
      finishCombatVictory(run)
      return
    }
  }

  const dotDamage = battle.enemyEffects
    .filter((effect) => effect.type === 'dot')
    .reduce((sum, effect) => sum + effect.value, 0)

  if (dotDamage > 0) {
    const result = takeDamage(battle.enemyHp, battle.enemyEffects, dotDamage, battle.enemyStats, { ignoreAvoidance: true })
    battle.enemyHp = result.hp
    appendLog(run, `Le dot ronge ${battle.enemyName} (${result.damage}).`)
    if (battle.enemyHp <= 0) {
      finishCombatVictory(run)
    }
  }

  if (battle.enemyStats.lifeRegenFlat > 0) {
    battle.enemyHp = clamp(battle.enemyHp + battle.enemyStats.lifeRegenFlat, 0, battle.enemyStats.maxHp)
  }
}

function endTurn(run) {
  const battle = run.combat
  if (!battle) {
    return
  }

  if (battle.actor === 'player') {
    battle.playerEffects = reduceEffects(battle.playerEffects)

    if (!battle.bonusTurnUsed) {
      const playerStats = derivedStats(run)
      const speedAdvantage = playerStats.speed - (battle.enemyStats.speed ?? 5)
      if (speedAdvantage >= 4) {
        const bonusChance = Math.min(0.65, speedAdvantage * 0.05)
        if (chance(bonusChance)) {
          battle.bonusTurnUsed = true
          battle.playerAp = Math.ceil(playerStats.ap * 0.5)
          appendLog(run, `Rapidité: ${run.player.name} agit à nouveau !`)
          return
        }
      }
    }

    const endStats = derivedStats(run)
    run.player.mana = clamp(run.player.mana + 2 + endStats.manaRegenFlat, 0, endStats.maxMana)
    battle.actor = 'enemy'
  } else {
    battle.enemyEffects = reduceEffects(battle.enemyEffects)
    battle.actor = 'player'
  }
  battle.turn += 1
  startTurn(run)
}
function applySkill(run, side, skill) {
  const battle = run.combat
  if (!battle) {
    return { ok: false, reason: 'Pas de combat en cours.' }
  }

  const playerStats = derivedStats(run)
  const playerBuffAtk = effectAmount(battle.playerEffects, 'buff', 'attackPercent')
  const playerBuffDef = effectAmount(battle.playerEffects, 'buff', 'defensePercent')
  const playerBuffCrit = effectAmount(battle.playerEffects, 'buff', 'critChance')
  const playerBuffCritDamage = effectAmount(battle.playerEffects, 'buff', 'critDamage')
  const playerDebuffAtk =
    effectAmount(battle.playerEffects, 'debuff', 'attackPercent') +
    effectAmount(battle.playerEffects, 'debuff', 'enemyAttackPercent')
  const playerDebuffDef =
    effectAmount(battle.playerEffects, 'debuff', 'defensePercent') +
    effectAmount(battle.playerEffects, 'debuff', 'enemyDefensePercent')
  const playerDebuffCrit = effectAmount(battle.playerEffects, 'debuff', 'critChance')
  const playerDebuffCritDamage = effectAmount(battle.playerEffects, 'debuff', 'critDamage')
  const enemyBuffAtk = effectAmount(battle.enemyEffects, 'buff', 'attackPercent')
  const enemyBuffDef = effectAmount(battle.enemyEffects, 'buff', 'defensePercent')
  const enemyBuffCrit = effectAmount(battle.enemyEffects, 'buff', 'critChance')
  const enemyBuffCritDamage = effectAmount(battle.enemyEffects, 'buff', 'critDamage')
  const enemyDebuffAtk =
    effectAmount(battle.enemyEffects, 'debuff', 'attackPercent') +
    effectAmount(battle.enemyEffects, 'debuff', 'enemyAttackPercent')
  const enemyDebuffDef =
    effectAmount(battle.enemyEffects, 'debuff', 'defensePercent') +
    effectAmount(battle.enemyEffects, 'debuff', 'enemyDefensePercent')
  const enemyDebuffCrit = effectAmount(battle.enemyEffects, 'debuff', 'critChance')
  const enemyDebuffCritDamage = effectAmount(battle.enemyEffects, 'debuff', 'critDamage')

  const attacker =
    side === 'player'
      ? {
        ...playerStats,
        attack: Math.floor(playerStats.attack * statMultiplier(playerBuffAtk, playerDebuffAtk)),
        defense: Math.floor(playerStats.defense * statMultiplier(playerBuffDef, playerDebuffDef)),
        critChance: clamp(playerStats.critChance + playerBuffCrit - playerDebuffCrit, 0, 0.9),
        critDamage: clamp(playerStats.critDamage + playerBuffCritDamage - playerDebuffCritDamage, 0.2, 1.5),
        dodgeChance: playerStats.dodgeChance,
        parryChance: playerStats.parryChance,
        statusChance: playerStats.statusChance,
        statusResist: playerStats.statusResist,
      }
      : {
        ...battle.enemyStats,
        attack: Math.floor(battle.enemyStats.attack * statMultiplier(enemyBuffAtk, enemyDebuffAtk)),
        defense: Math.floor(battle.enemyStats.defense * statMultiplier(enemyBuffDef, enemyDebuffDef)),
        critChance: clamp((battle.enemyStats.critChance ?? 0.08) + enemyBuffCrit - enemyDebuffCrit, 0, 0.9),
        critDamage: clamp(
          (battle.enemyStats.critDamage ?? 0.42) + enemyBuffCritDamage - enemyDebuffCritDamage,
          0.2,
          1.5,
        ),
        dodgeChance: battle.enemyStats.dodgeChance ?? 0.03,
        parryChance: battle.enemyStats.parryChance ?? 0.03,
        statusChance: battle.enemyStats.toppleChance ?? 0.06,
        statusResist: battle.enemyStats.statusResist ?? 0.06,
      }

  const defender =
    side === 'player'
      ? {
        ...battle.enemyStats,
        defense: Math.floor(battle.enemyStats.defense * statMultiplier(enemyBuffDef, enemyDebuffDef)),
        critChance: battle.enemyStats.critChance ?? 0.08,
        critDamage: battle.enemyStats.critDamage ?? 0.42,
        dodgeChance: battle.enemyStats.dodgeChance ?? 0.03,
        parryChance: battle.enemyStats.parryChance ?? 0.03,
        statusResist: battle.enemyStats.statusResist ?? 0.06,
      }
      : {
        ...playerStats,
        defense: Math.floor(playerStats.defense * statMultiplier(playerBuffDef, playerDebuffDef)),
        critChance: playerStats.critChance,
        critDamage: playerStats.critDamage,
        dodgeChance: playerStats.dodgeChance,
        parryChance: playerStats.parryChance,
        statusResist: playerStats.statusResist,
      }

  const bonusPercent =
    side === 'player'
      ? playerStats.damagePercent +
        effectAmount(battle.playerEffects, 'buff', 'damagePercent') +
        (skill.isMagic ? (playerStats.magicDamagePercent ?? 0) : 0) +
        (battle.enemyIsBoss ? playerStats.bossDamagePercent : 0)
      : 0

  const actorName = side === 'player' ? run.player.name : battle.enemyName
  const targetName = side === 'player' ? battle.enemyName : run.player.name
  let text = `${actorName} lance ${skill.name}.`
  let restoredAp = 0
  const isAttackSkill = ['damage', 'control', 'execute', 'dot', 'lifesteal', 'debuff'].includes(skill.effect)
  if (isAttackSkill) {
    const attackerEffects = side === 'player' ? battle.playerEffects : battle.enemyEffects
    const disorientMissChance = consumeNextAttackMissChance(attackerEffects)
    if (disorientMissChance > 0 && chance(disorientMissChance)) {
      if (side === 'player') {
        const manaCost = skillManaCostFor('player', skill, playerStats)
        const cooldownValue = skillCooldownFor('player', skill, playerStats)
        battle.playerAp = Math.max(0, battle.playerAp - skill.apCost)
        run.player.mana = clamp(run.player.mana - manaCost, 0, playerStats.maxMana)
        battle.playerCooldowns[skill.id] = cooldownValue
      } else {
        const manaCost = skillManaCostFor('enemy', skill)
        const cooldownValue = skillCooldownFor('enemy', skill)
        battle.enemyAp = Math.max(0, battle.enemyAp - skill.apCost)
        battle.enemyMana = clamp((battle.enemyMana ?? battle.enemyStats.maxMana) - manaCost, 0, battle.enemyStats.maxMana)
        battle.enemyCooldowns[skill.id] = cooldownValue
      }
      appendLog(run, `${actorName} rate son coup à cause de la désorientation.`)
      return { ok: true, finished: false }
    }
  }

  if (skill.effect === 'damage' || skill.effect === 'control' || skill.effect === 'execute') {
    const effectivePower = skillPowerByAp(side, skill, attacker)
    const rolled = computeDamage(attacker, defender, effectivePower, bonusPercent, skill.armorPen ?? 0)
    let damage = rolled.damage
    if (skill.effect === 'execute') {
      const ratio = side === 'player' ? battle.enemyHp / battle.enemyStats.maxHp : run.player.hp / playerStats.maxHp
      if (ratio <= 0.35) {
        damage = Math.floor(damage * (1 + (skill.executeBonus ?? 0.5)))
      }
    }

    const currentHp = side === 'player' ? battle.enemyHp : run.player.hp
    const targetEffects = side === 'player' ? battle.enemyEffects : battle.playerEffects
    const result = takeDamage(currentHp, targetEffects, damage, defender)

    if (side === 'player') {
      battle.enemyHp = result.hp
    } else {
      run.player.hp = result.hp
    }

    const lifeStealHealed = !result.dodged ? applyPassiveLifeSteal(run, battle, side, attacker, result.damage) : 0

    const counter = effectAmount(targetEffects, 'buff', 'counterDamagePercent')
    if (counter > 0 && result.damage > 0) {
      const reflected = Math.floor(result.damage * counter)
      if (side === 'player') {
        const reflectedResult = takeDamage(run.player.hp, battle.playerEffects, reflected)
        run.player.hp = reflectedResult.hp
      } else {
        const reflectedResult = takeDamage(battle.enemyHp, battle.enemyEffects, reflected)
        battle.enemyHp = reflectedResult.hp
      }
      text += ` Reflet hostile: ${reflected}.`
    }

    if (rolled.crit && !result.dodged) {
      text += ' Critique.'
    }
    if (result.dodged) {
      text += ` ${targetName} esquive.`
    } else if (result.parried) {
      const pb = result.parryBlocked ?? 0
      text += result.damage > 0
        ? ` ${targetName} pare (bloque ${pb}) et subit ${result.damage} degats.`
        : ` ${targetName} pare completement (bloque ${pb}).`
    } else if (result.shieldAbsorbed > 0) {
      text += result.damage > 0
        ? ` Bouclier absorbe ${result.shieldAbsorbed}, ${targetName} subit ${result.damage} degats.`
        : ` Bouclier absorbe ${result.shieldAbsorbed}.`
    } else {
      text += ` ${targetName} subit ${result.damage} degats.`
    }
    if (lifeStealHealed > 0) {
      text += ` Vol de vie: +${lifeStealHealed} PV.`
    }

    if (!result.dodged && skill.statusEffect) {
      const statusText = applySkillStatusEffect(run, side, skill.statusEffect, attacker, defender, targetEffects, targetName)
      if (statusText) {
        text += ` ${statusText}`
      }
    }
  } else if (skill.effect === 'dot') {
    const dotKind = skill.dotKind ?? 'corruption'
    const dotTurns = skill.dotTurns ?? 3
    const targetEffects = side === 'player' ? battle.enemyEffects : battle.playerEffects
    let canApplyAilment = true
    const impactPower = skill.impactPower ?? 0

    if (impactPower > 0) {
      const impactPowerScaled = Math.max(impactPower, skillPowerByAp(side, skill, attacker) * 0.45)
      const impactDamage = computeDamage(attacker, defender, impactPowerScaled, bonusPercent, skill.armorPen ?? 0)
      const currentHp = side === 'player' ? battle.enemyHp : run.player.hp
      const impactResult = takeDamage(currentHp, targetEffects, impactDamage.damage, defender)
      if (side === 'player') {
        battle.enemyHp = impactResult.hp
      } else {
        run.player.hp = impactResult.hp
      }
      const lifeStealHealed = !impactResult.dodged
        ? applyPassiveLifeSteal(run, battle, side, attacker, impactResult.damage)
        : 0
      canApplyAilment = !impactResult.dodged
      text += impactResult.dodged
        ? ` ${targetName} esquive l\'impact.`
        : ` ${targetName} subit ${impactResult.damage} degats initiaux.`
      if (lifeStealHealed > 0) {
        text += ` Vol de vie: +${lifeStealHealed} PV.`
      }
    }

    if (canApplyAilment) {
      const dotBonus = side === 'player' ? playerStats.dotPercent : 0
      const dotPower = skillPowerByAp(side, skill, attacker)
      const dotValue = Math.max(2, Math.floor(attacker.attack * dotPower * 0.7 * (1 + dotBonus)))
      const existingDotIdx = targetEffects.findIndex((e) => e.type === 'dot' && e.kind === dotKind)
      if (existingDotIdx >= 0) {
        targetEffects[existingDotIdx].value = dotValue
        targetEffects[existingDotIdx].turns = dotTurns
        text += ` ${targetName} : ${ailmentLabel(dotKind)} actualisé (${dotValue}/tour).`
      } else {
        targetEffects.push({ id: uid('dot'), type: 'dot', kind: dotKind, value: dotValue, turns: dotTurns })
        text += ` ${targetName} subit ${ailmentLabel(dotKind)} (${dotValue}/tour).`
      }

      if (dotKind === 'bleed') {
        targetEffects.push({
          id: uid('debuff'),
          type: 'debuff',
          stat: 'enemyDefensePercent',
          value: 0.1,
          turns: dotTurns,
        })
        text += ' Armure reduite.'
      } else if (dotKind === 'burn') {
        targetEffects.push({
          id: uid('debuff'),
          type: 'debuff',
          stat: 'enemyAttackPercent',
          value: 0.1,
          turns: dotTurns,
        })
        text += ' Attaque reduite.'
      }

      if (skill.statusEffect) {
        const statusText = applySkillStatusEffect(run, side, skill.statusEffect, attacker, defender, targetEffects, targetName)
        if (statusText) {
          text += ` ${statusText}`
        }
      }
    }
  } else if (skill.effect === 'heal') {
    const maxHp = side === 'player' ? playerStats.maxHp : battle.enemyStats.maxHp
    const rawHeal = Math.floor(
      (attacker.attack * (skill.healRatio ?? 0.7) + attacker.maxHp * 0.05) *
      (1 + (side === 'player' ? playerStats.healingDonePercent : 0)),
    )
    if (side === 'player') {
      const healed = Math.floor(rawHeal * (1 + playerStats.healingTakenPercent))
      run.player.hp = clamp(run.player.hp + healed, 0, maxHp)
      text += ` ${run.player.name} récupère ${healed} PV.`
    } else {
      battle.enemyHp = clamp(battle.enemyHp + rawHeal, 0, maxHp)
      text += ` ${battle.enemyName} récupère ${rawHeal} PV.`
    }
  } else if (skill.effect === 'heal_and_damage') {
    const effectivePower = skillPowerByAp(side, skill, attacker)
    const rolled = computeDamage(attacker, defender, effectivePower, bonusPercent, skill.armorPen ?? 0)
    const currentHp = side === 'player' ? battle.enemyHp : run.player.hp
    const targetEffects = side === 'player' ? battle.enemyEffects : battle.playerEffects
    const result = takeDamage(currentHp, targetEffects, rolled.damage, defender)
    if (side === 'player') {
      battle.enemyHp = result.hp
    } else {
      run.player.hp = result.hp
    }
    const lifeStealHealed = !result.dodged ? applyPassiveLifeSteal(run, battle, side, attacker, result.damage) : 0
    if (rolled.crit && !result.dodged) {
      text += ' Critique.'
    }
    if (result.dodged) {
      text += ` ${targetName} esquive.`
    } else {
      text += ` ${targetName} subit ${result.damage} degats.`
    }
    if (lifeStealHealed > 0) {
      text += ` Vol de vie: +${lifeStealHealed} PV.`
    }
    const maxHp = side === 'player' ? playerStats.maxHp : battle.enemyStats.maxHp
    const rawHeal = Math.floor(
      (attacker.attack * (skill.healRatio ?? 0.5) + attacker.maxHp * 0.05) *
      (1 + (side === 'player' ? playerStats.healingDonePercent : 0)),
    )
    if (side === 'player') {
      const healed = Math.floor(rawHeal * (1 + playerStats.healingTakenPercent))
      run.player.hp = clamp(run.player.hp + healed, 0, maxHp)
      text += ` ${run.player.name} récupère ${healed} PV.`
    } else {
      battle.enemyHp = clamp(battle.enemyHp + rawHeal, 0, maxHp)
      text += ` ${battle.enemyName} récupère ${rawHeal} PV.`
    }
  } else if (skill.effect === 'lifesteal') {
    const power = skillPowerByAp(side, skill, attacker)
    const damage = computeDamage(attacker, defender, power, bonusPercent)
    const currentHp = side === 'player' ? battle.enemyHp : run.player.hp
    const targetEffects = side === 'player' ? battle.enemyEffects : battle.playerEffects
    const result = takeDamage(currentHp, targetEffects, damage.damage, defender)

    if (side === 'player') {
      battle.enemyHp = result.hp
    } else {
      run.player.hp = result.hp
    }

    const heal = Math.floor(result.damage * ((skill.stealRatio ?? 0.4) + (side === 'player' ? playerStats.lifeStealPercent : 0)))
    if (side === 'player') {
      run.player.hp = clamp(run.player.hp + heal, 0, playerStats.maxHp)
    } else {
      battle.enemyHp = clamp(battle.enemyHp + heal, 0, battle.enemyStats.maxHp)
    }
    text += damage.crit && !result.dodged ? ' Critique.' : ''
    text += result.dodged ? ` ${targetName} esquive.` : ` ${targetName} perd ${result.damage}. ${actorName} vole ${heal} PV.`
  } else if (skill.effect === 'shield') {
    const shieldValue = Math.max(8, Math.floor(attacker.maxHp * (skill.shieldRatio ?? 0.25)))
    const effects = side === 'player' ? battle.playerEffects : battle.enemyEffects
    const existingShield = effects.find((e) => e.type === 'shield' && e.value > 0)
    if (existingShield) {
      existingShield.turns = 2
      text += ` Bouclier maintenu (${existingShield.value} restant).`
    } else {
      effects.push({ id: uid('shield'), type: 'shield', value: shieldValue, turns: 2 })
      text += ` Bouclier +${shieldValue}.`
    }
  } else if (skill.effect === 'guard') {
    const effects = side === 'player' ? battle.playerEffects : battle.enemyEffects
    effects.push({ id: uid('guard'), type: 'guard', value: 1, turns: 1 })
    text += ' Posture de garde : prochain coup réduit à 25%.'
    if (skill.buffType && skill.buffValue && skill.buffTurns) {
      effects.push({
        id: uid('buff'),
        type: 'buff',
        stat: skill.buffType,
        value: skill.buffValue,
        turns: skill.buffTurns,
      })
      text += ` +${Math.round(skill.buffValue * 100)}% résistance pendant ${skill.buffTurns} tours.`
    }
  } else if (skill.effect === 'flee') {
    if (side === 'player') {
      const manaCost = skillManaCostFor('player', skill, playerStats)
      battle.playerAp = Math.max(0, battle.playerAp - skill.apCost)
      run.player.mana = clamp(run.player.mana - manaCost, 0, playerStats.maxMana)
      battle.playerCooldowns[skill.id] = skillCooldownFor('player', skill, playerStats)
    }
    const fleeChance = skill.fleeChance ?? 0.5
    if (chance(fleeChance)) {
      persistBattleEnemy(run)
      run.combat = null
      appendLog(run, `${actorName} se téléporte hors du combat !`)
      return { ok: true, finished: false, fled: true }
    }
    appendLog(run, `${actorName} tente de se téléporter... mais échoue !`)
    return { ok: true, finished: false }
  } else if (skill.effect === 'sleep_cast') {
    const targetEffects = side === 'player' ? battle.enemyEffects : battle.playerEffects
    if (skill.statusEffect) {
      const statusText = applySkillStatusEffect(run, side, skill.statusEffect, attacker, defender, targetEffects, targetName)
      if (statusText) text += ` ${statusText}`
    }
  } else if (skill.effect === 'buff') {
    const effects = side === 'player' ? battle.playerEffects : battle.enemyEffects
    const buffType = skill.buffType ?? 'attackPercent'
    if (buffType === 'dodge') {
      effects.push({
        id: uid('dodge'),
        type: 'dodge',
        value: skill.buffValue ?? 1,
        turns: skill.buffTurns ?? 1,
      })
    } else if (buffType !== 'apOnly') {
      effects.push({
        id: uid('buff'),
        type: 'buff',
        stat: buffType,
        value: skill.buffValue ?? 0.2,
        turns: skill.buffTurns ?? 2,
      })
    }
    restoredAp = Math.max(0, Math.floor(skill.restoreAp ?? 0))
    if (buffType !== 'apOnly') {
      const BUFF_LABELS = {
        attackPercent: 'Attaque',
        defensePercent: 'Défense',
        critChance: 'Critique',
        critDamage: 'Dégâts critiques',
        damagePercent: 'Dégâts',
        dodge: 'Esquive',
        dodgeChance: 'Esquive',
      }
      text += ` Buff ${BUFF_LABELS[buffType] ?? buffType} actif (${skill.buffTurns ?? 2} tours).`
    }
    if (restoredAp > 0) {
      text += ` +${restoredAp} PA.`
    }
  } else if (skill.effect === 'debuff') {
    if (skill.power) {
      const scaledPower = Math.max(skill.power, skillPowerByAp(side, skill, attacker) * 0.7)
      const damage = computeDamage(attacker, defender, scaledPower, bonusPercent * 0.55)
      const currentHp = side === 'player' ? battle.enemyHp : run.player.hp
      const targetEffects = side === 'player' ? battle.enemyEffects : battle.playerEffects
      const result = takeDamage(currentHp, targetEffects, damage.damage, defender)
      if (side === 'player') {
        battle.enemyHp = result.hp
      } else {
        run.player.hp = result.hp
      }
      const lifeStealHealed = !result.dodged ? applyPassiveLifeSteal(run, battle, side, attacker, result.damage) : 0
      if (damage.crit && !result.dodged) {
        text += ' Critique.'
      }
      text += result.dodged ? ` ${targetName} esquive.` : ` ${targetName} perd ${result.damage} PV.`
      if (lifeStealHealed > 0) {
        text += ` Vol de vie: +${lifeStealHealed} PV.`
      }
    }
    const debuffType = skill.debuffType ?? 'enemyDefensePercent'
    const effects = side === 'player' ? battle.enemyEffects : battle.playerEffects
    effects.push({
      id: uid('debuff'),
      type: 'debuff',
      stat: debuffType,
      value: skill.debuffValue ?? 0.15,
      turns: skill.debuffTurns ?? 2,
    })
    text += debuffType === 'enemyApPenalty' || debuffType === 'enemyMpPenalty' ? ` ${targetName} perdra des PA.` : ` ${targetName} subit un affaiblissement.`

    if (skill.statusEffect) {
      const statusText = applySkillStatusEffect(run, side, skill.statusEffect, attacker, defender, effects, targetName)
      if (statusText) {
        text += ` ${statusText}`
      }
    }
  }

  if (side === 'player') {
    const manaCost = skillManaCostFor('player', skill, playerStats)
    const cooldownValue = skillCooldownFor('player', skill, playerStats)
    battle.playerAp = Math.max(0, battle.playerAp - skill.apCost + restoredAp)
    run.player.mana = clamp(run.player.mana - manaCost, 0, playerStats.maxMana)
    battle.playerCooldowns[skill.id] = cooldownValue
  } else {
    const manaCost = skillManaCostFor('enemy', skill)
    const cooldownValue = skillCooldownFor('enemy', skill)
    battle.enemyAp = Math.max(0, battle.enemyAp - skill.apCost + restoredAp)
    battle.enemyMana = clamp((battle.enemyMana ?? battle.enemyStats.maxMana) - manaCost, 0, battle.enemyStats.maxMana)
    battle.enemyCooldowns[skill.id] = cooldownValue
  }

  appendLog(run, text)

  if (battle.enemyHp <= 0) {
    finishCombatVictory(run)
    return { ok: true, finished: true }
  }
  if (run.player.hp <= 0) {
    resolvePlayerDeath(run)
    return { ok: true, finished: true }
  }

  return { ok: true, finished: false }
}

function normalAttackResult(run, side) {
  const battle = run.combat
  const playerStats = derivedStats(run)

  const playerBuffAtk = effectAmount(battle.playerEffects, 'buff', 'attackPercent')
  const playerDebuffAtk = effectAmount(battle.playerEffects, 'debuff', 'attackPercent') + effectAmount(battle.playerEffects, 'debuff', 'enemyAttackPercent')
  const playerBuffDef = effectAmount(battle.playerEffects, 'buff', 'defensePercent')
  const playerDebuffDef = effectAmount(battle.playerEffects, 'debuff', 'defensePercent') + effectAmount(battle.playerEffects, 'debuff', 'enemyDefensePercent')
  const enemyBuffAtk = effectAmount(battle.enemyEffects, 'buff', 'attackPercent')
  const enemyDebuffAtk = effectAmount(battle.enemyEffects, 'debuff', 'attackPercent') + effectAmount(battle.enemyEffects, 'debuff', 'enemyAttackPercent')
  const enemyBuffDef = effectAmount(battle.enemyEffects, 'buff', 'defensePercent')
  const enemyDebuffDef = effectAmount(battle.enemyEffects, 'debuff', 'defensePercent') + effectAmount(battle.enemyEffects, 'debuff', 'enemyDefensePercent')
  const playerBonusDamage = playerStats.damagePercent + effectAmount(battle.playerEffects, 'buff', 'damagePercent')

  const attacker =
    side === 'player'
      ? {
        attack: Math.floor(playerStats.attack * statMultiplier(playerBuffAtk, playerDebuffAtk)),
        defense: Math.floor(playerStats.defense * statMultiplier(playerBuffDef, playerDebuffDef)),
        critChance: playerStats.critChance,
        critDamage: playerStats.critDamage,
        toppleChance: playerStats.toppleChance,
        statusChance: playerStats.statusChance,
        lifeStealPercent: playerStats.lifeStealPercent,
        maxHp: playerStats.maxHp,
      }
      : {
        attack: Math.floor(battle.enemyStats.attack * statMultiplier(enemyBuffAtk, enemyDebuffAtk)),
        defense: Math.floor(battle.enemyStats.defense * statMultiplier(enemyBuffDef, enemyDebuffDef)),
        critChance: battle.enemyStats.critChance ?? 0.06,
        critDamage: battle.enemyStats.critDamage ?? 0.42,
        toppleChance: battle.enemyStats.toppleChance ?? 0.08,
        statusChance: battle.enemyStats.toppleChance ?? 0.08,
        lifeStealPercent: battle.enemyStats.lifeStealPercent ?? 0,
        maxHp: battle.enemyStats.maxHp,
      }

  const defender =
    side === 'player'
      ? {
        defense: Math.floor(battle.enemyStats.defense * statMultiplier(enemyBuffDef, enemyDebuffDef)),
        dodgeChance: battle.enemyStats.dodgeChance ?? 0.03,
        parryChance: battle.enemyStats.parryChance ?? 0.03,
        statusResist: battle.enemyStats.statusResist ?? 0.05,
      }
      : {
        defense: Math.floor(playerStats.defense * statMultiplier(playerBuffDef, playerDebuffDef)),
        dodgeChance: playerStats.dodgeChance,
        parryChance: playerStats.parryChance,
        statusResist: playerStats.statusResist,
      }

  const attackerEffects = side === 'player' ? battle.playerEffects : battle.enemyEffects
  const disorientMissChance = consumeNextAttackMissChance(attackerEffects)
  if (disorientMissChance > 0 && chance(disorientMissChance)) {
    if (side === 'player') {
      battle.playerAp = Math.max(0, battle.playerAp - playerStats.normalAttackCost)
      appendLog(run, `${run.player.name} rate son attaque normale à cause de la désorientation.`)
    } else {
      battle.enemyAp = Math.max(0, battle.enemyAp - COMBAT_NORMAL_ATTACK_COST)
      appendLog(run, `${battle.enemyName} rate son attaque à cause de la désorientation.`)
    }
    return { ok: true, finished: false }
  }

  const bonusPercent = side === 'player' ? playerBonusDamage : 0
  const damage = computeDamage(attacker, defender, 1, bonusPercent)
  const currentHp = side === 'player' ? battle.enemyHp : run.player.hp
  const targetEffects = side === 'player' ? battle.enemyEffects : battle.playerEffects
  const result = takeDamage(currentHp, targetEffects, damage.damage, defender)

  if (side === 'player') {
    battle.enemyHp = result.hp
    battle.playerAp = Math.max(0, battle.playerAp - playerStats.normalAttackCost)
    const lifeStealHealed = !result.dodged ? applyPassiveLifeSteal(run, battle, side, attacker, result.damage) : 0
    let text = ''
    if (damage.crit && !result.dodged) {
      text += 'Critique. '
    }
    if (result.dodged) {
      text += `${battle.enemyName} esquive ton attaque normale.`
    } else if (result.parried) {
      const pb = result.parryBlocked ?? 0
      text += result.damage > 0
        ? `${battle.enemyName} pare (bloque ${pb}) et subit ${result.damage} degats.`
        : `${battle.enemyName} pare completement le coup (bloque ${pb}).`
    } else if (result.shieldAbsorbed > 0) {
      text += result.damage > 0
        ? `Attaque normale: bouclier absorbe ${result.shieldAbsorbed}, ${result.damage} degats.`
        : `Attaque normale: bouclier absorbe ${result.shieldAbsorbed}.`
    } else {
      text += `Attaque normale: ${result.damage} degats.`
    }
    if (lifeStealHealed > 0) {
      text += ` Vol de vie: +${lifeStealHealed} PV.`
    }
    if (!result.dodged && chance(statusChance(run, side, attacker, defender, attacker.toppleChance ?? 0.06))) {
      battle.enemyEffects.push({
        id: uid('topple'),
        type: 'debuff',
        stat: 'enemyApPenalty',
        value: 1,
        turns: 1,
      })
      text += ` ${battle.enemyName} est destabilise.`
    }
    appendLog(run, text)
  } else {
    run.player.hp = result.hp
    battle.enemyAp = Math.max(0, battle.enemyAp - COMBAT_NORMAL_ATTACK_COST)
    const lifeStealHealed = !result.dodged ? applyPassiveLifeSteal(run, battle, side, attacker, result.damage) : 0
    let text = ''
    if (damage.crit && !result.dodged) {
      text += 'Critique ennemi. '
    }
    if (result.dodged) {
      text += `Tu esquives l\'attaque normale de ${battle.enemyName}.`
    } else if (result.parried) {
      const pb = result.parryBlocked ?? 0
      text += result.damage > 0
        ? `Tu pares (bloque ${pb}) et recois ${result.damage} degats.`
        : `Tu pares completement le coup (bloque ${pb}).`
    } else {
      text += `${battle.enemyName} frappe: ${result.damage} degats.`
    }
    if (lifeStealHealed > 0) {
      text += ` Vol de vie: +${lifeStealHealed} PV.`
    }
    if (!result.dodged && chance(statusChance(run, side, attacker, defender, attacker.toppleChance ?? 0.06))) {
      battle.playerEffects.push({
        id: uid('topple'),
        type: 'debuff',
        stat: 'enemyApPenalty',
        value: 1,
        turns: 1,
      })
      text += ' Tu es renverse.'
    }
    appendLog(run, text)
  }

  if (battle.enemyHp <= 0) {
    finishCombatVictory(run)
    return { ok: true, finished: true }
  }
  if (run.player.hp <= 0) {
    resolvePlayerDeath(run)
    return { ok: true, finished: true }
  }

  return { ok: true, finished: false }
}

function finishCombatVictory(run) {
  const battle = run.combat
  if (!battle) {
    return
  }
  resolveEnemyDeath(run, { id: battle.enemyRefId, templateId: battle.enemyTemplateId, isBoss: battle.enemyIsBoss })
  run.combat = null
}

function resolvePlayerDeath(run) {
  persistBattleEnemy(run)
  const difficulty = difficultyFor(run)
  run.combat = null
  run.player.deaths += 1

  if ((run.player.materials.revive_charm ?? 0) > 0) {
    run.player.materials.revive_charm -= 1
    const stats = derivedStats(run)
    run.player.hp = Math.max(1, Math.floor(stats.maxHp * 0.5))
    appendLog(run, `Idole de renaissance brisée ! Vous revenez à 50% de vos PV (${run.player.materials.revive_charm} restante(s)).`)
    return
  }

  if (difficulty.permadeath) {
    run.gameOver = true
    run.hardcoreDeath = true
    appendLog(run, 'Mort definitive en mode hardcore. Campagne perdue.')
    return
  }

  const penalty = Math.floor(run.player.gold * 0.2)
  run.player.gold = Math.max(0, run.player.gold - penalty)
  run.world.playerPosition = { ...currentMapState(run).start }
  syncVitals(run, true)
  appendLog(run, `Defaite: respawn et perte de ${penalty} or.`)
}

export function startCombat(run, enemy) {
  if (run.combat || !enemy || !enemy.alive) {
    return
  }

  const template = enemyById(enemy.templateId)
  if (!template) {
    return
  }

  const difficulty = difficultyFor(run)
  const mapLevelScale = currentMap(run)?.levelScale ?? 1
  const scaled = applyDifficultyToEnemy(template, difficulty, mapLevelScale)
  const hpRatio = clamp(enemy.currentHp / Math.max(1, template.maxHp), 0.05, 1)
  const manaRatio = clamp(enemy.currentMana / Math.max(1, template.maxMana || 1), 0, 1)
  const playerStats = derivedStats(run)
  const preparedBuffs = (run.player.preparedBuffs ?? []).map((effect) => ({
    ...effect,
    id: uid('prep'),
  }))
  run.player.preparedBuffs = []

  run.combat = {
    enemyRefId: enemy.id,
    enemyTemplateId: enemy.templateId,
    enemyName: template.name,
    enemyIsBoss: enemy.isBoss,
    enemyStats: scaled,
    enemyHp: Math.max(1, Math.floor(scaled.maxHp * hpRatio)),
    enemyMana: Math.floor(scaled.maxMana * manaRatio),
    enemyFleeResist: template.fleeResist ?? 0.2,
    enemyEffects: [],
    playerEffects: preparedBuffs,
    enemyCooldowns: {},
    playerCooldowns: {},
    playerAp: 0,
    enemyAp: 0,
    bonusTurnUsed: false,
    actor: playerStats.speed + randomInt(0, 6) >= scaled.speed + randomInt(0, 6) ? 'player' : 'enemy',
    turn: 1,
  }

  if (preparedBuffs.length) {
    appendLog(run, `Effets prepares actifs: ${preparedBuffs.length}.`)
  }
  appendLog(run, `Combat lance contre ${template.name}${enemy.isBoss ? ' (BOSS)' : ''}.`)
  startTurn(run)
}

function skillManaCostFor(side, skill, stats = null) {
  if (!skill) {
    return 0
  }
  if (side !== 'player') {
    return skill.manaCost ?? 0
  }
  const reduction = clamp(stats?.manaCostReductionPercent ?? 0, 0, 0.6)
  return Math.max(0, Math.floor((skill.manaCost ?? 0) * (1 - reduction)))
}

function skillCooldownFor(side, skill, stats = null) {
  if (!skill) {
    return 0
  }
  if (side !== 'player') {
    return skill.cooldown ?? 0
  }
  const reduction = clamp(stats?.cooldownReductionPercent ?? 0, 0, 0.45)
  return Math.max(0, Math.floor((skill.cooldown ?? 0) * (1 - reduction)))
}

function skillCanBeUsed(side, skill, ap, mana, cooldowns, stats = null) {
  if (!skill) {
    return false
  }
  const manaCost = skillManaCostFor(side, skill, stats)
  if (ap < skill.apCost || mana < manaCost) {
    return false
  }
  if ((cooldowns[skill.id] ?? 0) > 0) {
    return false
  }
  return true
}

export function playerUseSkill(run, skillId) {
  const battle = run.combat
  if (!battle || battle.actor !== 'player') {
    return { ok: false, reason: 'Ce n\'est pas ton tour.' }
  }

  const skill = unlockedSkills(run).find((entry) => entry.id === skillId)
  if (!skill) {
    return { ok: false, reason: 'Competence indisponible.' }
  }

  const playerStats = derivedStats(run)
  if (!skillCanBeUsed('player', skill, battle.playerAp, run.player.mana, battle.playerCooldowns, playerStats)) {
    return { ok: false, reason: 'PA, mana ou cooldown insuffisants.' }
  }

  return applySkill(run, 'player', skill)
}

export function playerNormalAttack(run) {
  const battle = run.combat
  if (!battle || battle.actor !== 'player') {
    return { ok: false, reason: 'Ce n\'est pas ton tour.' }
  }

  const stats = derivedStats(run)
  if (battle.playerAp < stats.normalAttackCost) {
    return { ok: false, reason: 'PA insuffisants pour attaque normale.' }
  }

  return normalAttackResult(run, 'player')
}

export function playerMoveCombat(run, direction) {
  void direction
  const battle = run.combat
  if (!battle || battle.actor !== 'player') {
    return { ok: false, reason: 'Ce n\'est pas ton tour.' }
  }
  return { ok: false, reason: 'Cette action n\'est plus disponible.' }
}

function bestEnemySkill(run) {
  const battle = run.combat
  const template = currentEnemyTemplate(run)
  if (!template) {
    return null
  }
  const usable = template.skills.filter((skill) =>
    skillCanBeUsed('enemy', skill, battle.enemyAp, battle.enemyMana, battle.enemyCooldowns),
  )
  if (!usable.length) {
    return null
  }
  const hpRatio = battle.enemyHp / Math.max(1, battle.enemyStats.maxHp)
  const scored = usable.map((skill) => {
    let score = skill.power ?? 0.2
    if (skill.effect === 'heal') {
      // Avoid wasting heal at high HP and prioritize it when boss is low.
      if (hpRatio >= 0.92) {
        score = -999
      } else {
        const missingHpRatio = 1 - hpRatio
        score = 0.35 + (skill.healRatio ?? 0.65) * 1.2 + missingHpRatio * 3.2
      }
    }
    return { skill, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored[0]?.skill ?? null
}

function enemyCanNormalAttack(run) {
  const battle = run.combat
  return battle.enemyAp >= COMBAT_NORMAL_ATTACK_COST
}

function enemyMove(run) {
  void run
  return false
}

export function runEnemyTurn(run) {
  const battle = run.combat
  if (!battle || battle.actor !== 'enemy') {
    return
  }

  let safety = 10
  while (run.combat?.actor === 'enemy' && safety > 0) {
    safety -= 1
    const skill = bestEnemySkill(run)
    if (skill) {
      applySkill(run, 'enemy', skill)
      if (!run.combat || run.combat.actor !== 'enemy') {
        break
      }
      if (battle.enemyAp <= 1) {
        break
      }
      continue
    }

    if (enemyCanNormalAttack(run)) {
      normalAttackResult(run, 'enemy')
      if (!run.combat || run.combat.actor !== 'enemy') {
        break
      }
      if (battle.enemyAp <= 1) {
        break
      }
      continue
    }

    const moved = enemyMove(run)
    if (!moved) {
      break
    }
  }

  if (run.combat?.actor === 'enemy') {
    endTurn(run)
  }
}

export function endPlayerTurn(run) {
  if (!run.combat || run.combat.actor !== 'player') {
    return
  }
  const stats = derivedStats(run)
  if (stats.lifeRegenFlat > 0) {
    const before = run.player.hp
    const regenAmount = Math.floor(stats.lifeRegenFlat * (1 + (stats.healingDonePercent ?? 0)))
    run.player.hp = clamp(run.player.hp + regenAmount, 0, stats.maxHp)
    const gained = run.player.hp - before
    if (gained > 0) {
      appendLog(run, `Régénération: +${gained} PV.`)
    }
  }
  endTurn(run)
}

export function getFleeChance(run) {
  if (!run.combat) {
    return 0
  }
  const battle = run.combat
  const stats = derivedStats(run)
  const speedDelta = stats.speed - battle.enemyStats.speed
  const bossPenalty = battle.enemyIsBoss ? 0.22 : 0
  const raw = 0.42 + speedDelta * 0.028 - (battle.enemyFleeResist ?? 0.2) - bossPenalty
  return clamp(raw, 0.05, 0.9)
}

export function fleeCombat(run) {
  const battle = run.combat
  if (!battle || battle.actor !== 'player') {
    return { ok: false, reason: 'Impossible de fuir maintenant.' }
  }
  if (battle.playerAp < 2) {
    return { ok: false, reason: 'Il faut 2 PA pour tenter de fuir.' }
  }

  const fleeChance = getFleeChance(run)
  battle.playerAp -= 2

  if (chance(fleeChance)) {
    persistBattleEnemy(run)
    run.combat = null
    appendLog(run, `Fuite reussie (${Math.round(fleeChance * 100)}%).`)
    return { ok: true, success: true, fleeChance }
  }

  appendLog(run, `Fuite echouee (${Math.round(fleeChance * 100)}%).`)
  if (battle.playerAp <= 0) {
    endTurn(run)
  }
  return { ok: true, success: false, fleeChance }
}

function pushPreparedBuff(run, effect) {
  run.player.preparedBuffs ??= []
  run.player.preparedBuffs.push({
    type: effect.type ?? 'buff',
    stat: effect.stat,
    value: effect.value,
    turns: effect.turns,
  })
}

function applyBuffConsumable(run, effect, textInCombat, textPrepared) {
  if (run.combat) {
    run.combat.playerEffects.push({ ...effect, id: uid('consumable') })
    appendLog(run, textInCombat)
  } else {
    pushPreparedBuff(run, effect)
    appendLog(run, textPrepared)
  }
}

function consumableUsageBlockReason(run, effect) {
  const stats = derivedStats(run)
  if (run.combat && run.combat.actor === 'player' && run.combat.playerAp < 2) {
    return 'Il faut 2 PA pour utiliser un consommable.'
  }

  if ((effect === 'heal_50' || effect === 'heal_80') && run.player.hp >= stats.maxHp) {
    return 'PV déjà au maximum.'
  }
  if (effect === 'mana_60' && run.player.mana >= stats.maxMana) {
    return 'Mana déjà au maximum.'
  }
  if (effect === 'heal_45_mana_35' && run.player.hp >= stats.maxHp && run.player.mana >= stats.maxMana) {
    return 'PV et mana déjà au maximum.'
  }
  if (effect === 'campfire') {
    if (run.combat) return 'Le feu de camp ne peut être utilisé qu\'en dehors du combat.'
    if (run.player.hp >= stats.maxHp && run.player.mana >= stats.maxMana) return 'PV et mana déjà au maximum.'
  }

  return ''
}

function healAmountForPotion(effect, itemRarity) {
  if (effect !== 'heal_50' && effect !== 'heal_80') return 0
  return itemRarity === 'common' ? 50 : 80
}

function applyConsumable(run, effect, itemRarity = null) {
  const stats = derivedStats(run)
  if (effect === 'heal_50' || effect === 'heal_80') {
    const amount = healAmountForPotion(effect, itemRarity)
    run.player.hp = clamp(run.player.hp + amount, 0, stats.maxHp)
    appendLog(run, `Potion utilisée: +${amount} PV.`)
    return true
  }
  if (effect === 'mana_60') {
    run.player.mana = clamp(run.player.mana + 60, 0, stats.maxMana)
    appendLog(run, 'Elixir utilise: +60 mana.')
    return true
  }
  if (effect === 'heal_45_mana_35') {
    run.player.hp = clamp(run.player.hp + 45, 0, stats.maxHp)
    run.player.mana = clamp(run.player.mana + 35, 0, stats.maxMana)
    appendLog(run, 'Kit de recuperation: +45 PV, +35 mana.')
    return true
  }
  if (effect === 'buff_resistance') {
    applyBuffConsumable(
      run,
      { type: 'buff', stat: 'defensePercent', value: 0.24, turns: 3 },
      'Tonique de resistance: defense renforcee pour 3 tours.',
      'Tonique de resistance prepare pour le prochain combat.',
    )
    return true
  }
  if (effect === 'buff_damage') {
    applyBuffConsumable(
      run,
      { type: 'buff', stat: 'attackPercent', value: 0.24, turns: 3 },
      'Fiole de furie: degats augmentes pour 3 tours.',
      'Fiole de furie preparee pour le prochain combat.',
    )
    return true
  }
  if (effect === 'buff_crit') {
    if (run.combat) {
      run.combat.playerEffects.push({ id: uid('consumable'), type: 'buff', stat: 'critChance', value: 0.12, turns: 3 })
      run.combat.playerEffects.push({ id: uid('consumable'), type: 'buff', stat: 'critDamage', value: 0.15, turns: 3 })
      appendLog(run, 'Huile de focus: critique renforce pour 3 tours.')
    } else {
      pushPreparedBuff(run, { type: 'buff', stat: 'critChance', value: 0.12, turns: 3 })
      pushPreparedBuff(run, { type: 'buff', stat: 'critDamage', value: 0.15, turns: 3 })
      appendLog(run, 'Huile de focus preparee pour le prochain combat.')
    }
    return true
  }
  if (effect === 'cleanse_and_guard') {
    if (run.combat) {
      run.combat.playerEffects = run.combat.playerEffects.filter((entry) => entry.type !== 'dot' && entry.type !== 'debuff')
      run.combat.playerEffects.push({ id: uid('consumable'), type: 'shield', value: 42, turns: 2 })
      appendLog(run, 'Orbe de clarte: debuffs retires et bouclier obtenu.')
    } else {
      pushPreparedBuff(run, { type: 'shield', value: 42, turns: 2 })
      appendLog(run, 'Orbe de clarte prepare: bouclier au prochain combat.')
    }
    return true
  }
  if (effect === 'vision_boost' || effect === 'torch') {
    run.player.visionBoostSteps = (run.player.visionBoostSteps ?? 0) + 14
    appendLog(run, 'Torche : champ de vision élargi pour 14 pas.')
    return true
  }
  if (effect === 'campfire') {
    if (run.combat) return false
    const stats = derivedStats(run)
    run.player.hp = stats.maxHp
    run.player.mana = stats.maxMana
    appendLog(run, 'Feu de camp : PV et mana entièrement restaurés.')
    return true
  }
  return false
}

export function useConsumable(run, itemId) {
  const item = run.player.inventory.find((entry) => entry.id === itemId && entry.kind === 'consumable')
  if (!item) {
    return { ok: false, reason: 'Consommable introuvable.' }
  }

  if (run.combat && run.combat.actor !== 'player') {
    return { ok: false, reason: 'Attends ton tour.' }
  }

  const blockReason = consumableUsageBlockReason(run, item.effect)
  if (blockReason) {
    return { ok: false, reason: blockReason }
  }

  if (!applyConsumable(run, item.effect, item.rarity)) {
    return { ok: false, reason: 'Effet non gere.' }
  }

  item.quantity -= 1
  if (item.quantity <= 0) {
    removeInventoryItem(run, item.id)
  }

  if (run.combat && run.combat.actor === 'player') {
    run.combat.playerAp = Math.max(0, run.combat.playerAp - 2)
  }

  return { ok: true }
}

export function buyConsumable(run, shopId) {
  const entry = CONSUMABLES_SHOP.find((shop) => shop.id === shopId)
  if (!entry) {
    return { ok: false, reason: 'Objet boutique inconnu.' }
  }
  const currentStock = run.world.shopStock?.[entry.id]
  if ((entry.stock ?? 0) > 0 && (currentStock ?? 0) <= 0) {
    return { ok: false, reason: 'Stock epuise.' }
  }
  if (run.player.gold < entry.price) {
    return { ok: false, reason: 'Or insuffisant.' }
  }

  run.player.gold -= entry.price
  if ((entry.stock ?? 0) > 0) {
    run.world.shopStock[entry.id] = Math.max(0, (run.world.shopStock[entry.id] ?? entry.stock) - 1)
  }
  const isHealPotion = entry.effect === 'heal_80'
  addInventoryItem(run, {
    id: uid('consumable'),
    kind: 'consumable',
    name: entry.name,
    effect: isHealPotion ? 'heal_50' : entry.effect,
    quantity: 1,
    rarity: 'common',
    value: entry.price,
    description: entry.description ?? '',
    icon: '/assets/Weapons/Hands/Hands.png',
  })
  const stockText =
    (entry.stock ?? 0) > 0 ? ` Stock restant: ${run.world.shopStock[entry.id] ?? 0}.` : ''
  appendLog(run, `${entry.name} achete pour ${entry.price} or.${stockText}`)
  return { ok: true, remainingStock: run.world.shopStock?.[entry.id] ?? null }
}

function recycleMaterialEntriesForItem(item) {
  const rarity = item?.rarity ?? 'common'
  const rule = RECYCLE_RULES_BY_RARITY[rarity] ?? RECYCLE_RULES_BY_RARITY.common
  const slotMaterials = RECYCLE_MATERIALS_BY_SLOT[item?.slot] ?? RECYCLE_MATERIALS_BY_SLOT.weapon
  const optimizationMult = itemOptimizationMultiplier(item)
  const gained = []
  const addGained = (material, quantity) => {
    if (!material || quantity <= 0) return
    const existing = gained.find((entry) => entry.material === material)
    if (existing) existing.quantity += quantity
    else gained.push({ material, quantity })
  }

  addGained(slotMaterials.primary, Math.max(1, Math.round(randomInt(rule.min, rule.max) * optimizationMult)))
  if (chance(rule.secondaryChance)) {
    addGained(slotMaterials.secondary, Math.max(1, Math.round(randomInt(1, Math.max(1, Math.ceil(rule.max / 2))) * optimizationMult)))
  }
  if (chance(rule.bossShardChance)) {
    addGained('boss_shard', randomInt(1, rule.bossShardMax ?? 1))
  }
  return gained
}

export function recycleItem(run, itemId) {
  const item = run.player.inventory.find((entry) => entry.id === itemId)
  if (!item) {
    return { ok: false, reason: 'Objet introuvable.' }
  }
  if (item.kind !== 'equipment') {
    return { ok: false, reason: 'Seuls les equipements peuvent etre recycles.' }
  }

  const gained = recycleMaterialEntriesForItem(item)
  for (const entry of gained) {
    addMaterial(run, entry.material, entry.quantity)
  }
  removeInventoryItem(run, item.id)

  const materialLine = gained.length
    ? gained.map((entry) => `${entry.quantity} ${MATERIAL_LABELS[entry.material] ?? entry.material}`).join(', ')
    : 'aucun materiau'
  appendLog(run, `${item.name} recycle: ${materialLine}.`)
  return { ok: true, gained }
}

export function sellItem(run, itemId) {
  const item = run.player.inventory.find((entry) => entry.id === itemId)
  if (!item) {
    return { ok: false, reason: 'Objet introuvable.' }
  }

  const value = sellValueForItem(item)
  run.player.gold += value
  removeInventoryItem(run, item.id)
  appendLog(run, `${item.name} vendu pour ${value} or.`)
  return { ok: true }
}

export function sellValueForItem(item) {
  const rarity = item?.rarity ?? 'common'
  const rarityMult = SELL_RARITY_MULTIPLIER[rarity] ?? 1
  const optimizationMult = itemOptimizationMultiplier(item)
  return Math.max(1, Math.floor((item?.value ?? 12) * SELL_PRICE_FACTOR * rarityMult * optimizationMult))
}

function recipeById(recipeId) {
  return RECIPES.find((entry) => entry.id === recipeId) ?? null
}

function recipeUsesBaseCost(recipe) {
  if (!recipe) {
    return true
  }
  if (recipe.category === 'camp') {
    return true
  }
  if (recipe.rarity === 'legendary' || recipe.result?.rarity === 'legendary') {
    return true
  }
  if (recipe.result?.kind === 'consumable' && (recipe.result?.effect === 'heal_80' || recipe.result?.effect === 'mana_60')) {
    return true
  }
  if (recipe.id === 'recipe_stability_shard') {
    return true
  }
  return false
}

function effectiveRecipeMaterials(recipe) {
  if (!recipe) {
    return {}
  }
  if (recipeUsesBaseCost(recipe)) {
    return { ...recipe.materials }
  }

  const scaled = {}
  for (const [material, quantity] of Object.entries(recipe.materials)) {
    const base = Number(quantity) || 0
    scaled[material] = Math.max(base + 1, Math.ceil(base * CRAFT_COST_MULTIPLIER))
  }
  return scaled
}

export function recipeMaterialRequirements(recipeId) {
  const recipe = recipeById(recipeId)
  if (!recipe) {
    return null
  }
  return effectiveRecipeMaterials(recipe)
}

export function canCraft(run, recipeId) {
  const recipe = recipeById(recipeId)
  if (!recipe) {
    return false
  }
  const materials = effectiveRecipeMaterials(recipe)
  return Object.entries(materials).every(([material, qty]) => (run.player.materials[material] ?? 0) >= qty)
}

export function craftItem(run, recipeId) {
  const recipe = recipeById(recipeId)
  if (!recipe) {
    return { ok: false, reason: 'Recette inconnue.' }
  }
  if (!canCraft(run, recipeId)) {
    return { ok: false, reason: 'Materiaux insuffisants.' }
  }

  const effectiveMaterials = effectiveRecipeMaterials(recipe)
  for (const [material, qty] of Object.entries(effectiveMaterials)) {
    run.player.materials[material] -= qty
  }

  if (recipe.result.kind === 'material') {
    addMaterial(run, recipe.result.material, recipe.result.quantity ?? 1)
  } else if (recipe.result.kind === 'consumable') {
    addInventoryItem(run, {
      id: uid('consumable'),
      kind: 'consumable',
      name: recipe.result.name,
      effect: recipe.result.effect,
      quantity: recipe.result.quantity,
      rarity: recipe.rarity,
      value: 30,
      icon: recipe.result.icon ?? '/assets/Icons/potion.png',
    })
  } else {
    const rarityData = RARITIES[recipe.result.rarity]
    // Le craft est délibéré : il exclut la "piètre qualité" pour rester strictement
    // meilleur qu'un objet trouvé au hasard, à rareté égale.
    const quality = rollEquipmentQuality([
      { value: 'good', weight: 70 },
      { value: 'perfect', weight: 30 },
    ])
    const primaryStats = rollEquipmentPrimaryStats(recipe.result.slot, recipe.result.rarity, quality)
    const item = {
      id: uid('equipment'),
      kind: 'equipment',
      slot: recipe.result.slot,
      name: recipe.result.baseName,
      rarity: recipe.result.rarity,
      quality,
      attack: primaryStats.attack,
      defense: primaryStats.defense,
      value: Math.floor(recipe.result.value * rarityData.valueMultiplier),
      icon: recipe.result.icon ?? SLOT_DEFAULT_ICON[recipe.result.slot],
    }

    if (recipe.result.slot === 'weapon') {
      item.weaponType = recipe.result.weaponType ?? 'melee'
    }

    item.sockets = new Array(SOCKET_CAP_BY_RARITY[recipe.result.rarity] ?? 0).fill(null)

    addInventoryItem(run, applyRandomBonusesToItem(run, item))
  }

  appendLog(run, `Artisanat: ${recipe.name} forge.`)
  return { ok: true, recipe }
}

export function healAtNpc(run) {
  const price = 55
  const stats = derivedStats(run)
  if (run.player.hp >= stats.maxHp) {
    return { ok: false, reason: "Tu n'as pas besoin de soins." }
  }
  if (run.player.gold < price) {
    return { ok: false, reason: 'Or insuffisant.' }
  }
  run.player.gold -= price
  syncVitals(run, true)
  appendLog(run, `Soin complet reçu pour ${price} or.`)
  return { ok: true }
}

function npcOnCurrentMap(run, npcId) {
  return currentMapState(run).npcs.find((entry) => entry.id === npcId) ?? null
}

function riddlePoolForNpc(npc) {
  if (!npc) {
    return []
  }
  if (npc.riddlePool?.length) {
    return npc.riddlePool
  }
  if (npc.riddle) {
    return [npc.riddle]
  }
  return []
}

function activeNpcRiddle(run, npc) {
  const mapState = currentMapState(run)
  const pool = riddlePoolForNpc(npc)
  if (!pool.length) {
    return null
  }
  mapState.selectedRiddles ??= {}
  const selectedId = mapState.selectedRiddles[npc.id]
  let selected = pool.find((entry) => entry.id === selectedId) ?? null
  if (!selected) {
    selected = randomChoice(pool)
    if (!selected) {
      return null
    }
    mapState.selectedRiddles[npc.id] = selected.id
  }
  return selected
}

function riddleAttemptKey(npcId, riddleId) {
  return `${npcId}:${riddleId}`
}

export function getNpcRiddle(run, npcId) {
  const npc = npcOnCurrentMap(run, npcId)
  const riddle = activeNpcRiddle(run, npc)
  if (!riddle) {
    return null
  }
  const mapState = currentMapState(run)
  const key = riddleAttemptKey(npc.id, riddle.id)
  const solved = mapState.solvedRiddles.includes(key)
  const failed = mapState.failedRiddles.includes(key)
  return {
    ...riddle,
    solved,
    failed,
    locked: solved || failed,
  }
}

export function answerNpcRiddle(run, npcId, optionId) {
  const npc = npcOnCurrentMap(run, npcId)
  const riddle = activeNpcRiddle(run, npc)
  if (!riddle) {
    return { ok: false, reason: 'Aucune énigme pour ce PNJ.' }
  }

  const mapState = currentMapState(run)
  const wasPortalRevealed = Boolean(mapState.secretPortalRevealed)
  const key = riddleAttemptKey(npc.id, riddle.id)
  if (mapState.solvedRiddles.includes(key)) {
    return { ok: false, reason: 'Enigme déjà resolue.' }
  }
  if (mapState.failedRiddles.includes(key)) {
    return { ok: false, reason: 'Tentative déjà utilisee sur cette énigme.' }
  }

  const correct = optionId === riddle.correctOptionId
  if (!correct) {
    mapState.failedRiddles.push(key)
    appendLog(run, riddle.failText ?? 'Mauvaise reponse.')
    return {
      ok: true,
      correct: false,
      text: riddle.failText ?? 'Mauvaise reponse.',
      portalOpened: false,
      mapId: run.world.currentMapId,
    }
  }

  mapState.solvedRiddles.push(key)
  const reward = riddle.reward ?? {}
  if (reward.gold) {
    run.player.gold += reward.gold
  }
  if (reward.materials) {
    for (const [material, qty] of Object.entries(reward.materials)) {
      addMaterial(run, material, qty)
    }
  }
  if (reward.revealSecretPortal && mapState.secretPortal) {
    // Génère un donjon secret frais et recalibré sur le niveau de cette map, plutôt
    // que de renvoyer toujours vers la même destination fixe partagée par tout le jeu.
    mapState.secretPortal.targetMapId = generateProceduralSecretDungeon(run)
    mapState.secretPortalRevealed = true
  }

  appendLog(run, riddle.successText ?? 'Enigme resolue.')
  return {
    ok: true,
    correct: true,
    text: riddle.successText ?? 'Enigme resolue.',
    portalOpened: !wasPortalRevealed && Boolean(mapState.secretPortalRevealed),
    mapId: run.world.currentMapId,
  }
}

export function progressSummary(run) {
  const maps = Object.entries(run.world.maps).map(([mapId, state]) => ({
    mapId,
    bossDefeated: state.bossDefeated,
    remainingEnemies: state.enemies.filter((enemy) => enemy.alive).length,
    openedChests: state.chests.filter((chest) => chest.opened).length,
    totalChests: state.chests.length,
    solvedRiddles: state.solvedRiddles.length,
    secretPortalRevealed: state.secretPortalRevealed,
  }))
  const allItems = [...run.player.inventory, ...Object.values(run.player.equipment ?? {}).filter(Boolean)]

  return {
    maps,
    mythicCount: allItems.filter((item) => item.rarity === 'mythic').length,
    totalDeaths: run.player.deaths,
    difficulty: run.metadata.difficulty,
    classId: run.player.classId,
    level: run.player.level,
    availableRarities: RARITY_ORDER,
  }
}

export function stepWanderingNpcs(run) {
  if (run.combat) return
  const mapState = currentMapState(run)
  const map = currentMap(run)
  const px = run.world.playerPosition.x
  const py = run.world.playerPosition.y
  const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]]

  for (const npc of mapState.npcs) {
    if (npc.role !== 'wandering_merchant') continue
    if (!chance(0.55)) continue
    const shuffled = [...dirs].sort(() => Math.random() - 0.5)
    for (const [dx, dy] of shuffled) {
      const nx = npc.x + dx
      const ny = npc.y + dy
      if (!mapIsWalkable(map, nx, ny, mapState.tiles)) continue
      if (nx === px && ny === py) continue
      if (mapState.enemies.some((e) => e.alive && e.x === nx && e.y === ny)) continue
      if (mapState.npcs.some((n) => n.id !== npc.id && n.x === nx && n.y === ny)) continue
      if (mapState.chests.some((c) => !c.opened && c.x === nx && c.y === ny)) continue
      npc.x = nx
      npc.y = ny
      break
    }
  }
}

export function performChallengeRoll(run, npcId) {
  const mapState = currentMapState(run)
  const npc = mapState.npcs.find((n) => n.id === npcId && n.role === 'challenger')
  if (!npc || npc.completed) {
    return { ok: false, reason: 'Défi déjà terminé ou introuvable.' }
  }
  const playerRoll = randomInt(1, 6) + randomInt(1, 6)
  const npcRoll = randomInt(1, 6) + randomInt(1, 6)
  const won = playerRoll > npcRoll
  npc.completed = true
  let gold = 0
  let xp = 0
  let penalty = 0
  // Le gain (or/XP) n'est PAS octroyé ici : il doit être récupéré explicitement via
  // claimChallengeReward() une fois l'animation de dés terminée côté UI, pour éviter
  // que la fenêtre de montée de niveau n'apparaisse avant même que le joueur ait vu
  // le résultat du lancer.
  if (won) {
    gold = randomInt(80, 200)
    xp = randomInt(100, 250)
    appendLog(run, `Défi remporté ! (${playerRoll} vs ${npcRoll}).`)
  } else {
    penalty = Math.min(run.player.gold, randomInt(20, 65))
    run.player.gold = Math.max(0, run.player.gold - penalty)
    appendLog(run, `Défi perdu. (${playerRoll} vs ${npcRoll}): −${penalty} or.`)
  }
  return { ok: true, won, playerRoll, npcRoll, gold, xp, penalty }
}

export function claimChallengeReward(run, gold, xp) {
  run.player.gold += gold
  grantXp(run, xp)
  appendLog(run, `Récompense du défi récupérée : +${gold} or, +${xp} XP.`)
  return { ok: true }
}

export function getWanderingMerchantStock(run, npcId) {
  const mapState = currentMapState(run)
  const npc = mapState.npcs.find((n) => n.id === npcId && n.role === 'wandering_merchant')
  if (!npc) return []
  if (!npc.stock) {
    // Rareté réellement aléatoire par emplacement (jamais mythique, légendaire rare).
    const merchantRarityWeights = [
      { value: 'uncommon', weight: 34 },
      { value: 'rare', weight: 38 },
      { value: 'epic', weight: 21 },
      { value: 'legendary', weight: 7 },
    ]
    npc.stock = Array.from({ length: 6 }, () => {
      const rarity = weightedChoice(merchantRarityWeights)
      const item = buildLootItem({ run, isBoss: false, forcedRarity: rarity })
      item.merchantPrice = Math.max(100, Math.floor((item.value ?? 50) * 2.2 + randomInt(20, 80)))
      item.soldOut = false
      return item
    })
    // Ajoute un Cœur brumeux en vente (prix entre 800 et 1200 or)
    npc.stock.push({
      id: uid('misty_heart_sale'),
      kind: 'material',
      name: 'Cœur brumeux',
      icon: '/assets/Icons/coeur_brumeux.png',
      description: 'Nécessaire pour la Transcendance vers le rang Mythique.',
      materialKey: 'misty_heart',
      quantity: 1,
      merchantPrice: randomInt(500, 800),
      soldOut: false,
    })
  }
  return npc.stock
}

export function buyWanderingItem(run, npcId, itemId) {
  const mapState = currentMapState(run)
  const npc = mapState.npcs.find((n) => n.id === npcId && n.role === 'wandering_merchant')
  if (!npc?.stock) return { ok: false, reason: 'Marchand introuvable.' }
  const item = npc.stock.find((i) => i.id === itemId)
  if (!item) return { ok: false, reason: 'Article introuvable.' }
  if (item.soldOut) return { ok: false, reason: 'Cet article a déjà été vendu.' }
  if (run.player.gold < item.merchantPrice) return { ok: false, reason: `Il faut ${item.merchantPrice} or pour cet article.` }
  run.player.gold -= item.merchantPrice
  item.soldOut = true
  if (item.materialKey) {
    addMaterial(run, item.materialKey, item.quantity ?? 1)
    appendLog(run, `Acheté ${item.name} au marchand pour ${item.merchantPrice} or.`)
    return { ok: true, item, isMaterial: true }
  }
  const itemCopy = { ...item }
  delete itemCopy.merchantPrice
  delete itemCopy.soldOut
  addInventoryItem(run, itemCopy)
  appendLog(run, `Acheté ${item.name} au marchand pour ${item.merchantPrice} or.`)
  return { ok: true, item }
}

// ─── Hub inter-niveaux ────────────────────────────────────────────────────────

export function enterHub(run, returnToMapId = null) {
  run.phase = 'hub'
  run.hubReturnMapId = returnToMapId ?? null
  const mapName = currentMap(run)?.name ?? 'zone inconnue'
  if (returnToMapId) {
    appendLog(run, `Campement. Prépare-toi avant de continuer.`)
  } else {
    appendLog(run, `Niveau terminé : ${mapName}. Vous vous reposez au campement.`)
  }
  return { ok: true, hub: true }
}

export function startNextLevel(run) {
  // Mode retour : l'joueur venait d'un portail secret → retour sur la map d'origine
  if (run.hubReturnMapId) {
    const targetMapId = run.hubReturnMapId
    const targetMap = MAPS[targetMapId]
    const originMapId = run.world.currentMapId
    run.hubReturnMapId = null
    run.phase = 'exploring'
    // Zone secrète : mémoriser l'origine pour que le portail de retour fonctionne
    if (targetMap?.isSecret || targetMap?.isSecretRoom) {
      run.world.returnMapId = originMapId
    }
    const targetState = ensureMapState(run, targetMapId)
    run.world.currentMapId = targetMapId
    run.world.playerPosition = { ...targetState.start }
    revealAround(run, targetMapId, targetState.start.x, targetState.start.y, 2)
    appendLog(run, `Arrivée dans ${targetMap?.name ?? targetMapId}.`)
    return { ok: true, mapId: targetMapId }
  }

  const nextIndex = (run.world.currentMapIndex ?? 0) + 1
  if (nextIndex >= MAP_ORDER.length) {
    run.victory = true
    run.gameOver = true
    appendLog(run, `Victoire : ${run.player.name} referme la faille d\'onyx.`)
    return { ok: true, ending: true }
  }
  const nextMapId = MAP_ORDER[nextIndex]
  run.world.currentMapIndex = nextIndex
  const nextState = ensureMapState(run, nextMapId)
  run.world.currentMapId = nextMapId
  const mapOrderIndex = MAP_ORDER.indexOf(nextMapId)
  if (mapOrderIndex >= 0) {
    run.world.currentMapIndex = mapOrderIndex
  }
  run.world.playerPosition = { ...nextState.start }
  run.phase = 'exploring'
  revealAround(run, nextMapId, nextState.start.x, nextState.start.y, 2)
  appendLog(run, `Arrivée dans ${MAPS[nextMapId].name}.`)
  return { ok: true, mapId: nextMapId }
}

export function nextLevelInfo(run) {
  if (run.hubReturnMapId) {
    const mapId = run.hubReturnMapId
    return { mapId, name: MAPS[mapId]?.name ?? mapId, isReturn: true }
  }
  const nextIndex = (run.world.currentMapIndex ?? 0) + 1
  if (nextIndex >= MAP_ORDER.length) return null
  const mapId = MAP_ORDER[nextIndex]
  return { mapId, name: MAPS[mapId]?.name ?? mapId, isReturn: false }
}

export function navigateToMap(run, mapId) {
  return transitionToMap(run, mapId)
}

// ─── Nom affiché avec niveau d'amélioration ───────────────────────────────────

export function itemDisplayName(item) {
  if (!item) return ''
  const level = item.enhancementLevel ?? 0
  return level > 0 ? `${item.name} +${level}` : item.name
}

// ─── Forge d'amélioration ─────────────────────────────────────────────────────

function findItemAnywhere(run, itemId) {
  const inv = run.player.inventory.find((i) => i.id === itemId)
  if (inv) return inv
  for (const slot of ['weapon', 'armor', 'trinket']) {
    if (run.player.equipment[slot]?.id === itemId) return run.player.equipment[slot]
  }
  return null
}

function applyEnhancementStats(item) {
  const level = item.enhancementLevel ?? 0
  const baseAtk = item.baseAttack ?? item.attack
  const baseDef = item.baseDefense ?? item.defense
  const atkBonus = item.slot === 'weapon' ? 2 : item.slot === 'trinket' ? 1 : 0
  const defBonus = item.slot === 'armor' ? 2 : item.slot === 'trinket' ? 1 : 0
  item.attack = baseAtk + atkBonus * level
  item.defense = baseDef + defBonus * level
}

function upgradeCostsForItem(item) {
  const rarity = item.rarity ?? 'common'
  return UPGRADE_COSTS_BY_RARITY[rarity] ?? UPGRADE_COSTS
}

// L'ultime palier (légendaire +4 -> +5) est le plus risqué à sécuriser : il faut
// 2 Éclats de stabilité au lieu d'un seul pour s'en protéger. Tous les autres cas
// (y compris mythique, dont la marge de progression est ailleurs) n'en coûtent qu'1.
function stabilityShardCostFor(item, currentLevel) {
  return item.rarity === 'legendary' && currentLevel === 4 ? 2 : 1
}

export function upgradeItem(run, itemId, useStabilityShard = false) {
  const item = findItemAnywhere(run, itemId)
  if (!item) return { ok: false, reason: 'Objet introuvable.' }
  if (item.kind !== 'equipment') return { ok: false, reason: 'Seuls les équipements peuvent être améliorés.' }
  const currentLevel = item.enhancementLevel ?? 0
  if (currentLevel >= 5) return { ok: false, reason: 'Amélioration maximale (+5) atteinte.' }

  const wantsShard = Boolean(useStabilityShard)
  const shardCost = stabilityShardCostFor(item, currentLevel)
  if (wantsShard && (run.player.materials.stability_shard ?? 0) < shardCost) {
    return { ok: false, reason: `${shardCost}× Éclat de stabilité requis pour protéger cette tentative.` }
  }

  const cost = upgradeCostsForItem(item)[currentLevel]
  if (run.player.gold < cost.goldCost) {
    return { ok: false, reason: `Or insuffisant — ${cost.goldCost} requis.` }
  }
  for (const [mat, qty] of Object.entries(cost.materials)) {
    if ((run.player.materials[mat] ?? 0) < qty) {
      return { ok: false, reason: `${qty}× ${MATERIAL_LABELS[mat]} requis.` }
    }
  }

  run.player.gold -= cost.goldCost
  for (const [mat, qty] of Object.entries(cost.materials)) {
    run.player.materials[mat] -= qty
  }

  if (currentLevel === 0) {
    item.baseAttack = item.attack
    item.baseDefense = item.defense
  }

  if (chance(cost.successRate)) {
    item.enhancementLevel = currentLevel + 1
    applyEnhancementStats(item)
    const name = itemDisplayName(item)
    appendLog(run, `Forge réussie ! ${name} obtenu.`)
    return { ok: true, success: true, newLevel: item.enhancementLevel }
  } else if (wantsShard) {
    run.player.materials.stability_shard -= shardCost
    applyEnhancementStats(item)
    const name = itemDisplayName(item)
    appendLog(run, `Forge échouée — ${name} protégé par ${shardCost}× Éclat de stabilité (pas de rétrogradation).`)
    return { ok: true, success: false, protectedByShard: true, newLevel: item.enhancementLevel }
  } else {
    item.enhancementLevel = Math.max(0, currentLevel - 1)
    applyEnhancementStats(item)
    const name = itemDisplayName(item)
    appendLog(run, `Forge échouée — rétrogradé à ${name}.`)
    return { ok: true, success: false, newLevel: item.enhancementLevel }
  }
}

// Taux de réussite de la transcendance de rareté, par palier de destination.
// Passer mythique reste un vrai choix risqué : échec = matériaux perdus, rang conservé.
const RARITY_TRANSCENDENCE_SUCCESS_RATE = {
  uncommon: 1.00,
  rare: 1.00,
  epic: 0.90,
  legendary: 0.70,
  mythic: 0.50,
}

function rarityUpgradeCost(item) {
  const currentRarityIndex = RARITY_ORDER.indexOf(item.rarity ?? 'common')
  const nextRarityId = RARITY_ORDER[currentRarityIndex + 1]
  const successRate = RARITY_TRANSCENDENCE_SUCCESS_RATE[nextRarityId] ?? 1.00
  if (nextRarityId === 'mythic') {
    return { goldCost: 0, materials: { misty_heart: 1, boss_shard: 2 }, successRate }
  }
  if (nextRarityId === 'legendary') {
    return { goldCost: 0, materials: { boss_shard: 1 }, successRate }
  }
  return { goldCost: 0, materials: {}, successRate }
}

export function upgradeItemRarity(run, itemId) {
  const item = findItemAnywhere(run, itemId)
  if (!item) return { ok: false, reason: 'Objet introuvable.' }
  if (item.kind !== 'equipment') return { ok: false, reason: 'Seuls les équipements peuvent être élevés en rareté.' }
  if ((item.enhancementLevel ?? 0) < 5) return { ok: false, reason: "L'objet doit être +5 pour élever sa rareté." }

  const currentRarityIndex = RARITY_ORDER.indexOf(item.rarity)
  if (currentRarityIndex < 0 || currentRarityIndex >= RARITY_ORDER.length - 1) {
    return { ok: false, reason: 'Rareté maximale atteinte (Mythique).' }
  }

  const cost = rarityUpgradeCost(item)
  if (run.player.gold < cost.goldCost) {
    return { ok: false, reason: `Or insuffisant — ${cost.goldCost} requis.` }
  }
  for (const [mat, qty] of Object.entries(cost.materials)) {
    if ((run.player.materials[mat] ?? 0) < qty) {
      return { ok: false, reason: `${qty}× ${MATERIAL_LABELS[mat]} requis.` }
    }
  }

  run.player.gold -= cost.goldCost
  for (const [mat, qty] of Object.entries(cost.materials)) {
    run.player.materials[mat] = (run.player.materials[mat] ?? 0) - qty
  }

  const newRarityId = RARITY_ORDER[currentRarityIndex + 1]

  if (!chance(cost.successRate)) {
    appendLog(run, `Transcendance échouée — ${itemDisplayName(item)} reste ${RARITIES[item.rarity].label} (matériaux perdus).`)
    return { ok: true, success: false, newRarity: item.rarity }
  }

  const oldRarity = RARITIES[item.rarity]
  const newRarity = RARITIES[newRarityId]
  item.rarity = newRarityId
  const rerolled = rollEquipmentPrimaryStats(item.slot, newRarityId, item.quality ?? 'good')
  item.baseAttack = rerolled.attack
  item.baseDefense = rerolled.defense
  item.enhancementLevel = 0
  applyEnhancementStats(item)
  item.bonusStats = null
  item.affixes = []
  applyRandomBonusesToItem(run, item)
  item.value = Math.round((item.value ?? 0) * newRarity.valueMultiplier / (oldRarity.valueMultiplier || 1))
  const capBefore = item.sockets?.length ?? 0
  const capAfter = SOCKET_CAP_BY_RARITY[newRarityId] ?? capBefore
  if (capAfter > capBefore) {
    item.sockets = [...(item.sockets ?? []), ...new Array(capAfter - capBefore).fill(null)]
  }
  appendLog(run, `Transcendance réussie ! ${itemDisplayName(item)} est maintenant ${newRarity.label}.`)
  return { ok: true, success: true, newRarity: newRarityId, affixes: item.affixes ?? [] }
}

export function upgradeCostInfo(run, itemId) {
  const item = findItemAnywhere(run, itemId)
  if (!item || item.kind !== 'equipment') return null
  const level = item.enhancementLevel ?? 0
  if (level >= 5) return null
  const cost = upgradeCostsForItem(item)[level]
  const canAfford = run.player.gold >= cost.goldCost &&
    Object.entries(cost.materials).every(([mat, qty]) => (run.player.materials[mat] ?? 0) >= qty)
  return { ...cost, canAfford }
}

export function rarityUpgradeCostInfo(run, itemId) {
  const item = findItemAnywhere(run, itemId)
  if (!item || item.kind !== 'equipment') return null
  if ((item.enhancementLevel ?? 0) < 5) return null
  const currentRarityIndex = RARITY_ORDER.indexOf(item.rarity)
  if (currentRarityIndex >= RARITY_ORDER.length - 1) return null
  const nextRarityId = RARITY_ORDER[currentRarityIndex + 1]
  const cost = rarityUpgradeCost(item)
  const canAfford = run.player.gold >= cost.goldCost &&
    Object.entries(cost.materials).every(([mat, qty]) => (run.player.materials[mat] ?? 0) >= qty)
  return { ...cost, canAfford, nextRarity: nextRarityId, requiresMistyHeart: nextRarityId === 'mythic' }
}

// ─── Pierres d'esprit (emplacements/sockets) ──────────────────────────────────
// Les pierres sont de vrais objets d'inventaire (kind: 'spirit_stone'), classées
// par rareté ; chacune roule ses propres bonus aléatoires à sa création. Les
// sertir peut les briser (perte définitive), avec un risque qui augmente avec
// leur rareté et le mode de difficulté (voir SPIRIT_STONE_SOCKET_SUCCESS_RATE).

function stoneValueForRarity(rarity) {
  const rarityData = RARITIES[rarity]
  return Math.round(40 * (rarityData?.valueMultiplier ?? 1))
}

function rollSpiritStoneBonuses(run, rarity) {
  const count = SPIRIT_STONE_BONUS_COUNT_BY_RARITY[rarity] ?? 1
  const rarityIndex = Math.max(0, RARITY_ORDER.indexOf(rarity))
  const scale = 1 + rarityIndex * 0.15 + (run.player.level ?? 1) * 0.01
  const bonusStats = {}
  const affixes = []
  const pool = EQUIPMENT_BONUS_POOL.map((entry) => ({ ...entry }))
  for (let i = 0; i < count; i += 1) {
    if (!pool.length) break
    const pickedId = weightedChoice(pool.map((entry) => ({ value: entry.id, weight: entry.weight ?? 1 })))
    const index = pool.findIndex((entry) => entry.id === pickedId)
    if (index < 0) continue
    const picked = pool.splice(index, 1)[0]
    const rolled = picked.min + Math.random() * (picked.max - picked.min)
    const value = picked.percent
      ? Number.parseFloat((rolled * scale).toFixed(3))
      : Math.max(1, Math.round(rolled * scale))
    bonusStats[picked.key] = (bonusStats[picked.key] ?? 0) + value
    affixes.push(picked.percent ? `+${Math.round(value * 100)}% ${picked.label}` : `+${value} ${picked.label}`)
  }
  return { bonusStats, affixes }
}

export function buildSpiritStone(run, rarity) {
  const rarityData = RARITIES[rarity] ?? RARITIES.common
  const { bonusStats, affixes } = rollSpiritStoneBonuses(run, rarity)
  return {
    id: uid('spirit_stone'),
    kind: 'spirit_stone',
    name: `Pierre d'esprit ${rarityData.label.toLowerCase()}`,
    rarity,
    bonusStats,
    affixes,
    identified: false,
    icon: SPIRIT_STONE_ICON,
    value: stoneValueForRarity(rarity),
  }
}

export function identifyXpCostForStone(stone) {
  return IDENTIFY_XP_COST_BY_RARITY[stone?.rarity] ?? IDENTIFY_XP_COST_BY_RARITY.common
}

// Révèle les bonus réels d'une pierre non identifiée contre de l'XP. Garde-fou :
// ne fait jamais redescendre le joueur de niveau (on ne ponctionne que l'XP
// courante du palier, jamais en dessous de 0), et refuse si l'XP est insuffisante.
export function identifySpiritStone(run, stoneItemId) {
  const stone = run.player.inventory.find((i) => i.id === stoneItemId && i.kind === 'spirit_stone')
  if (!stone) {
    return { ok: false, reason: 'Pierre introuvable.' }
  }
  if (stone.identified) {
    return { ok: false, reason: 'Cette pierre est déjà identifiée.' }
  }
  const cost = identifyXpCostForStone(stone)
  if (run.player.xp < cost) {
    return { ok: false, reason: `Expérience insuffisante (${cost} XP requis) — le PNJ refuse.` }
  }
  run.player.xp -= cost
  stone.identified = true
  appendLog(run, `${stone.name} identifiée contre ${cost} XP.`)
  return { ok: true, stone, cost }
}

const LUNAR_SHRINE_BLESSING = {
  maxHpFlat: 45,
  attackFlat: 6,
  defenseFlat: 6,
  critChanceFlat: 0.02,
}

export function activateLunarShrine(run) {
  if (run.player.lunarBlessingReceived) {
    return { ok: false, reason: 'L\'autel est apaisé. Sa lumière ne répondra plus.' }
  }
  run.player.shrineBlessing ??= {}
  addBonuses(run.player.shrineBlessing, LUNAR_SHRINE_BLESSING)
  run.player.lunarBlessingReceived = true
  appendLog(run, 'L\'autel lunaire répond à votre présence : une bénédiction permanente vous imprègne.')
  return { ok: true, blessing: LUNAR_SHRINE_BLESSING }
}

function socketSuccessRateFor(run, stoneRarity) {
  const difficultyId = run.metadata?.difficulty ?? 'normal'
  const table = SPIRIT_STONE_SOCKET_SUCCESS_RATE[stoneRarity] ?? SPIRIT_STONE_SOCKET_SUCCESS_RATE.common
  return table[difficultyId] ?? table.normal
}

export function socketInfoForItem(run, itemId) {
  const item = findItemAnywhere(run, itemId)
  if (!item || item.kind !== 'equipment') return null
  const cap = SOCKET_CAP_BY_RARITY[item.rarity] ?? 0
  const sockets = item.sockets ?? []
  return {
    sockets: sockets.map((socket) => (socket ? { ...socket } : null)),
    cap,
    canAddSocket: sockets.length < cap && (run.player.materials.spirit_chisel ?? 0) >= 1,
    chiselStock: run.player.materials.spirit_chisel ?? 0,
    availableStones: run.player.inventory
      .filter((i) => i.kind === 'spirit_stone')
      .map((stone) => ({ ...stone, successRate: socketSuccessRateFor(run, stone.rarity) })),
  }
}

export function insertSpiritStone(run, itemId, socketIndex, stoneItemId) {
  const item = findItemAnywhere(run, itemId)
  if (!item || item.kind !== 'equipment') return { ok: false, reason: 'Objet introuvable.' }
  const sockets = item.sockets ?? []
  if (socketIndex < 0 || socketIndex >= sockets.length) {
    return { ok: false, reason: 'Emplacement invalide.' }
  }
  if (sockets[socketIndex]) {
    return { ok: false, reason: 'Emplacement déjà occupé, retire la pierre en place avant.' }
  }
  const stoneIndex = run.player.inventory.findIndex((i) => i.id === stoneItemId && i.kind === 'spirit_stone')
  if (stoneIndex < 0) {
    return { ok: false, reason: 'Pierre introuvable.' }
  }
  const stone = run.player.inventory[stoneIndex]
  const successRate = socketSuccessRateFor(run, stone.rarity)
  run.player.inventory.splice(stoneIndex, 1)

  if (!chance(successRate)) {
    appendLog(run, `${stone.name} s'est brisée en tentant de la sertir sur ${itemDisplayName(item)}.`)
    return { ok: true, success: false, broken: true, stoneName: stone.name }
  }

  sockets[socketIndex] = { rarity: stone.rarity, bonusStats: stone.bonusStats, affixes: stone.affixes, name: stone.name }
  item.sockets = sockets
  appendLog(run, `${stone.name} sertie sur ${itemDisplayName(item)}.`)
  return { ok: true, success: true }
}

export function removeSpiritStone(run, itemId, socketIndex) {
  const item = findItemAnywhere(run, itemId)
  if (!item || item.kind !== 'equipment') return { ok: false, reason: 'Objet introuvable.' }
  const sockets = item.sockets ?? []
  if (!sockets[socketIndex]) {
    return { ok: false, reason: 'Emplacement déjà vide.' }
  }
  sockets[socketIndex] = null
  item.sockets = sockets
  appendLog(run, `Pierre d'esprit retirée de ${itemDisplayName(item)} (perdue).`)
  return { ok: true }
}

export function addSocketToItem(run, itemId) {
  const item = findItemAnywhere(run, itemId)
  if (!item || item.kind !== 'equipment') return { ok: false, reason: 'Objet introuvable.' }
  const cap = SOCKET_CAP_BY_RARITY[item.rarity] ?? 0
  const sockets = item.sockets ?? []
  if (sockets.length >= cap) {
    return { ok: false, reason: `Plafond d'emplacements atteint pour cette rareté (${cap}).` }
  }
  if ((run.player.materials.spirit_chisel ?? 0) < 1) {
    return { ok: false, reason: 'Aucun Ciseau des esprits en stock.' }
  }
  run.player.materials.spirit_chisel -= 1
  item.sockets = [...sockets, null]
  appendLog(run, `Nouvel emplacement de pierre d'esprit ouvert sur ${itemDisplayName(item)}.`)
  return { ok: true }
}
