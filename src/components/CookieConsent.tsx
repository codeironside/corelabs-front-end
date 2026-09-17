import { useState } from 'react';
import { Cookie, Settings2, X } from 'lucide-react';

type Consent = {
  version: 1;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
};

const STORAGE_KEY = 'corelabs-cookie-consent-v1';

function storedConsent(): Consent | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as Consent | null;
    return parsed?.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

function saveConsent(analytics: boolean, marketing: boolean): Consent {
  const value: Consent = { version: 1, analytics, marketing, decidedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  document.cookie = `corelabs_cookie_consent=${encodeURIComponent(JSON.stringify({ analytics, marketing }))}; path=/; max-age=31536000; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent('corelabs:cookie-consent', { detail: value }));
  return value;
}

export function CookieConsent(): React.JSX.Element {
  const [consent, setConsent] = useState<Consent | null>(() => storedConsent());
  const [open, setOpen] = useState(() => storedConsent() === null);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(consent?.analytics ?? false);
  const [marketing, setMarketing] = useState(consent?.marketing ?? false);

  function decide(nextAnalytics: boolean, nextMarketing: boolean): void {
    setConsent(saveConsent(nextAnalytics, nextMarketing));
    setOpen(false);
    setCustomizing(false);
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="fixed bottom-3 left-3 z-[90] rounded-full border border-black/10 bg-white/90 p-2 text-black/45 shadow-sm backdrop-blur hover:text-black" aria-label="Cookie settings">
        <Cookie size={15} />
      </button>
    );
  }

  return (
    <aside className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl rounded-2xl border border-white/15 bg-neutral-950 p-5 text-white shadow-2xl" role="dialog" aria-label="Cookie preferences">
      <div className="flex items-start gap-3">
        <Cookie className="mt-0.5 shrink-0 text-white/60" size={20} />
        <div className="flex-1">
          <h2 className="text-sm font-semibold">Your cookie choices</h2>
          <p className="mt-1 text-xs leading-relaxed text-white/55">We use essential storage to keep CoreLabs secure and remember your settings. With permission, optional analytics and marketing cookies help us improve the experience.</p>
        </div>
        {consent ? <button type="button" onClick={() => setOpen(false)} className="text-white/45 hover:text-white" aria-label="Close cookie settings"><X size={18} /></button> : null}
      </div>

      {customizing ? (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between rounded-xl border border-white/10 p-3"><div><p className="text-sm font-medium">Essential</p><p className="text-xs text-white/40">Authentication, security, and saved preferences.</p></div><span className="text-xs text-white/40">Always on</span></div>
          {[{ label: 'Analytics', body: 'Understand product usage and reliability.', value: analytics, set: setAnalytics }, { label: 'Marketing', body: 'Measure campaigns and personalize outreach.', value: marketing, set: setMarketing }].map((item) => (
            <label key={item.label} className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 p-3">
              <div><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-white/40">{item.body}</p></div>
              <input type="checkbox" checked={item.value} onChange={(event) => item.set(event.target.checked)} className="h-4 w-4 accent-white" />
            </label>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {!customizing ? <button type="button" onClick={() => setCustomizing(true)} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-xs"><Settings2 size={14} /> Customize</button> : null}
        <button type="button" onClick={() => decide(false, false)} className="rounded-full border border-white/15 px-4 py-2 text-xs">Essential only</button>
        {customizing ? <button type="button" onClick={() => decide(analytics, marketing)} className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black">Save choices</button> : <button type="button" onClick={() => decide(true, true)} className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black">Accept all</button>}
      </div>
    </aside>
  );
}
