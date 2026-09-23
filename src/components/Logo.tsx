import logoMark from "../assets/logo.png";

const SIZES = {
  sm: { mark: "h-7 w-7", text: "text-sm" },
  md: { mark: "h-9 w-9", text: "text-lg" },
  lg: { mark: "h-12 w-12", text: "text-2xl" },
} as const;

/** Same lockup as the transactional emails (BrandedEmailTemplate.cs): the Ogasela cart mark + wordmark. */
export function Logo({ dark = false, size = "md" }: { dark?: boolean; size?: keyof typeof SIZES }) {
  const { mark, text } = SIZES[size];

  return (
    <div className="flex items-center gap-2.5">
      <img src={logoMark} alt="Ogasela" className={`${mark} flex-shrink-0 rounded-full object-contain drop-shadow-sm`} />
      <span className={`${text} font-bold tracking-tight ${dark ? "text-white" : "text-brand-700"}`}>Ogasela</span>
    </div>
  );
}
