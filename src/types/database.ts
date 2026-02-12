export type UserRole = "user" | "admin";

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "checked_in";

export type PaymentStatus = "unpaid" | "paid" | "refunded";

export interface Profile {
  id: string;
  line_user_id: string | null;
  display_name: string;
  picture_url: string | null;
  email: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  event_date: string;
  venue: string;
  price: number;
  capacity: number;
  is_published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  user_id: string;
  event_id: string;
  status: ReservationStatus;
  payment_status: PaymentStatus;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  amount: number;
  checked_in_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReservationWithEvent extends Reservation {
  events: Event;
}

export interface ReservationWithProfile extends Reservation {
  profiles: Profile;
  events: Event;
}

export interface EventWithReservationCount extends Event {
  reservation_count: number;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at" | "updated_at">>;
      };
      events: {
        Row: Event;
        Insert: Omit<Event, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Event, "id" | "created_at" | "updated_at">>;
      };
      reservations: {
        Row: Reservation;
        Insert: Omit<Reservation, "id" | "created_at" | "updated_at">;
        Update: Partial<
          Omit<Reservation, "id" | "created_at" | "updated_at">
        >;
      };
    };
  };
}
