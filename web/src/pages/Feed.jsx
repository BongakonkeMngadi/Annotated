import { useEffect, useState } from 'react';
import { Flame, RefreshCw, Trash2 } from 'lucide-react';
import AnnotationCard from '../components/AnnotationCard.jsx';
import LoadingState from '../components/LoadingState.jsx';
import { api } from '../lib/api.js';

export default function Feed() {
  const [annotations, setAnnotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.listAnnotations();
      setAnnotations(data.annotations || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function like(id) {
    const result = await api.likeAnnotation(id).catch((err) => {
      console.error('Like failed:', err);
      alert('Failed to like. Please sign in and try again.');
      return null;
    });
    if (!result) return null;
    setAnnotations((items) => items.map((item) => item.id === id ? { ...item, likeCount: result.likeCount } : item));
    return result;
  }

  async function comment(id, body) {
    const result = await api.addComment(id, { body }).catch((err) => {
      console.error('Comment failed:', err);
      alert('Failed to comment. Please sign in and try again.');
      return null;
    });
    if (!result?.comment) return null;
    setAnnotations((items) => items.map((item) => item.id === id ? { ...item, commentCount: (item.commentCount || 0) + 1 } : item));
    return result;
  }

  async function follow(authorId) {
    const result = await api.followUser(authorId).catch((err) => {
      console.error('Follow failed:', err);
      alert('Failed to follow. Please sign in and try again.');
      return null;
    });
    if (!result) return null;
    setAnnotations((items) => items.map((item) => item.authorId === authorId ? { ...item, author: { ...(item.author || {}), followerCount: result.followerCount } } : item));
    return result;
  }

  async function clearFeed() {
    if (!window.confirm('Remove all current feed posts? Supabase video files will stay stored.')) return;
    const result = await api.clearAnnotations().catch((err) => {
      console.error('Clear feed failed:', err);
      alert(err.message || 'Failed to clear feed. Please sign in and try again.');
      return null;
    });
    if (!result) return;
    setAnnotations([]);
  }

  if (loading) return <LoadingState label="Loading the annotation feed..." />;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-5">
      <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-300/25 bg-orange-500/10 px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] text-orange-100"><Flame size={14} /> Public feed</div>
          <h1 className="max-w-3xl text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">Sourced takes from around the web.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">Every post links back to the original source and carries visible discussion, reactions, and claim controls.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={clearFeed} className="inline-flex items-center gap-2 rounded-2xl border border-red-300/20 px-4 py-3 text-sm font-bold text-red-100 hover:bg-red-400/10"><Trash2 size={16} /> Clear feed</button>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-2xl border border-white/15 px-4 py-3 text-sm font-bold text-white hover:bg-white/10"><RefreshCw size={16} /> Refresh</button>
        </div>
      </div>

      {error && <div className="mb-5 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-red-100">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        {annotations.map((annotation) => <AnnotationCard key={annotation.id} annotation={annotation} onLike={like} onComment={comment} onFollow={follow} />)}
      </div>
      {!annotations.length && <div className="glass rounded-3xl p-10 text-center text-sm text-white/45">No annotations yet. Create the first sourced take.</div>}
    </section>
  );
}
