CREATE OR REPLACE FUNCTION public.notify_fiche_completed()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  media_part1 jsonb;
  media_part2 jsonb;
  media_part3 jsonb;
  media_part4 jsonb;
  media_part5 jsonb;
  media_final jsonb;
BEGIN
  IF NEW.statut = 'Complété' AND OLD.statut IS DISTINCT FROM 'Complété' THEN

    -- PARTIE 1 : Clefs + Equipements + Linge + Chambres (21 champs - AJOUT wifi_routeur_photo)
    media_part1 := jsonb_build_object(
      'clefs_emplacement_photo', NEW.clefs_emplacement_photo,
      'clefs_emplacement_emballage_photo', NEW.clefs_emplacement_emballage_photo,
      'clefs_interphone_photo', NEW.clefs_interphone_photo,
      'clefs_tempo_gache_photo', NEW.clefs_tempo_gache_photo,
      'clefs_digicode_photo', NEW.clefs_digicode_photo,
      'clefs_photos', NEW.clefs_photos,
      'equipements_poubelle_photos', NEW.equipements_poubelle_photos,
      'equipements_disjoncteur_photos', NEW.equipements_disjoncteur_photos,
      'equipements_vanne_eau_photos', NEW.equipements_vanne_eau_photos,
      'equipements_chauffage_eau_photos', NEW.equipements_chauffage_eau_photos,
      'equipements_video_acces_poubelle', NEW.equipements_video_acces_poubelle,
      'equipements_video_systeme_chauffage', NEW.equipements_video_systeme_chauffage,
      'equipements_wifi_routeur_photo', NEW.equipements_wifi_routeur_photo,
      'linge_photos_linge', NEW.linge_photos_linge,
      'linge_emplacement_photos', NEW.linge_emplacement_photos,
      'chambres_chambre_1_photos', NEW.chambres_chambre_1_photos_chambre,
      'chambres_chambre_2_photos', NEW.chambres_chambre_2_photos_chambre,
      'chambres_chambre_3_photos', NEW.chambres_chambre_3_photos_chambre,
      'chambres_chambre_4_photos', NEW.chambres_chambre_4_photos_chambre,
      'chambres_chambre_5_photos', NEW.chambres_chambre_5_photos_chambre,
      'chambres_chambre_6_photos', NEW.chambres_chambre_6_photos_chambre,
      'salle_de_bain_1_photos', NEW.salle_de_bains_salle_de_bain_1_photos_salle_de_bain
    );

    -- PARTIE 2 : Salles de bains + Cuisine 1 vidéos (19 champs)
    media_part2 := jsonb_build_object(
      'salle_de_bain_2_photos', NEW.salle_de_bains_salle_de_bain_2_photos_salle_de_bain,
      'salle_de_bain_3_photos', NEW.salle_de_bains_salle_de_bain_3_photos_salle_de_bain,
      'salle_de_bain_4_photos', NEW.salle_de_bains_salle_de_bain_4_photos_salle_de_bain,
      'salle_de_bain_5_photos', NEW.salle_de_bains_salle_de_bain_5_photos_salle_de_bain,
      'salle_de_bain_6_photos', NEW.salle_de_bains_salle_de_bain_6_photos_salle_de_bain,
      'cuisine1_refrigerateur_video', NEW.cuisine_1_refrigerateur_video,
      'cuisine1_congelateur_video', NEW.cuisine_1_congelateur_video,
      'cuisine1_mini_refrigerateur_video', NEW.cuisine_1_mini_refrigerateur_video,
      'cuisine1_cuisiniere_video', NEW.cuisine_1_cuisiniere_video,
      'cuisine1_plaque_cuisson_video', NEW.cuisine_1_plaque_cuisson_video,
      'cuisine1_four_video', NEW.cuisine_1_four_video,
      'cuisine1_micro_ondes_video', NEW.cuisine_1_micro_ondes_video,
      'cuisine1_lave_vaisselle_video', NEW.cuisine_1_lave_vaisselle_video,
      'cuisine1_cafetiere_video', NEW.cuisine_1_cafetiere_video,
      'cuisine1_bouilloire_video', NEW.cuisine_1_bouilloire_video,
      'cuisine1_grille_pain_video', NEW.cuisine_1_grille_pain_video,
      'cuisine1_blender_video', NEW.cuisine_1_blender_video,
      'cuisine1_cuiseur_riz_video', NEW.cuisine_1_cuiseur_riz_video,
      'cuisine1_machine_pain_video', NEW.cuisine_1_machine_pain_video
    );

    -- PARTIE 3 : Cuisine photos + Autres sections (20 champs - AJOUT salon_sam_canape_lit_video)
    media_part3 := jsonb_build_object(
      'cuisine1_cuisiniere_photo', NEW.cuisine_1_cuisiniere_photo,
      'cuisine1_plaque_cuisson_photo', NEW.cuisine_1_plaque_cuisson_photo,
      'cuisine1_four_photo', NEW.cuisine_1_four_photo,
      'cuisine1_micro_ondes_photo', NEW.cuisine_1_micro_ondes_photo,
      'cuisine1_lave_vaisselle_photo', NEW.cuisine_1_lave_vaisselle_photo,
      'cuisine1_cafetiere_photo', NEW.cuisine_1_cafetiere_photo,
      'cuisine1_hotte_video', NEW.cuisine_1_hotte_video,
      'cuisine2_photos_tiroirs_placards', NEW.cuisine_2_photos_tiroirs_placards,
      'salon_sam_photos', NEW.salon_sam_photos_salon_sam,
      'salon_sam_canape_lit_video', NEW.salon_sam_canape_lit_video,
      'exterieur_photos_espaces', NEW.equip_spe_ext_exterieur_photos,
      'jacuzzi_photos_jacuzzi', NEW.equip_spe_ext_jacuzzi_photos,
      'barbecue_photos', NEW.equip_spe_ext_barbecue_photos,
      'piscine_video', NEW.equip_spe_ext_piscine_video,
      'communs_photos_espaces', NEW.communs_photos_espaces_communs,
      'bebe_photos_equipements', NEW.bebe_photos_equipements_bebe,
      'visite_video_visite', NEW.visite_video_visite,
      'guide_acces_photos_etapes', NEW.guide_acces_photos_etapes,
      'guide_acces_video_acces', NEW.guide_acces_video_acces,
      'securite_photos_equipements', NEW.securite_photos_equipements_securite
    );

    -- PARTIE 4 : Nouveaux champs Avis + Éléments abîmés (23 champs - AJOUT avis_immeuble_facade_photos)
    media_part4 := jsonb_build_object(
      -- Avis
      'avis_video_globale_videos', NEW.avis_video_globale_videos,
      'avis_logement_vis_a_vis_photos', NEW.avis_logement_vis_a_vis_photos,
      'avis_logement_etat_videos', NEW.avis_logement_etat_videos,
      'avis_immeuble_facade_photos', NEW.avis_immeuble_facade_photos,

      -- Cuisine éléments abîmés
      'cuisine1_elements_abimes_photos', NEW.cuisine_1_elements_abimes_photos,

      -- Salon/SAM éléments abîmés
      'salon_sam_salon_elements_abimes_photos', NEW.salon_sam_salon_elements_abimes_photos,
      'salon_sam_salle_manger_elements_abimes_photos', NEW.salon_sam_salle_manger_elements_abimes_photos,

      -- Chambres éléments abîmés
      'chambres_chambre_1_elements_abimes_photos', NEW.chambres_chambre_1_elements_abimes_photos,
      'chambres_chambre_2_elements_abimes_photos', NEW.chambres_chambre_2_elements_abimes_photos,
      'chambres_chambre_3_elements_abimes_photos', NEW.chambres_chambre_3_elements_abimes_photos,
      'chambres_chambre_4_elements_abimes_photos', NEW.chambres_chambre_4_elements_abimes_photos,
      'chambres_chambre_5_elements_abimes_photos', NEW.chambres_chambre_5_elements_abimes_photos,
      'chambres_chambre_6_elements_abimes_photos', NEW.chambres_chambre_6_elements_abimes_photos,

      -- Salles de bains éléments abîmés
      'salle_de_bains_salle_de_bain_1_elements_abimes_photos', NEW.salle_de_bains_salle_de_bain_1_elements_abimes_photos,
      'salle_de_bains_salle_de_bain_2_elements_abimes_photos', NEW.salle_de_bains_salle_de_bain_2_elements_abimes_photos,
      'salle_de_bains_salle_de_bain_3_elements_abimes_photos', NEW.salle_de_bains_salle_de_bain_3_elements_abimes_photos,
      'salle_de_bains_salle_de_bain_4_elements_abimes_photos', NEW.salle_de_bains_salle_de_bain_4_elements_abimes_photos,
      'salle_de_bains_salle_de_bain_5_elements_abimes_photos', NEW.salle_de_bains_salle_de_bain_5_elements_abimes_photos,
      'salle_de_bains_salle_de_bain_6_elements_abimes_photos', NEW.salle_de_bains_salle_de_bain_6_elements_abimes_photos,

      -- Équipements extérieurs éléments abîmés
      'equip_spe_ext_garage_elements_abimes_photos', NEW.equip_spe_ext_garage_elements_abimes_photos,
      'equip_spe_ext_buanderie_elements_abimes_photos', NEW.equip_spe_ext_buanderie_elements_abimes_photos,
      'equip_spe_ext_autres_pieces_elements_abimes_photos', NEW.equip_spe_ext_autres_pieces_elements_abimes_photos
    );

    -- PARTIE 5 : Nouveaux médias Équipements + Télétravail (AJOUT speedtest, espace_travail et local à vélo)
    media_part5 := jsonb_build_object(
      -- TV
      'equipements_tv_video', NEW.equipements_tv_video,
      'equipements_tv_console_video', NEW.equipements_tv_console_video,
      'equipements_tv_services', NEW.equipements_tv_services,
      'equipements_tv_consoles', NEW.equipements_tv_consoles,

      -- Climatisation
      'equipements_climatisation_video', NEW.equipements_climatisation_video,

      -- Chauffage
      'equipements_chauffage_video', NEW.equipements_chauffage_video,

      -- Lave-linge
      'equipements_lave_linge_video', NEW.equipements_lave_linge_video,

      -- Sèche-linge
      'equipements_seche_linge_video', NEW.equipements_seche_linge_video,

      -- Parking
      'equipements_parking_photos', NEW.equipements_parking_photos,
      'equipements_parking_videos', NEW.equipements_parking_videos,

      -- Ventilateur
      'equipements_ventilateur_photos', NEW.equipements_ventilateur_photos,
      'equipements_ventilateur_videos', NEW.equipements_ventilateur_videos,

      -- Sèche-serviette
      'equipements_seche_serviettes_photos', NEW.equipements_seche_serviettes_photos,
      'equipements_seche_serviettes_videos', NEW.equipements_seche_serviettes_videos,

      -- Ménage
      'equipements_menage_aspirateur_photos', NEW.equipements_menage_aspirateur_photos,
      'equipements_menage_serpillere_photos', NEW.equipements_menage_serpillere_photos,
      'equipements_menage_balais_photos', NEW.equipements_menage_balais_photos,
      'equipements_menage_balayette_photos', NEW.equipements_menage_balayette_photos,
      'equipements_menage_autres_elements_photos', NEW.equipements_menage_autres_elements_photos,

      -- Local à vélo
      'equip_spe_ext_local_velo_photos', NEW.equip_spe_ext_local_velo_photos,
      'equip_spe_ext_local_velo_video_acces', NEW.equip_spe_ext_local_velo_video_acces,

      -- Télétravail
      'teletravail_speedtest_photos', NEW.teletravail_speedtest_photos,
      'teletravail_espace_travail_photos', NEW.teletravail_espace_travail_photos
    );

    -- Fusion complète
    media_final := media_part1 || media_part2 || media_part3 || media_part4 || media_part5;

    -- Envoi vers Make
    PERFORM net.http_post(
      url := 'https://hook.eu2.make.com/ydjwftmd7czs4rygv1rjhi6u4pvb4gdj',
      body := jsonb_build_object(
        'id', NEW.id,
        'nom', NEW.nom,
        'statut', NEW.statut,
        'created_at', NEW.created_at,
        'updated_at', NEW.updated_at,
        'proprietaire', jsonb_build_object(
          'prenom', NEW.proprietaire_prenom,
          'nom', NEW.proprietaire_nom,
          'email', NEW.proprietaire_email
        ),
        'logement', jsonb_build_object(
          'numero_bien', NEW.logement_numero_bien
        ),
        'pdfs', jsonb_build_object(
          'logement_url', NEW.pdf_logement_url,
          'menage_url', NEW.pdf_menage_url
        ),
        'media', media_final
      ),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  END IF;
  RETURN NEW;
END;
$function$