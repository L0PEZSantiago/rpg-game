# Chroniques du Voile Brise

Prototype RPG tactique (Vue 3 + Vite) avec base SQLite embarquee (`sql.js`) pour preparer une evolution vers executable desktop.

## Fonctionnalites implementees

- 7 classes jouables:
  - mage
  - druide
  - assassin
  - guerrier
  - archer
  - necromant
  - barde
- 5 competences par classe, debloquees avec le niveau.
- Arbre passif par classe avec prerequis + points passifs.
- 3 difficultes:
  - normal
  - difficile
  - hardcore (mort definitive, sauvegarde supprimee)
- Combat tour par tour type tactique (PA/PM, portee, cooldowns, dots, buffs, debuffs).
- Attaque normale (2 PA) basee sur la portee de l'arme equipee.
- Fuite de combat avec taux de succes dynamique selon l'ennemi.
- Brouillard de guerre sur les zones non decouvertes.
- Plusieurs maps + maps secretes.
- Sortie de map verrouillee tant que le boss de la map n est pas tue.
- Loot aleatoire avec raretes:
  - commun
  - peu commun
  - rare
  - epique
  - legendaire
  - mythique (boss uniquement)
- PNJ (lore, soin, marchand, artisanat) avec enigmes occasionnelles.
- Artisanat via recettes.
- Farm de ressources (arbres, minerais, herbes).
- Coffres repartis dans les cartes.
- Modale de combat complete (actions, skills, potions, log).
- Modales separees pour competences et arbre passif.
- Sauvegarde/chargement dans une base SQLite locale.

## Base SQLite

La base est embarquee dans le navigateur via `sql.js`.
Le fichier SQLite est serialise en base64 dans le stockage local et recharge au lancement.

Tables creees:

- `save_state`
- `run_history`

## Lancement

```sh
npm install
npm run dev
```

Build prod:

```sh
npm run build
```

Lint:

```sh
npm run lint
```

## Controles

Exploration:

- `WASD` ou fleches: deplacement
- `E`: interaction PNJ
- `F`: recolte

Combat:

- `1` a `5`: lancer competence
- `X`: attaque normale
- `Q`: se rapprocher
- `R`: reculer
- `V`: tenter de fuir
- `Espace`: finir le tour

## Assets

Le prototype consomme les assets presentes dans `assets/` (sprites persos/ennemis/tiles/armes) directement dans l interface.
