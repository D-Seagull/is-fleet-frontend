"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCompanies } from "@/hooks/use-companies";
import { Loader2, Building2, CheckCircle2, XCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { NewCompanyDialog } from "./_components/new-company-dialog";

export default function CompaniesPage() {
  const t = useTranslations("admin.companies");
  const tNew = useTranslations("admin.newCompany");
  const tDash = useTranslations("admin.dashboard");
  const { data: companies, isLoading, isError } = useCompanies();

  return (
    <div className="p-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <span className="text-muted-foreground text-sm ml-1">
            ({companies?.length ?? 0})
          </span>
        </div>
        <NewCompanyDialog />
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("loading")}
        </div>
      )}

      {isError && (
        <div className="text-destructive text-sm">{t("error")}</div>
      )}

      {!isLoading && !isError && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colName")}</TableHead>
              <TableHead>{t("colUsers")}</TableHead>
              <TableHead>{t("colStatus")}</TableHead>
              <TableHead>{t("colDate")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies?.map((company) => (
              <TableRow
                key={company.id}
                className="cursor-pointer hover:bg-muted/50"
              >
                <TableCell className="font-medium">
                  <Link
                    href={`/admin/companies/${company.id}`}
                    className="block"
                  >
                    {company.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/companies/${company.id}`}
                    className="block"
                  >
                    {company._count?.users ?? 0}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/companies/${company.id}`}
                    className="block"
                  >
                    {company.isActive === false ? (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" /> {tDash("statusDeactivated")}
                      </Badge>
                    ) : (
                      <Badge className="gap-1 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/30">
                        <CheckCircle2 className="h-3 w-3" /> {tDash("statusActive")}
                      </Badge>
                    )}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/companies/${company.id}`}
                    className="block"
                  >
                    {new Date(company.createdAt).toLocaleDateString("uk-UA")}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {companies?.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground py-8"
                >
                  {t("emptyHint", { button: tNew("button") })}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
