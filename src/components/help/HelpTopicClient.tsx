"use client";

import Link from "next/link";
import { helpTopics } from "@/lib/help-data";
import {
  ChevronLeftIcon,
  GridIcon,
  WrenchIcon,
  HomeIcon,
  PackageIcon,
  ClipboardCheckIcon,
  UsersIcon,
  CalendarIcon,
  GearIcon,
} from "@/components/icons";

const iconMap: Record<string, typeof GridIcon> = {
  GridIcon,
  WrenchIcon,
  HomeIcon,
  PackageIcon,
  ClipboardCheckIcon,
  UsersIcon,
  CalendarIcon,
  GearIcon,
};

export default function HelpTopicClient({ slug }: { slug: string }) {
  const topic = helpTopics.find((t) => t.slug === slug);

  if (!topic) {
    return (
      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scroll">
        <Link
          href="/help"
          className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[14px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms] mb-6"
        >
          <ChevronLeftIcon width={14} height={14} />
          Back to Help
        </Link>
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-8 text-center">
          <p className="text-[15px] font-semibold text-text-primary mb-1">
            Topic not found
          </p>
          <p className="text-[14px] text-text-3">
            The help topic you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  const Icon = iconMap[topic.icon];

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scroll">
      <Link
        href="/help"
        className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[var(--radius-sm)] border border-border-strong bg-surface text-text-2 text-[14px] font-medium hover:bg-border hover:text-text-primary transition-all duration-[120ms] mb-6"
      >
        <ChevronLeftIcon width={14} height={14} />
        Back to Help
      </Link>

      {/* Header */}
      <header className="mb-8 flex items-center gap-3 max-w-[780px] mx-auto">
        {Icon && (
          <div className="w-11 h-11 rounded-full bg-accent-light shrink-0 flex items-center justify-center">
            <Icon width={20} height={20} className="text-accent" />
          </div>
        )}
        <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
          {topic.name}
        </h1>
      </header>

      {/* Content */}
      <article className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-6 max-w-[780px] mx-auto">
        <div className="space-y-6">
          {topic.sections.map((section, i) => (
            <div key={section.heading}>
              {i > 0 && <hr className="border-border mb-6" />}
              <h2 className="text-[15px] font-semibold text-text-primary mb-3">
                {section.heading}
              </h2>
              <p className="text-[14px] text-text-primary leading-relaxed">
                {section.body}
              </p>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
