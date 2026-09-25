// scripts/tests/mondaySyncFeedback.test.mjs
//
// Le bilan affiché après une synchronisation Monday nomme les CHAMPS
// concernés (succès total, partiel, échec) et ne laisse JAMAIS passer une
// valeur : quatre des six champs sont des mots de passe ou des emails de
// propriétaires.
// Exécution : npm test   (node --test, aucune dépendance, aucun appel réseau)

import test from 'node:test'
import assert from 'node:assert/strict'
import { chargerModule } from './_chargerModule.mjs'

const { construireFeedbackMonday, doitAfficherFeedback, MONDAY_FIELD_LABELS } =
  await chargerModule('../../src/lib/mondaySyncFeedback.js')

const MDP_AIRBNB = 'airbnb-secret-XYZ'
const MDP_BOOKING = 'booking-secret-QRS'
const VALEURS = {
  type_premier_menage: 'Vérification / Inventaire',
  type_premiere_maintenance: 'Classique',
  airbnb_mot_passe: MDP_AIRBNB,
  booking_mot_passe: MDP_BOOKING
}

const sansSecret = (feedback) => {
  const s = JSON.stringify({ ...feedback, cle: undefined })
  assert.ok(!s.includes(MDP_AIRBNB), `mot de passe Airbnb dans le bilan : ${s}`)
  assert.ok(!s.includes(MDP_BOOKING), `mot de passe Booking dans le bilan : ${s}`)
}

test('succès total : les champs envoyés sont nommés, aucune valeur', () => {
  const f = construireFeedbackMonday({
    success: true,
    itemId: '1',
    results: [
      { field: 'airbnb_mot_passe', status: 'ok' },
      { field: 'type_premier_menage', status: 'ok' }
    ],
    snapshot: { airbnb_mot_passe: MDP_AIRBNB, type_premier_menage: 'Vérification / Inventaire' },
    snapshotPersiste: true
  }, VALEURS)
  assert.equal(f.type, 'succes')
  assert.equal(f.titre, 'Monday mis à jour')
  assert.match(f.message, /Mot de passe Airbnb et Premiers Ménages envoyés à Monday\./)
  assert.deepEqual(f.champsEnEchec, [])
  sansSecret(f)
})

test('échec partiel : le statut refusé est nommé avec sa raison, les mots de passe passés aussi, réessai annoncé', () => {
  const f = construireFeedbackMonday({
    success: false,
    itemId: '1',
    results: [
      { field: 'type_premier_menage', status: 'error', reason: 'MONDAY_REFUSE', message: 'ColumnValueException ••• …' },
      { field: 'airbnb_mot_passe', status: 'ok' },
      { field: 'booking_mot_passe', status: 'ok' }
    ],
    snapshot: { airbnb_mot_passe: MDP_AIRBNB, booking_mot_passe: MDP_BOOKING },
    snapshotPersiste: true
  }, VALEURS)
  assert.equal(f.type, 'partiel')
  assert.equal(f.titre, 'Sync Monday partielle')
  assert.match(f.message, /Envoyé : Mot de passe Airbnb et Mot de passe Booking\./)
  assert.match(f.message, /Non synchronisé : Premiers Ménages \(refusé par Monday\)\./)
  assert.match(f.message, /Réessai automatique au prochain enregistrement\./)
  assert.deepEqual(f.champsEnEchec.map((c) => c.label), ['Premiers Ménages'])
  sansSecret(f)
})

test('valeur legacy ignorée : avertissement actionnable (re-sélectionner), pas de promesse de réessai', () => {
  const f = construireFeedbackMonday({
    success: false,
    results: [
      { field: 'type_premiere_maintenance', status: 'skipped', reason: 'VALEUR_NON_RECONNUE' },
      { field: 'booking_mot_passe', status: 'ok' }
    ]
  }, VALEURS)
  assert.equal(f.type, 'partiel')
  assert.match(f.message, /Maintenance \(valeur non reconnue par Monday, re-sélectionnez-la dans la liste\)/)
  assert.doesNotMatch(f.message, /Réessai automatique/)
  // La valeur fautive n'apparaît pas dans le message affiché…
  assert.doesNotMatch(f.message, /Classique/)
  // …mais elle entre dans la clé de déduplication (champ non sensible)
  assert.match(f.cle, /type_premiere_maintenance:skipped:VALEUR_NON_RECONNUE=Classique/)
  sansSecret(f)
})

test('dédoublonnage : même avertissement → tu ; valeur corrigée → clé différente → affiché ; succès → toujours affiché et remise à zéro', () => {
  const reponse = {
    success: false,
    results: [{ field: 'type_premiere_maintenance', status: 'skipped', reason: 'VALEUR_NON_RECONNUE' }]
  }
  const premier = construireFeedbackMonday(reponse, VALEURS)
  assert.equal(doitAfficherFeedback(premier, null), true)
  // Autosave suivant, même situation
  const second = construireFeedbackMonday(reponse, VALEURS)
  assert.equal(second.cle, premier.cle)
  assert.equal(doitAfficherFeedback(second, premier.cle), false)
  // La valeur fautive a changé (toujours inconnue) : on ré-avertit
  const troisieme = construireFeedbackMonday(reponse, { ...VALEURS, type_premiere_maintenance: 'Autre legacy' })
  assert.notEqual(troisieme.cle, premier.cle)
  assert.equal(doitAfficherFeedback(troisieme, premier.cle), true)
  // Un succès s'affiche toujours, même répété
  const succes = construireFeedbackMonday({ success: true, results: [{ field: 'booking_mot_passe', status: 'ok' }] }, VALEURS)
  assert.equal(doitAfficherFeedback(succes, succes.cle), true)
  // Un champ ok en plus du même avertissement = contenu différent → affiché
  const mixte = construireFeedbackMonday({
    success: false,
    results: [
      { field: 'type_premiere_maintenance', status: 'skipped', reason: 'VALEUR_NON_RECONNUE' },
      { field: 'airbnb_mot_passe', status: 'ok' }
    ]
  }, VALEURS)
  assert.equal(doitAfficherFeedback(mixte, premier.cle), true)
})

test('la clé de déduplication ne contient jamais un mot de passe, même pour un champ mot de passe en échec', () => {
  const f = construireFeedbackMonday({
    success: false,
    results: [
      { field: 'airbnb_mot_passe', status: 'error', reason: 'MONDAY_REFUSE' },
      { field: 'booking_mot_passe', status: 'skipped', reason: 'VALEUR_NON_RECONNUE' }
    ]
  }, VALEURS)
  assert.ok(!f.cle.includes(MDP_AIRBNB))
  assert.ok(!f.cle.includes(MDP_BOOKING))
  sansSecret(f)
})

test('échec total par champ : tous nommés, réessai annoncé', () => {
  const f = construireFeedbackMonday({
    success: false,
    results: [
      { field: 'type_premier_menage', status: 'error', reason: 'ITEM_NOT_FOUND' },
      { field: 'airbnb_mot_passe', status: 'error', reason: 'ITEM_NOT_FOUND' }
    ]
  }, VALEURS)
  assert.equal(f.type, 'echec')
  assert.equal(f.titre, 'Sync Monday impossible')
  assert.match(f.message, /Premiers Ménages \(aucune ligne Monday pour ce numéro de bien\) et Mot de passe Airbnb/)
  assert.match(f.message, /Réessai automatique/)
  sansSecret(f)
})

test('échecs globaux sans détail : réseau, numéro périmé, fiche introuvable', () => {
  const reseau = construireFeedbackMonday({ success: false, error: 'NETWORK', message: 'Failed to fetch' }, VALEURS)
  assert.equal(reseau.type, 'echec')
  assert.match(reseau.message, /Réessai automatique au prochain enregistrement/)

  const numero = construireFeedbackMonday({ success: false, error: 'NUMERO_BIEN_CHANGE', message: '…' }, VALEURS)
  assert.match(numero.message, /numéro de bien de cette fiche a changé/)
  assert.match(numero.message, /rien n'a été envoyé à Monday/)

  const introuvable = construireFeedbackMonday({ success: false, error: 'FICHE_INTROUVABLE', message: '…' }, VALEURS)
  assert.match(introuvable.message, /non autorisée/)

  // Même clé pour la même panne → pas de répétition à chaque autosave
  assert.equal(doitAfficherFeedback(reseau, reseau.cle), false)
})

test('rien à pousser : aucun bilan', () => {
  assert.equal(construireFeedbackMonday({ success: true, itemId: null, results: [], snapshot: {}, snapshotPersiste: false }, VALEURS), null)
})

test('ancien contrat de l\'Edge Function (pas encore redéployée) : succès global lisible, échec lisible', () => {
  const ok = construireFeedbackMonday({ success: true, itemId: '1', updatedColumns: ['statut47'] }, VALEURS)
  assert.equal(ok.type, 'succes')
  const ko = construireFeedbackMonday({ success: false, error: 'ITEM_NOT_FOUND', message: 'Aucun item' }, VALEURS)
  assert.equal(ko.type, 'echec')
})

test('réponse illisible : échec, jamais d\'exception', () => {
  for (const r of [null, undefined, 'texte', 42]) {
    const f = construireFeedbackMonday(r, VALEURS)
    assert.equal(f.type, 'echec')
  }
})

test('les 6 champs ont un libellé lisible', () => {
  assert.deepEqual(Object.keys(MONDAY_FIELD_LABELS).sort(), [
    'airbnb_email', 'airbnb_mot_passe', 'booking_email', 'booking_mot_passe', 'type_premier_menage', 'type_premiere_maintenance'
  ])
  assert.equal(MONDAY_FIELD_LABELS.airbnb_email, 'Identifiant Airbnb')
  assert.equal(MONDAY_FIELD_LABELS.booking_email, 'Identifiant Booking')
})

test('identifiants : nommés dans le bilan, valeur absente du message ET de la clé de déduplication', () => {
  const EMAIL_AIRBNB = 'proprio.perso@example.test'
  const EMAIL_BOOKING = 'bien-7755@letahost.example.test'
  const valeurs = { ...VALEURS, airbnb_email: EMAIL_AIRBNB, booking_email: EMAIL_BOOKING }
  const f = construireFeedbackMonday({
    success: false,
    results: [
      { field: 'airbnb_email', status: 'error', reason: 'MONDAY_REFUSE', message: 'invalid •••' },
      { field: 'booking_email', status: 'ok' }
    ]
  }, valeurs)
  assert.equal(f.type, 'partiel')
  assert.match(f.message, /Envoyé : Identifiant Booking\. Non synchronisé : Identifiant Airbnb \(refusé par Monday\)\./)
  const tout = JSON.stringify(f)
  assert.ok(!tout.includes(EMAIL_AIRBNB), `email Airbnb dans le bilan : ${tout}`)
  assert.ok(!tout.includes(EMAIL_BOOKING), `email Booking dans le bilan : ${tout}`)
})
