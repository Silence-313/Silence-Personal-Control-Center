"use client";

import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useI18n } from "@/lib/i18n";
import type { AutomationRuleState } from "@/types";

interface AutomationRulesProps {
  rules: AutomationRuleState[];
}

export function AutomationRules({ rules }: AutomationRulesProps) {
  const { t } = useI18n();

  return (
    <Card>
      <SectionHeading title={t("automation.rules", "Automation rules")} />
      {rules.length === 0 ? (
        <p className="px-5 pb-4 text-[13px] text-text-muted">
          {t("automation.empty", "No rules yet.")}
        </p>
      ) : (
        <ul className="px-5 pb-4">
          {rules.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 border-b border-border-soft py-2 last:border-0"
            >
              <div>
                <div className="text-sm font-medium text-text-primary">{r.name}</div>
                <div className="text-[12px] text-text-muted">
                  {t("automation.trigger", "Trigger")}: {r.triggerType}
                  {r.triggerValue ? ` = ${r.triggerValue}` : ""}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[12px] tabular-nums text-text-secondary">
                  {t("automation.runs", "{count} runs", { count: r.runCount })}
                </div>
                <div className="text-[11px] text-text-muted">
                  {r.enabled ? t("automation.enabled", "Enabled") : t("automation.disabled", "Disabled")}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}