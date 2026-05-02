import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import { createId } from '../utils/ids.js';

const hasSupabaseConfig = Boolean(config.supabase.url && config.supabase.serviceRoleKey && config.supabase.bucket);

const supabase = hasSupabaseConfig
  ? createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

let bucketReady = null;

function extensionFor(file) {
  const fromName = file.originalname?.split('.').pop();
  if (fromName && fromName.length <= 8) return fromName.toLowerCase();
  const map = {
    'audio/webm': 'webm',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'video/webm': 'webm',
    'video/mp4': 'mp4',
    'image/jpeg': 'jpg',
    'image/png': 'png',
  };
  return map[file.mimetype] || 'bin';
}

export function storageStatus() {
  return hasSupabaseConfig ? 'supabase' : 'not-configured';
}

async function ensureBucket() {
  if (!supabase) throw new Error('Supabase Storage is not configured');
  if (!bucketReady) {
    bucketReady = (async () => {
      const { error: getError } = await supabase.storage.getBucket(config.supabase.bucket);
      if (!getError) return;
      if (!String(getError.message || '').toLowerCase().includes('not found')) throw new Error(getError.message);
      const { error: createError } = await supabase.storage.createBucket(config.supabase.bucket, {
        public: true,
        fileSizeLimit: 60 * 1024 * 1024,
        allowedMimeTypes: ['audio/*', 'video/*', 'image/*'],
      });
      if (createError) throw new Error(`Supabase bucket "${config.supabase.bucket}" does not exist and could not be created: ${createError.message}`);
    })();
  }
  return bucketReady;
}

export async function uploadAsset({ file, userId, kind = 'asset', pathOverride = '', upsert = false }) {
  if (!file) throw new Error('No file provided');
  if (!supabase) throw new Error('Supabase Storage is not configured');

  await ensureBucket();

  const safeKind = String(kind).replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'asset';
  const ext = extensionFor(file);
  const path = pathOverride || `${userId || 'anonymous'}/${safeKind}/${createId('asset')}.${ext}`;

  async function upload() {
    return supabase.storage
      .from(config.supabase.bucket)
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert,
      });
  }

  let { error } = await upload();
  if (error && String(error.message || '').toLowerCase().includes('bucket not found')) {
    bucketReady = null;
    await ensureBucket();
    ({ error } = await upload());
  }

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(config.supabase.bucket).getPublicUrl(path);

  return {
    path,
    url: data.publicUrl,
    bucket: config.supabase.bucket,
    contentType: file.mimetype,
    size: file.size,
    kind: safeKind,
    originalName: file.originalname || '',
  };
}
