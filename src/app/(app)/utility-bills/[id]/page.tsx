import UtilityBillDetailClient from "@/components/utility-bills/UtilityBillDetailClient";

export default async function UtilityBillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <UtilityBillDetailClient id={id} />;
}
