import { auth } from '../firebaseAdmin.js';
import { config } from '../config.js';
import { verifyExtensionSession } from '../services/extensionSession.js';

export async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  const extensionUser = verifyExtensionSession(token);
  if (extensionUser) {
    req.user = {
      uid: extensionUser.uid,
      displayName: extensionUser.displayName || extensionUser.email || 'Chrome User',
      photoURL: extensionUser.photoURL || '',
      email: extensionUser.email || '',
    };
    req.isAuthenticated = true;
    return next();
  }

  if (!token || !auth) {
    req.user = {
      uid: req.headers['x-demo-user-id'] || 'demo_user',
      displayName: req.headers['x-demo-user-name'] || 'Annotated Demo',
      photoURL: '',
      email: '',
    };
    req.isAuthenticated = !auth && !config.requireAuth;
    return next();
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      displayName: decoded.name || decoded.email || 'Annotated User',
      photoURL: decoded.picture || '',
      email: decoded.email || '',
    };
    req.isAuthenticated = true;
  } catch {
    req.user = {
      uid: 'demo_user',
      displayName: 'Annotated Demo',
      photoURL: '',
      email: '',
    };
    req.isAuthenticated = false;
  }

  return next();
}

export function requireAuth(req, res, next) {
  if (!auth && !config.requireAuth) return next();
  if (req.isAuthenticated) return next();
  return res.status(401).json({ ok: false, error: 'Sign in with Google to continue.' });
}
