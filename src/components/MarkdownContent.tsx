import ReactMarkdown from 'react-markdown';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div data-testid="markdown-content" className={className}>
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          h1: ({ children }) => <h1 className="text-xl font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-bold mb-1 mt-2 first:mt-0">{children}</h3>,
          ul: ({ children }) => <ul className="ml-4 mb-2 list-disc">{children}</ul>,
          ol: ({ children }) => <ol className="ml-4 mb-2 list-decimal">{children}</ol>,
          li: ({ children }) => <li className="mb-0.5">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => <code className="bg-muted px-1 rounded text-sm font-mono">{children}</code>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-muted-foreground/30 pl-3 italic text-muted-foreground mb-2">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
