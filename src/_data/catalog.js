// Prépare toutes les données du site à partir de :
//   - src/_data/site.json      (adresse des musiques, groupes du menu)
//   - src/_data/releases.json  (EPs, albums, lives, specials et leurs pistes)
// Les templates (.njk) utilisent le résultat sous le nom "catalog".

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(here, '..');
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(here, name), 'utf8'));

const site = readJson('site.json');
const releases = readJson('releases.json');

const imgPath = (p) => `./assets/img/${p}`;
const imgExists = (p) => fs.existsSync(path.join(srcDir, 'assets', 'img', p));
const encodePath = (p) => p.split('/').map(encodeURIComponent).join('/');
const baseName = (file) => path.posix.basename(file, path.posix.extname(file));

const warnings = [];

function enrichTrack(release, track) {
  // Les paroles sont un fichier texte portant le même nom que le MP3 : src/assets/lyrics/<nom du mp3>.txt
  const name = baseName(track.file);
  const lyricsFile = `${name}.txt`;
  const hasLyrics = fs.existsSync(path.join(srcDir, 'assets', 'lyrics', lyricsFile));
  const cover = track.cover ?? release.cover;
  if (cover && !imgExists(cover)) warnings.push(`Image introuvable : ${cover} (pochette de "${track.title}")`);

  return {
    ...track,
    src: site.audioBase + encodePath(track.file),
    coverUrl: cover ? imgPath(cover) : null,
    lyricsFile,
    lyricsUrl: hasLyrics ? `./assets/lyrics/${encodePath(name)}.txt` : null,
  };
}

function enrichRelease(release) {
  // La page Kinetic Creed n'a pas de pochette globale : chaque piste porte la sienne
  if (release.cover && !imgExists(release.cover)) warnings.push(`Image introuvable : ${release.cover} (pochette de "${release.title}")`);

  const enriched = {
    ...release,
    coverUrl: release.cover ? imgPath(release.cover) : null,
    tracks: release.tracks.map((t) => enrichTrack(release, t)),
  };

  if (release.lore) {
    // Une image de bannière absente est ignorée (avec un avertissement) au lieu de casser la page
    const holo = release.lore.holo.filter((p) => {
      if (imgExists(p)) return true;
      warnings.push(`Image introuvable : ${p} (bannière de "${release.title}") -> ignorée`);
      return false;
    });
    enriched.lore = { ...release.lore, holoUrls: holo.map(imgPath) };
  }

  if (release.custom) {
    enriched.relic = enriched.tracks.find((t) => t.role === 'relic');
    enriched.mutations = enriched.tracks.filter((t) => t.role === 'mutation');
  }
  return enriched;
}

const all = releases.map(enrichRelease);

const navGroups = site.navGroups.map((g) => ({
  label: g.label,
  items: all.filter((r) => r.group === g.id).map((r) => ({ file: r.file, navLabel: r.navLabel })),
}));

const allTracks = all.flatMap((r) => r.tracks);
const uniqueLyrics = new Set(allTracks.map((t) => t.lyricsFile));
const withLyrics = new Set(allTracks.filter((t) => t.lyricsUrl).map((t) => t.lyricsFile));

console.log(`[catalog] ${all.length} pages, ${allTracks.length} pistes, paroles : ${withLyrics.size}/${uniqueLyrics.size} titres`);
for (const w of warnings) console.warn(`[catalog] ATTENTION - ${w}`);

export default {
  site,
  all,
  navGroups,
  pages: all.filter((r) => !r.custom), // pages "classiques" (lore + liste de pistes)
  hub: all.filter((r) => !r.custom && r.hub !== false), // cartes de l'accueil
  kinetic: all.find((r) => r.id === 'kinetic-creed'),
  totalTracks: allTracks.length,
};
