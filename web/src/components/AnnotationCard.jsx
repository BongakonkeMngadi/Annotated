import { Link } from 'react-router-dom';
import { useState } from 'react';
import { ExternalLink, FileWarning, Heart, MessageCircle, Quote, Send, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { sourceDomain } from '../utils/media.js';
import { useAuth } from '../context/AuthContext.jsx';
import MediaClipPlayer from './MediaClipPlayer.jsx';
import ClaimModal from './ClaimModal.jsx';
import { boldDurationText, formatClipRange, formatDuration, formatRelativeTime } from '../utils/time.js';

export default function AnnotationCard({ annotation, onLike, onComment, onFollow, onRemove }) {
  const { user } = useAuth();
  const domain = annotation.sourceDomain || sourceDomain(annotation.sourceUrl);
  const title = annotation.aiTitle || annotation.sourceTitle || 'Untitled annotation';
  const hasUploadedMedia = Boolean(annotation.mediaAsset?.url || annotation.mediaUrl) && (annotation.type === 'audio' || annotation.type === 'video');
  const clipRange = formatClipRange(annotation);
  const totalDuration = annotation.sourceDuration ? formatDuration(annotation.sourceDuration) : '';
  const [liked, setLiked] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(annotation.likeCount || 0);
  const [localCommentCount, setLocalCommentCount] = useState(annotation.commentCount || 0);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(annotation.author?.followerCount || 0);
  const [claimOpen, setClaimOpen] = useState(false);
  const isOwnPost = user?.uid && user.uid === annotation.authorId;

  const handleLike = async () => {
    if (!user) {
      alert('Please sign in to like annotations.');
      return;
    }
    const result = await onLike?.(annotation.id);
    if (result) {
      setLiked(result.liked);
      setLocalLikeCount(result.likeCount);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      alert('Please sign in to follow creators.');
      return;
    }
    if (isOwnPost) return;
    const result = await onFollow?.(annotation.authorId);
    if (result) {
      setFollowing(result.following);
      setFollowerCount(result.followerCount ?? followerCount);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm('Remove this post from your profile and the public feed? The Supabase video file will stay stored.')) return;
    await onRemove?.(annotation.id);
  };

  const handleComment = async (event) => {
    event.preventDefault();
    if (!commentText.trim()) return;
    if (!user) {
      alert('Please sign in to comment.');
      return;
    }
    const result = await onComment?.(annotation.id, commentText.trim());
    if (result) {
      setCommentText('');
      setCommentOpen(false);
      setLocalCommentCount((count) => count + 1);
    }
  };

  const renderDurationText = (text) => boldDurationText(text).map((part) => (
    part.bold ? <strong key={part.key} className="font-black text-white">{part.text}</strong> : <span key={part.key}>{part.text}</span>
  ));

  return (
    <article className="glass card-hover overflow-hidden rounded-3xl p-4 sm:p-5">
      <ClaimModal annotationId={annotation.id} open={claimOpen} onClose={() => setClaimOpen(false)} />
      <div className="mb-4 flex items-start justify-between gap-3">
        <Link to={`/u/${annotation.authorId}`} className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ember to-gold font-mono text-sm font-black text-black">
            {(annotation.author?.displayName || 'A').slice(0, 1)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{annotation.author?.displayName || 'Annotated User'}</div>
            <div className="truncate text-xs text-white/40">annotated {domain} · {formatRelativeTime(annotation.createdAt)}</div>
          </div>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {!isOwnPost && (
            <button onClick={handleFollow} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition ${following ? 'bg-white text-black' : 'border border-white/10 text-white/65 hover:bg-white/10 hover:text-white'}`}>
              <UserPlus size={13} /> {following ? 'Following' : 'Follow'} · {followerCount}
            </button>
          )}
          {isOwnPost && onRemove && (
            <button onClick={handleRemove} className="inline-flex items-center gap-1 rounded-full border border-red-300/20 px-3 py-1 text-xs font-bold text-red-100 hover:bg-red-400/10">
              <Trash2 size={13} /> Remove
            </button>
          )}
          <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[10px] uppercase text-white/45">{annotation.type}</span>
        </div>
      </div>

      <Link to={`/annotation/${annotation.id}`}>
        <h2 className="mb-2 text-[15px] font-bold leading-snug text-white sm:text-base">{title}</h2>
      </Link>
      {clipRange && (
        <div className="mb-2 inline-flex rounded-full bg-orange-500/15 px-2.5 py-1 font-mono text-[11px] text-orange-100">
          <strong>{clipRange}</strong>{totalDuration && <span className="ml-1 text-orange-100/60">of {totalDuration}</span>}
        </div>
      )}
      {annotation.mediaEmbedUrl ? (
        <div className="mb-3 overflow-hidden rounded-xl border border-orange-300/20 bg-black/55">
          <iframe title={title} src={annotation.mediaEmbedUrl} className="h-40 w-full bg-black sm:h-44" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        </div>
      ) : hasUploadedMedia ? (
        <div className="mb-3">
          <MediaClipPlayer annotation={annotation} compact />
        </div>
      ) : (
        <Link to={`/annotation/${annotation.id}`}>
          <blockquote className="mb-3 rounded-xl border border-orange-300/20 bg-orange-500/10 p-3 text-[13px] leading-5 text-white/75 sm:text-sm">
            <Quote className="mb-1 text-ember" size={14} />
            <p className="line-clamp-2">{renderDurationText(annotation.selectedText || annotation.aiSummary)}</p>
          </blockquote>
        </Link>
      )}
      {annotation.aiSummary && (
        <Link to={`/annotation/${annotation.id}`} className="mb-3 block rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-3 shadow-[0_0_30px_rgba(34,211,238,0.08)]">
          <div className="mb-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200/80">Kimi k2.6 insight</div>
          <p className="line-clamp-3 text-[13px] leading-5 text-cyan-50/85 sm:text-sm">{renderDurationText(annotation.aiSummary)}</p>
        </Link>
      )}
      <Link to={`/annotation/${annotation.id}`}>
        <p className="mb-3 line-clamp-2 text-[13px] leading-5 text-white/60 sm:text-sm">{renderDurationText(annotation.commentaryText)}</p>
      </Link>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {(annotation.tags || []).slice(0, 4).map((tag) => (
          <span key={tag} className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-white/60">#{tag}</span>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs text-white/55">
        <div className="flex items-center gap-3 sm:gap-4">
          <button onClick={handleLike} className={`flex items-center gap-1 rounded-full px-2 py-1 transition ${liked ? 'bg-orange-500/10 text-ember' : 'hover:bg-white/8 hover:text-ember'}`}><Heart size={14} fill={liked ? 'currentColor' : 'none'} /> <span>{localLikeCount}</span></button>
          <button onClick={() => setCommentOpen((open) => !open)} className="flex items-center gap-1 rounded-full px-2 py-1 hover:bg-white/8 hover:text-white"><MessageCircle size={14} /> <span>{localCommentCount}</span></button>
          <button onClick={() => setClaimOpen(true)} className="flex items-center gap-1 rounded-full px-2 py-1 hover:bg-red-400/10 hover:text-red-100"><FileWarning size={14} /> <span>File a Claim</span></button>
        </div>
        <a href={annotation.sourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-white"><ShieldCheck size={14} /> <span className="hidden sm:inline">Source</span> <ExternalLink size={12} /></a>
      </div>
      {commentOpen && (
        <form onSubmit={handleComment} className="mt-3 flex gap-2 border-t border-white/10 pt-3">
          <input value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Write a comment..." className="min-w-0 flex-1 rounded-full border border-white/10 bg-black/35 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-ember" />
          <button className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ember text-white"><Send size={15} /></button>
        </form>
      )}
    </article>
  );
}
