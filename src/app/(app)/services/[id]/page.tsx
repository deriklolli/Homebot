import ServiceDetailClient from "@/components/services/ServiceDetailClient";

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ServiceDetailClient id={id} />;
}
