import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type SceneMarkdownView = 'edit' | 'preview';

export function SceneMarkdownEditor({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const [view, setView] = useState<SceneMarkdownView>('edit');

  return (
    <div className="block">
      <div className="mb-1 flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted">{label}</p>
        <div className="flex rounded-lg border border-border p-1">
          {(['edit', 'preview'] as SceneMarkdownView[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setView(item)}
              className={`rounded-md px-2.5 py-1 text-[10px] font-semibold capitalize ${view === item ? 'bg-[var(--color-tea-green)]/45 text-[var(--color-ash-brown)]' : 'text-muted'}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      {view === 'edit' ? (
        <textarea
          className="input-field min-h-[120px] text-sm"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <div className="markdown-preview min-h-[120px] rounded-xl border border-border bg-white p-3 text-sm text-dark">
          {value.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <p className="text-muted">{placeholder || 'Markdown preview appears here.'}</p>
          )}
        </div>
      )}
    </div>
  );
}
