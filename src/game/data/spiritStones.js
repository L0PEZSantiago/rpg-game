// ── Pierres d'esprit ────────────────────────────────────────────────────────
// Ce sont de vrais objets d'inventaire (kind: 'spirit_stone'), classés par
// rareté comme l'équipement. Chaque pierre roule 1 à plusieurs bonus de stats
// aléatoires (parmi EQUIPMENT_BONUS_POOL, economy.js) au moment où elle est
// générée — le nombre et l'ampleur des bonus dépendent de sa rareté.
// Elles se sertissent (glisser-déposer sur desktop, tap-sélection sur mobile)
// dans un emplacement (socket) de l'équipement ; la tentative peut briser la
// pierre, avec un risque croissant selon sa rareté et le mode de difficulté.

// Nombre de bonus de stats roulés à la création de la pierre, selon sa rareté.
export const SPIRIT_STONE_BONUS_COUNT_BY_RARITY = {
  common: 1,
  uncommon: 1,
  rare: 2,
  epic: 2,
  legendary: 3,
  mythic: 4,
}

// Chance de réussite du sertissage (sinon la pierre se brise et est perdue),
// par rareté de la pierre et par mode de difficulté. Les échelons intermédiaires
// (mode "hard") sont interpolés entre normal et hardcore.
export const SPIRIT_STONE_SOCKET_SUCCESS_RATE = {
  common: { normal: 1, hard: 1, hardcore: 1 },
  uncommon: { normal: 0.85, hard: 0.8, hardcore: 0.7 },
  rare: { normal: 0.7, hard: 0.62, hardcore: 0.52 },
  epic: { normal: 0.6, hard: 0.52, hardcore: 0.42 },
  legendary: { normal: 0.55, hard: 0.46, hardcore: 0.36 },
  mythic: { normal: 0.5, hard: 0.4, hardcore: 0.3 },
}

// Nombre d'emplacements générés à la création d'un équipement (loot). Pas
// garanti : `chance` est la probabilité d'obtenir `max` plutôt que `min`.
export const SOCKET_RULES_BY_RARITY = {
  common: { min: 0, max: 0, chance: 0 },
  uncommon: { min: 0, max: 0, chance: 0 },
  rare: { min: 0, max: 1, chance: 0.5 },
  epic: { min: 1, max: 2, chance: 0.5 },
  legendary: { min: 1, max: 2, chance: 0.7 },
  mythic: { min: 2, max: 3, chance: 0.6 },
}

// Plafond d'emplacements atteignable via le Ciseau des esprits (forge),
// indépendant du roll initial.
export const SOCKET_CAP_BY_RARITY = {
  common: 1,
  uncommon: 1,
  rare: 2,
  epic: 2,
  legendary: 3,
  mythic: 3,
}

export const SPIRIT_STONE_ICON = '/assets/Icons/spirit_stone.svg'

// Coût en XP (ponction sur l'XP courante du niveau, jamais de perte de niveau)
// pour qu'un PNJ identificateur révèle les bonus réels d'une pierre non identifiée.
export const IDENTIFY_XP_COST_BY_RARITY = {
  common: 15,
  uncommon: 30,
  rare: 60,
  epic: 120,
  legendary: 220,
  mythic: 400,
}
