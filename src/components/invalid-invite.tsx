import { Link } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";

const InvalidInvite = () => {
  return (
    <div className="relative  w-screen flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Невалідне посилання</CardTitle>
          <CardDescription>
            Для реєстрації потрібне запрошення від адміністратора
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login">
            <Button className="w-full">Перейти до входу</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvalidInvite;
