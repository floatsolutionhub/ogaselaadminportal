import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function SettingsHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <Link to="/settings" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft size={14} /> Settings
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <p className="text-xs text-ink-muted">{description}</p>
        </div>
        {action}
      </div>
    </div>
  );
}
