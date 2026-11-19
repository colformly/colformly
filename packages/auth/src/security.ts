/**
 * Shared CSP & Security Headers for Colformly apps (Astro, Vite/Cloudflare Pages, Workers).
 * Blocks XSS injection and unauthorized iframe embedding (clickjacking).
 */
export function buildCspHeader(options?: {
  supabaseUrl?: string;
  workerUrl?: string;
  allowInlineStyles?: boolean;
}): string {
  const supabaseOrigin = options?.supabaseUrl
    ? new URL(options.supabaseUrl).origin
    : 'https://*.supabase.co';
  const supabaseWs = supabaseOrigin.replace(/^https:/, 'wss:');
  const workerOrigin = options?.workerUrl
    ? new URL(options.workerUrl).origin
    : 'https://*.workers.dev';

  const directives = [
    "default-src 'self'",
    "script-src 'self'",
    options?.allowInlineStyles !== false ? "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com" : "style-src 'self' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    `img-src 'self' data: blob: ${supabaseOrigin} https://lh3.googleusercontent.com`,
    `connect-src 'self' ${supabaseOrigin} ${supabaseWs} ${workerOrigin} https://*.onrender.com https://colformly-ga4.onrender.com https://colformly-ga4-service.onrender.com`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ];

  return directives.join('; ');
}

export function getSecurityHeaders(options?: {
  supabaseUrl?: string;
  workerUrl?: string;
}): Record<string, string> {
  return {
    'Content-Security-Policy': buildCspHeader(options),
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  };
}
