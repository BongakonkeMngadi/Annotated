import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, Chrome, ExternalLink, FileWarning, MessageSquare, Play, Quote, ShieldCheck, Wand2 } from 'lucide-react';

const features = [
  { icon: Chrome, title: 'Real Chrome sidebar', body: 'Clip without leaving the page. The extension reads the current tab, highlighted text, source metadata, and YouTube context.' },
  { icon: Bot, title: 'Smart writing support', body: 'Generate titles, summaries, tags, commentary prompts, and sharing notes from the clip and page context.' },
  { icon: ShieldCheck, title: 'Source-first by design', body: 'Every public annotation links back to the original source and preserves canonical attribution.' },
  { icon: FileWarning, title: 'Claim workflow', body: 'Rights holders can file a claim directly from every annotation page.' },
];

export default function Landing() {
  return (
    <div className="overflow-x-hidden">
      <section className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-16 sm:px-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:py-24">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
          <img src="/asset/logo.png" alt="Annotated AI" className="mb-6 h-16 w-auto sm:h-20" />
          <h1 className="max-w-4xl break-words text-4xl font-black leading-[0.95] tracking-[-0.04em] text-white md:text-6xl">
            Clip the web. Add your take. Keep the source.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-white/65 md:text-xl">
            Annotated AI is a sidebar agent for turning highlights, YouTube moments, articles, and podcast snippets into public, source-linked social annotations.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link to="/create" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-ember px-6 py-4 font-black text-white shadow-glow"><Wand2 size={18} /> Create annotation</Link>
            <Link to="/feed" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 px-6 py-4 font-bold text-white hover:bg-white/10"><MessageSquare size={18} /> View feed</Link>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.55, delay: 0.1 }} className="glass min-w-0 rounded-[2rem] p-4">
          <div className="rounded-[1.5rem] border border-white/10 bg-black/50 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="font-mono text-sm text-white/60">Chrome side panel</div>
              <div className="rounded-full bg-ember px-3 py-1 text-xs font-bold">LIVE CLIP</div>
            </div>
            <div className="rounded-2xl border border-orange-300/20 bg-orange-500/10 p-4">
              <Quote className="mb-3 text-ember" />
              <p className="text-lg font-semibold leading-7">“Annotated lets users quickly clip media from any website, then add their own commentary.”</p>
            </div>
            <div className="mt-4 rounded-2xl bg-white/5 p-4">
              <div className="mb-2 text-xs uppercase tracking-[0.2em] text-white/35">AI suggestion</div>
              <h3 className="text-xl font-black">A better primitive for sourced internet commentary</h3>
              <p className="mt-2 text-sm leading-6 text-white/55">Short excerpt used for commentary and criticism. Original source linked prominently.</p>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 text-center text-xs text-white/55 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/5 p-3">90s max</div>
              <div className="rounded-2xl bg-white/5 p-3">Source link</div>
              <div className="rounded-2xl bg-white/5 p-3">Claim ready</div>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-5">
        <div className="grid gap-4 md:grid-cols-4">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="glass rounded-3xl p-5">
              <Icon className="mb-4 text-ember" />
              <h3 className="mb-2 text-lg font-black">{title}</h3>
              <p className="text-sm leading-6 text-white/55">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="extension" className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-5">
        <div className="glass overflow-hidden rounded-[2rem] p-8 md:p-10">
          <div className="grid gap-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-xs text-white/60"><Chrome size={14} /> Sidebar extension</div>
              <h2 className="text-4xl font-black tracking-tight">Capture and publish in minutes.</h2>
              <p className="mt-4 text-white/60">Highlight text, open the side panel, generate polished annotation suggestions, and publish to a public page with clear source and claim controls.</p>
            </div>
            <div className="grid min-w-0 gap-3 sm:grid-cols-3">
              {['Select text on any site', 'Ask AI for context', 'Publish to social feed'].map((step, index) => (
                <div key={step} className="rounded-3xl border border-white/10 bg-black/35 p-5">
                  <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-full bg-ember font-mono font-black">{index + 1}</div>
                  <div className="font-bold">{step}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/create" className="rounded-2xl bg-white px-5 py-3 font-black text-black">Start creating</Link>
            <a href="https://annotated.lovable.app" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl border border-white/15 px-5 py-3 font-bold text-white hover:bg-white/10">Submission site <ExternalLink size={16} /></a>
          </div>
        </div>
      </section>
    </div>
  );
}
