import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4010),
  webOrigin: process.env.WEB_ORIGIN || 'http://localhost:5173',
  extensionOrigin: process.env.EXTENSION_ORIGIN || '*',
  requireAuth: process.env.REQUIRE_AUTH === 'true',
  extensionSessionSecret: process.env.EXTENSION_SESSION_SECRET || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.fireworks.ai/inference/v1',
  openaiModel: process.env.OPENAI_MODEL || 'accounts/fireworks/models/kimi-k2p6',
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    bucket: process.env.SUPABASE_STORAGE_BUCKET || 'annotated-media',
  },
};
