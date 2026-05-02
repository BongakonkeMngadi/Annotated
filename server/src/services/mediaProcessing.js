import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

function parseTime(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value).trim();
  if (/^\d+$/.test(text)) return Number(text);
  const parts = text.split(':').map(Number);
  if (parts.some(Number.isNaN)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function extensionFor(file) {
  const fromName = file.originalname?.split('.').pop();
  if (fromName && fromName.length <= 8) return fromName.toLowerCase();
  if (file.mimetype === 'video/mp4') return 'mp4';
  if (file.mimetype === 'video/webm') return 'webm';
  if (file.mimetype === 'audio/mpeg') return 'mp3';
  if (file.mimetype === 'audio/mp4') return 'm4a';
  if (file.mimetype === 'audio/webm') return 'webm';
  return 'bin';
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', args, { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `ffmpeg exited with code ${code}`));
    });
  });
}

export async function createLowResClip(file, { mediaStart, mediaEnd, type }) {
  const start = parseTime(mediaStart);
  const end = parseTime(mediaEnd);
  const duration = Number.isFinite(start) && Number.isFinite(end) ? end - start : null;
  if (!file || !Number.isFinite(duration) || duration <= 0 || duration > 90) return file;
  if (type !== 'video' && type !== 'audio') return file;

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'annotated-clip-'));
  const inputExt = extensionFor(file);
  const outputExt = type === 'video' ? 'mp4' : inputExt === 'webm' ? 'webm' : 'mp3';
  const inputPath = path.join(tempDir, `input.${inputExt}`);
  const outputPath = path.join(tempDir, `clip.${outputExt}`);

  try {
    await writeFile(inputPath, file.buffer);
    const args = [
      '-y',
      '-ss', String(Math.max(0, start)),
      '-i', inputPath,
      '-t', String(duration),
    ];

    if (type === 'video') {
      args.push(
        '-vf', 'scale=-2:240',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '30',
        '-c:a', 'aac',
        '-b:a', '96k',
        '-movflags', '+faststart',
        outputPath,
      );
    } else {
      args.push('-vn', '-b:a', '96k', outputPath);
    }

    await runFfmpeg(args);
    const buffer = await readFile(outputPath);
    return {
      ...file,
      buffer,
      size: buffer.length,
      originalname: `clip-${Date.now()}.${outputExt}`,
      mimetype: type === 'video' ? 'video/mp4' : outputExt === 'webm' ? 'audio/webm' : 'audio/mpeg',
      processed: true,
      processingNote: type === 'video' ? 'Trimmed and downscaled to 240p.' : 'Trimmed to selected audio window.',
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
