# Baguette_Sadique / Parzyval Hub

Site vitrine avec deux sections : **Audio** (les chansons Suno de The Fallen Guardians) et **Art** (dessins et montages).
Les pages sont **générées** avec [Eleventy](https://www.11ty.dev/) à partir de données et de modèles,
puis mises en ligne sur GitHub Pages. Les MP3 et les images de la galerie restent sur Cloudflare R2.

## Mise en route (sur ton PC)

Il faut [Node.js](https://nodejs.org/) (version 20 ou plus).

```bash
npm install        # une seule fois : installe Eleventy et sharp
npm start          # prévisualisation sur http://localhost:8080, se recharge toute seule
```

Commandes utiles : `npm start` (prévisualiser), `npm run build` (fabriquer le site dans `_site/`),
`npm run images` (images du site), `npm run lyrics` (paroles manquantes), `npm run gallery` (galerie d'art).

## Où est quoi

```
src/
  _data/
    releases.json    <- LES SORTIES AUDIO ET LEURS PISTES
    artworks.json    <- LES OEUVRES DE LA GALERIE (rempli par `npm run gallery`, puis complété à la main)
    sections.json    <- les deux portes de l'accueil et le menu (textes, images)
    site.json        <- adresse R2 des musiques et de l'art + groupes du menu Audio
    catalog.js       <- prépare les données (menu, compteurs, paroles...) ; tu n'y touches pas
  _includes/
    layouts/base.njk <- squelette commun à toutes les pages
    partials/        <- menu, bande d'images, lecteur, footer, carte de piste, visionneuse
  index.njk                    <- accueil : les deux portes (Audio / Art)
  audio.njk                    <- hub audio (cartes des sorties)
  release.njk                  <- modèle de TOUTES les pages EP / Album / Live / Special
  special_kinetic_creed.njk    <- page Kinetic Creed (design à part)
  art.njk                      <- galerie d'art
  assets/
    css/style.css, css/sections.css   <- style du site / style de l'accueil, de la galerie et de la visionneuse
    js/script.js, js/gallery.js       <- lecteur + routeur / galerie et visionneuse
    img/       <- images WebP du site
    lyrics/    <- paroles, un .txt par chanson
scripts/         <- convert-images.mjs, lyrics-todo.mjs, build-gallery.mjs
originals/       <- images lourdes du site (ignoré par git)
originals-art/   <- tes exports de dessins en pleine résolution (ignoré par git)
art-upload/      <- dossier fabriqué pour R2 (ignoré par git)
```

Le menu, l'accueil, le compteur de pistes et la bande d'images se mettent à jour tout seuls :
il n'y a plus qu'**un** endroit à modifier.

## Ajouter une chanson à une sortie existante

1. Mets le MP3 dans le bucket R2 (ex. `media/Albums/The_Infinite_Twist/Ma_Chanson.mp3`).
2. Dans `src/_data/releases.json`, ajoute une entrée à la liste `tracks` de la sortie :

```json
{
  "title": "Ma Chanson",
  "file": "Albums/The_Infinite_Twist/Ma_Chanson.mp3",
  "download": "Ma_Chanson.mp3"
}
```

`file` = le chemin dans le bucket **après** `media/`, écrit tel qu'il apparaît dans R2 (espaces et accents autorisés).
`download` = le nom du fichier proposé au téléchargement.

## Ajouter une nouvelle sortie (EP, album, live, special)

1. Convertis ses images (voir plus bas) : une pochette dans `covers/` et jusqu'à 3 images de bannière dans un dossier à son nom.
2. Dans `releases.json`, copie une sortie existante (ex. celle de Judy) à la fin de la liste et adapte-la :
   - `file` : nom de la page (`ep_mon_ep.html`)
   - `group` : `ep`, `album`, `live` ou `special` (c'est ce qui la range dans le bon menu)
   - `type`, `title`, `navLabel`, `hubTitle`, `coverAlt`, `cover`, `lore` (texte, images, liens AO3), `tracks`
   - `hubHighlight: true` pour afficher le « 4 Tracks • Special » en rose
3. Pour créer un nouveau groupe de menu, ajoute-le dans `navGroups` de `site.json`.

Petits réglages utiles :
- `lore` est facultatif : sans lui, la page n'a pas de bandeau de contexte. Sans `links`, il n'y a pas de bouton AO3.
- Une sortie apparaît par défaut sur l'accueil ; ajoute `"hub": false` pour la masquer (la page reste dans le menu).
- Une pochette par piste est possible : ajoute `"cover": "dossier/image.webp"` dans la piste (sinon c'est la pochette de la sortie).

La page et sa carte d'accueil apparaissent toutes seules.

## Ajouter des paroles

Dépose un fichier `.txt` dans `src/assets/lyrics/` avec **exactement le même nom que le MP3** :
`Fuel_My_Heart.mp3` -> `Fuel_My_Heart.txt`. C'est tout : le bouton « ACCESS DECIPHERED SONGSHARD DATA »
s'active pour cette chanson.

`npm run lyrics` affiche les paroles déjà présentes et la liste exacte des fichiers qu'il reste à créer.

## Ajouter ou changer des images

1. Mets l'image d'origine (PNG/JPG) dans `originals/` en respectant les sous-dossiers
   (ex. `originals/covers/ma_pochette.png`).
2. Lance `npm run images` : elle est réduite et convertie en WebP dans `src/assets/img/`
   (pochettes 800 px, bande d'ambiance et visuels Kinetic Creed 1000 px, bannières 1600 px).
3. Référence-la dans `releases.json` avec l'extension `.webp` (ex. `covers/ma_pochette.webp`).

Les tailles se règlent en haut de `scripts/convert-images.mjs`.

## La galerie d'art

Les dessins et montages ne sont **jamais** dans le dépôt GitHub (trop lourds) : ils sont sur R2, comme les MP3.
Seul le petit fichier `src/_data/artworks.json` (une fiche par oeuvre) est versionné.
Chaque oeuvre existe en trois versions : une **miniature** (grille), une **version d'affichage** (2400 px, WebP, celle de la
visionneuse) et l'**original** en pleine résolution (téléchargement et « Full size »).

### Ajouter des oeuvres

1. Exporte chaque oeuvre depuis Clip Studio en **PNG** (ou JPG), pleine résolution, et mets-la dans `originals-art/`.
   Le nom du fichier devient l'identifiant (ex. `Neon Alley.png` -> `neon-alley`) : ne le renomme plus ensuite.
2. Lance `npm run gallery`. Il fabrique le dossier `art-upload/Art/` (thumbs, display, original) et ajoute une
   fiche par nouvelle oeuvre dans `src/_data/artworks.json`. Il ne touche jamais à ce que tu as déjà écrit dans les fiches.
3. Complète les fiches dans `artworks.json` :
   - `title`, `category` (ex. `Drawing`, `Montage` : dès qu'il y a au moins deux catégories, des boutons de filtre apparaissent),
     `date` (texte libre, ex. `2026-09`), `alt` (description courte pour les lecteurs d'écran), `description` (facultative)
   - `links` (facultatif) : boutons dans la visionneuse, ex. `[{ "url": "https://archiveofourown.org/...", "label": "Chapter 4" }]`
   - `"original": false` pour ne PAS proposer le téléchargement de l'original de cette oeuvre
   - l'**ordre des fiches = l'ordre d'affichage** (déplace-les pour réorganiser)
4. Glisse le dossier `art-upload/Art` dans le dossier `media` de ton bucket R2 (chemins finaux :
   `media/Art/thumbs/...`, `media/Art/display/...`, `media/Art/original/...`).
5. Vérifie avec `npm start`, puis commit et push : seul `artworks.json` part sur GitHub.

Pour regénérer toutes les images (par exemple après avoir changé les tailles en haut de `scripts/build-gallery.mjs`) :
`npm run gallery -- --force`.

### La visionneuse

Clic sur une oeuvre : plein écran. Flèches du clavier ou glissement du doigt pour passer à la suivante, `Z` / double-clic /
bouton « Zoom » pour la taille réelle (défilement ou glisser à la souris), `Échap` pour fermer.
Chaque oeuvre a une adresse partageable : `art.html#neon-alley` ouvre directement la visionneuse sur cette oeuvre.
Le bouton « Original » utilise la même autorisation (CORS) du bucket que les téléchargements de MP3 ; « Full size » ouvre le fichier dans un nouvel onglet.

## L'accueil et le menu

- `sections.json` décrit les sections (Audio, Art) : texte et image de leur porte sur l'accueil, titre dans le menu.
  Pour changer l'image d'une porte, remplace `door.cover` par une image de `src/assets/img/` (en WebP).
- Pour ajouter plus tard une section (par exemple de la photo virtuelle) : une entrée dans `sections.json`, une page `.njk`
  avec `section: <id>` en tête, et c'est tout pour le menu et l'accueil.
- Le lecteur audio en bas de page reste visible sur les pages Audio ; sur l'accueil et la galerie il n'apparaît qu'une fois
  une piste lancée (la musique continue donc de jouer quand on parcourt la galerie).

## Mise en ligne

Un push sur la branche `main` suffit : GitHub construit et publie le site (fichier `.github/workflows/deploy.yml`).
Réglage unique : sur GitHub, **Settings -> Pages -> Source : "GitHub Actions"**.
L'avancement se suit dans l'onglet **Actions** du dépôt.

Pour tester le build en local : `npm run build` (résultat dans `_site/`, ignoré par git).

## Changer l'adresse des musiques

Tout vient de `audioBase` dans `src/_data/site.json` (il sert aussi pour la galerie d'art ; tu peux le renommer `mediaBase`, les
deux noms sont acceptés). Si un jour le bucket passe sur un domaine à toi, c'est la seule ligne à modifier.
