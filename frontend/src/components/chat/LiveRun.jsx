import React from 'react';
import Markdown from './Markdown';
import { TOOL_LABELS, agentMeta } from '../../config/agents';

const TAG = '<followups>';

/** Drop the trailing follow-up block (shown as buttons once the answer is done), even while its tag is half-streamed. */
const hideFollowups = (text) => {
  const at = text.toLowerCase().indexOf(TAG);
  if (at >= 0) return text.slice(0, at).trimEnd();
  for (let n = Math.min(TAG.length - 1, text.length); n > 0; n -= 1) {
    if (text.slice(-n).toLowerCase() === TAG.slice(0, n)) return text.slice(0, -n).trimEnd();
  }
  return text;
};

/**
 * The in-progress answer: which agent is working, what it is doing, and streamed text.
 * `run` = { agent: string|null, tools: string[], text: string, textAgent: string|null }
 */
const LiveRun = ({ run }) => {
  const meta = agentMeta(run.textAgent || run.agent);
  const text = hideFollowups(run.text);
  const lastTool = run.tools[run.tools.length - 1];
  const status = lastTool
    ? `${TOOL_LABELS[lastTool] || lastTool}…`
    : run.agent ? 'Thinking…' : 'Choosing the right agent…';

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-[13px]">
        <meta.icon className={`w-4 h-4 ${meta.text}`} />
        <span className="text-mute">{meta.name}</span>
      </div>
      {text ? (
        <div className="text-[15px] text-ink">
          <Markdown>{text}</Markdown>
          <span className="ml-0.5 inline-block h-3 w-3 translate-y-0.5 rounded-full bg-ink animate-pulse" />
        </div>
      ) : (
        <p className="shimmer text-[15px]">{status}</p>
      )}
    </div>
  );
};

export default LiveRun;
