import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isUserMessage?: boolean;
}

export function MarkdownRenderer({ content, className = '', isUserMessage = false }: MarkdownRendererProps) {
  return (
    <div className={`markdown-body overflow-x-auto ${className} ${isUserMessage ? 'text-white' : 'text-dark'}`}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          // Table Styling
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-xl border border-border shadow-sm bg-white">
              <table className="w-full text-left text-sm border-collapse min-w-[400px]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50/80 border-b border-border">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 font-bold text-dark text-[11px] uppercase tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 border-b border-gray-50 text-gray-700 leading-relaxed">
              {children}
            </td>
          ),
          // Heading Styling
          h1: ({ children }) => <h1 className="text-xl font-bold mt-6 mb-3 text-dark border-b border-gray-100 pb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mt-5 mb-2 text-dark">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-bold mt-4 mb-2 text-dark">{children}</h3>,
          // List Styling
          ul: ({ children }) => <ul className="list-disc list-inside my-3 space-y-1 text-[13px]">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside my-3 space-y-1 text-[13px]">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          // Text Styling
          p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-[13px]">{children}</p>,
          strong: ({ children }) => <strong className="font-bold text-dark">{children}</strong>,
          hr: () => <hr className="my-6 border-gray-100" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
