/**
 * What to tell the user when an upload is refused. The server answers 413
 * when a file is too large / too many at once, 415 for a type it doesn't
 * take (SVG, archives, executables…). `t` is useTranslations("common.upload").
 */
export function uploadErrorText(
  err: unknown,
  t: (key: "fileTooLarge" | "fileTypeNotSupported" | "failed") => string,
): string {
  const status = (err as { response?: { status?: number } } | null)?.response
    ?.status;
  if (status === 413) return t("fileTooLarge");
  if (status === 415) return t("fileTypeNotSupported");
  return t("failed");
}
