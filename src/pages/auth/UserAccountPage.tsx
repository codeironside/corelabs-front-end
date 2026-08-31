import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export function UserAccountPage(): React.JSX.Element {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <main className="relative min-h-full overflow-hidden bg-black px-6 py-16 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.08),_transparent_55%)]" />
      <div className="relative z-10 mx-auto max-w-lg rounded-3xl border border-white/10 bg-black/80 p-8 backdrop-blur">
        <p className="text-xs tracking-[0.18em] text-white/45 uppercase">users</p>
        <h1 className="mt-4 text-3xl font-medium tracking-tight">you are signed in</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/65">
          this account is on the users role. studio creation tools are for editors, admins, and super
          admins. browse the platform or ask CoreLabs for creator access.
        </p>
        {user ? (
          <p className="mt-6 text-sm text-white/50">
            {user.name} · {user.email} · {user.role}
          </p>
        ) : null}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/"
            className="inline-flex flex-1 items-center justify-center rounded-full bg-white px-6 py-3 text-sm text-black transition-colors hover:bg-neutral-200"
          >
            back to site
          </Link>
          <button
            type="button"
            onClick={logout}
            className="inline-flex flex-1 items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm text-white/80 transition-colors hover:border-white/40 hover:text-white"
          >
            sign out
          </button>
        </div>
      </div>
    </main>
  );
}
