<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import {
  CLASS_DEFINITIONS,
  CONSUMABLES_SHOP,
  DIFFICULTY_CONFIG,
  ENEMY_TEMPLATES,
  MAIN_LORE,
  MAPS,
  MATERIAL_LABELS,
  RARITIES,
  RECIPES,
} from './game/data'
import {
  answerNpcRiddle,
  appendLog,
  attemptMove,
  buyConsumable,
  canCraft,
  craftItem,
  createRun,
  currentMap,
  currentMapState,
  derivedStats,
  dismissLevelUpModal,
  endPlayerTurn,
  enemyAtPosition,
  equipItem,
  fleeCombat,
  getFleeChance,
  getNpcRiddle,
  harvestNearby,
  healAtNpc,
  hydrateRun,
  isTileDiscovered,
  nearbyChest,
  nearbyNpc,
  nearbyResource,
  openNearbyChest,
  playerMoveCombat,
  playerNormalAttack,
  playerUseSkill,
  progressSummary,
  runEnemyTurn,
  sellItem,
  unequipItem,
  unlockPassive,
  unlockedSkills,
  useConsumable,
} from './game/engine'
import {
  clearSnapshot,
  exportRawDatabaseBase64,
  initDatabase,
  listRunHistory,
  loadSnapshot,
  logRun,
  saveSnapshot,
} from './game/db'
import { toKey } from './game/utils'

const loading = ref(true)
const dbReady = ref(false)
const dbError = ref('')
const hasSave = ref(false)
const saveTimestamp = ref('')
const runHistory = ref([])
const run = ref(null)

const npcOpen = ref(false)
const infoMessage = ref('')
const exportMessage = ref('')
const enemyTimer = ref(null)
const infoTimer = ref(null)
const skillsModalOpen = ref(false)
const passivesModalOpen = ref(false)
const riddleModal = ref(null)

const creation = reactive({
  name: 'Aelys',
  classId: 'warrior',
  difficulty: 'normal',
})

const difficultyOptions = Object.values(DIFFICULTY_CONFIG)

const selectedClass = computed(() =>
  CLASS_DEFINITIONS.find((entry) => entry.id === creation.classId) ?? CLASS_DEFINITIONS[0],
)
const selectedClassInnate = computed(() => selectedClass.value?.innatePassive ?? null)

const activeMap = computed(() => (run.value ? currentMap(run.value) : null))
const activeMapState = computed(() => (run.value ? currentMapState(run.value) : null))
const stats = computed(() => (run.value ? derivedStats(run.value) : null))
const unlockedPlayerSkills = computed(() => (run.value ? unlockedSkills(run.value) : []))
const currentClass = computed(() => {
  if (!run.value) {
    return null
  }
  return CLASS_DEFINITIONS.find((entry) => entry.id === run.value.player.classId) ?? null
})
const playerPortrait = computed(() => currentClass.value?.portrait ?? CLASS_DEFINITIONS[0]?.portrait ?? '')
const skillCatalog = computed(() => currentClass.value?.skills ?? [])
const passiveCatalog = computed(() => currentClass.value?.passives ?? [])
const currentNpc = computed(() => (run.value ? nearbyNpc(run.value) : null))
const currentResource = computed(() => (run.value ? nearbyResource(run.value) : null))
const currentChest = computed(() => (run.value ? nearbyChest(run.value) : null))
const progress = computed(() => (run.value ? progressSummary(run.value) : null))
const combatEnemy = computed(() => {
  if (!run.value?.combat) {
    return null
  }
  return ENEMY_TEMPLATES[run.value.combat.enemyTemplateId] ?? null
})
const potionItems = computed(() => {
  if (!run.value) {
    return []
  }
  return run.value.player.inventory.filter((entry) => entry.kind === 'consumable')
})
const combatLogEntries = computed(() => (run.value ? run.value.eventLog.slice(0, 25) : []))
const fleeRate = computed(() => {
  if (!run.value?.combat) {
    return 0
  }
  return Math.round(getFleeChance(run.value) * 100)
})
const shouldEmphasizeEndTurn = computed(() => {
  if (!run.value?.combat || run.value.combat.actor !== 'player') {
    return false
  }
  const canAttack = normalAttackReady()
  const canUseSkill = unlockedPlayerSkills.value.some((skill) => skillReady(skill))
  return !canAttack && !canUseSkill
})

const mapGridStyle = computed(() => {
  if (!activeMap.value) {
    return {}
  }
  return {
    gridTemplateColumns: `repeat(${activeMap.value.width}, minmax(24px, 1fr))`,
    backgroundImage: `linear-gradient(145deg, rgba(12, 24, 29, 0.75), rgba(26, 11, 7, 0.82)), url('${activeMap.value.background}')`,
  }
})

const mapCells = computed(() => {
  if (!run.value || !activeMap.value || !activeMapState.value) {
    return []
  }

  const map = activeMap.value
  const mapState = activeMapState.value
  const px = run.value.world.playerPosition.x
  const py = run.value.world.playerPosition.y
  const rows = []

  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const tile = mapState.tiles?.[y]?.[x] ?? map.tiles[y]?.[x] ?? '#'
      const discovered = isTileDiscovered(run.value, map.id, x, y)
      const enemy = discovered ? enemyAtPosition(run.value, x, y, map.id) : null
      const npc = discovered ? mapState.npcs.find((entry) => entry.x === x && entry.y === y) : null
      const resource = discovered
        ? mapState.resources.find((entry) => entry.charges > 0 && entry.x === x && entry.y === y)
        : null
      const chest = discovered ? mapState.chests.find((entry) => !entry.opened && entry.x === x && entry.y === y) : null
      const isExit = discovered && mapState.exit?.x === x && mapState.exit?.y === y
      const hasPortal =
        discovered &&
        mapState.secretPortal &&
        mapState.secretPortalRevealed &&
        mapState.secretPortal.x === x &&
        mapState.secretPortal.y === y
      const hasBackPortal = discovered && mapState.backPortal && mapState.backPortal.x === x && mapState.backPortal.y === y

      rows.push({
        id: toKey(x, y),
        x,
        y,
        tile,
        discovered,
        enemy,
        npc,
        resource,
        chest,
        isExit,
        hasPortal,
        hasBackPortal,
        player: px === x && py === y,
      })
    }
  }

  return rows
})

function itemIcon(item) {
  if (item.icon) {
    return item.icon
  }
  if (item.slot === 'armor') {
    return '/assets/Weapons/Hands/Hands.png'
  }
  if (item.slot === 'trinket') {
    return '/assets/Weapons/Bone/Bone.png'
  }
  return '/assets/Weapons/Wood/Wood.png'
}

function rarityColor(rarity) {
  return RARITIES[rarity]?.color || '#fff'
}

function itemAffixes(item) {
  return item?.affixes ?? []
}

function cellIcon(cell) {
  if (!cell.discovered) {
    return ''
  }
  if (cell.enemy) {
    return ENEMY_TEMPLATES[cell.enemy.templateId]?.asset ?? ''
  }
  if (cell.npc) {
    return cell.npc.portrait ?? ''
  }
  return ''
}

function cellLabel(cell) {
  if (!cell.discovered) {
    return ''
  }
  if (cell.player) {
    return 'P'
  }
  if (cell.chest) {
    return 'C'
  }
  if (cell.resource) {
    return 'R'
  }
  if (cell.hasPortal) {
    return 'S'
  }
  if (cell.hasBackPortal) {
    return 'B'
  }
  if (cell.isExit) {
    return 'X'
  }
  return ''
}

function enemyCombatStyle(template) {
  if (!template) {
    return ''
  }
  const min = template.weaponRangeMin ?? 1
  const max = template.weaponRangeMax ?? 1
  if (max <= 1) {
    return 'corps a corps'
  }
  if (min >= 2) {
    return 'distant'
  }
  return 'mixte'
}

function combatLogClasses(entry) {
  const text = entry.toLowerCase()
  const playerName = run.value?.player?.name?.toLowerCase?.() ?? ''
  return {
    'log-player': text.includes('tu ') || (playerName && text.includes(playerName)),
    'log-enemy': text.includes('boss') || text.includes('ennemi') || text.includes('esquive ton attaque'),
    'log-damage': text.includes('degats') || text.includes('frappe:') || text.includes('subit'),
    'log-received': text.includes('te blesse') || text.includes('frappe:') || text.includes('tu es renverse'),
    'log-crit': text.includes('critique'),
    'log-heal': text.includes('recupere') || text.includes('vole') || text.includes('potion'),
    'log-status':
      text.includes('debuff') ||
      text.includes('ralentissement') ||
      text.includes('renverse') ||
      text.includes('desorientation') ||
      text.includes('affaiblissement'),
  }
}

function cellClass(cell) {
  return {
    tile: true,
    fog: !cell.discovered,
    wall: cell.tile === '#',
    water: cell.tile === '~',
    floor: cell.tile === '.',
    player: cell.player,
    enemy: Boolean(cell.enemy),
    npc: Boolean(cell.npc),
    resource: Boolean(cell.resource),
    chest: Boolean(cell.chest),
    exit: cell.isExit,
    secret: cell.hasPortal,
    back: cell.hasBackPortal,
  }
}

function setInfo(message) {
  infoMessage.value = message
  if (infoTimer.value) {
    window.clearTimeout(infoTimer.value)
  }
  infoTimer.value = window.setTimeout(() => {
    infoMessage.value = ''
  }, 2600)
}

function refreshHistory() {
  if (!dbReady.value) {
    return
  }
  runHistory.value = listRunHistory(8)
}

function updateSaveState() {
  const loaded = loadSnapshot()
  hasSave.value = Boolean(loaded)
  saveTimestamp.value = loaded?.updatedAt ?? ''
}

function closeMetaModals() {
  skillsModalOpen.value = false
  passivesModalOpen.value = false
  riddleModal.value = null
}

function persistRun() {
  if (!run.value || !dbReady.value) {
    return
  }

  if (run.value.gameOver && !run.value.metadata.loggedInHistory) {
    logRun({
      difficulty: run.value.metadata.difficulty,
      classId: run.value.player.classId,
      level: run.value.player.level,
      result: run.value.hardcoreDeath ? 'hardcore_death' : run.value.victory ? 'victory' : 'retired',
      note: run.value.victory
        ? 'Faille scellee.'
        : run.value.hardcoreDeath
          ? 'Mort definitive.'
          : 'Run terminee.',
    })
    run.value.metadata.loggedInHistory = true
  }

  if (run.value.hardcoreDeath) {
    clearSnapshot()
    hasSave.value = false
  } else {
    saveSnapshot(run.value)
    hasSave.value = true
    saveTimestamp.value = new Date().toISOString()
  }

  refreshHistory()
}

function scheduleEnemyTurn() {
  if (!run.value?.combat || run.value.combat.actor !== 'enemy') {
    return
  }
  if (enemyTimer.value) {
    return
  }

  enemyTimer.value = window.setTimeout(() => {
    enemyTimer.value = null
    if (!run.value?.combat || run.value.combat.actor !== 'enemy') {
      return
    }
    runEnemyTurn(run.value)
    persistRun()
    if (run.value?.combat?.actor === 'enemy') {
      scheduleEnemyTurn()
    }
  }, 650)
}

function startNewGame() {
  run.value = createRun({
    name: creation.name,
    classId: creation.classId,
    difficulty: creation.difficulty,
  })
  npcOpen.value = false
  closeMetaModals()
  setInfo('Nouvelle campagne lancee.')
  persistRun()
}

function continueSavedGame() {
  const loaded = loadSnapshot()
  if (!loaded?.snapshot) {
    setInfo('Aucune sauvegarde disponible.')
    return
  }
  run.value = hydrateRun(loaded.snapshot)
  npcOpen.value = false
  closeMetaModals()
  setInfo('Sauvegarde chargee.')
  scheduleEnemyTurn()
}

function abandonAndDeleteSave() {
  clearSnapshot()
  run.value = null
  npcOpen.value = false
  closeMetaModals()
  updateSaveState()
  setInfo('Sauvegarde supprimee.')
}

function handleMove(dx, dy) {
  if (!run.value) {
    return
  }
  const result = attemptMove(run.value, dx, dy)
  if (!result.ok && result.reason) {
    setInfo(result.reason)
  }
  npcOpen.value = false
  persistRun()
  scheduleEnemyTurn()
}

function clickCell(cell) {
  if (!run.value) {
    return
  }
  const px = run.value.world.playerPosition.x
  const py = run.value.world.playerPosition.y
  const dx = cell.x - px
  const dy = cell.y - py
  if (Math.abs(dx) + Math.abs(dy) === 1) {
    handleMove(dx, dy)
  }
}

function openNpcPanel() {
  if (!run.value) {
    return
  }
  const npc = nearbyNpc(run.value)
  if (!npc) {
    setInfo('Aucun PNJ a proximite.')
    return
  }
  npcOpen.value = true
  appendLog(run.value, `${npc.name}: ${npc.dialogue}`)
  persistRun()
}

function harvestAction() {
  if (!run.value) {
    return
  }
  const result = harvestNearby(run.value)
  if (!result.ok) {
    setInfo(result.reason)
  }
  persistRun()
}

function openChestAction() {
  if (!run.value) {
    return
  }
  const result = openNearbyChest(run.value)
  if (!result.ok) {
    setInfo(result.reason)
  }
  persistRun()
}

function openRiddle(npc) {
  if (!run.value || !npc) {
    return
  }
  const riddle = getNpcRiddle(run.value, npc.id)
  if (!riddle) {
    return
  }
  if (riddle.solved) {
    setInfo('Enigme deja resolue.')
    return
  }
  if (riddle.failed) {
    setInfo('Tentative deja utilisee pour cette enigme.')
    return
  }
  riddleModal.value = {
    npcId: npc.id,
    npcName: npc.name,
    ...riddle,
  }
}

function answerRiddle(optionId) {
  if (!run.value || !riddleModal.value) {
    return
  }
  const result = answerNpcRiddle(run.value, riddleModal.value.npcId, optionId)
  if (!result.ok && result.reason) {
    setInfo(result.reason)
  } else if (result.ok) {
    setInfo(result.text)
    riddleModal.value = null
  }
  persistRun()
}

function npcAction(action, payload = null) {
  if (!run.value || !currentNpc.value) {
    return
  }

  if (action === 'lore') {
    const riddle = getNpcRiddle(run.value, currentNpc.value.id)
    if (riddle && !riddle.solved) {
      openRiddle(currentNpc.value)
      setInfo('Ce PNJ propose une enigme.')
    } else {
      appendLog(run.value, currentNpc.value.dialogue)
      if (activeMapState.value?.secretPortal && !activeMapState.value?.secretPortalRevealed) {
        appendLog(run.value, 'Indice: le secret se revele parfois apres un succes contre la Brume.')
      }
      setInfo('Indice ajoute au journal.')
    }
  }

  if (action === 'heal') {
    const result = healAtNpc(run.value)
    if (!result.ok) {
      setInfo(result.reason)
    }
  }

  if (action === 'buy') {
    const result = buyConsumable(run.value, payload)
    if (!result.ok) {
      setInfo(result.reason)
    }
  }

  if (action === 'craft') {
    const result = craftItem(run.value, payload)
    if (!result.ok) {
      setInfo(result.reason)
    }
  }

  persistRun()
}

function skillReady(skill) {
  if (!run.value?.combat || run.value.combat.actor !== 'player') {
    return false
  }
  const battle = run.value.combat
  const selfTarget = (skill.minRange ?? 0) === 0 && (skill.maxRange ?? 0) === 0
  const inRange =
    selfTarget ||
    (battle.distance >= skill.minRange && battle.distance <= skill.maxRange + (stats.value?.rangeFlat ?? 0))
  const cooldown = battle.playerCooldowns[skill.id] ?? 0
  return inRange && cooldown <= 0 && battle.playerAp >= skill.apCost && run.value.player.mana >= skill.manaCost
}

function normalAttackReady() {
  if (!run.value?.combat || run.value.combat.actor !== 'player') {
    return false
  }
  const battle = run.value.combat
  return (
    battle.playerAp >= 2 &&
    battle.distance >= (stats.value?.weaponRangeMin ?? 1) &&
    battle.distance <= (stats.value?.weaponRangeMax ?? 1)
  )
}

function useSkillAction(skillId) {
  if (!run.value) {
    return
  }
  const result = playerUseSkill(run.value, skillId)
  if (!result.ok) {
    setInfo(result.reason)
  }
  persistRun()
  scheduleEnemyTurn()
}

function useNormalAttack() {
  if (!run.value) {
    return
  }
  const result = playerNormalAttack(run.value)
  if (!result.ok) {
    setInfo(result.reason)
  }
  persistRun()
  scheduleEnemyTurn()
}

function attemptFleeAction() {
  if (!run.value) {
    return
  }
  const result = fleeCombat(run.value)
  if (!result.ok) {
    setInfo(result.reason)
  } else {
    setInfo(result.success ? 'Fuite reussie.' : 'Fuite echouee.')
  }
  persistRun()
  scheduleEnemyTurn()
}

function combatMove(direction) {
  if (!run.value) {
    return
  }
  const result = playerMoveCombat(run.value, direction)
  if (!result.ok) {
    setInfo(result.reason)
  }
  persistRun()
}

function endTurnAction() {
  if (!run.value) {
    return
  }
  endPlayerTurn(run.value)
  persistRun()
  scheduleEnemyTurn()
}

function consumeItem(itemId) {
  if (!run.value) {
    return
  }
  const result = useConsumable(run.value, itemId)
  if (!result.ok) {
    setInfo(result.reason)
  }
  persistRun()
  scheduleEnemyTurn()
}

function equipAction(itemId) {
  if (!run.value) {
    return
  }
  const result = equipItem(run.value, itemId)
  if (!result.ok) {
    setInfo(result.reason)
  }
  persistRun()
}

function unequipAction(slot) {
  if (!run.value) {
    return
  }
  const result = unequipItem(run.value, slot)
  if (!result.ok) {
    setInfo(result.reason)
  }
  persistRun()
}

function sellAction(itemId) {
  if (!run.value) {
    return
  }
  const result = sellItem(run.value, itemId)
  if (!result.ok) {
    setInfo(result.reason)
  }
  persistRun()
}

function unlockPassiveAction(passiveId) {
  if (!run.value) {
    return
  }
  const result = unlockPassive(run.value, passiveId)
  if (!result.ok) {
    setInfo(result.reason)
  }
  persistRun()
}

function passiveCanUnlock(passive) {
  if (!run.value) {
    return false
  }
  if (run.value.player.unlockedPassives.includes(passive.id)) {
    return false
  }
  if (run.value.player.passivePoints <= 0) {
    return false
  }
  if (passive.requires && !run.value.player.unlockedPassives.includes(passive.requires)) {
    return false
  }
  return true
}

function closeLevelUp() {
  if (!run.value) {
    return
  }
  dismissLevelUpModal(run.value)
  persistRun()
}

function exportSqliteBase64() {
  try {
    const blob = exportRawDatabaseBase64()
    navigator.clipboard.writeText(blob)
    exportMessage.value = 'Export SQLite copie dans le presse-papier.'
  } catch {
    exportMessage.value = 'Impossible de copier (clipboard bloque).'
  }
  window.setTimeout(() => {
    exportMessage.value = ''
  }, 2400)
}

function keyHandler(event) {
  const targetTag = event.target?.tagName?.toLowerCase()
  if (targetTag === 'input' || targetTag === 'select' || targetTag === 'textarea') {
    return
  }
  if (!run.value || run.value.gameOver) {
    return
  }

  const key = event.key.toLowerCase()
  if (!run.value.combat) {
    if (key === 'arrowup' || key === 'w') {
      handleMove(0, -1)
    }
    if (key === 'arrowdown' || key === 's') {
      handleMove(0, 1)
    }
    if (key === 'arrowleft' || key === 'a') {
      handleMove(-1, 0)
    }
    if (key === 'arrowright' || key === 'd') {
      handleMove(1, 0)
    }
    if (key === 'e') {
      openNpcPanel()
    }
    if (key === 'f') {
      harvestAction()
    }
    if (key === 'c') {
      openChestAction()
    }
    return
  }

  if (run.value.combat.actor !== 'player') {
    return
  }

  if (key === 'q') {
    combatMove('closer')
  }
  if (key === 'r') {
    combatMove('farther')
  }
  if (key === 'x') {
    useNormalAttack()
  }
  if (key === 'v') {
    attemptFleeAction()
  }
  if (key === ' ') {
    endTurnAction()
  }
  if (['1', '2', '3', '4', '5'].includes(key)) {
    const skill = unlockedPlayerSkills.value[Number.parseInt(key, 10) - 1]
    if (skill) {
      useSkillAction(skill.id)
    }
  }
}

onMounted(async () => {
  try {
    await initDatabase()
    dbReady.value = true
    updateSaveState()
    refreshHistory()
  } catch (error) {
    dbError.value = `Erreur SQLite: ${error instanceof Error ? error.message : String(error)}`
  } finally {
    loading.value = false
  }
  window.addEventListener('keydown', keyHandler)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', keyHandler)
  if (enemyTimer.value) {
    window.clearTimeout(enemyTimer.value)
    enemyTimer.value = null
  }
  if (infoTimer.value) {
    window.clearTimeout(infoTimer.value)
    infoTimer.value = null
  }
})
</script>

<template>
  <main class="layout">
    <section v-if="loading" class="loading-screen">
      <h1>Chargement du moteur RPG...</h1>
    </section>

    <section v-else-if="!run" class="menu-screen">
      <header class="menu-header">
        <h1>Chroniques du Voile Brise</h1>
        <p>{{ MAIN_LORE }}</p>
      </header>

      <div v-if="dbError" class="db-error">{{ dbError }}</div>

      <div class="menu-grid">
        <article class="card setup-card">
          <h2>Nouvelle Campagne</h2>
          <label>
            Nom du hero
            <input v-model="creation.name" type="text" maxlength="24" />
          </label>
          <label>
            Classe
            <select v-model="creation.classId">
              <option v-for="entry in CLASS_DEFINITIONS" :key="entry.id" :value="entry.id">
                {{ entry.name }} - {{ entry.fantasy }}
              </option>
            </select>
          </label>
          <label>
            Difficulte
            <select v-model="creation.difficulty">
              <option v-for="entry in difficultyOptions" :key="entry.id" :value="entry.id">
                {{ entry.label }}
              </option>
            </select>
          </label>

          <div class="class-preview">
            <img :src="selectedClass.portrait" alt="portrait classe" />
            <div>
              <strong>{{ selectedClass.name }}</strong>
              <p>{{ selectedClass.intro }}</p>
              <p v-if="selectedClassInnate" class="innate-passive">
                Passif de base: <strong>{{ selectedClassInnate.name }}</strong> - {{ selectedClassInnate.description }}
              </p>
            </div>
          </div>

          <button class="primary" @click="startNewGame">Lancer la campagne</button>
          <button class="secondary" :disabled="!hasSave" @click="continueSavedGame">Continuer sauvegarde</button>
          <button class="danger" :disabled="!hasSave" @click="abandonAndDeleteSave">Effacer sauvegarde</button>
          <p v-if="saveTimestamp" class="save-ts">Derniere sauvegarde: {{ saveTimestamp }}</p>
        </article>

        <article class="card history-card">
          <h2>Historique des Runs</h2>
          <ul v-if="runHistory.length" class="history-list">
            <li v-for="entry in runHistory" :key="`${entry.createdAt}-${entry.result}`">
              <strong>{{ entry.result }}</strong>
              <span>{{ entry.difficulty }} / {{ entry.classId }} / niv. {{ entry.level }}</span>
              <small>{{ entry.createdAt }}</small>
            </li>
          </ul>
          <p v-else>Aucun run archive pour le moment.</p>
          <button class="secondary" @click="exportSqliteBase64">Copier export SQLite (base64)</button>
          <p v-if="exportMessage" class="export-message">{{ exportMessage }}</p>
        </article>
      </div>
    </section>

    <section v-else class="game-screen">
      <header class="hud">
        <div>
          <h1>{{ run.player.name }} - {{ run.player.classId }}</h1>
          <p>Mode {{ run.metadata.difficulty }} | Niveau {{ run.player.level }}</p>
        </div>
        <div class="hud-stats">
          <span>PV {{ run.player.hp }} / {{ stats.maxHp }}</span>
          <span>Mana {{ run.player.mana }} / {{ stats.maxMana }}</span>
          <span>Or {{ run.player.gold }}</span>
          <span>XP {{ run.player.xp }} / {{ run.player.nextXp }}</span>
          <span>Points passifs {{ run.player.passivePoints }}</span>
        </div>
        <div class="hud-actions">
          <button @click="skillsModalOpen = true">Competences</button>
          <button @click="passivesModalOpen = true">Passifs</button>
        </div>
      </header>

      <p v-if="infoMessage" class="info-msg">{{ infoMessage }}</p>

      <div class="columns">
        <article class="card world-card">
          <div class="world-header">
            <h2>{{ activeMap.name }}</h2>
            <p>Niveaux recommandes {{ activeMap.levelRange }}</p>
          </div>

          <div class="map-grid" :style="mapGridStyle">
            <button
              v-for="cell in mapCells"
              :key="cell.id"
              class="tile-btn"
              :class="cellClass(cell)"
              @click="clickCell(cell)"
            >
              <img v-if="cellIcon(cell)" class="tile-entity" :src="cellIcon(cell)" alt="icone case" />
              <span v-else class="tile-symbol">{{ cellLabel(cell) }}</span>
            </button>
          </div>

          <div class="legend">
            <span>P joueur</span>
            <span>E ennemi</span>
            <span>N PNJ</span>
            <span>C coffre</span>
            <span>R ressource</span>
            <span>X sortie</span>
            <span>S secret</span>
            <span>B retour</span>
          </div>

          <div class="controls">
            <div class="dir-grid">
              <button @click="handleMove(0, -1)">Haut</button>
              <div></div>
              <button @click="handleMove(-1, 0)">Gauche</button>
              <button @click="handleMove(1, 0)">Droite</button>
              <div></div>
              <button @click="handleMove(0, 1)">Bas</button>
            </div>
            <button @click="openNpcPanel">Interagir PNJ (E)</button>
            <button @click="harvestAction">Recolter (F)</button>
            <button @click="openChestAction">Ouvrir coffre (C)</button>
          </div>

          <div class="quick-status">
            <p v-if="currentResource">Ressource proche: {{ currentResource.type }} ({{ currentResource.charges }} charges)</p>
            <p v-if="currentChest">Coffre proche detecte.</p>
          </div>
        </article>

        <article class="card side-card">
          <h2>Equipement et sac</h2>

          <div class="equipment-grid">
            <div class="equip-slot">
              <h3>Arme</h3>
              <div v-if="run.player.equipment.weapon" class="equip-item">
                <img :src="itemIcon(run.player.equipment.weapon)" alt="arme" />
                <div>
                  <strong :style="{ color: rarityColor(run.player.equipment.weapon.rarity) }">
                    {{ run.player.equipment.weapon.name }}
                  </strong>
                  <p>ATK {{ run.player.equipment.weapon.attack ?? 0 }} DEF {{ run.player.equipment.weapon.defense ?? 0 }}</p>
                  <p>
                    Portee {{ run.player.equipment.weapon.rangeMin ?? 1 }}-{{ run.player.equipment.weapon.rangeMax ?? 1 }}
                  </p>
                  <p v-for="bonus in itemAffixes(run.player.equipment.weapon)" :key="bonus" class="item-affix">{{ bonus }}</p>
                  <button @click="unequipAction('weapon')">Retirer</button>
                </div>
              </div>
              <p v-else>Aucune arme equipee.</p>
            </div>

            <div class="equip-slot">
              <h3>Armure</h3>
              <div v-if="run.player.equipment.armor" class="equip-item">
                <img :src="itemIcon(run.player.equipment.armor)" alt="armure" />
                <div>
                  <strong :style="{ color: rarityColor(run.player.equipment.armor.rarity) }">
                    {{ run.player.equipment.armor.name }}
                  </strong>
                  <p>ATK {{ run.player.equipment.armor.attack ?? 0 }} DEF {{ run.player.equipment.armor.defense ?? 0 }}</p>
                  <p v-for="bonus in itemAffixes(run.player.equipment.armor)" :key="bonus" class="item-affix">{{ bonus }}</p>
                  <button @click="unequipAction('armor')">Retirer</button>
                </div>
              </div>
              <p v-else>Aucune armure equipee.</p>
            </div>

            <div class="equip-slot">
              <h3>Bibelot</h3>
              <div v-if="run.player.equipment.trinket" class="equip-item">
                <img :src="itemIcon(run.player.equipment.trinket)" alt="trinket" />
                <div>
                  <strong :style="{ color: rarityColor(run.player.equipment.trinket.rarity) }">
                    {{ run.player.equipment.trinket.name }}
                  </strong>
                  <p>ATK {{ run.player.equipment.trinket.attack ?? 0 }} DEF {{ run.player.equipment.trinket.defense ?? 0 }}</p>
                  <p v-for="bonus in itemAffixes(run.player.equipment.trinket)" :key="bonus" class="item-affix">{{ bonus }}</p>
                  <button @click="unequipAction('trinket')">Retirer</button>
                </div>
              </div>
              <p v-else>Aucun trinket equipe.</p>
            </div>
          </div>

          <div class="inventory">
            <h3>Inventaire</h3>
            <ul>
              <li v-for="item in run.player.inventory" :key="item.id">
                <img class="item-icon" :src="itemIcon(item)" alt="item" />
                <div class="item-main">
                  <strong :style="{ color: rarityColor(item.rarity) }">{{ item.name }}</strong>
                  <p v-if="item.kind === 'equipment'">ATK {{ item.attack }} DEF {{ item.defense }}</p>
                  <p v-if="item.kind === 'consumable'">Quantite: {{ item.quantity }}</p>
                  <p v-for="bonus in itemAffixes(item)" :key="bonus" class="item-affix">{{ bonus }}</p>
                  <div class="row-actions">
                    <button v-if="item.kind === 'equipment'" @click="equipAction(item.id)">Equiper</button>
                    <button v-if="item.kind === 'consumable'" @click="consumeItem(item.id)">Utiliser</button>
                    <button @click="sellAction(item.id)">Vendre</button>
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <div class="materials">
            <h3>Materiaux</h3>
            <ul>
              <li v-for="(label, key) in MATERIAL_LABELS" :key="key">{{ label }}: {{ run.player.materials[key] }}</li>
            </ul>
          </div>
        </article>

        <article class="card progress-card">
          <h2>Progression</h2>
          <ul>
            <li v-for="entry in progress.maps" :key="entry.mapId">
              {{ MAPS[entry.mapId].name }}
              : boss {{ entry.bossDefeated ? 'vaincu' : 'vivant' }},
              ennemis {{ entry.remainingEnemies }},
              coffres {{ entry.openedChests }}/{{ entry.totalChests }},
              enigmes {{ entry.solvedRiddles }},
              secret {{ entry.secretPortalRevealed ? 'revele' : 'cache' }}
            </li>
          </ul>
          <p>Mythiques obtenus: {{ progress.mythicCount }}</p>
          <p>Morts: {{ progress.totalDeaths }}</p>

          <div class="short-log">
            <h3>Journal recent</h3>
            <ul>
              <li v-for="(entry, index) in run.eventLog.slice(0, 10)" :key="`recent-${index}-${entry}`">{{ entry }}</li>
            </ul>
          </div>

          <div class="exit-buttons">
            <button class="secondary" @click="run = null; npcOpen = false; closeMetaModals()">Retour menu</button>
            <button class="danger" @click="abandonAndDeleteSave">Abandonner run</button>
          </div>
        </article>
      </div>
      <div v-if="run.combat" class="overlay-combat">
        <article class="combat-modal">
          <header class="combat-modal-head">
            <div class="enemy-head">
              <img :src="combatEnemy?.asset" alt="ennemi" />
              <div>
                <h2>
                  {{ run.combat.enemyName }}
                  <span v-if="run.combat.enemyIsBoss">(BOSS)</span>
                </h2>
                <p>PV {{ run.combat.enemyHp }} / {{ run.combat.enemyStats.maxHp }} | PA {{ run.combat.enemyAp }} / {{ run.combat.enemyStats.ap }}</p>
                <p>Distance {{ run.combat.distance }}</p>
                <p>Style {{ enemyCombatStyle(combatEnemy) }}</p>
              </div>
            </div>
            <div class="player-head">
              <img :src="playerPortrait" alt="aventurier" />
              <div>
                <p>Ton tour: {{ run.combat.actor === 'player' ? 'oui' : 'non' }}</p>
                <p class="ap-line">
                  <span class="ap-pill">PA {{ run.combat.playerAp }}</span>
                  <span class="ap-pill enemy">PA ennemi {{ run.combat.enemyAp }}</span>
                </p>
                <p>PV {{ run.player.hp }} / {{ stats.maxHp }}</p>
                <p>Mana {{ run.player.mana }} / {{ stats.maxMana }}</p>
              </div>
            </div>
          </header>

          <div class="combat-modal-body">
            <section class="combat-actions-panel">
              <h3>Actions</h3>
              <div class="combat-actions-row">
                <button :disabled="!normalAttackReady()" @click="useNormalAttack">
                  Attaque normale (2 PA) [{{ stats.weaponRangeMin }}-{{ stats.weaponRangeMax }}]
                </button>
                <button :disabled="run.combat.actor !== 'player'" @click="combatMove('closer')">Approcher (2 PA) (Q)</button>
                <button :disabled="run.combat.actor !== 'player'" @click="combatMove('farther')">Reculer (2 PA) (R)</button>
                <button :disabled="run.combat.actor !== 'player'" @click="attemptFleeAction">Fuir ({{ fleeRate }}%) (V)</button>
                <button
                  :class="{ 'end-turn-btn': shouldEmphasizeEndTurn }"
                  :disabled="run.combat.actor !== 'player'"
                  @click="endTurnAction"
                >
                  Terminer le tour (Espace)
                </button>
              </div>

              <h3>Competences</h3>
              <div class="skills-grid">
                <button
                  v-for="(skill, index) in unlockedPlayerSkills"
                  :key="skill.id"
                  :disabled="!skillReady(skill)"
                  @click="useSkillAction(skill.id)"
                >
                  {{ index + 1 }}. {{ skill.name }}
                  <small>
                    {{ skill.description }}
                    | PA {{ skill.apCost }} mana {{ skill.manaCost }}
                    | portee
                    {{ skill.minRange === 0 && skill.maxRange === 0 ? 'self' : `${skill.minRange}-${skill.maxRange + (stats.rangeFlat ?? 0)}` }}
                    | CD {{ run.combat.playerCooldowns[skill.id] ?? 0 }}
                  </small>
                </button>
              </div>

              <h3>Potions</h3>
              <div class="potions-grid">
                <button
                  v-for="item in potionItems"
                  :key="item.id"
                  :disabled="run.combat.actor !== 'player'"
                  @click="consumeItem(item.id)"
                >
                  {{ item.name }} x{{ item.quantity }}
                </button>
                <p v-if="!potionItems.length">Aucune potion en inventaire.</p>
              </div>
            </section>

            <section class="combat-log-panel">
              <h3>Journal du combat</h3>
              <ul>
                <li v-for="(entry, index) in combatLogEntries" :key="`combat-${index}-${entry}`" :class="combatLogClasses(entry)">
                  {{ entry }}
                </li>
              </ul>
            </section>
          </div>
        </article>
      </div>

      <div v-if="npcOpen && currentNpc" class="overlay-meta" @click="npcOpen = false">
        <article class="meta-modal npc-modal" @click.stop>
          <header class="npc-head">
            <img :src="currentNpc.portrait" alt="portrait npc" />
            <div>
              <h2>{{ currentNpc.name }}</h2>
              <p>{{ currentNpc.dialogue }}</p>
            </div>
          </header>
          <div class="npc-actions">
            <button v-if="currentNpc.role === 'lore'" @click="npcAction('lore')">Donne moi un indice</button>
            <button v-if="currentNpc.role === 'healer'" @click="npcAction('heal')">Soin complet (55 or)</button>
            <template v-if="currentNpc.role === 'merchant'">
              <button v-for="shop in CONSUMABLES_SHOP" :key="shop.id" @click="npcAction('buy', shop.id)">
                Acheter {{ shop.name }} ({{ shop.price }} or)
              </button>
            </template>
            <template v-if="currentNpc.role === 'craft'">
              <button
                v-for="recipe in RECIPES"
                :key="recipe.id"
                :disabled="!canCraft(run, recipe.id)"
                @click="npcAction('craft', recipe.id)"
              >
                Forger {{ recipe.name }} ({{ RARITIES[recipe.rarity].label }})
              </button>
            </template>
            <button class="secondary" @click="npcOpen = false">Fermer</button>
          </div>
        </article>
      </div>

      <div v-if="skillsModalOpen" class="overlay-meta">
        <article class="meta-modal">
          <header>
            <h2>Competences - {{ currentClass?.name }}</h2>
          </header>
          <ul>
            <li v-for="skill in skillCatalog" :key="skill.id">
              <strong>{{ skill.name }}</strong>
              <p>{{ skill.description }}</p>
              <p>Niveau {{ skill.unlockLevel }} | PA {{ skill.apCost }} | Mana {{ skill.manaCost }}</p>
              <p>Portee {{ skill.minRange === 0 && skill.maxRange === 0 ? 'self' : `${skill.minRange}-${skill.maxRange}` }} | CD {{ skill.cooldown }}</p>
            </li>
          </ul>
          <button class="secondary" @click="skillsModalOpen = false">Fermer</button>
        </article>
      </div>

      <div v-if="passivesModalOpen" class="overlay-meta">
        <article class="meta-modal">
          <header>
            <h2>Arbre passif - {{ currentClass?.name }}</h2>
            <p>Points disponibles: {{ run.player.passivePoints }}</p>
            <p v-if="currentClass?.innatePassive">
              Passif de base actif: <strong>{{ currentClass.innatePassive.name }}</strong> - {{ currentClass.innatePassive.description }}
            </p>
          </header>
          <ul>
            <li v-for="passive in passiveCatalog" :key="passive.id">
              <strong>{{ passive.name }}</strong>
              <p>{{ passive.description }}</p>
              <small v-if="passive.requires">Prerequis: {{ passive.requires }}</small>
              <button
                :disabled="!passiveCanUnlock(passive)"
                @click="unlockPassiveAction(passive.id)"
              >
                {{ run.player.unlockedPassives.includes(passive.id) ? 'Debloque' : 'Debloquer' }}
              </button>
            </li>
          </ul>
          <button class="secondary" @click="passivesModalOpen = false">Fermer</button>
        </article>
      </div>

      <div v-if="riddleModal" class="overlay-meta">
        <article class="meta-modal riddle-modal">
          <header>
            <h2>Enigme de {{ riddleModal.npcName }}</h2>
          </header>
          <p>{{ riddleModal.question }}</p>
          <div class="riddle-options">
            <button
              v-for="option in riddleModal.options"
              :key="option.id"
              @click="answerRiddle(option.id)"
            >
              {{ option.text }}
            </button>
          </div>
          <button class="secondary" @click="riddleModal = null">Fermer</button>
        </article>
      </div>

      <div v-if="run.levelUpModal" class="overlay-meta">
        <article class="meta-modal levelup-modal">
          <h2>Niveau atteint</h2>
          <p>+{{ run.levelUpModal.gained }} niveau(x) - niveau actuel {{ run.levelUpModal.level }}</p>
          <p>Points passifs actuels: {{ run.player.passivePoints }}</p>
          <div v-if="run.levelUpModal.newSkills.length">
            <h3>Nouvelles competences</h3>
            <ul>
              <li v-for="entry in run.levelUpModal.newSkills" :key="entry">{{ entry }}</li>
            </ul>
          </div>
          <button class="primary" @click="closeLevelUp">Continuer</button>
        </article>
      </div>

      <div v-if="run.gameOver" class="overlay-end">
        <div class="end-card">
          <h2 v-if="run.victory">Victoire</h2>
          <h2 v-else-if="run.hardcoreDeath">Defaite Hardcore</h2>
          <h2 v-else>Run terminee</h2>
          <p>Niveau {{ run.player.level }} / classe {{ run.player.classId }} / morts {{ run.player.deaths }}</p>
          <button class="primary" @click="run = null; npcOpen = false; closeMetaModals()">Retour au menu</button>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
:global(body) {
  margin: 0;
  min-height: 100vh;
  font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, serif;
  background:
    radial-gradient(circle at 10% 12%, rgba(16, 93, 106, 0.22), transparent 34%),
    radial-gradient(circle at 78% 18%, rgba(170, 72, 34, 0.2), transparent 36%),
    linear-gradient(150deg, #070c11 5%, #10222b 52%, #2b1712 100%);
  color: #f5f0dc;
}

.layout {
  min-height: 100vh;
  padding: 20px;
  box-sizing: border-box;
}

.loading-screen,
.menu-screen,
.game-screen {
  max-width: 1500px;
  margin: 0 auto;
}

.menu-header {
  padding: 18px 20px;
  border: 1px solid rgba(251, 205, 144, 0.34);
  background: linear-gradient(130deg, rgba(23, 38, 45, 0.8), rgba(53, 24, 14, 0.8));
  border-radius: 14px;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.42);
}

.menu-header h1 {
  margin: 0 0 10px;
  font-size: 2rem;
  letter-spacing: 0.07em;
}

.menu-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 14px;
}

.card {
  border: 1px solid rgba(255, 217, 156, 0.22);
  border-radius: 14px;
  padding: 14px;
  background: linear-gradient(140deg, rgba(11, 24, 30, 0.85), rgba(43, 20, 12, 0.76));
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
}

.setup-card label {
  display: grid;
  gap: 4px;
  margin-bottom: 10px;
}

.setup-card input,
.setup-card select {
  border-radius: 8px;
  border: 1px solid rgba(229, 205, 168, 0.4);
  background: rgba(9, 19, 26, 0.9);
  color: #f5f0dc;
  padding: 8px;
}

.class-preview {
  display: flex;
  gap: 10px;
  align-items: center;
  margin: 10px 0;
}

.class-preview img {
  width: 62px;
  height: 62px;
  object-fit: cover;
  image-rendering: pixelated;
  border: 1px solid rgba(255, 203, 115, 0.45);
  border-radius: 10px;
}

.innate-passive {
  margin: 6px 0 0;
  font-size: 0.84rem;
  color: #ffe0a7;
}

button {
  border: 1px solid rgba(252, 213, 150, 0.5);
  border-radius: 9px;
  padding: 7px 10px;
  background: rgba(19, 48, 56, 0.8);
  color: #f4edd8;
  cursor: pointer;
  transition: transform 120ms ease, background 120ms ease;
}

button:hover:enabled {
  transform: translateY(-1px);
  background: rgba(35, 69, 78, 0.95);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button.primary {
  background: linear-gradient(130deg, #0a6f76, #164e75);
}

button.secondary {
  background: linear-gradient(130deg, #3f4d57, #24343d);
}

button.danger {
  background: linear-gradient(130deg, #8a3427, #622319);
}

.db-error {
  margin: 10px 0;
  padding: 9px;
  border-radius: 10px;
  background: rgba(150, 28, 28, 0.35);
  border: 1px solid rgba(255, 91, 91, 0.5);
}

.history-list,
.progress-card ul,
.materials ul,
.inventory ul,
.short-log ul,
.meta-modal ul,
.combat-log-panel ul {
  margin: 0;
  padding-left: 16px;
  display: grid;
  gap: 6px;
}

.hud {
  display: grid;
  grid-template-columns: 1.2fr 1fr auto;
  gap: 10px;
  border: 1px solid rgba(247, 207, 144, 0.35);
  padding: 12px;
  border-radius: 14px;
  background: linear-gradient(150deg, rgba(8, 24, 31, 0.9), rgba(66, 28, 17, 0.88));
}

.hud h1 {
  margin: 0;
  font-size: 1.45rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.hud-stats {
  display: grid;
  grid-template-columns: repeat(2, auto);
  align-content: center;
  gap: 6px 10px;
  font-size: 0.92rem;
}

.hud-actions {
  display: grid;
  gap: 6px;
  align-content: center;
}

.columns {
  margin-top: 12px;
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: 12px;
}

.world-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.world-header h2 {
  margin: 0;
}

.map-grid {
  margin-top: 8px;
  display: grid;
  gap: 2px;
  padding: 6px;
  border-radius: 12px;
  border: 1px solid rgba(239, 199, 131, 0.3);
  background-size: 170px 170px;
}

.tile-btn {
  height: 28px;
  min-width: 24px;
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 4px;
  padding: 0;
  font-size: 0.67rem;
  background: rgba(45, 82, 76, 0.36);
  display: grid;
  place-items: center;
  overflow: hidden;
}

.tile-entity {
  width: 100%;
  height: 100%;
  object-fit: cover;
  image-rendering: pixelated;
}

.tile-symbol {
  font-weight: 700;
  font-size: 0.68rem;
  color: #f6efda;
}

.tile-btn.wall {
  background: rgba(81, 56, 34, 0.83);
}

.tile-btn.water {
  background: rgba(20, 72, 102, 0.85);
}

.tile-btn.player {
  background: rgba(18, 157, 145, 0.93);
  color: #041214;
  font-weight: 700;
}

.tile-btn.enemy {
  background: rgba(156, 52, 30, 0.92);
}

.tile-btn.npc {
  background: rgba(159, 124, 56, 0.9);
}

.tile-btn.resource {
  background: rgba(34, 120, 71, 0.9);
}

.tile-btn.chest {
  background: rgba(181, 129, 40, 0.92);
}

.tile-btn.exit {
  background: rgba(166, 164, 72, 0.9);
}

.tile-btn.secret {
  background: rgba(68, 119, 168, 0.93);
}

.tile-btn.back {
  background: rgba(96, 95, 165, 0.92);
}

.tile-btn.fog {
  background: rgba(4, 8, 12, 0.95);
  border-color: rgba(255, 255, 255, 0.01);
}

.legend {
  display: grid;
  grid-template-columns: repeat(4, auto);
  gap: 4px 8px;
  font-size: 0.8rem;
  margin-top: 6px;
}

.controls {
  margin-top: 8px;
  display: grid;
  gap: 6px;
}

.dir-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  max-width: 260px;
}

.quick-status {
  margin-top: 8px;
  font-size: 0.9rem;
}

.npc-box {
  margin-top: 10px;
  border: 1px solid rgba(251, 212, 145, 0.34);
  border-radius: 10px;
  padding: 8px;
  background: rgba(12, 23, 31, 0.74);
}

.npc-head {
  display: flex;
  gap: 9px;
}

.npc-head img {
  width: 52px;
  height: 52px;
  border-radius: 9px;
  object-fit: cover;
  image-rendering: pixelated;
}

.npc-actions {
  margin-top: 7px;
  display: grid;
  gap: 5px;
}

.equipment-grid {
  display: grid;
  gap: 8px;
}

.equip-slot {
  border: 1px solid rgba(241, 197, 128, 0.25);
  border-radius: 10px;
  padding: 8px;
}

.equip-slot h3 {
  margin: 0 0 6px;
}

.equip-item {
  display: flex;
  gap: 8px;
}

.equip-item img,
.item-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  object-fit: cover;
  image-rendering: pixelated;
  border: 1px solid rgba(255, 203, 131, 0.35);
}

.inventory li {
  display: flex;
  gap: 8px;
  border: 1px solid rgba(241, 197, 128, 0.2);
  border-radius: 8px;
  padding: 6px;
  background: rgba(10, 18, 26, 0.5);
}

.item-main p {
  margin: 2px 0;
}

.item-affix {
  font-size: 0.76rem;
  color: #bde7ff;
}

.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.short-log {
  margin-top: 12px;
  border: 1px solid rgba(241, 197, 128, 0.2);
  border-radius: 10px;
  padding: 8px;
  max-height: 220px;
  overflow: auto;
  background: rgba(8, 16, 22, 0.7);
}

.exit-buttons {
  margin-top: 10px;
  display: grid;
  gap: 6px;
}

.overlay-combat,
.overlay-meta,
.overlay-end {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
}

.overlay-combat {
  background: rgba(1, 5, 10, 0.78);
  z-index: 40;
}

.combat-modal {
  width: min(96vw, 1240px);
  max-height: 92vh;
  overflow: auto;
  border-radius: 14px;
  border: 1px solid rgba(252, 208, 135, 0.4);
  background: linear-gradient(150deg, rgba(6, 20, 28, 0.96), rgba(50, 16, 11, 0.96));
  padding: 14px;
  box-shadow: 0 20px 44px rgba(0, 0, 0, 0.55);
}

.combat-modal-head {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
}

.enemy-head {
  display: flex;
  gap: 10px;
}

.enemy-head img {
  width: 88px;
  height: 88px;
  border-radius: 10px;
  object-fit: cover;
  image-rendering: pixelated;
  border: 1px solid rgba(255, 198, 133, 0.4);
}

.player-head {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.player-head img {
  width: 88px;
  height: 88px;
  border-radius: 10px;
  object-fit: cover;
  image-rendering: pixelated;
  border: 1px solid rgba(159, 218, 255, 0.45);
}

.combat-modal-body {
  margin-top: 10px;
  display: grid;
  grid-template-columns: 1.25fr 1fr;
  gap: 10px;
}

.ap-line {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.ap-pill {
  display: inline-block;
  border: 1px solid rgba(255, 214, 137, 0.7);
  border-radius: 999px;
  padding: 2px 10px;
  background: rgba(25, 97, 121, 0.8);
  color: #fff2ca;
  font-weight: 700;
}

.ap-pill.enemy {
  background: rgba(146, 58, 33, 0.82);
}

.combat-actions-panel,
.combat-log-panel {
  border: 1px solid rgba(240, 198, 123, 0.24);
  border-radius: 10px;
  padding: 10px;
  background: rgba(8, 18, 24, 0.65);
}

.combat-actions-row,
.skills-grid,
.potions-grid {
  display: grid;
  gap: 6px;
}

.skills-grid button {
  text-align: left;
}

.end-turn-btn {
  border-color: rgba(255, 236, 141, 0.9);
  background: linear-gradient(130deg, #b4691a, #e59b2f);
  color: #231106;
  font-weight: 700;
  animation: pulse-turn 1.3s ease-in-out infinite;
}

@keyframes pulse-turn {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.03);
  }
}

.skills-grid small {
  display: block;
  margin-top: 3px;
  font-size: 0.72rem;
  opacity: 0.9;
}

.combat-log-panel {
  max-height: 65vh;
  overflow: auto;
}

.combat-log-panel li {
  border-left: 3px solid transparent;
  padding-left: 6px;
}

.combat-log-panel li.log-player {
  color: #9fe0ff;
}

.combat-log-panel li.log-enemy {
  color: #ffc48f;
}

.combat-log-panel li.log-damage {
  border-left-color: rgba(255, 121, 90, 0.8);
}

.combat-log-panel li.log-received {
  color: #ff8f8f;
}

.combat-log-panel li.log-crit {
  color: #ffe27e;
  font-weight: 700;
}

.combat-log-panel li.log-heal {
  color: #9df5b8;
}

.combat-log-panel li.log-status {
  color: #d3b2ff;
}

.overlay-meta {
  background: rgba(2, 8, 13, 0.72);
  z-index: 55;
}

.meta-modal {
  width: min(90vw, 720px);
  max-height: 88vh;
  overflow: auto;
  border-radius: 12px;
  border: 1px solid rgba(247, 204, 133, 0.38);
  background: linear-gradient(150deg, rgba(13, 30, 38, 0.96), rgba(51, 20, 15, 0.95));
  padding: 14px;
}

.npc-modal {
  width: min(90vw, 620px);
}

.meta-modal li {
  border: 1px solid rgba(244, 203, 138, 0.22);
  border-radius: 8px;
  padding: 8px;
  background: rgba(11, 20, 27, 0.56);
}

.riddle-options {
  display: grid;
  gap: 7px;
  margin-bottom: 8px;
}

.levelup-modal {
  text-align: center;
}

.overlay-end {
  background: rgba(2, 5, 9, 0.72);
  z-index: 70;
}

.end-card {
  width: min(90vw, 430px);
  padding: 20px;
  border-radius: 14px;
  border: 1px solid rgba(255, 203, 126, 0.45);
  background: linear-gradient(145deg, rgba(21, 37, 43, 0.95), rgba(58, 22, 15, 0.95));
  text-align: center;
}

.info-msg {
  margin-top: 8px;
  padding: 8px;
  border-radius: 9px;
  background: rgba(18, 83, 98, 0.35);
  border: 1px solid rgba(127, 215, 238, 0.4);
}

@media (max-width: 1200px) {
  .columns {
    grid-template-columns: 1fr;
  }

  .menu-grid {
    grid-template-columns: 1fr;
  }

  .hud {
    grid-template-columns: 1fr;
  }

  .combat-modal-body {
    grid-template-columns: 1fr;
  }
}
</style>
