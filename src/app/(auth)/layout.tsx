import AuthLayout from "@/components/auth-layout";

export default function AuthPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthLayout>
      <div className="min-h-screen flex items-center justify-center">
        {children}
      </div>
    </AuthLayout>
  );
}
