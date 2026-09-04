"use client";

import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useI18n } from "@/lib/i18n";
import { entityIdOf, RELATION_LABEL, TYPE_LABEL } from "@/lib/knowledge";
import type { ContextData } from "@/types";

interface ContextViewProps {
  context: ContextData;
}

export function ContextView({ context }: ContextViewProps) {
  const { t } = useI18n();
  const title = (context.entity?.title as string | undefined) ?? context.id;
  const fields = Object.entries(context.entity ?? {}).filter(
    ([k, v]) =>
      !["id", "title", "type"].includes(k) &&
      (typeof v === "string" || typeof v === "number") &&
      v !== "",
  );

  const related = [
    { title: t("knowledge.relatedProjects", "Related projects"), rows: context.projects.map((p) => ({ id: p.id, label: p.name })) },
    { title: t("knowledge.relatedAgents", "Related agents"), rows: context.agents.map((a) => ({ id: a.id, label: a.name })) },
    { title: t("knowledge.relatedSessions", "Related sessions"), rows: context.sessions.map((s) => ({ id: s.id, label: s.id })) },
    {
      title: t("knowledge.relatedResearch", "Related research"),
      rows: context.researchProjects.map((r) => ({ id: r.id, label: r.name })),
    },
  ].filter((section) => section.rows.length > 0);

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight text-text-primary">{title}</h2>
          <span className="rounded-control bg-surface-3 px-2 py-0.5 text-[11px] text-text-secondary">
            {t(`type.${context.type}`, TYPE_LABEL[context.type])}
          </span>
        </div>
        {fields.length > 0 && (
          <dl className="mt-3 grid gap-y-1 sm:grid-cols-2">
            {fields.slice(0, 8).map(([key, value]) => (
              <div key={key} className="flex gap-2 text-[13px]">
                <dt className="shrink-0 text-text-muted">{key}</dt>
                <dd className="truncate text-text-secondary">{String(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </Card>

      <Card>
        <SectionHeading title={t("knowledge.relations", "Relations")} />
        {context.relations.length === 0 ? (
          <p className="px-5 pb-4 text-[13px] text-text-muted">
            {t("knowledge.noRelations", "No relations")}
          </p>
        ) : (
          <ul className="px-5 pb-4">
            {context.relations.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-border-soft py-2 text-[13px] last:border-0"
              >
                <span className="text-text-primary">{entityIdOf(r.sourceId)}</span>
                <span className="text-text-muted">
                  {t(`relation.${r.relationType}`, RELATION_LABEL[r.relationType])}
                </span>
                <span className="text-text-primary">{entityIdOf(r.targetId)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {related.map((section) => (
        <Card key={section.title}>
          <SectionHeading title={section.title} />
          <ul className="px-5 pb-4">
            {section.rows.map((row) => (
              <li key={row.id} className="border-b border-border-soft py-2 text-[13px] text-text-primary last:border-0">
                {row.label}
              </li>
            ))}
          </ul>
        </Card>
      ))}

      {context.activities.length > 0 && (
        <Card>
          <SectionHeading title={t("knowledge.relatedActivities", "Related activities")} />
          <ActivityTimeline activities={context.activities.slice(0, 10)} />
        </Card>
      )}
    </div>
  );
}