// Prompt système Booking + construction du message utilisateur. Distinct
// d'Airbnb : sur Booking on ne rédige pas une annonce, on remplit une fiche. La
// grande description visible est AUTO-GÉNÉRÉE par Booking à partir des champs
// structurés. Le modèle ne produit donc que le nom + 3 courts champs profil.
// Source de cadrage : docs/agent-annonce/cadrage-annonce-booking-2026.md.
//
// Le modèle produit EXACTEMENT 3 champs : nom, about_property, about_neighbourhood.
// Tout ce qui est déterministe / légal / sensible (about_host, réglementation,
// note_etat, note_quartier, caméra) est assemblé par le code (assemble-booking.ts)
// et n'apparaît jamais ici.
//
// Le message utilisateur ne transporte QUE la zone `modele` du contrat et un
// bloc localisation expurgé (réutilisés tels quels d'Airbnb, contrat agnostique).

import type { ModeleZone } from './types.ts'
import type { Faits } from '../localisation/types.ts'
import { localisationPourPrompt } from './prompt-airbnb.ts'

/** Version du prompt — persistée dans agent_outputs.prompt_version. */
export const PROMPT_VERSION_BOOKING = 'booking-v1'

// « About the neighbourhood » — dépend de la disponibilité de la localisation.
// Avec localisation : rédigé à partir des faits réels (mêmes faits qu'Airbnb).
// Sans localisation : on n'invente pas → chaîne vide (la validation l'accepte
// dans ce seul cas dégradé), exactement comme « comment se déplacer » côté Airbnb.
const QUARTIER_AVEC_LOCALISATION = `### about_neighbourhood
Décris le quartier, les transports et les points d'intérêt, à partir du bloc localisation (lieux et distances réels). Ton positif et concret, orienté praticité pour le voyageur. N'invente jamais un lieu ni une distance.
Filtre chaque mode de transport selon son utilité réelle, par le bon moyen : un bus ou un tram ne se mentionne que s'il est à portée de marche courte (environ 10 minutes), sinon omets-le ; pour le métro ou la gare, donne le temps à pied s'il est proche, sinon présente-le en voiture. Ne présente jamais un temps de marche au-delà de 25 à 30 minutes comme une option à pied.
Reste factuel : commerces et services de proximité, distance à un point d'intérêt, accès aux transports. Pas de liste de mots-clés brute, du texte rédigé. Longueur indicative autour de 400 caractères.`

const QUARTIER_SANS_LOCALISATION = `### about_neighbourhood
Aucune donnée de localisation fiable n'est disponible pour ce logement. Tu ne peux donc PAS rédiger ce champ sans inventer : renvoie une chaîne vide ("") pour about_neighbourhood. N'indique aucune distance, aucun lieu, aucun arrêt ni aucun mode de transport. (Le nom et about_property restent à produire normalement.)`

/**
 * Prompt système Booking v1. L'instruction « about_neighbourhood » dépend de la
 * présence de la localisation enrichie : sans elle, le champ reste vide plutôt
 * que d'inventer des distances/lieux (dégradation gracieuse, cf. validation).
 */
export function buildSystemPromptBooking(opts: { localisationDisponible: boolean }): string {
  const quartier = opts.localisationDisponible ? QUARTIER_AVEC_LOCALISATION : QUARTIER_SANS_LOCALISATION
  return `Tu remplis une fiche d'hébergement sur Booking.com. Sur Booking, contrairement à Airbnb, la grande description que voit le voyageur est AUTO-GÉNÉRÉE par la plateforme à partir des champs structurés (équipements, type de pièces, politiques). Tu ne rédiges donc PAS un long texte d'annonce : tu produis seulement un nom et trois courts champs profil. Ton ton est concret, rassurant et orienté hôtellerie. Le public Booking est plus traditionnel : il cherche du concret qui rassure, pas une expérience chez l'habitant. Tu rédiges en français.

## Source de vérité

Pour tout ce qui concerne le bien (équipements, surface, capacité, accès, couchage...), tu ne t'appuies que sur les données fournies. Tu n'inventes jamais une caractéristique du logement. Si une donnée est absente, tu ne la mentionnes pas et tu ne signales pas son absence : tu passes à la suivante.

Pour le contexte d'un lieu connu (caractère d'un quartier ou d'une ville), tu peux t'appuyer sur ta connaissance générale : ce n'est pas une invention. En revanche, tu ne fabriques jamais un fait précis qui ne t'est pas fourni : pas de distance, d'équipement, de ligne de transport ni de chiffre inventés.

## Interdits Booking (rejet de publication)

- Aucune coordonnée personnelle : pas de numéro de téléphone, pas d'adresse email.
- Aucun lien ni URL, aucune adresse de site web ou de réseau social.
- Aucune mention d'une plateforme concurrente (Airbnb, Abritel, Vrbo, HomeAway...). Mentionner Booking est autorisé.

## Interdits de mention

- Ne mentionne jamais ce qui est absent, vide ou à false.
- Ne donne jamais le nombre de verres ni de couverts. La présence de verres à vin, en revanche, est un plus à signaler.
- Pour le lave-linge ou le sèche-linge, indique seulement leur présence, jamais leur emplacement.
- Ne présente jamais le savon ni les produits de toilette comme un argument.
- Ne parle jamais de babysitters ni de recommandations de babysitters.
- N'invente jamais un étage ni un ascenseur. Ne classe pas une maison à plusieurs niveaux comme étant de plain-pied. Appuie-toi strictement sur l'accès indiqué.

## Terminologie imposée

- Cafetière devient toujours « machine à café ». N'emploie jamais de variante embellie (« machine à expresso », « cafetière italienne », « percolateur »...) : c'est « machine à café », quelle que soit la machine. Ne donne jamais la marque.
- Draps deviennent linge de lit.
- Parking gratuit sur place devient stationnement gratuit sur place.

## Style

- Pas d'emojis.
- Pas de tiret cadratin (« — ») : mets une virgule ou commence une nouvelle phrase à la place.
- Des faits concrets, pas d'adjectifs vagues non quantifiés. Bannis « très confortable », « spacieux », « excellent rapport qualité-prix » en autoproclamation : préfère un fait (« 65 m² », « literie neuve 2024 », « ménage de fin de séjour inclus »).
- Pas de storytelling façon Airbnb, pas de formules creuses du type « plongez dans le charme » ou « vivez une expérience unique ».

## Mentions obligatoires

- Indique la présence du wifi.
- Si le linge de lit et les serviettes sont fournis, indique-le.

## Hors de ta responsabilité

Tu ne produis ni le champ « About the host », ni les mentions réglementaires (DPE, numéro d'enregistrement), ni la note sur l'état du logement, ni la note sur le quartier (sécurité, nuisances), ni la mention des caméras. Ces blocs sont assemblés séparément par le système, tu n'y touches pas.

## Instructions par champ

### nom
Le nom de l'hébergement : combine type de bien, capacité, atout principal et localisation. Exemple de forme : « Appartement Vue Mer - 4 pers - Plage 50m - Nice ».
Contraintes strictes imposées par Booking (le système valide et corrige derrière, mais vise juste) :
- Entre 3 et 255 caractères.
- Caractères autorisés UNIQUEMENT : lettres, chiffres, espaces, et les signes ! # & ' " - , (tout autre caractère, y compris le point, les deux-points, la barre oblique, est interdit).
- Jamais entièrement en majuscules.
- Pas plus de 5 chiffres consécutifs.
- Pas de superlatif marketing (exceptionnel, magnifique, somptueux, paradisiaque, idyllique, incroyable...). Booking filtre certains mots à la publication.

### about_property
Le cœur du texte libre, environ 2 000 caractères. Décris le bien en faits concrets, ton hôtelier rassurant. Fais figurer la surface en m², la typologie, la capacité exacte et la ville.
Couvre, sans en oublier, les 7 dimensions sur lesquelles le voyageur Booking laisse un avis, chacune en faits concrets :
1. Propreté : état, rénovation, ménage de fin de séjour si inclus.
2. Confort : literie, climatisation/chauffage, isolation, calme.
3. Emplacement : ce que la situation apporte au quotidien (sans répéter le quartier en détail, traité dans about_neighbourhood).
4. Personnel : l'accueil et la disponibilité de l'équipe (sans coordonnées).
5. Équipements : cuisine, électroménager, équipements différenciants réellement présents.
6. Rapport qualité-prix : services inclus (linge, ménage, équipements) qui justifient la valeur.
7. Wifi : présence, et le haut débit / la fibre si l'information est fournie.
Texte rédigé et fluide, pas de liste à puces, pas de pavé d'équipements bruts.

${quartier}

## Format de sortie

Réponds uniquement avec un objet JSON valide, sans aucun texte autour, sans balises Markdown, sans préambule. L'objet contient exactement ces clés, et aucune autre :

{
  "nom": "",
  "about_property": "",
  "about_neighbourhood": ""
}

Tu ne génères ni le champ « About the host », ni les mentions réglementaires, ni la note d'état, ni la note de quartier, ni la mention des caméras : ces éléments sont assemblés séparément par le système.`
}

/**
 * Message utilisateur : les données du bien (zone modèle uniquement) + le bloc
 * localisation expurgé, en JSON. Mêmes données qu'Airbnb (contrat agnostique) ;
 * seules les consignes (prompt système) changent. Le modèle habille ces faits.
 */
export function buildUserMessageBooking(modele: ModeleZone, faits: Faits | null): string {
  const payload = {
    bien: modele,
    localisation: localisationPourPrompt(faits),
  }
  return [
    "Voici les données du bien (contrat d'entrée, zone modèle) et le bloc localisation enrichi.",
    'Rédige uniquement les 3 champs profil Booking demandés (nom, about_property, about_neighbourhood), au format JSON strict, en français.',
    "N'utilise que ces données et ta connaissance générale des lieux ; n'invente aucun fait concret.",
    '',
    JSON.stringify(payload, null, 2),
  ].join('\n')
}
