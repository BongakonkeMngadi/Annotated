import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { uploadAsset } from '../services/storageService.js';
import { createLowResClip } from '../services/mediaProcessing.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 60 * 1024 * 1024,
  },
  fileFilter(_req, file, cb) {
    if (/^(audio|video|image)\//.test(file.mimetype)) return cb(null, true);
    return cb(new Error('Only audio, video, and image uploads are allowed'));
  },
});

export const uploadsRouter = Router();

uploadsRouter.post('/asset', requireAuth, upload.single('file'), asyncHandler(async (req, res) => {
  const processedFile = await createLowResClip(req.file, {
    mediaStart: req.body.mediaStart,
    mediaEnd: req.body.mediaEnd,
    type: req.body.type,
  }).catch((error) => {
    console.warn('Media clipping skipped:', error.message);
    return req.file;
  });
  const asset = await uploadAsset({
    file: processedFile,
    userId: req.user.uid,
    kind: req.body.kind || 'asset',
  });
  res.status(201).json({ ok: true, asset: { ...asset, processed: Boolean(processedFile?.processed), processingNote: processedFile?.processingNote || '' } });
}));
