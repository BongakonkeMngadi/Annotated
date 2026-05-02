import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');

const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) {
  const envText = fs.readFileSync(envPath, 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

const apiBase = process.env.ANNOTATED_API_BASE_URL || 'http://localhost:4010/api';
const webBase = process.env.ANNOTATED_WEB_BASE_URL || 'http://localhost:5173';
const googleClientId = process.env.ANNOTATED_GOOGLE_OAUTH_CLIENT_ID || 'YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com';

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(source, target);
    } else {
      if (/\.(png|jpg|jpeg|gif|webp|ico)$/i.test(entry.name)) {
        fs.copyFileSync(source, target);
        continue;
      }
      let content = fs.readFileSync(source, 'utf8');
      content = content
        .replaceAll('__ANNOTATED_API_BASE_URL__', apiBase)
        .replaceAll('__ANNOTATED_WEB_BASE_URL__', webBase)
        .replaceAll('__ANNOTATED_GOOGLE_OAUTH_CLIENT_ID__', googleClientId);
      fs.writeFileSync(target, content);
    }
  }
}

copyDir(src, dist);
console.log(`Annotated extension built at ${dist}`);
