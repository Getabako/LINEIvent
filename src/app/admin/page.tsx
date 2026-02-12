import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [eventsResult, reservationsResult, usersResult] = await Promise.all([
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase
      .from("reservations")
      .select("id, status, payment_status, amount")
      .neq("status", "cancelled"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  const totalEvents = eventsResult.count ?? 0;
  const totalUsers = usersResult.count ?? 0;
  const activeReservations = reservationsResult.data ?? [];
  const confirmedCount = activeReservations.filter(
    (r) => r.status === "confirmed" || r.status === "checked_in"
  ).length;
  const totalRevenue = activeReservations
    .filter((r) => r.payment_status === "paid")
    .reduce((sum, r) => sum + r.amount, 0);

  const stats = [
    { label: "イベント数", value: totalEvents },
    { label: "ユーザー数", value: totalUsers },
    { label: "有効予約数", value: confirmedCount },
    {
      label: "売上合計",
      value: `¥${totalRevenue.toLocaleString()}`,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ダッシュボード</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
