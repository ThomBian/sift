import { forwardRef, type TextareaHTMLAttributes } from "react";

const BASE =
  "w-full border-[0.5px] border-border bg-surface font-mono text-[12px] text-text px-3 py-2 outline-none placeholder:text-muted resize-none focus:border-accent transition-colors";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", ...props }, ref) => (
    <textarea ref={ref} className={`${BASE} ${className}`.trim()} {...props} />
  ),
);
Textarea.displayName = "Textarea";
