import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { repository } from '../data/repository.js';
import { assistAnnotation, summarizePodcastClip } from '../services/aiAgent.js';
import { resolveDemoPodcastClip } from '../services/demoClipResolver.js';
import { buildYouTubeEmbed, parseTimeToSeconds } from '../utils/source.js';

export const annotationsRouter = Router();

annotationsRouter.get('/', asyncHandler(async (req, res) => {
  const annotations = await repository.listAnnotations({
    limit: req.query.limit ? Number(req.query.limit) : 40,
    authorId: req.query.authorId || undefined,
  });
  res.json({ ok: true, annotations });
}));

annotationsRouter.delete('/', requireAuth, asyncHandler(async (_req, res) => {
  const result = await repository.clearPublicAnnotations();
  res.json({ ok: true, ...result });
}));

annotationsRouter.post('/', requireAuth, asyncHandler(async (req, res) => {
  const incoming = req.body || {};
  const demoMatch = resolveDemoPodcastClip(incoming);
  const payload = demoMatch ? { ...incoming, ...demoMatch.payload } : incoming;
  const demoAi = demoMatch ? await summarizePodcastClip({
    sourceTitle: demoMatch.clip.sourceTitle,
    sourceAuthor: demoMatch.clip.sourceAuthor,
    sourceUrl: demoMatch.clip.sourceUrl,
    mediaStart: demoMatch.clip.mediaStart,
    mediaEnd: demoMatch.clip.mediaEnd,
    clipDuration: demoMatch.clip.clipDuration,
    transcript: demoMatch.clip.transcriptionText,
    aiTitle: demoMatch.clip.aiTitle,
    fallbackSummary: demoMatch.clip.fallbackSummary,
    commentaryText: incoming.commentaryText || demoMatch.clip.commentaryText,
    tags: demoMatch.clip.tags,
  }).catch(() => null) : null;
  const ai = demoAi || payload.ai || await assistAnnotation(payload);
  const mediaStart = parseTimeToSeconds(payload.mediaStart);
  const mediaEnd = parseTimeToSeconds(payload.mediaEnd);
  const type = payload.type || ai.contentType || 'text';
  const duration = Number.isFinite(mediaStart) && Number.isFinite(mediaEnd) ? mediaEnd - mediaStart : null;
  const youtubeEmbedUrl = type === 'video' && !payload.mediaAsset?.url ? buildYouTubeEmbed(payload.sourceUrl || payload.mediaUrl, mediaStart, mediaEnd) : null;

  if (duration !== null && (duration <= 0 || duration > 90)) {
    return res.status(400).json({ ok: false, error: 'Clips must be longer than 0 seconds and no more than 90 seconds.' });
  }

  const annotation = await repository.createAnnotation({
    ...payload,
    type,
    mediaStart,
    mediaEnd,
    clipDuration: payload.clipDuration ?? duration,
    mediaEmbedUrl: youtubeEmbedUrl || payload.mediaEmbedUrl || null,
    aiTitle: demoAi?.title || payload.aiTitle || ai.title,
    aiSummary: demoAi?.summary || payload.aiSummary || ai.summary,
    fairUseNote: demoAi?.fairUseNote || payload.fairUseNote || ai.fairUseNote,
    tags: demoAi?.tags?.length ? demoAi.tags : payload.tags?.length ? payload.tags : ai.tags,
  }, req.user);

  res.status(201).json({ ok: true, annotation });
}));

annotationsRouter.get('/:id', asyncHandler(async (req, res) => {
  const annotation = await repository.getAnnotation(req.params.id);
  if (!annotation) return res.status(404).json({ ok: false, error: 'Annotation not found' });
  const comments = await repository.listComments(req.params.id);
  res.json({ ok: true, annotation, comments });
}));

annotationsRouter.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const result = await repository.removeAnnotation(req.params.id, req.user);
  if (result === null) return res.status(404).json({ ok: false, error: 'Annotation not found' });
  if (result === false) return res.status(403).json({ ok: false, error: 'You can only remove your own posts.' });
  res.json({ ok: true, removed: true });
}));

annotationsRouter.post('/:id/comments', requireAuth, asyncHandler(async (req, res) => {
  const comment = await repository.addComment(req.params.id, req.body || {}, req.user);
  if (!comment) return res.status(404).json({ ok: false, error: 'Annotation not found' });
  res.status(201).json({ ok: true, comment });
}));

annotationsRouter.post('/:id/like', requireAuth, asyncHandler(async (req, res) => {
  const result = await repository.toggleLike(req.params.id, req.user);
  if (!result) return res.status(404).json({ ok: false, error: 'Annotation not found' });
  res.json({ ok: true, ...result });
}));

annotationsRouter.post('/:id/claims', requireAuth, asyncHandler(async (req, res) => {
  const claim = await repository.createClaim(req.params.id, req.body || {}, req.user);
  if (!claim) return res.status(404).json({ ok: false, error: 'Annotation not found' });
  res.status(201).json({ ok: true, claim });
}));
