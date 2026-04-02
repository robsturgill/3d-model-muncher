import { useState } from 'react';
import { Textarea } from './ui/textarea';
import { MarkdownContent } from './MarkdownContent';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
}

export function MarkdownEditor({ value, onChange, rows = 3, placeholder, className }: MarkdownEditorProps) {
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');

  const minHeight = `${rows * 1.75 + 1}rem`;

  return (
    <div className={className}>
      <div className="flex gap-1 mb-1.5">
        <button
          type="button"
          data-testid="markdown-editor-edit-tab"
          onClick={() => setTab('edit')}
          className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
            tab === 'edit'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          Edit
        </button>
        <button
          type="button"
          data-testid="markdown-editor-preview-tab"
          onClick={() => setTab('preview')}
          className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
            tab === 'preview'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          Preview
        </button>
      </div>

      {tab === 'edit' ? (
        <Textarea
          data-testid="markdown-editor-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
        />
      ) : (
        <div
          data-testid="markdown-editor-preview"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm overflow-auto"
          style={{ minHeight }}
        >
          {value.trim() ? (
            <MarkdownContent content={value} />
          ) : (
            <span data-testid="markdown-editor-empty" className="text-muted-foreground italic">Nothing to preview</span>
          )}
        </div>
      )}
    </div>
  );
}
