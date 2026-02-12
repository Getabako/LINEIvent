"use client";

import { useEffect, useState } from "react";
import { EventCard } from "@/components/event-card";
import { useLiffContext } from "@/components/liff-provider";
import type { Event } from "@/types/database";

export default function EventListPage() {
  const { isReady, isAuthenticating } = useLiffContext();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch("/api/events?published=true&upcoming=true");
        if (res.ok) {
          const data = await res.json();
          setEvents(data);
        }
      } catch (error) {
        console.error("Failed to load events:", error);
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, []);

  if (!isReady || isAuthenticating) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-muted-foreground">イベントを読み込み中...</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-muted-foreground">
          現在、予約可能なイベントはありません
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">開催予定のイベント</h2>
      <div className="space-y-4">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
