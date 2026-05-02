import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { admin, db } from '../src/firebaseAdmin.js';
import { uploadAsset } from '../src/services/storageService.js';
import { summarizePodcastClip } from '../src/services/aiAgent.js';
import { config } from '../src/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const manifestPath = path.join(__dirname, 'demo-podcast-clips.json');
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const skipAi = args.has('--skip-ai');
const preserveTime = args.has('--preserve-time');

function contentTypeFor(filePath) {
  if (/\.mp4$/i.test(filePath)) return 'video/mp4';
  if (/\.webm$/i.test(filePath)) return 'video/webm';
  if (/\.mov$/i.test(filePath)) return 'video/quicktime';
  return 'application/octet-stream';
}

function cleanTags(tags) {
  return Array.isArray(tags) ? tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 8) : [];
}

async function readManifest() {
  const raw = await fs.readFile(manifestPath, 'utf8');
  return JSON.parse(raw);
}

async function fileToUpload(filePath) {
  const buffer = await fs.readFile(filePath);
  return {
    buffer,
    size: buffer.length,
    originalname: path.basename(filePath),
    mimetype: contentTypeFor(filePath),
  };
}

async function buildAnnotation({ clip, asset, user, aiPackage }) {
  const summary = aiPackage.summary || clip.fallbackSummary || '';
  const title = aiPackage.title || clip.aiTitle || clip.sourceTitle;
  return {
    authorId: user.uid,
    type: clip.type || 'video',
    sourceUrl: clip.sourceUrl,
    canonicalUrl: clip.sourceUrl,
    sourceTitle: clip.sourceTitle,
    sourceDomain: new URL(clip.sourceUrl).hostname.replace(/^www\./, ''),
    sourceAuthor: clip.sourceAuthor || '',
    selectedText: clip.transcriptionText || '',
    commentaryText: aiPackage.commentary || clip.commentaryText || '',
    commentaryAudioUrl: null,
    commentaryAudioAsset: null,
    mediaUrl: asset.url,
    mediaAsset: asset,
    mediaStart: clip.mediaStart,
    mediaEnd: clip.mediaEnd,
    mediaEmbedUrl: null,
    sourceDuration: clip.sourceDuration ?? null,
    clipDuration: clip.clipDuration ?? null,
    aiTitle: title,
    aiSummary: summary,
    fairUseNote: aiPackage.fairUseNote || clip.fairUseNote,
    tags: cleanTags(aiPackage.tags?.length ? aiPackage.tags : clip.tags),
    visibility: 'public',
    likeCount: 0,
    commentCount: 0,
    claimCount: 0,
    demoSlug: clip.slug,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

async function upsertUser(user) {
  await db.collection('users').doc(user.uid).set({
    id: user.uid,
    uid: user.uid,
    displayName: user.displayName,
    email: user.email || '',
    photoURL: user.photoURL || '',
    username: user.uid,
    bio: 'Demo account for source-linked podcast annotations.',
    followerCount: 0,
    followingCount: 0,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

async function seed() {
  const manifest = await readManifest();

  if (!dryRun && !db) {
    throw new Error('Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY before seeding persistent feed posts.');
  }
  if (!dryRun && (!config.supabase.url || !config.supabase.serviceRoleKey || !config.supabase.bucket)) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET before uploading clips.');
  }

  if (!dryRun) await upsertUser(manifest.user);

  for (const clip of manifest.clips) {
    const absoluteFilePath = path.resolve(__dirname, clip.file);
    await fs.access(absoluteFilePath);
    const file = await fileToUpload(absoluteFilePath);
    const objectPath = `${manifest.user.uid}/demo-podcast-clips/${clip.slug}.mp4`;

    console.log(`${dryRun ? '[dry-run]' : '[seed]'} ${clip.slug}`);
    console.log(`  file: ${absoluteFilePath}`);
    console.log(`  source: ${clip.sourceTitle}`);
    console.log(`  range: ${clip.mediaStart}–${clip.mediaEnd}`);

    if (dryRun) continue;

    const asset = await uploadAsset({
      file,
      userId: manifest.user.uid,
      kind: 'demo-podcast-clip',
      pathOverride: objectPath,
      upsert: true,
    });

    const aiPackage = skipAi ? {
      title: clip.aiTitle,
      summary: clip.fallbackSummary,
      commentary: clip.commentaryText,
      tags: clip.tags,
      fairUseNote: clip.fairUseNote,
    } : await summarizePodcastClip({
      sourceTitle: clip.sourceTitle,
      sourceAuthor: clip.sourceAuthor,
      sourceUrl: clip.sourceUrl,
      mediaStart: clip.mediaStart,
      mediaEnd: clip.mediaEnd,
      clipDuration: clip.clipDuration,
      transcript: clip.transcriptionText,
      aiTitle: clip.aiTitle,
      fallbackSummary: clip.fallbackSummary,
      commentaryText: clip.commentaryText,
      tags: clip.tags,
    }).catch((error) => {
      console.warn(`  Kimi summary failed for ${clip.slug}: ${error.message}`);
      return {
        title: clip.aiTitle,
        summary: clip.fallbackSummary,
        commentary: clip.commentaryText,
        tags: clip.tags,
        fairUseNote: clip.fairUseNote,
      };
    });

    const annotation = await buildAnnotation({ clip, asset, user: manifest.user, aiPackage });
    const annotationId = `demo_${clip.slug}`;
    const ref = db.collection('annotations').doc(annotationId);
    const snap = await ref.get();
    await ref.set({
      ...annotation,
      createdAt: preserveTime && snap.exists ? snap.data().createdAt : admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log(`  uploaded: ${asset.url}`);
    console.log(`  annotation: ${annotationId}`);
  }

  console.log(dryRun ? 'Dry run complete.' : 'Demo podcast clips seeded successfully.');
}

seed().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
