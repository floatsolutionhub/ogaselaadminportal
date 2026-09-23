import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";

const TONES = {
  brand: "bg-brand-50 text-brand-600",
  violet: "bg-violet-50 text-violet-600",
  amber: "bg-amber-50 text-amber-600",
  sky: "bg-sky-50 text-sky-600",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "brand",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
}) {
  return (
    <Card className="flex items-start justify-between hover:shadow-[0_4px_16px_rgba(16,24,40,0.08)]">
      <div>
        <p className="text-sm font-medium text-ink-muted">{label}</p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-ink">{value}</p>
        {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      </div>
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONES[tone]}`}>
        <Icon size={20} strokeWidth={2} />
      </span>
    </Card>
  );
}
