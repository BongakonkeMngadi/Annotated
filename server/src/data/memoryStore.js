import { createId, nowIso } from '../utils/ids.js';
import { getDomain, normalizeUrl } from '../utils/source.js';

const demoUser = {
  id: 'demo_user',
  uid: 'demo_user',
  displayName: 'Annotated Demo',
  username: 'annotateddemo',
  photoURL: '',
  bio: 'Clipping sourced web moments with AI-assisted commentary.',
  followerCount: 0,
  followingCount: 0,
  createdAt: nowIso(),
};

const annotations = new Map();
const comments = new Map();
const claims = new Map();
const follows = new Map();
const likes = new Map();
const users = new Map([[demoUser.uid, demoUser]]);

function seed() {
  if (annotations.size) return;
  const id = createId('ann');
  annotations.set(id, {
    id,
    authorId: demoUser.uid,
    author: demoUser,
    type: 'text',
    sourceUrl: 'https://x.com/twistartups/status/2049931426972180820',
    canonicalUrl: 'https://x.com/twistartups/status/2049931426972180820',
    sourceTitle: 'J-Cal Annotated bounty announcement',
    sourceDomain: 'x.com',
    selectedText: 'Annotated is a sidebar Chrome extension that allows users to highlight and quickly clip media from any website, then add their own commentary and annotations.',
    commentaryText: 'This is the right wedge: source-linked commentary is a healthier primitive than screenshots and contextless quote posts.',
    commentaryAudioAsset: null,
    aiTitle: 'A better primitive for sourced internet commentary',
    aiSummary: 'The clip describes a browser sidebar that turns web highlights and media moments into annotated, shareable pages.',
    fairUseNote: 'Short excerpt used for commentary and criticism. Full original source is linked prominently.',
    tags: ['startups', 'chrome-extension', 'ai'],
    mediaAsset: null,
    mediaStart: null,
    mediaEnd: null,
    mediaEmbedUrl: null,
    sourceDuration: null,
    clipDuration: null,
    visibility: 'public',
    likeCount: 3,
    commentCount: 0,
    claimCount: 0,
    createdAt: nowIso(),
  });
}

seed();

export const memoryStore = {
  async upsertUser(user) {
    const uid = user.uid || user.id || demoUser.uid;
    const existing = users.get(uid) || {};
    const next = {
      id: uid,
      uid,
      displayName: user.displayName || existing.displayName || 'Annotated User',
      username: user.username || existing.username || `user${uid.slice(0, 6)}`,
      photoURL: user.photoURL || existing.photoURL || '',
      bio: user.bio ?? existing.bio ?? '',
      followerCount: existing.followerCount || 0,
      followingCount: existing.followingCount || 0,
      createdAt: existing.createdAt || nowIso(),
      updatedAt: nowIso(),
    };
    users.set(uid, next);
    return next;
  },

  async getUser(uid) {
    return users.get(uid) || null;
  },

  async listAnnotations({ limit = 40, authorId } = {}) {
    return [...annotations.values()]
      .filter((annotation) => !authorId || annotation.authorId === authorId)
      .filter((annotation) => annotation.visibility === 'public')
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, limit)
      .map((annotation) => ({ ...annotation, author: users.get(annotation.authorId) || demoUser }));
  },

  async createAnnotation(payload, user) {
    const id = createId('ann');
    const author = await this.upsertUser(user || demoUser);
    const sourceUrl = normalizeUrl(payload.sourceUrl);
    const annotation = {
      id,
      authorId: author.uid,
      author,
      type: payload.type || 'text',
      sourceUrl,
      canonicalUrl: normalizeUrl(payload.canonicalUrl || sourceUrl),
      sourceTitle: payload.sourceTitle || payload.title || 'Untitled source',
      sourceDomain: payload.sourceDomain || getDomain(sourceUrl),
      sourceAuthor: payload.sourceAuthor || '',
      selectedText: payload.selectedText || '',
      commentaryText: payload.commentaryText || '',
      commentaryAudioUrl: payload.commentaryAudioUrl || null,
      commentaryAudioAsset: payload.commentaryAudioAsset || null,
      mediaUrl: payload.mediaUrl || null,
      mediaAsset: payload.mediaAsset || null,
      mediaStart: payload.mediaStart ?? null,
      mediaEnd: payload.mediaEnd ?? null,
      mediaEmbedUrl: payload.mediaEmbedUrl || null,
      sourceDuration: payload.sourceDuration ?? null,
      clipDuration: payload.clipDuration ?? null,
      aiTitle: payload.aiTitle || payload.title || 'Untitled annotation',
      aiSummary: payload.aiSummary || '',
      fairUseNote: payload.fairUseNote || 'Short excerpt used for commentary and criticism. Full source linked.',
      tags: Array.isArray(payload.tags) ? payload.tags.slice(0, 8) : [],
      visibility: payload.visibility || 'public',
      likeCount: 0,
      commentCount: 0,
      claimCount: 0,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    annotations.set(id, annotation);
    return annotation;
  },

  async removeAnnotation(annotationId, user) {
    const annotation = annotations.get(annotationId);
    if (!annotation) return null;
    const uid = user?.uid || demoUser.uid;
    if (annotation.authorId !== uid) return false;
    annotation.visibility = 'removed';
    annotation.updatedAt = nowIso();
    return true;
  },

  async clearPublicAnnotations() {
    let removedCount = 0;
    annotations.forEach((annotation) => {
      if (annotation.visibility === 'public') {
        annotation.visibility = 'removed';
        annotation.updatedAt = nowIso();
        removedCount += 1;
      }
    });
    return { removedCount };
  },

  async getAnnotation(id) {
    const annotation = annotations.get(id);
    if (!annotation) return null;
    return { ...annotation, author: users.get(annotation.authorId) || demoUser };
  },

  async addComment(annotationId, payload, user) {
    const annotation = annotations.get(annotationId);
    if (!annotation) return null;
    const id = createId('com');
    const author = await this.upsertUser(user || demoUser);
    const comment = {
      id,
      annotationId,
      authorId: author.uid,
      author,
      body: payload.body || '',
      createdAt: nowIso(),
    };
    comments.set(id, comment);
    annotation.commentCount += 1;
    return comment;
  },

  async listComments(annotationId) {
    return [...comments.values()]
      .filter((comment) => comment.annotationId === annotationId)
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
      .map((comment) => ({ ...comment, author: users.get(comment.authorId) || demoUser }));
  },

  async createClaim(annotationId, payload, user) {
    const annotation = annotations.get(annotationId);
    if (!annotation) return null;
    const id = createId('claim');
    const claimant = user || demoUser;
    const claim = {
      id,
      annotationId,
      claimantId: claimant.uid,
      claimantName: payload.claimantName || '',
      claimantEmail: payload.claimantEmail || '',
      relationship: payload.relationship || '',
      reason: payload.reason || '',
      requestedAction: payload.requestedAction || 'review',
      proofUrl: payload.proofUrl || '',
      status: 'open',
      createdAt: nowIso(),
    };
    claims.set(id, claim);
    annotation.claimCount += 1;
    return claim;
  },

  async toggleLike(annotationId, user) {
    const annotation = annotations.get(annotationId);
    if (!annotation) return null;
    const uid = user?.uid || demoUser.uid;
    const key = `${uid}:${annotationId}`;
    if (likes.has(key)) {
      likes.delete(key);
      annotation.likeCount = Math.max(0, annotation.likeCount - 1);
      return { liked: false, likeCount: annotation.likeCount };
    }
    likes.set(key, { userId: uid, annotationId, createdAt: nowIso() });
    annotation.likeCount += 1;
    return { liked: true, likeCount: annotation.likeCount };
  },

  async toggleFollow(followingId, user) {
    const uid = user?.uid || demoUser.uid;
    if (uid === followingId) {
      const target = users.get(followingId) || demoUser;
      return { following: false, followerCount: target.followerCount || 0 };
    }
    const key = `${uid}:${followingId}`;
    const follower = users.get(uid) || await this.upsertUser(user || demoUser);
    const followingUser = users.get(followingId) || await this.upsertUser({ uid: followingId, displayName: 'Annotated User' });
    if (follows.has(key)) {
      follows.delete(key);
      follower.followingCount = Math.max(0, (follower.followingCount || 0) - 1);
      followingUser.followerCount = Math.max(0, (followingUser.followerCount || 0) - 1);
      return { following: false, followerCount: followingUser.followerCount };
    }
    follows.set(key, { followerId: uid, followingId, createdAt: nowIso() });
    follower.followingCount = (follower.followingCount || 0) + 1;
    followingUser.followerCount = (followingUser.followerCount || 0) + 1;
    return { following: true, followerCount: followingUser.followerCount };
  },
};
