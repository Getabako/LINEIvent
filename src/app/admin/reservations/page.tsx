"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateShort, formatPrice } from "@/lib/utils";
import type { ReservationWithProfile } from "@/types/database";

const statusLabels: Record<string, string> = {
  pending: "保留中",
  confirmed: "確定",
  cancelled: "キャンセル済",
  checked_in: "チェックイン済",
};

const statusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "outline",
  confirmed: "default",
  cancelled: "destructive",
  checked_in: "secondary",
};

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<ReservationWithProfile[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function loadReservations() {
    try {
      const res = await fetch("/api/reservations");
      if (res.ok) {
        setReservations(await res.json());
      }
    } catch (error) {
      console.error("Failed to load reservations:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReservations();
  }, []);

  async function handleCheckin(reservationId: string) {
    setActionLoading(reservationId);
    try {
      const res = await fetch(`/api/reservations/${reservationId}/checkin`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      await loadReservations();
    } catch (err) {
      alert(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel(reservationId: string) {
    if (!confirm("この予約をキャンセルしますか？返金が必要な場合は自動処理されます。")) return;

    setActionLoading(reservationId);
    try {
      const res = await fetch(`/api/reservations/${reservationId}/cancel`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      await loadReservations();
    } catch (err) {
      alert(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setActionLoading(null);
    }
  }

  const filtered = reservations.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search) {
      const term = search.toLowerCase();
      return (
        r.profiles?.display_name?.toLowerCase().includes(term) ||
        r.profiles?.email?.toLowerCase().includes(term) ||
        r.events?.title?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  if (loading) {
    return <p className="text-muted-foreground">読み込み中...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">予約管理</h1>

      <div className="flex gap-4 mb-4">
        <Input
          placeholder="名前・メール・イベント名で検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="pending">保留中</SelectItem>
            <SelectItem value="confirmed">確定</SelectItem>
            <SelectItem value="checked_in">チェックイン済</SelectItem>
            <SelectItem value="cancelled">キャンセル済</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ユーザー</TableHead>
              <TableHead>イベント</TableHead>
              <TableHead>金額</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>予約日</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((reservation) => (
              <TableRow key={reservation.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">
                      {reservation.profiles?.display_name || "不明"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {reservation.profiles?.email || "-"}
                    </p>
                  </div>
                </TableCell>
                <TableCell>{reservation.events?.title || "-"}</TableCell>
                <TableCell>
                  {reservation.amount === 0
                    ? "無料"
                    : formatPrice(reservation.amount)}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[reservation.status]}>
                    {statusLabels[reservation.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {formatDateShort(reservation.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {(reservation.status === "confirmed" ||
                      reservation.status === "pending") && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleCheckin(reservation.id)}
                          disabled={actionLoading === reservation.id}
                        >
                          チェックイン
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleCancel(reservation.id)}
                          disabled={actionLoading === reservation.id}
                        >
                          キャンセル
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-8"
                >
                  予約がありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
