import initSqlJs from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

const DB_STORAGE_KEY = 'rpg.sqlite.binary'
let sql = null
let db = null

function uint8ToBase64(uint8Array) {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

function base64ToUint8(base64String) {
  const binary = atob(base64String)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function ensureSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS save_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS run_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      class_id TEXT NOT NULL,
      level INTEGER NOT NULL,
      result TEXT NOT NULL,
      note TEXT
    );
  `)
}

function persistDbToLocalStorage() {
  if (!db) {
    return
  }
  const binaryArray = db.export()
  localStorage.setItem(DB_STORAGE_KEY, uint8ToBase64(binaryArray))
}

function queryOne(sqlQuery, params = {}) {
  const statement = db.prepare(sqlQuery)
  statement.bind(params)
  const hasRow = statement.step()
  const row = hasRow ? statement.getAsObject() : null
  statement.free()
  return row
}

function queryMany(sqlQuery, params = {}) {
  const statement = db.prepare(sqlQuery)
  statement.bind(params)
  const rows = []
  while (statement.step()) {
    rows.push(statement.getAsObject())
  }
  statement.free()
  return rows
}

export async function initDatabase() {
  if (db) {
    return db
  }

  sql = await initSqlJs({
    locateFile: () => wasmUrl,
  })

  const serializedDb = localStorage.getItem(DB_STORAGE_KEY)
  if (serializedDb) {
    db = new sql.Database(base64ToUint8(serializedDb))
  } else {
    db = new sql.Database()
  }

  ensureSchema()
  persistDbToLocalStorage()
  return db
}

export function saveSnapshot(snapshot) {
  const payload = JSON.stringify(snapshot)
  const now = new Date().toISOString()
  db.run(
    `
      INSERT INTO save_state (id, payload, updated_at)
      VALUES (1, $payload, $updatedAt)
      ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
    `,
    {
      $payload: payload,
      $updatedAt: now,
    },
  )
  persistDbToLocalStorage()
}

export function loadSnapshot() {
  const row = queryOne('SELECT payload, updated_at FROM save_state WHERE id = 1')
  if (!row) {
    return null
  }
  try {
    return {
      snapshot: JSON.parse(row.payload),
      updatedAt: row.updated_at,
    }
  } catch {
    return null
  }
}

export function clearSnapshot() {
  db.run('DELETE FROM save_state WHERE id = 1')
  persistDbToLocalStorage()
}

export function logRun({ difficulty, classId, level, result, note = '' }) {
  db.run(
    `
      INSERT INTO run_history (created_at, difficulty, class_id, level, result, note)
      VALUES ($createdAt, $difficulty, $classId, $level, $result, $note)
    `,
    {
      $createdAt: new Date().toISOString(),
      $difficulty: difficulty,
      $classId: classId,
      $level: level,
      $result: result,
      $note: note,
    },
  )
  persistDbToLocalStorage()
}

export function listRunHistory(limit = 8) {
  return queryMany(
    `
      SELECT created_at AS createdAt, difficulty, class_id AS classId, level, result, note
      FROM run_history
      ORDER BY id DESC
      LIMIT $limit
    `,
    { $limit: limit },
  )
}

export function exportRawDatabaseBase64() {
  const exported = db.export()
  return uint8ToBase64(exported)
}

