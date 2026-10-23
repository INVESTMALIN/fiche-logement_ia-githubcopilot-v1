// supabase/functions/cleanup-storage/auth.test.ts
//
// Preuves de la garde d'entrée, sans réseau ni environnement.
// Exécution : npm run test:edge
//
// Ce qui est prouvé :
//   - sans secret, avec un mauvais secret, ou un secret de longueur différente : 401 ;
//   - secret non configuré ou trop court côté fonction : 500, même si l'appel
//     porte la même valeur (on ne tourne jamais avec un secret devinable) ;
//   - bon secret : accepté ;
//   - dry_run : corps vide ou {} → suppression réelle (comportement du cron),
//     {"dry_run": true} → simulation, toute forme ambiguë → refusée.

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { checkSecret, MIN_SECRET_LENGTH, parseDryRun, timingSafeEqualString } from './auth.ts'

const SECRET = 'a'.repeat(MIN_SECRET_LENGTH) + 'bcdef0123456789'

Deno.test('secret absent → 401', async () => {
  assertEquals(await checkSecret(null, SECRET), { ok: false, status: 401, error: 'Non autorisé' })
  assertEquals(await checkSecret('', SECRET), { ok: false, status: 401, error: 'Non autorisé' })
})

Deno.test('mauvais secret → 401', async () => {
  const wrong = SECRET.slice(0, -1) + 'X'
  assertEquals((await checkSecret(wrong, SECRET)).ok, false)
  assertEquals(await checkSecret(wrong, SECRET), { ok: false, status: 401, error: 'Non autorisé' })
})

Deno.test('secret de longueur différente → 401', async () => {
  assertEquals((await checkSecret(SECRET + 'x', SECRET)).ok, false)
  assertEquals((await checkSecret(SECRET.slice(0, 10), SECRET)).ok, false)
})

Deno.test('secret non configuré ou trop court côté fonction → 500', async () => {
  assertEquals(await checkSecret(SECRET, undefined), { ok: false, status: 500, error: 'Fonction non configurée' })
  assertEquals(await checkSecret('', ''), { ok: false, status: 500, error: 'Fonction non configurée' })
  const short = 'x'.repeat(MIN_SECRET_LENGTH - 1)
  assertEquals((await checkSecret(short, short)).ok, false)
})

Deno.test('bon secret → accepté', async () => {
  assertEquals(await checkSecret(SECRET, SECRET), { ok: true })
})

Deno.test('timingSafeEqualString', async () => {
  assertEquals(await timingSafeEqualString('abc', 'abc'), true)
  assertEquals(await timingSafeEqualString('abc', 'abd'), false)
  assertEquals(await timingSafeEqualString('abc', 'abcd'), false)
  assertEquals(await timingSafeEqualString('', ''), true)
})

Deno.test('dry_run absent → suppression réelle', () => {
  assertEquals(parseDryRun(''), { ok: true, dryRun: false })
  assertEquals(parseDryRun('  '), { ok: true, dryRun: false })
  assertEquals(parseDryRun('{}'), { ok: true, dryRun: false })
})

Deno.test('dry_run booléen respecté', () => {
  assertEquals(parseDryRun('{"dry_run": true}'), { ok: true, dryRun: true })
  assertEquals(parseDryRun('{"dry_run": false}'), { ok: true, dryRun: false })
})

Deno.test('forme ambiguë → refusée, jamais une suppression réelle', () => {
  for (const body of ['{"dry_run": "true"}', '{"dry_run": 1}', '{"dry_run": null}', 'dry_run=true', '{', '[]', 'true', 'null']) {
    assertEquals(parseDryRun(body).ok, false, body)
  }
})
