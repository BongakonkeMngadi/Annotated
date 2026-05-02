# Annotated AI

Annotated AI is a Chrome sidebar extension and social web app for clipping sourced web moments, adding commentary, and publishing public annotation pages with claim/dispute tooling.

## Apps

- `web` — React/Vite public app: landing, feed, annotation pages, profiles, claim flow.
- `server` — Express API with Firebase Admin support and Kimi K2.6 annotation assistance.
- `extension` — Chrome Manifest V3 side panel extension for clipping current pages.

## Quick Start

1. Install dependencies in each app:

```bash
npm --prefix server install
npm --prefix web install
npm --prefix extension install
```

2. Copy env examples:

```bash
copy server\.env.example server\.env
copy web\.env.example web\.env
copy extension\.env.example extension\.env
```

3. Start the API and web app:

```bash
npm run dev:server
npm run dev:web
```

The server has demo-safe in-memory fallbacks when Firebase or Kimi keys are missing.

## Kimi K2.6

Set these in `server/.env`:

```env
OPENAI_API_KEY=your_fireworks_key
OPENAI_BASE_URL=https://api.fireworks.ai/inference/v1
OPENAI_MODEL=accounts/fireworks/models/kimi-k2p6
```

## Production Auth and Storage

For production mode, configure all three env files.

`server/.env` needs Firebase Admin, Supabase Storage, Kimi, and a strong extension session secret:

```env
REQUIRE_AUTH=true
EXTENSION_SESSION_SECRET=use-a-long-random-secret

FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_STORAGE_BUCKET=annotated-media
```

Create a public Supabase bucket named `annotated-media`, or keep it private and replace public URL behavior with signed URLs later.

`web/.env` needs Firebase client credentials:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Enable Google sign-in in Firebase Authentication.

## Chrome Extension

For real Google login inside the Chrome side panel, create a Google OAuth client for a Chrome extension and set:

```env
ANNOTATED_GOOGLE_OAUTH_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
```

The extension build reads `extension/.env` and injects the OAuth client ID into `manifest.json`.

Build it:

```bash
npm --prefix extension run build
```

Then load `Annotated/extension/dist` in Chrome via `chrome://extensions` → Developer mode → Load unpacked.

## Required Competition Features

- Real Chrome side panel extension.
- Source-linked annotation landing pages.
- Public social feed with comments.
- File a Claim button and claim form.
- Google-ready auth via Firebase.
- AI-generated title, summary, tags, commentary prompts, and fair-use note.
