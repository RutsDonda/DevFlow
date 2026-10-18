import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { HiArrowUp, HiOutlinePlus } from 'react-icons/hi2';
import FileChip from './FileChip';

export const DOC_ACCEPT = '.pdf,.docx,.txt,.md,.csv,.json,.html,.xml,.yaml,.yml,.py,.js,.jsx,.ts,.tsx,.java,.c,.cpp,.cs,.go,.rs,.rb,.php,.sql';

/**
 * ChatGPT-style pill composer: attached-file cards, auto-growing textarea, + (attach) and send / stop.
 * `attachments` = [{ key, name, size, status, error }]
 */
const Composer = forwardRef(({
  onSend, onStop, onAttach, onRemoveAttachment, attachments = [], isRunning, placeholder,
}, ref) => {
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);
  const fileRef = useRef(null);

  useImperativeHandle(ref, () => ({
    setText: (text) => {
      setValue(text);
      requestAnimationFrame(() => textareaRef.current?.focus());
    },
    focus: () => textareaRef.current?.focus(),
  }));

  // Auto-grow up to ~10 lines
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [value]);

  const uploading = attachments.some((a) => a.status === 'uploading');
  const ready = attachments.filter((a) => a.status === 'ready').length;
  const canSend = !isRunning && !uploading && (value.trim() || ready > 0);

  const submit = () => {
    if (!canSend) return;
    onSend(value.trim());
    setValue('');
  };

  return (
    <div className="rounded-[28px] bg-field px-3 py-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_8px_24px_rgba(0,0,0,0.25)]">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1 pt-1.5 pb-2.5">
          {attachments.map((a) => (
            <FileChip key={a.key} name={a.name} size={a.size} status={a.status} error={a.error} onRemove={() => onRemoveAttachment(a.key)} />
          ))}
        </div>
      )}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        onPaste={(e) => {
          if (e.clipboardData?.files?.length) {
            e.preventDefault();
            onAttach(e.clipboardData.files);
          }
        }}
        placeholder={attachments.length ? 'Ask about the attached files, or just press Enter' : placeholder}
        rows={1}
        autoFocus
        className="block max-h-60 w-full resize-none bg-transparent px-2 pt-1.5 pb-2 text-[15px] leading-6 text-ink placeholder-faint focus:outline-none"
      />
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          title="Attach files (PDF, Word, text, code)"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink hover:bg-white/[0.08]"
        >
          <HiOutlinePlus className="w-5 h-5" />
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={DOC_ACCEPT}
          className="hidden"
          onChange={(e) => { onAttach(e.target.files); e.target.value = ''; }}
        />
        {isRunning ? (
          <button type="button" onClick={onStop} aria-label="Stop" className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-2 hover:brightness-110">
            <span className="h-3 w-3 rounded-[3px] bg-white" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            aria-label="Send"
            title={uploading ? 'Waiting for uploads to finish…' : undefined}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-2 text-white shadow-md shadow-accent/30 hover:brightness-110 disabled:from-white/10 disabled:to-white/10 disabled:text-white/40 disabled:shadow-none transition-[filter]"
          >
            <HiArrowUp className="w-5 h-5" strokeWidth={1} />
          </button>
        )}
      </div>
    </div>
  );
});

export default Composer;
