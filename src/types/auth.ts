export interface User {
  id: string;
  name?: string;
  email: string;
  role?: string;
  phone?: string | null;
  profile_image?: string | null;
  dob?: string | null;
  gender?: "MALE" | "FEMALE" | "OTHER" | null;
  status?: "ACTIVE" | "INACTIVE";
}

export interface City {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  image?: string
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  image?: string | null;
}

export interface Events {
  id: number;
  organizer_id?: number;
  city_id?: number;
  category_id?: number;
  category_name?: string | null;
  city_name?: string | null;
  organiser_stage_name?: string | null;
  organiser_user_name?: string | null;
  name?: string;
  slug?: string;
  description?: string;
  location?: string;
  event_date?: string;
  time?: string;
  price?: string;
  capacity?: number;
  status?: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "COMPLETED";
  is_live?: boolean | number;
  is_active: boolean;
}

export type Bookings = {
  id: number;
  user_id?: number;
  event_id?: number;
  event_title?: string;
  name?: string;
  location?: string;
  venue?: string;
  booking_date: string;
  pass_id?: number;
  number_of_tickets?: number;
  total_amount?: string;
  status?: "CONFIRMED" | "CANCELLED";
  created_at?: string;
};


export interface Organizer {
  stage_name: string;
  name?: string;
  totalEvents?: number;
}