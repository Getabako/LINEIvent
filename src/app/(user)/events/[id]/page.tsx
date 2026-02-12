"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useLiffContext } from "@/components/liff-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatPrice } from "@/lib/utils";
import type { Event } from "@/types/database";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isReady, isLoggedIn, isAuthenticating, profile, login } =
    useLiffContext();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [remainingCapacity, setRemainingCapacity] = useState<number | null>(
    null
  );

  useEffect(() => {
    async function loadEvent() {
      try {
        const res = await fetch(`/api/events/${id}`);
        if (res.ok) {
          const data = await res.json();
          setEvent(data);
        }
      } catch (error) {
        console.error("Failed to load event:", error);
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, [id]);

  useEffect(() => {
    async function loadCapacity() {
      if (!event || event.capacity === 0) return;

      try {
        const res = await fetch(`/api/reservations?event_id=${event.id}&count=true`);
        if (res.ok) {
          const { count } = await res.json();
          setRemainingCapacity(event.capacity - count);
        }
      } catch {
        // ignore
      }
    }

    loadCapacity();
  }, [event]);

  async function handleReserve() {
    if (!isLoggedIn) {
      login();
      return;
    }

    if (!profile || !event) return;

    setReserving(true);
    try {
      if (event.price === 0) {
        // Free event — create reservation directly
        const res = await fetch("/api/reservations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event_id: event.id }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "予約に失敗しました");
        }

        router.push(`/checkout?event_id=${event.id}&status=success&free=true`);
      } else {
        // Paid event — create Stripe Checkout
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event_id: event.id }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "決済の開始に失敗しました");
        }

        const { url } = await res.json();
        window.location.href = url;
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setReserving(false);
    }
  }

  if (!isReady || isAuthenticating || loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-muted-foreground">イベントが見つかりません</p>
      </div>
    );
  }

  const isSoldOut = remainingCapacity !== null && remainingCapacity <= 0;

  return (
    <div className="space-y-6">
      {event.image_url && (
        <div className="relative aspect-video rounded-lg overflow-hidden">
          <Image
            src={event.image_url}
            alt={event.title}
            fill
            className="object-cover"
          />
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold mb-2">{event.title}</h1>
        <div className="flex gap-2 mb-4">
          <Badge variant={event.price === 0 ? "secondary" : "default"}>
            {event.price === 0 ? "無料" : formatPrice(event.price)}
          </Badge>
          {isSoldOut && <Badge variant="destructive">満席</Badge>}
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">日時</p>
            <p className="font-medium">{formatDate(event.event_date)}</p>
          </div>
          <Separator />
          <div>
            <p className="text-sm text-muted-foreground">会場</p>
            <p className="font-medium">{event.venue}</p>
          </div>
          {event.capacity > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">定員</p>
                <p className="font-medium">
                  {event.capacity}名
                  {remainingCapacity !== null && (
                    <span className="text-muted-foreground ml-2">
                      (残り {remainingCapacity}名)
                    </span>
                  )}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {event.description && (
        <div>
          <h2 className="font-bold mb-2">イベント詳細</h2>
          <p className="text-sm whitespace-pre-wrap">{event.description}</p>
        </div>
      )}

      <div className="sticky bottom-4">
        <Button
          className="w-full h-12 text-lg"
          onClick={handleReserve}
          disabled={reserving || isSoldOut}
        >
          {!isLoggedIn
            ? "LINEログインして予約する"
            : isSoldOut
              ? "満席"
              : reserving
                ? "処理中..."
                : event.price === 0
                  ? "無料で予約する"
                  : `${formatPrice(event.price)} で予約する`}
        </Button>
      </div>
    </div>
  );
}
