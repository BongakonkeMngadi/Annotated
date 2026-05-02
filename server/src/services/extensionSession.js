import crypto from 'node:crypto';
import { config } from '../config.js';
import { auth } from '../firebaseAdmin.js';

const sessionSecret = config.extensionSessionSecret || (config.requireAuth ? '' : 'annotated-dev-extension-session-secret');
const encoder = new TextEncoder();

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signPayload(payload) {
  if (!sessionSecret) throw new Error('EXTENSION_SESSION_SECRET is required for extension Google login');
  const encoded = base64url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', sessionSecret).update(encoded).digest('base64url');
  return `ext_${encoded}.${signature}`;
}

export function verifyExtensionSession(token) {
  try {
    if (!sessionSecret) return null;
    if (!token?.startsWith('ext_')) return null;
    const raw = token.slice(4);
    const [encoded, signature] = raw.split('.');
    if (!encoded || !signature) return null;
    const expected = crypto.createHmac('sha256', sessionSecret).update(encoded).digest('base64url');
    const actualBuffer = encoder.encode(signature);
    const expectedBuffer = encoder.encode(expected);
    if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createExtensionSessionFromGoogle(accessToken) {
  if (!accessToken) throw new Error('Missing Google access token');
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('Could not verify Google account');
  const profile = await response.json();
  if (!profile.sub || !profile.email) throw new Error('Google profile is missing required identity fields');
  let uid = `google_${profile.sub}`;
  if (auth) {
    try {
      const existing = await auth.getUserByEmail(profile.email);
      uid = existing.uid;
    } catch {
      const created = await auth.createUser({
        email: profile.email,
        displayName: profile.name || profile.email,
        photoURL: profile.picture || undefined,
        emailVerified: Boolean(profile.email_verified),
      });
      uid = created.uid;
    }
  }
  const payload = {
    uid,
    email: profile.email,
    displayName: profile.name || profile.email,
    photoURL: profile.picture || '',
    provider: 'google-extension',
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  };
  return { token: signPayload(payload), user: payload };
}
