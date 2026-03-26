import AdminLayout from "@/components/admin-layout";

export default function AuthPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminLayout>
      <div className=" flex items-center justify-center">{children}</div>
    </AdminLayout>
  );
}
