"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateCompany } from "@/hooks/use-companies";

const initialForm = { name: "", email: "" };

export function NewCompanyDialog() {
  const t = useTranslations("admin.newCompany");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const { mutateAsync, isPending } = useCreateCompany();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isPending) return;
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await mutateAsync(form);
      setForm(initialForm);
      setOpen(false);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string | { message?: string } } } };
      const msg = e.response?.data?.message;
      setError(
        (typeof msg === "string" ? msg : msg?.message) ?? t("error"),
      );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!isPending) {
          setOpen(v);
          if (!v) {
            setForm(initialForm);
            setError("");
          }
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t("button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">{t("companyLabel")}</Label>
            <Input
              id="name"
              name="name"
              placeholder="IS Fleet"
              value={form.name}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">{t("emailLabel")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@company.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("submitLoading")}
                </>
              ) : (
                t("submit")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
