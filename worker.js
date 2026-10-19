// Cloudflare Worker: relays adsb.lol (free ADS-B data) and adds CORS so the web page can read it.
// Usage: https://<your-worker>.workers.dev/v2/point/LAT/LON/NM  or  /v2/mil
export default {
  async fetch(req) {
    const path = new URL(req.url).pathname;
    if (!path.startsWith('/v2/')) return new Response('flight-tracker proxy', { status: 200 });
    const r = await fetch('https://api.adsb.lol' + path, { cf: { cacheTtl: 5, cacheEverything: true } });
    return new Response(r.body, {
      status: r.status,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }
    });
  }
};
