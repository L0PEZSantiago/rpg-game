export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function randomChoice(items) {
  if (!items.length) {
    return null
  }
  return items[randomInt(0, items.length - 1)]
}

export function weightedChoice(entries) {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0)
  if (totalWeight <= 0) {
    return entries[0]?.value ?? null
  }
  let roll = Math.random() * totalWeight
  for (const entry of entries) {
    roll -= entry.weight
    if (roll <= 0) {
      return entry.value
    }
  }
  return entries[entries.length - 1]?.value ?? null
}

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`
}

export function toKey(x, y) {
  return `${x},${y}`
}

export function fromKey(key) {
  const [x, y] = key.split(',').map((part) => Number.parseInt(part, 10))
  return { x, y }
}

export function chance(probability) {
  return Math.random() <= probability
}

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}

export function number(value, fallback = 0) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

