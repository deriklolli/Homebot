import HomeAssetDetailClient from "@/components/home-assets/HomeAssetDetailClient";

export default async function HomeAssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <HomeAssetDetailClient id={id} />;
}
