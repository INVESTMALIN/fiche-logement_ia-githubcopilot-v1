# Cadrage qualité — Annonce Booking 2026

**Projet :** Refonte agent annonce, Letahost
**Auteur :** Pôle Innovation
**Date :** Juin 2026
**Statut :** Phase Discovery terminée, plateforme Booking

---

## Contexte

Ce document consolide la synthèse de la phase de recherche menée en vue de la refonte de l'agent de génération d'annonces, volet Booking.

Sources croisées :

- Booking Partner Hub.
- Documentation API Booking developers.
- Légifrance (loi n° 2024-1039 et décret n° 2026-196).
- Code de la construction et de l'habitation.

Quatre points clés ont été vérifiés en triple recherche parallèle (Perplexity, GPT 5.5, Claude Opus 4.8) pour neutraliser les hallucinations du rapport Deep Research initial : liste des mots filtrés, structure réelle des champs textuels, application de la loi Le Meur côté Booking, et chiffre +18 % de réservations.

---

> **Sur Booking, on ne rédige pas une annonce. On structure une fiche complète.**

## 1. Le recadrage stratégique

**La description visible est auto-générée par Booking.**

Contrairement à Airbnb, le grand bloc descriptif que voit le voyageur sur la page de l'annonce n'est pas rédigé par l'hôte. Il est construit automatiquement par Booking à partir des champs structurés de la fiche : équipements, type de pièces, politiques, localisation, services. Cette logique est confirmée par la documentation officielle de Booking Partner Hub.

Le vrai levier de qualité tient à trois leviers, dans l'ordre d'importance :

1. **La complétude des champs structurés** (cocher tous les équipements présents).
2. **Trois courts champs profil rédigés à la main** (About the property, About the neighbourhood, About the host).
3. **La tenue rigoureuse des signaux comportementaux** (prix compétitif, calendrier à jour, avis sur les 7 dimensions, taux de réponse).

Le texte libre joue un rôle plus mineur que sur Airbnb.

## 2. L'anatomie d'une fiche qui convertit

### Le nom — type + capacité + atout + lieu

- Entre **3 et 255 caractères**.
- Caractères autorisés uniquement : lettres, chiffres et **! # & ' " - ,** (le reste coupe l'appel API).
- Pas de majuscules intégrales.
- Pas plus de 5 chiffres consécutifs.
- Filtre actif sur certains mots, liste volontairement non publiée par Booking.

Exemple : *"Appartement Vue Mer - 4 pers - Plage 50m - Nice"*

### Les 3 champs profil — le seul texte libre

- **About the property** (environ 2 000 caractères) : le bien, ses équipements, son ambiance.
- **About the neighbourhood** : le quartier, les transports, les points d'intérêt.
- **About the host** : l'équipe, les services, la philosophie.

### Les signaux de ranking — le levier dominant

- **Property Page Score à 100 %** (tous les équipements cochés, toutes les politiques renseignées).
- **Programme Genius** (note ≥ 7,5/10 et au moins 3 avis).
- **Avis sur 7 dimensions** : propreté, confort, emplacement, personnel, équipements, qualité-prix, Wi-Fi.
- **Prix aligné** sur le marché.
- **Calendrier ouvert** et à jour.

## 3. Les règles du jeu Booking

- **Nom de l'hébergement : 3 à 255 caractères.** Caractères tolérés uniquement : lettres, chiffres et **! # & ' " - ,**. Pas de majuscules intégrales. Pas plus de 5 chiffres consécutifs (détection numéro de téléphone). Filtre Booking actif sur certains mots, liste volontairement opaque. Source : Booking developers API.
- **About the property : environ 2 000 caractères.** Limite indicative remontée par les channel managers (Smily, BookingSync). Le chiffre exact à valider directement dans l'extranet au moment du build.
- **Description voyageur : auto-générée.** Booking construit le texte affiché à partir des champs structurés, pas d'un bloc texte libre comme sur Airbnb.
- **Property Page Score : jusqu'à +18 % de réservations.** Booking communique officiellement qu'une fiche complète à 100 % génère jusqu'à 18 % de réservations en plus. C'est un plafond, pas une moyenne. Source : Booking Partner Hub.
- **Pas de coordonnées personnelles ni de liens externes.** Téléphone, email, URL, réseaux sociaux : rejet automatique de la publication.
- **Pas de mention de plateforme concurrente.** Airbnb, Abritel, Vrbo et consorts ne doivent pas apparaître dans les champs profil.
- **Photos : 3 minimum, 5 à 10 recommandées.** Haute résolution, sans filigrane. La photo de couverture pèse fortement sur le taux de clic.

## 4. Réglementation française, 2025-2026

### Numéro d'enregistrement en mairie — en vigueur

La loi du 19 novembre 2024 dite Le Meur impose à tout meublé de tourisme une déclaration en mairie et l'obtention d'un numéro d'enregistrement unique. Ce numéro doit figurer sur l'annonce, **quelle que soit la plateforme**. Booking comme Airbnb sont soumis à cette obligation.

La **deadline du 20 mai 2026** vient de la loi elle-même (art. L.324-1-1 du Code du tourisme), pas d'une décision propre à Airbnb. Au-delà de cette date, les annonces sans numéro valide doivent être désactivées par les plateformes.

> Texte : loi n° 2024-1039.
> À noter : le décret n° 2026-196 du 19 mars 2026 concerne la transmission trimestrielle des données à la DGE (API Meublés), pas le retrait des annonces.

### Classe DPE et logements F ou G — à mentionner

La classe énergétique doit apparaître dans l'annonce. Pour les logements classés **F ou G**, mention obligatoire : **« Logement à consommation énergétique excessive »**, accompagnée d'une **estimation des dépenses énergétiques annuelles**.

Les logements de classe G sont **interdits à la location** depuis le 1er janvier 2025. Interdiction étendue aux logements F au 1er janvier 2028.

> Base légale : Code de la construction et de l'habitation, articles L.126-33 et R.126-21.

## 5. Pièges et erreurs à éviter

- **Reproduire le storytelling Airbnb dans About the property.** Le public Booking est plus traditionnel et orienté hôtellerie. Il cherche du concret rassurant, pas une expérience chez l'habitant.
- **Fiche incomplète : équipements non cochés.** Un équipement absent de la liste structurée rend l'annonce invisible aux filtres de recherche. C'est le piège le plus pénalisant du quotidien Booking.
- **Mots filtrés dans le nom de l'hébergement.** Wi-Fi, comfortable, chef, German et d'autres déclenchent un rejet à la publication. La liste exacte n'est pas publiée par Booking.
- **Ignorer les 7 dimensions d'avis dans About the property.** Propreté, confort, emplacement, personnel, équipements, rapport qualité-prix, Wi-Fi. Le texte doit anticiper et rassurer sur chacune.
- **Calendrier non à jour ou peu ouvert.** Booking pénalise fortement les calendriers fermés ou aux disponibilités datées.
- **Adjectifs vagues non quantifiés.** "Très confortable", "spacieux" sans chiffre, "excellent rapport qualité-prix" en autoproclamation. Préférer des faits concrets.
- **Coordonnées personnelles, liens externes, plateformes concurrentes.** Téléphone, email, URL, mention d'Airbnb ou Abritel : rejet automatique de la publication.

## 6. Modèle de fiche idéale

Fiche conforme à l'ensemble des règles ci-dessus pour un bien type Letahost.

### Nom de l'hébergement

> Appartement Vue Mer - 4 pers - Plage 50m - Nice

*47 caractères. Type, capacité, atout principal et localisation rassemblés. Uniquement caractères tolérés par Booking.*

### About the property

> Appartement de 65 m² entièrement rénové en 2024, situé au 4e étage avec ascenseur. Salon lumineux avec baie vitrée orientée mer et canapé-lit deux places. Deux chambres équipées de literie neuve, dont une king-size. Cuisine entièrement équipée avec lave-vaisselle, four et plaque induction. Salle de bain rénovée avec douche italienne et sèche-serviettes. Climatisation réversible dans toutes les pièces. Wi-Fi fibre haut débit. Linge de maison et serviettes fournis. Ménage de fin de séjour inclus. Notre équipe locale est joignable 7 jours sur 7 pour toute question pendant votre séjour.

Couvre les 7 dimensions d'avis :

- **Propreté** : rénové, ménage inclus.
- **Confort** : literie neuve, climatisation.
- **Équipements** : cuisine, Wi-Fi.
- **Personnel** : équipe locale 7j/7.
- **Emplacement** : mer.
- **Rapport qualité-prix** : services inclus.
- **Wi-Fi** : fibre haut débit.

### About the neighbourhood

> Quartier résidentiel calme à 50 mètres de la plage. Boulangerie, supérette et restaurants à 200 mètres. Promenade des Anglais accessible à pied en 5 minutes. Arrêt de tramway à 300 mètres pour rejoindre le centre-ville en 10 minutes.

### About the host

> Notre équipe gère plus de 100 logements sur la Côte d'Azur depuis 2018. Accueil personnalisé, remise des clés autonome et assistance pendant tout le séjour. Réponses sous 1 heure en moyenne via la messagerie Booking.

## 7. Points à confirmer avant build

- **Limites exactes des trois champs profil.** Booking ne publie pas de tableau officiel des limites de caractères par champ. Le 2 000 caractères pour About the property vient de docs tierces. À vérifier directement dans l'extranet au moment du développement.
- **Mots filtrés non évidents dans le nom de l'hébergement.** Booking ne publie pas la liste, c'est un choix volontaire de sécurité (security through obscurity, pour empêcher le contournement). L'agent filtrera côté code les patterns évidents (caractères non tolérés, majuscules intégrales, chiffres consécutifs, superlatifs marketing). Pour les mots non évidents, l'opérateur devra ajuster manuellement dans l'extranet en cas de rejet à la publication.
- **Date de retrait effectif des annonces non conformes côté Booking.** La deadline légale du 20 mai 2026 est claire. Mais aucune communication officielle Booking ne fixe sa propre date de retrait automatique. Si critique, contacter le Partner Hub pour confirmation.

---

## Annexe — Sources mobilisées

### Sources officielles, priorité haute

- **Booking Partner Hub** : page Property Page Score (chiffre +18 % officiel), pages d'aide hôte.
- **Booking developers API** : filtre nom de l'hébergement et règles de validation (longueur, caractères tolérés, chiffres consécutifs).
- **Légifrance** : loi n° 2024-1039 du 19 novembre 2024 (Le Meur), décret n° 2026-196 du 19 mars 2026 (transmission DGE).
- **Code de la construction et de l'habitation** : articles L.126-33 et R.126-21 (DPE).

### Sources tierces, utilisées avec prudence

- **Channel managers** (Smily, BookingSync) pour les limites de caractères des champs profil.
- **Guesty** pour des exemples de mots filtrés sur le nom de l'hébergement.

### Méthode de vérification

Quatre points sensibles ont été triplement vérifiés en parallèle sur Perplexity, GPT 5.5 et Claude Opus 4.8 :

1. Liste des mots filtrés sur le nom de l'hébergement.
2. Structure réelle des champs textuels Booking (2025-2026).
3. Application de la loi Le Meur côté Booking et date de retrait.
4. Origine et fiabilité du chiffre +18 % de réservations.

L'analyse comparée des trois sorties a permis d'identifier deux hallucinations du rapport Deep Research initial (liste de mots bannis dans les descriptions, structure "description courte + description longue") et de confirmer les points solides (date 20 mai 2026, chiffre +18 % officiel).

---

*Document interne Letahost. Note de cadrage qualité produite pendant la phase Discovery de la refonte de l'agent de génération d'annonces, volet Booking.*
