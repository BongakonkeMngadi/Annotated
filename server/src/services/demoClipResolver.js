import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const manifestPath = path.resolve(__dirname, '../../scripts/demo-podcast-clips.json');

let manifest = null;

function loadManifest() {
  if (!manifest) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  }
  return manifest;
}

function normalize(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function youtubeId(value) {
  try {
    const url = new URL(value);
    if (url.hostname.includes('youtu.be')) return url.pathname.replace('/', '');
    return url.searchParams.get('v') || '';
  } catch {
    return '';
  }
}

function publicAssetFor(clip, user) {
  const objectPath = `${user.uid}/demo-podcast-clips/${clip.slug}.mp4`;
  const publicUrl = `${config.supabase.url}/storage/v1/object/public/${config.supabase.bucket}/${objectPath}`;
  return {
    path: objectPath,
    url: publicUrl,
    bucket: config.supabase.bucket,
    contentType: 'video/mp4',
    kind: 'demo-podcast-clip',
    originalName: `${clip.slug}.mp4`,
    processed: true,
    processingNote: 'Pre-trimmed demo podcast clip stored in Supabase.',
  };
}

function clipMatchesPayload(clip, payload) {
  const payloadVideoId = youtubeId(payload.sourceUrl || payload.canonicalUrl || '');
  const clipVideoId = youtubeId(clip.sourceUrl || '');
  if (payloadVideoId && clipVideoId && payloadVideoId === clipVideoId) return true;

  const sourceTitle = normalize(payload.sourceTitle || payload.title || '');
  const clipTitle = normalize(clip.sourceTitle || '');
  if (sourceTitle && clipTitle && (sourceTitle.includes(clipTitle) || clipTitle.includes(sourceTitle))) return true;

  const pageText = normalize(`${payload.sourceTitle || ''} ${payload.description || ''} ${(payload.headings || []).join(' ')}`);
  const keyWords = normalize(clip.sourceTitle).split(' ').filter((word) => word.length > 3);
  const score = keyWords.filter((word) => pageText.includes(word)).length;
  return keyWords.length > 0 && score >= Math.min(5, keyWords.length);
}

export function resolveDemoPodcastClip(payload = {}) {
  if (payload.disableDemoClipMatch) return null;
  const data = loadManifest();
  const clip = data.clips.find((item) => clipMatchesPayload(item, payload));
  if (!clip) return null;

  const asset = publicAssetFor(clip, data.user);
  return {
    clip,
    asset,
    payload: {
      type: clip.type || 'video',
      sourceUrl: clip.sourceUrl,
      canonicalUrl: clip.sourceUrl,
      sourceTitle: clip.sourceTitle,
      sourceAuthor: clip.sourceAuthor || payload.sourceAuthor || '',
      sourceDomain: new URL(clip.sourceUrl).hostname.replace(/^www\./, ''),
      selectedText: clip.transcriptionText || payload.selectedText || '',
      mediaUrl: asset.url,
      mediaAsset: asset,
      mediaStart: clip.mediaStart,
      mediaEnd: clip.mediaEnd,
      mediaEmbedUrl: null,
      sourceDuration: clip.sourceDuration ?? payload.sourceDuration ?? null,
      clipDuration: clip.clipDuration ?? payload.clipDuration ?? null,
      aiTitle: clip.aiTitle,
      aiSummary: clip.fallbackSummary,
      fairUseNote: clip.fairUseNote,
      tags: clip.tags || [],
      demoSlug: clip.slug,
    },
  };
}
