# Gap analysis v3 — Données de la fiche vs besoins de l'agent annonce

> Mise à jour 2026-06-16. **v3 = enrichissement de l'inventaire équipements.** Les sections équipements de la v2 écrasaient en quelques lignes le contenu réel de deux composants pourtant très riches : `FicheEquipements.jsx` (`section_equipements`) et `FicheEquipExterieur.jsx` (`section_equip_spe_exterieur`). L'extérieur surtout est une grosse réserve d'atouts différenciants (piscine, jacuzzi, sauna, hammam, salle de sport, salle de jeux, cuisine extérieure, barbecue, local à vélo). Réécriture après lecture directe des deux composants via Filesystem. Le reste du rapport (identité, localisation, cuisine/bains/linge, réglementation, cibles, règles, disclosures, accès) est inchangé sur le fond.

## Méthode et historique des corrections

Le rapport v1 (Claude Code, Plan Mode) était bon sur ce qu'il couvrait mais datait et avait des trous. La v2 a corrigé après vérification directe du code source (arbre d'état `initialFormData` **et** composants de saisie `src/pages/Fiche*.jsx`). La v3 comble le dernier angle mort, les équipements.

Corrections cumulées :

1. **Classe DPE** : absente en v1, **collectée** depuis la PR #36 (`section_reglementation.classe_dpe`).
2. **Estimation dépenses énergétiques F/G** : absente en v1, **collectée** (`dpe_depenses_min` / `dpe_depenses_max`), PR #36.
3. **Vue** : v1 ne voyait qu'une case générique. Désormais **section dédiée** `section_avis.vue_types`, PR #35.
4. **Débit internet** : v1 le disait absent. **FAUX**, collecté via la section télétravail (`speedtest_resultat`, `ethernet_disponible`).
5. **Sections omises par v1** et réintégrées en v2 : `section_teletravail`, `section_bebe`, `section_securite`, `section_communs`, `section_exigences`.
6. **Équipements sous-comptés (v2 → v3)** : la v2 résumait `section_equipements` et `section_equip_spe_exterieur` en 3 lignes. La v3 déroule l'inventaire complet des deux composants.

**Leçon de méthode (toujours valable) :** l'arbre d'état `initialFormData` n'est PAS exhaustif (des champs sont créés à la volée via `updateField`, ex. `speedtest_resultat`). Toute gap analysis fiable lit les composants, pas seulement l'état.

**Légende.** ✅ collectée proprement · 🟡 collectée mais partielle / ambiguë / conditionnée · ❌ non collectée

---

## 1. Identité et typologie du bien

| Donnée | Statut | Section / champ | Type | Note |
|---|---|---|---|---|
| Type de bien | ✅ | `section_logement.type_propriete` | Select | Appartement, Maison, Villa, Studio, Loft, Duplex, Autre (+ précision 37 options). |
| Typologie (T2/T3…) | ✅ | `section_logement.typologie` | Select | Studio, T2…T6+. Léger doublon avec type_propriete. |
| Surface m² | ✅ | `section_logement.surface` | Number | Pré-rempli Monday. |
| Nombre de chambres | 🟡 | `section_visite.nombre_chambres` + `section_chambres.chambre_1..6` | Select + détail | Conditionné au cochage « Chambre » en Visite. Détail par chambre disponible. |
| Capacité (voyageurs) | ✅ | `section_logement.nombre_personnes_max` | Number | Pré-rempli Monday. |
| Étage | 🟡 | `section_logement.appartement.etage` (Appart/Studio) ; `type_niveau` + `nombre_etages` (Maison/Villa) | Texte / radio | Éclaté selon le type de bien. |
| Ascenseur | 🟡 | (a) `section_logement.appartement.acces` (RDC/Escalier/Ascenseur) ; (b) `section_equipements.ascenseur` (bool) | Select / checkbox | Deux sources possibles, à réconcilier côté code agent. |

---

## 2. Localisation — LE maillon faible

| Donnée | Statut | Section / champ | Note |
|---|---|---|---|
| Ville | ✅ | `section_proprietaire.adresse.ville` | **Adresse du bien.** Saisie dans la première section du formulaire (la fiche propriétaire), mais c'est bien l'adresse du logement, pas l'adresse perso du propriétaire. Point déjà clarifié et confirmé. |
| Adresse (rue) | ✅ | `section_proprietaire.adresse.rue` | Adresse du bien. **Sert d'ancre au géocodage côté code, n'est PAS donnée au modèle** (jamais dans une annonce publique). |
| Type / ambiance de quartier | ✅ | `section_avis.quartier_types` (array, 12 valeurs) | Capture le caractère (central, ancien, balnéaire, résidentiel, défavorisé…), pas le nom. Les valeurs négatives (défavorisé) vont aux disclosures (§11). |
| Nom du quartier (toponyme) | ❌ | — | Pas de « Le Marais », « Chartrons ». Manque pour l'ancrage géo des titres. |
| POI à proximité (nommés) | ❌ | — | Aucun POI nommé. |
| Distances vers POI (m / min) | ❌ | — | Aucune notion de distance. |

→ La localisation reste le seul vrai manque structurant. Elle sera enrichie hors fiche, via un service de cartes (décision : approche hybride, faits via API, prose via le modèle).

---

## 3. Arrivée autonome et clés (`section_clefs`)

| Donnée | Statut | Section / champ | Note |
|---|---|---|---|
| Boîte à clés / serrure | ✅ | `section_clefs.boiteType` | TTlock, Igloohome, Masterlock, Keynest, Serrure connectée. |
| Arrivée autonome / self check-in | 🟡 | `section_clefs.boiteType` + digicode / interphone / tempoGache | Pas de flag « self check-in » direct, à déduire de la serrure connectée + codes. Le code produit un signal propre avant le prompt. |

---

## 4. Cuisine, salle de bains, linge, consommables

| Donnée | Statut | Section / champ | Note |
|---|---|---|---|
| Café / machine à café | ✅ | `section_cuisine_1.equipements_cafetiere` (+ types) ; `section_consommables.cafe_*` | Riche (types de cafetière + types de café). Prose sans la marque. |
| Bouilloire | ✅ | `section_cuisine_1.equipements_bouilloire` | — |
| Four / plaque / cuisinière | ✅ | `section_cuisine_1.equipements_four` / `equipements_plaque_cuisson` / `equipements_cuisiniere` | + marque/type conditionnels. |
| Micro-ondes | ✅ | `section_cuisine_1.equipements_micro_ondes` | — |
| Vaisselle / verres à vin | ✅ | `section_cuisine_2.*` (compteurs, dont verres à vin) | — |
| Table à manger | ✅ | `section_salon_sam.equipements_table_manger` + `nombre_places_table` | — |
| Sèche-cheveux | ✅ | `section_salle_de_bains.salle_de_bain_X.equipements_seche_cheveux` | Par salle de bain. |
| Linge de lit fourni | ✅ | `section_gestion_linge.*` + `section_chambres.*.equipements_draps_fournis` | Inventaire détaillé par dimension. |
| Produits de toilette | 🟡 | `section_consommables.gel_douche` / `.shampoing` / `.apres_shampoing` | Affichés **uniquement si** `fournis_par_prestataire = true`. Absence ≠ « non fourni » : ne jamais signaler l'absence. |
| Ménage / consommables fournis | 🟡 | `section_consommables.fournis_par_prestataire` (bool global) | Signal positif si fourni, jamais d'absence signalée. |

---

## 5. Équipements intérieurs (`section_equipements`) — réécrit en v3

> Checklist principale (cases à cocher) + sous-champs conditionnels + bloc wifi + bloc parking. Les champs techniques (poubelle, disjoncteur, vanne, chauffe-eau) et le matériel de ménage du prestataire sont opérationnels, hors annonce.

### Atouts et commodités (matière à annonce)

| Donnée | Statut | Champ | Note |
|---|---|---|---|
| Climatisation | ✅ | `climatisation` (+ `climatisation_type[]`) | Centrale, portable, fenêtre, split sans évacuation. |
| Chauffage | ✅ | `chauffage` (+ `chauffage_types[]`) | Central, appoint, radiant, split, soufflant, mobile. |
| Ventilateur / rafraîchisseur | ✅ | `ventilateur` (+ `ventilateur_types[]`, nombre) | Plafond, mobile, rafraîchisseur d'air. |
| Lave-linge | ✅ | `lave_linge` (+ prix, emplacement) | Compris/supplément, dans le logement/immeuble. |
| Sèche-linge | ✅ | `seche_linge` (+ prix, emplacement) | Idem. |
| Sèche-serviettes | ✅ | `seche_serviettes` | — |
| Fer à repasser | ✅ | `fer_repasser` | — |
| Étendoir | ✅ | `etendoir` | — |
| TV | ✅ | `tv` (+ `tv_type`, `tv_taille`, `tv_services[]`, `tv_consoles[]`) | Type (standard → Smart TV → connectée streaming), services (Netflix, Disney+, Prime…), consoles (PS5, Switch, Xbox…). Fort pour l'annonce. |
| Coffre-fort | ✅ | `coffre_fort` | — |
| Tourne-disque | ✅ | `tourne_disque` | Atout d'ambiance atypique. |
| Piano | ✅ | `piano` (+ `piano_marque`, `piano_type`) | À queue, numérique, droit. |
| Compacteur de déchets | ✅ | `compacteur_dechets` | — |
| Accessibilité PMR | ✅ | `accessible_mobilite_reduite` (+ `pmr_details`) | Atout positif. L'inverse (non accessible) alimente note_etat (§11). |
| Wifi (présence) | ✅ | `wifi_statut` (non / en_cours / oui) | Présence seulement. Identifiants = opérationnel. |
| Parking | ✅ | `parking_type` (+ `parking_sur_place_types[]`, `parking_payant_type`) | Rue gratuit / gratuit sur place (sous-terrain, abri, allée privée, garage individuel) / payant. Détail texte = opérationnel. |
| Ascenseur | 🟡 | `ascenseur` | Double avec `section_logement.appartement.acces`, à réconcilier (cf. §1). |
| Cinéma | 🟡 | `cinema` | **DOUBLON** avec `section_equip_spe_exterieur.dispose_salle_cinema`. À réconcilier en un seul signal côté mapper. |

### Pas des équipements, ce sont des règles (→ §10 autres remarques)

| Donnée | Champ |
|---|---|
| Fêtes autorisées | `fetes_autorisees` |
| Fumeurs acceptés | `fumeurs_acceptes` |

### Opérationnel / technique (→ ignoré par l'annonce)

Local poubelle (emplacement, ramassage, photos, vidéo), disjoncteur (emplacement, photos), vanne d'arrêt d'eau (emplacement, photos), système de chauffage d'eau (`systeme_chauffage_eau` chaudière/ballon, emplacement, photos, vidéo), identifiants wifi (`wifi_nom_reseau`, `wifi_mot_de_passe`, photo routeur), détails texte parking (`parking_*_details`), et tout le matériel de ménage du prestataire (`menage_aspirateur_types[]`, `menage_serpillere_types[]`, balais, balayette, autres éléments + photos).

---

## 6. Équipements spéciaux et extérieurs (`section_equip_spe_exterieur`) — réécrit en v3

> Section la plus sous-estimée en v2 (réduite à « terrasse/balcon/jardin + piscine »). C'est la plus grosse réserve d'atouts différenciants. 10 blocs activables par un toggle Oui/Non, chacun avec son contenu.

| Bloc | Toggle | Contenu exploitable pour l'annonce |
|---|---|---|
| Espace extérieur | `dispose_exterieur` | `exterieur_type_espace[]` (balcon, terrasse, jardin, patio), `exterieur_description_generale` (TEXTE LIBRE ambiance/vue/orientation, matière première), `exterieur_equipements[]` (barbecue, plancha, parasol, chaises longues, brasero, hamac, jeux enfants, éclairage, brise-vue, clôture, douche extérieure, moustiquaire, store banne), `exterieur_type_acces` (privé/partagé). Sous-bloc barbecue : type, combustible fourni, ustensiles fournis. |
| Piscine | `dispose_piscine` | `piscine_type` (privée/partagée), `piscine_acces` (int/ext), `piscine_dimensions`, `piscine_disponibilite` (+ période), `piscine_caracteristiques[]` (chauffée + période, à débordement, couloir de nage, taille olympique, toit-terrasse, eau salée, toboggan…). |
| Jacuzzi | `dispose_jacuzzi` | `jacuzzi_acces` (int/ext), `jacuzzi_taille`. |
| Cuisine extérieure | `dispose_cuisine_exterieure` | `cuisine_ext_type` (privée/partagée), `cuisine_ext_superficie`, `cuisine_ext_caracteristiques[]` (four, évier). |
| Sauna | `dispose_sauna` | `sauna_acces` (int/ext). |
| Hammam | `dispose_hammam` | `hammam_acces` (int/ext). |
| Salle de cinéma | `dispose_salle_cinema` | Présence. **DOUBLON** avec `section_equipements.cinema`. |
| Salle de sport | `dispose_salle_sport` | Présence. |
| Salle de jeux | `dispose_salle_jeux` | `salle_jeux_equipements[]` (billard, baby-foot, ping-pong). |
| Local à vélo | `dispose_local_velo` | `local_velo_type_acces` (libre / avec clé). Pertinent en ville cyclable (cf. test Bordeaux). |

### Opérationnel / inspection (→ ignoré par l'annonce)

Tous les blocs `*_entretien_*` (prestataire : fréquence, type, qui), toutes les `*_instructions` d'utilisation, les horaires et règles d'usage (`piscine_horaires_ouverture`, `piscine_regles_utilisation`, `jacuzzi_heures_utilisation`), les photos/vidéos, et les trois blocs d'inspection d'état `garage_elements_abimes` / `buanderie_elements_abimes` / `autres_pieces_elements_abimes` (+ photos), qui relèvent de l'état du bien, pas de l'annonce.

---

## 7. Autres atouts du logement (`section_avis`, `section_teletravail`)

| Donnée | Statut | Section / champ | Note |
|---|---|---|---|
| Atouts logement (liste marketing) | ✅ | `section_avis.atouts_logement` (objet ~35 booléens) + `atouts_logement_autre` (texte libre) | **Liste de mise en avant curatée par le coordinateur, colonne vertébrale de la description et du titre.** Mélange trois natures : adjectifs d'ambiance (lumineux, charmant, cosy, chic, paisible, spacieux…), atouts factuels qui doublonnent des champs structurés (piscine, jacuzzi, jardin, terrasse/balcon, sauna/spa, parking privé, billard, ping-pong, central, proche transports/commerces, familial, rénové), et atouts factuels sans équivalent structuré (équipements haut de gamme, borne de recharge électrique, vidéoprojecteur, jeux d'arcade). **Règle de réconciliation** : pour un atout qui est aussi un fait, la section structurée reste la source de vérité sur le fait ; l'atout coché ne sert que de signal « mettre en avant ». Le modèle ne déduit jamais un équipement d'un atout coché seul. |
| Vue (mer/lac/montagne/dégagée…) | ✅ | `section_avis.vue_types[]` | PR #35. 15 types atomiques + « aucune vue ». La case legacy `atouts_logement.vue_panoramique` existe encore dans l'état mais n'est plus rendue. |
| Rénovation récente (clé de `atouts_logement`) | 🟡 | `section_avis.atouts_logement.renove` (bool) | Booléen seul, **pas d'année** (décision : « récemment »). |
| Connexion / débit internet | ✅ | `section_teletravail.speedtest_resultat` (texte) + `ethernet_disponible` (bool) | Argument cible nomades. La présence wifi est en §5. |

---

## 8. Réglementation française

| Donnée | Statut | Section / champ | Note |
|---|---|---|---|
| Numéro d'enregistrement | 🟡 | `section_reglementation.numero_declaration` | Conditionnel à une liste fermée de communes. Un bien hors liste ne peut pas le renseigner. |
| Classe DPE | ✅ | `section_reglementation.classe_dpe` | PR #36. A–G + « Non communiqué ». Facultatif. |
| Dépenses énergétiques annuelles (F/G) | ✅ | `dpe_depenses_min` / `dpe_depenses_max` | PR #36. Fourchette €/an, visible si F ou G. |

---

## 9. Sections cibles voyageurs

| Donnée | Statut | Section / champ | Sert à |
|---|---|---|---|
| Types de voyageurs (personas) | ✅ | `section_avis.types_voyageurs` (+ `types_voyageurs_autre`) | **Moteur principal de la formule « parfait pour ».** 7 personas cochables : duo d'amoureux, nomades numériques, aventuriers indépendants, tribus familiales, bandes d'amis, voyageurs d'expérience, autre (texte libre). Libellés internes : le modèle les traduit en prose naturelle, il ne les recopie pas. |
| Équipement télétravail | ✅ | `section_teletravail.equipements` (array) | Cible nomades. Bureau dédié, chaise ergonomique, support PC, éclairage adapté, multiprise USB, fournitures, imprimante, scanner. + connexion (cf. §7). |
| Équipement bébé | ✅ | `section_bebe.*` | Cible familles. Lit bébé/parapluie, chaise haute, jouets par tranche d'âge, stores occultants. |
| Espaces communs | ✅ | `section_communs.*` | Description générale + entretien. |

---

## 10. Règles internes (autres remarques)

| Donnée | Statut | Section / champ | Note |
|---|---|---|---|
| Animaux acceptés | ✅ | `section_exigences.animaux_acceptes` (+ commentaire) | Pour la rubrique « autres remarques ». |
| Fêtes autorisées | ✅ | `section_equipements.fetes_autorisees` (bool) | Règle, pas un équipement. |
| Fumeurs acceptés | ✅ | `section_equipements.fumeurs_acceptes` (bool) | Règle, pas un équipement. |
| Nuits minimum / tarif min / dates bloquées | ✅ | `section_exigences.*` | Plutôt opérationnel, pas forcément dans le texte d'annonce. |
| Équipements de sécurité | ✅ | `section_securite.equipements` (array) | **Source des mentions sécurité de l'annonce.** Détecteur de fumée, détecteur monoxyde, extincteur, trousse de premiers secours, verrou de sécurité, système d'alarme, **caméras extérieures**, **caméras intérieures (espaces communs uniquement)**. Les caméras SONT collectées. |

---

## 11. Données pour l'état et le quartier (disclosures code)

Ces champs alimentent les blocs `note_etat` et `note_quartier` assemblés par le code, pas le modèle.

| Donnée | Statut | Section / champ |
|---|---|---|
| État immeuble / propreté / accessibilité / niveau sonore | ✅ | `section_avis.immeuble_*` |
| Grille état logement (9 critères notés 1–5) + dangers sécurité | ✅ | `section_avis.grille_*` + `securite_dangers` |
| Sécurité du quartier | ✅ | `section_avis.quartier_securite` (Sécurisé / modéré / zone à risques) |
| Élément perturbateur quartier + détails | ✅ | `section_avis.quartier_perturbations` + `quartier_perturbations_details` |
| Caractère socio-éco négatif du quartier | ✅ | `section_avis.quartier_types` (valeur « défavorisé ») |

---

## 12. Accès voyageurs et services

| Donnée | Statut | Note |
|---|---|---|
| Accès voyageurs (codes, stationnement, étage) | 🟡 | Données présentes mais éclatées sur 3 sections (clefs, logement, équipements). Le texte du guide d'accès est généré par IA depuis une vidéo, pas en champs structurés réutilisables. |
| Équipe / services conciergerie | n/a | Non modélisé dans la fiche, et ce n'est pas grave : **template conciergerie constant**, injecté par le code, pas une saisie. |

---

## Synthèse

### Réellement absent (à créer ou à sourcer hors fiche)

1. **Nom du quartier (toponyme)** — manque pour l'ancrage géo.
2. **POI à proximité nommés** — absent.
3. **Distances vers POI** — absent.

→ Ces trois manques = le bloc **localisation**, qui sera enrichi hors fiche via un service de cartes (approche hybride déjà décidée). C'est le seul vrai chantier de données qui reste.

Note : l'année de rénovation reste absente (décision : on ne l'ajoute pas).

### À fiabiliser / réconcilier dans le mapper (pas bloquant)

- Self check-in à déduire de la serrure + codes.
- Étage et ascenseur éclatés et à deux sources.
- **Cinéma en doublon** (`section_equipements.cinema` vs `section_equip_spe_exterieur.dispose_salle_cinema`).
- **Atouts logement factuels** (piscine, jacuzzi, jardin, parking privé, billard…) doublonnent les sections structurées : la section structurée fait foi sur le fait, l'atout coché ne sert que d'emphase.
- Produits de toilette / consommables saisis seulement si le prestataire fournit (jamais signaler l'absence).
- Numéro d'enregistrement conditionné à une liste de communes.
- Accès voyageurs éclaté sur 3 sections.

### Conclusion

Après vérification complète du code (v3 incluse), la fiche collecte **largement de quoi nourrir l'agent**, avec une réserve d'atouts différenciants bien plus riche que ne le laissait croire la v2, surtout côté équipements extérieurs et spéciaux. Les manques durs se réduisent à la **localisation** (nom de quartier, POI, distances), qui par conception vient d'un service externe. Tout le reste est présent, parfois éclaté, en doublon ou conditionnel, mais récupérable par le mapping en code.
