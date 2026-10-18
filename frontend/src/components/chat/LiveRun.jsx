import React from 'react';
import Markdown from './Markdown';
import { TOOL_LABELS, agentMeta } from '../../config/agents';

/**
 * The in-progress answer: which agent is working, what it is doing, and streamed text.
 * `run` = { agent: string|null, tools: string[], text: string, textAgent: string|null }
 */
const LiveRun = ({ run }) => {
  const meta = agentMeta(run.textAgent || run.agent);
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
      {run.text ? (
        <div className="text-[15px] text-ink">
          <Markdown>{run.text}</Markdown>
          <span className="ml-0.5 inline-block h-3 w-3 translate-y-0.5 rounded-full bg-ink animate-pulse" />
        </div>
      ) : (
        <p className="shimmer text-[15px]">{status}</p>
      )}
    </div>
  );
};

export default LiveRun;
