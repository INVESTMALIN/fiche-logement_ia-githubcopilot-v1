// src/lib/videoGuideAcces.js
//
// Compression « cible livret » de la vidéo du Guide d'accès — logique pure,
// sans import, testable avec `npm test` (scripts/tests/videoGuideAcces.test.mjs).
//
// Contexte : la vidéo du Guide d'accès est ensuite ajoutée à la main dans le
// livret d'accueil Loomky, dont la limite rapportée est « 50 Mb/Mo » (unité
// non vérifiée). On vise donc une cible prudente, unique et modifiable ICI,
// que le service Railway reçoit en paramètre (`targetSizeBytes`). Rien n'est
// garanti : on vise la cible, on ne la promet pas, et l'upload n'échoue jamais
// à cause de la compression.
//
// Seul le champ `section_guide_acces.video_acces` est concerné. Les 33 autres
// champs vidéo gardent leur seuil historique de 95 Mo dans PhotoUpload.

// 40 Mio : sous 50 Mo décimaux (50 000 000) comme sous 50 Mio (52 428 800).
export const VIDEO_GUIDE_ACCES_CIBLE_OCTETS = 40 * 1024 * 1024

// Délai maximal accordé au service Railway pour une compression du guide
// (passe CRF + éventuel encodage 2 passes). Passé ce délai, la vidéo originale
// est conservée avec l'avertissement « échec ». Les autres champs n'ont aucun
// délai aujourd'hui : celui-ci ne les concerne pas.
//
// La compression du guide passe par un JOB (POST /compress-video/jobs puis GET
// de son état toutes les VIDEO_GUIDE_ACCES_POLL_MS) : une requête synchrone est
// coupée à 300 s côté service et Railway plafonne à 15 min, ce qu'une vidéo
// longue en 3 encodages peut dépasser. Le délai ci-dessous borne le polling.
export const VIDEO_GUIDE_ACCES_DELAI_COMPRESSION_MS = 20 * 60 * 1000
export const VIDEO_GUIDE_ACCES_POLL_MS = 10 * 1000

// Valeurs persistées dans `section_guide_acces.video_avertissement`
// (colonne fiches.guide_acces_video_avertissement). null = rien à signaler.
export const AVERTISSEMENT_VIDEO_GUIDE = Object.freeze({
  // Posé DÈS que l'original est dans la fiche et qu'un job de compression part.
  // Remplacé par l'un des deux états finaux à la fin du job. S'il survit à un
  // rechargement, c'est que la session a été interrompue (onglet fermé, mobile
  // en veille) : la vidéo est enregistrée telle quelle, au-dessus de la cible,
  // et le coordinateur doit en être averti durablement.
  COMPRESSION_EN_COURS: 'compression_en_cours',
  // Compressée (ou originale plus légère) mais toujours au-dessus de la cible :
  // intrinsèque à la vidéo, refaire à l'identique n'y changera rien.
  TROP_LOURDE: 'trop_lourde',
  // Réseau, timeout, réponse invalide du service : originale conservée telle
  // quelle. Peut être passager, réimporter plus tard peut suffire.
  COMPRESSION_ECHOUEE: 'compression_echouee'
})

/**
 * Le déclenchement se base sur la cible, pas sur l'ancien seuil de 95 Mo :
 * sinon les vidéos entre la cible et 95 Mo passeraient à travers.
 */
export function doitCompresserVideoGuide(tailleOctets, cible = VIDEO_GUIDE_ACCES_CIBLE_OCTETS) {
  return Number.isFinite(tailleOctets) && tailleOctets > cible
}

/**
 * Lit la réponse JSON de /compress-video.
 * Retourne { url, taille } ou null si la réponse est inexploitable (champ
 * manquant, taille non numérique, URL non http) — traité comme un échec.
 */
export function lireReponseCompression(reponse) {
  if (!reponse || typeof reponse !== 'object') return null
  const { compressedUrl, compressedSize } = reponse
  if (typeof compressedUrl !== 'string' || !/^https?:\/\//.test(compressedUrl)) return null
  if (typeof compressedSize !== 'number' || !Number.isFinite(compressedSize) || compressedSize < 0) return null
  return { url: compressedUrl, taille: compressedSize }
}

/**
 * Lit l'état d'un job (GET /compress-video/jobs/:id).
 * Retourne :
 *   { etat: 'running' }
 *   { etat: 'done', compressee: { url, taille } }   (résultat validé par lireReponseCompression)
 *   { etat: 'failed', erreur }                      (échec côté service, OU réponse inexploitable,
 *                                                    OU résultat « done » invalide)
 */
export function lireEtatJobCompression(reponse) {
  if (!reponse || typeof reponse !== 'object') return { etat: 'failed', erreur: 'Réponse du job invalide' }
  if (reponse.status === 'running') return { etat: 'running' }
  if (reponse.status === 'done') {
    const compressee = lireReponseCompression(reponse.result)
    return compressee ? { etat: 'done', compressee } : { etat: 'failed', erreur: 'Résultat du job invalide' }
  }
  if (reponse.status === 'failed') {
    return { etat: 'failed', erreur: typeof reponse.error === 'string' && reponse.error ? reponse.error : 'Compression échouée' }
  }
  return { etat: 'failed', erreur: `Statut de job inconnu : ${String(reponse.status)}` }
}

/**
 * Décide quelle vidéo conserver et quel avertissement persister.
 *
 * @param {{ originale: {url: string, taille: number},
 *           compressee: {url: string, taille: number}|null,
 *           cible?: number }} p
 * @returns {{ url: string, taille: number, avertissement: string|null }}
 *   - compressee null (échec)      → originale + COMPRESSION_ECHOUEE
 *   - sinon la plus légère des deux ; au-dessus de la cible → TROP_LOURDE
 *   - sous la cible                → aucun avertissement
 */
export function choisirVideoGuide({ originale, compressee, cible = VIDEO_GUIDE_ACCES_CIBLE_OCTETS }) {
  if (!compressee) {
    return { url: originale.url, taille: originale.taille, avertissement: AVERTISSEMENT_VIDEO_GUIDE.COMPRESSION_ECHOUEE }
  }
  const retenue = compressee.taille < originale.taille ? compressee : originale
  return {
    url: retenue.url,
    taille: retenue.taille,
    avertissement: retenue.taille > cible ? AVERTISSEMENT_VIDEO_GUIDE.TROP_LOURDE : null
  }
}

/**
 * Un résultat de compression ne s'applique qu'à la fiche qui l'a lancé : le
 * FormProvider survit aux changements de route, une autre fiche peut avoir
 * été chargée entre-temps.
 *
 * Trois identités, de la plus forte à la plus faible : l'id permanent, la
 * session de fiche, le numéro de bien.
 */
export function estMemeFiche(depart, arrivee) {
  // ID PERMANENT d'abord : il survit au rechargement de la fiche. Revenir sur
  // une fiche enregistrée pendant un traitement lui donne une session neuve,
  // mais c'est bien la même fiche, et son résultat doit s'y appliquer.
  if (depart?.id && arrivee?.id) return depart.id === arrivee.id

  // Identité de SESSION ensuite, quand l'id manque d'au moins un côté : posée
  // au chargement d'une fiche et renouvelée à chaque chargement ou
  // réinitialisation. Elle seule distingue deux fiches PAS ENCORE CRÉÉES qui
  // portent le même numéro de bien — le repli ci-dessous les confondrait, et
  // les doublons de numéro sont autorisés dans ce parcours. Elle ne change pas
  // quand la fiche reçoit son id en cours de route : c'est la même fiche.
  if (depart?.session || arrivee?.session) return depart?.session === arrivee?.session

  // Numéro de bien en dernier recours, pour un appelant sans session ni id.
  return Boolean(depart?.numeroBien) && depart.numeroBien === arrivee?.numeroBien
}

/**
 * Identifiant de session de fiche : unique, opaque, sans rapport avec le
 * contenu du formulaire. Le FormContext en pose un au chargement d'une fiche
 * et en repose un neuf à chaque chargement ou réinitialisation.
 */
export function creerSessionFiche() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `fiche-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Valeur à écrire dans le champ quand un envoi publie son URL.
 *
 * Le champ du Guide d'accès est `multiple` mais borné à UNE vidéo. Pendant un
 * envoi, il paraît vide (rien n'est encore publié) : le coordinateur peut
 * quitter la section, revenir et réimporter. Deux publications qui ajoutent
 * laisseraient deux URLs, alors que la page n'en lit qu'une (`video_acces[0]`).
 * La borne est donc appliquée ICI, à l'écriture, et garde les plus RÉCENTES.
 */
export function publicationVideoGuide({ actuelles, url, multiple, maxFiles }) {
  if (!multiple) return url
  const suivantes = [...(Array.isArray(actuelles) ? actuelles : []), url]
  return Number.isInteger(maxFiles) && maxFiles > 0 ? suivantes.slice(-maxFiles) : suivantes
}

/**
 * Phases d'un envoi « cible livret », telles que l'indicateur global les
 * annonce : le téléversement de l'original vers Supabase, puis sa
 * compression par Railway quand il dépasse la cible.
 */
export const PHASE_VIDEO_GUIDE = Object.freeze({
  ENVOI: 'envoi',
  PREPARATION: 'preparation'
})

/** Texte de l'indicateur global, par phase. */
export const MESSAGE_VIDEO_GUIDE_EN_COURS = Object.freeze({
  [PHASE_VIDEO_GUIDE.ENVOI]: "Envoi de la vidéo en cours. Ne fermez pas la Fiche Logement. Vous pouvez continuer à remplir les autres sections pendant l'envoi.",
  [PHASE_VIDEO_GUIDE.PREPARATION]: 'Préparation de la vidéo en cours. Ne fermez pas la Fiche Logement. Vous pouvez continuer à remplir les autres sections pendant le traitement.'
})

export const MESSAGE_QUITTER_FICHE_VIDEO_EN_COURS =
  "Une vidéo est en cours d'envoi ou de préparation. Si vous quittez cette fiche, vous devrez peut-être supprimer puis réimporter la vidéo. Voulez-vous vraiment quitter ?"

/**
 * Sortie de la fiche par un bouton de l'appli (« Mes fiches », « Annuler ») :
 * l'avertissement natif du navigateur ne la voit pas, elle ne décharge pas la
 * page. Elle réinitialise pourtant le formulaire, et l'envoi en vol n'a plus
 * de fiche où écrire. `confirmer` n'est appelé que si un envoi est en cours.
 */
export function peutQuitterFiche(phase, confirmer) {
  if (!phase) return true
  return Boolean(confirmer(MESSAGE_QUITTER_FICHE_VIDEO_EN_COURS))
}

/**
 * Registre des envois de médias « cible livret ».
 *
 * Il vit dans le FormContext, pas dans PhotoUpload : un envoi (Storage, puis
 * compression) survit au démontage du composant — changement de section, de
 * page, voire de fiche. Trois questions lui sont posées :
 *
 *  1. `aDesEnvoisEnVol(ficheCourante)` — la FINALISATION. Tant qu'un envoi
 *     de cette fiche est en vol, son URL n'est pas encore dans la fiche :
 *     finaliser lancerait l'automatisation à un seul coup sans lui.
 *  2. `phaseEnVol(ficheCourante)` — l'INDICATEUR GLOBAL et l'avertissement
 *     de fermeture. Même prédicat que la finalisation : l'indicateur est
 *     affiché exactement quand elle attend.
 *  3. `estDernier(cle)` — à la publication et au remplacement. Le champ
 *     paraît vide pendant l'envoi, donc un second envoi peut partir : seul le
 *     plus récent du MÊME champ ET de la MÊME fiche a le droit d'écrire.
 *
 * L'identité de fiche est celle d'`estMemeFiche`, partout : un envoi lancé
 * depuis une autre fiche ne bloque rien et ne périme rien ici.
 *
 * Les entrées terminées sont conservées juste ce qu'il faut : un envoi plus
 * ancien qui se termine APRÈS un plus récent doit pouvoir constater qu'il est
 * périmé. Au-delà, elles sont purgées (une seule entrée terminée par groupe).
 */
export function creerRegistreEnvois() {
  const envois = new Map()
  let compteur = 0

  const memeGroupe = (a, b) => a.fieldPath === b.fieldPath && estMemeFiche(a.fiche, b.fiche)

  // Un envoi PLUS RÉCENT a-t-il pris la main sur le même champ et la même
  // fiche ? Si oui, celui-ci ne peut plus rien écrire — et n'a donc plus rien
  // à faire attendre.
  const estSupplante = (e) => {
    for (const autre of envois.values()) {
      if (autre !== e && !autre.annule && memeGroupe(autre, e) && autre.seq > e.seq) return true
    }
    return false
  }

  // Un envoi de CETTE fiche encore en vol ET susceptible d'écrire. Un envoi
  // supplanté est exclu : `estDernier` lui a déjà retiré le droit d'écrire,
  // il n'a donc plus rien à protéger ni à faire attendre.
  const estActif = (e, ficheCourante) =>
    e.enVol && !e.annule && !estSupplante(e) && estMemeFiche(e.fiche, ficheCourante)

  // Ne garder, par groupe, que les envois encore en vol et le plus récent :
  // un envoi terminé qu'un plus récent a déjà supplanté ne peut plus ni
  // écrire ni servir de référence à personne.
  const purger = () => {
    for (const [cle, e] of envois) {
      if (e.enVol) continue
      const supplante = [...envois.values()].some(a => a !== e && memeGroupe(a, e) && a.seq > e.seq)
      if (supplante) envois.delete(cle)
    }
  }

  return {
    /** Un envoi démarre. À appeler avant le premier await. */
    declarer(cle, fiche, fieldPath) {
      envois.set(cle, { fiche, fieldPath, seq: ++compteur, enVol: true, annule: false, phase: PHASE_VIDEO_GUIDE.ENVOI })
      purger()
      return cle
    },

    /** L'original est sur Supabase, sa compression démarre. */
    passerEnPreparation(cle) {
      const e = envois.get(cle)
      if (e && e.enVol) e.phase = PHASE_VIDEO_GUIDE.PREPARATION
    },

    /** L'envoi est fini (succès, échec ou abandon) : il ne bloque plus rien. */
    terminer(cle) {
      const e = envois.get(cle)
      if (e) e.enVol = false
      purger()
    },

    /**
     * La vidéo de ce champ vient d'être supprimée (ou va être remplacée) :
     * les envois encore en vol de ce champ, pour cette fiche, n'ont plus
     * d'objet. Ils cessent immédiatement de bloquer la finalisation et
     * perdent le droit d'écrire, sans attendre la fin de leur traitement.
     */
    annulerChamp(fieldPath, fiche) {
      let annules = 0
      for (const e of envois.values()) {
        if (e.enVol && memeGroupe(e, { fieldPath, fiche })) {
          e.enVol = false
          e.annule = true
          annules += 1
        }
      }
      purger()
      return annules
    },

    /**
     * Un envoi de CETTE fiche est-il encore en vol ET susceptible d'écrire ?
     * (finalisation)
     *
     * Un envoi supplanté est exclu : `estDernier` lui a déjà retiré le droit
     * d'écrire, il n'a donc plus rien à protéger. Le compter bloquerait la
     * finalisation jusqu'à ce qu'il se résolve — ce qui peut durer très
     * longtemps sur un envoi qui traîne — alors que la vidéo du dernier envoi
     * est déjà en place. Les deux prédicats s'appuient exprès sur la MÊME
     * notion : ce qui ne peut plus écrire ne fait plus attendre.
     */
    aDesEnvoisEnVol(ficheCourante) {
      for (const e of envois.values()) {
        if (estActif(e, ficheCourante)) return true
      }
      return false
    },

    /**
     * Phase de l'envoi actif de CETTE fiche : `envoi`, `preparation`, ou
     * null s'il n'y en a pas. (indicateur global, avertissement de fermeture)
     *
     * Même prédicat qu'`aDesEnvoisEnVol`. S'il y en avait plusieurs, un envoi
     * encore en téléversement l'emporte : c'est le plus fragile.
     */
    phaseEnVol(ficheCourante) {
      let phase = null
      for (const e of envois.values()) {
        if (!estActif(e, ficheCourante)) continue
        if (e.phase === PHASE_VIDEO_GUIDE.ENVOI) return e.phase
        phase = e.phase
      }
      return phase
    },

    /** Cet envoi est-il toujours le plus récent de son champ et de sa fiche ? */
    estDernier(cle) {
      const e = envois.get(cle)
      if (!e || e.annule) return false
      return !estSupplante(e)
    },

    /** Pour les tests : taille du registre, qui ne doit pas croître sans fin. */
    taille() {
      return envois.size
    }
  }
}

/** Affichage humain d'une taille en Mio (ex. 41943040 → "40 Mio"). */
export function formaterMio(octets) {
  const mio = octets / 1024 / 1024
  return `${Number.isInteger(mio) ? mio : mio.toFixed(1)} Mio`
}
