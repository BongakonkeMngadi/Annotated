import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { optionalAuth } from './middleware/auth.js';
import { authRouter } from './routes/auth.js';
import { aiRouter } from './routes/ai.js';
import { annotationsRouter } from './routes/annotations.js';
import { uploadsRouter } from './routes/uploads.js';
import { usersRouter } from './routes/users.js';
import { hasFirebaseConfig } from './firebaseAdmin.js';
import { storageStatus } from './services/storageService.js';

const app = express();

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (config.extensionOrigin === '*') return callback(null, true);
    if (origin === config.webOrigin || origin === config.extensionOrigin) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by Annotated AI CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '8mb' }));
app.use(optionalAuth);

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'annotated-ai-server',
    firebase: hasFirebaseConfig ? 'configured' : 'memory-fallback',
    ai: config.openaiApiKey ? config.openaiModel : 'fallback',
    storage: storageStatus(),
  });
});

app.use('/api/auth', authRouter);
app.use('/api/ai', aiRouter);
app.use('/api/annotations', annotationsRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/users', usersRouter);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
});

app.listen(config.port, () => {
  console.log(`Annotated AI API running on http://localhost:${config.port}`);
});
