// Liste les paroles déjà présentes et celles qu'il reste à ajouter.
//   Usage : npm run lyrics
// Pour ajouter des paroles : dépose un fichier .txt dans src/assets/lyrics/
// avec EXACTEMENT le même nom que le MP3 (ex. Fuel_My_Heart.mp3 -> Fuel_My_Heart.txt).

import catalog from '../src/_data/catalog.js';

const seen = new Map();
for (const release of catalog.all) {
  for (const t of release.tracks) {
    if (!seen.has(t.lyricsFile)) seen.set(t.lyricsFile, { title: t.title, has: Boolean(t.lyricsUrl), release: release.navLabel });
  }
}

const done = [...seen].filter(([, v]) => v.has);
const todo = [...seen].filter(([, v]) => !v.has);

console.log(`\nParoles présentes (${done.length}) :`);
for (const [file, v] of done) console.log(`  [x] ${file}`);
console.log(`\nParoles à ajouter (${todo.length}) :`);
for (const [file, v] of todo) console.log(`  [ ] ${file.padEnd(72)} ${v.title}  (${v.release})`);
console.log('');
