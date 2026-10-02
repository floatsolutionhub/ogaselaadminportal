import { Link } from "react-router-dom";
import { Bell, ChevronRight, ShieldCheck, Tags, type LucideIcon } from "lucide-react";
import { useApiQuery } from "../../lib/useApiQuery";
import { formatKobo } from "../../lib/format";
import { getPlatformSettings, getPromotionPlans } from "../../services/settings";
import { Card } from "../../components/Card";
import { Badge } from "../../components/Badge";
import { Spinner } from "../../components/Spinner";
import { ErrorBanner } from "../../components/ErrorBanner";

function SettingCard({
  to,
  icon: Icon,
  title,
  description,
  children,
}: {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Link to={to} className="group block">
      <Card className="flex h-full flex-col gap-4 transition-shadow group-hover:shadow-[0_4px_16px_rgba(16,24,40,0.08)]">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Icon size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-ink">{title}</h3>
            <p className="mt-0.5 text-xs text-ink-muted">{description}</p>
          </div>
          <ChevronRight size={16} className="mt-1 text-ink-muted transition-transform group-hover:translate-x-0.5" />
        </div>
        <div className="mt-auto border-t border-black/5 pt-3 text-sm text-ink">{children}</div>
      </Card>
    </Link>
  );
}

export function SettingsPage() {
  const plans = useApiQuery(() => getPromotionPlans());
  const settings = useApiQuery(() => getPlatformSettings());

  if (plans.isLoading || settings.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (plans.error || settings.error || !plans.data || !settings.data) {
    return <ErrorBanner message={plans.error ?? settings.error ?? "Couldn't load settings."} />;
  }

  const activePlans = plans.data.filter((p) => p.isActive);
  const paid = activePlans.filter((p) => p.price > 0);
  const channels = settings.data.notifications.flatMap((c) => c.channels);
  const channelsOn = channels.filter((c) => c.enabled).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">Settings</h2>
        <p className="text-xs text-ink-muted">How Ogasela works for every buyer and seller. Changes take effect immediately.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SettingCard to="/settings/pricing" icon={Tags} title="Pricing" description="The plans sellers choose when posting an ad - cost, how long ads run and what each plan offers.">
          <p className="font-medium">
            {activePlans.length} plan{activePlans.length === 1 ? "" : "s"} on sale
          </p>
          <p className="text-xs text-ink-muted">
            {paid.length > 0
              ? `Paid plans from ${formatKobo(Math.min(...paid.map((p) => p.price)))} to ${formatKobo(Math.max(...paid.map((p) => p.price)))}`
              : "No paid plans on sale"}
            {plans.data.length > activePlans.length && ` · ${plans.data.length - activePlans.length} hidden`}
          </p>
        </SettingCard>

        <SettingCard to="/settings/approvals" icon={ShieldCheck} title="Ad approvals" description="Whether new ads wait for a moderator before buyers can see them, and how many free ads a seller can run.">
          <div className="flex items-center gap-2">
            {settings.data.requireListingApproval ? (
              <Badge tone="warning">Approval required</Badge>
            ) : (
              <Badge tone="success">Ads go live instantly</Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-ink-muted">Up to {settings.data.freePlanCap} free ads live per seller</p>
        </SettingCard>

        <SettingCard to="/settings/notifications" icon={Bell} title="Notifications" description="Which push and email notifications Ogasela sends to sellers.">
          <p className="font-medium">
            {channelsOn} of {channels.length} switched on
          </p>
          <p className="text-xs text-ink-muted">{settings.data.notifications.map((c) => c.label).join(" · ")}</p>
        </SettingCard>
      </div>
    </div>
  );
}
