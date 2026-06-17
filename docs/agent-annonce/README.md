# Agent annonce — documentation de référence

Ce dossier regroupe les documents qui **cadrent et spécifient** la refonte de l'agent de génération d'annonces (titres + descriptions Airbnb, fiches Booking), déclenché depuis l'étape `FicheFinalisation`. Ce sont des documents produit / de conception : ils font foi pour le développement de l'agent (Edge Functions `annonce-localisation` et `annonce-generate`).

## Documents

### Cadrage & recherche (discovery)

| Fichier | Rôle |
|---|---|
| [referentiel-agent-annonce.md](./referentiel-agent-annonce.md) | Référentiel des patterns rédactionnels des top performers Airbnb France (analyse Inside Airbnb, sept. 2025) : longueurs cibles titre/description, structure, lexique par marché, hiérarchie des équipements, checklist de génération. |
| [cadrage-annonce-airbnb-2026.md](./cadrage-annonce-airbnb-2026.md) | Cadrage qualité **Airbnb** : règles plateforme (titre 50 car., description 500 car., sous-sections), réglementation française (numéro d'enregistrement, DPE), pièges à éviter, modèle d'annonce idéale. |
| [cadrage-annonce-booking-2026.md](./cadrage-annonce-booking-2026.md) | Cadrage qualité **Booking** : logique fiche structurée (description auto-générée), 3 champs profil, Property Page Score, règles de nommage, réglementation française, modèle de fiche idéale. |

### Conception de l'agent (specs de build)

| Fichier | Rôle |
|---|---|
| [gap-analysis-fiche.md](./gap-analysis-fiche.md) | Gap analysis **v3**, champ par champ : où vit chaque donnée dans la fiche, ce qui est collecté / manquant pour l'agent. Source de vérité du mapper. |
| [contrat-entree-agent-annonce-airbnb-v1.md](./contrat-entree-agent-annonce-airbnb-v1.md) | **Contrat d'entrée** : mapping fiche → contrat propre. Ce qui part au modèle (partie 2), ce que le code assemble (partie 3), réconciliations (partie 4), exclusions, bloc localisation enrichie (partie 6). |
| [schema-sortie-airbnb-agent-annonce.md](./schema-sortie-airbnb-agent-annonce.md) | **Schéma de sortie** Airbnb (objet complet après assemblage). Référence pour le prompt, la table `agent_outputs` et l'UI. Distingue champs **générés par le modèle** (prose) vs **assemblés par le code**. |
| [prompt-v1-agent-annonce-airbnb.md](./prompt-v1-agent-annonce-airbnb.md) | **Prompt système v1** (Claude Sonnet), versionné, appelé par `annonce-generate`. Le modèle ne produit que les champs de prose. |
| [phrases-code-injectees-airbnb.md](./phrases-code-injectees-airbnb.md) | **Phrases déterministes injectées par le code** (note_etat, note_quartier, caméras, échanges voyageurs, horaires de tranquillité, favoris), reprises du prompt n8n de prod. Injectées verbatim par l'Edge Function, jamais reformulées par le modèle. |

## Architecture (décidée)

Au clic « générer l'annonce » dans `FicheFinalisation`, l'Edge Function `annonce-generate` :

1. récupère la fiche brute + les faits de localisation ;
2. **mappe** la fiche en contrat d'entrée propre — deux zones nettes : ce que voit le modèle / ce que le code assemble ;
3. envoie le contrat au modèle (Claude Sonnet) → prose ;
4. **assemble** la sortie finale (prose + blocs code déterministes + phrases injectées) ;
5. stocke dans `agent_outputs` et affiche.

Approche **hybride** assumée : les faits (localisation, réglementation, état) viennent du code, la prose vient du modèle. Le modèle ne voit jamais la fiche brute, ni la rue, ni un signal négatif qu'il pourrait formuler de lui-même.

## Où on en est

**Discovery** (cadrage contenu) : **terminée** — les trois docs de cadrage.

**Conception** : **terminée** — gap analysis v3, contrat d'entrée v1, schéma de sortie, prompt v1, phrases code.

**Build**, brique par brique :

- **Brique 1 — Localisation enrichie** : ✅ **déployée**. Edge Function `annonce-localisation` qui géocode l'adresse du bien (Geoapify) puis collecte des faits réels — POI nommés par catégorie + temps de marche, transport (arrêt bus/tram, **métro**, gare), ancres macro (ville notable, aéroport) — stockés dans la table dédiée `fiche_localisation_faits` (cache par adresse + version de schéma). _(PR #37, #38, #39 mergées.)_
- **Brique 2 — Générateur** : en cours.
  - Table `agent_outputs` (1 ligne par couple fiche × plateforme, upsert, sorties en JSONB). ✅ _(PR #40 mergée.)_
  - **Mapper** fiche brute → contrat d'entrée (transformation pure, deux zones, batterie de tests Deno + validé sur bien réel #1965). ✅ _(PR #41 mergée.)_
  - **À venir** : l'Edge Function `annonce-generate` (assemblage + appel modèle + écriture `agent_outputs`), puis le câblage UI dans `FicheFinalisation`.

**Fiche enrichie en amont** (pour alimenter l'agent) : section « Vue depuis le logement » _(PR #35)_, champs DPE _(PR #36)_, et le métro côté collecte localisation.

**Manques résiduels** : le **nom de quartier** (toponyme) reste un trou de données OpenStreetMap confirmé, non sourçable de façon fiable sur le parc — le modèle nomme le secteur à partir des POI réels qu'on lui fournit. Les distances / POI à proximité, eux, sont désormais couverts par la brique 1. L'**année de rénovation** reste volontairement non collectée (décision : « récemment », sans année).

> Documents internes Letahost. Mise à jour : 2026-06-17.
