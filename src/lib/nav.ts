import {
  Activity,
  Bot,
  Cpu,
  Database,
  FlaskConical,
  FolderGit2,
  LayoutDashboard,
  List,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  /** i18n lookup key (e.g. "dashboard"). */
  key: string;
  /** English label (fallback). */
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", key: "projects", label: "Projects", icon: FolderGit2 },
  { href: "/agents", key: "agents", label: "Agents", icon: Bot },
  { href: "/sessions", key: "sessions", label: "Sessions", icon: List },
  { href: "/research", key: "research", label: "Research", icon: FlaskConical },
  { href: "/robotics", key: "robotics", label: "Robotics", icon: Cpu },
  { href: "/data-center", key: "dataCenter", label: "Data Center", icon: Database },
  { href: "/activity", key: "activity", label: "Activity", icon: Activity },
];

export function isPathActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}