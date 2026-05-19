-- Amélioration du trigger handle_new_user()
--
-- La version actuelle ignore raw_user_meta_data et met prénom/nom/rôle en dur.
-- Conséquence : un compte créé via auth.admin.createUser() ne récupère jamais
-- son prénom/nom, même si l'Edge Function admin-users les passe en user_metadata.
--
-- Nouvelle version : lit les métadonnées si présentes, sinon fallback aux
-- valeurs par défaut (chaîne vide pour prénom/nom, 'coordinateur' pour le rôle).
--
-- À jouer manuellement dans le SQL Editor Supabase après merge de la PR.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, role, prenom, nom, active, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'coordinateur'),
    COALESCE(new.raw_user_meta_data->>'prenom', ''),
    COALESCE(new.raw_user_meta_data->>'nom', ''),
    true,
    now(),
    now()
  );
  RETURN new;
END;
$function$;
