// Prompt d'ÉDITION par consigne (agent annonce, PR2). À la différence de la
// génération, on ne repart PAS de la fiche : on part de la PROSE déjà rédigée par
// le modèle (output_modele_brut) et on applique UNE consigne du coordinateur en
// modifiant le minimum (drift minimal : seul le point visé change).
//
// PROTECTION STRUCTURELLE des blocs légaux/déterministes : le message utilisateur
// ne transporte QUE les champs de prose du modèle (7 Airbnb / 3 Booking). Les
// blocs posés par le code (réglementation DPE, déclaration caméra, note_etat,
// note_quartier, échanges, capacité, about_host) ne sont PAS dans l'entrée — le
// modèle ne peut donc pas les éditer — et sont réinjectés à l'identique par le
// code après l'appel (assemble-airbnb / assemble-booking). Le contrat de sortie
// est le MÊME qu'à la génération → parseModelOutput / parseBookingOutput réutilisés.

/** Version du prompt d'édition — persistée dans agent_outputs.prompt_version. */
export const EDIT_PROMPT_VERSION = 'edit-v1'

export type Plateforme = 'airbnb' | 'booking'

// Champs de prose éditables PAR PLATEFORME (exactement les clés du contrat de
// sortie). Sert au rappel du schéma de sortie dans le prompt.
const SCHEMA_AIRBNB = `{
  "titres": ["", "", ""],
  "description": "",
  "logement": "",
  "acces_voyageurs": "",
  "quartier": "",
  "comment_se_deplacer": "",
  "autres_remarques": ""
}`

const SCHEMA_BOOKING = `{
  "nom": "",
  "about_property": "",
  "about_neighbourhood": ""
}`

// Blocs NON éditables (posés par le code, absents de l'entrée) — rappelés pour
// que le modèle n'essaie pas de les (ré)introduire dans la prose.
const NON_EDITABLES_AIRBNB =
  'les échanges voyageurs, le nombre de voyageurs, les mentions réglementaires (DPE, numéro d\'enregistrement), la note sur l\'état du logement, la note sur le quartier (sécurité, nuisances, caractère du secteur) et la déclaration des caméras'

const NON_EDITABLES_BOOKING =
  'le champ « About the host », les mentions réglementaires (DPE, numéro d\'enregistrement), la note sur l\'état du logement, la note sur le quartier (sécurité, nuisances) et la déclaration des caméras'

// Champ géo laissé vide en l'absence de localisation (miroir de la génération) :
// une consigne ne doit pas le faire inventer.
const CHAMP_GEO: Record<Plateforme, string> = {
  airbnb: 'comment_se_deplacer',
  booking: 'about_neighbourhood',
}

/**
 * Prompt système d'édition. Fait raisonner le modèle en trois temps EN INTERNE
 * (localiser → appliquer → vérifier le non-changement du reste) puis ne ressortir
 * que le JSON final, dans le même contrat fermé qu'à la génération.
 */
export function buildEditSystemPrompt(plateforme: Plateforme, opts: { localisationDisponible: boolean }): string {
  const isBooking = plateforme === 'booking'
  const schema = isBooking ? SCHEMA_BOOKING : SCHEMA_AIRBNB
  const nonEditables = isBooking ? NON_EDITABLES_BOOKING : NON_EDITABLES_AIRBNB
  const support = isBooking
    ? 'une fiche d\'hébergement Booking.com (nom + champs profil)'
    : 'une annonce Airbnb'
  const geoVide = !opts.localisationDisponible
    ? `\n\nLe champ « ${CHAMP_GEO[plateforme]} » est actuellement vide faute de données de localisation fiables : laisse-le vide (""), n'y invente ni distance, ni lieu, ni transport, même si la consigne le suggère.`
    : ''

  return `Tu es un éditeur expert ${support} déjà rédigée. On te fournit l'annonce ACTUELLE (ses champs de prose) et UNE consigne de modification écrite par un coordinateur. Ton rôle n'est PAS de réécrire l'annonce : c'est d'appliquer la consigne en touchant le MINIMUM. Tu rédiges en français.

## Règle d'or : drift minimal
Tu modifies uniquement ce que la consigne vise, et rien d'autre. Tout le reste de l'annonce doit ressortir IDENTIQUE, mot pour mot : mêmes phrases, même ordre, même ponctuation. Ne reformule pas, ne réordonne pas, ne « rafraîchis » pas un passage que la consigne ne cible pas. Si la consigne ne concerne qu'un champ, les autres champs sont renvoyés strictement inchangés.

## Méthode (raisonne en trois temps, en interne, avant de répondre)
1. LOCALISE : repère dans l'annonce le ou les passages précis visés par la consigne.
2. APPLIQUE : effectue la modification demandée, au plus juste, sur ces seuls passages.
3. VÉRIFIE : relis l'intégralité et assure-toi que tout ce qui n'était pas visé est rigoureusement identique au texte d'origine.
Ne fais apparaître AUCUN de ce raisonnement dans ta réponse : tu ne renvoies que le JSON final.

## Limites infranchissables
- Tu ne travailles QUE sur les champs de prose fournis ci-dessous. Tu ne vois pas, et tu ne dois jamais (ré)introduire, ${nonEditables} : ces blocs sont posés séparément par le système et échappent à toute consigne. Si la consigne demande de les modifier ou de les retirer, tu n'en as pas le pouvoir : tu laisses la prose inchangée sur ce point.
- N'invente aucun fait concret (équipement, surface, distance, lieu, ligne de transport, chiffre) absent du texte actuel. Une consigne ne crée pas un fait : si elle demande de mettre en avant quelque chose qui n'est pas déjà dans l'annonce, tu ne l'inventes pas.
- Si un champ est vide, laisse-le vide, sauf si la consigne fournit explicitement de quoi le remplir.

## Invariants de style (à préserver, ne jamais introduire de violation)
- Pas d'emoji. Pas de tiret cadratin (« — ») : une virgule ou une nouvelle phrase à la place.
- « machine à café » (jamais « expresso », « percolateur », « cafetière italienne »… ni de marque). « linge de lit » (jamais « draps »). « stationnement gratuit sur place » (jamais « parking gratuit »).
- Ne donne jamais le nombre de verres ni de couverts (la présence de verres à vin reste un plus). Pour le lave-linge / sèche-linge : présence seulement, jamais l'emplacement. Jamais le savon ou les produits de toilette comme argument.
- Pas de titre entièrement en majuscules.${geoVide}

## Format de sortie
Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte autour, sans balises Markdown, sans préambule, sans commentaire. L'objet contient EXACTEMENT ces clés, et aucune autre :

${schema}`
}

/**
 * Message utilisateur : l'annonce actuelle (champs de prose, en JSON) + la
 * consigne du coordinateur, clairement délimitée. Le modèle renvoie l'annonce
 * éditée dans le même schéma.
 */
export function buildEditUserMessage(plateforme: Plateforme, proseActuelle: unknown, consigne: string): string {
  const isBooking = plateforme === 'booking'
  const label = isBooking ? 'la fiche Booking actuelle' : 'l\'annonce Airbnb actuelle'
  return [
    `Voici ${label} (champs de prose à éditer) :`,
    '',
    JSON.stringify(proseActuelle, null, 2),
    '',
    'Consigne de modification du coordinateur (à appliquer au plus juste, en touchant le minimum) :',
    '"""',
    consigne.trim(),
    '"""',
    '',
    'Renvoie l\'annonce éditée au format JSON strict (mêmes clés, aucune autre), avec uniquement la modification demandée appliquée et tout le reste identique.',
  ].join('\n')
}
