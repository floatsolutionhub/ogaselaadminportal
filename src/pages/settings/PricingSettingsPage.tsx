import { useEffect, useState } from "react";
import { Check, Clock, Image, Megaphone, Pencil, Plus, Sparkles, Trash2, TrendingUp, Video, type LucideIcon } from "lucide-react";
import { ApiError } from "../../lib/apiClient";
import { useApiQuery } from "../../lib/useApiQuery";
import { formatKobo } from "../../lib/format";
import { createPromotionPlan, getPromotionPlans, updatePromotionPlan } from "../../services/settings";
import type { AiToolTier, PromotionPlan, PromotionPlanInput } from "../../types/api";
import { Card } from "../../components/Card";
import { Badge } from "../../components/Badge";
import { Spinner } from "../../components/Spinner";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Modal } from "../../components/Modal";
import { Select } from "../../components/Select";
import { Toggle } from "../../components/Toggle";
import { SettingsHeader } from "./SettingsHeader";

const MAX_FEATURES = 10;

const AI_TIER_LABEL: Record<AiToolTier, string> = {
  Basic: "Basic AI listing helper",
  Standard: "Standard AI listing tools",
  Full: "Full AI listing tools",
};

const inputClassName =
  "w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

const EMPTY_PLAN: PromotionPlanInput = {
  name: "",
  description: "",
  features: [""],
  durationDays: 14,
  photoLimit: 8,
  videoAllowed: false,
  boostWeight: 1,
  price: 0,
  aiToolTier: "Standard",
  adPlatformPushAllowed: false,
  bundledAdCreditKobo: 0,
  isActive: true,
};

function Fact({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-xs text-ink-muted">
      <Icon size={13} className="shrink-0 text-ink-muted" /> {children}
    </li>
  );
}

function PlanCard({ plan, onEdit }: { plan: PromotionPlan; onEdit: () => void }) {
  return (
    <Card className={`flex flex-col gap-4 ${plan.isActive ? "" : "opacity-70"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-base font-semibold text-ink">{plan.name}</h3>
            {plan.price === 0 && <Badge tone="brand">Free plan</Badge>}
            {!plan.isActive && <Badge tone="neutral">Hidden</Badge>}
          </div>
          {plan.description && <p className="mt-0.5 text-xs text-ink-muted">{plan.description}</p>}
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-black/5"
        >
          <Pencil size={12} /> Edit
        </button>
      </div>

      <p className="text-2xl font-bold tracking-tight text-ink">
        {plan.price === 0 ? "Free" : formatKobo(plan.price)}
        <span className="ml-1 text-xs font-normal text-ink-muted">per ad · {plan.durationDays} days</span>
      </p>

      {plan.features.length > 0 ? (
        <ul className="space-y-1.5">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-ink">
              <Check size={15} className="mt-0.5 shrink-0 text-brand-600" /> {feature}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs italic text-ink-muted">No offer list yet - sellers only see the price and limits.</p>
      )}

      <ul className="mt-auto grid grid-cols-2 gap-1.5 border-t border-black/5 pt-3">
        <Fact icon={Clock}>Live {plan.durationDays} days</Fact>
        <Fact icon={Image}>Up to {plan.photoLimit} photos</Fact>
        <Fact icon={Video}>{plan.videoAllowed ? "Video allowed" : "No video"}</Fact>
        <Fact icon={TrendingUp}>Search boost {plan.boostWeight}/10</Fact>
        <Fact icon={Sparkles}>{AI_TIER_LABEL[plan.aiToolTier]}</Fact>
        <Fact icon={Megaphone}>
          {plan.adPlatformPushAllowed ? "TikTok & Facebook promotion" : "No social promotion"}
          {plan.bundledAdCreditKobo > 0 && ` · ${formatKobo(plan.bundledAdCreditKobo)} credit`}
        </Fact>
      </ul>
    </Card>
  );
}

function NumberField({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  prefix,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  prefix?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink-muted">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">{prefix}</span>}
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={Number.isNaN(value) ? "" : value}
          onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
          className={`${inputClassName} ${prefix ? "pl-7" : ""}`}
        />
      </div>
      {hint && <p className="mt-1 text-[11px] text-ink-muted">{hint}</p>}
    </div>
  );
}

function PlanModal({
  plan,
  open,
  onClose,
  onSaved,
}: {
  plan: PromotionPlan | null;
  open: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [form, setForm] = useState<PromotionPlanInput>(EMPTY_PLAN);
  // Typed in Naira; the API stores kobo.
  const [priceNaira, setPriceNaira] = useState(0);
  const [creditNaira, setCreditNaira] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const start = plan ? { ...plan } : EMPTY_PLAN;
    setForm({ ...start, description: start.description ?? "", features: start.features.length ? [...start.features] : [""] });
    setPriceNaira(start.price / 100);
    setCreditNaira(start.bundledAdCreditKobo / 100);
    setError(null);
  }, [open, plan]);

  const set = <K extends keyof PromotionPlanInput>(key: K, value: PromotionPlanInput[K]) => setForm((f) => ({ ...f, [key]: value }));
  const features = form.features;
  const valid =
    form.name.trim().length > 0 &&
    priceNaira >= 0 &&
    creditNaira >= 0 &&
    form.durationDays >= 1 &&
    form.durationDays <= 365 &&
    form.photoLimit >= 1 &&
    form.photoLimit <= 30 &&
    form.boostWeight >= 0 &&
    form.boostWeight <= 10;

  const save = async () => {
    setSaving(true);
    setError(null);
    const input: PromotionPlanInput = {
      ...form,
      name: form.name.trim(),
      description: form.description?.trim() || null,
      features: features.map((f) => f.trim()).filter(Boolean),
      price: Math.round(priceNaira * 100),
      bundledAdCreditKobo: Math.round(creditNaira * 100),
    };
    try {
      if (plan) {
        await updatePromotionPlan(plan.id, input);
        onSaved(`${input.name} updated.`);
      } else {
        await createPromotionPlan(input);
        onSaved(`${input.name} added. Sellers can choose it now${input.isActive ? "" : " once you show it"}.`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save the plan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={plan ? `Edit ${plan.name}` : "Add a plan"}
      description="Sellers see the name, price and what the plan offers when they post an ad."
      maxWidth="2xl"
    >
      <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
        {error && <ErrorBanner message={error} />}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Plan name</label>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={40} placeholder="e.g. Gold" className={inputClassName} />
          </div>
          <NumberField label="Price per ad" prefix="₦" min={0} value={priceNaira} onChange={setPriceNaira} hint="₦0 makes this the free plan - there can only be one." />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Short description</label>
          <input
            value={form.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
            maxLength={300}
            placeholder="e.g. Maximum visibility, with ad credit included."
            className={inputClassName}
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-medium text-ink-muted">What the plan offers</label>
            <span className="text-[11px] text-ink-muted">
              {features.filter((f) => f.trim()).length}/{MAX_FEATURES}
            </span>
          </div>
          <div className="space-y-2">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <Check size={15} className="shrink-0 text-brand-600" />
                <input
                  value={feature}
                  onChange={(e) => set("features", features.map((f, i) => (i === index ? e.target.value : f)))}
                  maxLength={80}
                  placeholder="e.g. Top of search results"
                  className={inputClassName}
                />
                <button
                  type="button"
                  onClick={() => set("features", features.length === 1 ? [""] : features.filter((_, i) => i !== index))}
                  aria-label="Remove"
                  className="rounded-lg p-2 text-ink-muted hover:bg-black/5 hover:text-rose-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          {features.length < MAX_FEATURES && (
            <button
              type="button"
              onClick={() => set("features", [...features, ""])}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              <Plus size={13} /> Add a line
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField label="Ad runs for (days)" min={1} max={365} value={form.durationDays} onChange={(v) => set("durationDays", v)} />
          <NumberField label="Photo limit" min={1} max={30} value={form.photoLimit} onChange={(v) => set("photoLimit", v)} />
          <NumberField
            label="Search boost (0-10)"
            min={0}
            max={10}
            value={form.boostWeight}
            onChange={(v) => set("boostWeight", v)}
            hint="Higher ranks ads higher in search and Hot Picks."
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">AI listing tools</label>
            <Select
              value={form.aiToolTier}
              onChange={(e) => set("aiToolTier", e.target.value as AiToolTier)}
              options={(Object.keys(AI_TIER_LABEL) as AiToolTier[]).map((t) => ({ value: t, label: AI_TIER_LABEL[t] }))}
            />
          </div>
          <NumberField
            label="Ad credit included"
            prefix="₦"
            min={0}
            value={creditNaira}
            onChange={setCreditNaira}
            hint="Free TikTok/Facebook ad spend that comes with the plan."
          />
        </div>

        <div className="divide-y divide-black/5 rounded-xl border border-black/5">
          {(
            [
              ["videoAllowed", "Video allowed", "Sellers can add a video to the ad."],
              ["adPlatformPushAllowed", "TikTok & Facebook promotion", "Sellers can promote the ad on social platforms."],
              ["isActive", "On sale", "Hidden plans stay on existing ads but sellers can't choose them."],
            ] as const
          ).map(([key, label, hint]) => (
            <div key={key} className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-ink">{label}</p>
                <p className="text-xs text-ink-muted">{hint}</p>
              </div>
              <Toggle label={label} checked={form[key]} onChange={(v) => set(key, v)} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium text-ink-muted hover:bg-black/5">
          Cancel
        </button>
        <button
          type="button"
          disabled={!valid || saving}
          onClick={save}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving && <Spinner size={14} />} {plan ? "Save changes" : "Add plan"}
        </button>
      </div>
    </Modal>
  );
}

export function PricingSettingsPage() {
  const { data: plans, isLoading, error, refetch } = useApiQuery(() => getPromotionPlans());
  const [editing, setEditing] = useState<PromotionPlan | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const open = (plan: PromotionPlan | null) => {
    setEditing(plan);
    setNotice(null);
    setModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <SettingsHeader
        title="Pricing"
        description="The plans sellers choose when posting an ad, cheapest first. Price changes apply to new ads; ads already paid for keep their terms."
        action={
          <button
            type="button"
            onClick={() => open(null)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Plus size={15} /> Add plan
          </button>
        }
      />

      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          <Check size={16} /> {notice}
        </div>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : error ? (
        <ErrorBanner message={error} />
      ) : !plans || plans.length === 0 ? (
        <EmptyState icon={Plus} title="No plans yet" description="Add a plan so sellers can post ads." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onEdit={() => open(plan)} />
          ))}
        </div>
      )}

      <PlanModal
        plan={editing}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={(message) => {
          setModalOpen(false);
          setNotice(message);
          refetch();
        }}
      />
    </div>
  );
}
