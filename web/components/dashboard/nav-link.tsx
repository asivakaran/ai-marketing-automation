"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/client";

export function NavLink({
  href,
  label,
  children,
  mobile = false,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const active = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  if (mobile) {
    return (
      <Link
        href={apiUrl(href)}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap",
          active ? "bg-slate-900 text-white" : "text-muted-foreground hover:bg-muted"
        )}
      >
        {children}
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={apiUrl(href)}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-slate-900 text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
      <span>{label}</span>
    </Link>
  );
}
