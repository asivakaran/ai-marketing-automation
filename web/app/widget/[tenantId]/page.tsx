import { db } from "@/lib/db";
import { WidgetChat } from "@/components/widget-chat";

export const dynamic = "force-dynamic";

export default async function WidgetPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, brandColor: true, logoUrl: true, isActive: true },
  });

  if (!tenant || !tenant.isActive) {
    return (
      <main className="flex h-[100dvh] items-center justify-center p-6">
        <p className="rounded-xl bg-slate-100 p-4 text-sm text-slate-600">
          Chat is currently unavailable. Please try again later.
        </p>
      </main>
    );
  }

  return (
    <WidgetChat
      tenantId={tenant.id}
      tenantName={tenant.name}
      brandColor={tenant.brandColor}
      logoUrl={tenant.logoUrl}
    />
  );
}
