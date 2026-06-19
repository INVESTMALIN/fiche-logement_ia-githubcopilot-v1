# Phrases injectées par le code — Agent annonce Airbnb

> Extraites du prompt n8n de production (branche génération). Phrases validées, actuellement en prod. Elles sont **injectées verbatim par l'Edge Function `annonce-generate`**, jamais générées ni reformulées par le modèle. Mappées sur les champs du schéma de sortie (`schema-sortie-airbnb-agent-annonce.md`).
>
> Source : ancien prompt n8n. Quelques arbitrages signalés en cours de route (versions divergentes, règle douteuse à ne pas reprendre, formulation à figer ou à créer).

---

## note_etat — état du logement (cas négatifs uniquement)

Déclencheur : verdict / `section_avis.grille_*`. États positifs (excellent, bon) = aucune injection, le modèle écrit normalement.

- **État moyen** : « Notre logement a traversé le temps, avec quelques petites marques d'usage, mais nous l'avons pensé pour vous offrir un cadre chaleureux et pratique. »
- **État dégradé** : « Notre logement n'est pas neuf, il a traversé les années, avec du mobilier et des installations marqués par le temps mais ce logement nous est cher et nous sommes convaincus qu'il saura vous plaire. » (correction 7755 : accord « convaincus » + point final)
- **Très mauvais état** : « Ce logement n'est pas tout neuf, mais il a une âme. C'est un vrai lieu de vie, avec quelques traces du temps ici ou là, rien de gênant, juste des marques d'authenticité. Si vous cherchez un endroit impeccable comme un hôtel, ce n'est peut-être pas ce qu'il vous faut. Mais si vous aimez les lieux chaleureux, simples et pleins de caractère, vous vous y sentirez bien. » (DÉCIDÉ post-7755 : les éléments vétustes en texte libre ne sont **pas** intégrés — hors périmètre.)
- **Propreté sale (logement)** : pas de phrase canon. (DÉCIDÉ post-7755 : les éléments sales décrits en texte libre ne sont **pas** intégrés — hors périmètre.)

---

## note_etat — état de l'immeuble (cas négatifs uniquement)

Déclencheur : `section_avis.immeuble_*`.

- **Immeuble en mauvais état** : « L'immeuble est ancien, avec son charme et ses petites imperfections. Vous pourriez croiser des murs marqués ou une peinture un peu passée. Ce n'est pas du neuf, mais c'est vivant, simple, et agréable à vivre. On préfère le dire avec honnêteté, pour que vous réserviez avec les bonnes attentes. »
- **Propreté de l'immeuble sale** : « Même si les espaces communs peuvent manquer de soin, le logement reste agréable et fonctionnel pour votre séjour. » (correction 7755 : « l'appartement » → « le logement » pour rester générique sur tous les types de bien)
- **Immeuble inaccessible / logement non PMR** : « Le logement n'est pas accessible aux personnes PMR. » (point final ajouté post-7755). DÉCIDÉ post-7755 : ce négatif se déclenche **uniquement** via le choix « inaccessible » de la grille Avis (`avis_immeuble_accessibilite`). La case « accessible PMR » des Équipements ne sert qu'au **positif** (zone modèle) et ne déclenche plus aucun négatif — décochée, elle reste à `null` en conditions réelles. Anti-contradiction : si l'immeuble est « inaccessible », la mention positive d'accessibilité n'est pas exposée au modèle (le négatif prime).
- **Niveau sonore très bruyant** : AUCUNE phrase canon dans l'ancien prompt. Décision : on n'invente pas, rien n'est injecté pour ce cas.

---

## note_quartier — cas négatifs uniquement

Déclencheur : `section_avis.quartier_securite` / `quartier_perturbations` / `quartier_types` = « défavorisé ». Le quartier positif reste rédigé par le modèle (voir section ton plus bas).

- **Quartier défavorisé** (3 variantes au choix du coordinateur) :
  - « Un quartier modeste, avec moins d'infrastructures »
  - « Un quartier en évolution, offrant une expérience simple et authentique de la vie locale. »
  - « Un quartier animé, un peu brut et moins esthétique, mais où l'on trouve des services essentiels du quotidien. »
- **Sécurité modérée / zone à risques** : « Le logement se situe dans un quartier dynamique. Pour votre confort, nous vous recommandons toutefois de rester vigilant dans certaines zones environnantes. »
- **Élément perturbateur à proximité** (template, on insère l'élément précis décrit par le coordinateur) : « Un point à signaler concernant l'environnement du logement : [élément précis]. » (reformulé post-7755 : le texte libre suit un deux-points et devient un fragment autonome, sans accord grammatical avec ce qui précède — évite « à proximité de une voie ferrée » et les redondances. Le libellé du champ Avis invite désormais à saisir juste l'élément, pas une phrase.)

---

## echanges_voyageurs — template constant injecté par le code

Base validée en prod : « Nous assurons des échanges fluides via la plateforme de réservation Airbnb. Nous restons disponibles avant, pendant et après votre venue pour tout besoin ou demande complémentaire. »

Règles de l'ancien prompt : garder « avant, pendant et après votre venue », NE PAS réutiliser « équipe locale », possibilité de mentionner WhatsApp en cas d'urgence.

ARBITRAGE : dans l'ancien système cette phrase était générée à partir d'une consigne, donc le texte variait. On fige **une** version canon ici, à valider au moment du brief.

---

## Phrase favoris — constante de fin injectée par le code

Version canonique (complète, identique au contrat d'entrée) : « Vous appréciez ce logement ? Ajoutez-le à vos favoris pour suivre ses disponibilités et y revenir facilement. N'hésitez pas à nous contacter pour toute question supplémentaire. »

ARBITRAGE : une version tronquée traîne dans une autre branche n8n (« Ajoutez le à vos favoris pour suivre la disponibilité et y revenir facilement. »). On garde la version complète ci-dessus.

---

## Caméras — mention de sécurité

Règle Airbnb (avril 2024) : caméras INTÉRIEURES interdites, jamais sur l'annonce, et on peut alerter si la fiche en signale une. Caméras EXTÉRIEURES autorisées MAIS Airbnb oblige à les déclarer dans l'annonce. La fiche collecte les deux (`section_securite.equipements`).

ARBITRAGE (en attente Julien) : la seule formulation utile = une phrase standard courte déclarant une caméra extérieure, déclenchée uniquement si la fiche en signale une, sinon rien. Décision d'inclure cette phrase ou de zapper les caméras pour la v1 à confirmer.

---

## Horaires de tranquillité — constante

« Respecter des horaires de tranquillité entre 22h00 et 8h00 » (injectée dans les autres remarques quand applicable).

---

## Terminologie imposée

Confirmée par le prompt de prod, déjà reprise dans `prompt-v1` :
- cafetière → machine à café (jamais la marque de la machine)
- draps → linge de lit
- parking gratuit sur place → stationnement gratuit sur place

TRANCHÉ (retour Victoria, 2026-06-17) : l'ancien prompt imposait « ascenseur → monte-charge ». Victoria ne sait pas d'où ça vient, donc on abandonne la règle et on reste sur « ascenseur ». `prompt-v1` est déjà aligné, rien à changer côté prompt.

---

## Phrases positives de quartier — RÉFÉRENCE DE TON, pas injectées

Dans la nouvelle archi, le modèle rédige le quartier positif à partir des POI réels. Ces phrases canon de l'ancien prompt ne sont donc PAS injectées par le code, elles servent juste de référence de ton si besoin :

- Quartier neuf : « Découvrez un quartier neuf, pensé pour le confort moderne et la vie d'aujourd'hui. »
- Quartier ancien : « Plongez dans le charme de l'histoire, au cœur d'un quartier au caractère unique et authentique. »
- Quartier populaire : « Un quartier animé et populaire, où l'on partage l'authenticité et l'ambiance de la vie de quartier. »
- Quartier résidentiel : « Profitez de la sérénité d'un quartier résidentiel, parfait pour se ressourcer après vos journées. »
- Quartier excentré : « Un havre de paix à l'écart de l'effervescence, idéal pour ceux qui recherchent calme et quiétude. »
- Quartier central : « Savourez la proximité du centre, entre rues animées, commerces et facilité d'accès. »
- Quartier chic : « Immergez-vous dans un quartier soigné, où l'élégance et la douceur de vivre se rencontrent. »
- Quartier intermédiaire : « Un quartier accueillant et convivial, idéal pour une expérience simple et chaleureuse. »

---

## Retours terrain présents dans le prompt de prod (à refléter dans prompt-v1)

Déjà couverts par `prompt-v1`, mais utiles à garder en tête comme fautes IA connues :
- Pas de chambre à l'étage inventée dans un appartement sans deuxième étage.
- Pas de vélo suggéré par défaut (Colmar pavés et piétons), s'appuyer sur l'adresse réelle.
- Titres jamais au-delà de 50 caractères.
- Mots-clés géographiques dans la première description (ville, secteur reconnaissable).
