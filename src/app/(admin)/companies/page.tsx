"use client";

import { useCompanies } from "@/hooks/use-companies";
import { Loader2, Building2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CompaniesPage() {
  const { data: companies, isLoading, isError } = useCompanies();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Завантаження компаній...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-destructive text-sm">
        Помилка завантаження компаній
      </div>
    );
  }

  return (
    <div className="p-6 w-full">
      <div className="flex items-center gap-2 mb-6">
        <Building2 className="h-5 w-5" />
        <h1 className="text-xl font-semibold">Компанії</h1>
        <span className="text-muted-foreground text-sm ml-1">
          ({companies?.length ?? 0})
        </span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Назва</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Дата реєстрації</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies?.map((company) => (
            <TableRow key={company.id}>
              <TableCell className="font-medium">{company.name}</TableCell>
              <TableCell>{company.email}</TableCell>
              <TableCell>
                {new Date(company.createdAt).toLocaleDateString("uk-UA")}
              </TableCell>
            </TableRow>
          ))}
          {companies?.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={3}
                className="text-center text-muted-foreground py-8"
              >
                Компаній ще немає
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
