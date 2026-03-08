import { type LucideProps } from "lucide-react";
import {
  LayoutGrid,
  Wrench,
  User,
  Users,
  Package,
  Settings,
  CircleHelp,
  PanelLeft,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Star,
  Info,
  Smartphone,
  Home,
  SquarePen,
  RotateCcw,
  Phone,
  Mail,
  Plus,
  Search,
  X,
  Calendar,
  Clock,
  DollarSign,
  CircleCheck,
  Trash2,
  Bell,
  ClipboardCheck,
  LogOut,
  Sun,
  Moon,
  Camera,
  Image,
  Maximize2,
  TrendingUp,
  TrendingDown,
  Menu,
  Building2,
  FileText,
  Upload,
  CircleAlert,
  Sparkles,
  HardHat,
  NotebookPen,
  History,
} from "lucide-react";
import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

// ---------------------------------------------------------------------------
// Lucide-based icons — thin wrappers that preserve original export names
// and default sizes so every consumer file works without changes.
// ---------------------------------------------------------------------------

export const GridIcon = (props: LucideProps) => <LayoutGrid size={18} {...props} />;
export const WrenchIcon = (props: LucideProps) => <Wrench size={18} {...props} />;
export const UserIcon = (props: LucideProps) => <User size={18} {...props} />;
export const UsersIcon = (props: LucideProps) => <Users size={18} {...props} />;
export const PackageIcon = (props: LucideProps) => <Package size={18} {...props} />;
export const GearIcon = (props: LucideProps) => <Settings size={18} {...props} />;
export const HelpCircleIcon = (props: LucideProps) => <CircleHelp size={18} {...props} />;
export const SidebarToggleIcon = (props: LucideProps) => <PanelLeft size={18} {...props} />;
export const ChevronDownIcon = (props: LucideProps) => <ChevronDown size={14} {...props} />;
export const ChevronRightIcon = (props: LucideProps) => <ChevronRight size={14} {...props} />;
export const ChevronLeftIcon = (props: LucideProps) => <ChevronLeft size={14} {...props} />;
export const StarIcon = (props: LucideProps) => <Star size={13} {...props} />;
export const InfoIcon = (props: LucideProps) => <Info size={13} {...props} />;
export const PhoneIcon = (props: LucideProps) => <Smartphone size={11} {...props} />;
export const HomeIcon = (props: LucideProps) => <Home size={18} {...props} />;
export const PencilIcon = (props: LucideProps) => <SquarePen size={18} {...props} />;
export const RefreshIcon = (props: LucideProps) => <RotateCcw size={11} {...props} />;
export const StarFilledIcon = (props: LucideProps) => <Star size={14} fill="currentColor" {...props} />;
export const PhoneCallIcon = (props: LucideProps) => <Phone size={18} {...props} />;
export const MailIcon = (props: LucideProps) => <Mail size={18} {...props} />;
export const PlusIcon = (props: LucideProps) => <Plus size={18} {...props} />;
export const SearchIcon = (props: LucideProps) => <Search size={18} {...props} />;
export const XIcon = (props: LucideProps) => <X size={18} {...props} />;
export const CalendarIcon = (props: LucideProps) => <Calendar size={18} {...props} />;
export const ClockIcon = (props: LucideProps) => <Clock size={18} {...props} />;
export const DollarIcon = (props: LucideProps) => <DollarSign size={18} {...props} />;
export const CheckCircleIcon = (props: LucideProps) => <CircleCheck size={18} {...props} />;
export const TrashIcon = (props: LucideProps) => <Trash2 size={18} {...props} />;
export const BellIcon = (props: LucideProps) => <Bell size={18} {...props} />;
export const ClipboardCheckIcon = (props: LucideProps) => <ClipboardCheck size={18} {...props} />;
export const LogOutIcon = (props: LucideProps) => <LogOut size={18} {...props} />;
export const SunIcon = (props: LucideProps) => <Sun size={18} {...props} />;
export const MoonIcon = (props: LucideProps) => <Moon size={18} {...props} />;
export const CameraIcon = (props: LucideProps) => <Camera size={18} {...props} />;
export const ImageIcon = (props: LucideProps) => <Image size={18} {...props} />;
export const ExpandIcon = (props: LucideProps) => <Maximize2 size={18} {...props} />;
export const TrendUpIcon = (props: LucideProps) => <TrendingUp size={18} {...props} />;
export const TrendDownIcon = (props: LucideProps) => <TrendingDown size={18} {...props} />;
export const MenuIcon = (props: LucideProps) => <Menu size={18} {...props} />;
export const BuildingIcon = (props: LucideProps) => <Building2 size={18} {...props} />;
export const InvoiceIcon = (props: LucideProps) => <FileText size={18} {...props} />;
export const UploadIcon = (props: LucideProps) => <Upload size={18} {...props} />;
export const AlertCircleIcon = (props: LucideProps) => <CircleAlert size={18} {...props} />;
export const SparklesIcon = (props: LucideProps) => <Sparkles size={18} {...props} />;
export const HardHatIcon = (props: LucideProps) => <HardHat size={18} {...props} />;
export const NotebookPenIcon = (props: LucideProps) => <NotebookPen size={18} {...props} />;
export const HistoryIcon = (props: LucideProps) => <History size={18} {...props} />;

// ---------------------------------------------------------------------------
// Custom icons — no lucide equivalent
// ---------------------------------------------------------------------------

export function ApplianceIcon(props: IconProps) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props} aria-hidden="true">
      <rect x="3" y="2" width="18" height="20" rx="2" />
      <circle cx="12" cy="13" r="4" />
      <line x1="7" y1="6" x2="8" y2="6" />
      <line x1="11" y1="6" x2="17" y2="6" />
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

export function CheckCircleSolidIcon(props: IconProps) {
  return (
    <svg width={30} height={30} viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props} aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  );
}

export function InvoiceSolidIcon(props: IconProps) {
  return (
    <svg width={30} height={30} viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props} aria-hidden="true">
      <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zM8 13h8v2H8v-2zm0 4h8v2H8v-2zm0-8h3v2H8V9z" />
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
