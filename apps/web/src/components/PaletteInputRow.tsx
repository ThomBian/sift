import { type ChangeEvent, type KeyboardEvent, type ReactNode, type RefObject } from "react";

interface PaletteInputRowProps {
  inputRef?: RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  "aria-label"?: string;
  /** Leading icon. Pass null to omit. Defaults to the "+" creation marker. */
  icon?: ReactNode;
  /** Trailing content (chips, etc.) */
  children?: ReactNode;
}

export default function PaletteInputRow({
  inputRef,
  value,
  onChange,
  onKeyDown,
  placeholder,
  "aria-label": ariaLabel,
  icon = <span className="text-dim text-[15px] shrink-0 select-none">+</span>,
  children,
}: PaletteInputRowProps) {
  return (
    <div className="flex items-center h-11 px-3 gap-2 border-[0.5px] border-border bg-bg focus-within:border-accent transition-colors duration-150">
      {icon}
      <input
        ref={inputRef}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="flex-1 bg-transparent border-none outline-none text-[13.5px] text-text font-sans min-w-0 placeholder:text-dim"
        style={{ letterSpacing: "-0.1px" }}
      />
      {children}
    </div>
  );
}
