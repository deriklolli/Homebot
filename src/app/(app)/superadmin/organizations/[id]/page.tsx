import OrgDetailClient from "@/components/superadmin/OrgDetailClient";

export default async function OrgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrgDetailClient id={id} />;
}
