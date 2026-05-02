import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { createExtensionSessionFromGoogle } from '../services/extensionSession.js';
import { repository } from '../data/repository.js';

export const authRouter = Router();

authRouter.post('/extension-google', asyncHandler(async (req, res) => {
  const { accessToken } = req.body || {};
  const session = await createExtensionSessionFromGoogle(accessToken);
  await repository.upsertUser(session.user);
  res.json({ ok: true, token: session.token, user: session.user });
}));
