// Runs on GitHub Actions (server side, so no browser CORS problem).
// Samples the free adsb.fi feed on a grid covering the continental US + military worldwide,
// merges by aircraft id, and writes data.json for the page to load as a same-origin file.
import { writeFileSync, mkdirSync } from 'node:fs';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const KEEP = ['hex', 'flight', 'r', 't', 'desc', 'lat', 'lon', 'alt_baro', 'gs', 'track', 'dbFlags', 'seen_pos'];

async function get(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (r.ok) { const j = await r.json(); return j.aircraft || j.ac || []; }
      if (r.status === 429) await sleep(3000);
    } catch (e) { await sleep(1500); }
  }
  return null;
}

const byHex = new Map();
const add = list => list.forEach(p => {
  if (p.lat == null || p.lon == null) return;
  const o = {};
  KEEP.forEach(k => { if (p[k] !== undefined) o[k] = p[k]; });
  byHex.set(p.hex, o);
});

const lats = [27, 31, 35, 39, 43, 47];
const lons = [-123, -118, -113, -108, -103, -98, -93, -88, -83, -78, -73, -68];
let ok = 0, failed = 0;
for (const la of lats) for (const lo of lons) {
  const list = await get(`https://opendata.adsb.fi/api/v2/lat/${la}/lon/${lo}/dist/250`);
  if (list) { add(list); ok++; } else failed++;
  await sleep(1100);
}
const mil = await get('https://opendata.adsb.fi/api/v2/mil');
if (mil) add(mil);

console.log(`grid ok=${ok} failed=${failed} mil=${mil ? mil.length : 'fail'} total=${byHex.size}`);
if (byHex.size === 0) { console.error('no data'); process.exit(1); }
mkdirSync('site', { recursive: true });
writeFileSync('site/data.json', JSON.stringify({ now: Date.now(), ac: [...byHex.values()] }));
