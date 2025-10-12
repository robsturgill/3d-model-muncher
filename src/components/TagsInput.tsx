import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useGlobalTags } from './TagsContext';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Plus, X } from 'lucide-react';

export type TagsInputSize = 'sm' | 'md';

interface TagsInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
  size?: TagsInputSize;
  disabled?: boolean;
  // Optional list of suggestion chips the user can click to add
  suggested?: string[];
  // Optional fallback tags to display when value is empty (read from source like server/original)
  // When the user removes or adds while showing fallback, we promote into value via onChange.
  fallbackDisplay?: string[];
  // Case-insensitive de-duplication by default
  caseSensitive?: boolean;
}

// Normalize and dedupe helper
function addTagToList(list: string[], tag: string, caseSensitive = false): string[] {
  const t = tag.trim();
  if (!t) return list;
  if (caseSensitive) {
    if (list.includes(t)) return list;
    return [...list, t];
  }
  const lower = t.toLowerCase();
  if (list.some(x => x.toLowerCase() === lower)) return list;
  return [...list, t];
}

function removeTagFromList(list: string[], tag: string, caseSensitive = false): string[] {
  if (caseSensitive) return list.filter(x => x !== tag);
  const lower = tag.toLowerCase();
  return list.filter(x => x.toLowerCase() !== lower);
}

export default function TagsInput({
  value,
  onChange,
  placeholder = 'Add a tag...',
  className,
  size = 'md',
  disabled = false,
  suggested,
  fallbackDisplay,
  caseSensitive = false,
}: TagsInputProps) {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listboxId = useId();
  const globalTags = useGlobalTags();

  const usingFallback = useMemo(() => (value?.length ?? 0) === 0 && (fallbackDisplay?.length ?? 0) > 0, [value?.length, fallbackDisplay?.length]);
  const displayTags = useMemo(() => {
    if (usingFallback) return fallbackDisplay as string[];
    return Array.isArray(value) ? value : [];
  }, [usingFallback, fallbackDisplay, value]);

  const baseList = useMemo(() => (usingFallback ? (fallbackDisplay || []) : (value || [])), [usingFallback, fallbackDisplay, value]);

  const inputSizeClass = size === 'sm' ? 'input-sm' : '';
  const buttonSizeClass = size === 'sm' ? 'h-8 px-3' : '';

  // Filter suggestions based on current input, excluding tags already present in baseList
  const filteredSuggestions = useMemo(() => {
    const source = Array.isArray(suggested) && suggested.length > 0 ? suggested : globalTags;
    if (!Array.isArray(source) || source.length === 0) return [] as string[];
    const q = text.trim();

    const inList = (tag: string) =>
      caseSensitive
        ? baseList.includes(tag)
        : baseList.some((x) => x.toLowerCase() === tag.toLowerCase());

    const list = source.filter((t) => !inList(t));

    if (!q) {
      // No query: show top N suggestions alphabetically
      return list.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })).slice(0, 8);
    }

    const match = (tag: string) =>
      caseSensitive
        ? tag.includes(q)
        : tag.toLowerCase().includes(q.toLowerCase());

    const starts = (tag: string) =>
      caseSensitive
        ? tag.startsWith(q)
        : tag.toLowerCase().startsWith(q.toLowerCase());

    const results = list
      .filter((t) => match(t))
      .sort((a, b) => {
        const aStarts = starts(a) ? 0 : 1;
        const bStarts = starts(b) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return a.localeCompare(b);
      })
      .slice(0, 8);

    return results;
  }, [suggested, globalTags, baseList, text, caseSensitive]);

  // Only open the suggestions dropdown when the input is focused AND
  // the user has typed at least one non-whitespace character.
  // This prevents the dropdown from appearing immediately on focus.
  const isOpen = useMemo(() => {
    const hasQuery = text.trim().length > 0;
    return isFocused && !disabled && hasQuery && filteredSuggestions.length > 0;
  }, [isFocused, disabled, filteredSuggestions.length, text]);

  const handleAdd = () => {
    if (disabled) return;
    const t = text.trim();
    if (!t) return;
    const base = usingFallback ? (fallbackDisplay || []) : (value || []);
    const next = addTagToList(base, t, caseSensitive);
    onChange(next);
    setText('');
  };

  const handleRemove = (tag: string) => {
    if (disabled) return;
    const base = usingFallback ? (fallbackDisplay || []) : (value || []);
    const next = removeTagFromList(base, tag, caseSensitive);
    onChange(next);
  };

  const handleAddSuggestion = (tag: string) => {
    if (disabled) return;
    const base = usingFallback ? (fallbackDisplay || []) : (value || []);
    const next = addTagToList(base, tag, caseSensitive);
    onChange(next);
    setText('');
    setHighlightIndex(-1);
    // restore focus so users can continue adding
    inputRef.current?.focus();
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (isOpen && highlightIndex >= 0 && highlightIndex < filteredSuggestions.length) {
        e.preventDefault();
        handleAddSuggestion(filteredSuggestions[highlightIndex]);
        return;
      }
      e.preventDefault();
      handleAdd();
      return;
    }

    if (e.key === 'ArrowDown') {
      if (filteredSuggestions.length > 0) {
        e.preventDefault();
        setIsFocused(true);
        setHighlightIndex((prev) => {
          const next = prev + 1;
          return next >= filteredSuggestions.length ? 0 : next;
        });
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      if (filteredSuggestions.length > 0) {
        e.preventDefault();
        setIsFocused(true);
        setHighlightIndex((prev) => {
          const next = prev - 1;
          return next < 0 ? filteredSuggestions.length - 1 : next;
        });
      }
      return;
    }

    if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        setHighlightIndex(-1);
      }
      return;
    }

    if (e.key === 'Tab') {
      if (isOpen && highlightIndex >= 0 && highlightIndex < filteredSuggestions.length) {
        e.preventDefault();
        handleAddSuggestion(filteredSuggestions[highlightIndex]);
      }
    }
  };

  // Reset highlight when suggestions change
  useEffect(() => {
    setHighlightIndex((idx) => (filteredSuggestions.length === 0 ? -1 : Math.min(idx, filteredSuggestions.length - 1)));
  }, [filteredSuggestions.length]);

  return (
    <div className={className}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onInputKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              // Delay closing to allow click selection via onMouseDown
              setTimeout(() => setIsFocused(false), 100);
            }}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full ${inputSizeClass}`}
            role="combobox"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            aria-controls={listboxId}
          />

          {isOpen && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
              <ul id={listboxId} role="listbox" className="py-1 text-sm">
                {filteredSuggestions.map((tag, i) => (
                  <li
                    key={tag}
                    role="option"
                    aria-selected={i === highlightIndex}
                    className={`px-3 py-2 cursor-pointer select-none hover:bg-accent hover:text-accent-foreground ${i === highlightIndex ? 'bg-accent text-accent-foreground' : ''}`}
                    onMouseEnter={() => setHighlightIndex(i)}
                    onMouseDown={(e) => {
                      // onMouseDown so it fires before input blur
                      e.preventDefault();
                      handleAddSuggestion(tag);
                    }}
                    title={`Add ${tag}`}
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <Button
          type="button"
          onClick={handleAdd}
          disabled={disabled || !text.trim()}
          size={size === 'sm' ? 'sm' : undefined}
          className={`gap-2 ${buttonSizeClass}`}
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {/* Current tags */}
      {displayTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {displayTags.map((tag, idx) => (
            <Badge
              key={`${tag}-${idx}`}
              variant="secondary"
              className="text-sm gap-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
              onClick={() => handleRemove(tag)}
              title="Click to remove"
            >
              {tag}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}

      {/* Suggested tags */}
      {Array.isArray(suggested) && suggested.length > 0 && (
        <div className="space-y-2 mt-3">
          <p className="text-sm text-muted-foreground">Suggested tags:</p>
          <div className="flex flex-wrap gap-2">
            {suggested.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-sm cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => handleAddSuggestion(tag)}
                title={`Add ${tag}`}
              >
                + {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
