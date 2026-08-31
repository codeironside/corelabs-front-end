import { AmbientVideo } from '@/components/AmbientVideo';
import { Reveal } from '@/components/Reveal';
import type { StudioVideoKey } from '@/data/media';

interface SectionProps {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  children?: React.ReactNode;
  backgroundVideo?: StudioVideoKey;
  kenBurns?: boolean;
}

function Section({
  id,
  eyebrow,
  title,
  body,
  children,
  backgroundVideo,
  kenBurns = true,
}: SectionProps): React.JSX.Element {
  return (
    <section id={id} className="relative scroll-mt-24 overflow-hidden border-t border-white/10">
      {backgroundVideo ? (
        <AmbientVideo videoKey={backgroundVideo} variant="background" kenBurns={kenBurns} />
      ) : null}
      <div className="relative z-10 px-6 py-24 md:px-10">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <p className="text-xs tracking-[0.2em] text-white/50 uppercase">{eyebrow}</p>
          </Reveal>
          <Reveal delayClassName="reveal-delay-1">
            <h2 className="mt-4 max-w-3xl text-3xl leading-tight font-medium tracking-tight md:text-5xl">
              {title}
            </h2>
          </Reveal>
          <Reveal delayClassName="reveal-delay-2">
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/70 md:text-lg">{body}</p>
          </Reveal>
          {children ? <div className="mt-12">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}

interface FeatureCardProps {
  title: string;
  body: string;
}

function FeatureCard({ title, body }: FeatureCardProps): React.JSX.Element {
  return (
    <div className="border-t border-white/15 pt-6 transition-transform duration-500 hover:-translate-y-1">
      <h3 className="text-lg font-medium tracking-tight">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-white/65">{body}</p>
    </div>
  );
}

/**
 * Video placement (each key once):
 * hero → hero
 * worlds bg → worlds
 * technology bg → technology | panels → craft, motion
 * platform bg → platform | panels → creators, character
 * creators bg → cinema | panel → tall
 * login → atmosphere
 * intro / ai / company / footer → no video (copy only)
 */
export function MarketingSections(): React.JSX.Element {
  return (
    <div className="bg-black text-white">
      <Section
        id="intro"
        eyebrow="hero"
        title="AI Video, Built to Remember Itself"
        body="CoreLabsStudio generates long-running, character-consistent video content — from short clips to full-length episodes — powered by AI, structured for storytelling."
      />

      <Section
        id="worlds"
        eyebrow="how it works"
        title="A Narrative System, Not Just a Generator"
        body="Most AI video tools generate isolated clips. CoreLabsStudio is built around a different idea: content that holds together over time — same characters, same world, same story — across as many videos as a creator wants to make."
        backgroundVideo="worlds"
      >
        <div className="grid gap-10 md:grid-cols-3">
          <Reveal delayClassName="reveal-delay-1">
            <FeatureCard
              title="Theme"
              body="The world a creator builds: its setting, tone, and characters. The reusable foundation everything else is built from."
            />
          </Reveal>
          <Reveal delayClassName="reveal-delay-2">
            <FeatureCard
              title="Character"
              body="Defined once, enforced everywhere. A character's identity stays consistent across every scene and module — even across other themes, if a creator chooses to reuse them."
            />
          </Reveal>
          <Reveal delayClassName="reveal-delay-3">
            <FeatureCard
              title="Module"
              body="A full run of content within a theme — a season, an arc, a series. Each module draws on a theme's world and characters to tell its own story."
            />
          </Reveal>
        </div>
      </Section>

      <Section
        id="technology"
        eyebrow="the technology"
        title="Long-Form Video, Generated Scene by Scene"
        body="AI video models generate in short clips — a technical ceiling every creator in this space works within. CoreLabsStudio is built around that constraint: each video is broken into scene-length beats, generated individually with locked character consistency, and assembled into a finished piece that can run past typical short-form limits — up to 90 minutes or more."
        backgroundVideo="technology"
      >
        <Reveal>
          <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr] md:items-stretch">
            <AmbientVideo
              videoKey="craft"
              className="aspect-[9/16] max-h-[520px] w-full justify-self-center md:justify-self-start"
              kenBurns
            />
            <AmbientVideo
              videoKey="motion"
              className="aspect-[16/9] w-full md:aspect-auto md:min-h-[320px]"
              kenBurns
            />
          </div>
        </Reveal>
      </Section>

      <Section
        id="platform"
        eyebrow="platform"
        title="What You're Working With"
        body="CoreLabsStudio is the tooling layer beneath every video — the system a creator uses to build a world, keep it consistent, and turn it into finished, publishable content."
        backgroundVideo="platform"
      >
        <Reveal>
          <div className="mb-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
            <AmbientVideo
              videoKey="creators"
              className="aspect-[16/9] w-full lg:aspect-auto lg:min-h-[320px]"
              kenBurns
            />
            <AmbientVideo
              videoKey="character"
              className="aspect-[9/16] max-h-[480px] w-full justify-self-center lg:max-h-none lg:justify-self-stretch"
              kenBurns
            />
          </div>
        </Reveal>
        <div className="grid gap-10 md:grid-cols-2">
          <Reveal delayClassName="reveal-delay-1">
            <FeatureCard
              title="World Builder"
              body="Set up a theme: its setting, tone, and the characters within it. This is the foundation every module and video draws from."
            />
          </Reveal>
          <Reveal delayClassName="reveal-delay-2">
            <FeatureCard
              title="Character Lock"
              body="Define a character once. Its identity — appearance, personality, role — stays fixed across every scene it appears in, enforced automatically rather than re-prompted each time."
            />
          </Reveal>
          <Reveal delayClassName="reveal-delay-1">
            <FeatureCard
              title="Scene Generator"
              body="Scripts are broken into scene-length beats and generated individually, each pulling from the locked theme and character data to stay consistent with everything around it."
            />
          </Reveal>
          <Reveal delayClassName="reveal-delay-2">
            <FeatureCard
              title="Assembly"
              body="Generated scenes are sequenced into a finished video — short-form or long-form, up to 90 minutes or more — with support for creator-supplied voiceover audio layered in during production."
            />
          </Reveal>
          <Reveal delayClassName="reveal-delay-1">
            <FeatureCard
              title="Publishing"
              body="Finished videos go out directly to YouTube, TikTok, and Instagram from the platform."
            />
          </Reveal>
          <Reveal delayClassName="reveal-delay-2">
            <FeatureCard
              title="Module Management"
              body="Organize output into modules — ongoing runs of content within a theme, each with its own storyline, drawing on the same world and characters."
            />
          </Reveal>
        </div>
      </Section>

      <Section
        id="creators"
        eyebrow="for creators"
        title="Your World. Your Rules."
        body="CoreLabsStudio doesn't tell creators what to make. There's no fixed genre, format, or niche — creators define their own themes, build their own characters, and decide their own stories. The platform's job is consistency: making sure every character, every world, holds together, video after video. Creators can keep their themes and characters exclusive, or share them across modules and collaborators — the choice is theirs."
        backgroundVideo="cinema"
      >
        <Reveal>
          <AmbientVideo videoKey="tall" className="mx-auto aspect-[9/16] max-h-[640px] w-full max-w-md" kenBurns />
        </Reveal>
      </Section>

      <Section
        id="ai"
        eyebrow="our approach to ai"
        title="Built on the Best Available Models"
        body="CoreLabsStudio doesn't build its own AI models — we build the tooling on top of them. Every video is generated using leading models from providers including Anthropic, OpenAI, Google, and xAI, chosen per task rather than locked to one provider. Our work is the layer that turns raw generation into consistent, ongoing content: the scene planning, character-locking, and continuity systems that make long-form AI storytelling possible."
      />

      <Section
        id="company"
        eyebrow="company"
        title="A CoreLabs Company"
        body="CoreLabsStudio is built and operated by CoreLabs, an AI-native venture studio. CoreLabs builds each of its companies in-house — CoreLabsStudio is one of a small portfolio of ventures, each applying AI to its own industry."
      >
        <Reveal>
          <FeatureCard
            title="Stage"
            body="CoreLabsStudio is in active development. The platform currently operates in-house, with content produced by a small team of creators, ahead of opening to outside creators."
          />
        </Reveal>
      </Section>

      <footer className="border-t border-white/10 px-6 py-12 md:px-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-white/70">CoreLabsStudio — A CoreLabs Company</p>
          <a href="#platform" className="text-sm text-white/50 transition-colors hover:text-white">
            back to platform
          </a>
        </div>
      </footer>
    </div>
  );
}
