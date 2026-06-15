# Agent annonce — documentation de référence

Ce dossier regroupe les documents de référence qui cadrent la **refonte de l'agent de génération d'annonces** (titres et descriptions Airbnb, fiches Booking) lancé depuis l'étape `FicheFinalisation`. Ce sont des documents de cadrage / recherche : ils n'ont pas d'impact sur le code applicatif, ils servent de source de vérité produit pour le développement de l'agent.

## Documents

| Fichier | Rôle |
|---|---|
| [referentiel-agent-annonce.md](./referentiel-agent-annonce.md) | Référentiel des patterns rédactionnels des top performers Airbnb France (analyse Inside Airbnb, sept. 2025) : longueurs cibles titre/description, structure, lexique par marché, hiérarchie des équipements à mettre en avant, checklist de génération. |
| [cadrage-annonce-airbnb-2026.md](./cadrage-annonce-airbnb-2026.md) | Note de cadrage qualité **volet Airbnb** : règles de la plateforme (titre 50 car., description 500 car., sous-sections), réglementation française (numéro d'enregistrement, DPE), pièges à éviter, modèle d'annonce idéale. |
| [cadrage-annonce-booking-2026.md](./cadrage-annonce-booking-2026.md) | Note de cadrage qualité **volet Booking** : logique fiche structurée (description auto-générée), 3 champs profil, Property Page Score, règles de nommage, réglementation française, modèle de fiche idéale. |

## Où on en est

- **Agent annonce** : refonte **en cours**. Phase Discovery terminée côté contenu (les trois docs ci-dessus). L'agent lui-même (génération depuis `FicheFinalisation`) reste à construire.
- **Fiche** : enrichie en amont pour alimenter l'agent, à partir d'une gap analysis des données collectées :
  - **Section « Vue depuis le logement »** ajoutée dans la page Avis — multi-sélection (`section_avis.vue_types`), remplace la case générique « Vue panoramique » des atouts. _(PR #35, mergée)_
  - **Champs DPE** ajoutés dans la section Réglementation — classe énergétique (A–G / « Non communiqué ») + estimation des dépenses annuelles pour les classes F/G, facultatifs. _(PR #36, mergée)_
- **Données encore manquantes** identifiées par la gap analysis et utiles à l'agent (non traitées à ce stade, à voir avec la refonte) : points d'intérêt à proximité + distances, débit/fibre internet, année de rénovation, ville/quartier du bien en champ dédié.

> Documents internes Letahost. Mise à jour : 2026-06-15.
