import { getServerApi } from "@/lib/trpc/server";
import { DealerPreviewClient } from "@/components/admin/dealer-preview-client";

export const dynamic = "force-dynamic";

export default async function DealerPreviewPage() {
  const api = await getServerApi();
  const dealerships = await api.dealerships.listAllWithUsers();
  return <DealerPreviewClient dealerships={dealerships} />;
}
