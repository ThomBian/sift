import {
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from "react";

export function usePaletteClose(onClose: () => void) {
  const [isClosing, setIsClosing] = useState(false);
  const triggerRef = useRef<Element | null>(null);

  const captureTrigger = useCallback(() => {
    triggerRef.current = document.activeElement;
  }, []);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
      (triggerRef.current as HTMLElement | null)?.focus();
    }, 100);
  }, [onClose]);

  return { isClosing, handleClose, captureTrigger };
}

interface PaletteShellProps {
  title: ReactNode;
  isClosing: boolean;
  onClose: () => void;
  children: ReactNode;
  role?: string;
  "aria-label"?: string;
}

export default function PaletteShell({
  title,
  isClosing,
  onClose,
  children,
  role,
  "aria-label": ariaLabel,
}: PaletteShellProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[14vh] md:pt-[18vh] px-3 sm:px-4 bg-text/30 backdrop-blur-scrim"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`${isClosing ? "animate-palette-out" : "animate-palette-in"} w-full max-w-[min(820px,calc(100vw-1.5rem))] border-[0.5px] border-border bg-bg/95 floating-panel shadow-panel focus-within:border-accent transition-colors duration-150 [&_input:focus-visible]:outline-none`}
        role={role}
        aria-label={ariaLabel}
      >
        <div className="flex items-center px-3 py-1.5 border-b border-[0.5px] border-border">
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-dim">
            {title}
          </span>
          <span className="ml-auto font-mono text-[9px] text-dim">
            esc to close
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
