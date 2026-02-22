import InventoryDetailClient from "@/components/inventory/InventoryDetailClient";

export default async function InventoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InventoryDetailClient id={id} />;
}
