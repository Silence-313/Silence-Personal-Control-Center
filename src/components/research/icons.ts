import {
  BookOpen,
  Database,
  FileText,
  FlaskConical,
  FolderGit2,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

import type { ResearchTypeKey } from "@/lib/research";

export const RESEARCH_ICONS: Record<ResearchTypeKey, LucideIcon> = {
  projects: FolderGit2,
  papers: FileText,
  datasets: Database,
  experiments: FlaskConical,
  reports: ScrollText,
  notes: BookOpen,
};