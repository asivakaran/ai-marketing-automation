import { cn } from "@/lib/utils";

type Tone = "neutral" | "green" | "amber" | "red" | "teal" | "slate";

const tones: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  green: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border border-amber-200",
  red: "bg-red-50 text-red-700 border border-red-200",
  teal: "bg-teal-50 text-teal-700 border border-teal-200",
  slate: "bg-slate-100 text-slate-700 border border-slate-200",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
