import { forwardRef, type InputHTMLAttributes } from "react";

const VARIANTS = {
  underline:
    "w-full h-9 px-3 border-b border-[0.5px] border-border bg-transparent text-text outline-none placeholder:text-muted focus:border-accent transition-colors",
  box: "w-full h-9 border-[0.5px] border-border-2 bg-surface-2 text-text px-3 outline-none placeholder:text-muted focus:border-accent transition-colors disabled:opacity-40",
} as const;

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: keyof typeof VARIANTS;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ variant = "underline", className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`${VARIANTS[variant]} ${className}`.trim()}
      {...props}
    />
  ),
);
Input.displayName = "Input";
