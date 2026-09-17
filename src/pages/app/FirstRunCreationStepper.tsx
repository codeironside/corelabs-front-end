import { Check, ChevronRight, X } from 'lucide-react';

export type FirstRunStep = 'world' | 'characters' | 'scenes' | 'assembly' | 'publish';

const STEPS: Array<{ id: FirstRunStep; label: string; helper: string }> = [
  { id: 'world', label: 'World', helper: 'Set theme, place and visual tone' },
  { id: 'characters', label: 'Characters', helper: 'Lock appearance, personality and role' },
  { id: 'scenes', label: 'Scenes', helper: 'Create a 10–20 second opening' },
  { id: 'assembly', label: 'Assembly', helper: 'Review and arrange approved takes' },
  { id: 'publish', label: 'Share', helper: 'Create a preview or download a cut' },
];

export function FirstRunCreationStepper({
  step,
  onStep,
  onDismiss,
}: {
  step: FirstRunStep;
  onStep: (step: FirstRunStep) => void;
  onDismiss: () => void;
}): React.JSX.Element {
  const activeIndex = Math.max(0, STEPS.findIndex((item) => item.id === step));
  const active = STEPS[activeIndex];
  const next = STEPS[activeIndex + 1];

  return (
    <section className="studio-glass rounded-xl border border-white/15 p-4 md:p-5" aria-label="First project guide">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Your first story</p>
          <h2 className="mt-1 text-lg font-semibold">{active.label}</h2>
          <p className="mt-1 text-sm text-white/55">{active.helper}</p>
        </div>
        <button type="button" onClick={onDismiss} className="rounded-full p-2 text-white/45 hover:bg-white/10 hover:text-white" aria-label="Dismiss first project guide">
          <X size={16} />
        </button>
      </div>
      <ol className="mt-4 grid gap-2 sm:grid-cols-5">
        {STEPS.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onStep(item.id)}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition ${
                index === activeIndex
                  ? 'border-white bg-white text-black'
                  : index < activeIndex
                    ? 'border-white/15 bg-white/10 text-white'
                    : 'border-white/10 text-white/45 hover:border-white/25 hover:text-white'
              }`}
            >
              {index < activeIndex ? <Check size={13} /> : <span className="w-[13px] text-center">{index + 1}</span>}
              <span className="font-semibold">{item.label}</span>
            </button>
          </li>
        ))}
      </ol>
      {next ? (
        <div className="mt-4 flex justify-end">
          <button type="button" onClick={() => onStep(next.id)} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black">
            Continue to {next.label} <ChevronRight size={14} />
          </button>
        </div>
      ) : null}
    </section>
  );
}
