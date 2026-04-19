"use client";

import { use, useState, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Star,
  User,
  Phone,
  Globe,
  UserCog,
  Truck,
  Loader2,
  MessageSquare,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useDriver,
  useDeactivateDriver,
  useActivateDriver,
  useDriverRatings,
  useUpsertDriverRating,
  useUpdateDriver,
  useCompanyDispatchers,
  type Language,
} from "@/hooks/use-drivers";
import { useTrucks } from "@/hooks/use-trucks";
import { useAuthStore } from "@/store/auth";

const languageLabels: Record<Language, string> = {
  UK: "Ukrainian",
  EN: "English",
  PL: "Polish",
  LT: "Lithuanian",
  UZ: "Uzbek",
  KZ: "Kazakh",
  HI: "Hindi",
  RU: "Russian",
};

const truckStatusColors: Record<string, string> = {
  AVAILABLE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  ON_TRIP: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  REPAIR: "bg-red-500/10 text-red-600 border-red-500/20",
};

const PHONE_REGEX = /^\+\d{7,15}$/;

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          className="focus:outline-none"
        >
          <Star
            className={`h-7 w-7 transition-colors ${
              n <= (hovered || value)
                ? "fill-yellow-500 text-yellow-500"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function RatingTab({ driverId }: { driverId: string }) {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useDriverRatings(driverId);
  const upsert = useUpsertDriverRating(driverId);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const ratings = data?.ratings ?? [];
  const averageRating = data?.averageRating ?? null;
  const ratingCount = data?.ratingCount ?? 0;
  const myExisting = ratings.find((r) => r.ratedBy.id === user?.id);

  async function handleSubmit() {
    if (score === 0) return;
    await upsert.mutateAsync({ score, comment: comment.trim() || undefined, anonymous });
    setScore(0);
    setComment("");
    setAnonymous(false);
    setShowAll(true);
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Overall Rating</CardTitle>
        </CardHeader>
        <CardContent>
          {averageRating !== null ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="text-4xl font-bold">
                  {averageRating.toFixed(1)}
                </span>
                <div className="flex flex-col gap-1">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`h-5 w-5 ${
                          n <= Math.round(averageRating)
                            ? "fill-yellow-500 text-yellow-500"
                            : "text-muted-foreground/20"
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => setShowAll((v) => !v)}
                    className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors text-left"
                  >
                    {showAll ? "Hide" : `Show all ${ratingCount} ${ratingCount === 1 ? "rating" : "ratings"}`}
                  </button>
                </div>
              </div>

              {showAll && (
                <div className="flex flex-col gap-2 border-t pt-3">
                  {ratings.map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-col gap-0.5 rounded-md border bg-muted/30 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              className={`h-3.5 w-3.5 ${
                                n <= r.score
                                  ? "fill-yellow-500 text-yellow-500"
                                  : "text-muted-foreground/20"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium">
                          {r.ratedBy.name ?? "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {r.comment && (
                        <p className="text-sm text-muted-foreground">"{r.comment}"</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No ratings yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {myExisting ? "Update your rating" : "Rate this driver"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {myExisting && (
            <div className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              Your current rating: {myExisting.score}/5
              {myExisting.comment && ` — "${myExisting.comment}"`}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label>Score</Label>
            <StarPicker value={score} onChange={setScore} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="rating-comment">Comment (optional)</Label>
            <Textarea
              id="rating-comment"
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="anon"
              checked={anonymous}
              onCheckedChange={(v) => setAnonymous(!!v)}
            />
            <Label htmlFor="anon" className="text-sm font-normal cursor-pointer">
              Leave anonymously
            </Label>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={score === 0 || upsert.isPending}
            className="w-fit"
          >
            {upsert.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {myExisting ? "Update" : "Submit"}
          </Button>
        </CardContent>
      </Card>

    </div>
  );
}

function DriverDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "info";

  const user = useAuthStore((s) => s.user);
  const { data: driver, isLoading } = useDriver(id);
  const deactivate = useDeactivateDriver();
  const activate = useActivateDriver();
  const updateDriver = useUpdateDriver(id);
  const { data: dispatchers } = useCompanyDispatchers();
  const { data: trucks } = useTrucks();
  const { data: ratingsData } = useDriverRatings(id);

  const [phone, setPhone] = useState("");
  const [phoneDirty, setPhoneDirty] = useState(false);

  useEffect(() => {
    if (driver?.phone) setPhone(driver.phone);
  }, [driver?.phone]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!driver) notFound();

  const isManager = user?.role === "TEAMLEAD" || user?.role === "ADMIN";
  const canToggle = isManager || user?.role === "DISPATCHER";
  const phoneValid = PHONE_REGEX.test(phone);

  const availableTrucks = (trucks ?? []).filter(
    (t) => t.currentDriverId === null || t.currentDriverId === driver.id,
  );

  function handlePhoneChange(val: string) {
    setPhone(val);
    setPhoneDirty(val !== (driver?.phone ?? ""));
  }

  async function handlePhoneSave() {
    if (!phoneValid) return;
    await updateDriver.mutateAsync({ phone });
    setPhoneDirty(false);
  }

  function handlePhoneCancel() {
    setPhone(driver?.phone ?? "");
    setPhoneDirty(false);
  }

  return (
    <div className="flex flex-col p-4 gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/drivers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <h1 className="text-2xl font-bold">{driver.name ?? "—"}</h1>
          <Badge
            variant="outline"
            className={
              driver.isActive
                ? "bg-green-500/10 text-green-600 border-green-500/20"
                : "bg-gray-500/10 text-gray-500 border-gray-500/20"
            }
          >
            {driver.isActive ? "Active" : "Inactive"}
          </Badge>
          {driver.averageRating !== null && (
            <div className="flex items-center gap-1 ml-1">
              <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
              <span className="text-sm font-medium">
                {driver.averageRating.toFixed(1)}
              </span>
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/chat?userId=${driver.id}`}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Chat
          </Link>
        </Button>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="rating">
            Rating
            {(ratingsData?.ratingCount ?? 0) > 0 && (
              <span className="ml-1.5 flex items-center gap-1 text-xs">
                <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                {ratingsData?.averageRating?.toFixed(1)}
                <span className="text-muted-foreground">({ratingsData?.ratingCount})</span>
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            onClick={() => router.push(`/chat?userId=${driver.id}`)}
          >
            Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-6 md:flex-row md:items-start">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={driver.avatar ?? undefined} />
                  <AvatarFallback>
                    <User className="h-12 w-12" />
                  </AvatarFallback>
                </Avatar>

                <div className="flex flex-1 flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-semibold">
                      {driver.name ?? "—"}
                    </h2>
                    <Badge
                      variant="outline"
                      className={
                        driver.isActive
                          ? "bg-green-500/10 text-green-600 border-green-500/20"
                          : "bg-gray-500/10 text-gray-500 border-gray-500/20"
                      }
                    >
                      {driver.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Phone — editable */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted shrink-0 mt-0.5">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col gap-1 flex-1">
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <div className="flex items-center gap-2">
                          <Input
                            value={phone}
                            onChange={(e) => handlePhoneChange(e.target.value)}
                            placeholder="+12345678901"
                            className={`h-8 text-sm ${
                              phoneDirty && !phoneValid
                                ? "border-destructive focus-visible:ring-destructive"
                                : ""
                            }`}
                          />
                          {phoneDirty && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 shrink-0"
                                onClick={handlePhoneSave}
                                disabled={!phoneValid || updateDriver.isPending}
                              >
                                {updateDriver.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4 text-green-600" />
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 shrink-0"
                                onClick={handlePhoneCancel}
                              >
                                <X className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </>
                          )}
                        </div>
                        {phoneDirty && !phoneValid && (
                          <p className="text-xs text-destructive">
                            Format: +12345678901 (7–15 digits)
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Language */}
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted shrink-0">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Language
                        </p>
                        <p className="font-medium">
                          {languageLabels[driver.language]}
                        </p>
                      </div>
                    </div>

                    {/* Dispatcher — select */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted shrink-0 mt-0.5">
                        <UserCog className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col gap-1 flex-1">
                        <p className="text-sm text-muted-foreground">
                          Dispatcher
                        </p>
                        <Select
                          value={driver.dispatcher?.id ?? "none"}
                          onValueChange={(v) =>
                            updateDriver.mutate({
                              dispatcherId: v === "none" ? null : v,
                            })
                          }
                          disabled={updateDriver.isPending}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select dispatcher" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              No dispatcher
                            </SelectItem>
                            {(dispatchers ?? []).map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.name ?? d.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Truck — select */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted shrink-0 mt-0.5">
                        <Truck className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col gap-1 flex-1">
                        <p className="text-sm text-muted-foreground">
                          Assigned Truck
                        </p>
                        <Select
                          value={driver.currentTruck?.id ?? "none"}
                          onValueChange={(v) =>
                            updateDriver.mutate({
                              truckId: v === "none" ? null : v,
                            })
                          }
                          disabled={updateDriver.isPending}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select truck" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No truck</SelectItem>
                            {availableTrucks.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.plate}
                                {t.status !== "AVAILABLE" && (
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    ({t.status})
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Rating + Activate/Deactivate */}
                    <div className="flex flex-col gap-3 md:col-span-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted shrink-0">
                          <Star className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex flex-1 items-center justify-between gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Rating</p>
                            {driver.averageRating !== null ? (
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                                <span className="font-medium">
                                  {driver.averageRating.toFixed(1)} / 5
                                </span>
                              </div>
                            ) : (
                              <p className="font-medium text-muted-foreground">No ratings yet</p>
                            )}
                          </div>
                          {canToggle && (
                            <Button
                              variant={driver.isActive ? "destructive" : "default"}
                              size="sm"
                              onClick={() =>
                                driver.isActive
                                  ? deactivate.mutate(driver.id)
                                  : activate.mutate(driver.id)
                              }
                              disabled={deactivate.isPending || activate.isPending}
                            >
                              {(deactivate.isPending || activate.isPending) && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              {driver.isActive ? "Deactivate" : "Activate"}
                            </Button>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rating" className="mt-4">
          <RatingTab driverId={id} />
        </TabsContent>


      </Tabs>
    </div>
  );
}

export default function DriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Suspense>
      <DriverDetailContent id={id} />
    </Suspense>
  );
}
