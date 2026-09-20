import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IS Fleet",
  description: "Fleet management system",
  // Іконки НЕ перелічуємо вручну: Next бере app/icon.png, app/apple-icon.png
  // і app/favicon.ico за файловою угодою. Явний список тут перебивав їх і
  // тримав старий фавікон навіть після заміни файлів.
};

// Колір системної смуги у встановленому застосунку і в мобільному браузері.
// Живе саме тут, а не в metadata: у Next 15+ themeColor переїхав у viewport.
export const viewport: Viewport = {
  themeColor: "#0F172A",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Resolved on the server via src/i18n/request.ts (reads the `locale`
  // cookie, falls back to `uk`). Streamed down as a Context so every
  // client component under this tree can call `useTranslations()`.
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geist.className} antialiased`} suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Providers>{children}</Providers>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
