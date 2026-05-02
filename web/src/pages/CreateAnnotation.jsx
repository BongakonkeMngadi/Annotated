import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, ExternalLink, FileText, Link as LinkIcon, Loader2, Play, Sparkles, Wand2 } from 'lucide-react';
import AudioRecorder from '../components/AudioRecorder.jsx';
import { api } from '../lib/api.js';
import { isYouTube, sourceDomain } from '../utils/media.js';

const emptyForm = {
  type: 'text',
  sourceUrl: '',
  sourceTitle: '',
  selectedText: '',
  commentaryText: '',
  mediaStart: '',
  mediaEnd: '',
};

export default function CreateAnnotation() {
  const [form, setForm] = useState(emptyForm);
  const [assist, setAssist] = useState(null);
  const [mediaFile, setMediaFile] = useState(null);
  const [commentaryAudioFile, setCommentaryAudioFile] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function update(field, value) {
    const next = { ...form, [field]: value };
    if (field === 'sourceUrl' && isYouTube(value)) next.type = 'video';
    setForm(next);
  }

  async function runAssist() {
    setStatus('assisting');
    setError('');
    try {
      const result = await api.assist({ ...form, sourceDomain: sourceDomain(form.sourceUrl) });
      setAssist(result.assist);
    } catch (err) {
      setError(err.message);
    } finally {
      setStatus('idle');
    }
  }

  async function improve() {
    setStatus('improving');
    setError('');
    try {
      const result = await api.improveCommentary({ commentary: form.commentaryText, clip: form.selectedText, sourceUrl: form.sourceUrl });
      update('commentaryText', result.improved);
    } catch (err) {
      setError(err.message);
    } finally {
      setStatus('idle');
    }
  }

  async function publish(event) {
    event.preventDefault();
    setStatus('publishing');
    setError('');
    try {
      const mediaUpload = mediaFile ? await api.uploadAsset(mediaFile, form.type === 'audio' ? 'audio-clip' : 'video-clip', {
        type: form.type,
        mediaStart: form.mediaStart,
        mediaEnd: form.mediaEnd,
      }) : null;
      const commentaryUpload = commentaryAudioFile ? await api.uploadAsset(commentaryAudioFile, 'commentary-audio') : null;
      const result = await api.createAnnotation({
        ...form,
        mediaUrl: mediaUpload?.asset?.url || form.mediaUrl || '',
        mediaAsset: mediaUpload?.asset || null,
        commentaryAudioUrl: commentaryUpload?.asset?.url || '',
        commentaryAudioAsset: commentaryUpload?.asset || null,
        aiTitle: assist?.title,
        aiSummary: assist?.summary,
        fairUseNote: assist?.fairUseNote,
        tags: assist?.tags || [],
      });
      navigate(`/annotation/${result.annotation.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setStatus('idle');
    }
  }

  const busy = status !== 'idle';

  if (status === 'publishing') {
    return (
      <section className="flex min-h-[70vh] items-center justify-center px-5 py-20">
        <div className="glass rounded-[2rem] p-8 text-center">
          <Loader2 className="mx-auto mb-4 animate-spin text-ember" size={34} />
          <div className="text-lg font-black text-white">Publishing annotation...</div>
          <div className="mt-2 text-sm text-white/50">Creating the clip page and saving it to the feed.</div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-12">
      <div className="mb-8 max-w-3xl">
        <h1 className="text-5xl font-black tracking-[-0.05em]">Create a source-linked annotation.</h1>
        <p className="mt-3 text-white/55">Capture a source, add your perspective, and publish a clean annotation ready to share.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={publish} className="glass rounded-[2rem] p-6">
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            {[
              ['text', FileText, 'Text'],
              ['video', Play, 'Video'],
              ['audio', Sparkles, 'Audio'],
            ].map(([value, Icon, label]) => (
              <button key={value} type="button" onClick={() => update('type', value)} className={`rounded-2xl border px-4 py-3 text-left ${form.type === value ? 'border-ember bg-ember/20 text-white' : 'border-white/10 bg-white/5 text-white/55'}`}>
                <Icon className="mb-2" size={18} />
                <div className="font-bold">{label}</div>
              </button>
            ))}
          </div>

          <div className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-white/70">Original source URL</span>
              <input required value={form.sourceUrl} onChange={(e) => update('sourceUrl', e.target.value)} placeholder="https://..." className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-ember" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-white/70">Source title</span>
              <input value={form.sourceTitle} onChange={(e) => update('sourceTitle', e.target.value)} placeholder="Original title" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-ember" />
            </label>
            {(form.type === 'video' || form.type === 'audio') && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-white/70">Clip start</span>
                  <input value={form.mediaStart} onChange={(e) => update('mediaStart', e.target.value)} placeholder="1:24" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-ember" />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-white/70">Clip end</span>
                  <input value={form.mediaEnd} onChange={(e) => update('mediaEnd', e.target.value)} placeholder="2:10, max 90s" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-ember" />
                </label>
              </div>
            )}
            <label className="grid gap-2">
              <span className="text-sm font-bold text-white/70">Clipped text or context</span>
              <textarea value={form.selectedText} onChange={(e) => update('selectedText', e.target.value)} rows="6" placeholder="Paste a highlighted passage or describe the selected media moment." className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-ember" />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-bold text-white/70">Your commentary</span>
              <textarea required value={form.commentaryText} onChange={(e) => update('commentaryText', e.target.value)} rows="5" placeholder="Add your take, critique, reaction, or analysis." className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-ember" />
            </label>
            <AudioRecorder onRecorded={setCommentaryAudioFile} />
          </div>

          {error && <div className="mt-4 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-100">{error}</div>}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={runAssist} disabled={busy || !form.sourceUrl} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 px-5 py-3 font-bold text-white hover:bg-white/10 disabled:opacity-50">{status === 'assisting' ? <Loader2 className="animate-spin" size={18} /> : <Bot size={18} />} Ask Kimi k2.6</button>
            <button type="button" onClick={improve} disabled={busy || !form.commentaryText} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 px-5 py-3 font-bold text-white hover:bg-white/10 disabled:opacity-50"><Sparkles size={18} /> Sharpen take</button>
            <button disabled={busy} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-ember px-5 py-3 font-black text-white shadow-glow disabled:opacity-60">{status === 'publishing' ? <Loader2 className="animate-spin" size={18} /> : <LinkIcon size={18} />} Publish</button>
          </div>
        </form>

        <aside className="glass rounded-[2rem] p-6">
          <div className="mb-4 flex items-center gap-2 font-mono text-sm text-white/50"><Bot size={16} /> Writing suggestions</div>
          {assist ? (
            <div className="grid gap-4">
              <div className="rounded-2xl bg-white/5 p-4">
                <div className="mb-1 text-xs uppercase tracking-[0.18em] text-white/35">Title</div>
                <div className="text-2xl font-black leading-tight">{assist.title}</div>
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                <div className="mb-1 text-xs uppercase tracking-[0.18em] text-white/35">Summary</div>
                <p className="text-white/65">{assist.summary}</p>
              </div>
              <div className="rounded-2xl bg-white/5 p-4">
                <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/35">Commentary angles</div>
                <div className="grid gap-2">
                  {(assist.suggestedCommentary || []).map((item) => <button key={item} onClick={() => update('commentaryText', item)} className="rounded-xl border border-white/10 p-3 text-left text-sm text-white/70 hover:border-ember">{item}</button>)}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">{(assist.tags || []).map((tag) => <span key={tag} className="rounded-full bg-orange-500/15 px-3 py-1 text-xs text-orange-100">#{tag}</span>)}</div>
              <div className="rounded-2xl border border-green-300/20 bg-green-400/10 p-4 text-sm text-green-100">{assist.fairUseNote}</div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-white/45">Add a source to generate a suggested title, summary, tags, and sharing note.</div>
          )}
          {form.sourceUrl && <a href={form.sourceUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm text-white/50 hover:text-white">Open source <ExternalLink size={14} /></a>}
        </aside>
      </div>
    </section>
  );
}
