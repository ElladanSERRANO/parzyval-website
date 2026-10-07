// Convertit les images d'origine (PNG / JPG) en WebP allégé.
//
//   Usage : npm run images
//   Entrée : dossier  originals/   (non versionné, garde-y tes images lourdes)
//   Sortie : dossier  src/assets/img/   (mêmes sous-dossiers, extension .webp)
//
// Les conversions déjà faites sont ignorées. Pour tout refaire : npm run images -- --force

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SRC = 'originals';
const OUT = 'src/assets/img';
const FORCE = process.argv.includes('--force');

// Taille maximale (en pixels, sur le plus grand côté) selon le dossier.
// La première règle qui correspond s'applique.
const RULES = [
  { match: /^covers\//, max: 800 },        // pochettes (cartes de l'accueil + mini-lecteur)
  { match: /^global\//, max: 1000 },       // bande d'ambiance (3 vignettes en 16/9)
  { match: /^kinetic_creed\//, max: 1000 },// visuels de la page Kinetic Creed
  { match: /.*/, max: 1600 },              // bannières holographiques des pages
];

const IMAGE_EXT = /\.(png|jpe?g)$/i;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

if (!fs.existsSync(SRC)) {
  console.error(`Dossier "${SRC}/" introuvable. Place-y tes images d'origine (mêmes sous-dossiers que src/assets/img).`);
  process.exit(1);
}

let before = 0;
let after = 0;
let done = 0;

for (const file of walk(SRC).sort()) {
  if (!IMAGE_EXT.test(file)) continue;
  const rel = path.relative(SRC, file).split(path.sep).join('/');
  const out = path.join(OUT, rel.replace(IMAGE_EXT, '.webp'));

  if (!FORCE && fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(file).mtimeMs) continue;

  const { max } = RULES.find((r) => r.match.test(rel));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp(file)
    .rotate() // respecte l'orientation EXIF éventuelle
    .resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toFile(out);

  const a = fs.statSync(file).size;
  const b = fs.statSync(out).size;
  before += a;
  after += b;
  done++;
  console.log(`${rel.padEnd(44)} ${(a / 1e6).toFixed(1).padStart(5)} Mo  ->  ${(b / 1e3).toFixed(0).padStart(5)} Ko`);
}

if (done === 0) {
  console.log('Rien à convertir (tout est déjà à jour).');
} else {
  console.log(`\n${done} image(s) : ${(before / 1e6).toFixed(1)} Mo  ->  ${(after / 1e6).toFixed(1)} Mo`);
}
