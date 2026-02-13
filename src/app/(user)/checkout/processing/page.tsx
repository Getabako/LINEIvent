"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";

function ProcessingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get("event_id");
  const ticketName = searchParams.get("ticket_name");
  const amount = searchParams.get("amount");
  const [step, setStep] = useState(0);

  const steps = [
    "カード情報を確認中...",
    "決済を処理中...",
    "予約を確定中...",
  ];

  useEffect(() => {
    if (!eventId) return;

    // Step through fake processing stages
    const timer1 = setTimeout(() => setStep(1), 1200);
    const timer2 = setTimeout(() => setStep(2), 2500);
    const timer3 = setTimeout(async () => {
      // Actually create the reservation as free (fake payment)
      try {
        const res = await fetch("/api/reservations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_id: eventId,
            ticket_name: ticketName || undefined,
            amount: 0,
          }),
        });

        if (res.ok || res.status === 409) {
          router.replace(`/checkout?event_id=${eventId}&status=success&free=false`);
        } else {
          const data = await res.json();
          alert(data.error || "予約に失敗しました");
          router.replace(`/checkout?event_id=${eventId}&status=cancel`);
        }
      } catch {
        router.replace(`/checkout?event_id=${eventId}&status=cancel`);
      }
    }, 3800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [eventId, ticketName, router]);

  return (
    <Card className="text-center">
      <CardHeader>
        <CardTitle className="text-xl">お支払い処理中</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {amount && (
          <p className="text-2xl font-bold">
            ¥{Number(amount).toLocaleString()}
          </p>
        )}
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        <div className="space-y-2">
          {steps.map((label, i) => (
            <p
              key={i}
              className={`text-sm transition-opacity duration-300 ${
                i <= step ? "opacity-100" : "opacity-30"
              } ${i === step ? "font-medium" : ""}`}
            >
              {i < step ? "✓ " : i === step ? "● " : "○ "}
              {label}
            </p>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          このページを閉じないでください
        </p>
      </CardContent>
    </Card>
  );
}

export default function ProcessingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      }
    >
      <ProcessingContent />
    </Suspense>
  );
}
