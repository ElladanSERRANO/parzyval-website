# Baguette_Sadique / Parzyval Audio Hub

Site vitrine des chansons Suno de The Fallen Guardians.
Les pages sont **générées** avec [Eleventy](https://www.11ty.dev/) à partir de données et de modèles,
puis mises en ligne sur GitHub Pages. Les MP3 restent sur Cloudflare R2.

## Mise en route (sur ton PC)

Il faut [Node.js](https://nodejs.org/) (version 20 ou plus).

```bash
npm install        # une seule fois : installe Eleventy et sharp
npm start          # prévisualisation sur http://localhost:8080, se recharge toute seule
```

## Où est quoi

```
src/
  _data/
    releases.json    <- LES SORTIES ET LEURS PISTES (le fichier que tu modifieras le plus)
    site.json        <- adresse R2 des musiques + groupes du menu
    catalog.js       <- prépare les données (menu, compteurs, paroles...) ; tu n'y touches pas
  _includes/
    layouts/base.njk <- squelette commun à toutes les pages
    partials/        <- menu, bande d'images, lecteur, footer, carte de piste
  index.njk                    <- accueil
  release.njk                  <- modèle de TOUTES les pages EP / Album / Live / Special
  special_kinetic_creed.njk    <- page Kinetic Creed (design à part)
  assets/
    css/style.css, js/script.js
    img/       <- images WebP
    lyrics/    <- paroles, un .txt par chanson
scripts/         <- convert-images.mjs, lyrics-todo.mjs
originals/       <- tes images lourdes d'origine (ignoré par git)
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

## Mise en ligne

Un push sur la branche `main` suffit : GitHub construit et publie le site (fichier `.github/workflows/deploy.yml`).
Réglage unique : sur GitHub, **Settings -> Pages -> Source : "GitHub Actions"**.
L'avancement se suit dans l'onglet **Actions** du dépôt.

Pour tester le build en local : `npm run build` (résultat dans `_site/`, ignoré par git).

## Changer l'adresse des musiques

Tout vient de `audioBase` dans `src/_data/site.json`. Si un jour le bucket passe sur un domaine à toi,
c'est la seule ligne à modifier.
