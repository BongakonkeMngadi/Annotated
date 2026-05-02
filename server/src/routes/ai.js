import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { assistAnnotation, improveCommentary } from '../services/aiAgent.js';

export const aiRouter = Router();

aiRouter.post('/assist', asyncHandler(async (req, res) => {
  const result = await assistAnnotation(req.body || {});
  res.json({ ok: true, assist: result });
}));

aiRouter.post('/improve-commentary', asyncHandler(async (req, res) => {
  const result = await improveCommentary(req.body || {});
  res.json({ ok: true, ...result });
}));
