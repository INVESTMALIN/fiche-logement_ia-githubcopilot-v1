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

// Les faux VERTS sont le pire resultat possible : ils envoient les photos dans
// un dossier que plus personne ne verifie. On compare donc des MOTS ENTIERS,
// chacun dans SON segment du nom de dossier.
test('pas de faux vert : un nom plus long ne vaut pas correspondance', () => {
  const r = evaluerCorrespondanceDossier({
    nomDossier: '2150. Jean MARTINEZ - Nantes',
    proprietaireNom: 'MARTIN',
    ville: 'Nantes',
  })
  assert.equal(r.etat, 'autre_bien')
  assert.equal(r.motif, 'PROPRIETAIRE_DIFFERENT')
})

test('pas de faux vert : une ville plus longue ne vaut pas correspondance', () => {
  const r = evaluerCorrespondanceDossier({
    nomDossier: '2150. Louis LEPLAT - Parisot',
    proprietaireNom: 'LEPLAT',
    ville: 'Paris',
  })
  assert.equal(r.etat, 'autre_bien')
  assert.equal(r.motif, 'VILLE_DIFFERENTE')
})

test('pas de faux vert : la ville ne peut pas se reconnaitre dans le proprietaire', () => {
  // « Nantes » n'apparait que dans le segment proprietaire : ce n'est pas la
  // ville du dossier, et ca ne doit pas valider.
  const r = evaluerCorrespondanceDossier({
    nomDossier: '2150. SCI NANTES INVEST - Bordeaux',
    proprietaireNom: 'DUPONT',
    ville: 'Nantes',
  })
  assert.equal(r.etat, 'autre_bien')
  assert.equal(r.motif, 'AUCUNE_CORRESPONDANCE')
})

test('un nom de famille court reste comparable', () => {
  // Les mots de moins de 4 lettres sont ecartes… sauf s'il ne reste rien.
  const correspond = evaluerCorrespondanceDossier({
    nomDossier: '2150. Jean ROY - Nantes', proprietaireNom: 'ROY', ville: 'Nantes',
  })
  assert.equal(correspond.etat, 'correspond')

  const contredit = evaluerCorrespondanceDossier({
    nomDossier: '2150. Jean ROYER - Nantes', proprietaireNom: 'ROY', ville: 'Nantes',
  })
  assert.equal(contredit.etat, 'autre_bien')
})

test('villes composees : un mot commun ne suffit pas', () => {
  // La France est pleine de « Saint- » : un seul mot partage confondrait deux
  // villes differentes, et donnerait un vert au dossier d'un autre logement.
  const r = evaluerCorrespondanceDossier({
    nomDossier: '2150. Louis LEPLAT - Saint Brieuc',
    proprietaireNom: 'LEPLAT',
    ville: 'Saint-Malo',
  })
  assert.equal(r.etat, 'autre_bien')
  assert.equal(r.motif, 'VILLE_DIFFERENTE')
})

test('villes composees : tous les mots identifiants presents = correspondance', () => {
  // Les mots de liaison (« sur », « le ») ne sont pas exiges.
  const r = evaluerCorrespondanceDossier({
    nomDossier: '2173. Mustapha ZINOUN - Hermanville sur Mer',
    proprietaireNom: 'ZINOUN',
    ville: 'Hermanville-sur-Mer,',
  })
  assert.equal(r.etat, 'correspond')
})

test('le vert exige le proprietaire ET la ville, jamais une seule des deux', () => {
  // Ville seule concordante : ne distingue pas deux proprietaires d'une meme
  // ville. On demande une verification plutot que d'affirmer.
  const villeSeule = evaluerCorrespondanceDossier({
    nomDossier: '2150. Louis LEPLAT - Nantes', proprietaireNom: '', ville: 'Nantes',
  })
  assert.equal(villeSeule.etat, 'incertain')
  assert.equal(villeSeule.motif, 'FICHE_SANS_PROPRIETAIRE')

  // Mais une information comparable qui CONTREDIT reste rouge.
  const contredit = evaluerCorrespondanceDossier({
    nomDossier: '2150. Louis LEPLAT - Nantes', proprietaireNom: '', ville: 'Lyon',
  })
  assert.equal(contredit.etat, 'autre_bien')
})

test('rien de comparable : on n accuse pas', () => {
  // Fiche sans proprietaire ET dossier sans ville : aucune des deux references
  // n'est verifiable, dire « autre logement » serait une affirmation gratuite.
  const r = evaluerCorrespondanceDossier({
    nomDossier: '7756. Julien Test V2', proprietaireNom: '', ville: 'Nantes',
  })
  assert.equal(r.etat, 'incertain')
  assert.equal(r.motif, 'DOSSIER_SANS_VILLE')
})
