// Client OpenRouter (chat completions). Pur fetch, runnable Deno. La clé est
// passée par l'appelant (lue en secret Supabase côté Edge Function) et n'est
// JAMAIS loggée : toute chaîne d'erreur qui sort d'ici passe par redactSecret.
//
// Coût : OpenRouter renvoie désormais TOUJOURS un objet `usage` dans la réponse
// (le paramètre `usage: { include: true }` est déprécié / sans effet). On lit
// directement usage.cost (crédits OpenRouter ≈ USD), avec les compteurs de tokens.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const TIMEOUT_MS = 60000

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))
const numOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

export class OpenRouterError extends Error {}

export interface OpenRouterUsage {
  prompt_tokens: number | null
  completion_tokens: number | null
  total_tokens: number | null
  /** Coût facturé par OpenRouter, en crédits (≈ USD). null si non fourni. */
  cost: number | null
}

export interface OpenRouterResult {
  content: string
  usage: OpenRouterUsage
  /** Id de génération OpenRouter (debug / réconciliation facturation). */
  generationId: string | null
  finishReason: string | null
  /** Modèle réellement servi par OpenRouter (peut préciser une révision). */
  model: string
}

/**
 * Filet anti-fuite : retire toute trace de la clé d'une chaîne avant log/réponse.
 * Trois passes : la valeur exacte du secret, tout token `sk-or-...` (format des
 * clés OpenRouter), et tout `Bearer <token>`. Défense en profondeur.
 */
export function redactSecret(text: string, secret: string): string {
  let out = text || ''
  if (secret) out = out.split(secret).join('***')
  out = out.replace(/sk-or-[A-Za-z0-9._-]+/g, '***')
  out = out.replace(/(Bearer\s+)\S+/gi, '$1***')
  return out
}

export interface CallOpenRouterInput {
  apiKey: string
  model: string
  system: string
  user: string
  temperature?: number
}

/**
 * Appelle OpenRouter et renvoie le contenu texte brut du modèle + l'usage.
 * Lève OpenRouterError (message déjà redacté) sur timeout, erreur réseau,
 * statut HTTP non-2xx, ou réponse sans contenu.
 */
export async function callOpenRouter(input: CallOpenRouterInput): Promise<OpenRouterResult> {
  const { apiKey, model, system, user, temperature = 0.7 } = input

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // Recommandés par OpenRouter (attribution / classement), sans secret.
        'HTTP-Referer': 'https://letahost.com',
        'X-Title': 'Letahost - Agent annonce',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature,
      }),
      signal: controller.signal,
    })
  } catch (e) {
    const reason = controller.signal.aborted ? `timeout après ${TIMEOUT_MS} ms` : msg(e)
    throw new OpenRouterError(redactSecret(`appel OpenRouter échoué: ${reason}`, apiKey))
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    const bodyText = await res.text().catch(() => '')
    throw new OpenRouterError(redactSecret(`OpenRouter HTTP ${res.status}: ${bodyText.slice(0, 500)}`, apiKey))
  }

  // deno-lint-ignore no-explicit-any
  let data: any
  try {
    data = await res.json()
  } catch (e) {
    throw new OpenRouterError(redactSecret(`réponse OpenRouter illisible: ${msg(e)}`, apiKey))
  }

  const choice = data?.choices?.[0]
  const content = choice?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new OpenRouterError('réponse OpenRouter sans contenu exploitable')
  }

  const u = data?.usage ?? {}
  return {
    content,
    usage: {
      prompt_tokens: numOrNull(u.prompt_tokens),
      completion_tokens: numOrNull(u.completion_tokens),
      total_tokens: numOrNull(u.total_tokens),
      cost: numOrNull(u.cost),
    },
    generationId: typeof data?.id === 'string' ? data.id : null,
    finishReason: typeof choice?.finish_reason === 'string' ? choice.finish_reason : null,
    model: typeof data?.model === 'string' ? data.model : model,
  }
}
