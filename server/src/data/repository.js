import { db, admin } from '../firebaseAdmin.js';
import { memoryStore } from './memoryStore.js';
import { createId, nowIso } from '../utils/ids.js';
import { getDomain, normalizeUrl } from '../utils/source.js';

const hasDb = Boolean(db);

function cleanUser(user) {
  return {
    uid: user?.uid || 'demo_user',
    displayName: user?.displayName || user?.email || 'Annotated User',
    photoURL: user?.photoURL || '',
    email: user?.email || '',
  };
}

async function ensureUser(user) {
  const normalized = cleanUser(user);
  if (!hasDb) return memoryStore.upsertUser(normalized);
  const ref = db.collection('users').doc(normalized.uid);
  const snap = await ref.get();
  const data = {
    id: normalized.uid,
    uid: normalized.uid,
    displayName: normalized.displayName,
    username: snap.exists ? snap.data().username : `user${normalized.uid.slice(0, 6)}`,
    photoURL: normalized.photoURL,
    email: normalized.email,
    bio: snap.exists ? snap.data().bio || '' : '',
    followerCount: snap.exists ? snap.data().followerCount || 0 : 0,
    followingCount: snap.exists ? snap.data().followingCount || 0 : 0,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await ref.set({ ...data, createdAt: snap.exists ? snap.data().createdAt : admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return { ...data, createdAt: snap.exists ? snap.data().createdAt : nowIso(), updatedAt: nowIso() };
}

function serializeDoc(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate?.().toISOString?.() || data.createdAt || nowIso(),
    updatedAt: data.updatedAt?.toDate?.().toISOString?.() || data.updatedAt || null,
  };
}

function isMissingIndexError(error) {
  return error?.code === 9 && String(error?.details || error?.message || '').includes('requires an index');
}

function sortByCreatedAtDesc(items) {
  return items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function sortByCreatedAtAsc(items) {
  return items.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

export const repository = {
  async upsertUser(user) {
    return ensureUser(user);
  },

  async listAnnotations(options = {}) {
    if (!hasDb) return memoryStore.listAnnotations(options);
    let query = db.collection('annotations').where('visibility', '==', 'public').orderBy('createdAt', 'desc').limit(Number(options.limit || 40));
    if (options.authorId) {
      query = db.collection('annotations').where('authorId', '==', options.authorId).where('visibility', '==', 'public').orderBy('createdAt', 'desc').limit(Number(options.limit || 40));
    }
    let snap;
    try {
      snap = await query.get();
    } catch (error) {
      if (!isMissingIndexError(error)) throw error;
      const fallback = options.authorId
        ? db.collection('annotations').where('authorId', '==', options.authorId).where('visibility', '==', 'public').limit(Number(options.limit || 40))
        : db.collection('annotations').where('visibility', '==', 'public').limit(Number(options.limit || 40));
      snap = await fallback.get();
    }
    const annotations = await Promise.all(snap.docs.map(async (doc) => {
      const annotation = serializeDoc(doc);
      const userSnap = await db.collection('users').doc(annotation.authorId).get();
      return { ...annotation, author: userSnap.exists ? { id: userSnap.id, ...userSnap.data() } : null };
    }));
    return sortByCreatedAtDesc(annotations);
  },

  async createAnnotation(payload, user) {
    if (!hasDb) return memoryStore.createAnnotation(payload, cleanUser(user));
    const author = await ensureUser(user);
    const id = createId('ann');
    const sourceUrl = normalizeUrl(payload.sourceUrl);
    const annotation = {
      authorId: author.uid,
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
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection('annotations').doc(id).set(annotation);
    return { id, ...annotation, author, createdAt: nowIso(), updatedAt: nowIso() };
  },

  async removeAnnotation(annotationId, user) {
    if (!hasDb) return memoryStore.removeAnnotation(annotationId, cleanUser(user));
    const uid = cleanUser(user).uid;
    const annotationRef = db.collection('annotations').doc(annotationId);
    const annotationSnap = await annotationRef.get();
    if (!annotationSnap.exists) return null;
    const annotation = annotationSnap.data();
    if (annotation.authorId !== uid) return false;
    await annotationRef.set({ visibility: 'removed', updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return true;
  },

  async clearPublicAnnotations() {
    if (!hasDb) return memoryStore.clearPublicAnnotations();
    const snap = await db.collection('annotations').where('visibility', '==', 'public').limit(500).get();
    if (snap.empty) return { removedCount: 0 };
    const batch = db.batch();
    snap.docs.forEach((doc) => {
      batch.set(doc.ref, { visibility: 'removed', updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    });
    await batch.commit();
    return { removedCount: snap.size };
  },

  async getAnnotation(id) {
    if (!hasDb) return memoryStore.getAnnotation(id);
    const doc = await db.collection('annotations').doc(id).get();
    if (!doc.exists) return null;
    const annotation = serializeDoc(doc);
    const userSnap = await db.collection('users').doc(annotation.authorId).get();
    return { ...annotation, author: userSnap.exists ? { id: userSnap.id, ...userSnap.data() } : null };
  },

  async addComment(annotationId, payload, user) {
    if (!hasDb) return memoryStore.addComment(annotationId, payload, cleanUser(user));
    const annotationRef = db.collection('annotations').doc(annotationId);
    const annotationSnap = await annotationRef.get();
    if (!annotationSnap.exists) return null;
    const author = await ensureUser(user);
    const id = createId('com');
    const comment = {
      annotationId,
      authorId: author.uid,
      body: payload.body || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection('comments').doc(id).set(comment);
    await annotationRef.update({ commentCount: admin.firestore.FieldValue.increment(1) });
    return { id, ...comment, author, createdAt: nowIso() };
  },

  async listComments(annotationId) {
    if (!hasDb) return memoryStore.listComments(annotationId);
    let snap;
    try {
      snap = await db.collection('comments').where('annotationId', '==', annotationId).orderBy('createdAt', 'asc').get();
    } catch (error) {
      if (!isMissingIndexError(error)) throw error;
      snap = await db.collection('comments').where('annotationId', '==', annotationId).get();
    }
    const comments = await Promise.all(snap.docs.map(async (doc) => {
      const comment = serializeDoc(doc);
      const userSnap = await db.collection('users').doc(comment.authorId).get();
      return { ...comment, author: userSnap.exists ? { id: userSnap.id, ...userSnap.data() } : null };
    }));
    return sortByCreatedAtAsc(comments);
  },

  async createClaim(annotationId, payload, user) {
    if (!hasDb) return memoryStore.createClaim(annotationId, payload, cleanUser(user));
    const annotationRef = db.collection('annotations').doc(annotationId);
    const annotationSnap = await annotationRef.get();
    if (!annotationSnap.exists) return null;
    const id = createId('claim');
    const claimant = cleanUser(user);
    const claim = {
      annotationId,
      claimantId: claimant.uid,
      claimantName: payload.claimantName || '',
      claimantEmail: payload.claimantEmail || '',
      relationship: payload.relationship || '',
      reason: payload.reason || '',
      requestedAction: payload.requestedAction || 'review',
      proofUrl: payload.proofUrl || '',
      status: 'open',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection('claims').doc(id).set(claim);
    await annotationRef.update({ claimCount: admin.firestore.FieldValue.increment(1) });
    return { id, ...claim, createdAt: nowIso() };
  },

  async toggleLike(annotationId, user) {
    if (!hasDb) return memoryStore.toggleLike(annotationId, cleanUser(user));
    const uid = cleanUser(user).uid;
    const key = `${uid}_${annotationId}`;
    const likeRef = db.collection('likes').doc(key);
    const annotationRef = db.collection('annotations').doc(annotationId);
    const likeSnap = await likeRef.get();
    if (likeSnap.exists) {
      await likeRef.delete();
      await annotationRef.update({ likeCount: admin.firestore.FieldValue.increment(-1) });
      const fresh = await annotationRef.get();
      return { liked: false, likeCount: Math.max(0, fresh.data()?.likeCount || 0) };
    }
    await likeRef.set({ userId: uid, annotationId, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    await annotationRef.update({ likeCount: admin.firestore.FieldValue.increment(1) });
    const fresh = await annotationRef.get();
    return { liked: true, likeCount: fresh.data()?.likeCount || 1 };
  },

  async toggleFollow(followingId, user) {
    if (!hasDb) return memoryStore.toggleFollow(followingId, cleanUser(user));
    const uid = cleanUser(user).uid;
    if (uid === followingId) {
      const targetSnap = await db.collection('users').doc(followingId).get();
      return { following: false, followerCount: targetSnap.data()?.followerCount || 0 };
    }
    const key = `${uid}_${followingId}`;
    const ref = db.collection('follows').doc(key);
    const followerRef = db.collection('users').doc(uid);
    const followingRef = db.collection('users').doc(followingId);
    const snap = await ref.get();
    if (snap.exists) {
      await ref.delete();
      await followerRef.set({ followingCount: admin.firestore.FieldValue.increment(-1), updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      await followingRef.set({ followerCount: admin.firestore.FieldValue.increment(-1), updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      const fresh = await followingRef.get();
      return { following: false, followerCount: Math.max(0, fresh.data()?.followerCount || 0) };
    }
    await ref.set({ followerId: uid, followingId, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    await followerRef.set({ followingCount: admin.firestore.FieldValue.increment(1), updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    await followingRef.set({ followerCount: admin.firestore.FieldValue.increment(1), updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    const fresh = await followingRef.get();
    return { following: true, followerCount: Math.max(0, fresh.data()?.followerCount || 1) };
  },
};
