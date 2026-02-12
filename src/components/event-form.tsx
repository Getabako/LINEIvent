"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/image-upload";
import type { Event } from "@/types/database";

interface EventFormProps {
  event?: Event;
}

export function EventForm({ event }: EventFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(
    event?.image_url ?? null
  );
  const [eventDate, setEventDate] = useState(
    event?.event_date
      ? new Date(event.event_date).toISOString().slice(0, 16)
      : ""
  );
  const [venue, setVenue] = useState(event?.venue ?? "");
  const [price, setPrice] = useState(event?.price?.toString() ?? "0");
  const [capacity, setCapacity] = useState(
    event?.capacity?.toString() ?? "0"
  );
  const [isPublished, setIsPublished] = useState(
    event?.is_published ?? false
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body = {
        title,
        description,
        image_url: imageUrl,
        event_date: new Date(eventDate).toISOString(),
        venue,
        price: parseInt(price) || 0,
        capacity: parseInt(capacity) || 0,
        is_published: isPublished,
      };

      const url = event ? `/api/events/${event.id}` : "/api/events";
      const method = event ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "保存に失敗しました");
      }

      router.push("/admin/events");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">タイトル *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="イベントタイトル"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">説明</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          placeholder="イベントの詳細説明"
        />
      </div>

      <div className="space-y-2">
        <Label>イベント画像</Label>
        <ImageUpload value={imageUrl} onChange={setImageUrl} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="event_date">開催日時 *</Label>
          <Input
            id="event_date"
            type="datetime-local"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="venue">会場 *</Label>
          <Input
            id="venue"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            required
            placeholder="会場名・住所"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">価格 (円)</Label>
          <Input
            id="price"
            type="number"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0 = 無料"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacity">定員</Label>
          <Input
            id="capacity"
            type="number"
            min="0"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="0 = 無制限"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="is_published"
          type="checkbox"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
          className="h-4 w-4"
        />
        <Label htmlFor="is_published">公開する</Label>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "保存中..." : event ? "更新" : "作成"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/events")}
        >
          キャンセル
        </Button>
      </div>
    </form>
  );
}
