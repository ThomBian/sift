import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const EXIT_MS = 120;

function getFocusable(container: HTMLElement): HTMLElement[] {
  const sel =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const fromDesc = Array.from(container.querySelectorAll<HTMLElement>(sel));
  const out: HTMLElement[] = [];
  if (container.tabIndex >= 0 && !container.matches(":disabled")) {
    out.push(container);
  }
  for (const el of fromDesc) {
    if (el !== container && !el.hasAttribute("disabled")) out.push(el);
  }
  return out;
}

export interface ConfirmModalProps {
  message: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  message,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const exitTimeoutRef = useRef<number | null>(null);
  const [backdropOpaque, setBackdropOpaque] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const exitingRef = useRef(false);

  const runExit = useCallback((handler: () => void) => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    setIsExiting(true);
    setBackdropOpaque(false);
    exitTimeoutRef.current = window.setTimeout(() => {
      exitTimeoutRef.current = null;
      handler();
    }, EXIT_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (exitTimeoutRef.current !== null) {
        clearTimeout(exitTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => setBackdropOpaque(true));
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      confirmButtonRef.current?.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (exitingRef.current) return;

      if (e.key === "Escape") {
        e.preventDefault();
        runExit(onCancel);
        return;
      }

      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;

      const focusable = getFocusable(panel);
      if (focusable.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      if (focusable.length === 1) {
        e.preventDefault();
        focusable[0].focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !panel.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onConfirm, onCancel, runExit]);

  useEffect(() => {
    function onFocusIn(e: FocusEvent) {
      if (exitingRef.current) return;
      const panel = panelRef.current;
      if (!panel || !e.target || !(e.target instanceof Node)) return;
      if (!panel.contains(e.target as Node)) {
        const focusable = getFocusable(panel);
        (focusable[0] ?? panel).focus({ preventScroll: true });
      }
    }

    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-text/20 transition-opacity duration-150 ${
        backdropOpaque ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-message"
        aria-describedby="confirm-modal-hint"
        className={`w-[320px] max-w-[calc(100vw-2rem)] border-[0.5px] border-border bg-bg/95 shadow-panel backdrop-blur-panel outline-none floating-panel ${
          isExiting ? "animate-modal-out" : "animate-modal-in"
        }`}
      >
        <div className="px-4 pt-4 pb-3">
          <div
            id="confirm-modal-message"
            className="font-sans text-[13.5px] font-medium tracking-[-0.02em] text-text break-words"
          >
            {message}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[0.5px] border-border px-4 py-2">
          <button
            type="button"
            className="px-3 py-1.5 font-mono text-[10px] text-muted border-[0.5px] border-border bg-surface hover:bg-surface-2 hover:text-text transition-colors duration-150"
            onClick={() => runExit(onCancel)}
          >
            Cancel
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            className="px-3 py-1.5 font-mono text-[10px] text-bg bg-accent hover:opacity-90 transition-opacity duration-150"
            onClick={() => runExit(onConfirm)}
          >
            Confirm
          </button>
        </div>
        <p
          id="confirm-modal-hint"
          className="px-4 pb-3 font-mono text-[10px] text-muted"
        >
          <span className="text-accent">↵</span> on Confirm ·{" "}
          <span className="text-muted">esc</span> cancel
        </p>
      </div>
    </div>
  );
}
