// scripts/tests/dossierDriveCorrespondance.test.mjs
//
// Le dossier Drive trouvé correspond-il bien à CE logement ?
// Les noms de dossiers utilisés ici sont RÉELS (relevés dans
// « 2. DOSSIERS PROPRIETAIRES »), et les valeurs de fiche viennent de la base :
// c'est ce corpus qui a montré que les deux sources divergent toujours sur la
// forme (« Hermanville-sur-Mer, » en base, « Hermanville sur Mer » sur le Drive).
//
// Exécution : npm test   (node --test, aucun appel réseau)

import test from 'node:test'
import assert from 'node:assert/strict'
import { chargerModule } from './_chargerModule.mjs'

const { evaluerCorrespondanceDossier, normaliserPourComparaison } =
  await chargerModule('../../src/lib/dossierDriveCorrespondance.js')

test('normalisation : accents, casse, tirets et ponctuation', () => {
  assert.equal(normaliserPourComparaison('Hermanville-sur-Mer,'), 'hermanville sur mer')
  assert.equal(normaliserPourComparaison('Hérouville Saint Clair'), 'herouville saint clair')
  assert.equal(normaliserPourComparaison("Sallèles-d'Aude"), 'salleles d aude')
  assert.equal(normaliserPourComparaison(null), '')
})

test('vert : le dossier correspond au proprietaire et a la ville de la fiche', () => {
  // Cas réel : fiche 2173 en base contre son dossier Drive.
  const r = evaluerCorrespondanceDossier({
    nomDossier: '2173. Mustapha ZINOUN - Hermanville sur Mer',
    proprietaireNom: 'ZINOUN',
    ville: 'Hermanville-sur-Mer,',
  })
  assert.equal(r.etat, 'correspond')
})

test('vert : code postal accole a la ville dans le nom du dossier', () => {
  const r = evaluerCorrespondanceDossier({
    nomDossier: '2282. Marie-Amélie CHENAVAS - Vaulnaveys-le-Haut 38410',
    proprietaireNom: 'CHENAVAS',
    ville: 'Vaulnaveys-le-Haut',
  })
  assert.equal(r.etat, 'correspond')
})

test('vert : deux proprietaires dans le nom du dossier', () => {
  const r = evaluerCorrespondanceDossier({
    nomDossier: '2135. Mickaël DULAC / Stéphanie DULAC - Prayssac',
    proprietaireNom: 'DULAC',
    ville: 'Prayssac',
  })
  assert.equal(r.etat, 'correspond')
})

test('ROUGE : meme proprietaire, autre ville — deux biens du meme hote', () => {
  // Le piege que le controle doit attraper : ZINOUN a le bien 2172 (Herouville)
  // et le 2173 (Hermanville). Se tromper de numero tombe sur un dossier au bon
  // proprietaire mais au mauvais logement.
  const r = evaluerCorrespondanceDossier({
    nomDossier: '2172. Mustapha ZINOUN - Hérouville Saint Clair',
    proprietaireNom: 'ZINOUN',
    ville: 'Hermanville-sur-Mer,',
  })
  assert.equal(r.etat, 'autre_bien')
  assert.equal(r.motif, 'VILLE_DIFFERENTE')
})

test('ROUGE : autre proprietaire, meme ville', () => {
  const r = evaluerCorrespondanceDossier({
    nomDossier: '2286. Anne TIMTCHENKO - La Ciotat',
    proprietaireNom: 'LEPLAT',
    ville: 'La Ciotat',
  })
  assert.equal(r.etat, 'autre_bien')
  assert.equal(r.motif, 'PROPRIETAIRE_DIFFERENT')
})

test('ROUGE : ni le proprietaire ni la ville ne correspondent', () => {
  const r = evaluerCorrespondanceDossier({
    nomDossier: '2150. Louis LEPLAT - Nantes',
    proprietaireNom: 'ZINOUN',
    ville: 'Hermanville-sur-Mer',
  })
  assert.equal(r.etat, 'autre_bien')
  assert.equal(r.motif, 'AUCUNE_CORRESPONDANCE')
})

test('ORANGE : le dossier ne porte aucune ville, on ne contredit pas', () => {
  const r = evaluerCorrespondanceDossier({
    nomDossier: '7755. Jacky MARTIN (Test Automatisation)',
    proprietaireNom: 'MARTIN',
    ville: 'Bordeaux',
  })
  assert.equal(r.etat, 'incertain')
  assert.equal(r.motif, 'DOSSIER_SANS_VILLE')
})

test('ORANGE : la fiche n a ni proprietaire ni ville a comparer', () => {
  const r = evaluerCorrespondanceDossier({
    nomDossier: '2150. Louis LEPLAT - Nantes',
    proprietaireNom: '',
    ville: '   ',
  })
  assert.equal(r.etat, 'incertain')
  assert.equal(r.motif, 'FICHE_SANS_REFERENCE')
})

test('fiche partiellement renseignee : la seule information disponible tranche', () => {
  // Ville connue, proprietaire absent de la fiche : on ne peut pas exiger le nom.
  const correspond = evaluerCorrespondanceDossier({
    nomDossier: '2150. Louis LEPLAT - Nantes', proprietaireNom: '', ville: 'Nantes',
  })
  assert.equal(correspond.etat, 'correspond')

  const contredit = evaluerCorrespondanceDossier({
    nomDossier: '2150. Louis LEPLAT - Nantes', proprietaireNom: '', ville: 'Lyon',
  })
  assert.equal(contredit.etat, 'autre_bien')
})
