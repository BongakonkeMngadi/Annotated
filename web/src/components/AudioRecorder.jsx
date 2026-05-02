import { useRef, useState } from 'react';
import { Mic, Square, Trash2 } from 'lucide-react';

export default function AudioRecorder({ onRecorded }) {
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [recording, setRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');

  async function start() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined });
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const file = new File([blob], `commentary-${Date.now()}.webm`, { type: blob.type });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        onRecorded?.(file);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (err) {
      setError(err.message || 'Microphone permission failed.');
    }
  }

  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  function clear() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    onRecorded?.(null);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-white/75">Recorded commentary</div>
          <div className="text-xs text-white/40">Optional audio take stored in Supabase.</div>
        </div>
        <div className="flex gap-2">
          {!recording ? (
            <button type="button" onClick={start} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-black"><Mic size={14} /> Record</button>
          ) : (
            <button type="button" onClick={stop} className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-3 py-2 text-xs font-black text-white"><Square size={14} /> Stop</button>
          )}
          {previewUrl && <button type="button" onClick={clear} className="rounded-xl border border-white/10 px-3 py-2 text-white/60 hover:bg-white/10"><Trash2 size={14} /></button>}
        </div>
      </div>
      {previewUrl && <audio controls src={previewUrl} className="w-full" />}
      {error && <div className="mt-2 text-xs text-red-300">{error}</div>}
    </div>
  );
}
