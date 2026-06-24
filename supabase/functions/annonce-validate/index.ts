// supabase/functions/annonce-validate/index.ts
//
// PR3 du chantier agent annonce : la VALIDATION = push du PDF de l'annonce
// directement sur Monday, puis passage du statut à `valide`. Remplace à terme
// l'assistant n8n + le scénario Make `make_pdf_assistants` (qui restent intacts
// et officiels pour cette PR).
//
// Flux :
//   1. Auth verify_jwt (défaut) + ownership RLS-aware : on lit l'annonce et la
//      fiche sous le client "user". Le numéro de bien (cible Monday) est résolu
//      CÔTÉ SERVEUR depuis la fiche, jamais pris du client.
//   2. Résolution de l'item Monday par num_ro (même logique que monday-sync).
//   3. Push du PDF (reçu en base64) dans la colonne fichier de la plateforme :
//      REMPLACEMENT = clear_all puis add_file_to_column → exactement un fichier,
//      zéro doublon, robuste quel que soit le comportement append/replace de Monday.
//   4. Statut agent_outputs → `valide` (service role) UNIQUEMENT si le push a
//      réussi. Si le push échoue : erreur claire et loud, statut inchangé (le
//      statut ne ment jamais — doctrine de préservation du chantier).
//
// Le PDF est fabriqué CÔTÉ FRONT (jsPDF, header Letahost) ; cette fonction ne fait
// que le transporter sur Monday. Le secret MONDAY_API_TOKEN est réutilisé (idem
// monday-sync / monday-contacts-sync), aucun nouveau secret.

// @ts-ignore — Deno runtime
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts'

// ───────────────────── Configuration Monday ─────────────────────
const MONDAY_API = 'https://api.monday.com/v2'
const MONDAY_FILE_API = 'https://api.monday.com/v2/file'
const MONDAY_API_VERSION = '2024-01'
const BOARD_ID = '1272144935'
const NUMERO_COLUMN = 'num_ro' // colonne numbers, clé de lookup (idem monday-sync)

// Colonnes fichier cibles sur le board Clients, une par plateforme.
const FILE_COLUMN_BY_PLATEFORME: Record<string, string> = {
  airbnb: 'file_mm4mzwzj', // « Fiche de contenu pour création d'annonce Airbnb »
  booking: 'file_mm4mwwez', // « Fiche de contenu pour création d'annonce Booking »
}

const SUPPORTED_PLATEFORMES = new Set(Object.keys(FILE_COLUMN_BY_PLATEFORME))

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// deno-lint-ignore no-explicit-any
function json(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
  })
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))

// ───────────────────── Helpers Monday (mirroir de monday-sync) ─────────────────────
// Réimplémentés ici volontairement pour ne PAS toucher monday-sync (fonction
// critique en prod). Même endpoint, même version d'API, même lookup par num_ro.

// deno-lint-ignore no-explicit-any
async function mondayQuery(token: string, query: string, variables: Record<string, unknown>): Promise<any> {
  const res = await fetch(MONDAY_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': token, 'API-Version': MONDAY_API_VERSION },
    body: JSON.stringify({ query, variables }),
  })
  const data = await res.json()
  if (data.errors?.length) throw new Error(`Monday GraphQL: ${JSON.stringify(data.errors)}`)
  if (!res.ok) throw new Error(`Monday HTTP ${res.status}: ${JSON.stringify(data)}`)
  return data.data
}

async function findItemByNumeroBien(token: string, numero: string): Promise<string | null> {
  const query = `
    query ($boardId: ID!, $columnId: String!, $value: String!) {
      items_page_by_column_values(
        board_id: $boardId,
        columns: [{ column_id: $columnId, column_values: [$value] }]
      ) { items { id name } }
    }
  `
  const data = await mondayQuery(token, query, { boardId: BOARD_ID, columnId: NUMERO_COLUMN, value: numero })
  const items = data?.items_page_by_column_values?.items || []
  if (items.length === 0) return null
  if (items.length > 1) {
    console.warn(`[annonce-validate] ${items.length} items pour num_ro=${numero}, prend le premier (${items[0].id})`)
  }
  return items[0].id as string
}

/** Vide la colonne fichier (clear_all) — 1re moitié du REMPLACEMENT sans doublon. */
async function clearFileColumn(token: string, itemId: string, columnId: string): Promise<void> {
  const query = `
    mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
      change_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) { id }
    }
  `
  await mondayQuery(token, query, { boardId: BOARD_ID, itemId, columnId, value: JSON.stringify({ clear_all: true }) })
}

/** Ajoute le PDF dans la colonne fichier (multipart) — 2de moitié du REMPLACEMENT. */
async function addFileToColumn(
  token: string,
  itemId: string,
  columnId: string,
  bytes: Uint8Array,
  fileName: string,
): Promise<string> {
  // item_id (numérique, fourni par Monday) et column_id (constante interne) sont
  // injectés en littéraux ; seul le fichier passe en variable ($file), conformément
  // au endpoint /v2/file de Monday (champ multipart `variables[file]`).
  const query = `mutation ($file: File!) { add_file_to_column (item_id: ${itemId}, column_id: "${columnId}", file: $file) { id } }`
  const form = new FormData()
  form.append('query', query)
  // decodeBase64 renvoie Uint8Array<ArrayBufferLike> ; le constructeur File de Deno
  // attend un BlobPart (buffer non partagé). Le cast lève l'ambiguïté de typage —
  // à l'exécution le buffer est un ArrayBuffer normal.
  const filePart = new File([bytes as unknown as BlobPart], fileName, { type: 'application/pdf' })
  form.append('variables[file]', filePart)
  const res = await fetch(MONDAY_FILE_API, {
    method: 'POST',
    // Pas de Content-Type manuel : FormData pose le boundary multipart lui-même.
    headers: { 'Authorization': token, 'API-Version': MONDAY_API_VERSION },
    body: form,
  })
  const data = await res.json()
  if (data.errors?.length) throw new Error(`Monday file upload: ${JSON.stringify(data.errors)}`)
  if (!res.ok) throw new Error(`Monday file HTTP ${res.status}: ${JSON.stringify(data)}`)
  return data?.data?.add_file_to_column?.id
}

// ───────────────────── Handler ─────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ success: false, error: 'BAD_REQUEST', message: 'Method not allowed' }, 405)

  // @ts-ignore — Deno global
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  // @ts-ignore — Deno global
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  // @ts-ignore — Deno global
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  // @ts-ignore — Deno global
  const mondayToken = Deno.env.get('MONDAY_API_TOKEN')
  if (!supabaseUrl || !serviceKey || !anonKey) {
    console.error('[annonce-validate] clés Supabase incomplètes')
    return json({ success: false, error: 'SERVER_CONFIG', message: 'Config serveur Supabase incomplète' }, 500)
  }
  if (!mondayToken) {
    console.error('[annonce-validate] MONDAY_API_TOKEN manquant')
    return json({ success: false, error: 'SERVER_CONFIG', message: 'Token Monday absent côté serveur' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ success: false, error: 'UNAUTHORIZED', message: 'Authorization header manquant' }, 401)

  // deno-lint-ignore no-explicit-any
  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ success: false, error: 'BAD_REQUEST', message: 'JSON invalide' }, 400)
  }

  const ficheId: unknown = body?.ficheId
  if (!ficheId || typeof ficheId !== 'string') {
    return json({ success: false, error: 'BAD_REQUEST', message: 'ficheId manquant ou invalide' }, 400)
  }
  const plateforme: string = typeof body?.plateforme === 'string' ? body.plateforme.trim() : ''
  if (!SUPPORTED_PLATEFORMES.has(plateforme)) {
    return json({ success: false, error: 'BAD_REQUEST', message: `Plateforme inconnue: ${plateforme}` }, 400)
  }
  const pdfBase64: unknown = body?.pdfBase64
  if (!pdfBase64 || typeof pdfBase64 !== 'string') {
    return json({ success: false, error: 'BAD_REQUEST', message: 'pdfBase64 manquant ou invalide' }, 400)
  }

  // Décodage + garde-fou : le payload doit être un vrai PDF.
  let bytes: Uint8Array
  try {
    bytes = decodeBase64(pdfBase64)
  } catch {
    return json({ success: false, error: 'BAD_REQUEST', message: 'pdfBase64 non décodable' }, 400)
  }
  const magic = String.fromCharCode(...bytes.slice(0, 4))
  if (bytes.length === 0 || magic !== '%PDF') {
    return json({ success: false, error: 'BAD_REQUEST', message: 'Le fichier fourni n\'est pas un PDF' }, 400)
  }

  const columnId = FILE_COLUMN_BY_PLATEFORME[plateforme]

  // 1) Ownership + état : lecture SOUS RLS (client user). L'annonce doit exister et
  //    être valide en forme ; le numéro de bien est résolu côté serveur.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })

  const { data: row, error: rowErr } = await userClient
    .from('agent_outputs')
    .select('statut, output_assemble, generation_meta')
    .eq('fiche_id', ficheId)
    .eq('plateforme', plateforme)
    .maybeSingle()
  if (rowErr) {
    console.error('[annonce-validate] lecture agent_outputs échouée:', rowErr)
    return json({ success: false, error: 'DB_READ_ERROR', message: rowErr.message }, 502)
  }
  if (!row) {
    return json({ success: false, error: 'NOT_FOUND', message: 'Aucune annonce pour cette plateforme (ou accès refusé)' }, 404)
  }
  if (row.statut === 'erreur' || row.output_assemble == null) {
    return json({ success: false, error: 'NOT_VALIDATABLE', message: 'Aucune annonce valide à valider' }, 409)
  }

  const { data: fiche, error: ficheErr } = await userClient
    .from('fiches')
    .select('logement_numero_bien')
    .eq('id', ficheId)
    .maybeSingle()
  if (ficheErr) {
    console.error('[annonce-validate] lecture fiche échouée:', ficheErr)
    return json({ success: false, error: 'DB_READ_ERROR', message: ficheErr.message }, 502)
  }
  const numero = String(fiche?.logement_numero_bien ?? '').trim()
  if (!numero) {
    // Cas qui ne devrait pas exister par construction (numéro importé de Monday à
    // la création), mais on échoue proprement plutôt que de pousser à l'aveugle.
    return json({ success: false, error: 'ITEM_NOT_FOUND', message: 'Fiche sans numéro de bien : item Monday introuvable' }, 404)
  }

  // 2) Résolution de l'item Monday.
  let itemId: string | null
  try {
    itemId = await findItemByNumeroBien(mondayToken, numero)
  } catch (e) {
    console.error(`[annonce-validate] lookup Monday KO fiche=${ficheId}:`, msg(e))
    return json({ success: false, error: 'MONDAY_API_ERROR', message: `Lookup item Monday échoué: ${msg(e)}` }, 502)
  }
  if (!itemId) {
    // Garde-fou loud : item supprimé côté Monday après création de la fiche, etc.
    console.error(`[annonce-validate] item Monday introuvable num_ro=${numero} fiche=${ficheId}`)
    return json({ success: false, error: 'ITEM_NOT_FOUND', message: `Aucun item Monday avec num_ro=${numero} sur le board ${BOARD_ID}` }, 404)
  }

  // 3) Push = REMPLACEMENT sans doublon (clear_all puis add_file_to_column).
  //    FAILURE-ATOMICITÉ DU STATUT : une ligne ne peut valoir `valide` que si le
  //    NOUVEAU PDF est confirmé présent sur la colonne Monday. add_file_to_column
  //    APPEND (la colonne fichier Monday accepte plusieurs fichiers) et il n'existe
  //    pas de suppression CIBLÉE fiable (seul clear_all existe) → impossible
  //    d'« ajouter le nouveau puis retirer l'ancien » sans risque de doublon. Donc
  //    sur une REVALIDATION, si clear réussit puis add échoue, la colonne se
  //    retrouve vide : le statut ne doit JAMAIS rester `valide`, on RÉTROGRADE la
  //    ligne en `genere` (le statut ne ment jamais ; le coordinateur revalide). La
  //    1re validation (déjà `genere`) n'a rien à rétrograder.
  const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const etaitValide = row.statut === 'valide'
  const fileName = `annonce_${plateforme}_${numero}.pdf`
  try {
    await clearFileColumn(mondayToken, itemId, columnId)
    await addFileToColumn(mondayToken, itemId, columnId, bytes, fileName)
  } catch (e) {
    console.error(`[annonce-validate] push Monday KO fiche=${ficheId} item=${itemId} col=${columnId}:`, msg(e))
    let statutApresEchec = 'genere'
    if (etaitValide) {
      // deno-lint-ignore no-explicit-any
      const metaDemote: any = (row.generation_meta && typeof row.generation_meta === 'object') ? { ...row.generation_meta } : {}
      delete metaDemote.validation
      const { error: demoteErr } = await service
        .from('agent_outputs')
        .update({ statut: 'genere', generation_meta: metaDemote, updated_at: new Date().toISOString() })
        .eq('fiche_id', ficheId)
        .eq('plateforme', plateforme)
      if (demoteErr) {
        // Double échec (push + rétrogradation) : on n'affirme PAS `genere` au client,
        // la ligne est restée `valide` en base (rare ; revalidation/reload corrige).
        console.error('[annonce-validate] rétrogradation valide→genere KO après échec push:', demoteErr)
        statutApresEchec = 'valide'
      } else {
        console.warn(`[annonce-validate] revalidation échouée → ligne rétrogradée genere fiche=${ficheId} plateforme=${plateforme}`)
      }
    }
    return json({ success: false, error: 'MONDAY_API_ERROR', message: `Push PDF Monday échoué: ${msg(e)}`, statut: statutApresEchec }, 502)
  }

  // 4) Statut → `valide` (service role) APRÈS un push confirmé.
  //    Note V1 (assumé) : pas de garde de fraîcheur (compare-and-swap) ici. Une
  //    mutation concurrente (autre onglet/utilisateur édite/régénère pendant
  //    l'upload) est un TOCTOU serveur de la même classe que celui déjà accepté
  //    sur monday-contacts-sync / annonce-generate / annonce-edit : proba quasi
  //    nulle, récupérable par revalidation. Follow-up RPC atomique si observé en prod.
  const nowISO = new Date().toISOString()
  // deno-lint-ignore no-explicit-any
  const meta: any = (row.generation_meta && typeof row.generation_meta === 'object') ? row.generation_meta : {}
  meta.validation = { monday_item_id: itemId, monday_column_id: columnId, numero_bien: numero, synced_at: nowISO }

  const { error: upErr } = await service
    .from('agent_outputs')
    .update({ statut: 'valide', generation_meta: meta, updated_at: nowISO })
    .eq('fiche_id', ficheId)
    .eq('plateforme', plateforme)
  if (upErr) {
    // Le PDF est sur Monday mais le statut n'a pas pu être écrit. On remonte
    // l'erreur (statut inchangé : conservateur, jamais un faux `valide`) ; une
    // revalidation re-pousse (remplace) et réécrit le statut.
    console.error('[annonce-validate] update statut=valide échoué (PDF déjà poussé):', upErr)
    return json({ success: false, error: 'DB_WRITE_ERROR', message: upErr.message }, 500)
  }

  console.log(`[annonce-validate] OK fiche=${ficheId} plateforme=${plateforme} item=${itemId} col=${columnId} num_ro=${numero}`)
  return json({
    success: true,
    ficheId,
    plateforme,
    statut: 'valide',
    monday_item_id: itemId,
    monday_column_id: columnId,
  })
})
