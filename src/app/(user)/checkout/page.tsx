"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Suspense } from "react";
import { buildGoogleCalendarUrl } from "@/lib/utils";
import type { Event } from "@/types/database";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const isFree = searchParams.get("free") === "true";
  const eventId = searchParams.get("event_id");
  const [event, setEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (eventId && status === "success") {
      fetch(`/api/events/${eventId}`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => setEvent(data))
        .catch(() => {});
    }
  }, [eventId, status]);

  if (status === "success") {
    const calendarUrl = event
      ? buildGoogleCalendarUrl({
          title: event.title,
          date: event.event_date,
          venue: event.venue,
          description: event.description,
        })
      : null;

    return (
      <Card className="text-center">
        <CardHeader>
          <div className="text-5xl mb-4">&#10003;</div>
          <CardTitle className="text-xl">
            {isFree ? "予約が完了しました" : "決済が完了しました"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {isFree
              ? "イベントへの予約が確定しました。"
              : "お支払いが完了し、予約が確定しました。確認メールをお送りしました。"}
          </p>
          <div className="flex flex-col gap-2">
            {calendarUrl && (
              <a href={calendarUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="w-full">
                  Googleカレンダーに登録
                </Button>
              </a>
            )}
            <Link href="/reservations">
              <Button className="w-full">マイ予約を確認する</Button>
            </Link>
            <Link href="/events">
              <Button variant="outline" className="w-full">
                イベント一覧へ戻る
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "cancel") {
    return (
      <Card className="text-center">
        <CardHeader>
          <div className="text-5xl mb-4">&#10007;</div>
          <CardTitle className="text-xl">決済がキャンセルされました</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            お支払いがキャンセルされました。予約は確定していません。
          </p>
          <Link href="/events">
            <Button className="w-full">イベント一覧へ戻る</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex justify-center py-12">
      <p className="text-muted-foreground">不正なアクセスです</p>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
