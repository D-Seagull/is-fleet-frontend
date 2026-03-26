import AuthLayout from "@/components/auth-layout";

export default function AuthPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthLayout>
      <div>{children}</div>
    </AuthLayout>
  );
}
