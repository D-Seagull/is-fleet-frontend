"use client";

import Link from "next/link";
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
  const { data: companies, isLoading, isError } = useCompanies();

  return (
    <div className="p-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Компанії</h1>
          <span className="text-muted-foreground text-sm ml-1">
            ({companies?.length ?? 0})
          </span>
        </div>
        <NewCompanyDialog />
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Завантаження компаній...
        </div>
      )}

      {isError && (
        <div className="text-destructive text-sm">
          Помилка завантаження компаній
        </div>
      )}

      {!isLoading && !isError && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Назва</TableHead>
              <TableHead>Юзерів</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Дата реєстрації</TableHead>
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
                        <XCircle className="h-3 w-3" /> Деактивована
                      </Badge>
                    ) : (
                      <Badge className="gap-1 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/30">
                        <CheckCircle2 className="h-3 w-3" /> Активна
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
                  Компаній ще немає — натисніть{" "}
                  <span className="font-medium">Нова компанія</span>.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
