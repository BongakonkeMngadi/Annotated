import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { repository } from '../data/repository.js';

export const usersRouter = Router();

usersRouter.post('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await repository.upsertUser({ ...req.user, ...(req.body || {}) });
  res.json({ ok: true, user });
}));

usersRouter.get('/:id/annotations', asyncHandler(async (req, res) => {
  const annotations = await repository.listAnnotations({ authorId: req.params.id, limit: 40 });
  res.json({ ok: true, annotations });
}));

usersRouter.post('/:id/follow', requireAuth, asyncHandler(async (req, res) => {
  const result = await repository.toggleFollow(req.params.id, req.user);
  res.json({ ok: true, ...result });
}));
