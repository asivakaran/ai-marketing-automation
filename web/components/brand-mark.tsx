import { cn, initials } from "@/lib/utils";

/** Tenant logo mark: logo image if set, otherwise initials on brand color. */
export function BrandMark({
  name,
  logoUrl,
  brandColor,
  size = 32,
  className,
  textLight,
}: {
  name: string;
  logoUrl?: string | null;
  brandColor: string;
  size?: number;
  className?: string;
  textLight?: boolean;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={name}
        width={size}
        height={size}
        className={cn("rounded-lg object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-label={name}
      className={cn("inline-flex items-center justify-center rounded-lg font-semibold", className)}
      style={{
        width: size,
        height: size,
        backgroundColor: brandColor,
        color: textLight ?? true ? "#ffffff" : "#0f172a",
        fontSize: Math.round(size * 0.38),
      }}
    >
      {initials(name)}
    </span>
  );
}
