# Schéma de sortie Booking — Agent annonce

Contrat de ce que l'agent produit pour Booking. Miroir du schéma Airbnb (`schema-sortie-airbnb-agent-annonce.md`), adapté au recadrage Booking. Source produit : `cadrage-annonce-booking-2026.md`.

## Recadrage : on remplit une fiche, on ne rédige pas une annonce

Sur Booking, la grande description visible par le voyageur est **auto-générée par la plateforme** à partir des champs structurés (équipements, type de pièces, politiques). L'agent ne produit donc PAS le gros bloc descriptif façon Airbnb. Il produit un **nom** + **trois courts champs profil** + les blocs déterministes (réglementation, disclosures).

Distinction fondamentale, comme pour Airbnb : certains champs sont **générés par le modèle**, d'autres sont **assemblés par le code** de l'Edge Function. Le contrat d'entrée (mapper `_shared/annonce`) est **agnostique de plateforme** et réutilisé tel quel.

## Structure JSON complète (après assemblage)

```json
{
  "booking": {
    "nom": "",
    "about_property": "",
    "about_neighbourhood": "",
    "about_host": "",
    "mentions_reglementaires": {
      "numero_enregistrement": "",
      "dpe_classe": "",
      "mention_consommation_excessive": "",
      "estimation_depenses_annuelles": ""
    },
    "note_etat": "",
    "note_quartier": "",
    "note_camera": ""
  }
}
```

## Détail des champs

| Champ | Source | Notes |
|---|---|---|
| `nom` | Généré (modèle) + **sanitisé par le code** | Type + capacité + atout + lieu. 3 à 255 caractères. Charset toléré Booking uniquement (lettres, chiffres et `! # & ' " - ,`), pas de majuscules intégrales, pas plus de 5 chiffres consécutifs. Le modèle vise, le code valide et corrige. |
| `about_property` | Généré (modèle) + scrub interdits | ~2000 caractères (à confirmer dans l'extranet). Couvre les **7 dimensions d'avis** (propreté, confort, emplacement, personnel, équipements, rapport qualité-prix, wifi) en faits concrets, ton hôtelier. Pas de storytelling Airbnb. |
| `about_neighbourhood` | Généré (modèle) + scrub interdits | Quartier, transports, points d'intérêt à partir des **faits de localisation** (mêmes faits qu'Airbnb), ton positif. Vide si localisation indisponible (dégradation gracieuse). Règle de seuil transports par mode appliquée. |
| `about_host` | Template conciergerie (code) | Texte constant, identique pour tous les biens. Pas généré. Placeholder en attendant la reformulation Olga. |
| `mentions_reglementaires` | Assemblé par le code | `buildMentionsReglementaires`, **réutilisé tel quel d'Airbnb** (numéro d'enregistrement + DPE F/G). |
| `note_etat` | Assemblé par le code | `buildNoteEtat`, **réutilisé tel quel d'Airbnb**. Disclosure de l'état physique, cas négatifs uniquement. |
| `note_quartier` | Assemblé par le code | `buildNoteQuartier`, **réutilisé tel quel d'Airbnb**. Disclosure du quartier (sécurité, nuisances, secteur), cas négatifs uniquement. |
| `note_camera` | Assemblé par le code | Déclaration légale d'une caméra **extérieure** si la fiche en signale une (`CAMERA_EXTERIEURE_DISCLOSURE`, même obligation que sur Airbnb). Vide sinon. |

## Décisions d'implémentation

- **Champs générés par le modèle** : exactement `nom`, `about_property`, `about_neighbourhood` (et aucun autre — toute clé en trop est rejetée par le parsing strict, comme pour Airbnb).
- **Disclosures sur Booking aussi** (décision Julien) : `note_etat` / `note_quartier` réutilisent la même logique qu'Airbnb. Booking n'ayant pas de champ disclosure dédié, ils sont **exposés en champs distincts** dans `output_assemble.booking` — l'opérateur les recopie dans l'extranet.
- **Caméras** : caméra **extérieure** → champ distinct `note_camera` (miroir de la mention légale Airbnb). Caméra **intérieure** → drapeau de conformité dans `generation_meta.conformite` uniquement, jamais affichée.
- **Sanitisation du nom** (règles dures Booking) : normalisation typographique (tiret cadratin → trait d'union, guillemets courbes → droits), strip hors-charset, correction tout-majuscules → Title Case, plafond de 5 chiffres consécutifs, retrait des plateformes concurrentes et superlatifs marketing flagrants, longueur 3-255. Le filtre de mots opaque de Booking n'est pas résoluble côté code : on filtre les patterns évidents, l'opérateur ajuste dans l'extranet en cas de rejet.
- **Scrub des interdits** (filet sur les champs profil, le prompt l'interdit déjà) : retrait des coordonnées (téléphone, email), liens/URL, plateformes concurrentes. Booking lui-même est autorisé.

## Stockage

Upsert dans `agent_outputs` avec `plateforme = 'booking'`, **mêmes colonnes** que l'Airbnb (`output_assemble`, `output_modele_brut`, `contrat_entree`, `generation_meta`, `prompt_version`, `statut`…). Une ligne par `(fiche, plateforme)`.

## Règle transverse (identique à Airbnb)

Tout ce qui est déterministe, légal ou sensible (réglementation, disclosures état/quartier, caméra, about_host) est assemblé par le code à partir de la fiche, jamais généré par le modèle. Le déterministe au code, la prose au modèle.

## Hors périmètre

- Limites exactes des champs profil, mots filtrés non évidents, date de retrait Booking : à valider dans l'extranet plus tard (cf. cadrage §7), ne bloquent pas le build.
- Branchement prod (push API Monday, démantèlement n8n / Make) : chantier séparé.
