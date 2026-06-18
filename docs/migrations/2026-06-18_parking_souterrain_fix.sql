-- ============================================================
-- Correction de données : « Parking sous-terrain » → « Parking souterrain »
-- Date : 2026-06-18
-- Branche : feat/mini-ui-annonce-inspection
-- ============================================================
-- À exécuter dans le SQL Editor du dashboard Supabase (DEV puis PROD).
--
-- Contexte : le libellé d'option du formulaire (FicheEquipements.jsx) contenait
-- la faute « Parking sous-terrain » (souterrain s'écrit en un seul mot). Le
-- libellé est la valeur stockée telle quelle dans `fiches`, donc les fiches déjà
-- saisies portent la valeur fautive. Le libellé a été corrigé dans le code ;
-- cette migration aligne les valeurs déjà stockées, sinon :
--   - la case/le radio n'apparaît plus coché à la réouverture de la fiche ;
--   - l'agent annonce continue de générer « parking sous-terrain ».
--
-- Migration de données pure, idempotente (re-exécutable sans effet de bord).
-- ============================================================

-- Parking PAYANT (valeur texte, radio unique)
UPDATE fiches
SET equipements_parking_payant_type = 'Parking souterrain'
WHERE equipements_parking_payant_type = 'Parking sous-terrain';

-- Parking GRATUIT sur place (TEXT[], cases multiples) : remplace l'élément
-- fautif dans le tableau, en préservant les autres options cochées.
UPDATE fiches
SET equipements_parking_sur_place_types =
      array_replace(equipements_parking_sur_place_types, 'Parking sous-terrain', 'Parking souterrain')
WHERE 'Parking sous-terrain' = ANY(equipements_parking_sur_place_types);

-- Vérification (doit renvoyer 0 ligne après exécution) :
-- SELECT id, equipements_parking_payant_type, equipements_parking_sur_place_types
-- FROM fiches
-- WHERE equipements_parking_payant_type = 'Parking sous-terrain'
--    OR 'Parking sous-terrain' = ANY(equipements_parking_sur_place_types);
