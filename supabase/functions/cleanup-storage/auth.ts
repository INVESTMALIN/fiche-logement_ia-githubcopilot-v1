// supabase/functions/cleanup-storage/auth.ts
//
// Garde d'entrée de cleanup-storage, sans dépendance réseau ni environnement
// (testée par auth.test.ts, npm run test:edge).
//
// La fonction est déployée avec verify_jwt = false : depuis la coupure des
// anciennes clés JWT (23/10/2026), la passerelle refuserait le cron. C'est ce
// module qui authentifie, par un secret partagé dédié porté dans l'en-tête
// x-cleanup-secret et comparé en temps constant à CLEANUP_STORAGE_SECRET.

export const SECRET_HEADER = 'x-cleanup-secret'
export const SECRET_ENV = 'CLEANUP_STORAGE_SECRET'

// Un secret plus court est considéré comme une erreur de configuration :
// la fonction refuse de tourner plutôt que d'accepter un secret devinable.
export const MIN_SECRET_LENGTH = 32

export type AuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 500; error: string }

// Comparaison en temps constant : les deux valeurs sont hachées en SHA-256
// (longueur fixe, la longueur du secret ne fuit pas), puis comparées octet par
// octet sans sortie anticipée.
export async function timingSafeEqualString(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder()
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ])
  const va = new Uint8Array(ha)
  const vb = new Uint8Array(hb)
  let diff = 0
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i]
  return diff === 0
}

export async function checkSecret(
  provided: string | null,
  expected: string | undefined,
): Promise<AuthResult> {
  if (!expected || expected.length < MIN_SECRET_LENGTH) {
    return { ok: false, status: 500, error: 'Fonction non configurée' }
  }
  if (!provided) {
    return { ok: false, status: 401, error: 'Non autorisé' }
  }
  if (!(await timingSafeEqualString(provided, expected))) {
    return { ok: false, status: 401, error: 'Non autorisé' }
  }
  return { ok: true }
}

export type DryRunResult =
  | { ok: true; dryRun: boolean }
  | { ok: false; error: string }

// Lecture de la demande de simulation dans le corps de la requête.
// Corps vide ou {} → suppression réelle (comportement historique du cron).
// {"dry_run": true} → simulation. Toute autre forme est refusée plutôt que
// d'être interprétée : un corps illisible ou un "dry_run": "true" (chaîne)
// ne doit jamais retomber silencieusement sur une suppression réelle.
export function parseDryRun(rawBody: string): DryRunResult {
  if (rawBody.trim() === '') return { ok: true, dryRun: false }

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return { ok: false, error: 'Corps JSON invalide' }
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Le corps doit être un objet JSON' }
  }

  const value = (body as Record<string, unknown>).dry_run
  if (value === undefined) return { ok: true, dryRun: false }
  if (typeof value !== 'boolean') {
    return { ok: false, error: 'dry_run doit être un booléen' }
  }
  return { ok: true, dryRun: value }
}
