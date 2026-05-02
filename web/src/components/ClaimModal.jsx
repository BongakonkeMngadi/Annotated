import { useState } from 'react';
import { FileWarning, X } from 'lucide-react';
import { api } from '../lib/api.js';

export default function ClaimModal({ annotationId, open, onClose }) {
  const [form, setForm] = useState({ claimantName: '', claimantEmail: '', relationship: '', reason: '', requestedAction: 'review', proofUrl: '' });
  const [status, setStatus] = useState('idle');

  if (!open) return null;

  async function submit(event) {
    event.preventDefault();
    setStatus('submitting');
    try {
      await api.fileClaim(annotationId, form);
      setStatus('sent');
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5 backdrop-blur-xl">
      <div className="glass w-full max-w-2xl rounded-3xl p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-lg font-black"><FileWarning className="text-ember" /> File a Claim</div>
            <p className="mt-1 text-sm text-white/55">For original creators, rights holders, or representatives to dispute fair-use breaches.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10"><X /></button>
        </div>

        {status === 'sent' ? (
          <div className="rounded-2xl border border-green-400/25 bg-green-400/10 p-5 text-green-100">Claim received. The annotation is now marked for review.</div>
        ) : (
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <input required placeholder="Your name" value={form.claimantName} onChange={(e) => setForm({ ...form, claimantName: e.target.value })} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-ember" />
              <input required type="email" placeholder="Email" value={form.claimantEmail} onChange={(e) => setForm({ ...form, claimantEmail: e.target.value })} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-ember" />
            </div>
            <input required placeholder="Relationship to original content" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-ember" />
            <textarea required placeholder="Explain the claim" rows="5" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-ember" />
            <input placeholder="Proof URL or reference" value={form.proofUrl} onChange={(e) => setForm({ ...form, proofUrl: e.target.value })} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 outline-none focus:border-ember" />
            {status !== 'idle' && status !== 'submitting' && <p className="text-sm text-red-300">{status}</p>}
            <button disabled={status === 'submitting'} className="rounded-2xl bg-ember px-5 py-3 font-black text-white shadow-glow disabled:opacity-60">{status === 'submitting' ? 'Submitting...' : 'Submit claim'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
