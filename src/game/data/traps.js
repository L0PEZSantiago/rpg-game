// Pièges de terrain : contrairement aux coffres piégés (surprise, invisibles), ce sont
// des dangers visibles sur la carte, placés par le design de chaque map, que le joueur
// peut repérer et contourner. Ils infligent des dégâts à celui qui marche dessus, et
// sont à usage unique (désamorcés après un premier déclenchement).

export const TRAP_TYPES = {
  spike: {
    id: 'spike',
    label: 'Chausse-trape',
    icon: '/assets/Icons/trap_spike.svg',
    damagePercent: 0.12,
    triggerText: 'Des pointes acérées transpercent vos appuis !',
    debuff: { stat: 'defensePercent', value: 0.15, turns: 2 },
  },
}
