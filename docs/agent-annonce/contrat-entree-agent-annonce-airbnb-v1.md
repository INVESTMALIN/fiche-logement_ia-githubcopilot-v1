# Contrat d'entrée — Agent annonce Airbnb v1

> Consolidation du mapping fiche → agent, validé catégorie par catégorie (session 2026-06-16). Sert de spec au mapper de l'Edge Function `annonce-generate`. Source de vérité champ par champ : `docs/agent-annonce/gap-analysis-fiche.md` (v3).

---

## 1. Principe

Au clic « générer l'annonce » dans FicheFinalisation, l'Edge Function :

1. récupère la fiche brute dans Supabase,
2. la passe dans un **mapper en code** qui produit un contrat d'entrée propre (+ enrichit la localisation),
3. envoie ce contrat propre au modèle (Claude Sonnet),
4. récupère la prose générée (les champs rédactionnels),
5. **assemble la sortie finale** en ajoutant les blocs calculés en code,
6. stocke dans `agent_outputs` et affiche.

Le modèle ne voit **jamais** la fiche brute, seulement le contrat propre. Deux mondes nets : ce que le modèle rédige (partie 2) et ce que le code assemble (partie 3).

---

## 2. Ce qui part au modèle, par usage

### Identité (titre, description, « mon logement »)

| Champ fiche | Champ annonce |
|---|---|
| `section_logement.type_propriete` | titre, description, logement |
| `section_logement.typologie` | titre, description, logement |
| `section_logement.surface` | description (obligatoire), logement |
| `section_visite.nombre_chambres` + `section_chambres.chambre_1..6` (literie détaillée) | description, logement |
| `section_logement.nombre_personnes_max` | contexte cible (aussi passthrough code, cf. partie 3) |
| Étage, **réconcilié en code** (`appartement.etage` / `type_niveau` / `nombre_etages`) | logement, accès |
| Accès + ascenseur, **réconciliés en code** (`appartement.acces` + `section_equipements.ascenseur`) | logement, accès |

### Localisation (titre, quartier, comment se déplacer)

| Champ fiche | Champ annonce |
|---|---|
| `section_proprietaire.adresse.ville` | titre, quartier, déplacements |
| `section_avis.quartier_types` (valeurs positives uniquement) | quartier |
| Bloc enrichissement (toponyme + POI nommés + distances), **PLACEHOLDER sourcé en code** | quartier, déplacements |

La rue (`section_proprietaire.adresse.rue`) n'est **pas** dans le contrat modèle. Elle sert uniquement d'ancre au géocodage côté code et n'apparaît jamais dans une annonce publique.

### Équipements (mon logement, description, accès)

| Source | Contenu exploité |
|---|---|
| `section_equipements` | climatisation, chauffage, ventilateur, lave-linge, sèche-linge, sèche-serviettes, fer à repasser, étendoir, TV (type + services streaming + consoles), coffre-fort, tourne-disque, piano, compacteur de déchets, accessibilité PMR, présence wifi, parking (type + sous-types) |
| Cuisine, bains, linge | `section_cuisine_1/2` (café, four, plaque, micro-ondes, vaisselle), `section_salle_de_bains` (sèche-cheveux), `section_salon_sam` (table à manger), `section_gestion_linge` + `section_chambres` (linge de lit), `section_consommables` (produits toilette + ménage, présence seule) |
| `section_equip_spe_exterieur` | espace extérieur + description libre, équipements ext (barbecue, plancha, hamac, douche ext…), piscine (+ caractéristiques), jacuzzi, sauna, hammam, cuisine extérieure, salle de sport, salle de cinéma, salle de jeux (billard, baby-foot, ping-pong), local à vélo |
| `section_clefs` | self check-in, **déduit en code** |

### Atouts et ambiance (description, titre, mon logement)

| Champ fiche | Note |
|---|---|
| `section_avis.atouts_logement` (+ `atouts_logement_autre`) | liste marketing curatée par le coordinateur, colonne vertébrale. **Règle atout vs fait** appliquée (cf. partie 4) |
| `section_avis.vue_types` | vue (15 types atomiques) |
| `section_equip_spe_exterieur.exterieur_description_generale` | texte libre ambiance/orientation, passé tel quel |
| `section_avis.atouts_logement.renove` | signal « récemment rénové », sans année |

### Cible voyageurs (formule « parfait pour » dans la description)

| Champ fiche | Note |
|---|---|
| `section_avis.types_voyageurs` (+ `types_voyageurs_autre`) | **moteur principal.** Personas internes traduits en prose naturelle, jamais recopiés tels quels |
| `section_teletravail.equipements` + débit (`speedtest_resultat`, `ethernet_disponible`) | appui cible nomades |
| `section_bebe.*` | appui cible familles |

### Règles internes (autres remarques)

| Champ fiche | Note |
|---|---|
| `section_exigences.animaux_acceptes` (+ commentaire) | accepté ou non |
| Fêtes / fumeurs | **valeur calculée en code** : « non » par défaut, bascule sur « oui » seulement si la fiche l'indique explicitement (`section_equipements.fetes_autorisees` / `fumeurs_acceptes` à true). Le modèle reçoit la valeur finale et l'habille en prose, il ne décide jamais |
| `section_securite.equipements` **hors caméras** | détecteurs fumée/CO, extincteur, trousse de secours, verrou, alarme, équipements rassurants |

Les horaires de tranquillité (22h-8h) sont une règle constante de la conciergerie, pas un champ fiche : assemblés par le code, cf. partie 3.

---

## 3. Ce que le code assemble (le modèle n'y touche jamais)

| Bloc sortie | Logique |
|---|---|
| `nombre_voyageurs` | passthrough de `section_logement.nombre_personnes_max`, recopié tel quel |
| `mentions_reglementaires` | numéro d'enregistrement (`numero_declaration`) + classe DPE recopiés tels quels ; pour F/G uniquement, mention « Logement à consommation énergétique excessive » + estimation dépenses formatée. Conformité légale, zéro reformulation |
| `note_etat` | **phrases reprises fidèlement du vieux prompt**, cas négatifs seulement. Sources : `section_avis.immeuble_*` (état, propreté, accessibilité, niveau sonore), `grille_*` (9 critères) + verdict, `securite_dangers`. Déclencheur = un niveau qui a une phrase dans le vieux prompt. Cas positif = rien |
| `note_quartier` | **phrases reprises fidèlement du vieux prompt**, cas négatifs seulement. Sources : `quartier_securite` (modéré / zone à risques), `quartier_perturbations` + détails (intègre l'élément précis), `quartier_types` valeur « défavorisé ». Cas positif = rien, le modèle garde la prose positive |
| Caméras | 3 cas. **Extérieures** présentes → mention obligatoire déterministe (formulation validée). **Intérieures espaces communs** présentes → jamais mentionnées dans l'annonce Airbnb (catégorie interdite depuis avril 2024) + drapeau de conformité levé. Aucune caméra → rien. Source : `section_securite.equipements` |
| `echanges_voyageurs` | template conciergerie constant, repris tel quel de l'existant, injecté par le code, pas généré |
| Horaires de tranquillité | règle constante 22h-8h, reprise telle quelle du vieux prompt, injectée par le code dans les autres remarques |
| Phrase favoris | constante de fin reprise telle quelle, injectée par le code en fin des autres remarques : « Vous appréciez ce logement ? Ajoutez-le à vos favoris pour suivre ses disponibilités et y revenir facilement. N'hésitez pas à nous contacter pour toute question supplémentaire. » |

---

## 4. Règles de réconciliation et garde-fous

- **Étage et ascenseur** : réconciliés en une valeur propre avant le prompt (deux sources, éclatées selon le type de bien). Le modèle ne voit jamais les sources contradictoires, et n'invente jamais un étage ou un ascenseur (retour terrain Colmar / étage de maison).
- **Self check-in** : déduit en code de la serrure connectée + codes. Le modèle reçoit « arrivée autonome oui/non », pas la mécanique des serrures. Il ne révèle jamais l'emplacement de la boîte à clés.
- **Doublon cinéma** : `section_equipements.cinema` et `section_equip_spe_exterieur.dispose_salle_cinema` réconciliés en un seul signal.
- **Atout vs fait** : pour un atout qui est aussi présent en section structurée (piscine, jacuzzi, jardin, parking privé, billard…), la section structurée fait foi sur le fait ; l'atout coché ne sert que de signal « mettre en avant ». Jamais d'équipement déduit d'un atout coché seul.
- **Absences conditionnelles** : les produits de toilette et consommables ne sont remplis que si le prestataire fournit. Un champ vide = « non documenté », pas « absent ». Ne jamais signaler une absence à partir d'un champ vide, on reste sur le positif.
- **Source de vérité prose** : le modèle peut s'appuyer sur sa connaissance générale d'un lieu connu (caractère d'un quartier, d'une ville), mais ne fabrique jamais un fait concret absent des données (distance, ligne de transport, équipement, chiffre).

---

## 5. Exclusions (ignoré par l'annonce)

- **Technique / sécurité opérationnelle** : emplacements et photos poubelle, disjoncteur, vanne d'eau, chauffe-eau ; identifiants wifi (SSID, mot de passe, photo routeur) ; détails texte du parking.
- **Matériel de ménage prestataire** : aspirateur, serpillère, balais, balayette, autres éléments.
- **Entretien des espaces extérieurs** (fréquence, qui), instructions d'utilisation, horaires et règles d'usage piscine/jacuzzi.
- **Inspection d'état** : éléments abîmés garage / buanderie / autres pièces + photos.
- **Config plateforme** : nuits minimum, tarif minimum, dates bloquées.
- **Guide d'accès détaillé** (vidéo transcrite par l'assistant FicheGuideAcces) : livrable séparé, pas dans l'annonce.

---

## 6. Bloc localisation enrichie (spec)

Ce bloc n'existe pas dans la fiche, il est calculé. **Source : Geoapify** (plan gratuit, sans carte bancaire, données OpenStreetMap). Validé sur bien réel (#1965, Colmar) : géocodage, POI nommés et routing excellents. Approche hybride : les faits viennent de Geoapify, la prose vient du modèle.

### Adresse d'entrée

On géocode `section_proprietaire.adresse` (rue, ville, code postal), qui est l'adresse du bien. Geoapify retourne latitude/longitude, point de départ de tous les faits.

### POI collectés

Triés par distance de marche réelle (réseau, pas vol d'oiseau). Noms réels uniquement, les POI sans nom sont écartés. Chaque POI porte son nom et son temps de marche.

| Catégorie | Nombre gardé | Rayon |
|---|---|---|
| Commerces de proximité (supermarché, épicerie) | 5 | ~1 km |
| Boulangerie | 5 | ~1 km |
| Restaurants | 5 | ~1 km |
| Bars et cafés | 5 | ~1 km |
| Sites touristiques et attractions | 5 | ~1,5 km |
| Parc et espaces verts | 3 | ~1,2 km |
| Près de l'eau (plage, lac, rivière), conditionnel | 1 à 2 | ~2 km |

### Transport

- **Arrêt le plus proche** (bus, tram), quelle que soit la distance. Dédupliqué par nom (un même arrêt remonte plusieurs fois, un seul gardé).
- **Métro le plus proche**, via une requête **dédiée** (jamais fusionnée avec l'arrêt bus/tram, sinon une bouche de métro serait masquée par un arrêt de bus plus proche). Couvre le métro et les VAL/light rail (Rennes, Lille, Toulouse). Vide en ville sans métro = absence légitime.
- **Gare la plus proche**, via une requête dédiée à rayon large (une gare peut être à plusieurs km en zone rurale).
- Les trois avec temps à pied et en voiture.

### Ancres macro (pour « comment se déplacer »)

- **Ville ou bourg notable le plus proche**, temps en voiture. Pour le « à 25 min de... ».
- **Aéroport le plus proche**, temps en voiture. Pour les voyageurs qui arrivent en avion.

### Quartier nommé

Pas de champ structuré. La donnée n'existe pas de façon fiable dans OpenStreetMap (échec confirmé au test sur les quatre angles : reverse multi-niveaux, Boundaries, Nominatim, Overpass). C'est un trou de données OSM, pas une limite de Geoapify, donc changer de source ne réglerait rien sur le parc réel (villes moyennes, vieux centres). Le modèle nomme donc le secteur **à partir des POI réels qu'on lui fournit** (ex. Musée Unterlinden + Maison des Têtes → « au cœur de la vieille ville de Colmar »), encadré : il ne nomme un quartier que s'il est reconnaissable, sinon il reste sur la ville, et n'invente jamais.

### Stockage et rafraîchissement

- La fiche de faits localisation est calculée **une seule fois par logement** et stockée. On ne rappelle pas Geoapify à chaque génération d'annonce (économie d'appels et de latence).
- Stockage dans une **table dédiée** (pas de colonnes à plat sur `fiches`, déjà trop large). Mécanisme exact à définir au build.
- On garde l'adresse qui a servi au calcul.
- À la génération : si pas de fiche de faits, ou si l'adresse a changé depuis le dernier calcul, on recalcule via Geoapify et on stocke. Sinon on réutilise.

### Garde-fou de restitution (cohérence cadrage)

La fiche de faits est une **palette, pas un script**. Le prompt impose au modèle de piocher les ancres les plus pertinentes et de les tisser en prose, jamais de recracher la liste entière. Respect du budget de la sous-section « Le quartier » (autour de 500 caractères) et de l'interdiction des listes de mots-clés brutes (détectées comme spam par Airbnb).
