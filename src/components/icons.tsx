import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const defaultProps: IconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function GridIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props} aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

export function WrenchIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props} aria-hidden="true">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props} aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function PackageIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props} aria-hidden="true">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

export function GearIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props} aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M21 12h-2M5 12H3M12 21v-2M12 5V3" />
    </svg>
  );
}

export function HelpCircleIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function SidebarToggleIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...defaultProps} width={14} height={14} {...props} aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...defaultProps} width={14} height={14} {...props} aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <svg {...defaultProps} width={13} height={13} {...props} aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <svg {...defaultProps} width={13} height={13} {...props} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <svg {...defaultProps} width={11} height={11} {...props} aria-hidden="true">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...defaultProps} width={11} height={11} {...props} aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props} aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <svg {...defaultProps} width={11} height={11} {...props} aria-hidden="true">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-3.51" />
    </svg>
  );
}

export function StarFilledIcon(props: IconProps) {
  return (
    <svg {...defaultProps} width={14} height={14} fill="currentColor" {...props} aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export function PhoneCallIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props} aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props} aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props} aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props} aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props} aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props} aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export function DollarIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props} aria-hidden="true">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props} aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...defaultProps} width={14} height={14} {...props} aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props} aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export function ThumbsUpSolidIcon(props: IconProps) {
  return (
    <svg width={30} height={30} viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props} aria-hidden="true">
      <path d="M2 20h2c.55 0 1-.45 1-1v-7c0-.55-.45-1-1-1H2v9zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66a4.8 4.8 0 0 0-.88-1.22L14 2 7.59 8.41C7.21 8.79 7 9.3 7 9.83v7.84C7 18.95 8.05 20 9.34 20h6.55c.64 0 1.22-.38 1.48-.97l2.46-6.15z" />
    </svg>
  );
}

export function CalendarSolidIcon(props: IconProps) {
  return (
    <svg width={30} height={30} viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props} aria-hidden="true">
      <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5zm2 4h5v5H7v-5z" />
    </svg>
  );
}

export function NoteSolidIcon(props: IconProps) {
  return (
    <svg width={30} height={30} viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props} aria-hidden="true">
      <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6zm2-6h8v2H8v-2zm0-3h8v2H8v-2z" />
    </svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props} aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export function ClipboardCheckIcon(props: IconProps) {
  return (
    <svg {...defaultProps} {...props} aria-hidden="true">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}

export function HomebotLogo(props: IconProps) {
  return (
    <svg width={28} height={24} viewBox="0 0 28 24" fill="none" {...props} aria-hidden="true">
      <path d="M20.1229 24C19.0455 24 17.9764 23.5153 17.0875 22.6177C15.7679 21.3237 15.0358 19.5409 15.0248 17.5992C15.0179 16.308 15.3523 15.0748 15.9454 14.1302C15.4596 14.0557 14.945 14.0142 14.4015 14.0142H14.2983C13.7547 14.0142 13.2401 14.0543 12.7558 14.1289C13.3461 15.0707 13.6818 16.3053 13.6749 17.5978C13.6653 19.5395 12.9319 21.3209 11.6123 22.6163C10.6573 23.5802 9.49322 24.0691 8.33599 23.9903C7.32324 23.9227 6.40819 23.4117 5.76008 22.5555C4.69367 21.1911 4.61936 19.2136 5.56056 17.2664C6.25682 15.8274 7.57918 14.3305 9.5345 13.361C8.82585 12.8708 8.13922 12.5532 7.38929 12.2079C6.15362 11.6376 4.75421 10.9913 3.00942 9.44875C0.777524 7.4643 0.323438 3.78817 2.0586 1.73881C2.98878 0.635421 4.47763 -0.012253 6.02565 0.000175681C7.62596 0.0153663 9.1272 0.73485 10.1454 1.97772C10.3615 2.22353 12.5356 4.76727 13.4782 8.51798C13.5772 8.91432 13.3309 9.31342 12.9319 9.39351L12.5342 9.47361C12.2246 9.53575 11.9246 9.33966 11.8503 9.0317C10.9958 5.53924 8.88364 3.12669 8.86162 3.10183L8.83686 3.07283C8.12958 2.2042 7.12509 1.71948 6.01052 1.70981C4.96337 1.70153 3.96576 2.1241 3.35756 2.84359C2.22922 4.1776 2.61863 6.81387 4.14051 8.16722C5.69541 9.54266 6.92006 10.1075 8.10344 10.6543C9.15334 11.1391 10.2335 11.6376 11.4141 12.6623C12.2865 12.4344 13.2484 12.3046 14.2983 12.3046H14.4015C15.4527 12.3046 16.4132 12.4344 17.2856 12.6623C18.4635 11.639 19.545 11.1404 20.5963 10.6543C21.7797 10.1075 23.0043 9.54266 24.5606 8.16583C26.0825 6.81387 26.4705 4.1776 25.3422 2.84359C24.7409 2.13101 23.7639 1.70981 22.7236 1.70981C22.7126 1.70981 22.7002 1.70981 22.6892 1.70981C21.5733 1.71948 20.5702 2.2042 19.8629 3.07283L19.8381 3.10183C19.8161 3.12669 17.7039 5.53924 16.8508 9.03032C16.7751 9.33828 16.4751 9.53299 16.1669 9.47223L15.7692 9.39213C15.3702 9.31204 15.1225 8.91294 15.223 8.5166C16.1669 4.76589 18.3396 2.22215 18.5557 1.97634C19.5753 0.73485 21.0752 0.0153663 22.6755 0.000175681C24.2235 -0.0108721 25.7123 0.635421 26.6439 1.73881C28.3777 3.78955 27.9236 7.4643 25.6903 9.44875C23.9441 10.9927 22.5447 11.639 21.3091 12.2093C20.5591 12.5559 19.8711 12.8722 19.1639 13.3624C21.1192 14.3305 22.4429 15.8288 23.1378 17.2678C24.079 19.215 24.0047 21.1925 22.9383 22.5569C22.2902 23.4145 21.3751 23.924 20.3624 23.9917C20.2826 23.9972 20.2014 24 20.1216 24H20.1229Z" fill="#FF692D" />
    </svg>
  );
}
