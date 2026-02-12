import {
  BOSS_DROP_SHARD_CHANCE,
  CLASS_BY_ID,
  CONSUMABLES_SHOP,
  DIFFICULTY_CONFIG,
  EQUIPMENT_BONUS_POOL,
  ENEMY_TEMPLATES,
  LOOT_BASES,
  MAPS,
  MAP_ORDER,
  MATERIAL_FROM_ENEMY,
  MATERIAL_LABELS,
  RARITY_BONUS_RULES,
  RARITIES,
  RARITY_ORDER,
  RECIPES,
  RESOURCE_TABLE,
  mapIsWalkable,
} from './data'
import { chance, clamp, deepClone, randomChoice, randomInt, toKey, uid, weightedChoice } from './utils'

const MAX_LOG_ENTRIES = 120
const MAX_EVENT_LENGTH = 170
const CHEST_ICON = '/assets/Environment/Props/Static/Resources.png'
const COMBAT_MOVE_AP_COST = 2
const COMBAT_NORMAL_ATTACK_COST = 2
const MAP_LAYOUT_VARIANTS = ['none', 'flip_x', 'flip_y', 'flip_xy']

const SLOT_DEFAULT_ICON = {
  weapon: '/assets/Weapons/Wood/Wood.png',
  armor: '/assets/Weapons/Hands/Hands.png',
  trinket: '/assets/Weapons/Bone/Bone.png',
}

const STARTER_WEAPON_BY_CLASS = {
  warrior: {
    name: 'Epee de garnison',
    icon: '/assets/Weapons/Hands/Hands.png',
    weaponType: 'melee',
    rangeMin: 1,
    rangeMax: 1,
    attack: 5,
    defense: 2,
  },
  assassin: {
    name: 'Dague de nuit',
    icon: '/assets/Weapons/Bone/Bone.png',
    weaponType: 'melee',
    rangeMin: 1,
    rangeMax: 1,
    attack: 6,
    defense: 0,
  },
  archer: {
    name: 'Arc de frêne',
    icon: '/assets/Weapons/Wood/Wood.png',
    weaponType: 'bow',
    rangeMin: 2,
    rangeMax: 3,
    attack: 4,
    defense: 1,
  },
  mage: {
    name: 'Baton runique',
    icon: '/assets/Weapons/Wood/Wood.png',
    weaponType: 'staff',
    rangeMin: 2,
    rangeMax: 3,
    attack: 4,
    defense: 1,
  },
  druid: {
    name: 'Baton de seve',
    icon: '/assets/Weapons/Wood/Wood.png',
    weaponType: 'staff',
    rangeMin: 2,
    rangeMax: 3,
    attack: 4,
    defense: 1,
  },
  necromancer: {
    name: 'Baton d os',
    icon: '/assets/Weapons/Bone/Bone.png',
    weaponType: 'staff',
    rangeMin: 2,
    rangeMax: 3,
    attack: 4,
    defense: 1,
  },
  bard: {
    name: 'Luth ferrugineux',
    icon: '/assets/Weapons/Wood/Wood.png',
    weaponType: 'staff',
    rangeMin: 2,
    rangeMax: 3,
    attack: 4,
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
  return bag
}

function currentMapById(mapId) {
  return MAPS[mapId] ?? null
}

function mapEntries() {
  return Object.entries(MAPS)
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

function placeRandomizedEntities(entities, pool, blockedSet, startCell, minDistance, mapper) {
  return entities.map((entry) => {
    const randomCell = takeCellFromPool(pool, blockedSet, startCell, minDistance)
    const cell = randomCell ?? { x: entry.x, y: entry.y }
    return mapper(entry, cell)
  })
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

function createMapState(mapId) {
  const map = currentMapById(mapId)
  const layoutVariant = randomChoice(MAP_LAYOUT_VARIANTS) ?? 'none'
  const tiles = transformTiles(map.tiles, layoutVariant, map.width, map.height)
  const transformedStart = transformPoint(map.start, layoutVariant, map.width, map.height)
  const transformedExit = transformPoint(map.exit, layoutVariant, map.width, map.height)
  const transformedSecret = transformPoint(map.secretPortal, layoutVariant, map.width, map.height)
  const transformedBack = transformPoint(map.backPortal, layoutVariant, map.width, map.height)

  const blocked = new Set()
  const start = findNearestWalkable(map, transformedStart.x, transformedStart.y, blocked, tiles)
  blocked.add(toKey(start.x, start.y))

  const exitCell = findNearestWalkable(map, transformedExit.x, transformedExit.y, blocked, tiles)
  const exit = {
    ...map.exit,
    x: exitCell.x,
    y: exitCell.y,
  }
  blocked.add(toKey(exit.x, exit.y))

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

  let backPortal = null
  if (map.backPortal) {
    const backCell = findNearestWalkable(map, transformedBack.x, transformedBack.y, blocked, tiles)
    backPortal = {
      ...map.backPortal,
      x: backCell.x,
      y: backCell.y,
    }
    blocked.add(toKey(backPortal.x, backPortal.y))
  }

  const pool = walkablePool(map, tiles, blocked)

  const npcs = placeRandomizedEntities(map.npcs ?? [], pool, blocked, start, 1, (npc, cell) => ({
    ...npc,
    x: cell.x,
    y: cell.y,
  }))

  const resources = placeRandomizedEntities(map.resources ?? [], pool, blocked, start, 2, (resource, cell) => ({
    ...resource,
    x: cell.x,
    y: cell.y,
  }))

  const chests = placeRandomizedEntities(map.chests ?? [], pool, blocked, start, 3, (chest, cell) => ({
    ...chest,
    x: cell.x,
    y: cell.y,
    opened: false,
    icon: CHEST_ICON,
  }))

  const enemies = placeRandomizedEntities(map.enemies ?? [], pool, blocked, start, 3, (enemySpawn, cell) =>
    createEnemyInstance(enemySpawn, cell, false),
  )

  const randomBossCell = takeCellFromPool(pool, blocked, start, 6)
  const transformedBoss = transformPoint(map.boss, layoutVariant, map.width, map.height)
  const bossCell =
    randomBossCell ?? findNearestWalkable(map, transformedBoss.x, transformedBoss.y, blocked, tiles)
  blocked.add(toKey(bossCell.x, bossCell.y))
  enemies.push(createEnemyInstance(map.boss, bossCell, true))

  return {
    layoutVariant,
    tiles,
    start,
    exit,
    secretPortal,
    backPortal,
    npcs,
    discovered: [],
    enemies,
    resources,
    chests,
    solvedRiddles: [],
    failedRiddles: [],
    selectedRiddles: {},
    bossDefeated: false,
    secretPortalRevealed: false,
  }
}

function starterWeaponForClass(classId) {
  return STARTER_WEAPON_BY_CLASS[classId] ?? STARTER_WEAPON_BY_CLASS.warrior
}

function createStarterInventory(selectedClass) {
  const starter = starterWeaponForClass(selectedClass.id)
  return [
    {
      id: uid('consumable'),
      kind: 'consumable',
      name: 'Potion majeure',
      effect: 'heal_80',
      quantity: 2,
      rarity: 'common',
      value: 24,
      icon: '/assets/Weapons/Hands/Hands.png',
    },
    {
      id: uid('consumable'),
      kind: 'consumable',
      name: 'Elixir de mana',
      effect: 'mana_60',
      quantity: 1,
      rarity: 'common',
      value: 22,
      icon: '/assets/Weapons/Wood/Wood.png',
    },
    {
      id: uid('equipment'),
      kind: 'equipment',
      slot: 'weapon',
      name: starter.name,
      rarity: 'common',
      attack: starter.attack,
      defense: starter.defense,
      value: 45,
      icon: starter.icon,
      weaponType: starter.weaponType,
      rangeMin: starter.rangeMin,
      rangeMax: starter.rangeMax,
    },
  ]
}

export function createRun({ name, classId, difficulty }) {
  const selectedClass = classById(classId)
  const firstMapId = MAP_ORDER[0]
  const maps = Object.fromEntries(mapEntries().map(([mapId]) => [mapId, createMapState(mapId)]))
  const firstStart = maps[firstMapId]?.start ?? MAPS[firstMapId].start

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
      inventory: createStarterInventory(selectedClass),
      equipment: {
        weapon: null,
        armor: null,
        trinket: null,
      },
      materials: createMaterialBag(),
      deaths: 0,
    },
    world: {
      currentMapId: firstMapId,
      returnMapId: null,
      playerPosition: { ...firstStart },
      maps,
    },
    combat: null,
    levelUpModal: null,
    eventLog: [],
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
    run.world.maps[mapId] = createMapState(mapId)
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
  run.player.deaths ??= 0
  run.player.nextXp ??= xpForLevel(run.player.level || 1)
  run.player.preparedBuffs ??= []
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
  run.world.currentMapId ??= MAP_ORDER[0]
  run.world.playerPosition ??= { ...MAPS[run.world.currentMapId].start }
  run.world.returnMapId ??= null
  run.combat ??= null
  run.gameOver ??= false
  run.hardcoreDeath ??= false
  run.victory ??= false

  ensurePlayerState(run)

  for (const [mapId] of mapEntries()) {
    const state = ensureMapState(run, mapId)
    state.tiles ??= [...MAPS[mapId].tiles]
    state.start ??= { ...MAPS[mapId].start }
    state.exit ??= { ...MAPS[mapId].exit }
    state.secretPortal ??= MAPS[mapId].secretPortal ? { ...MAPS[mapId].secretPortal } : null
    state.backPortal ??= MAPS[mapId].backPortal ? { ...MAPS[mapId].backPortal } : null
    if (state.exit && MAPS[mapId].exit) {
      state.exit.targetMapId = MAPS[mapId].exit.targetMapId
    }
    if (state.secretPortal && MAPS[mapId].secretPortal) {
      state.secretPortal.targetMapId = MAPS[mapId].secretPortal.targetMapId
    }
    if (state.backPortal && MAPS[mapId].backPortal) {
      state.backPortal.targetMapId = MAPS[mapId].backPortal.targetMapId
    }
    state.npcs ??= (MAPS[mapId].npcs ?? []).map((npc) => ({ ...npc }))
    state.discovered ??= []
    state.resources ??= []
    state.chests ??= []
    state.enemies ??= []
    state.solvedRiddles ??= []
    state.failedRiddles ??= []
    state.selectedRiddles ??= {}
    state.bossDefeated ??= false
    state.secretPortalRevealed ??= false
  }

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
  }
  return out
}

function weaponRange(run) {
  const weapon = run.player.equipment.weapon
  if (!weapon) {
    return { min: 1, max: 1 }
  }
  return {
    min: Math.max(1, weapon.rangeMin ?? 1),
    max: Math.max(1, weapon.rangeMax ?? 1),
  }
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
    dotPercent: 0,
    manaRegenFlat: 0,
    lifeRegenFlat: 0,
    healingDonePercent: 0,
    healingTakenPercent: 0,
    gatherBonus: 0,
    bossDamagePercent: 0,
    highHpDamagePercent: 0,
    lowHpDefensePercent: 0,
    highManaDamagePercent: 0,
    longRangeDamagePercent: 0,
    lifeStealPercent: 0,
    rangeFlat: 0,
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
  stats.dotPercent += allBonuses.dotPercent ?? 0
  stats.manaRegenFlat += allBonuses.manaRegenFlat ?? 0
  stats.lifeRegenFlat += allBonuses.lifeRegenFlat ?? 0
  stats.healingDonePercent += allBonuses.healingDonePercent ?? 0
  stats.healingTakenPercent += allBonuses.healingTakenPercent ?? 0
  stats.gatherBonus += allBonuses.gatherBonus ?? 0
  stats.bossDamagePercent += allBonuses.bossDamagePercent ?? 0
  stats.highHpDamagePercent += allBonuses.highHpDamagePercent ?? 0
  stats.lowHpDefensePercent += allBonuses.lowHpDefensePercent ?? 0
  stats.highManaDamagePercent += allBonuses.highManaDamagePercent ?? 0
  stats.longRangeDamagePercent += allBonuses.longRangeDamagePercent ?? 0
  stats.lifeStealPercent += allBonuses.lifeStealPercent ?? 0
  stats.rangeFlat += allBonuses.rangeFlat ?? 0

  if (run.player.hp / Math.max(1, stats.maxHp) > 0.7) {
    stats.damagePercent += stats.highHpDamagePercent
  }
  if (run.player.hp / Math.max(1, stats.maxHp) < 0.3) {
    stats.defense = Math.floor(stats.defense * (1 + stats.lowHpDefensePercent))
  }
  if (run.player.mana / Math.max(1, stats.maxMana) > 0.5) {
    stats.damagePercent += stats.highManaDamagePercent
  }

  const weapon = weaponRange(run)
  stats.weaponRangeMin = weapon.min
  stats.weaponRangeMax = weapon.max + stats.rangeFlat

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
    return { ok: false, reason: 'Passif deja debloque.' }
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

export function dismissLevelUpModal(run) {
  run.levelUpModal = null
}

export function currentMap(run) {
  return currentMapById(run.world.currentMapId)
}

export function currentMapState(run) {
  return ensureMapState(run, run.world.currentMapId)
}

export function isTileDiscovered(run, mapId, x, y) {
  return ensureMapState(run, mapId).discovered.includes(toKey(x, y))
}

export function revealAround(run, mapId, x, y, radius = 2) {
  const map = currentMapById(mapId)
  const mapState = ensureMapState(run, mapId)
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

function chestAtPosition(run, x, y, mapId = run.world.currentMapId) {
  return ensureMapState(run, mapId).chests.find((chest) => !chest.opened && chest.x === x && chest.y === y) ?? null
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
    return { ok: false, reason: 'Aucune ressource a proximite.' }
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
function rarityWeights(isBoss) {
  if (isBoss) {
    return [
      { value: 'common', weight: 20 },
      { value: 'uncommon', weight: 20 },
      { value: 'rare', weight: 20 },
      { value: 'epic', weight: 16 },
      { value: 'legendary', weight: 16 },
      { value: 'mythic', weight: 8 },
    ]
  }
  return [
    { value: 'common', weight: 56 },
    { value: 'uncommon', weight: 23 },
    { value: 'rare', weight: 11 },
    { value: 'epic', weight: 6 },
    { value: 'legendary', weight: 4 },
    { value: 'mythic', weight: 0 },
  ]
}

function rarityRoll({ isBoss, bias }) {
  const base = rarityWeights(isBoss).map((entry) => ({ ...entry }))
  if (bias && RARITY_ORDER.includes(bias)) {
    const index = RARITY_ORDER.indexOf(bias)
    base.forEach((entry, idx) => {
      if (idx >= index) {
        entry.weight += isBoss ? 4 : 2
      }
      if (idx < index - 1) {
        entry.weight = Math.max(0, entry.weight - 3)
      }
    })
  }
  const rolled = weightedChoice(base)
  if (!isBoss && rolled === 'mythic') {
    return 'legendary'
  }
  return rolled ?? 'common'
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
  return gained
}

function lootBaseScore(base) {
  const attack = base.attack ?? 0
  const defense = base.defense ?? 0
  const rangedTax = base.weaponType && base.weaponType !== 'melee' ? 0.85 : 1
  return attack * rangedTax + defense * 0.8
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
    const rarityScale = rarity === 'mythic' ? 1.28 : rarity === 'legendary' ? 1.15 : 1
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

function buildLootItem({ run, isBoss, sourceName = 'Relique', rarityBias = null }) {
  const slot = weightedChoice([
    { value: 'weapon', weight: 44 },
    { value: 'armor', weight: 33 },
    { value: 'trinket', weight: 23 },
  ])

  const rarity = rarityRoll({ isBoss, bias: rarityBias })
  const base = pickLootBase(slot, rarity) ?? randomChoice(LOOT_BASES[slot])
  const difficulty = difficultyFor(run)
  const rarityData = RARITIES[rarity]
  const scale = 1 + run.player.level * 0.045
  const multiplier = rarityData.powerMultiplier * scale * difficulty.lootMultiplier

  const item = {
    id: uid('loot'),
    kind: 'equipment',
    slot,
    name: base.name,
    rarity,
    attack: Math.max(0, Math.floor(base.attack * multiplier)),
    defense: Math.max(0, Math.floor(base.defense * multiplier)),
    value: Math.max(1, Math.floor(base.value * rarityData.valueMultiplier * scale)),
    icon: base.icon ?? SLOT_DEFAULT_ICON[slot],
  }

  if (slot === 'weapon') {
    item.weaponType = base.weaponType ?? 'melee'
    item.rangeMin = base.rangeMin ?? (item.weaponType === 'melee' ? 1 : 2)
    item.rangeMax = base.rangeMax ?? (item.weaponType === 'melee' ? 1 : 3)
  }

  if (isBoss && rarity === 'mythic') {
    item.name = `Relique mythique: ${sourceName}`
    item.attack += 5
    item.defense += 5
    item.value += 420
  }

  return applyRandomBonusesToItem(run, item)
}

export function openNearbyChest(run) {
  const chest = nearbyChest(run)
  if (!chest) {
    return { ok: false, reason: 'Aucun coffre a proximite.' }
  }

  chest.opened = true
  const map = currentMap(run)
  const lootCount = map.isSecret ? 2 : 1
  const loots = Array.from({ length: lootCount }, () =>
    buildLootItem({ run, isBoss: false, sourceName: 'Coffre', rarityBias: chest.rarityBias ?? null }),
  )
  for (const item of loots) {
    addInventoryItem(run, item)
  }

  const gold = randomInt(25, 75)
  run.player.gold += gold
  const chestMaterial = randomChoice(['ore', 'wood', 'resin', 'herb', 'obsidian_fragment'])
  addMaterial(run, chestMaterial, randomInt(1, 3))

  appendLog(
    run,
    `Coffre ouvert: +${gold} or, +${MATERIAL_LABELS[chestMaterial]}, loot ${loots.map((item) => item.name).join(', ')}.`,
  )
  return { ok: true, chest, loots }
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

function applyDifficultyToEnemy(template, difficulty) {
  const tactical = difficulty.enemyTacticsMultiplier ?? 1
  return {
    maxHp: Math.floor(template.maxHp * difficulty.enemyHpMultiplier),
    maxMana: template.maxMana,
    attack: Math.floor(template.attack * difficulty.enemyDamageMultiplier),
    defense: Math.floor(template.defense * difficulty.enemyArmorMultiplier),
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

  const template = enemyById(enemy.templateId)
  const difficulty = difficultyFor(run)
  const xp = Math.floor((template?.xpReward ?? 50) * difficulty.xpMultiplier)
  const gold = Math.floor((template?.goldReward ?? 20) * difficulty.lootMultiplier)

  run.player.gold += gold
  grantXp(run, xp)

  for (const drop of enemyMaterialDrops(enemy)) {
    addMaterial(run, drop.material, drop.quantity)
  }

  const lootCount = enemy.isBoss ? 2 : 1
  const loots = Array.from({ length: lootCount }, () =>
    buildLootItem({ run, isBoss: enemy.isBoss, sourceName: template?.name ?? 'Boss' }),
  )
  loots.forEach((item) => addInventoryItem(run, item))

  appendLog(
    run,
    `${template?.name ?? 'Ennemi'} vaincu: +${xp} XP, +${gold} or, loot ${loots.map((item) => `${RARITIES[item.rarity].label} ${item.name}`).join(', ')}.`,
  )

  if (enemy.isBoss) {
    mapState.bossDefeated = true
    appendLog(run, `Boss de ${currentMap(run).name} vaincu. La sortie est desormais ouverte.`)
    const secretPortal = mapState.secretPortal
    if (secretPortal && !mapState.secretPortalRevealed && chance(secretPortal.revealChance)) {
      mapState.secretPortalRevealed = true
      appendLog(run, `Un signal secret apparait vers (${secretPortal.x},${secretPortal.y}).`)
    }
  }
}

function transitionToMap(run, targetMapId) {
  if (targetMapId === 'ending') {
    run.victory = true
    run.gameOver = true
    appendLog(run, `Victoire: ${run.player.name} referme la faille d onyx.`)
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
  if (nextMap.isSecret && !leavingMap.isSecret) {
    run.world.returnMapId = leavingMap.id
  }
  if (!nextMap.isSecret && targetMapId === 'return') {
    run.world.returnMapId = null
  }

  run.world.currentMapId = nextMapId
  run.world.playerPosition = { ...nextState.start }
  revealAround(run, nextMapId, nextState.start.x, nextState.start.y, 2)
  appendLog(run, `Transition vers ${nextMap.name}.`)
  return { ok: true, mapId: nextMapId }
}

export function attemptMove(run, dx, dy) {
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
  revealAround(run, map.id, nx, ny, 2)

  const enemy = enemyAtPosition(run, nx, ny)
  if (enemy) {
    startCombat(run, enemy)
    return { ok: true, combat: true }
  }

  if (mapState.exit?.x === nx && mapState.exit?.y === ny) {
    if (!mapState.bossDefeated) {
      appendLog(run, 'Sortie verrouillee: le boss de la zone est encore vivant.')
      return { ok: true, blockedExit: true }
    }
    return transitionToMap(run, mapState.exit.targetMapId)
  }

  if (
    mapState.secretPortal &&
    currentMapState(run).secretPortalRevealed &&
    mapState.secretPortal.x === nx &&
    mapState.secretPortal.y === ny
  ) {
    return transitionToMap(run, mapState.secretPortal.targetMapId)
  }

  if (mapState.backPortal && mapState.backPortal.x === nx && mapState.backPortal.y === ny) {
    return transitionToMap(run, mapState.backPortal.targetMapId)
  }

  const chest = chestAtPosition(run, nx, ny)
  if (chest) {
    appendLog(run, 'Un coffre ancien est a portee. Ouvre-le pour recuperer son contenu.')
  }

  return { ok: true }
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

  const guaranteedDodge = targetEffects.find(
    (effect) =>
      effect.value > 0 &&
      (effect.type === 'dodge' || (effect.type === 'buff' && (effect.stat === 'dodge' || effect.stat === 'dodgeChance'))),
  )
  if (!ignoreAvoidance && guaranteedDodge) {
    guaranteedDodge.value = 0
    guaranteedDodge.turns = 0
    return { hp: targetHp, damage: 0, dodged: true, parried: false }
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
      return { hp: targetHp, damage: 0, dodged: true, parried: false }
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
      damage = Math.max(0, Math.floor(damage * (1 - reduction)))
      if (damage <= 0) {
        return { hp: targetHp, damage: 0, dodged: false, parried: true }
      }
      for (const shield of targetEffects.filter((effect) => effect.type === 'shield' && effect.value > 0)) {
        if (damage <= 0) {
          break
        }
        const blocked = Math.min(shield.value, damage)
        shield.value -= blocked
        damage -= blocked
      }
      return { hp: Math.max(0, targetHp - damage), damage, dodged: false, parried: true }
    }
  }

  for (const shield of targetEffects.filter((effect) => effect.type === 'shield' && effect.value > 0)) {
    if (damage <= 0) {
      break
    }
    const blocked = Math.min(shield.value, damage)
    shield.value -= blocked
    damage -= blocked
  }

  return { hp: Math.max(0, targetHp - damage), damage, dodged: false, parried: false }
}

function inRange(distance, minRange, maxRange) {
  return distance >= minRange && distance <= maxRange
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
  if (kind === 'disorient') {
    return 'desorientation'
  }
  if (kind === 'topple') {
    return 'renversement'
  }
  if (kind === 'weaken') {
    return 'affaiblissement'
  }
  return 'alteration'
}

function applySkillStatusEffect(run, side, statusEffect, attacker, defender, targetEffects, targetName) {
  if (!statusEffect?.kind) {
    return null
  }

  const chanceToApply = statusChance(run, side, attacker, defender, statusEffect.chance ?? 0.2)
  if (!chance(chanceToApply)) {
    return null
  }

  const turns = statusEffect.turns ?? 1
  const value = statusEffect.value ?? 1
  if (statusEffect.kind === 'disorient' || statusEffect.kind === 'topple') {
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

    if (stats.lifeRegenFlat > 0) {
      run.player.hp = clamp(run.player.hp + stats.lifeRegenFlat, 0, stats.maxHp)
    }
    run.player.mana = clamp(run.player.mana + Math.max(4, stats.manaRegenFlat), 0, stats.maxMana)
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
        (battle.enemyIsBoss ? playerStats.bossDamagePercent : 0) +
        (battle.distance >= 4 ? playerStats.longRangeDamagePercent : 0)
      : 0

  const actorName = side === 'player' ? run.player.name : battle.enemyName
  const targetName = side === 'player' ? battle.enemyName : run.player.name
  let text = `${actorName} lance ${skill.name}.`
  let restoredAp = 0

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

    if (skill.effect === 'control') {
      battle.distance = Math.max(1, battle.distance - (skill.pullDistance ?? 1))
    }

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
      text += ` ${targetName} pare et subit ${result.damage} degats.`
    } else {
      text += ` ${targetName} subit ${result.damage} degats.`
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
      canApplyAilment = !impactResult.dodged
      text += impactResult.dodged
        ? ` ${targetName} esquive l impact.`
        : ` ${targetName} subit ${impactResult.damage} degats initiaux.`
    }

    if (canApplyAilment) {
      const dotBonus = side === 'player' ? playerStats.dotPercent : 0
      const dotPower = skillPowerByAp(side, skill, attacker)
      const dotValue = Math.max(2, Math.floor(attacker.attack * dotPower * 0.7 * (1 + dotBonus)))
      targetEffects.push({ id: uid('dot'), type: 'dot', kind: dotKind, value: dotValue, turns: dotTurns })
      text += ` ${targetName} subit ${ailmentLabel(dotKind)} (${dotValue}/tour).`

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
      text += ` ${run.player.name} recupere ${healed} PV.`
    } else {
      battle.enemyHp = clamp(battle.enemyHp + rawHeal, 0, maxHp)
      text += ` ${battle.enemyName} recupere ${rawHeal} PV.`
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
    const shield = Math.max(8, Math.floor(attacker.maxHp * (skill.shieldRatio ?? 0.25)))
    const effects = side === 'player' ? battle.playerEffects : battle.enemyEffects
    effects.push({ id: uid('shield'), type: 'shield', value: shield, turns: 2 })
    text += ` Bouclier +${shield}.`
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
    } else {
      effects.push({
        id: uid('buff'),
        type: 'buff',
        stat: buffType,
        value: skill.buffValue ?? 0.2,
        turns: skill.buffTurns ?? 2,
      })
    }
    restoredAp = Math.max(0, Math.floor(skill.restoreAp ?? 0))
    text += ` Buff ${buffType === 'dodge' ? 'esquive' : buffType} actif.`
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
      if (damage.crit && !result.dodged) {
        text += ' Critique.'
      }
      text += result.dodged ? ` ${targetName} esquive.` : ` ${targetName} perd ${result.damage} PV.`
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
    text += debuffType === 'enemyApPenalty' || debuffType === 'enemyMpPenalty' ? ` ${targetName} perdra des PA.` : ' Debuff applique.'

    if (skill.statusEffect) {
      const statusText = applySkillStatusEffect(run, side, skill.statusEffect, attacker, defender, effects, targetName)
      if (statusText) {
        text += ` ${statusText}`
      }
    }
  }

  if (side === 'player') {
    battle.playerAp = Math.max(0, battle.playerAp - skill.apCost + restoredAp)
    run.player.mana = clamp(run.player.mana - skill.manaCost, 0, derivedStats(run).maxMana)
    battle.playerCooldowns[skill.id] = skill.cooldown ?? 0
  } else {
    battle.enemyAp = Math.max(0, battle.enemyAp - skill.apCost + restoredAp)
    battle.enemyMana = clamp((battle.enemyMana ?? battle.enemyStats.maxMana) - skill.manaCost, 0, battle.enemyStats.maxMana)
    battle.enemyCooldowns[skill.id] = skill.cooldown ?? 0
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

  const attacker =
    side === 'player'
      ? {
          attack: playerStats.attack,
          defense: playerStats.defense,
          critChance: playerStats.critChance,
          critDamage: playerStats.critDamage,
          toppleChance: playerStats.toppleChance,
          statusChance: playerStats.statusChance,
        }
      : {
          attack: battle.enemyStats.attack,
          defense: battle.enemyStats.defense,
          critChance: battle.enemyStats.critChance ?? 0.06,
          critDamage: battle.enemyStats.critDamage ?? 0.42,
          toppleChance: battle.enemyStats.toppleChance ?? 0.08,
          statusChance: battle.enemyStats.toppleChance ?? 0.08,
        }

  const defender =
    side === 'player'
      ? {
          defense: battle.enemyStats.defense,
          dodgeChance: battle.enemyStats.dodgeChance ?? 0.03,
          parryChance: battle.enemyStats.parryChance ?? 0.03,
          statusResist: battle.enemyStats.statusResist ?? 0.05,
        }
      : {
          defense: playerStats.defense,
          dodgeChance: playerStats.dodgeChance,
          parryChance: playerStats.parryChance,
          statusResist: playerStats.statusResist,
        }

  const damage = computeDamage(attacker, defender, 1)
  const currentHp = side === 'player' ? battle.enemyHp : run.player.hp
  const targetEffects = side === 'player' ? battle.enemyEffects : battle.playerEffects
  const result = takeDamage(currentHp, targetEffects, damage.damage, defender)

  if (side === 'player') {
    battle.enemyHp = result.hp
    battle.playerAp -= playerStats.normalAttackCost
    let text = ''
    if (damage.crit && !result.dodged) {
      text += 'Critique. '
    }
    if (result.dodged) {
      text += `${battle.enemyName} esquive ton attaque normale.`
    } else if (result.parried) {
      text += `${battle.enemyName} pare partiellement (${result.damage}).`
    } else {
      text += `Attaque normale: ${result.damage} degats.`
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
    battle.enemyAp -= COMBAT_NORMAL_ATTACK_COST
    let text = ''
    if (damage.crit && !result.dodged) {
      text += 'Critique ennemi. '
    }
    if (result.dodged) {
      text += `Tu esquives l attaque normale de ${battle.enemyName}.`
    } else if (result.parried) {
      text += `Tu pares une partie du coup (${result.damage}).`
    } else {
      text += `${battle.enemyName} frappe: ${result.damage} degats.`
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
  const scaled = applyDifficultyToEnemy(template, difficulty)
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
    enemyRangeMin: template.weaponRangeMin ?? 1,
    enemyRangeMax: template.weaponRangeMax ?? 1,
    enemyFleeResist: template.fleeResist ?? 0.2,
    enemyEffects: [],
    playerEffects: preparedBuffs,
    enemyCooldowns: {},
    playerCooldowns: {},
    playerAp: 0,
    enemyAp: 0,
    distance: randomInt(2, 4),
    actor: playerStats.speed + randomInt(0, 6) >= scaled.speed + randomInt(0, 6) ? 'player' : 'enemy',
    turn: 1,
  }

  if (preparedBuffs.length) {
    appendLog(run, `Effets prepares actifs: ${preparedBuffs.length}.`)
  }
  appendLog(run, `Combat lance contre ${template.name}${enemy.isBoss ? ' (BOSS)' : ''}.`)
  startTurn(run)
}

function skillCanBeUsed(skill, ap, mana, cooldowns, distance, rangeBonus = 0) {
  if (!skill) {
    return false
  }
  if (ap < skill.apCost || mana < skill.manaCost) {
    return false
  }
  if ((cooldowns[skill.id] ?? 0) > 0) {
    return false
  }
  if ((skill.minRange ?? 0) === 0 && (skill.maxRange ?? 0) === 0) {
    return true
  }
  return inRange(distance, Math.max(0, skill.minRange), Math.max(skill.minRange, skill.maxRange + rangeBonus))
}

export function playerUseSkill(run, skillId) {
  const battle = run.combat
  if (!battle || battle.actor !== 'player') {
    return { ok: false, reason: 'Ce n est pas ton tour.' }
  }

  const skill = unlockedSkills(run).find((entry) => entry.id === skillId)
  if (!skill) {
    return { ok: false, reason: 'Competence indisponible.' }
  }

  const stats = derivedStats(run)
  if (!skillCanBeUsed(skill, battle.playerAp, run.player.mana, battle.playerCooldowns, battle.distance, stats.rangeFlat)) {
    return { ok: false, reason: 'PA, mana, cooldown ou portee insuffisants.' }
  }

  return applySkill(run, 'player', skill)
}

export function playerNormalAttack(run) {
  const battle = run.combat
  if (!battle || battle.actor !== 'player') {
    return { ok: false, reason: 'Ce n est pas ton tour.' }
  }

  const stats = derivedStats(run)
  if (battle.playerAp < stats.normalAttackCost) {
    return { ok: false, reason: 'PA insuffisants pour attaque normale.' }
  }
  if (!inRange(battle.distance, stats.weaponRangeMin, stats.weaponRangeMax)) {
    return {
      ok: false,
      reason: `Portee insuffisante (arme: ${stats.weaponRangeMin}-${stats.weaponRangeMax}).`,
    }
  }

  return normalAttackResult(run, 'player')
}

export function playerMoveCombat(run, direction) {
  const battle = run.combat
  if (!battle || battle.actor !== 'player') {
    return { ok: false, reason: 'Ce n est pas ton tour.' }
  }
  if (battle.playerAp < COMBAT_MOVE_AP_COST) {
    return { ok: false, reason: `Il faut ${COMBAT_MOVE_AP_COST} PA pour se deplacer.` }
  }

  if (direction === 'closer') {
    battle.distance = Math.max(1, battle.distance - 1)
    appendLog(run, 'Tu te rapproches.')
  } else {
    battle.distance = Math.min(9, battle.distance + 1)
    appendLog(run, 'Tu recules.')
  }

  battle.playerAp -= COMBAT_MOVE_AP_COST
  return { ok: true }
}

function bestEnemySkill(run) {
  const battle = run.combat
  const template = currentEnemyTemplate(run)
  if (!template) {
    return null
  }
  const usable = template.skills.filter((skill) =>
    skillCanBeUsed(skill, battle.enemyAp, battle.enemyMana, battle.enemyCooldowns, battle.distance),
  )
  if (!usable.length) {
    return null
  }
  return usable.sort((a, b) => (b.power ?? 0.2) - (a.power ?? 0.2))[0]
}

function enemyCanNormalAttack(run) {
  const battle = run.combat
  return battle.enemyAp >= COMBAT_NORMAL_ATTACK_COST && inRange(battle.distance, battle.enemyRangeMin, battle.enemyRangeMax)
}

function enemyMove(run) {
  const battle = run.combat
  if (battle.enemyAp < COMBAT_MOVE_AP_COST) {
    return false
  }

  const template = currentEnemyTemplate(run)
  const preferred = template.skills.reduce(
    (acc, skill) => {
      acc.min = Math.min(acc.min, skill.minRange)
      acc.max = Math.max(acc.max, skill.maxRange)
      return acc
    },
    { min: battle.enemyRangeMin, max: battle.enemyRangeMax },
  )

  if (battle.distance > preferred.max) {
    battle.distance = Math.max(1, battle.distance - 1)
    battle.enemyAp -= COMBAT_MOVE_AP_COST
    appendLog(run, `${battle.enemyName} avance.`)
    return true
  }

  if (battle.distance < preferred.min) {
    battle.distance = Math.min(9, battle.distance + 1)
    battle.enemyAp -= COMBAT_MOVE_AP_COST
    appendLog(run, `${battle.enemyName} prend de la distance.`)
    return true
  }

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
  const distanceBonus = Math.max(0, battle.distance - 2) * 0.05
  const raw = 0.42 + speedDelta * 0.028 + distanceBonus - (battle.enemyFleeResist ?? 0.2) - bossPenalty
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

function applyConsumable(run, effect) {
  const stats = derivedStats(run)
  if (effect === 'heal_80') {
    run.player.hp = clamp(run.player.hp + 80, 0, stats.maxHp)
    appendLog(run, 'Potion utilisee: +80 PV.')
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

  if (!applyConsumable(run, item.effect)) {
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
  if (run.player.gold < entry.price) {
    return { ok: false, reason: 'Or insuffisant.' }
  }

  run.player.gold -= entry.price
  addInventoryItem(run, {
    id: uid('consumable'),
    kind: 'consumable',
    name: entry.name,
    effect: entry.effect,
    quantity: 1,
    rarity: 'common',
    value: entry.price,
    icon: '/assets/Weapons/Hands/Hands.png',
  })
  appendLog(run, `${entry.name} achete pour ${entry.price} or.`)
  return { ok: true }
}

export function sellItem(run, itemId) {
  const item = run.player.inventory.find((entry) => entry.id === itemId)
  if (!item) {
    return { ok: false, reason: 'Objet introuvable.' }
  }

  const value = Math.max(1, Math.floor((item.value ?? 12) * 0.55))
  run.player.gold += value
  removeInventoryItem(run, item.id)
  appendLog(run, `${item.name} vendu pour ${value} or.`)
  return { ok: true }
}

function recipeById(recipeId) {
  return RECIPES.find((entry) => entry.id === recipeId) ?? null
}

export function canCraft(run, recipeId) {
  const recipe = recipeById(recipeId)
  if (!recipe) {
    return false
  }
  return Object.entries(recipe.materials).every(([material, qty]) => (run.player.materials[material] ?? 0) >= qty)
}

export function craftItem(run, recipeId) {
  const recipe = recipeById(recipeId)
  if (!recipe) {
    return { ok: false, reason: 'Recette inconnue.' }
  }
  if (!canCraft(run, recipeId)) {
    return { ok: false, reason: 'Materiaux insuffisants.' }
  }

  for (const [material, qty] of Object.entries(recipe.materials)) {
    run.player.materials[material] -= qty
  }

  if (recipe.result.kind === 'consumable') {
    addInventoryItem(run, {
      id: uid('consumable'),
      kind: 'consumable',
      name: recipe.result.name,
      effect: recipe.result.effect,
      quantity: recipe.result.quantity,
      rarity: recipe.rarity,
      value: 30,
      icon: '/assets/Weapons/Hands/Hands.png',
    })
  } else {
    const rarityData = RARITIES[recipe.result.rarity]
    const scale = rarityData.powerMultiplier * (1 + run.player.level * 0.03)
    const item = {
      id: uid('equipment'),
      kind: 'equipment',
      slot: recipe.result.slot,
      name: recipe.result.baseName,
      rarity: recipe.result.rarity,
      attack: Math.floor(recipe.result.attack * scale),
      defense: Math.floor(recipe.result.defense * scale),
      value: Math.floor(recipe.result.value * rarityData.valueMultiplier),
      icon: recipe.result.icon ?? SLOT_DEFAULT_ICON[recipe.result.slot],
    }

    if (recipe.result.slot === 'weapon') {
      item.weaponType = recipe.result.weaponType ?? 'melee'
      item.rangeMin = recipe.result.rangeMin ?? (item.weaponType === 'melee' ? 1 : 2)
      item.rangeMax = recipe.result.rangeMax ?? (item.weaponType === 'melee' ? 1 : 3)
    }

    addInventoryItem(run, applyRandomBonusesToItem(run, item))
  }

  appendLog(run, `Artisanat: ${recipe.name} forge.`)
  return { ok: true, recipe }
}

export function healAtNpc(run) {
  const price = 55
  if (run.player.gold < price) {
    return { ok: false, reason: 'Or insuffisant.' }
  }
  run.player.gold -= price
  syncVitals(run, true)
  appendLog(run, `Soin complet recu pour ${price} or.`)
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
    return { ok: false, reason: 'Aucune enigme pour ce PNJ.' }
  }

  const mapState = currentMapState(run)
  const key = riddleAttemptKey(npc.id, riddle.id)
  if (mapState.solvedRiddles.includes(key)) {
    return { ok: false, reason: 'Enigme deja resolue.' }
  }
  if (mapState.failedRiddles.includes(key)) {
    return { ok: false, reason: 'Tentative deja utilisee sur cette enigme.' }
  }

  const correct = optionId === riddle.correctOptionId
  if (!correct) {
    mapState.failedRiddles.push(key)
    appendLog(run, riddle.failText ?? 'Mauvaise reponse.')
    return { ok: true, correct: false, text: riddle.failText ?? 'Mauvaise reponse.' }
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
    mapState.secretPortalRevealed = true
  }

  appendLog(run, riddle.successText ?? 'Enigme resolue.')
  return { ok: true, correct: true, text: riddle.successText ?? 'Enigme resolue.' }
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
