# 📸 SYSTÈME D'UPLOAD PHOTOS & VIDÉOS - Documentation Complète
*Mise à jour : 29 juillet 2026*

> **Ce qui a changé le 29/07/2026** : la synchronisation Google Drive a été entièrement
> repensée. Elle repose désormais sur un manifeste en base de données et un scénario Make
> générique de 18 modules, au lieu de 375 modules avec le mapping câblé en dur.
> L'ancien système est conservé en annexe de ce document, section 14, comme plan de repli
> pendant la période de transition.

---

## 🎯 VUE D'ENSEMBLE

Système complet d'upload, compression, et gestion du cycle de vie des médias
(photos et vidéos) pour l'application Fiche Logement.

### Fonctionnalités principales
- Upload photos et vidéos vers Supabase Storage
- Compression automatique (photos 2 MB, vidéos 95-350 MB)
- Cleanup automatique du storage (Edge Function + Cron)
- Fallback UI pour médias archivés
- Synchronisation Google Drive pilotée par un manifeste en base
- Validation numéro de bien obligatoire

### Sommaire
1. Composant PhotoUpload.jsx
2. Compression automatique
3. Storage Supabase
4. Cleanup automatique
5. Fallback UI
6. **Synchronisation Google Drive, système actuel (V2)**
7. Base de données
8. Validation et gestion des erreurs
9. Interface utilisateur
10. Tests validés
11. Points d'attention
12. Références
13. Chantiers restants
14. **ANNEXE : note historique de l'ancien système (V1)**

---

## 📦 1. COMPOSANT PHOTOUPLOAD.JSX

**Fichier** : `src/components/PhotoUpload.jsx`

```javascript
<PhotoUpload
  fieldPath="section_equipements.poubelle_photos"
  label="Photos du local poubelle"
  multiple={true}
  maxFiles={10}
  capture={false}
  acceptVideo={false}
/>
```

**États internes** : `uploading`, `compressing`, `backendCompressing`, `error`.

---

## 🗜️ 2. COMPRESSION AUTOMATIQUE

### 2.1 Photos, côté client
Librairie `browser-image-compression`, cible 2 MB, Web Worker.
Résultat observé : 2.8 MB vers 1.6 MB.

### 2.2 Vidéos, deux niveaux

**Niveau 1, navigateur (< 95 MB)** : Canvas + MediaRecorder + Web Audio API,
1600px, VP8 4 Mbps, Opus 128 kbps, sortie `.webm`.

**Niveau 2, backend Railway (> 95 MB)** :
`https://video-compressor-production.up.railway.app/compress-video`,
FFmpeg libx264 720p 2 Mbps, AAC 128 kbps, preset fast, crf 28, sortie `_compressed.mp4`.

### 2.3 Récapitulatif

| Type | Taille | Méthode | Résolution | Bitrate | Temps |
|------|--------|---------|------------|---------|-------|
| Photo | toutes | client | originale | - | < 1s |
| Vidéo | < 95 MB | aucune | originale | - | 0s |
| Vidéo | 95-350 MB | client | 1600px | 4 Mbps | 30s-2min |
| Vidéo | > 95 MB | Railway | 1280p | 2 Mbps | 2-5min |

**Limites après compression** : photos 20 MB, vidéos 350 MB.

---

## 💾 3. STORAGE SUPABASE

**Bucket** : `fiche-photos` (public)

```
user-{user_id}/
  fiche-{numero_bien}/
    {section}/
      {field}/
        {timestamp}_{randomId}_{nom_fichier}.jpg
```

**Naming** : timestamp + identifiant aléatoire 6 caractères + nom assaini
(accents supprimés, espaces en underscores, caractères spéciaux retirés).

---

## 🧹 4. CLEANUP AUTOMATIQUE

**Contexte** : le storage est plafonné à 100 GB et avait atteint 107 GB, bloquant
tous les uploads.

**Mécanique** :
- Fonction SQL `get_old_storage_objects(bucket, cutoff, limit)`, SECURITY DEFINER,
  seul moyen d'accéder à `storage.objects` depuis une Edge Function
- Edge Function `cleanup-storage`, suppression par batch de 1000 via l'API `.remove()`
- Cron `cleanup-storage-daily`, tous les jours à 2h

**Rétention**, vérifiée le 29/07/2026 dans le code déployé de l'Edge Function
(version 11, ACTIVE) :

| Bucket | Constante | Valeur |
|---|---|---|
| `fiche-photos` | `CUTOFF_DAYS_PHOTOS` | **75 jours** |
| `fiche-pdfs` | `CUTOFF_DAYS_PDFS` | **7 jours** |

`DRY_RUN` est à `false`, le cleanup supprime donc réellement.

> Note : les commentaires du code mentionnent encore 90 jours à deux endroits,
> ils n'ont pas suivi le changement de constante. Les valeurs ci-dessus sont
> celles qui s'appliquent.

> **CAUTION** : ne JAMAIS faire `DELETE FROM storage.objects`. Le trigger
> `protect_delete` interdit les suppressions SQL directes. Toujours passer par
> l'API `.remove()` pour éviter les fichiers orphelins.

**Monitoring, source de vérité** :
```sql
SELECT bucket_id,
  (sum((metadata->>'size')::bigint) / 1024.0^3)::numeric(10,2) AS total_gb
FROM storage.objects GROUP BY bucket_id ORDER BY total_gb DESC;
```

---

## 📁 5. FALLBACK UI, MÉDIAS ARCHIVÉS

Après le cleanup, les URLs restent en base mais les fichiers ont disparu.
Le composant `PhotoWithFallback` intercepte le 404 via `onError` et affiche
un placeholder "📁 Archivée sur Drive" au lieu d'une image cassée.

Un avertissement est affiché dès qu'une photo est présente, rappelant que les
médias ne restent qu'un temps limité dans l'application et vivent ensuite sur Drive.

---

# 🔄 6. SYNCHRONISATION GOOGLE DRIVE, SYSTÈME ACTUEL (V2)

## 6.1 Principe

Le routage d'un média vers son dossier Drive est de la **donnée**, pas de la structure.
Une table `media_manifest` décrit, pour chaque colonne média de `fiches`, le dossier de
destination et le préfixe de nom de fichier. Deux fonctions SQL exploitent ce manifeste.
Le scénario Make ne fait plus que boucler.

**Conséquence pratique** : ajouter un champ photo dans l'application se résume à un
INSERT dans `media_manifest`. Aucune modification du trigger, aucune modification du
scénario Make.

## 6.2 Table `media_manifest`

| colonne | rôle |
|---|---|
| `colonne_db` | colonne `text[]` de la table `fiches`, unique |
| `cle` | nom de la clé dans le payload, unique |
| `dossier` | chemin relatif sous `3. INFORMATIONS LOGEMENT`, ex `5. Équipements/Tuto` |
| `prefixe` | début du nom de fichier sur Drive, ex `Chambre_1` |
| `type` | `photo` ou `video` |
| `ordre` | ordre de traitement |
| `actif` | permet de désactiver une ligne sans la supprimer |
| `commentaire` | traçabilité |

**Contenu au 29/07/2026** : 109 lignes, toutes actives.

**RLS** : activée, une seule policy de lecture pour le rôle `authenticated`, aucune
policy d'écriture. La maintenance passe par le SQL Editor ou la clé de service.

> **Attention** : `notify_fiche_completed()` est SECURITY INVOKER. Si un jour le trigger
> vient lire ce manifeste, il le fera avec le rôle du coordinateur. Sans droit de lecture,
> il repartirait avec un bloc vide, en silence.

## 6.3 Vue `media_manifest_ecarts`

Garde-fou. Elle liste les colonnes média de `fiches` absentes du manifeste, et les lignes
du manifeste sans colonne correspondante. **Elle doit rester vide en permanence.**

```sql
SELECT * FROM public.media_manifest_ecarts;
```

Une ligne dans cette vue signifie qu'un champ photo n'arrivera jamais sur le Drive.

## 6.4 Fonction `build_media_jobs(p_fiche_id uuid)`

Lecture seule. Transforme une fiche en liste plate de fichiers à monter.
Une ligne par fichier.

**Sortie** : `ordre`, `colonne_db`, `cle`, `dossier`, `type`, `idx`, `url`, `nom_fichier`

**Mécanique** : `to_jsonb(fiche)` croisé avec `media_manifest`, puis
`jsonb_array_elements_text` avec `WITH ORDINALITY` pour déplier chaque tableau d'URLs.
Une colonne vide ou nulle ne produit rien, sans filtre à écrire.

**Nommage** : `prefixe` + `-photo-` ou `-vidéo-` + index.
Exemple : `Chambre_1-photo-3`. **Pas d'horodatage**, contrairement à l'ancien système.
L'extension est ajoutée côté Make à partir du fichier réellement téléchargé.

## 6.5 Fonction `build_media_folders(p_fiche_id uuid)`

Lecture seule. Renvoie la liste des dossiers Drive nécessaires à cette fiche,
triée par niveau.

**Sortie** : `niveau` (1 ou 2), `chemin`, `parent`, `nom`

Les dossiers de niveau 1 sont déduits du premier segment de chaque chemin, donc
`5. Équipements` remonte même si aucun média ne le vise directement.

## 6.6 Référentiel des dossiers Drive

```
2. DOSSIERS PROPRIETAIRES/
└── {numero_bien}. {Nom Propriétaire} - {Ville}/
    └── 3. INFORMATIONS LOGEMENT/
        ├── 2. Photos Visite Logement/
        ├── 3. Accès au logement/
        │   ├── Photos d'accès/
        │   └── Vidéos d'accès/
        ├── 4. Tour général du logement/
        ├── 5. Équipements/
        │   ├── Équipement/   ← toutes les PHOTOS d'équipement
        │   └── Tuto/         ← toutes les VIDÉOS tuto
        ├── 6. Identifiants Wifi/
        └── 7. État des lieux/
```

**Règle tranchée le 29/07/2026** : dans `5. Équipements`, toute vidéo va dans `Tuto`,
toute photo va dans `Équipement`. Les photos d'éléments abîmés vont dans `Équipement`.

**Apostrophes** : les noms `Photos d'accès` et `Vidéos d'accès` utilisent l'apostrophe
droite `'`, pas l'apostrophe typographique. Le manifeste doit rester aligné sur le Drive,
sinon la résolution échoue silencieusement.

## 6.7 Scénario Make V2

**Nom** : `LH - Fiche logement - Stockage Photos sur Drive V2`
**ID** : 9584334, dossier Make 403045
**Webhook** : `fiche-logement-photos-v2`, hook 4284060
**Payload attendu** : `{"fiche_id": "<uuid>"}`
**Connexion Drive** : `contact@invest-malin.com` (3214144)
**Shared drive** : `0AD6Ng43ueKE6Uk9PVA`
**18 modules**, contre 375 dans l'ancien scénario.

### Tronc commun

| # | Nom | Configuration |
|---|---|---|
| 2 | Webhook | reçoit `fiche_id` |
| 6 | Fiche Context | GET `/rest/v1/fiches?id=eq.{{2.fiche_id}}&select=logement_numero_bien,nom` |
| 3 | Job List | POST `/rest/v1/rpc/build_media_jobs` |
| 4 | Webhook response | 200, body `{{length(3.data)}}` |
| 7 | Dossier Bien | search dans `2. DOSSIERS PROPRIETAIRES`, query = numéro de bien, contains, limit 1 |
| 8 | Dossier Infos Logement | search dans `{{7.id}}`, query `3`, contains, limit 1 |
| 15 | Folder List | POST `/rest/v1/rpc/build_media_folders` |
| 9 | Dossiers N1 | search dans `{{8.id}}`, custom `trashed = false`, limit 100 |
| 10 | Table N1 | Array aggregator sur 9, champs `id` et `name` |
| 16 | Iter Dossiers | Iterator sur `{{15.data}}` |

Les trois appels Supabase portent un header `apikey` avec la clé secret
(`sb_secret_...`), pas d'en-tête `Authorization`. Les nouvelles clés secret ne sont pas
des JWT et ne peuvent pas être envoyées en Bearer.

La réponse webhook est volontairement placée avant tout travail sur le Drive :
l'appelant reçoit son 200 immédiatement, la suite tourne derrière.

**Filtre anti-appel fantôme**, posé le 30/07/2026 sur le lien entre le webhook (2) et
`Fiche Context` (6) : `{{2.fiche_id}}` doit exister. Ne pas le retirer.

Le webhook reçoit occasionnellement des appels sans corps exploitable, sans qu'aucune
fiche n'ait été finalisée. Le phénomène existait déjà sur le V1. Sans filtre, ces appels
traversent le webhook, atteignent `Fiche Context` avec un identifiant vide et font tomber
l'exécution en erreur. Le vrai coût n'est pas l'opération consommée, c'est qu'un faux
rouge dans l'historique devient indiscernable d'un échec réel. Avec le filtre, l'appel
s'arrête proprement en une opération et l'exécution est comptée comme un succès.

### Routeur 18, trois routes

**L'ordre des routes est critique.** Make fait passer chaque bundle dans les routes
l'une après l'autre. La route d'upload doit donc être **en dernier**, sinon elle démarre
avant que le dernier dossier ait été créé.

**Route 1, création niveau 1**

`Créer N1` (19) crée `{{16.nom}}` dans `{{8.id}}`.
Filtre, deux conditions en ET :
- `{{16.niveau}}` égal à `1`
- `{{get(map(10.array; "id"; "name"; 16.nom); 1)}}` **n'existe pas**

**Route 2, création niveau 2**

- `Parent N1` (22) cherche `{{16.parent}}` dans `{{8.id}}`, filtre `{{16.niveau}}` égal à `2`
- `Enfants N1` (23) liste les enfants de `{{22.id}}`
- `Table Enfants` (24) les agrège
- `Créer N2` (20) crée `{{16.nom}}` dans `{{22.id}}`, filtre
  `{{get(map(24.array; "id"; "name"; 16.nom); 1)}}` **n'existe pas**

**Route 3, upload**

- `Fin Dossiers` (25) agrège les bundles de l'Iterator. C'est un barrage : il garantit que
  la suite ne s'exécute qu'une fois, et après toutes les créations
- `Dossiers N1 bis` (26) refait la photo des dossiers, **après** création
- `Table N1 bis` (27) l'agrège
- `Dossiers N2` (11) cherche partout, requête dynamique :
  `('{{join(map(27.array; "id"); "' in parents or '")}}' in parents) and trashed = false`
- `Table N2` (12) l'agrège
- Iterator (5) éclate `{{3.data}}`, un bundle par fichier
- `Set variable` (13) calcule `folder_id` :

```
{{if(contains(5.dossier; "/");
     get(map(12.array; "id"; "name"; last(split(5.dossier; "/"))); 1);
     get(map(27.array; "id"; "name"; 5.dossier); 1))}}
```

- `Download` (14) télécharge `{{5.url}}`. Un **Skip error handler** y est branché : si
  l'URL ne répond pas, typiquement un média expiré du bucket, le bundle est abandonné et
  la boucle passe au fichier suivant, sans faire tomber l'exécution
- `Upload` (28) écrit dans `{{13.folder_id}}`, nom
  `{{5.nom_fichier}}.{{last(split(14.fileName; "."))}}`, données `{{14.data}}`

Les trois recherches de dossiers (`Dossiers N1`, `Dossiers N1 bis`, `Dossiers N2`) sont
toutes à une limite de **100**. Ce n'est pas du confort : sur les biens traités par
l'ancien système, l'équipe a créé des sous-dossiers à la main dans
`2. Photos Visite Logement`, jusqu'à 13 sur le bien 2092. Comme `Dossiers N2` liste les
enfants de tous les dossiers de niveau 1 confondus, une limite basse tronquerait le
résultat et pourrait faire disparaître `Équipement` ou `Tuto` de la table, avec un
`folder_id` vide à la clé et aucune erreur visible.

### Pourquoi deux photos des dossiers de niveau 1

`Table N1` (10) est prise **avant** la création. Elle ne sert qu'aux filtres
"créer si absent". `Table N1 bis` (27) est prise **après** la création et sert à toute la
chaîne d'upload. Ce n'est pas un doublon à nettoyer, c'est ce qui permet à un bien
totalement vierge d'être traité en un seul passage.

## 6.8 Ajouter un nouveau champ photo

1. Ajouter la colonne `text[]` dans `fiches`
2. Ajouter le champ dans `PhotoUpload` côté application
3. `INSERT` dans `media_manifest` : `colonne_db`, `cle`, `dossier`, `prefixe`, `type`, `ordre`
4. Vérifier que `media_manifest_ecarts` est vide

Aucune intervention dans le scénario Make, aucune dans le trigger.

Le trigger continue d'envoyer un bloc `media` de 106 clés que plus personne ne lit. C'est
du poids mort sans conséquence, le V2 ne consomme que `fiche_id`. **Ne pas y ajouter les
nouveaux champs**, ça ne sert à rien.

Validé en conditions réelles le 29/07 : une photo de façade ajoutée dans le front est
partie au bon endroit sur le Drive, avec le bon nom, sans qu'aucun automatisme ne soit
touché.

## 6.9 Tests validés le 29/07/2026

Fiche de test : bien 7756 `Julien Test V2`, 35 médias frais.

- Construction complète de l'arborescence depuis un dossier vide, dans le bon ordre
- Idempotence des créations de dossiers aux deux niveaux, aucun doublon sur rejeu
- Résolution de `folder_id` sur les 35 jobs, y compris les chemins imbriqués
- 35 téléchargements en 200 avec les données binaires réelles
- 35 fichiers montés, répartition exacte : 13 en `2. Photos Visite Logement`,
  1 en `4. Tour général du logement`, 15 en `Équipement`, 5 en `Tuto`,
  1 en `6. Identifiants Wifi`
- Noms corrects avec extension déduite du fichier réel : `.jpg`, `.png` et `.mp4`
  coexistent dans le même dossier

**Second test, fiche 7755, médias majoritairement expirés**

Fiche volontairement dégradée, la plupart de ses URLs ont été nettoyées du bucket.
Dossier Drive vidé avant le run.

- 82 opérations, **76 sautées par le Skip error handler**, 6 fichiers montés,
  **zéro erreur d'exécution**
- Avant le handler, l'exécution s'arrêtait à la première URL morte
- Les 6 survivants sont arrivés au bon endroit avec le bon nom, dont une vidéo de 35 Mo
- Mélange de médias vivants et morts dans le même run, c'est le cas le plus dur et il
  passe

**Troisième test, mise en production, fiche 7756 finalisée depuis le front**

Premier passage réel déclenché par le trigger, sans intervention manuelle.

- 36 médias, un de plus que le matin : une photo de façade ajoutée avant finalisation,
  absorbée par le manifeste sans toucher ni au trigger ni au scénario
- 137 opérations Make, soit exactement 10 pour le tronc commun, 5 créations de niveau 1,
  8 pour la route de niveau 2, 6 pour la remise à niveau des tables, et 3 par fichier
- Le compte tombe à l'unité près, donc les 36 fichiers ont bien été téléchargés **et**
  montés, aucun sauté, aucun en échec
- Durée : environ 2 minutes

## 6.10 Limites connues et arbitrages

- **Pas d'idempotence sur l'upload. Limite acceptée.** Le flux nominal ne rejoue pas, le
  trigger ne part que sur la transition vers `Complété`. Trois cas produisent malgré tout
  un rejeu : un rattrapage volontaire sur des fiches déjà traitées, une reprise après un
  échec en cours d'exécution, et le chemin Complété puis Archivé puis Brouillon puis
  Complété (`unarchiveFiche` repasse la fiche en Brouillon). Ces cas sont rares, et comme
  les noms du V2 sont déterministes, un doublon se repère au premier coup d'œil et permet
  même de distinguer un premier jeu d'un second. **Arbitrage du 29/07 : on accepte.**
- **Un média sauté ne laisse aucune trace.** Le Skip error handler évite le plantage mais
  ne signale rien. Un média expiré disparaît en silence. Seul point resté ouvert,
  voir section 13.
- **Clé secret Supabase en clair** dans trois modules du blueprint. Accès limité à trois
  personnes de l'équipe, **risque accepté**.

**Points fermés le 29/07**, conservés pour mémoire : plafonds de recherche portés de 10
et 20 à 100 partout, Skip error handler posé sur `Download` et validé sur la fiche 7755,
trigger rebranché sur le webhook V2, scénario V2 activé, scénario V1 désactivé.

**Point fermé le 30/07** : filtre anti-appel fantôme sur le lien webhook vers
`Fiche Context`, voir section 6.7. Un appel sans corps avait fait tomber une exécution en
erreur le 29/07 au soir, sans qu'aucune fiche n'ait été finalisée. Vérifié après pose du
filtre en rejouant un POST sans corps : exécution en succès, une seule opération,
246 millisecondes.

---

## 🗄️ 7. BASE DE DONNÉES

**Colonnes média** : type `text[]`, une URL publique Supabase Storage par entrée.

**Décompte au 29/07/2026**, vérifié sur le schéma live :
- **109** colonnes média de type tableau dans `fiches`
- **106** clés média envoyées par `notify_fiche_completed()`
- **109** lignes dans `media_manifest`

L'ancienne documentation annonçait 94 champs, valeur périmée.

**Trigger de finalisation**, état au 29/07/2026 après bascule :
- Fonction : `notify_fiche_completed()`, SECURITY INVOKER
- Trigger : `fiche_any_update_webhook`, AFTER UPDATE sur `public.fiches`
- Condition : passage du statut à `Complété`
- Envoie une clé `fiche_id` et poste vers le **webhook du scénario V2**
- Construit toujours le bloc `media` de 106 clés, ainsi que `proprietaire`, `logement` et
  `pdfs`. Plus personne ne les lit, le V2 ne consomme que `fiche_id`. C'est du poids mort
  qu'on aurait pu nettoyer, on ne l'a pas fait pour garder la bascule à deux lignes et le
  repli à un copier-coller
- Rollback vers le V1 : `docs/migrations/2026-07-29_rollback_notify_fiche_completed_v1.sql`,
  à jouer dans le SQL Editor, plus la réactivation du scénario 6089150

---

## ⚙️ 8. VALIDATION ET GESTION DES ERREURS

- **Numéro de bien obligatoire** avant tout upload, il structure le chemin de stockage
- **Taille** : 20 MB pour une photo, 350 MB pour une vidéo, après compression
- **Formats** : `image/*` et `video/*`
- **Fallback compression** : si la compression échoue, le fichier original est conservé

---

## 🎨 9. INTERFACE UTILISATEUR

Zone de drop avec quatre états visuels : normal, `uploading`, `compressing`,
`backendCompressing`. Galerie responsive 2 à 4 colonnes, lazy loading, distinction
photo et vidéo, suppression au survol, compteur, et avertissement de rétention.

---

## ✅ 10. TESTS VALIDÉS

**Upload et compression**
- Upload photos multiples, compression client 2.8 MB vers 1.6 MB
- Vidéo sous 95 MB, compression navigateur
- Vidéo au dessus de 95 MB, compression Railway
- Validation numéro de bien, validation taille, assainissement des noms

**Storage et cleanup**
- Organisation correcte dans le bucket
- Cleanup automatique via Edge Function et cron quotidien
- Monitoring par requête SQL

**Synchronisation Drive V2**
- Voir le détail en section 6.9

---

## 🚨 11. POINTS D'ATTENTION

**Compression**
- Une vidéo de plus de 300 MB peut demander 4 à 5 minutes
- Ne pas fermer la page pendant la compression
- Sortie `.webm` côté navigateur, `.mp4` côté Railway

**Storage**
- Les médias sont supprimés du bucket après la période de rétention. Le Drive est le
  seul stockage durable, la synchronisation n'est pas optionnelle
- Le dashboard Supabase peut avoir une heure de retard, la requête SQL fait foi

**Synchronisation Drive**
- `media_manifest_ecarts` doit rester vide, c'est le seul indicateur qui révèle un champ
  photo oublié
- Ne pas supprimer `Table N1` en croyant à un doublon de `Table N1 bis`, voir section 6.7
- L'ordre des routes du routeur est porteur de sens, ne pas le réorganiser sans relire
  la section 6.7

---

## 📚 12. RÉFÉRENCES

**Documentation liée**
- `docs/📊 SUPABASE SPEC.md` : architecture base de données, triggers, cleanup
- `docs/📄 PLAN UPLOAD PDF.md` : génération PDF, même backend Railway

**Fichiers clés**
- `src/components/PhotoUpload.jsx` : composant d'upload
- `supabase/functions/cleanup-storage/index.ts` : Edge Function de cleanup
- `video-compressor/compressVideo.js` : backend Railway FFmpeg

**Objets Supabase du système V2**
- Table `media_manifest`
- Vue `media_manifest_ecarts`
- Fonction `build_media_jobs(uuid)`
- Fonction `build_media_folders(uuid)`

**Scénarios Make**
- V2, actuel et **actif** : `LH - Fiche logement - Stockage Photos sur Drive V2`, id 9584334
- V1, historique et **désactivé depuis le 29/07** : `LH - Fiche logement - Stockage Photos sur Drive`, id 6089150

**Rollback**
- `docs/migrations/2026-07-29_rollback_notify_fiche_completed_v1.sql`

---

## 🚧 13. CHANTIERS RESTANTS

Le système est en production depuis le 29/07/2026. Il ne reste qu'un point ouvert.

**Parqué, sans échéance**

**Tracer les médias sautés.** Le Skip error handler sur le `Download` évite le plantage
mais ne signale rien. Brancher un module de signalement sur sa route d'erreur donnerait
la visibilité qui manque. À faire si le besoin se manifeste, pas avant.

**Écartés volontairement le 29/07**

- **Rattrapage des 92 fichiers** sur 27 fiches jamais montés par le V1, voir section 14.
  Personne ne s'en est jamais aperçu, l'effort ne se justifie pas.
- **Nettoyage des doublons de dossiers** créés par le V1 sur les biens retraités.
  Cosmétique, sans impact sur le V2 qui sait choisir.
- **Rendre le trigger générique.** Devenu inutile : le V2 ne lit plus le bloc `media`,
  donc il n'y a plus rien à maintenir de ce côté.
- **Réduire le payload du trigger.** Même raison, du poids mort sans conséquence.

**Fait le 29/07** : garde-fous d'idempotence sur les créations de dossiers, Skip error
handler sur le `Download`, plafonds de recherche portés à 100, bascule du trigger vers le
V2, activation du V2 et désactivation du V1.

---
---

# 🗃️ 14. ANNEXE : NOTE HISTORIQUE, ANCIEN SYSTÈME (V1)

> **Statut** : **désactivé le 29/07/2026**, conservé comme plan de repli.
> Ne pas supprimer sans décision explicite. Cette note est volontairement synthétique,
> elle sert à comprendre et à réactiver, pas à maintenir.

## 14.1 Identité

**Scénario** : `LH - Fiche logement - Stockage Photos sur Drive`, id 6089150
**Créé** : 03/07/2025. **Dernière édition** : 22/06/2026.
**Déclencheur** : module Supabase instantané, alimenté par `notify_fiche_completed()`
à la finalisation de la fiche.
**Payload** : objet complet avec `logement`, `media` et `proprietaire`, 106 clés média.

## 14.2 Principe

Le mapping champ vers dossier vers préfixe était **câblé en dur dans le scénario**,
une branche par champ média.

**375 modules**, dont :
- 103 triptyques identiques Repeater + HTTP Get + Drive Upload, un par champ
- 10 `Create a folder`, exécutés à chaque passage sans vérification d'existence
- 5 `Sleep`, 32 `Break`, 2 modules d'alerte mail

Le nommage était `Prefixe-photo-{index}_{horodatage}`, l'extension étant déduite par
Google Drive à partir du type MIME.

## 14.3 Défauts structurels, constatés le 29/07/2026

- **Trois copies du mapping** : noms de colonnes côté application, 106 paires dans le
  trigger, 103 branches dans Make. Ajouter un champ imposait trois modifications dans
  trois langages, sans aucun garde-fou entre les trois
- **Aucune idempotence** : l'horodatage dans les noms fait qu'un rejeu duplique tous les
  fichiers, et les dossiers sont recréés à chaque passage. Des biens retraités portent
  deux jeux complets de sous-dossiers
- **Échecs silencieux sur média expiré** : une URL nettoyée du bucket renvoie un JSON
  d'erreur de 69 octets, qui est monté sur le Drive comme s'il s'agissait de la photo
- **Dérive de rangement** : plusieurs photos d'équipement pointaient vers le dossier
  `Tuto` dans le blueprint, alors que les fichiers atterrissaient dans `Équipement`.
  Contradiction jamais élucidée, sans conséquence pratique

## 14.4 Trous de couverture identifiés

Croisement des trois listes, colonnes de `fiches` contre trigger contre scénario.

**Colonnes média jamais envoyées par le trigger, donc jamais montées sur le Drive**

| colonne | fiches concernées |
|---|---|
| `equip_spe_ext_salle_jeux_photos` | 6 |
| `equip_spe_ext_sauna_photos` | 3 |
| `equip_spe_ext_salle_sport_photos` | 2 |
| `equip_spe_ext_hammam_photos` | 1 |
| `equip_spe_ext_salle_cinema_photos` | 1 |

**Champ envoyé par le trigger mais consommé par aucune branche Make**

| colonne | fiches concernées |
|---|---|
| `salon_sam_salle_manger_elements_abimes_photos` | 14 |

**Total** : 92 fichiers sur 27 fiches, pris par des coordinateurs, présents en base,
jamais arrivés sur le Drive. Le V2 les prend en charge, un rattrapage reste à faire sur
l'historique.

Deux clés non média étaient également poussées dans le bloc `media` sans effet :
`equipements_tv_services` et `equipements_tv_consoles`.

## 14.5 Réactiver le V1 en cas de besoin

1. Jouer `docs/migrations/2026-07-29_rollback_notify_fiche_completed_v1.sql` dans le
   SQL Editor, il remet `notify_fiche_completed()` dans son état d'avant bascule et
   repointe le webhook vers le V1
2. Réactiver le scénario 6089150 dans Make
3. Désactiver le scénario V2 (9584334)

Le V1 reste fonctionnel tel quel, il a tourné plus d'un an sans incident d'exécution.
Ses défauts sont des défauts de conception et de maintenance, pas de fiabilité.

**Avant de le réactiver durablement**, se rappeler que chaque nouveau champ photo ajouté
depuis la bascule devra être recâblé à la main dans ses 103 branches.

---

*Document technique de référence*
*Architecture V2 en production depuis le 29/07/2026, validée sur un parcours réel*
*Dernière mise à jour : 30 juillet 2026*
