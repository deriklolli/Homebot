import HelpTopicClient from "@/components/help/HelpTopicClient";

export default async function HelpTopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <HelpTopicClient slug={slug} />;
}
