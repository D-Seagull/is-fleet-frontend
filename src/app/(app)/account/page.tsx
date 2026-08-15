"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Camera,
  Globe,
  Loader2,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { isAxiosError } from "axios";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "@/store/auth";
import {
  Language,
  useDeleteAvatar,
  useUpdateMe,
  useUploadAvatar,
} from "@/hooks/use-avatar";
import { fullName, initials } from "@/lib/format";
import { AvatarCropperDialog } from "@/components/avatar-cropper-dialog";
import { UiLocalePicker } from "@/components/ui-locale-picker";
import { BackButton } from "@/components/back-button";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHONE_REGEX = /^\+?[\d\s\-()]{8,20}$/;
const LANGUAGE_KEYS: Language[] = [
  "UK",
  "EN",
  "PL",
  "LT",
  "UZ",
  "KZ",
  "HI",
  "RU",
];

function AvatarSection() {
  const t = useTranslations("account.avatar");
  const user = useUser();
  const upload = useUploadAvatar();
  const remove = useDeleteAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [cropFilename, setCropFilename] = useState<string | undefined>();

  const onPickFile = () => {
    setError(null);
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      setError(t("errorType"));
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError(t("errorSize"));
      return;
    }
    // Open the cropper instead of uploading right away — the user picks
    // the square they actually want; we ship that to the server.
    const url = URL.createObjectURL(file);
    setCropImage(url);
    setCropFilename(file.name);
    setCropperOpen(true);
  };

  const closeCropper = () => {
    setCropperOpen(false);
    if (cropImage) URL.revokeObjectURL(cropImage);
    setCropImage(null);
    setCropFilename(undefined);
  };

  const handleCropConfirm = async (blob: Blob) => {
    try {
      const ext = blob.type === "image/png" ? "png" : "jpg";
      const filename = cropFilename
        ? cropFilename.replace(/\.[^.]+$/, `.${ext}`)
        : `avatar.${ext}`;
      const file = new File([blob], filename, { type: blob.type });
      await upload.mutateAsync(file);
      closeCropper();
    } catch {
      setError(t("errorUpload"));
    }
  };

  const onRemove = async () => {
    setError(null);
    try {
      await remove.mutateAsync();
    } catch {
      setError(t("errorRemove"));
    }
  };

  const isBusy = upload.isPending || remove.isPending;

  return (
    <div className="flex items-center gap-6">
      <Avatar className="h-24 w-24">
        <AvatarImage src={user?.avatar ?? undefined} alt={fullName(user)} />
        <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
          {initials(user)}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-2">
        <div className="text-base font-medium">
          {fullName(user) || "—"}
        </div>
        <div className="text-sm text-muted-foreground">
          {user?.email ?? user?.role}
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <Button
            type="button"
            size="sm"
            onClick={onPickFile}
            disabled={isBusy}
          >
            {upload.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Camera className="mr-2 h-4 w-4" />
            )}
            {user?.avatar ? t("change") : t("upload")}
          </Button>
          {user?.avatar && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRemove}
              disabled={isBusy}
            >
              {remove.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {t("remove")}
            </Button>
          )}
        </div>
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_AVATAR_TYPES.join(",")}
        className="hidden"
        onChange={onFileChange}
      />
      <AvatarCropperDialog
        open={cropperOpen}
        imageSrc={cropImage}
        filename={cropFilename}
        onCancel={closeCropper}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
}

function ProfileForm() {
  const t = useTranslations("account.form");
  const tLangs = useTranslations("common.languages");
  const user = useUser();
  const updateMe = useUpdateMe();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState<Language>("EN");
  const [savedHint, setSavedHint] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending "saved" timer if the component unmounts mid-countdown.
  useEffect(
    () => () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    },
    [],
  );

  // Reset form whenever the underlying user row changes (login, refetch).
  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setPhone(user.phone ?? "");
    setLanguage((user.language as Language | undefined) ?? "EN");
    setSavedHint(false);
    setError(null);
  }, [user]);

  const trimmedFirst = firstName.trim();
  const trimmedLast = lastName.trim();
  const trimmedPhone = phone.trim();
  const phoneValid = trimmedPhone === "" || PHONE_REGEX.test(trimmedPhone);
  const isDirty =
    trimmedFirst !== (user?.firstName ?? "") ||
    trimmedLast !== (user?.lastName ?? "") ||
    trimmedPhone !== (user?.phone ?? "") ||
    language !== ((user?.language as Language | undefined) ?? "EN");
  const canSubmit =
    trimmedFirst.length >= 1 && phoneValid && isDirty && !updateMe.isPending;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    try {
      await updateMe.mutateAsync({
        firstName: trimmedFirst,
        lastName: trimmedLast || null,
        phone: trimmedPhone || undefined,
        language,
      });
      setSavedHint(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSavedHint(false), 2500);
    } catch (err) {
      if (isAxiosError(err)) {
        const data = err.response?.data as
          | { message?: string | string[] }
          | undefined;
        const msg = Array.isArray(data?.message)
          ? data?.message?.[0]
          : data?.message;
        setError(msg ?? t("saveError"));
      } else {
        setError(t("saveError"));
      }
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4 max-w-2xl">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="firstName">{t("firstName")}</Label>
          <Input
            id="firstName"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="lastName">{t("lastName")}</Label>
          <Input
            id="lastName"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">{t("phone")}</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={t("phonePlaceholder")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-invalid={!phoneValid}
            className={!phoneValid ? "border-destructive" : undefined}
          />
          {!phoneValid && (
            <p className="text-xs text-destructive">
              {t("phoneFormatError")}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="language">{t("chatLanguage")}</Label>
          <Select
            value={language}
            onValueChange={(v) => setLanguage(v as Language)}
          >
            <SelectTrigger id="language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_KEYS.map((val) => (
                <SelectItem key={val} value={val}>
                  {tLangs(val)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {savedHint && (
        <p className="text-sm text-emerald-600">{t("saveSuccess")}</p>
      )}

      <div>
        <Button type="submit" disabled={!canSubmit}>
          {updateMe.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}

export default function AccountSettingsPage() {
  const t = useTranslations("account");
  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center gap-2">
        <BackButton />
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            <CardTitle>{t("profile.title")}</CardTitle>
          </div>
          <CardDescription>{t("profile.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-8">
          <AvatarSection />
          <ProfileForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            <CardTitle>{t("uiLocale.title")}</CardTitle>
          </div>
          <CardDescription>{t("uiLocale.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <UiLocalePicker />
        </CardContent>
      </Card>
    </div>
  );
}
