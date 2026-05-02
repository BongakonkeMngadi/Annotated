export default function LoadingState({ label = 'Loading Annotated AI...' }) {
  return (
    <div className="mx-auto flex max-w-5xl items-center justify-center px-5 py-24">
      <div className="glass rounded-3xl px-6 py-5 font-mono text-sm text-white/60">{label}</div>
    </div>
  );
}
