import { Link } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";

const InvalidInvite = () => {
  const t = useTranslations("invalidInvite");
  return (
    <div className="relative  w-screen flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login">
            <Button className="w-full">{t("goToLogin")}</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvalidInvite;
