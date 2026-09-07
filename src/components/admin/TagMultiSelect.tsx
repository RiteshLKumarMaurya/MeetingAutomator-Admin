'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// ============================================================
// TagMultiSelect
// ------------------------------------------------------------
// A reusable, generic "tags input" / multi-select control.
//
// Behaviour contract (matches React-Select / Tags-Input UX):
//  - `options`  = full master list (e.g. all Technologies, all Links)
//  - `selected` = the currently chosen items, IN DISPLAY ORDER
//  - Anything already in `selected` is automatically hidden from the
//    search dropdown — no manual filtering needed by the caller.
//  - Clicking a dropdown item adds it to `selected` and it disappears
//    from the dropdown immediately (pure derived state, no extra hooks).
//  - Clicking the X on a chip removes it from `selected` and it
//    reappears in the dropdown immediately.
//  - Re-adding a previously removed item works with zero special-casing
//    because membership is derived from `selected` on every render.
//  - Reordering (↑ / ↓) changes array order, which the caller can map
//    straight to `displayOrder` (index in the array == displayOrder).
//
// The component is intentionally "dumb": it never calls an API and
// never mutates anything itself — every change goes back to the
// parent via `onChange(nextSelected)`, so the parent's state is always
// the single source of truth and `handleSave` can serialize it as-is.
// ============================================================

export interface TagOption {
  id: number;
  label: string;
  sublabel?: string;
}

interface TagMultiSelectProps {
  options: TagOption[];
  selected: TagOption[];
  onChange: (next: TagOption[]) => void;
  icon?: React.ReactNode;
  searchPlaceholder?: string;
  emptyOptionsLabel?: string;
  emptySelectedLabel?: string;
  reorderable?: boolean;
  disabled?: boolean;
}

export default function TagMultiSelect({
  options,
  selected,
  onChange,
  icon,
  searchPlaceholder = 'Search...',
  emptyOptionsLabel = 'No matches.',
  emptySelectedLabel = 'Nothing selected yet.',
  reorderable = true,
  disabled = false,
}: TagMultiSelectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click.
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.id)), [selected]);

  // Dropdown always derives from (options - selected) + search text.
  // This is what guarantees "already selected items never appear in
  // the dropdown" and "removed items reappear immediately" for free.
  const availableOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((o) => {
      if (selectedIds.has(o.id)) return false;
      if (!q) return true;
      return (
        o.label.toLowerCase().includes(q) ||
        (o.sublabel ?? '').toLowerCase().includes(q)
      );
    });
  }, [options, selectedIds, query]);

  const addItem = (opt: TagOption) => {
    if (disabled || selectedIds.has(opt.id)) return; // defensive de-dupe
    onChange([...selected, opt]);
    setQuery('');
  };

  const removeItem = (id: number) => {
    if (disabled) return;
    onChange(selected.filter((s) => s.id !== id));
  };

  const move = (index: number, direction: 'up' | 'down') => {
    if (disabled) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === selected.length - 1) return;
    const next = [...selected];
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    onChange(next);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          disabled={disabled}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder={searchPlaceholder}
          className="input-base pl-8 py-2 text-sm disabled:opacity-50"
        />
      </div>

      <AnimatePresence>
        {open && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border bg-white dark:bg-zinc-900 shadow-lg"
          >
            {availableOptions.length === 0 ? (
              <p className="px-3 py-2 text-xs text-zinc-400 italic">{emptyOptionsLabel}</p>
            ) : (
              availableOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => addItem(opt)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-brand-50 dark:hover:bg-zinc-800 flex flex-col"
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.sublabel && (
                    <span className="text-xs text-zinc-400 truncate">{opt.sublabel}</span>
                  )}
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-2">
        {selected.length === 0 ? (
          <p className="text-xs italic text-zinc-400">{emptySelectedLabel}</p>
        ) : (
          <div className="space-y-1 border rounded-lg p-2 bg-zinc-50 dark:bg-zinc-800/40">
            <AnimatePresence initial={false}>
              {selected.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2 p-2 bg-white dark:bg-zinc-900 rounded shadow-sm overflow-hidden"
                >
                  {icon && <span className="text-zinc-400 shrink-0">{icon}</span>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{item.label}</p>
                    {item.sublabel && (
                      <p className="text-xs text-zinc-400 truncate">{item.sublabel}</p>
                    )}
                  </div>
                  {reorderable && (
                    <div className="flex flex-col -space-y-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => move(idx, 'up')}
                        disabled={disabled || idx === 0}
                        className="disabled:opacity-30 hover:text-brand-500"
                        aria-label="Move up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(idx, 'down')}
                        disabled={disabled || idx === selected.length - 1}
                        className="disabled:opacity-30 hover:text-brand-500"
                        aria-label="Move down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={disabled}
                    className="p-1 rounded-full hover:bg-red-50 text-red-500 shrink-0"
                    aria-label={`Remove ${item.label}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}