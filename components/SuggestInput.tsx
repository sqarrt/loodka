'use client';

import { useEffect, useRef, useState } from 'react';
import type { Suggestion } from '@/app/actions/search-suggestions';

export function SuggestInput({
  name,
  defaultValue,
  fetchSuggestions,
  hintSuffix,
  inputClassName,
}: {
  name: string;
  defaultValue?: string;
  fetchSuggestions: (query: string) => Promise<Suggestion[]>;
  hintSuffix?: string;
  inputClassName: string;
}) {
  const [value, setValue] = useState(defaultValue ?? '');
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [open, setOpen] = useState(false);
  const requestId = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!value.trim()) return;
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      const result = await fetchSuggestions(value);
      if (requestId.current === id) setSuggestions(result);
    }, 250);
    return () => clearTimeout(timer);
  }, [value, fetchSuggestions]);

  const trimmed = value.trim();

  const pick = (suggestion: Suggestion) => {
    setValue(suggestion.value);
    setOpen(false);
    inputRef.current?.form?.requestSubmit();
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        autoComplete="off"
        className={inputClassName}
      />
      {open && trimmed && suggestions !== null && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-[200px] overflow-y-auto rounded-md border border-line-strong bg-surface-card shadow-2xl">
          {suggestions.length > 0 ? (
            suggestions.map((s) => (
              <div
                key={s.value}
                onMouseDown={() => pick(s)}
                className="flex items-center justify-between px-3 py-2.5 text-body hover:bg-surface-raised"
              >
                <span className="truncate">{s.value}</span>
                {s.hint !== undefined && (
                  <span className="font-mono text-caps text-text-dim">
                    {s.hint}
                    {hintSuffix}
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="px-3 py-2.5 text-body text-text-dim">Ничего не найдено</div>
          )}
        </div>
      )}
    </div>
  );
}
