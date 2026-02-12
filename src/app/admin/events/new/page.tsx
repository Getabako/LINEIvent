import { EventForm } from "@/components/event-form";

export default function NewEventPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">イベント新規作成</h1>
      <EventForm />
    </div>
  );
}
