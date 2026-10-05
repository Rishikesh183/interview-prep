import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const components: Components = {
  h2: ({ children }) => (
    <h2 className="mt-8 mb-3 border-b pb-1 text-lg font-semibold first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => <h3 className="mt-5 mb-2 font-semibold">{children}</h3>,
  p: ({ children }) => <p className="my-3 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="my-3 list-disc space-y-1.5 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 list-decimal space-y-1.5 pl-5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ href, children }) => {
    const external = href?.startsWith("http");
    return (
      <a
        href={href}
        className="text-primary underline underline-offset-2"
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        {children}
      </a>
    );
  },
  code: ({ children }) => (
    <code className="bg-muted rounded px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border px-2 py-1 text-left font-medium">{children}</th>,
  td: ({ children }) => <td className="border px-2 py-1">{children}</td>,
};

/** Renders trusted repo markdown (concept cards, solution write-ups). No raw HTML. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("text-sm", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
