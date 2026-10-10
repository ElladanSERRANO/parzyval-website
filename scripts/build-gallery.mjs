// Prépare la galerie d'art à partir de tes exports (Clip Studio, etc.).
//
//   Usage :  npm run gallery
//   Entrée : dossier  originals-art/   (tes exports PNG / JPG en pleine résolution ; non versionné)
//   Sortie : dossier  art-upload/Art/  (à glisser dans le dossier "media" du bucket R2)
//              thumbs/<id>.webp     miniature pour la grille (largeur 640 px)
//              display/<id>.webp    version affichée dans la visionneuse (2400 px max)
//              original/<id>.<ext>  ton fichier d'origine, proposé en téléchargement
//   Données : src/_data/artworks.json  (une entrée créée par oeuvre ; les titres, catégories et
//             descriptions que tu y écris ne sont JAMAIS écrasés par le script)
//
// Pour tout regénérer : npm run gallery -- --force

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SRC = 'originals-art';
const OUT = 'art-upload/Art';
const DATA = 'src/_data/artworks.json';
const FORCE = process.argv.includes('--force');

const THUMB = { width: 640, height: 1000 }; // la miniature tient dans ce cadre
const DISPLAY_MAX = 2400;                    // plus grand côté de la version d'affichage
const IMAGE_EXT = /\.(png|jpe?g|webp|tiff?)$/i;

const slugify = (s) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const humanize = (s) =>
  s.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\p{L}/gu, (c) => c.toUpperCase());
const mb = (bytes) => `${(bytes / 1e6).toFixed(1)} Mo`.padStart(8);

if (!fs.existsSync(SRC)) {
  fs.mkdirSync(SRC, { recursive: true });
  console.log(`Le dossier "${SRC}/" vient d'être créé : place-y tes exports (PNG ou JPG) puis relance la commande.`);
  process.exit(0);
}

const files = fs.readdirSync(SRC, { withFileTypes: true })
  .filter((e) => e.isFile() && IMAGE_EXT.test(e.name))
  .map((e) => e.name)
  .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));

if (!files.length) {
  console.log(`Aucune image dans "${SRC}/" (formats acceptés : PNG, JPG, WebP, TIFF).`);
  process.exit(0);
}

const existing = fs.existsSync(DATA) ? JSON.parse(fs.readFileSync(DATA, 'utf8')) : [];
const byId = new Map(existing.map((a) => [a.id, a]));
const ids = new Set();

for (const dir of ['thumbs', 'display', 'original']) fs.mkdirSync(path.join(OUT, dir), { recursive: true });

let created = 0;
let updated = 0;

for (const file of files) {
  const base = path.parse(file).name;
  const id = slugify(base);
  if (!id) { console.warn(`  ! "${file}" : nom inutilisable, ignoré`); continue; }
  if (ids.has(id)) throw new Error(`Deux fichiers donneraient le même identifiant "${id}" : renomme l'un d'eux.`);
  ids.add(id);

  const srcPath = path.join(SRC, file);
  const ext = path.extname(file).toLowerCase().replace('.', '').replace('jpeg', 'jpg').replace('tif', 'tiff');
  const thumbPath = path.join(OUT, 'thumbs', `${id}.webp`);
  const displayPath = path.join(OUT, 'display', `${id}.webp`);
  const originalPath = path.join(OUT, 'original', `${id}.${ext}`);

  const srcStat = fs.statSync(srcPath);
  const upToDate = !FORCE && [thumbPath, displayPath, originalPath].every(
    (p) => fs.existsSync(p) && fs.statSync(p).mtimeMs >= srcStat.mtimeMs
  );

  // Dimensions de l'original (en tenant compte de l'orientation EXIF)
  const meta = await sharp(srcPath, { limitInputPixels: false }).metadata();
  const swap = (meta.orientation ?? 1) >= 5;
  const originalWidth = swap ? meta.height : meta.width;
  const originalHeight = swap ? meta.width : meta.height;

  if (!upToDate) {
    // sRGB par défaut : les couleurs restent fidèles même si l'export utilise un autre profil
    const display = await sharp(srcPath, { limitInputPixels: false, sequentialRead: true })
      .rotate()
      .resize({ width: DISPLAY_MAX, height: DISPLAY_MAX, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 86, effort: 5 })
      .toFile(displayPath);
    // La miniature se fabrique à partir de la version d'affichage (beaucoup plus rapide que depuis l'original)
    await sharp(displayPath)
      .resize({ width: THUMB.width, height: THUMB.height, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80, effort: 5 })
      .toFile(thumbPath);
    fs.copyFileSync(srcPath, originalPath);
    console.log(`  ${id.padEnd(34)} ${originalWidth}x${originalHeight}  ${mb(srcStat.size)} -> affichage ${mb(display.size)}  (${display.width}x${display.height})`);
  } else {
    console.log(`  ${id.padEnd(34)} déjà à jour`);
  }

  const displayMeta = await sharp(displayPath).metadata();
  const technical = {
    width: displayMeta.width,
    height: displayMeta.height,
    originalExt: ext,
    originalWidth,
    originalHeight,
    originalBytes: srcStat.size,
  };

  const entry = byId.get(id);
  if (entry) {
    Object.assign(entry, technical); // met à jour seulement les champs techniques
    updated++;
  } else {
    // Brouillon à compléter à la main : titre, catégorie, date, description, texte alternatif
    const draft = { id, title: humanize(base), category: 'Drawing', date: '', alt: '', description: '', ...technical };
    existing.push(draft);
    byId.set(id, draft);
    created++;
  }
}

fs.mkdirSync(path.dirname(DATA), { recursive: true });
fs.writeFileSync(DATA, JSON.stringify(existing, null, 2) + '\n');

const orphans = existing.filter((a) => !ids.has(a.id)).map((a) => a.id);
console.log(`\n${files.length} image(s) traitée(s) : ${created} nouvelle(s) entrée(s), ${updated} mise(s) à jour dans ${DATA}.`);
if (orphans.length) console.log(`Attention : sans image source dans "${SRC}/" : ${orphans.join(', ')}`);
console.log(`
Étapes suivantes :
  1. Ouvre ${DATA} et complète les entrées (title, category, date, alt, description ; "links" pour un bouton AO3 ;
     "original": false pour ne pas proposer le téléchargement de l'original d'une oeuvre).
     L'ordre des entrées = l'ordre d'affichage.
  2. Glisse le dossier "${OUT}" dans le dossier "media" du bucket R2 (chemin final : media/Art/thumbs/..., media/Art/display/..., media/Art/original/...).
  3. Vérifie avec "npm start", puis commit et push (seul ${DATA} part sur GitHub : les images restent sur R2).
`);
