// Référentiel des bonnes pratiques rédactionnelles Airbnb (top performers France,
// analyse Inside Airbnb sept. 2025). Injecté tel quel dans le prompt système v1
// à l'endroit prévu (cf. prompt-v1-agent-annonce-airbnb.md → « Référentiel des
// bonnes pratiques »). Source de vérité : docs/agent-annonce/referentiel-agent-annonce.md.
//
// Transcrit en texte (les backticks markdown de code inline du doc sont retirés :
// ils casseraient ce template literal et n'apportent rien au modèle). On garde
// les sections de GUIDANCE de génération (1 à 6) ; on omet la provenance et la
// section « Limites » du doc, qui parlent du référentiel lui-même, pas de la
// rédaction.

export const REFERENTIEL_AIRBNB = `## 1. Titre

### 1.1 Longueur cible
- Cible : 37 à 43 caractères. Médiane top observée : 40 à 43 selon le marché.
- Plafond : 50 caractères (limite Airbnb stricte). Ne jamais saturer : le sweet spot des top performers est entre 75 et 86 % du plafond.
- Plancher : 28 caractères. En dessous, l'annonce paraît bâclée.

### 1.2 Structure recommandée
Combiner trois composants, dans l'ordre qui sonne le mieux :
1. Typologie du bien (studio, appartement, chambre, maison, T2, duplex, loft).
2. Qualificatif d'ambiance (charmant, cosy, calme, lumineux, paisible).
3. Ancrage géographique : ville + quartier iconique, OU ville + distance à un point d'intérêt, OU mention "centre" / "proche".

Exemples de structures qui fonctionnent :
- [Ambiance] [Typologie] [Quartier] → "Charmant studio Vieux Lyon"
- [Typologie] [Ville] [POI] [Distance] → "Maison centre Biarritz 500 m plage"
- [Typologie] [Ville] [Quartier prestigieux] → "Studio Bordeaux Triangle d'Or"

### 1.3 Lexique transverse (à privilégier sur tous les marchés)
Typologie : studio, appartement, chambre. Ambiance : charmant, cosy. Localisation / qualité : calme, proche, centre. Équipement valorisé : parking.

### 1.4 Patterns syntaxiques
- Majuscules ponctuelles acceptées sur 1 ou 2 mots-clés isolés ("Studio PARKING gratuit centre"). JAMAIS tout le titre en majuscules (interdit par Airbnb).
- Pas d'étoiles décoratives (*****) : risque d'être perçu comme spam.
- Distance précise ("500 m plage", "5 min Eiffel") : fort atout sur les destinations balnéaires et touristiques.
- Esperluette & acceptée pour gagner de la place ("Studio, Terrasse & parking").

### 1.5 Pièges à éviter
- Titres très courts (< 25 caractères) : on perd ambiance et localisation.
- Titres saturés à 50 caractères pile : signal d'amateurisme.
- Titre entièrement en MAJUSCULES : modération Airbnb.
- Émojis : non observés chez les top performers français.
- Mots-clés génériques sans ancrage ("Bel appartement bien situé") : ancrer toujours.
- Mention du prix ou du nombre de personnes : redondant, gaspille des caractères.

## 2. Description

### 2.1 Longueur cible
- Cible : 430 à 450 caractères. Médiane top : 434 à 453 selon le marché.
- Plafond : 500 caractères. Viser 90 % du plafond, jamais 100 %.
- Plancher : 300 caractères.

### 2.2 Formules signature observées (à reprendre, adaptées en français)
- "au cœur de [quartier]" : annoncer la centralité.
- "à X minutes de [point d'intérêt]" : distance en minutes (à pied / transports).
- "entièrement équipé" : souligner l'équipement complet.
- s'adresser au voyageur directement ("vous profiterez de...").
- "parfait pour [type de séjour]" : cibler le profil.

### 2.3 Composants d'une description efficace, dans l'ordre
1. Phrase d'accroche située : type de logement + ambiance + localisation.
2. Description spatiale : pièces, taille, équipements principaux, couchage.
3. Distance / accessibilité : transports, points d'intérêt avec distance en minutes.
4. Différenciateur : ce qui rend le logement spécial (terrasse, vue, climatisation, calme, rénovation récente, équipement haut de gamme).

### 2.4 Pièges à éviter
- Description trop courte (< 300 caractères).
- Saturation à 500 caractères pile.
- Adjectifs vides ("magnifique", "exceptionnel", "unique") sans fait derrière. Préférer des faits ("rénové récemment", "climatisé", "500 m de la plage").
- Énumération d'équipements brute sans phrase liante.

## 3. Équipements à mettre en avant

Hiérarchie par pouvoir différenciant (écart top performers vs moyenne).

Niveau 1 — différenciateurs forts (à mettre en avant systématiquement) :
self check-in, produits de toilette fournis (gel douche), café / machine à café, bouilloire, linge de lit fourni, four équipé / plaque, produits ménagers fournis.

Niveau 2 — différenciateurs modérés (à mentionner si présents) :
table à manger formelle, verres à vin, boîte à clés (couplée au self check-in), sèche-cheveux, micro-ondes.

Niveau 3 — standards non différenciants (mentionner mais ne pas survaloriser) :
wifi, cuisine, détecteur de fumée, eau chaude. Présents partout : leur seule mention ne valorise pas.

Règle de hiérarchie : pour 3 équipements cités, citer 2 du niveau 1 et 1 du niveau 2. Le wifi et la cuisine sont supposés acquis ; ne les mettre en avant que si le pitch porte sur autre chose.

Lecture stratégique : les top performers se distinguent par les attentions de type hôtelier — autonomie d'accès (self check-in + boîte à clés), consommables fournis (gel douche, café, linge), cuisine complète (vaisselle, plaque, table, verres à vin).

## 4. Adaptation par marché

- Paris : titre français/anglais accepté. Lieux à mobiliser : Tour Eiffel, Marais, Montmartre, Champs-Élysées, Saint-Germain, Louvre, Tuileries, Notre-Dame. Formule "au cœur de [quartier]".
- Bordeaux : français majoritaire. Lieux : Triangle d'Or, Grands Hommes, Saint-Pierre, Chartrons, place de la Bourse. Atouts : tram, gare TGV, jardin / terrasse, parking.
- Lyon : français majoritaire. Mentionner "Lyon" dans le titre (42 % des top le font). Lieux : Part-Dieu, Croix-Rousse, Vieux Lyon, Presqu'île, Opéra.
- Pays Basque : français très majoritaire. Lieux : Biarritz, Bayonne, Hendaye, Saint-Jean-de-Luz, la Grande Plage. Atouts : distance plage (format "500 m plage"), vue mer, terrasse, parking.
- Autres marchés (heuristique générale) :
  1. Identifier le point d'intérêt touristique principal du lieu (monument, plage, station de ski, vignoble) et le mentionner dans le titre.
  2. Identifier le quartier le plus prestigieux ou recherché et le mentionner si le bien y est.
  3. Mentionner la distance (mètres ou minutes à pied) au POI si < 1 km / 15 min.
  4. Garder les patterns transverses (typologie + ambiance + ancrage).

## 5. Exemples annotés (références de ton)
- Paris : "Prestige on the Louvre & Tuileries" — 34 caractères, mot fort qui pose le standing, deux POI iconiques côte à côte, ancrage sans dire "Paris".
- Bordeaux (logique à reproduire, casse normale) : "Studio Bordeaux Triangle d'Or, climatisé" — typologie + ville + quartier prestigieux + équipement valorisant.
- Lyon : "Quiet, Colorful Apartment Close to the Opera House" — ambiance sensorielle + typologie + localisation iconique.
- Pays Basque : "Maison centre Biarritz 500 m plage" — 34 caractères, typologie + position + ville iconique + distance précise au POI majeur. Aucun mot inutile.

## 6. Checklist de génération

Titre, vérifier :
- Longueur 28 à 45 caractères (sweet spot 37-43).
- Typologie du bien présente.
- Au moins un signal d'ambiance ou un atout différenciant.
- Ancrage géographique présent (ville + quartier OU ville + distance à un POI).
- Pas de saturation à 50, pas d'émoji, pas de tout-majuscules, pas d'étoiles décoratives.
- Pas de prix ni de capacité.
- Vocabulaire adapté à la signature du marché.

Description, vérifier :
- Longueur 380 à 470 caractères (sweet spot 430-450).
- Phrase d'accroche située dès la première ligne.
- Au moins 2 équipements de niveau 1 mentionnés.
- Au moins une distance ou un temps de trajet vers un POI ou un transport.
- Au moins un différenciateur explicite.
- Pas de saturation à 500, pas d'adjectifs vides.`
