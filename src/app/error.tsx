"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
      <h2 className="text-xl font-bold">エラーが発生しました</h2>
      <p className="text-muted-foreground">
        申し訳ありません。予期しないエラーが発生しました。
      </p>
      <Button onClick={reset}>再試行</Button>
    </div>
  );
}
