"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { nodeStatus } from "@/lib/status";
import { useI18n } from "@/lib/i18n";
import type { Node, NodeStatus } from "@/types";

interface NodeStatusCardProps {
  node: Node;
  statusOverride?: NodeStatus;
}

export function NodeStatusCard({ node, statusOverride }: NodeStatusCardProps) {
  const { t } = useI18n();
  const status = nodeStatus(statusOverride ?? node.status);

  return (
    <Link href={`/nodes/${node.id}`} className="block h-full">
      <Card
        interactive
        className="flex h-full flex-col justify-between p-4"
        aria-label={`Open ${node.name} detail`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-text-primary">
              {node.name}
            </div>
            <div className="mt-0.5 text-[12px] text-text-muted">
              {t("node.number", "Node #01", { n: 1 })} · {node.hardware.chip}
            </div>
          </div>
          <ChevronRight
            className="h-4 w-4 shrink-0 text-text-muted"
            aria-hidden="true"
          />
        </div>

        <div className="mt-4">
          <StatusBadge
            tone={status.tone}
            pulsing={(statusOverride ?? node.status) === "online"}
          >
            {t(`status.${status.key}`, status.label)}
          </StatusBadge>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border-soft pt-3 text-[12px]">
          <div>
            <div className="text-text-muted">{t("label.ram", "RAM")}</div>
            <div className="text-text-primary">{node.hardware.memoryGb} GB</div>
          </div>
          <div>
            <div className="text-text-muted">{t("label.cores", "Cores")}</div>
            <div className="text-text-primary">{node.hardware.cpuCores}</div>
          </div>
          <div>
            <div className="text-text-muted">{t("label.uptime", "Uptime")}</div>
            <div className="text-text-primary">{node.uptime}</div>
          </div>
        </div>
      </Card>
    </Link>
  );
}