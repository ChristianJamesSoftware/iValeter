import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  Users,
  CalendarDays,
  Building2,
  Settings,
  Receipt,
  Activity,
  RefreshCw,
  Clock,
  Umbrella,
  GraduationCap,
  ShieldCheck,
  Banknote,
  Minus,
  FileText,
  BarChart2,
  UserCog,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

export type NavIconName =
  | "dashboard"
  | "calendar"
  | "bookings"
  | "new"
  | "team"
  | "holiday"
  | "building"
  | "settings"
  | "billing"
  | "ops"
  | "recurring"
  | "attendance"
  | "umbrella"
  | "training"
  | "compliance"
  | "payroll"
  | "deductions"
  | "quote"
  | "reports"
  | "impersonate"
  | "support";

export const NAV_ICONS: Record<NavIconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  calendar: CalendarDays,
  bookings: ClipboardList,
  new: PlusCircle,
  team: Users,
  holiday: CalendarDays,
  building: Building2,
  settings: Settings,
  billing: Receipt,
  ops: Activity,
  recurring: RefreshCw,
  attendance: Clock,
  umbrella: Umbrella,
  training: GraduationCap,
  compliance: ShieldCheck,
  payroll: Banknote,
  deductions: Minus,
  quote: FileText,
  reports: BarChart2,
  impersonate: UserCog,
  support: HelpCircle,
};
