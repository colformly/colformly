import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// In-memory 5-minute cache
interface CacheEntry {
  data: any;
  timestamp: number;
}
const cache: Record<string, CacheEntry> = {};
const CACHE_TTL_MS = 5 * 60 * 1000;

// Initialize GA4 Data Client if service account credentials present
let analyticsDataClient: BetaAnalyticsDataClient | null = null;
const propertyId = process.env.GA4_PROPERTY_ID;
const clientEmail = process.env.GA4_CLIENT_EMAIL;
const privateKey = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (propertyId && clientEmail && privateKey) {
  try {
    analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });
    console.log('✅ Google Analytics Data Client initialized for property:', propertyId);
  } catch (err) {
    console.warn('⚠️ Could not initialize GA4 Data Client:', err);
  }
} else {
  console.log('ℹ️ Running GA4 Service in telemetry simulation mode (no GA4 credentials provided)');
}

// ── Health Endpoint (12-minute keep-alive ping) ─────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'colformly-ga4-service',
    timestamp: new Date().toISOString(),
  });
});

// ── Auth Verification Middleware ─────────────────────────────────
async function verifySuperAdmin(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  const supabaseUrl = process.env.SUPABASE_URL || 'https://crprffwlfngyiyztwgwb.supabase.co';
  const apiKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    'sb_publishable_t9dfV3HzxY50ZwkiumiD_w_RurnQuC4';

  try {
    const userRes = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: apiKey },
    });

    if (!userRes.ok) {
      return res.status(401).json({ error: 'Unauthorized: Invalid Supabase token' });
    }

    const userData = (await userRes.json()) as { id: string; email: string };
    if (userData.email !== 'core@edgecors.com') {
      // Check if global_role in users table is SUPER_ADMIN
      const checkRoleRes = await fetch(
        `${supabaseUrl.replace(/\/$/, '')}/rest/v1/users?id=eq.${encodeURIComponent(userData.id)}&select=global_role`,
        {
          headers: { Authorization: `Bearer ${apiKey}`, apikey: apiKey },
        },
      );
      const roles = (await checkRoleRes.json().catch(() => [])) as Array<{ global_role?: string }>;
      if (roles?.[0]?.global_role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Super Admin role required' });
      }
    }

    next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Auth check failed: ' + err.message });
  }
}

// ── GET /api/analytics/overview ─────────────────────────────────
app.get('/api/analytics/overview', verifySuperAdmin, async (req: Request, res: Response) => {
  const days = req.query.days === '30' ? 30 : 7;
  const cacheKey = `overview_${days}`;

  const now = Date.now();
  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_TTL_MS) {
    return res.json({ ...cache[cacheKey].data, cached: true });
  }

  // If live GA4 client is configured, query official Google Analytics Data API
  if (analyticsDataClient && propertyId) {
    try {
      // 1. Run Realtime Report (active users last 30 minutes)
      const [realtimeResponse] = await analyticsDataClient.runRealtimeReport({
        property: `properties/${propertyId}`,
        metrics: [{ name: 'activeUsers' }],
      });
      const activeUsersNow = parseInt(
        realtimeResponse.rows?.[0]?.metricValues?.[0]?.value || '0',
        10,
      );

      // 2. Run Historical Trend Report (page views & event counts by date)
      const [trendResponse] = await analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'activeUsers' },
          { name: 'eventCount' },
        ],
        orderBys: [{ dimension: { orderType: 'ALPHANUMERIC', dimensionName: 'date' } }],
      });

      const dailyMetrics = (trendResponse.rows || []).map((row) => ({
        date: row.dimensionValues?.[0]?.value || '',
        pageViews: parseInt(row.metricValues?.[0]?.value || '0', 10),
        activeUsers: parseInt(row.metricValues?.[1]?.value || '0', 10),
        events: parseInt(row.metricValues?.[2]?.value || '0', 10),
      }));

      // 3. Run Traffic Sources Report
      const [sourcesResponse] = await analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
        dimensions: [{ name: 'sessionSource' }],
        metrics: [{ name: 'sessions' }],
        limit: 5,
      });

      const topSources = (sourcesResponse.rows || []).map((row) => ({
        source: row.dimensionValues?.[0]?.value || '(direct)',
        sessions: parseInt(row.metricValues?.[0]?.value || '0', 10),
      }));

      const totalPageViews = dailyMetrics.reduce((acc, curr) => acc + curr.pageViews, 0);
      const totalEvents = dailyMetrics.reduce((acc, curr) => acc + curr.events, 0);

      const payload = {
        days,
        activeUsersNow,
        totalPageViews,
        totalEvents,
        dailyMetrics,
        topSources,
        isLiveGA4: true,
      };

      cache[cacheKey] = { data: payload, timestamp: now };
      return res.json(payload);
    } catch (apiErr: any) {
      console.warn('GA4 live query failed, falling back to simulated payload:', apiErr);
    }
  }

  // Fallback realistic telemetry payload (when GA4 property is newly provisioned or credentials missing)
  const generateDailyTrend = (count: number) => {
    const list = [];
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
      const base = 420 + Math.floor(Math.sin(i) * 120);
      list.push({
        date: dateStr,
        pageViews: base,
        activeUsers: Math.floor(base * 0.42),
        events: base * 3,
      });
    }
    return list;
  };

  const fallbackDaily = generateDailyTrend(days);
  const fallbackPayload = {
    days,
    activeUsersNow: 42,
    totalPageViews: fallbackDaily.reduce((acc, curr) => acc + curr.pageViews, 0),
    totalEvents: fallbackDaily.reduce((acc, curr) => acc + curr.events, 0),
    dailyMetrics: fallbackDaily,
    topSources: [
      { source: 'google', sessions: 1820 },
      { source: '(direct)', sessions: 940 },
      { source: 'linkedin', sessions: 480 },
      { source: 'whatsapp', sessions: 290 },
      { source: 'twitter', sessions: 110 },
    ],
    isLiveGA4: false,
  };

  cache[cacheKey] = { data: fallbackPayload, timestamp: now };
  return res.json(fallbackPayload);
});

app.listen(PORT, () => {
  console.log(`🚀 Colformly GA4 Service listening on port ${PORT}`);
});
