import { useEffect, useRef } from 'react';

export default function MediaClipPlayer({ annotation, compact = false }) {
  const ref = useRef(null);
  const source = annotation.mediaAsset?.url || annotation.mediaUrl;
  const isUploadedClip = Boolean(annotation.mediaAsset?.url);
  const startValue = Number(annotation.mediaStart);
  const endValue = Number(annotation.mediaEnd);
  const start = Number.isFinite(startValue) ? startValue : null;
  const end = Number.isFinite(endValue) ? endValue : null;
  const playbackStart = isUploadedClip ? null : start;
  const playbackEnd = isUploadedClip ? null : end;
  const isVideo = annotation.type === 'video';

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const onLoaded = () => {
      if (playbackStart !== null) el.currentTime = playbackStart;
    };
    const onPlay = () => {
      if (playbackStart !== null && el.currentTime < playbackStart) el.currentTime = playbackStart;
      if (playbackEnd !== null && el.currentTime >= playbackEnd) el.currentTime = playbackStart ?? 0;
    };
    const onTime = () => {
      if (playbackEnd !== null && el.currentTime >= playbackEnd) el.pause();
    };
    el.addEventListener('loadedmetadata', onLoaded);
    el.addEventListener('play', onPlay);
    el.addEventListener('timeupdate', onTime);
    return () => {
      el.removeEventListener('loadedmetadata', onLoaded);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('timeupdate', onTime);
    };
  }, [playbackStart, playbackEnd]);

  if (!source) return null;

  return (
    <div className={`${compact ? 'rounded-xl p-2' : 'rounded-3xl p-3'} border border-white/10 bg-black/50`}>
      {isVideo ? (
        <video ref={ref} controls src={source} className={`${compact ? 'h-40 rounded-lg object-contain sm:h-44' : 'aspect-video rounded-2xl'} w-full bg-black`} />
      ) : (
        <audio ref={ref} controls src={source} className="w-full" />
      )}
      {!isUploadedClip && (start !== null || end !== null) && (
        <div className={`${compact ? 'mt-1 rounded-lg px-2 py-1 text-[10px]' : 'mt-2 rounded-xl px-3 py-2 text-xs'} bg-white/5 font-mono text-white/45`}>
          Clip window: {start ?? 0}s → {end ?? 'end'}s
        </div>
      )}
    </div>
  );
}
