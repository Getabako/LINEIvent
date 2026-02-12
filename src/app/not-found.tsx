import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
      <h2 className="text-xl font-bold">ページが見つかりません</h2>
      <p className="text-muted-foreground">
        お探しのページは存在しないか、移動した可能性があります。
      </p>
      <Link href="/events">
        <Button>イベント一覧へ</Button>
      </Link>
    </div>
  );
}
