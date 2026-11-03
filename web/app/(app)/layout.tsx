import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { aiProvider, isMockMode } from "@/lib/ai";
import { isTwilioConfigured } from "@/lib/twilio";
import { BrandMark } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";
import { NavLink } from "@/components/dashboard/nav-link";
import { LogoutButton } from "@/components/dashboard/logout-button";
import {
  LayoutDashboard, Users, MessagesSquare, Star, CalendarDays, Megaphone, Settings,
} from "lucide-react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const tenant = await db.tenant.findUnique({
    where: { id: session.tenantId },
    select: { id: true, name: true, brandColor: true, logoUrl: true },
  });
  if (!tenant) redirect("/login");

  const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/leads", label: "Leads", icon: Users },
    { href: "/conversations", label: "Conversations", icon: MessagesSquare },
    { href: "/reviews", label: "Reviews", icon: Star },
    { href: "/appointments", label: "Appointments", icon: CalendarDays },
    { href: "/campaigns", label: "Campaigns", icon: Megaphone },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-border bg-white md:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <BrandMark name={tenant.name} logoUrl={tenant.logoUrl} brandColor={tenant.brandColor} size={34} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{tenant.name}</p>
            <p className="text-xs text-muted-foreground">Marketing OS</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3" aria-label="Main">
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label}>
              <item.icon className="h-4 w-4" aria-hidden />
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <p className="text-xs font-medium text-muted-foreground">Signed in</p>
          <p className="truncate text-sm font-medium">{session.name ?? session.email}</p>
          <p className="mb-2 truncate text-xs text-muted-foreground">{session.email}</p>
          <LogoutButton />
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border bg-white/90 px-4 backdrop-blur md:px-6">
          <nav className="flex gap-1 overflow-x-auto md:hidden" aria-label="Main mobile">
            {navItems.slice(0, 6).map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} mobile>
                <item.icon className="h-4 w-4" aria-hidden />
              </NavLink>
            ))}
          </nav>
          <div className="hidden md:block" />
          <div className="flex items-center gap-2">
            {!isMockMode() ? (
              <Badge tone="teal">AI: live ({aiProvider() === "groq" ? "Groq" : "OpenAI"})</Badge>
            ) : (
              <Badge tone="amber" title="Free fix: add GROQ_API_KEY to .env (AI-SETUP.md)">
                AI: mock mode
              </Badge>
            )}
            {!isTwilioConfigured() ? (
              <Badge tone="amber" title="Set TWILIO_* in .env to send real SMS">
                SMS: mock mode
              </Badge>
            ) : (
              <Badge tone="teal">SMS: live (Twilio)</Badge>
            )}
          </div>
        </header>

        <main className="flex-1 bg-slate-50 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
