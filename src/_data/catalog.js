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
const sections = readJson('sections.json');
const artworks = readJson('artworks.json');

// Adresse de base du bucket R2 (dossier "media/"), utilisée pour la musique ET pour l'art.
// "audioBase" est l'ancien nom de ce réglage ; "mediaBase" est accepté aussi.
const mediaBase = site.mediaBase ?? site.audioBase;

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
    src: mediaBase + encodePath(track.file),
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
    const holo = (release.lore.holo ?? []).filter((p) => {
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

// --- Galerie d'art (src/_data/artworks.json, rempli par `npm run gallery`) ---
const formatBytes = (b) => (b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b >= 1e7 ? `${Math.round(b / 1e6)} MB` : `${(b / 1e6).toFixed(1)} MB`);
const seenIds = new Set();
const art = artworks.map((a) => {
  if (seenIds.has(a.id)) warnings.push(`Oeuvre en double dans artworks.json : "${a.id}"`);
  seenIds.add(a.id);
  if (!a.width || !a.height) warnings.push(`Dimensions manquantes pour "${a.id}" (relance npm run gallery)`);
  const ext = String(a.originalExt ?? '').replace('.', '').toLowerCase();
  const hasOriginal = Boolean(ext) && a.original !== false;
  return {
    ...a,
    thumbUrl: `${mediaBase}Art/thumbs/${a.id}.webp`,
    displayUrl: `${mediaBase}Art/display/${a.id}.webp`,
    originalUrl: hasOriginal ? `${mediaBase}Art/original/${a.id}.${ext}` : null,
    originalName: hasOriginal ? `${a.id}.${ext}` : null,
    originalLabel: hasOriginal ? `${ext.toUpperCase()}${a.originalBytes ? ' · ' + formatBytes(a.originalBytes) : ''}` : null,
    sizeLabel: a.originalWidth ? `${a.originalWidth} × ${a.originalHeight} px` : null,
  };
});
const artCategories = [...new Set(art.map((a) => a.category).filter(Boolean))].map((name) => ({
  name,
  count: art.filter((a) => a.category === name).length,
}));

const pluralize = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const sectionStats = {
  audio: `${pluralize(allTracks.length, 'Track', 'Tracks')} • ${pluralize(all.length, 'Release', 'Releases')}`,
  art: art.length ? pluralize(art.length, 'Piece', 'Pieces') : 'Coming soon',
};
const sectionList = sections.map((s) => ({
  ...s,
  coverUrl: imgPath(s.door.cover),
  stat: sectionStats[s.id] ?? '',
  groups: s.id === 'audio' ? navGroups : null, // le menu Audio contient les EPs, Albums, Lives et Specials
}));
for (const s of sections) if (!imgExists(s.door.cover)) warnings.push(`Image introuvable : ${s.door.cover} (porte "${s.label}" de l'accueil)`);

console.log(`[catalog] ${art.length} oeuvres, ${all.length} pages, ${allTracks.length} pistes, paroles : ${withLyrics.size}/${uniqueLyrics.size} titres`);
for (const w of warnings) console.warn(`[catalog] ATTENTION - ${w}`);

export default {
  site,
  all,
  navGroups,
  pages: all.filter((r) => !r.custom), // pages "classiques" (lore + liste de pistes)
  hub: all.filter((r) => r.hub !== false), // cartes de l'accueil (mettre "hub": false pour masquer une sortie)
  kinetic: all.find((r) => r.id === 'kinetic-creed'),
  totalTracks: allTracks.length,
  sections: sectionList, // portes de l'accueil + menu principal
  art, // oeuvres de la galerie
  artCategories, // [{ name, count }]
};
