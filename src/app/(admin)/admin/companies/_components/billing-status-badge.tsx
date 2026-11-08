import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { BillingStatus } from "@/hooks/use-admin-billing";

const CLASS: Record<BillingStatus, string> = {
  TRIAL: "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30",
  PILOT: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
  PAYING:
    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  OVERDUE: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  DEACTIVATED: "bg-destructive/15 text-destructive border-destructive/30",
};

export function BillingStatusBadge({ status }: { status: BillingStatus }) {
  const t = useTranslations("admin.billing.status");
  return (
    <Badge variant="outline" className={CLASS[status]}>
      {t(status)}
    </Badge>
  );
}
