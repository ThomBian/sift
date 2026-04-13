import type { ReactNode } from "react";

export function ViewHeaderCount({ value }: { value: number }) {
  return (
    <span
      className={`font-mono text-[10px] tabular-nums ${
        value > 0 ? "text-accent" : "text-dim"
      }`}
    >
      {value}
    </span>
  );
}

export default function ViewHeader({
  title,
  trailing,
}: {
  title: string;
  trailing: ReactNode;
}) {
  return (
    <header className="px-4 py-2 flex items-baseline justify-between border-b border-[0.5px] border-border shrink-0">
      <h1 className="font-sans text-sm font-medium text-text tracking-tight">
        {title}
      </h1>
      <div className="flex items-baseline gap-2 min-w-0 justify-end font-mono text-[10px]">
        {trailing}
      </div>
    </header>
  );
}
