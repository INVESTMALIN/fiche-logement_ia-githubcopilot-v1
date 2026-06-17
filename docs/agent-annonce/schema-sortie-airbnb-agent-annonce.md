# Schéma de sortie Airbnb — Agent annonce

Contrat de ce que l'agent produit pour Airbnb. Sert de référence pour le prompt, la table `agent_outputs` et l'UI FicheFinalisation. Validé.

Distinction fondamentale : certains champs sont **générés par le modèle** (la prose), d'autres sont **assemblés par le code** de l'Edge Function (passthrough, template, et contenus déterministes ou sensibles). Le modèle ne sort que ses champs ; l'Edge Function merge ensuite les blocs code pour reconstituer l'objet complet ci-dessous.

## Structure JSON complète (après assemblage)

```json
{
  "airbnb": {
    "titres": ["", "", ""],
    "nombre_voyageurs": 0,
    "description": "",
    "logement": "",
    "acces_voyageurs": "",
    "echanges_voyageurs": "",
    "quartier": "",
    "comment_se_deplacer": "",
    "autres_remarques": "",
    "mentions_reglementaires": {
      "numero_enregistrement": "",
      "dpe_classe": "",
      "mention_consommation_excessive": "",
      "estimation_depenses_annuelles": ""
    },
    "note_etat": "",
    "note_quartier": ""
  }
}
```

## Détail des champs

| Champ | Source | Notes |
|---|---|---|
| `titres` | Généré (modèle) | 3 propositions. 28 à 45 caractères, cible 37 à 43. Ancrage géographique obligatoire. |
| `nombre_voyageurs` | Passthrough fiche | Recopié depuis la capacité, pas généré. |
| `description` | Généré (modèle) | Résumé principal. Cible 430 à 450, plafond 500. |
| `logement` | Généré (modèle) | « L'espace ». Prose par zone, sans titres rigides. |
| `acces_voyageurs` | Généré (modèle) | « Accès des voyageurs ». |
| `echanges_voyageurs` | Template conciergerie (code) | Texte constant, identique pour tous les biens. Pas généré. |
| `quartier` | Généré (modèle) | « Le quartier » : ambiance positive et POI uniquement. Ne touche jamais aux négatifs (sécurité, nuisances, socio-économique), gérés par `note_quartier`. |
| `comment_se_deplacer` | Généré (modèle) | Basé sur l'adresse réelle et le bloc localisation. |
| `autres_remarques` | Généré (modèle) | Règles internes habillées + équipements de sécurité présents. |
| `mentions_reglementaires` | Assemblé par le code | DPE et numéro d'enregistrement. Voir ci-dessous. |
| `note_etat` | Assemblé par le code | Disclosure de l'état physique (logement, immeuble). Voir ci-dessous. |
| `note_quartier` | Assemblé par le code | Disclosure du quartier (sécurité, nuisances, secteur). Voir ci-dessous. |

## Champs assemblés par le code (jamais par le modèle)

### mentions_reglementaires
- `numero_enregistrement` : recopié de la fiche.
- `dpe_classe` : recopié de la fiche.
- `mention_consommation_excessive` : phrase légale figée « Logement à consommation énergétique excessive », pour les classes F et G uniquement.
- `estimation_depenses_annuelles` : formatage des deux nombres saisis (borne basse et haute), pour F et G uniquement.

### note_etat (disclosure de l'état physique)
Politique Letahost : signaler honnêtement un état physique dégradé pour gérer les attentes, mais élégamment. Phrases approuvées injectées par le code, **uniquement pour les cas négatifs** (état moyen/dégradé/très mauvais, propreté sale, très bruyant, pas accessible PMR). Cas positifs : rien d'injecté, le modèle écrit normalement. Le set de phrases doit être validé par Olga.

### note_quartier (disclosure du quartier)
Même logique, appliquée au quartier. Phrases approuvées injectées par le code, **uniquement pour les signaux négatifs** :
- quartier défavorisé,
- sécurité modérée ou zone à risques,
- élément perturbateur à proximité (la phrase intègre l'élément précis décrit par le coordinateur, ex. un restaurant bruyant).
Le champ `quartier` généré par le modèle reste sur le positif (ambiance, POI) et ne touche jamais à ces sujets. Le set de phrases doit être validé par Olga, en même temps que celui de `note_etat`.

## Règle transverse

Tout ce qui est déterministe, légal ou sensible (réglementation, disclosure état, disclosure quartier) est assemblé par le code à partir de la fiche, jamais généré par le modèle. Le déterministe au code, la prose au modèle. Le modèle ne peut donc pas déformer une mention légale ni déraper sur un sujet sensible.

## Note de déploiement

Le nouvel agent tourne en parallèle de l'ancien système n8n. On ajoute le nouveau sans rien casser. L'ancien système (n8n, bucket `annonce-pdfs`, ancienne colonne Monday) n'est démantelé qu'une fois le nouveau validé. Le cleanup est la dernière étape du chantier.

## Périmètre

Ce schéma couvre Airbnb. Booking aura sa propre structure (champs profil About the property / neighbourhood / host, description auto-générée par Booking), traité séparément après Airbnb.
