import type { ReactNode } from "react";

const TONES = {
  neutral: "bg-black/5 text-ink-muted",
  brand: "bg-brand-50 text-brand-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-rose-50 text-rose-700",
  success: "bg-emerald-50 text-emerald-700",
} as const;

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof TONES }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${TONES[tone]}`}>
      {children}
    </span>
  );
}
