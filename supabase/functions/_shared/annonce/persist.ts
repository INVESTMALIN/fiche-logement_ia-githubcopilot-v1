// Persistance partagée d'une sortie agent annonce (génération ET édition/retour).
// SOURCE UNIQUE de la doctrine #50 : un ÉCHEC (forme modèle invalide, post-
// traitement Booking vide) ne doit JAMAIS écraser une annonce VALIDE existante.
// Sinon perte de données réelle (un coordinateur régénère / édite, l'appel modèle
// plante, et son annonce valide serait remplacée par une ligne d'erreur sans
// contenu). Première génération — ou trace d'erreur déjà en place — : rien à
// protéger, on garde la trace d'échec (brut inspectable, réessayable).
//
// Mutualisé entre annonce-generate et annonce-edit pour que la doctrine vive à un
// seul endroit. Le PRÉDICAT de décision est pur (testable sans DB) ; seul l'I/O
// (lecture garde + upsert) touche Supabase.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { AirbnbAssembled } from './assemble-airbnb.ts'
import type { BookingAssembled } from './assemble-booking.ts'

/** Forme minimale lue pour la garde anti-écrasement. */
export interface ExistantRow {
  statut: string | null
  output_assemble: unknown
}

/**
 * Une annonce VALIDE existe = statut non-`erreur` ET sortie assemblée présente.
 * Une ligne en `erreur` (output_assemble nul, conservée pour debug) ne protège
 * rien : elle peut être écrasée par une nouvelle trace d'erreur.
 */
export function annonceValideExistante(existant: ExistantRow | null): boolean {
  return !!existant && existant.statut !== 'erreur' && existant.output_assemble != null
}

/**
 * Décision de persistance. Sur SUCCÈS : on écrit toujours. Sur ÉCHEC : on ne
 * persiste la trace d'erreur QUE s'il n'existe pas déjà une annonce valide à
 * protéger pour ce couple (fiche, plateforme).
 */
export function doitPersister(ok: boolean, existant: ExistantRow | null): boolean {
  return ok || !annonceValideExistante(existant)
}

export interface PersistInput {
  service: SupabaseClient
  ficheId: string
  plateforme: string
  /** Génération/édition réussie (forme valide + post-traitement OK) ? */
  ok: boolean
  statut: string
  outputAssemble: AirbnbAssembled | BookingAssembled | null
  outputModeleBrut: unknown
  /**
   * Point de retour. (Re)génération → la nouvelle prose (réinitialise l'origine).
   * Édition → l'origine EXISTANTE inchangée (les consignes s'enchaînent). Retour
   * à l'origine → l'origine (= la nouvelle prose courante). Échec première
   * génération → null (aucune origine valide).
   */
  outputModeleOrigine: unknown
  contrat: unknown
  modele: string
  promptVersion: string
  // deno-lint-ignore no-explicit-any
  generationMeta: any
  /** Horodatage unique partagé generated_at / updated_at (cohérence). */
  nowISO: string
}

export type PersistResult =
  | { ok: true; persiste: boolean }
  | { ok: false; code: 'DB_READ_ERROR' | 'DB_WRITE_ERROR'; error: string }

/**
 * Applique la garde anti-écrasement puis upsert la ligne agent_outputs (1 par
 * couple fiche/plateforme). Renvoie `persiste=false` quand une annonce valide a
 * été PRÉSERVÉE (aucune écriture). Toute erreur DB est remontée typée à
 * l'appelant (qui décide du code HTTP), jamais avalée.
 */
export async function persistAnnonceOutput(input: PersistInput): Promise<PersistResult> {
  const { service, ficheId, plateforme, ok } = input

  let persiste = true
  if (!ok) {
    const { data: existant, error: readErr } = await service
      .from('agent_outputs')
      .select('statut, output_assemble')
      .eq('fiche_id', ficheId)
      .eq('plateforme', plateforme)
      .maybeSingle()
    if (readErr) return { ok: false, code: 'DB_READ_ERROR', error: readErr.message }
    persiste = doitPersister(false, existant as ExistantRow | null)
  }

  if (persiste) {
    const { error: upErr } = await service
      .from('agent_outputs')
      .upsert({
        fiche_id: ficheId,
        plateforme,
        output_assemble: input.outputAssemble,
        output_modele_brut: input.outputModeleBrut,
        output_modele_origine: input.outputModeleOrigine,
        contrat_entree: input.contrat,
        modele: input.modele,
        prompt_version: input.promptVersion,
        generation_meta: input.generationMeta,
        statut: input.statut,
        // Sur régénération/édition (upsert UPDATE), les DEFAULT now() ne se
        // rejouent pas → on rafraîchit explicitement (pas d'historique en v1).
        generated_at: input.nowISO,
        updated_at: input.nowISO,
      }, { onConflict: 'fiche_id,plateforme' })
    if (upErr) return { ok: false, code: 'DB_WRITE_ERROR', error: upErr.message }
  }

  return { ok: true, persiste }
}
