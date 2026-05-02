import OpenAI from 'openai';
import { config } from '../config.js';
import { getDomain } from '../utils/source.js';

const client = config.openaiApiKey
  ? new OpenAI({
      apiKey: config.openaiApiKey,
      baseURL: config.openaiBaseUrl,
    })
  : null;

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text || '').match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function fallbackAssist(payload = {}) {
  const sourceDomain = getDomain(payload.sourceUrl || '');
  const text = payload.selectedText || payload.pageText || payload.sourceTitle || 'this source';
  const words = text.split(/\s+/).filter(Boolean);
  const short = words.slice(0, 24).join(' ');
  const type = payload.type || (payload.sourceUrl?.includes('youtube.com') || payload.sourceUrl?.includes('youtu.be') ? 'video' : 'text');

  return {
    title: type === 'video' ? 'A clipped moment worth discussing' : 'A sourced note on an important passage',
    contentType: type,
    summary: short ? `This clip from ${sourceDomain} focuses on: ${short}${words.length > 24 ? '...' : ''}` : `A source-linked annotation from ${sourceDomain}.`,
    suggestedCommentary: [
      'This stood out because it changes how we should think about the topic.',
      'The important context is not just what is said, but what it implies next.',
      'This is worth saving because it gives people a precise source to respond to.',
    ],
    tags: ['annotated', type, sourceDomain.split('.')[0]].filter(Boolean).slice(0, 5),
    fairUseNote: 'Short excerpt or timestamped source reference used for commentary, criticism, and discussion. The original source is linked prominently.',
    riskLevel: 'low',
    claimReadiness: 'Source URL preserved and File a Claim flow available.',
  };
}

function fallbackPodcastSummary(payload = {}) {
  const words = String(payload.transcript || '').replace(/\s+/g, ' ').trim().split(/\s+/).filter(Boolean);
  const excerpt = words.slice(0, 42).join(' ');
  return {
    title: payload.aiTitle || `Annotated moment from ${payload.sourceTitle || 'the podcast'}`,
    summary: excerpt ? `In this clipped moment, the speakers focus on ${excerpt}${words.length > 42 ? '...' : ''}` : `This clipped moment highlights a focused exchange from ${payload.sourceTitle || 'the original podcast'}.`,
    commentary: payload.commentaryText || 'This clip is useful because it turns a long podcast into a precise, source-linked moment people can understand quickly.',
    tags: payload.tags || ['podcast', 'clip', 'ai'],
    fairUseNote: 'Short excerpt used for commentary, criticism, and discussion. The original source is linked prominently and the clip can be reviewed through the File a Claim flow.',
  };
}

export async function assistAnnotation(payload = {}) {
  if (!client) return fallbackAssist(payload);

  const system = `You are Annotated AI, a source-aware annotation agent. Return strict JSON only. You help users transform web highlights, YouTube moments, articles, and podcast snippets into public annotations that are useful, sourced, and fair-use aware. Never invent source facts. Keep copied content short. Always preserve attribution.`;

  const text = `Create annotation assistance for this clipping payload.

Payload:
${JSON.stringify(payload, null, 2)}

Return JSON with exactly these keys:
{
  "title": string,
  "contentType": "text" | "video" | "audio" | "image" | "mixed",
  "summary": string,
  "suggestedCommentary": string[3],
  "tags": string[3-6],
  "fairUseNote": string,
  "riskLevel": "low" | "medium" | "high",
  "claimReadiness": string
}`;

  const content = [{ type: 'text', text }];
  if (payload.screenshotDataUrl) {
    content.push({
      type: 'image_url',
      image_url: { url: payload.screenshotDataUrl },
    });
  }

  const response = await client.chat.completions.create({
    model: config.openaiModel,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content },
    ],
    temperature: 0.25,
    max_tokens: 900,
    response_format: { type: 'json_object' },
  });

  const parsed = safeJson(response.choices?.[0]?.message?.content);
  return parsed || fallbackAssist(payload);
}

export async function summarizePodcastClip(payload = {}) {
  if (!client) return fallbackPodcastSummary(payload);

  const system = `You are Kimi k2.6 helping Annotated AI prepare source-linked podcast clip annotations. Return strict JSON only. Summarize only what is present in the transcript. Do not invent facts, guests, sponsors, or claims. Make the summary sound natural for a feed card. Keep it concise and specific. Emphasize why this exact trimmed podcast moment is worth saving. Include fair-use aware language.`;

  const response = await client.chat.completions.create({
    model: config.openaiModel,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `Create a polished annotation package for this exact clipped podcast segment. Return JSON with exactly: {"title":"...","summary":"...","commentary":"...","tags":["..."],"fairUseNote":"..."}.

${JSON.stringify(payload, null, 2)}` },
    ],
    temperature: 0.2,
    max_tokens: 700,
    response_format: { type: 'json_object' },
  });

  const parsed = safeJson(response.choices?.[0]?.message?.content);
  if (!parsed) return fallbackPodcastSummary(payload);
  return {
    ...fallbackPodcastSummary(payload),
    ...parsed,
    tags: Array.isArray(parsed.tags) ? parsed.tags : fallbackPodcastSummary(payload).tags,
  };
}

export async function improveCommentary(payload = {}) {
  if (!client) {
    return {
      improved: payload.commentary ? `${payload.commentary.trim()}\n\nThe source matters here because it gives readers a precise place to verify and respond.` : 'This clip matters because it gives readers a precise source to verify, interpret, and discuss.',
    };
  }

  const response = await client.chat.completions.create({
    model: config.openaiModel,
    messages: [
      { role: 'system', content: 'You sharpen user commentary for a sourced annotation. Preserve the user voice. Do not add unsupported claims. Return JSON only.' },
      { role: 'user', content: `Improve this commentary for clarity and punch. Return {"improved":"..."}.\n\n${JSON.stringify(payload, null, 2)}` },
    ],
    temperature: 0.35,
    max_tokens: 500,
    response_format: { type: 'json_object' },
  });

  return safeJson(response.choices?.[0]?.message?.content) || { improved: payload.commentary || '' };
}
