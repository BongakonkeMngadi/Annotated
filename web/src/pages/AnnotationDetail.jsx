import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExternalLink, FileWarning, Heart, MessageCircle, Send, ShieldCheck } from 'lucide-react';
import ClaimModal from '../components/ClaimModal.jsx';
import LoadingState from '../components/LoadingState.jsx';
import MediaClipPlayer from '../components/MediaClipPlayer.jsx';
import { api } from '../lib/api.js';
import { sourceDomain } from '../utils/media.js';
import { useAuth } from '../context/AuthContext.jsx';
import { boldDurationText, formatClipRange, formatDuration, formatRelativeTime } from '../utils/time.js';

export default function AnnotationDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [annotation, setAnnotation] = useState(null);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [claimOpen, setClaimOpen] = useState(false);
  const [error, setError] = useState('');
  const [liked, setLiked] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.getAnnotation(id);
      setAnnotation(data.annotation);
      setComments(data.comments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function like() {
    if (!user) {
      alert('Please sign in to like annotations.');
      return;
    }
    const result = await api.likeAnnotation(id).catch((err) => {
      console.error('Like failed:', err);
      alert('Failed to like. Please try again.');
      return null;
    });
    if (result) {
      setAnnotation((item) => ({ ...item, likeCount: result.likeCount }));
      setLiked(result.liked);
    }
  }

  async function submitComment(event) {
    event.preventDefault();
    if (!comment.trim()) return;
    if (!user) {
      alert('Please sign in to comment.');
      return;
    }
    try {
      const result = await api.addComment(id, { body: comment });
      if (result?.comment) {
        setComments((items) => [...items, result.comment]);
        setComment('');
      }
    } catch (err) {
      console.error('Comment failed:', err);
      alert('Failed to post comment. Please try again.');
    }
  }

  if (loading) return <LoadingState label="Loading annotation..." />;
  if (error) return <div className="mx-auto max-w-4xl px-5 py-20 text-red-200">{error}</div>;
  if (!annotation) return null;

  const domain = annotation.sourceDomain || sourceDomain(annotation.sourceUrl);
  const clipRange = formatClipRange(annotation);
  const totalDuration = annotation.sourceDuration ? formatDuration(annotation.sourceDuration) : '';
  const renderDurationText = (text) => boldDurationText(text).map((part) => (
    part.bold ? <strong key={part.key} className="font-black text-white">{part.text}</strong> : <span key={part.key}>{part.text}</span>
  ));

  return (
    <section className="mx-auto max-w-4xl px-5 py-8">
      <ClaimModal annotationId={id} open={claimOpen} onClose={() => setClaimOpen(false)} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link to="/feed" className="text-sm text-white/50 hover:text-white">← Back to feed</Link>
        <div className="flex gap-2">
          <a href={annotation.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/75 hover:bg-white/10"><ExternalLink size={15} /> Original source</a>
          <button onClick={() => setClaimOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-red-300/25 bg-red-400/10 px-4 py-2 text-sm text-red-100 hover:bg-red-400/20"><FileWarning size={15} /> File a Claim</button>
        </div>
      </div>

      <article className="glass overflow-hidden rounded-[1.5rem] p-5 md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <Link to={`/u/${annotation.authorId}`} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-ember to-gold font-mono text-sm font-black text-black">{(annotation.author?.displayName || 'A').slice(0, 1)}</div>
            <div>
              <div className="text-sm font-bold">{annotation.author?.displayName || 'Annotated User'}</div>
              <div className="font-mono text-xs text-white/40">annotated {domain} · {formatRelativeTime(annotation.createdAt)}</div>
            </div>
          </Link>
          <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-xs uppercase text-white/45">{annotation.type}</span>
        </div>

        <h1 className="text-xl font-black leading-tight tracking-[-0.03em] md:text-2xl">{annotation.aiTitle || annotation.sourceTitle}</h1>
        {clipRange && (
          <div className="mt-3 inline-flex rounded-full bg-orange-500/15 px-3 py-1.5 font-mono text-xs text-orange-100">
            <strong>{clipRange}</strong>{totalDuration && <span className="ml-1 text-orange-100/60">of {totalDuration}</span>}
          </div>
        )}

        <div className="mx-auto mt-6 max-w-2xl">
          {annotation.mediaEmbedUrl ? (
            <iframe title={annotation.aiTitle} src={annotation.mediaEmbedUrl} className="aspect-video w-full rounded-2xl border border-white/10 bg-black" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          ) : (annotation.mediaAsset?.url || annotation.mediaUrl) && (annotation.type === 'audio' || annotation.type === 'video') ? (
            <MediaClipPlayer annotation={annotation} compact />
          ) : (
            <blockquote className="rounded-3xl border border-orange-300/20 bg-orange-500/10 p-5 text-base leading-7 text-white/85">“{renderDurationText(annotation.selectedText)}”</blockquote>
          )}
        </div>

        {annotation.aiSummary && (
          <div className="mx-auto mt-5 max-w-2xl rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-4 shadow-[0_0_45px_rgba(34,211,238,0.08)]">
            <div className="mb-2 font-mono text-xs font-black uppercase tracking-[0.2em] text-cyan-200/80">Kimi k2.6 real-time insight by AI</div>
            <p className="text-sm leading-6 text-cyan-50/85">{renderDurationText(annotation.aiSummary)}</p>
          </div>
        )}

        <div className="mt-6 rounded-2xl bg-white/5 p-5">
          <div className="mb-2 text-xs uppercase tracking-[0.2em] text-white/35">Commentary</div>
          <p className="whitespace-pre-wrap text-sm leading-6 text-white/85">{renderDurationText(annotation.commentaryText)}</p>
          {(annotation.commentaryAudioAsset?.url || annotation.commentaryAudioUrl) && (
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/35 p-4">
              <div className="mb-2 text-xs uppercase tracking-[0.2em] text-white/35">Recorded take</div>
              <audio controls src={annotation.commentaryAudioAsset?.url || annotation.commentaryAudioUrl} className="w-full" />
            </div>
          )}
        </div>

        <div className="mt-6 rounded-3xl border border-green-300/20 bg-green-400/10 p-5 text-green-100">
          <div className="mb-1 flex items-center gap-2 font-bold"><ShieldCheck size={17} /> Fair-use and attribution</div>
          <p className="text-sm leading-6 text-green-100/80">{annotation.fairUseNote}</p>
          <a href={annotation.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-white">Read full original source <ExternalLink size={14} /></a>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">{(annotation.tags || []).map((tag) => <span key={tag} className="rounded-full bg-white/8 px-3 py-1 text-xs text-white/65">#{tag}</span>)}</div>

        <div className="mt-8 flex items-center gap-4 border-t border-white/10 pt-6 text-white/60">
          <button onClick={like} className={`inline-flex items-center gap-2 transition ${liked ? 'text-ember' : 'hover:text-ember'}`}><Heart size={18} fill={liked ? 'currentColor' : 'none'} /> {annotation.likeCount || 0}</button>
          <span className="inline-flex items-center gap-2"><MessageCircle size={18} /> {comments.length}</span>
        </div>
      </article>

      <section className="mt-8 glass rounded-[2rem] p-6">
        <h2 className="mb-5 text-2xl font-black">Comments</h2>
        <form onSubmit={submitComment} className="mb-6 flex gap-3">
          <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Leave a sourced response..." className="flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-ember" />
          <button className="rounded-2xl bg-ember px-5 py-3 font-black text-white"><Send size={18} /></button>
        </form>
        <div className="grid gap-3">
          {comments.map((item) => (
            <div key={item.id} className="rounded-2xl bg-white/5 p-4">
              <div className="mb-1 text-sm font-bold">{item.author?.displayName || 'Annotated User'}</div>
              <p className="text-white/70">{item.body}</p>
            </div>
          ))}
          {!comments.length && <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-white/40">No comments yet. Start the thread.</div>}
        </div>
      </section>
    </section>
  );
}
