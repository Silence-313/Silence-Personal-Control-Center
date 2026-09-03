"use client";

import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatRelativeAgo } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import {
  formatBytes,
  RESEARCH_META,
  toResearchDetailFields,
  toResearchListItem,
  type ResearchEntity,
  type ResearchField,
  type ResearchResolvers,
  type ResearchTypeKey,
} from "@/lib/research";
import { cn } from "@/lib/utils";

import { RuntimeBadge } from "./RuntimeBadge";

const MONO_KEYS = new Set([
  "label.command",
  "label.metrics",
  "label.metadata",
  "label.path",
  "label.pdfPath",
  "label.repositoryPath",
  "label.artifactPath",
  "label.url",
  "label.doi",
  "label.version",
]);

function Field({ field }: { field: ResearchField }) {
  const { t } = useI18n();
  const value = field.valueKey ? t(field.valueKey, field.value) : field.value;
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-[13px] text-text-muted">{t(field.key, field.fallback)}</dt>
      <dd
        className={cn(
          "min-w-0 break-all text-right text-[13px] text-text-primary",
          MONO_KEYS.has(field.key) && "font-mono",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

interface ResearchDetailProps {
  type: ResearchTypeKey;
  item: ResearchEntity;
  resolve?: ResearchResolvers;
}

export function ResearchDetail({ type, item, resolve }: ResearchDetailProps) {
  const { t } = useI18n();
  const li = toResearchListItem(type, item);
  const fields = toResearchDetailFields(type, item, resolve);
  const runtime = item.runtime ?? undefined;

  return (
    <>
      <PageHeader
        title={li.title}
        description={li.subtitle}
        actions={
          li.status && (
            <StatusBadge tone={li.status.tone}>
              {t(`status.${li.status.key}`, li.status.label)}
            </StatusBadge>
          )
        }
      />

      <Card>
        <SectionHeading title={t(RESEARCH_META[type].labelKey, RESEARCH_META[type].plural)} />
        <dl className="px-5 pb-5">
          {fields.map((field, i) => (
            <Field key={`${field.key}-${i}`} field={field} />
          ))}
        </dl>
      </Card>

      {runtime !== undefined && (
        <Card>
          <SectionHeading title={t("research.runtimeSection", "On-disk status")} />
          <div className="px-5 pb-5">
            <div className="flex items-center gap-3 py-1.5">
              <RuntimeBadge runtime={runtime} />
              {runtime.error && (
                <span className="font-mono text-[12px] text-text-muted">
                  {runtime.error}
                </span>
              )}
            </div>
            <dl>
              {runtime.sizeBytes !== undefined && runtime.sizeBytes !== null && (
                <div className="flex items-start justify-between gap-4 py-1.5">
                  <dt className="shrink-0 text-[13px] text-text-muted">
                    {t("label.size", "Size")}
                  </dt>
                  <dd className="min-w-0 break-all text-right text-[13px] text-text-primary">
                    {formatBytes(runtime.sizeBytes)}
                  </dd>
                </div>
              )}
              {runtime.modifiedAt && (
                <div className="flex items-start justify-between gap-4 py-1.5">
                  <dt className="shrink-0 text-[13px] text-text-muted">
                    {t("label.modifiedAt", "Modified")}
                  </dt>
                  <dd className="min-w-0 break-all text-right text-[13px] text-text-primary">
                    {formatRelativeAgo(runtime.modifiedAt)}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </Card>
      )}

      {type === "experiments" && (
        <p className="text-[12px] text-text-muted">
          {t("research.commandNote", "Commands are display-only and are never executed.")}
        </p>
      )}
    </>
  );
}