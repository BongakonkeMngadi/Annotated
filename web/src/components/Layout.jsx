import { Link, NavLink, Outlet } from 'react-router-dom';
import { LogIn, Plus, Radio } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

function navClass({ isActive }) {
  return `rounded-full px-4 py-2 text-sm transition ${isActive ? 'bg-white text-black' : 'text-white/70 hover:bg-white/10 hover:text-white'}`;
}

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/55 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <img src="/asset/logo.png" alt="Annotated AI" className="h-9 w-auto shrink-0 sm:h-10" />
            <div className="min-w-0">
              <div className="truncate font-mono text-base font-black tracking-tight sm:text-lg">Annotated AI</div>
              <div className="hidden text-xs text-white/45 sm:block">source-linked social annotations</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <NavLink to="/feed" className={navClass}>Feed</NavLink>
            <NavLink to="/create" className={navClass}>Create</NavLink>
            <a href="/#extension" className="rounded-full px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white">Extension</a>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {user ? (
              <button onClick={logout} className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/10">Sign out</button>
            ) : (
              <Link to="/login" className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-black"><LogIn size={16} /> Sign in</Link>
            )}
            <Link to="/create" className="hidden items-center gap-2 rounded-full bg-ember px-4 py-2 text-sm font-bold text-white shadow-glow sm:flex"><Plus size={16} /> Clip</Link>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-white/10 px-5 py-10">
        <div className="mx-auto grid max-w-7xl gap-6 text-sm text-white/55 md:grid-cols-3">
          <div className="flex items-center gap-2 font-mono text-white"><img src="/asset/logo.png" alt="Annotated AI" className="h-5 w-auto" /> Annotated AI</div>
          <div>Every annotation preserves a source link and claim path.</div>
          <div className="flex items-center gap-2 md:justify-end"><Radio size={16} /> Built for Chrome sidebar clipping.</div>
        </div>
      </footer>
    </div>
  );
}
