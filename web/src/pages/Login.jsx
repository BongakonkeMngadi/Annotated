import { useNavigate } from 'react-router-dom';
import { Chrome, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { loginWithGoogle, demoMode } = useAuth();
  const navigate = useNavigate();

  async function login() {
    await loginWithGoogle();
    navigate('/feed');
  }

  return (
    <section className="mx-auto flex max-w-5xl items-center justify-center px-5 py-20">
      <div className="glass w-full max-w-xl rounded-[2rem] p-8 text-center">
        <img src="/asset/logo.png" alt="Annotated AI" className="mx-auto mb-5 h-16 w-auto" />
        <h1 className="text-4xl font-black tracking-tight">Sign in to Annotated</h1>
        <p className="mt-3 text-white/55">Continue with Google to save your profile, publish annotations, and join the conversation.</p>
        <button onClick={login} className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 font-black text-black"><LogIn size={18} /> Continue with Google</button>
        {demoMode && <div className="mt-4 rounded-2xl border border-orange-300/20 bg-orange-500/10 p-4 text-sm text-orange-100">Sign-in is being finalized for this environment. You can still explore the experience while setup completes.</div>}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-white/40"><Chrome size={14} /> The same account works on web and in the Chrome extension.</div>
      </div>
    </section>
  );
}
