import Link from "next/link";

/**
 * Standalone shell for the public legal pages. Deliberately free of the app
 * chrome (sidebar, auth state, query client side effects): these pages are
 * read by store reviewers who are not signed in, so they must render fully on
 * their own. Route access is granted in src/lib/routes.ts — both guards read
 * that list.
 */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="text-base font-semibold tracking-tight">
            IS Fleet
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/delete-account" className="hover:text-foreground">
              Delete account
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t">
        <div className="mx-auto w-full max-w-3xl px-5 py-6 text-sm text-muted-foreground">
          IS Fleet
        </div>
      </footer>
    </div>
  );
}
