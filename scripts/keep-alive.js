/**
 * Colformly GA4 Service & Worker Keep-Alive Ping Keeper
 * Pings the Render service and Cloudflare Worker to prevent cold-start latency.
 */

const TARGET_URLS = [
  'https://colformly-ga4-service.onrender.com/health',
  'https://colformly-ga4.onrender.com/health',
  'https://colformly-worker.colformly.workers.dev/health/keep-alive',
];

async function pingTarget(url) {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Colformly-KeepAlive-Script/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    const duration = Date.now() - start;
    const text = await res.text();
    console.log(`[${new Date().toISOString()}] ✅ PING OK: ${url} (HTTP ${res.status}, ${duration}ms)`);
    return { url, status: res.status, duration, ok: true, text };
  } catch (err) {
    const duration = Date.now() - start;
    console.warn(`[${new Date().toISOString()}] ⚠️ PING FAILED: ${url} (${duration}ms) - ${err.message}`);
    return { url, error: err.message, ok: false };
  }
}

async function run() {
  console.log(`🚀 Starting Colformly Keep-Alive Ping at ${new Date().toISOString()}...`);
  const results = await Promise.all(TARGET_URLS.map(pingTarget));
  console.log('🏁 Ping round finished.');
  return results;
}

if (process.argv.includes('--watch')) {
  run();
  const INTERVAL_MS = 11 * 60 * 1000; // 11 minutes
  console.log(`⏰ Scheduled recurring ping every ${INTERVAL_MS / 60000} minutes. Press Ctrl+C to stop.`);
  setInterval(run, INTERVAL_MS);
} else {
  run();
}
