"use client";

import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { serviceStatus } from "@/lib/status";
import { useI18n } from "@/lib/i18n";
import type { Service } from "@/types";

interface DockerStatusCardProps {
  services: Service[];
  running: number;
  stopped: number;
}

export function DockerStatusCard({
  services,
  running,
  stopped,
}: DockerStatusCardProps) {
  const { t } = useI18n();
  const docker = services.filter((s) => s.type === "docker");
  const visible = docker.slice(0, 6);

  return (
    <Card>
      <SectionHeading
        title={t("section.docker", "Docker")}
        action={
          <span className="text-[12px] tabular-nums text-text-muted">
            {t("docker.summary", "{running} running · {stopped} stopped", {
              running,
              stopped,
            })}
          </span>
        }
      />
      <ul className="px-3 pb-3">
        {visible.map((s) => {
          const status = serviceStatus(s.status);
          return (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-control px-2 py-2.5"
            >
              <span className="truncate text-[14px] text-text-primary">
                {s.name}
              </span>
              <StatusBadge
                tone={status.tone}
                pulsing={s.status === "running"}
              >
                {t(`status.${status.key}`, status.label)}
              </StatusBadge>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}