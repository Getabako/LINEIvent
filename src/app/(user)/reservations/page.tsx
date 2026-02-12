"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiffContext } from "@/components/liff-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate, formatPrice } from "@/lib/utils";
import type { ReservationWithEvent } from "@/types/database";

const statusLabels: Record<string, string> = {
  pending: "保留中",
  confirmed: "確定",
  cancelled: "キャンセル済",
  checked_in: "チェックイン済",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  confirmed: "default",
  cancelled: "destructive",
  checked_in: "secondary",
};

const paymentLabels: Record<string, string> = {
  unpaid: "未払い",
  paid: "支払済",
  refunded: "返金済",
};

export default function ReservationsPage() {
  const { isReady, isLoggedIn, isAuthenticating, login } = useLiffContext();
  const [reservations, setReservations] = useState<ReservationWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadReservations() {
      try {
        const res = await fetch("/api/reservations");
        if (res.ok) {
          const data = await res.json();
          setReservations(data);
        }
      } catch (error) {
        console.error("Failed to load reservations:", error);
      } finally {
        setLoading(false);
      }
    }

    if (isReady && isLoggedIn && !isAuthenticating) {
      loadReservations();
    } else if (isReady && !isAuthenticating) {
      setLoading(false);
    }
  }, [isReady, isLoggedIn, isAuthenticating]);

  async function handleCancel(reservationId: string) {
    if (!confirm("この予約をキャンセルしますか？")) return;

    setCancellingId(reservationId);
    try {
      const res = await fetch(`/api/reservations/${reservationId}/cancel`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "キャンセルに失敗しました");
      }

      // Reload reservations
      const reloadRes = await fetch("/api/reservations");
      if (reloadRes.ok) {
        setReservations(await reloadRes.json());
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setCancellingId(null);
    }
  }

  if (!isReady || isAuthenticating) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center py-12 space-y-4">
        <p className="text-muted-foreground">
          予約一覧を見るにはログインしてください
        </p>
        <Button onClick={login}>LINEでログイン</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-muted-foreground">予約を読み込み中...</p>
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 space-y-4">
        <p className="text-muted-foreground">予約はまだありません</p>
        <Link href="/events">
          <Button variant="outline">イベント一覧を見る</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">マイ予約</h2>
      <div className="space-y-3">
        {reservations.map((reservation) => (
          <Card key={reservation.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {reservation.events.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {formatDate(reservation.events.event_date)}
              </p>
              <p className="text-sm text-muted-foreground">
                {reservation.events.venue}
              </p>
              <div className="flex items-center gap-2">
                <Badge variant={statusVariant[reservation.status]}>
                  {statusLabels[reservation.status]}
                </Badge>
                {reservation.amount > 0 && (
                  <Badge variant="outline">
                    {formatPrice(reservation.amount)} ({paymentLabels[reservation.payment_status]})
                  </Badge>
                )}
              </div>
              {(reservation.status === "confirmed" ||
                reservation.status === "pending") && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleCancel(reservation.id)}
                  disabled={cancellingId === reservation.id}
                >
                  {cancellingId === reservation.id
                    ? "キャンセル中..."
                    : "予約をキャンセル"}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
