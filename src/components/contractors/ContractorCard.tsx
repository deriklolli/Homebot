"use client";

import { useState } from "react";
import type { Contractor } from "@/lib/contractors-data";
import {
  StarFilledIcon,
  PhoneCallIcon,
  MailIcon,
  PencilIcon,
  BuildingIcon,
  UserIcon,
} from "@/components/icons";

export default function ContractorCard({
  contractor,
  onEdit,
}: {
  contractor: Contractor;
  onEdit: (contractor: Contractor) => void;
}) {
  const [logoError, setLogoError] = useState(false);

  return (
    <article className="bg-surface rounded-[var(--radius-lg)] border border-border shadow-[var(--shadow-card)] overflow-hidden hover:shadow-[var(--shadow-hover)] transition-shadow duration-200">
      <div className="p-5">
        {/* Name + avatar + edit */}
        <div className="flex items-start gap-3 mb-3">
          {contractor.logoUrl?.trim() && !logoError ? (
            <img
              src={contractor.logoUrl}
              alt={contractor.company}
              className="w-9 h-9 rounded-full object-contain bg-white border border-border shrink-0"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center shrink-0">
              {contractor.company?.trim() ? (
                <BuildingIcon width={18} height={18} />
              ) : (
                <UserIcon width={18} height={18} />
              )}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-text-primary truncate">
              {contractor.company?.trim() || contractor.name}
            </p>
            {contractor.company?.trim() && contractor.name && (
              <p className="text-xs text-text-3 truncate">
                {contractor.name}
              </p>
            )}
          </div>
          <button
            onClick={() => onEdit(contractor)}
            className="flex items-center justify-center rounded-[var(--radius-sm)] p-1.5 text-text-4 hover:bg-border hover:text-text-primary transition-all duration-[120ms] shrink-0"
            aria-label={`Edit ${contractor.name}`}
          >
            <PencilIcon width={14} height={14} />
          </button>
        </div>

        {/* Star rating */}
        <div
          className="flex gap-0.5 mb-3"
          aria-label={`Rating: ${contractor.rating} out of 5 stars`}
        >
          {Array.from({ length: 5 }, (_, i) => (
            <StarFilledIcon
              key={i}
              width={14}
              height={14}
              className={
                i < contractor.rating ? "text-accent" : "text-border-strong"
              }
            />
          ))}
        </div>

        {/* Contact info */}
        <div className="flex flex-col gap-1.5 py-3 border-t border-border">
          <div className="flex items-center gap-2 text-[13px] text-text-2">
            <PhoneCallIcon
              width={13}
              height={13}
              className="text-text-3 shrink-0"
            />
            <a
              href={`tel:${contractor.phone}`}
              className="hover:text-accent transition-colors duration-[120ms] truncate"
            >
              {contractor.phone}
            </a>
          </div>
          <div className="flex items-center gap-2 text-[13px] text-text-2">
            <MailIcon
              width={13}
              height={13}
              className="text-text-3 shrink-0"
            />
            <a
              href={`mailto:${contractor.email}`}
              className="hover:text-accent transition-colors duration-[120ms] truncate"
            >
              {contractor.email}
            </a>
          </div>
        </div>

        {/* Specialty + notes */}
        <div className="pt-3 border-t border-border">
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-[var(--radius-full)] bg-accent-light text-accent mb-2">
            {contractor.specialty}
          </span>
          {contractor.notes && (
            <p className="text-[13px] text-text-3 line-clamp-2 leading-relaxed">
              {contractor.notes}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
