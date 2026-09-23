/** Same lockup as the transactional emails (BrandedEmailTemplate.cs): a colour-badge "O" mark + wordmark. */
export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">
        O
      </span>
      <span className={`text-lg font-bold tracking-tight ${dark ? "text-white" : "text-brand-700"}`}>Ogasela</span>
    </div>
  );
}
