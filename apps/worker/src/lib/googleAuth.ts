import { decryptToken, encryptToken } from './crypto';

export interface GoogleTokens {
  refreshToken?: string;
  accessToken: string;
  googleEmail: string;
  scopes: string[];
}

export const REQUIRED_GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/forms.body',
];

/**
 * Builds the canonical Google OAuth authorization URL using server-side GOOGLE_CLIENT_ID.
 * Strictly limits scopes to drive.file and forms.body.
 */
export function buildGoogleAuthUrl(
  redirectUri: string,
  env: {
    GOOGLE_CLIENT_ID?: string;
  },
  state: string = 'google_connect',
): string {
  const clientId = env.GOOGLE_CLIENT_ID || '1088241477726-colformly.apps.googleusercontent.com';
  const scopes = REQUIRED_GOOGLE_SCOPES.join(' ');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange OAuth authorization code for Google tokens.
 * Enforces strict scopes: ONLY drive.file and forms.body.
 */
export async function exchangeGoogleCode(
  code: string,
  redirectUri: string,
  env: {
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
  },
): Promise<GoogleTokens> {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth Client ID or Client Secret is not configured in worker environment.');
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    let parsedMsg = errText;
    try {
      const j = JSON.parse(errText);
      parsedMsg = j.error_description || j.error || errText;
    } catch {}
    throw new Error(`Google token exchange failed: ${parsedMsg}`);
  }

  const data = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    scope?: string;
    id_token?: string;
  };

  const grantedScopes = data.scope ? data.scope.split(' ') : [];
  const hasDrive = grantedScopes.some((s) => s.includes('drive.file'));
  const hasForms = grantedScopes.some((s) => s.includes('forms.body'));

  if (!hasDrive || !hasForms) {
    throw new Error(
      `Insufficient Google permissions granted. Both Google Drive (drive.file) and Google Forms (forms.body) scopes are required. Granted: ${grantedScopes.join(', ')}`,
    );
  }

  // Fetch Google User Profile to identify googleEmail
  const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });

  let googleEmail = '';
  if (userinfoRes.ok) {
    const info = (await userinfoRes.json()) as { email?: string };
    googleEmail = (info.email || '').toLowerCase().trim();
  }

  if (!googleEmail) {
    throw new Error('Failed to retrieve verified email address from Google OAuth account.');
  }

  return {
    refreshToken: data.refresh_token,
    accessToken: data.access_token,
    googleEmail,
    scopes: grantedScopes,
  };
}

/**
 * Retrieve a valid Google Access Token for a teacher by decrypting their refresh token
 * and fetching a fresh access token from Google OAuth2.
 */
export async function getValidGoogleAccessToken(
  userId: string,
  env: {
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    TOKEN_ENCRYPTION_KEY?: string;
  },
  supabaseAdmin: { supabaseUrl: string; secretKey: string },
): Promise<{ accessToken: string; googleEmail: string }> {
  const { supabaseUrl, secretKey } = supabaseAdmin;
  const encryptionKey = env.TOKEN_ENCRYPTION_KEY || 'colformly_default_sec_token_key_2026';

  // Fetch credentials from public.google_credentials
  const credRes = await fetch(
    `${supabaseUrl}/rest/v1/google_credentials?user_id=eq.${encodeURIComponent(userId)}&select=google_email,encrypted_refresh_token,token_iv`,
    {
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
      },
    },
  );

  if (!credRes.ok) {
    throw new Error('Failed to query user Google credentials from database.');
  }

  const creds = (await credRes.json().catch(() => [])) as Array<{
    google_email: string;
    encrypted_refresh_token: string;
    token_iv: string;
  }>;

  if (creds.length === 0 || !creds[0].encrypted_refresh_token) {
    throw new Error('No Google Workspace account is connected. Please connect your Google account in the Test Studio.');
  }

  const cred = creds[0];
  const refreshToken = await decryptToken(cred.encrypted_refresh_token, cred.token_iv, encryptionKey);

  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured on worker.');
  }

  const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!refreshRes.ok) {
    const errText = await refreshRes.text();
    throw new Error(`Failed to refresh Google access token: ${errText}`);
  }

  const tokenData = (await refreshRes.json()) as { access_token: string };
  return {
    accessToken: tokenData.access_token,
    googleEmail: cred.google_email,
  };
}
