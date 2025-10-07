import { useMemo, useState } from 'react';
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

  const usingFallback = useMemo(() => (value?.length ?? 0) === 0 && (fallbackDisplay?.length ?? 0) > 0, [value?.length, fallbackDisplay?.length]);
  const displayTags = useMemo(() => {
    if (usingFallback) return fallbackDisplay as string[];
    return Array.isArray(value) ? value : [];
  }, [usingFallback, fallbackDisplay, value]);

  const inputSizeClass = size === 'sm' ? 'input-sm' : '';
  const buttonSizeClass = size === 'sm' ? 'h-8 px-3' : '';

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
  };

  return (
    <div className={className}>
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          placeholder={placeholder}
          disabled={disabled}
          className={`flex-1 ${inputSizeClass}`}
        />
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
