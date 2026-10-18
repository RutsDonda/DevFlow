import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { HiOutlineCheck, HiOutlineClipboard } from 'react-icons/hi2';

const textOf = (node) => {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(textOf).join('');
  return node?.props?.children ? textOf(node.props.children) : '';
};

/** Fenced code block with a language label and a copy button. */
const CodeBlock = ({ children, ...props }) => {
  const [copied, setCopied] = useState(false);
  const code = React.Children.toArray(children)[0];
  const language = /language-(\w+)/.exec(code?.props?.className || '')?.[1] || 'code';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(textOf(code).replace(/\n$/, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <div className="not-prose my-4 overflow-hidden rounded-xl border border-white/10 bg-[#0d1117]">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs text-gray-400">
        <span className="font-mono">{language}</span>
        <button onClick={copy} className="inline-flex items-center gap-1 hover:text-white transition-colors">
          {copied ? <HiOutlineCheck className="w-3.5 h-3.5 text-emerald-400" /> : <HiOutlineClipboard className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre {...props} className="overflow-x-auto p-4 text-[13px] leading-relaxed">{children}</pre>
    </div>
  );
};

const components = {
  pre: CodeBlock,
  a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
  table: ({ node, ...props }) => (
    <div className="overflow-x-auto"><table {...props} /></div>
  ),
};

const Markdown = ({ children }) => (
  <div className="markdown">
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]} components={components}>
      {children}
    </ReactMarkdown>
  </div>
);

export default Markdown;
