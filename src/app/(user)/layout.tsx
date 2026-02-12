import { LiffProvider } from "@/components/liff-provider";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LiffProvider>
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="max-w-lg mx-auto px-4 py-3">
            <h1 className="text-lg font-bold text-center">イベント予約</h1>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-6">{children}</main>
      </div>
    </LiffProvider>
  );
}
