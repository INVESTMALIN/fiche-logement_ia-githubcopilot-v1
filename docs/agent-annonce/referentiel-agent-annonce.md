# Référentiel agent annonce — Patterns top performers Airbnb France

> **Source.** Analyse Inside Airbnb, septembre 2025. 115 597 annonces analysées sur 4 marchés français (Paris, Bordeaux, Lyon, Pays Basque). 3 565 top performers identifiés (Superhost + note ≥ 4.8/5 + ≥ 20 avis + ≥ 5 avis sur 12 mois + top 10 % d'occupation par marché).
>
> **Usage.** Référentiel à appliquer lors de la génération d'un titre, d'une description ou d'une liste d'équipements à mettre en avant pour un bien Airbnb. Les seuils sont calibrés sur les données observées chez les top performers, pas inventés.

---

## 1. Titre

### 1.1 Longueur cible

- **Cible : 37 à 43 caractères.** Médiane top observée : 40 à 43 caractères selon le marché.
- **Plafond : 50 caractères** (limite Airbnb stricte). Ne jamais saturer cette limite : le sweet spot des top performers se situe entre 75 et 86 % du plafond.
- **Plancher : 28 caractères.** En dessous, l'annonce paraît bâclée. Les top à moins de 25 caractères sont des exceptions, pas une cible.

### 1.2 Structure recommandée

Combiner systématiquement **trois composants** dans le titre, dans cet ordre ou réorganisés selon ce qui tombe le mieux :

1. **Typologie du bien.** Studio, appartement, chambre, maison, T2, duplex, loft.
2. **Qualificatif d'ambiance.** Charmant, cosy, calme, lumineux, paisible.
3. **Ancrage géographique.** Nom de ville + quartier iconique OU nom de ville + distance d'un point d'intérêt OU mention "centre" / "proche".

Exemples de structures qui fonctionnent :
- `[Ambiance] [Typologie] [Quartier]` → "Charmant studio Vieux Lyon"
- `[Typologie] [Ville] [POI] [Distance]` → "Maison centre Biarritz 500 m plage"
- `[Typologie] [Ville] [Quartier prestigieux]` → "Studio Bordeaux Triangle d'Or"

### 1.3 Lexique transverse (à privilégier sur tous les marchés)

Mots-clés présents dans le top 20 des titres top performers sur les 4 villes simultanément :

| Mot | Catégorie |
|---|---|
| `studio`, `appartement`, `chambre` | Typologie |
| `charmant`, `cosy` | Ambiance |
| `calme`, `proche`, `centre` | Localisation / qualité |
| `parking` | Équipement valorisé |

### 1.4 Patterns syntaxiques observés

- **Majuscules ponctuelles acceptées** sur 1 ou 2 mots-clés isolés pour les mettre en exergue dans le titre. Exemples valables : "Studio PARKING gratuit centre", "Appartement VUE MER terrasse". **JAMAIS tout le titre en majuscules** : Airbnb interdit explicitement les majuscules intégrales dans ses guidelines de modération. Certaines annonces top observées violent cette règle (cf. exemple Bordeaux en section 5), mais elles passent à travers les mailles du filet, ne pas répliquer ce pattern à risque.
- **Étoiles décoratives `*****`** observées sur certains top, signal de standing assumé. Rare et à éviter par prudence : peut être perçu comme spam par la modération Airbnb.
- **Distance précise** ("500 m plage", "5 min Eiffel") forte sur les destinations balnéaires et touristiques. À privilégier dans les titres pour ces marchés.
- **Esperluette `&`** acceptée pour gagner de la place ("Studio, Terrasse & parking").

### 1.5 Pièges à éviter

- **Titres très courts (moins de 25 caractères)** type "Tres joli T2" : on perd les signaux d'ambiance et de localisation.
- **Titres saturés à 50 caractères pile** : signal d'amateurisme, on essaie de tout caser.
- **Titre entièrement en MAJUSCULES** : contrevient explicitement aux guidelines Airbnb, risque de modération. Majuscules ponctuelles uniquement, sur 1 ou 2 mots-clés isolés.
- **Émojis** : non observés chez les top performers français. À ne pas inventer.
- **Mots-clés génériques sans ancrage** : "Bel appartement bien situé" ne dit rien. Ancrer toujours.
- **Mention du prix ou du nombre de personnes dans le titre** : info redondante avec la fiche, gaspille des caractères.

---

## 2. Description

### 2.1 Longueur cible

- **Cible : 430 à 450 caractères.** Médiane top observée : 434 à 453 caractères selon le marché.
- **Plafond : 500 caractères** (limite Airbnb stricte pour le bloc principal). Viser 90 % du plafond.
- **Plancher : 300 caractères.** En dessous, on est sous la moyenne globale et on perd de l'information utile à la conversion.
- **Écart top vs moyenne : +15 à +20 % de longueur.** Les top performers en disent plus, mais ne saturent jamais.

### 2.2 Patterns structurels observés

Formules signature présentes en masse dans les descriptions top, à reprendre dans la génération :

| Formule | Usage | Fréquence observée |
|---|---|---|
| "located in the heart of [quartier]" | Annoncer la centralité | Très fréquent, surtout Paris (935×) |
| "X minutes from [point d'intérêt]" | Distance en minutes (à pied / métro) | Fréquent Bordeaux, Pays Basque |
| "fully equipped" | Souligner l'équipement complet | Quasi systématique |
| "you will [verbe au futur]" | Adresser le voyageur directement | Très fréquent |
| "perfect for [type de séjour]" | Cibler le profil de séjour | Fréquent |

### 2.3 Composants d'une description top performer

Une description efficace contient idéalement, dans l'ordre :

1. **Phrase d'accroche située** : type de logement + ambiance + localisation iconique (ex : "Charming studio located in the heart of the Marais...").
2. **Description spatiale** : nombre de pièces, taille, équipements principaux (cuisine, salle de bain), couchage.
3. **Distance / accessibilité** : transports en commun, points d'intérêt à proximité avec distance en minutes.
4. **Différentiateur** : ce qui rend le logement spécial (terrasse, vue, climatisation, calme, équipement haut de gamme).

### 2.4 Bilinguisme

- **Paris** : un quart des top performers écrivent leur titre et/ou description en anglais, ou mélangent les deux. Le tourisme international y est massif. **Génération en anglais ou bilingue acceptable, voire recommandée.**
- **Bordeaux, Lyon, Pays Basque** : le français reste majoritaire dans les titres, mais l'anglais domine dans les descriptions des top performers. **Description en anglais ou français selon le profil cible du bien.**

### 2.5 Pièges à éviter

- **Description trop courte (< 300 caractères)** : on rate l'effet "détail rassurant" qui distingue les top performers.
- **Saturation à 500 caractères pile** : on coupe au milieu d'une phrase, ça paraît bâclé. Viser 90 %, pas 100 %.
- **Adjectifs vides** : "magnifique", "exceptionnel", "unique" sans contenu derrière. Préférer des faits ("rénové en 2024", "climatisé", "500 m de la plage").
- **Énumération sans contexte** : listes d'équipements brutes sans phrase liante.

---

## 3. Équipements à mettre en avant

### 3.1 Hiérarchie des équipements selon leur pouvoir différenciant

Lift moyen = écart en points de pourcentage entre top performers et moyenne globale.

#### Niveau 1 — Différenciateurs forts (à mettre en avant systématiquement)

Équipements sur-représentés chez les top performers, lift moyen > +25 points sur 3 villes ou plus :

| Équipement | Lift moyen | Présence chez top |
|---|---|---|
| `Self check-in` | +34 pts | 49 à 67 % |
| `Shower gel` (produits de toilette fournis) | +35 pts | 65 à 75 % |
| `Coffee` (café / machine à café fournie) | +31 pts | 55 à 65 % |
| `Hot water kettle` (bouilloire) | +28 pts | 73 à 78 % |
| `Bed linens` (linge de lit fourni) | +26 pts | 79 à 94 % |
| `Baking sheet` (plaque de cuisson / four équipé) | +28 pts | 69 % et plus |
| `Cleaning products` (produits ménagers) | +28 pts | 68 % et plus |

#### Niveau 2 — Différenciateurs modérés (à mentionner si présents)

| Équipement | Lift moyen |
|---|---|
| `Dining table` (table à manger formelle) | +21 pts |
| `Wine glasses` (verres à vin) | +21 pts |
| `Lockbox` (boîte à clés) | +23 à +33 pts (couplé self check-in) |
| `Hair dryer` (sèche-cheveux) | +21 pts |
| `Microwave` (micro-ondes) | +10 à +36 pts |

#### Niveau 3 — Standards non différenciants (à mentionner mais ne pas survaloriser)

Présents chez 80 % et plus des annonces, top performers compris. Leur mention seule ne valorise pas l'annonce :

- `Wifi`, `Kitchen`, `Smoke alarm`, `Hot water`

**Règle de hiérarchie** : si on doit citer 3 équipements dans une description, on cite 2 du niveau 1 et 1 du niveau 2. Le wifi et la cuisine sont supposés acquis, on ne les mentionne que si le pitch porte sur autre chose (ex : "kitchen fully equipped with espresso machine and baking gear").

### 3.2 Lecture stratégique

Le pattern qui ressort : **les top performers ne se distinguent pas par les équipements de base mais par les attentions de type hôtelier**. La transition d'un Airbnb amateur à un Airbnb pro passe par :

- L'**autonomie d'accès** (self check-in + lockbox) : le voyageur peut arriver à n'importe quelle heure sans accroche.
- Les **consommables fournis** (shower gel, café, linge) : on évite la course au supermarché.
- L'**équipement de cuisine complet** (vaisselle, plaque, table à manger, verres à vin) : on peut vraiment vivre sur place.

L'agent doit pousser le concierge à équiper le bien dans cette direction si ce n'est pas encore le cas, et à le mentionner explicitement dans la description si c'est déjà le cas.

---

## 4. Adaptation par marché

### 4.1 Paris

| Dimension | Spécificité |
|---|---|
| **Langue titre** | Mélange français / anglais accepté. 10 à 27 % des top titres contiennent "the", "apartment", "with", "heart". |
| **Mots-clés titre** | `paris` (27 %), `studio` (17 %), `apartement` (14 %), `apartment` (10 %), `marais` (10 %), `eiffel` (9 %), `montmartre` (7 %), `cosy` (8 %) |
| **Bigrams titre** | `eiffel tower` (131×), `tour eiffel` (102×), `the heart` (78×), `heart paris` (71 ×), `champs elysées` (54×), `saint germain` (40×) |
| **Lieux iconiques à mobiliser** | Eiffel / Tour Eiffel, Marais, Montmartre, Champs-Élysées, Saint-Germain, Louvre, Tuileries, Notre-Dame |
| **Formule signature description** | "in the heart of [quartier]" (935 occurrences sur les top) |

### 4.2 Bordeaux

| Dimension | Spécificité |
|---|---|
| **Langue titre** | Français majoritaire. Anglais accepté en description. |
| **Mots-clés titre** | `bordeaux` (25 %), `studio` (17 %), `chambre` (16 %), `appartement` (13 %), `centre` (12 %), `proche` (11 %), `parking` (10 %), `maison` (10 %), `calme` (9 %), `jardin` (7 %) |
| **Bigrams titre** | `proche bordeaux`, `centre bordeaux`, `centre ville`, `chambre privée`, `chambre indépendante`, `studio jardin` |
| **Lieux iconiques à mobiliser** | Triangle d'Or, Grands Hommes, Saint-Pierre, Chartrons, place de la Bourse |
| **Atouts à pousser** | Tramway (`tram` fréquent), gare TGV, jardin / terrasse, parking |

### 4.3 Lyon

| Dimension | Spécificité |
|---|---|
| **Langue titre** | Français majoritaire. |
| **Mots-clés titre** | `lyon` (42 % — record d'auto-référence), `studio` (17 %), `centre` (13 %), `appartement` (13 %), `dieu` (11 %), `part` (11 %), `cosy` (11 %), `croix` (8 %), `rousse` (8 %), `calme` (8 %) |
| **Bigrams titre** | `part dieu` (28×), `croix rousse` (21×), `vieux lyon` (16×), `lyon centre` (12×), `charmant studio`, `hyper centre` |
| **Lieux iconiques à mobiliser** | Part-Dieu (quartier d'affaires + gare TGV), Croix-Rousse, Vieux Lyon, Presqu'île, 1er arrondissement, Opéra |
| **Note** | Mentionner systématiquement "Lyon" dans le titre : 42 % des top performers le font, c'est presque obligatoire. |

### 4.4 Pays Basque

| Dimension | Spécificité |
|---|---|
| **Langue titre** | Français très majoritaire. Public mixte FR / ES / international. |
| **Mots-clés titre** | `chambre` (22 %), `plage` (17 %), `studio` (15 %), `appartement` (11 %), `terrasse` (11 %), `parking` (10 %), `biarritz` (7 %), `hendaye` (6 %), `vue` (6 %) |
| **Bigrams titre** | `hendaye plage`, `vue mer`, `proche plages`, `grande plage`, `saint jean`, `jean luz`, `pays basque` |
| **Lieux iconiques à mobiliser** | Biarritz, Bayonne, Hendaye, Saint-Jean-de-Luz, la Grande Plage |
| **Atouts à pousser** | Distance plage (en mètres ou minutes, format "500 m plage"), vue mer, terrasse extérieure, parking (rare et précieux en été) |

### 4.5 Autres marchés (heuristique générale)

Pour un bien situé hors des 4 villes étudiées, appliquer la règle générale :

1. Identifier le **point d'intérêt touristique principal** du lieu (monument, plage, station de ski, vignoble) et le mentionner dans le titre.
2. Identifier le **quartier le plus prestigieux ou recherché** et le mentionner si le bien y est situé.
3. Mentionner la **distance** (en mètres ou minutes à pied) à ce POI dans le titre si elle est inférieure à 1 km / 15 minutes.
4. Garder les **patterns transverses** (typologie + ambiance + ancrage) qui marchent partout.

---

## 5. Exemples annotés

### Paris — Top performer #1

> **Titre (34 chars)** : `Prestige on the Louvre & Tuileries`

Pourquoi ça marche : 34 caractères (68 % du plafond, sweet spot bas). Mot fort `Prestige` qui pose le standing. `the` et l'esperluette `&` pour le format anglais condensé. Deux POI iconiques côte à côte (`Louvre` + `Tuileries`) : ancrage géographique sans avoir à dire "Paris".

> **Description (extrait)** : "Experience luxury on the 6th floor with elevator access on Rue de Rivoli, offering stunning views of the Tuileries Gardens and the Louvre. Perfectly located for exploring Paris on foot or by public transport. Modern and fully equipped: TV, Wi-Fi, air conditioning, washer..."

Pourquoi ça marche : phrase d'accroche située + détail spatial concret (6e étage avec ascenseur, rue précise) + atout vue (Tuileries + Louvre) + accessibilité + énumération d'équipements valorisants.

### Bordeaux — Top performer #1

> **Titre (45 chars)** : `STUDIO BORDEAUX TRIANGLE D OR ***** Climatisé`

Pourquoi ça marche partiellement : 45 caractères (90 % du plafond, limite haute mais pas saturée). Typologie `STUDIO`, ville `BORDEAUX`, quartier prestigieux `TRIANGLE D OR`, signal de standing `*****`, équipement clé `Climatisé`.

⚠ **Attention, à ne pas reproduire tel quel.** Ce titre est intégralement en majuscules et contient des étoiles décoratives, ce qui contrevient aux guidelines Airbnb (interdiction des majuscules intégrales, modération possible du spam visuel). Cette annonce passe à travers les mailles du filet, peut-être parce que la modération Airbnb à Bordeaux est laxiste, mais le pattern est à risque sur le long terme. Notre agent doit reproduire la **logique** du titre (typologie + ville + quartier prestigieux + équipement valorisant) en respectant la casse : "Studio Bordeaux Triangle d'Or, climatisé".

### Lyon — Top performer #1

> **Titre (50 chars)** : `Quiet, Colorful Apartment Close to the Opera House`

Pourquoi ça marche : titre en anglais pour public international. Ambiance sensorielle (`Quiet`, `Colorful` = ambiance + atmosphère visuelle). Typologie `Apartment`. Localisation iconique (`Opera House`). Cas limite de saturation à 50 caractères, à n'utiliser que si chaque mot porte.

### Pays Basque — Top performer #1

> **Titre (34 chars)** : `Maison centre Biarritz 500 m plage`

Pourquoi ça marche : 34 caractères, hyper-efficace. Typologie `Maison`, position `centre`, ville iconique `Biarritz`, distance précise au point d'intérêt majeur `500 m plage`. Aucun mot inutile.

---

## 6. Checklist de génération

Avant de valider un titre, vérifier que toutes les cases sont cochées :

- [ ] **Longueur** entre 28 et 45 caractères (sweet spot 37-43)
- [ ] **Typologie du bien** présente (studio, appartement, chambre, maison, T2…)
- [ ] **Au moins un signal d'ambiance** ou **un atout différenciant** (charmant, cosy, calme, lumineux, vue mer, terrasse, climatisé)
- [ ] **Ancrage géographique** présent (ville + quartier OU ville + distance à un POI)
- [ ] Pas de saturation à 50 caractères pile
- [ ] Pas d'émoji
- [ ] Pas de titre entièrement en majuscules (majuscules ponctuelles OK sur 1 ou 2 mots-clés isolés)
- [ ] Pas d'étoiles décoratives `*****` ni autres caractères ornementaux
- [ ] Pas de mention de prix ou de capacité
- [ ] Adapté à la signature lexicale du marché (cf. section 4)

Avant de valider une description, vérifier :

- [ ] **Longueur** entre 380 et 470 caractères (sweet spot 430-450)
- [ ] **Phrase d'accroche située** dès la première ligne
- [ ] **Au moins 2 équipements de niveau 1** mentionnés
- [ ] **Au moins une distance ou un temps de trajet** vers un POI ou un transport
- [ ] **Au moins un différentiateur** explicite (vue, terrasse, climatisation, rénovation récente, etc.)
- [ ] Pas de saturation à 500 caractères pile
- [ ] Pas d'adjectifs vides sans fait derrière

---

## 7. Limites du référentiel

- Les données utilisées datent de septembre 2025. Les patterns rédactionnels évoluent lentement, le référentiel reste valable pour 12 à 18 mois sans rafraîchissement.
- L'occupation estimée par Inside Airbnb est un proxy de performance, pas la donnée officielle Airbnb (non publique). La corrélation avec la conversion réelle est forte mais non parfaite.
- L'analyse couvre le titre et la description principale, qui sont les seules parties accessibles publiquement. Les sous-sections d'annonce (espaces, accès, autres règles), les photos et le pricing dynamique ne sont pas couverts par ce référentiel.
- 4 marchés étudiés : Paris, Bordeaux, Lyon, Pays Basque. Pour les autres marchés français, appliquer l'heuristique générale de la section 4.5.
