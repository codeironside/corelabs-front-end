import { Link } from 'react-router-dom';
import { canAccessStudioWorkspace } from '@/config/roles';
import { STUDIO_VIDEOS } from '@/data/media';
import { useAuthStore } from '@/store/authStore';

const NAV_LINKS = [
  { href: '#platform', label: 'platform' },
  { href: '#worlds', label: 'worlds' },
  { href: '#company', label: 'company' },
  { href: '#creators', label: 'creators' },
] as const;

function BrandMark(): React.JSX.Element {
  return (
    <svg viewBox="0 0 256 256" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#ffffff"
        d="M 128 192 L 128 256 L 64.5 256 L 32 223 L 0 192 L 0 128 L 64 128 Z M 256 192 L 256 256 L 192.5 256 L 160 223 L 128 192 L 128 128 L 192 128 Z M 128 64 L 128 128 L 64.5 128 L 32 95 L 0 64 L 0 0 L 64 0 Z M 256 64 L 256 128 L 192.5 128 L 160 95 L 128 64 L 128 0 L 192 0 Z"
      />
    </svg>
  );
}

function HeaderCta(): React.JSX.Element {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const ctaClassName =
    'rounded-full bg-white px-6 py-3 text-sm font-normal text-black transition-colors hover:bg-neutral-200';

  if (!accessToken) {
    return (
      <Link to="/login" className={ctaClassName}>
        start creating
      </Link>
    );
  }

  const workspaceUser = user && canAccessStudioWorkspace(user.role);
  return (
    <Link to={workspaceUser ? '/app' : '/account'} className={ctaClassName}>
      {workspaceUser ? 'open studio' : 'my account'}
    </Link>
  );
}

export function HeroSection(): React.JSX.Element {
  return (
    <section className="relative h-screen w-full overflow-hidden bg-black">
      <video
        className="absolute inset-0 h-full w-full object-cover video-ken-burns"
        autoPlay
        loop
        muted
        playsInline
        src={STUDIO_VIDEOS.hero}
      />

      <nav className="animate-nav absolute top-0 right-0 left-0 z-20 flex items-center justify-between gap-4 px-6 pt-6 md:px-10">
        <div className="flex items-center gap-2 rounded-full bg-neutral-900/90 py-3 pr-6 pl-4 backdrop-blur">
          <BrandMark />
          <span className="text-sm font-normal tracking-tight text-white">corelabsstudio</span>
        </div>

        <div className="hidden items-center gap-1 rounded-full bg-neutral-900/90 px-3 py-2 backdrop-blur md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-5 py-2 text-sm text-neutral-300 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
          <Link
            to="/stories"
            className="rounded-full px-5 py-2 text-sm text-neutral-300 transition-colors hover:text-white"
          >
            stories
          </Link>
        </div>

        <HeaderCta />
      </nav>

      <div className="relative h-full w-full">
        <h1 className="hero-title animate-hero-word animate-hero-word-delay-1 absolute top-[18%] left-4 text-[14vw] font-medium text-white md:left-10 md:text-[13vw]">
          generate
        </h1>
        <h1 className="hero-title animate-hero-word animate-hero-word-delay-2 absolute top-[38%] right-4 text-[14vw] font-medium text-white md:right-10 md:text-[13vw]">
          your
        </h1>
        <h1 className="hero-title animate-hero-word animate-hero-word-delay-3 absolute top-[58%] left-[18%] text-[14vw] font-medium text-white md:left-[28%] md:text-[13vw]">
          story
        </h1>

        <p className="animate-fade-in absolute top-[46%] left-6 max-w-[240px] text-[15px] leading-snug text-white/90 md:left-10" style={{ animationDelay: '0.55s' }}>
          ai-generated video structured to remember its own characters, worlds, and stories, scene after scene
        </p>

        <div className="animate-fade-in absolute top-[14%] right-6 md:right-24" style={{ animationDelay: '0.7s' }}>
          <div className="animate-soft-float">
            <div className="flex items-center justify-end gap-3">
              <div className="hidden h-px w-24 rotate-[20deg] bg-white/40 md:block" />
              <span className="text-4xl font-medium tracking-tight md:text-5xl">90+</span>
            </div>
            <p className="mt-1 text-right text-xs text-white/70 md:text-sm">minutes per story</p>
          </div>
        </div>

        <div className="animate-fade-in absolute bottom-20 left-6 md:bottom-24 md:left-20" style={{ animationDelay: '0.85s' }}>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-medium tracking-tight md:text-5xl">10s</span>
            <div className="hidden h-px w-24 rotate-[-20deg] bg-white/40 md:block" />
          </div>
          <p className="mt-1 text-xs text-white/70 md:text-sm">scene building blocks</p>
        </div>

        <div className="animate-fade-in absolute right-6 bottom-16 md:right-20 md:bottom-20" style={{ animationDelay: '1s' }}>
          <div className="flex items-center justify-end gap-3">
            <div className="hidden h-px w-24 rotate-[-20deg] bg-white/40 md:block" />
            <span className="text-4xl font-medium tracking-tight md:text-5xl">3</span>
          </div>
          <p className="mt-1 text-right text-xs text-white/70 md:text-sm">platforms published to</p>
        </div>

        <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-48 bg-gradient-to-b from-transparent to-black" />
      </div>
    </section>
  );
}
