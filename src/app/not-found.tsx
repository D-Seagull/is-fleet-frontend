import { ErrorPage } from "@/components/error-page";

export default function NotFound() {
  return (
    <ErrorPage
      code="404"
      title="Wrong turn"
      message="This road doesn't lead anywhere. The page you're looking for took a detour or never existed."
      action={{ label: "Back on track", href: "/" }}
    />
  );
}
