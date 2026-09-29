export type View =
  | "dashboard"
  | "calendar"
  | "appointments"
  | "clients"
  | "staff"
  | "services"
  | "products"
  | "reports"
  | "booking";

export type AppointmentStatus = "booked" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";

export type PaymentStatus = "unpaid" | "deposit" | "paid";

export interface Appointment {
  id: number;
  identifier: string;
  client_id: number;
  staff_id: number | null;
  status: AppointmentStatus;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  total_price: number;
  discount_amount?: number;
  deposit_amount?: number;
  payment_status?: PaymentStatus | string;
  payment_method?: string;
  notes: string;
  is_recurring: number;
  recurrence_interval: string;
  client_name?: string;
  client_phone?: string;
  staff_name?: string | null;
  staff_color?: string | null;
  service_names?: string | null;
  latest_note?: string | null;
  appointment_services?: AppointmentService[];
  appointment_notes?: AppointmentNote[];
  created_at: string;
  updated_at: string;
}

export interface AppointmentService {
  id: number;
  appointment_id: number;
  service_id: number;
  service_name?: string;
  price: number;
  duration: number;
}

export interface AppointmentNote {
  id: number;
  appointment_id: number;
  content: string;
  created_at: string;
}

export interface Client {
  id: number;
  name: string;
  email: string;
  phone: string;
  notes: string;
  appointment_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: number;
  name: string;
  email: string;
  phone: string;
  title: string;
  color: string;
  commission_rate?: number;
  active: number;
  appointment_count?: number;
  created_at: string;
}

export interface Service {
  id: number;
  name: string;
  description: string;
  duration: number;
  price: number;
  color: string;
  category: string;
  active: number;
  created_at: string;
}

export interface BlockedSlot {
  id: number;
  staff_id: number;
  staff_name?: string;
  blocked_date: string;
  start_time: string;
  end_time: string;
  reason: string;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  brand: string;
  category: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  low_stock_alert: number;
  created_at: string;
  updated_at: string;
}

export interface Stats {
  appointments: number;
  clients: number;
  staff: number;
  services: number;
  products: number;
  today_appointments: number;
  upcoming_appointments: number;
  completed_appointments: number;
  revenue: number;
  low_stock_products: number;
}

export interface ReportsData {
  summary: {
    total_appointments: number;
    completed_appointments: number;
    cancelled_appointments: number;
    gross_revenue: number;
    net_revenue: number;
    total_discounts: number;
    total_collected: number;
    total_unpaid: number;
    total_commissions: number;
    salon_net_profit: number;
    inventory_value: number;
    inventory_cost: number;
  };
  staff_performance: {
    id: number;
    name: string;
    title: string;
    color: string;
    commission_rate: number;
    total_appointments: number;
    completed_appointments: number;
    total_revenue: number;
    commission_amount: number;
    salon_share: number;
  }[];
  top_services: {
    id: number;
    name: string;
    category: string;
    color: string;
    booking_count: number;
    revenue: number;
  }[];
  payment_breakdown: {
    method: string;
    count: number;
    amount: number;
  }[];
}

export interface PaginatedState {
  page: number;
  limit: number;
  total: number;
}

export interface ClientLookup {
  id: number;
  name: string;
  phone?: string;
}

export interface StaffLookup {
  id: number;
  name: string;
  color: string;
  title?: string;
}
