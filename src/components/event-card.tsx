import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatPrice } from "@/lib/utils";
import type { Event } from "@/types/database";

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  return (
    <Link href={`/events/${event.id}`}>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        {event.image_url && (
          <div className="relative aspect-video">
            <Image
              src={event.image_url}
              alt={event.title}
              fill
              className="object-cover"
            />
          </div>
        )}
        <CardContent className="p-4">
          <h3 className="font-bold text-lg mb-1">{event.title}</h3>
          <p className="text-sm text-muted-foreground mb-2">
            {formatDate(event.event_date)}
          </p>
          <p className="text-sm text-muted-foreground mb-3">{event.venue}</p>
          <div className="flex items-center justify-between">
            <Badge variant={event.price === 0 ? "secondary" : "default"}>
              {event.price === 0 ? "無料" : formatPrice(event.price)}
            </Badge>
            {event.capacity > 0 && (
              <span className="text-xs text-muted-foreground">
                定員 {event.capacity}名
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
