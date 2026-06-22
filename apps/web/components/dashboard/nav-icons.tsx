import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  Users,
  CalendarDays,
  Building2,
  Settings,
  Receipt,
  type LucideIcon,
} from "lucide-react";

export type NavIconName =
  | "dashboard"
  | "bookings"
  | "new"
  | "team"
  | "holiday"
  | "building"
  | "settings"
  | "billing";

export const NAV_ICONS: Record<NavIconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  bookings: ClipboardList,
  new: PlusCircle,
  team: Users,
  holiday: CalendarDays,
  building: Building2,
  settings: Settings,
  billing: Receipt,
};
