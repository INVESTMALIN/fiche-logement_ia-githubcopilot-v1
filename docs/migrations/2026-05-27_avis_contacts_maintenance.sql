-- ============================================================
-- Migration : Contacts de maintenance fournis par le propriétaire
-- Date     : 2026-05-27
-- Branche  : feat/contacts-maintenance
-- ============================================================
-- À exécuter dans le SQL Editor du dashboard Supabase.
-- Toutes les colonnes sont nullable / défauts sûrs → migration non-bloquante,
-- les fiches existantes restent compatibles (tableau vide / booléen NULL).
-- ============================================================

ALTER TABLE fiches
  -- 🔧 Question racine : le propriétaire a-t-il des contacts à fournir ?
  -- NULL = non renseigné, false = non, true = oui (la liste peut rester vide
  -- si la case est cochée avant la saisie des contacts).
  ADD COLUMN IF NOT EXISTS avis_a_contacts_maintenance BOOLEAN,

  -- 📇 Liste des contacts artisans / maintenance.
  -- Stockage en JSONB plutôt qu'en table dédiée :
  --   - la donnée est toujours lue / écrite avec la fiche, jamais requêtée seule
  --   - le volume est faible (quelques contacts par fiche)
  --   - cohérent avec le modèle "fiche = gros document plat" du projet
  -- Format de chaque élément :
  --   {
  --     "nom_prenom":  "...",
  --     "societe":     "...",
  --     "activite":    "Electricité" | "Plomberie" | "Serrurerie"
  --                  | "Jardinerie / Paysagisme"
  --                  | "Multi-Services / Homme à tout faire"
  --                  | "Anti nuisibles" | "Autres",
  --     "telephone":   "...",
  --     "email":       "...",
  --     "commentaire": "..."
  --   }
  ADD COLUMN IF NOT EXISTS avis_contacts_maintenance JSONB DEFAULT '[]'::jsonb;

-- ⚠️ Suivi (hors périmètre de ce lot, à traiter dans une PR séparée) :
--   - Remontée vers le board Monday dédié : en attente du mapping métier
--     (concaténation éventuelle nom_prenom + societe au moment du push).
--   - Pas d'impact sur notify_fiche_completed() : aucun fichier média ici,
--     uniquement des données texte stockées en JSONB.

COMMIT;
