"use client";

import { useState } from "react";
import Link from "next/link";
import { Source_Serif_4 } from "next/font/google";
import { helpTopics } from "@/lib/help-data";
import {
  GridIcon,
  WrenchIcon,
  HomeIcon,
  PackageIcon,
  ClipboardCheckIcon,
  UsersIcon,
  CalendarIcon,
  GearIcon,
  HelpCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SearchIcon,
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

const serifFont = Source_Serif_4({
  subsets: ["latin"],
  weight: ["300"],
  display: "swap",
});

const faqs = [
  {
    question: "How do I add a home asset?",
    answer:
      "Navigate to Home Assets from the sidebar. You can either click the \"+ Add\" button next to any category, or click on a placeholder row to pre-fill the asset name. Fill in the make, model, serial number, purchase date, and warranty expiration. Once saved, HOMEBOT will automatically look up compatible consumables and create inventory items for you.",
  },
  {
    question: "What are consumable suggestions?",
    answer:
      "When you add a home asset with a make and model number, HOMEBOT uses AI to identify filters, replacement parts, and other consumables that need periodic replacement for that specific product. These are automatically added to your Home Inventory with recommended replacement frequencies and purchase links.",
  },
  {
    question: "How do reorder reminders work?",
    answer:
      "Each inventory item has a reorder frequency (e.g., every 3 months). HOMEBOT calculates the next reminder date based on when you last ordered. When an item is due within 7 days or overdue, an alert appears on the Dashboard and the Inventory page. You can also enable email or SMS notifications in Settings.",
  },
  {
    question: "How do I connect an inventory item to a home asset?",
    answer:
      "When you add a home asset with a make and model, inventory items are automatically created and linked. For existing inventory items, edit the item and select a home asset from the dropdown. Linked items appear on the asset's detail page under \"Tracked Inventory\" and can show model-specific product recommendations.",
  },
  {
    question: "How do I add a service and track due dates?",
    answer:
      "Go to Home Services and click \"Add Service.\" Enter the service name, provider, cost, and frequency. Set the last service date and HOMEBOT will calculate the next due date. When a service is due within 7 days, an alert appears on the Dashboard and the Services page. Service due dates also appear on the Calendar.",
  },
  {
    question: "Can I subscribe to the calendar from my phone?",
    answer:
      "Yes. On the Calendar page, click the \"Subscribe\" button to copy the iCal feed URL. On iPhone, go to Settings \u2192 Calendar \u2192 Accounts \u2192 Add Account \u2192 Other \u2192 Add Subscribed Calendar and paste the URL. On Android, open Google Calendar \u2192 Settings \u2192 Add calendar \u2192 From URL. Your HOMEBOT events will stay in sync automatically.",
  },
  {
    question: "How do I enable email or SMS alerts?",
    answer:
      "Go to Settings and scroll to the Notifications section. Toggle on Email notifications to receive alerts at your account email when inventory items are due. Toggle on SMS notifications and enter your phone number to receive text message alerts. Click \"Save preferences\" to apply your changes.",
  },
  {
    question: "How do I add a contractor?",
    answer:
      "Navigate to Contractors from the sidebar and click \"Add Contractor.\" Enter the contractor's name, specialty, phone number, email, and website. You can also add a logo by pasting their website URL \u2014 HOMEBOT will try to fetch it automatically. Once saved, you can link the contractor to projects and rate their work.",
  },
  {
    question: "What does the Dashboard show?",
    answer:
      "The Dashboard is your home at a glance. It shows your task list, active home improvement projects, upcoming service appointments, inventory reorder alerts, and a spending trends chart. Everything updates in real time as you add or complete items across HOMEBOT.",
  },
  {
    question: "How do I track a home improvement project?",
    answer:
      "Go to Projects from the sidebar and click \"Add Project.\" Give it a name, set a status (Planning, In Progress, or Complete), and optionally assign a budget. You can add notes, upload invoices, attach contractors, and track milestones. The project detail page keeps a timeline of everything in one place.",
  },
  {
    question: "How do I switch between light and dark mode?",
    answer:
      "Go to Settings and find the Appearance section. Click \"Light,\" \"Dark,\" or \"System\" to choose your preferred theme. The System option automatically follows your device's appearance setting. Your choice is saved and applied immediately across all pages.",
  },
  {
    question: "Can I import home assets from a spreadsheet?",
    answer:
      "Yes. On the Home Assets page, click the \"Import\" button. You can upload a CSV or Excel (.xlsx) file with columns for asset name, category, make, model, serial number, purchase date, and warranty expiration. HOMEBOT will map the columns and create assets for each row. After import, consumable suggestions will be generated automatically for assets with make and model info.",
  },
  {
    question: "How does warranty tracking work?",
    answer:
      "When you add a home asset, you can set a warranty expiration date. HOMEBOT displays the warranty status on the asset detail page — showing whether the warranty is active, expiring soon, or expired. Assets with warranties expiring within 30 days are flagged so you can take action before coverage ends.",
  },
  {
    question: "How do I edit or delete an item?",
    answer:
      "Navigate to the item you want to modify (asset, inventory item, service, contractor, or project) and open its detail page. Click the \"Edit\" button to update any field, or use the \"Delete\" button to remove it entirely. Deleting an item is permanent and cannot be undone, so double-check before confirming.",
  },
  {
    question: "What is the property name setting?",
    answer:
      "In Settings, you can name your property (e.g., \"1715 Red Hawk Trail\" or \"Lake House\"). This name appears in the Dashboard header, making it easy to identify your home at a glance. It's especially useful if you manage more than one property in the future.",
  },
  {
    question: "How does the spending chart work?",
    answer:
      "The spending chart on the Dashboard tracks your home-related expenses over time. It pulls cost data from your projects, services, and inventory purchases to show monthly spending trends. You can see where your money is going and identify patterns in your home maintenance costs.",
  },
];

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const q = searchQuery.toLowerCase();

  const filteredTopics = q
    ? helpTopics.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.summary.toLowerCase().includes(q) ||
          t.keywords.includes(q)
      )
    : helpTopics;

  const filteredFaqs = q
    ? faqs.filter(
        (f) =>
          f.question.toLowerCase().includes(q) ||
          f.answer.toLowerCase().includes(q)
      )
    : faqs;

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scroll">
      <header className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-text-primary">
          Help &amp; Support
        </h1>
      </header>

      {/* Search */}
      <div className="mt-[80px] mb-[80px] flex flex-col items-center">
        <p className={`text-[42px] font-light text-text-primary mb-4 ${serifFont.className}`}>
          How may I help you?
        </p>
        <div className="relative w-full max-w-[50%] min-w-[260px]">
          <SearchIcon
            className="absolute left-4 top-1/2 -translate-y-1/2 text-text-4"
            width={18}
            height={18}
          />
          <input
            type="text"
            placeholder="Search for a topic or question..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 text-[15px] bg-surface border border-border rounded-[var(--radius-lg)] text-text-primary placeholder:text-text-4 focus:outline-none focus:border-accent shadow-[var(--shadow-card)] transition-all duration-[120ms]"
          />
        </div>
      </div>

      {/* Topic Cards */}
      {filteredTopics.length > 0 && (
        <section className="mb-6">
          <h2 className="text-[15px] font-semibold text-text-primary mb-3 flex items-center gap-1.5">
            <HelpCircleIcon width={15} height={15} className="text-accent" />
            Topics
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredTopics.map((topic) => {
              const Icon = iconMap[topic.icon];
              return (
                <Link
                  key={topic.slug}
                  href={`/help/${topic.slug}`}
                  className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-5 hover:shadow-[var(--shadow-hover)] transition-shadow duration-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent-light shrink-0 flex items-center justify-center">
                      {Icon && <Icon width={18} height={18} className="text-accent" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[14px] font-semibold text-text-primary mb-1">
                        {topic.name}
                      </h3>
                      <p className="text-[14px] text-text-primary leading-relaxed">
                        {topic.summary}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* FAQ */}
      {filteredFaqs.length > 0 && (
        <section className="mt-[30px]">
          <h2 className="text-[15px] font-semibold text-text-primary mb-3 flex items-center gap-1.5">
            <HelpCircleIcon width={15} height={15} className="text-accent" />
            Frequently Asked Questions
          </h2>
          <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] overflow-hidden">
            {filteredFaqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={faq.question}
                  className={i > 0 ? "border-t border-border" : ""}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className={`flex items-center gap-2 w-full px-5 py-3.5 text-left transition-[background] duration-[120ms] ${isOpen ? "bg-accent-light" : "hover:bg-surface-hover"}`}
                    aria-expanded={isOpen}
                  >
                    {isOpen ? (
                      <ChevronDownIcon width={14} height={14} className="text-text-3 shrink-0" />
                    ) : (
                      <ChevronRightIcon width={14} height={14} className="text-text-3 shrink-0" />
                    )}
                    <span className="text-[14px] font-medium text-text-primary">
                      {faq.question}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 py-[25px] pl-[42px]">
                      <p className="text-[14px] text-text-primary leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* No results */}
      {q && filteredTopics.length === 0 && filteredFaqs.length === 0 && (
        <div className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] p-8 text-center">
          <p className="text-[14px] text-text-3">
            No results found for &ldquo;{searchQuery}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
