import admin from 'firebase-admin';
import { config } from './config.js';

let app = null;
let db = null;
let auth = null;

const hasFirebaseConfig = Boolean(
  config.firebase.projectId &&
    config.firebase.clientEmail &&
    config.firebase.privateKey
);

if (hasFirebaseConfig && !admin.apps.length) {
  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: config.firebase.projectId,
      clientEmail: config.firebase.clientEmail,
      privateKey: config.firebase.privateKey,
    }),
  });
  db = admin.firestore(app);
  auth = admin.auth(app);
}

export { admin, db, auth, hasFirebaseConfig };
