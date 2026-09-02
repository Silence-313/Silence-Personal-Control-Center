"use client";

import Link from "next/link";

import { StatusDot } from "@/components/ui/StatusDot";
import { nodeStatus } from "@/lib/status";
import { useI18n } from "@/lib/i18n";
import { useNodes } from "@/hooks";

/** Primary node presence indicator in the sidebar footer. */
export function SidebarNodeStatus() {
  const { data } = useNodes();
  const { t } = useI18n();
  const node = data?.[0];

  if (!node) return null;
  const status = nodeStatus(node.status);

  return (
    <Link
      href={`/nodes/${node.id}`}
      className="flex items-center gap-2 rounded-control border border-border-soft bg-surface-2 px-3 py-2 transition-colors hover:border-border-strong"
    >
      <StatusDot tone={status.tone} pulsing={node.status === "online"} />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-[13px] font-medium text-text-primary">
          {node.name}
        </div>
        <div className="text-[11px] text-text-muted">
          {t("node.number", "Node #01", { n: 1 })}
        </div>
      </div>
    </Link>
  );
}