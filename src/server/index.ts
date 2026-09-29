import { createApp, createRoute, z } from "@clawnify/app";
import { query, get, run } from "./db.js";
import { findConflicts, describeConflicts, toMinutes, type Busy } from "./scheduling.js";
import { ensureSeeded } from "./seed.js";

type Env = { Bindings: { DB: D1Database } };

const app = createApp<Env>({
  title: "OpenSalon",
  version: "1.0.0",
  description: "سامانه جامع نوبت‌دهی و مدیریت سالن‌های زیبایی و مراکز خدماتی (OpenSalon Persian Edition)",
});

// Seed sample data + the appointment counter rows on the first request an
// isolate serves. Registered after createApp's `initDB` middleware and before
// every route, so handlers always see the _meta rows.
app.use("*", async (_c, next) => {
  await ensureSeeded();
  await next();
});

// ── Shared Schemas ─────────────────────────────────────────────────

const ErrorSchema = z.object({ error: z.string() }).openapi("Error");
const OkSchema = z.object({ ok: z.boolean() }).openapi("Ok");

const ConflictSchema = z.object({
  error: z.string(),
  conflicts: z.array(z.object({
    kind: z.enum(["appointment", "blocked"]),
    start_time: z.string(),
    end_time: z.string(),
    label: z.string(),
  })),
}).openapi("Conflict");

const ClientSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  notes: z.string(),
  appointment_count: z.number().int().optional(),
  created_at: z.string(),
  updated_at: z.string(),
}).openapi("Client");

const StaffSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  title: z.string(),
  color: z.string(),
  commission_rate: z.number().optional(),
  active: z.number().int(),
  appointment_count: z.number().int().optional(),
  created_at: z.string(),
}).openapi("Staff");

const ServiceSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  description: z.string(),
  duration: z.number().int(),
  price: z.number(),
  color: z.string(),
  category: z.string(),
  active: z.number().int(),
  created_at: z.string(),
}).openapi("Service");

const AppointmentNoteSchema = z.object({
  id: z.number().int(),
  appointment_id: z.number().int(),
  content: z.string(),
  created_at: z.string(),
}).openapi("AppointmentNote");

const AppointmentServiceSchema = z.object({
  id: z.number().int(),
  appointment_id: z.number().int(),
  service_id: z.number().int(),
  service_name: z.string().optional(),
  price: z.number(),
  duration: z.number().int(),
}).openapi("AppointmentService");

const AppointmentSchema = z.object({
  id: z.number().int(),
  identifier: z.string(),
  client_id: z.number().int(),
  staff_id: z.number().int().nullable(),
  status: z.string(),
  scheduled_date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  total_price: z.number(),
  discount_amount: z.number().optional(),
  deposit_amount: z.number().optional(),
  payment_status: z.string().optional(),
  payment_method: z.string().optional(),
  notes: z.string(),
  is_recurring: z.number().int(),
  recurrence_interval: z.string(),
  client_name: z.string().optional(),
  client_phone: z.string().optional(),
  staff_name: z.string().nullable().optional(),
  staff_color: z.string().nullable().optional(),
  service_names: z.string().nullable().optional(),
  latest_note: z.string().nullable().optional(),
  appointment_services: z.array(AppointmentServiceSchema).optional(),
  appointment_notes: z.array(AppointmentNoteSchema).optional(),
  created_at: z.string(),
  updated_at: z.string(),
}).openapi("Appointment");

const BlockedSlotSchema = z.object({
  id: z.number().int(),
  staff_id: z.number().int(),
  staff_name: z.string().optional(),
  blocked_date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  reason: z.string(),
  created_at: z.string(),
}).openapi("BlockedSlot");

const ProductSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  brand: z.string(),
  category: z.string(),
  sku: z.string(),
  price: z.number(),
  cost: z.number(),
  stock: z.number().int(),
  low_stock_alert: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
}).openapi("Product");

const IdParam = z.object({ id: z.string().openapi({ description: "Resource ID" }) });

// ── Helpers ────────────────────────────────────────────────────────

async function nextIdentifier(): Promise<string> {
  const prefix = await get<{ value: string }>("SELECT value FROM _meta WHERE key = 'appointment_prefix'");
  const counter = await get<{ value: string }>("SELECT value FROM _meta WHERE key = 'appointment_counter'");
  const next = parseInt(counter?.value || "0", 10) + 1;
  await run(
    "INSERT INTO _meta (key, value) VALUES ('appointment_counter', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [String(next)],
  );
  return `${prefix?.value || "APT"}-${next}`;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

async function busyFor(staffId: number, date: string, excludeAppointmentId?: number): Promise<Busy[]> {
  const appts = await query<{ start_time: string; end_time: string; client_name: string | null }>(
    `SELECT a.start_time, a.end_time, cl.name as client_name
     FROM appointments a
     LEFT JOIN clients cl ON cl.id = a.client_id
     WHERE a.staff_id = ? AND a.scheduled_date = ? AND a.status != 'cancelled'
       ${excludeAppointmentId ? "AND a.id != ?" : ""}`,
    excludeAppointmentId ? [staffId, date, excludeAppointmentId] : [staffId, date],
  );
  const blocks = await query<{ start_time: string; end_time: string; reason: string | null }>(
    "SELECT start_time, end_time, reason FROM blocked_slots WHERE staff_id = ? AND blocked_date = ?",
    [staffId, date],
  );
  return [
    ...appts.map((a): Busy => ({
      kind: "appointment", start_time: a.start_time, end_time: a.end_time,
      label: a.client_name || "another booking",
    })),
    ...blocks.map((b): Busy => ({
      kind: "blocked", start_time: b.start_time, end_time: b.end_time,
      label: b.reason || "blocked",
    })),
  ];
}

async function staffName(staffId: number): Promise<string> {
  const s = await get<{ name: string }>("SELECT name FROM staff WHERE id = ?", [staffId]);
  return s?.name || "";
}

// ── Stats ──────────────────────────────────────────────────────────

const getStats = createRoute({
  method: "get",
  path: "/api/stats",
  responses: {
    200: {
      description: "Dashboard stats",
      content: { "application/json": { schema: z.object({
        appointments: z.number().int(),
        clients: z.number().int(),
        staff: z.number().int(),
        services: z.number().int(),
        products: z.number().int(),
        today_appointments: z.number().int(),
        upcoming_appointments: z.number().int(),
        completed_appointments: z.number().int(),
        revenue: z.number(),
        low_stock_products: z.number().int(),
      }) } },
    },
  },
});

app.openapi(getStats, async (c) => {
  const today = new Date().toISOString().split("T")[0];
  const appointments = await get<{ count: number }>("SELECT COUNT(*) as count FROM appointments");
  const clients = await get<{ count: number }>("SELECT COUNT(*) as count FROM clients");
  const staff = await get<{ count: number }>("SELECT COUNT(*) as count FROM staff WHERE active = 1");
  const services = await get<{ count: number }>("SELECT COUNT(*) as count FROM services WHERE active = 1");
  const products = await get<{ count: number }>("SELECT COUNT(*) as count FROM products");
  const todayAppointments = await get<{ count: number }>("SELECT COUNT(*) as count FROM appointments WHERE scheduled_date = ? AND status != 'cancelled'", [today]);
  const upcomingAppointments = await get<{ count: number }>("SELECT COUNT(*) as count FROM appointments WHERE status IN ('booked', 'confirmed') AND scheduled_date >= ?", [today]);
  const completedAppointments = await get<{ count: number }>("SELECT COUNT(*) as count FROM appointments WHERE status = 'completed'");
  const revenue = await get<{ total: number }>("SELECT COALESCE(SUM(MAX(total_price - COALESCE(discount_amount, 0), 0)), 0) as total FROM appointments WHERE status = 'completed'");
  const lowStock = await get<{ count: number }>("SELECT COUNT(*) as count FROM products WHERE stock <= low_stock_alert");
  return c.json({
    appointments: appointments?.count || 0,
    clients: clients?.count || 0,
    staff: staff?.count || 0,
    services: services?.count || 0,
    products: products?.count || 0,
    today_appointments: todayAppointments?.count || 0,
    upcoming_appointments: upcomingAppointments?.count || 0,
    completed_appointments: completedAppointments?.count || 0,
    revenue: revenue?.total || 0,
    low_stock_products: lowStock?.count || 0,
  }, 200);
});

// ── Financial & Commission Reports ────────────────────────────────

const getReports = createRoute({
  method: "get",
  path: "/api/reports",
  request: {
    query: z.object({
      start: z.string().optional(),
      end: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "Financial, commission, and operational reports",
      content: { "application/json": { schema: z.object({
        summary: z.object({
          total_appointments: z.number().int(),
          completed_appointments: z.number().int(),
          cancelled_appointments: z.number().int(),
          gross_revenue: z.number(),
          net_revenue: z.number(),
          total_discounts: z.number(),
          total_collected: z.number(),
          total_unpaid: z.number(),
          total_commissions: z.number(),
          salon_net_profit: z.number(),
          inventory_value: z.number(),
          inventory_cost: z.number(),
        }),
        staff_performance: z.array(z.object({
          id: z.number().int(),
          name: z.string(),
          title: z.string(),
          color: z.string(),
          commission_rate: z.number(),
          total_appointments: z.number().int(),
          completed_appointments: z.number().int(),
          total_revenue: z.number(),
          commission_amount: z.number(),
          salon_share: z.number(),
        })),
        top_services: z.array(z.object({
          id: z.number().int(),
          name: z.string(),
          category: z.string(),
          color: z.string(),
          booking_count: z.number().int(),
          revenue: z.number(),
        })),
        payment_breakdown: z.array(z.object({
          method: z.string(),
          count: z.number().int(),
          amount: z.number(),
        })),
      }) } },
    },
  },
});

app.openapi(getReports, async (c) => {
  const { start, end } = c.req.valid("query");
  let dateFilter = "WHERE 1=1";
  const dateParams: unknown[] = [];
  if (start) { dateFilter += " AND a.scheduled_date >= ?"; dateParams.push(start); }
  if (end) { dateFilter += " AND a.scheduled_date <= ?"; dateParams.push(end); }

  const appts = await query<{
    id: number;
    staff_id: number | null;
    status: string;
    total_price: number;
    discount_amount: number;
    deposit_amount: number;
    payment_status: string;
    payment_method: string;
  }>(
    `SELECT a.id, a.staff_id, a.status, a.total_price,
            COALESCE(a.discount_amount, 0) as discount_amount,
            COALESCE(a.deposit_amount, 0) as deposit_amount,
            COALESCE(a.payment_status, 'unpaid') as payment_status,
            COALESCE(a.payment_method, '') as payment_method
     FROM appointments a ${dateFilter}`,
    dateParams,
  );

  const staffRows = await query<{
    id: number;
    name: string;
    title: string;
    color: string;
    commission_rate: number;
  }>("SELECT id, name, title, color, COALESCE(commission_rate, 40) as commission_rate FROM staff ORDER BY name ASC");

  let totalAppointments = appts.length;
  let completedAppointments = 0;
  let cancelledAppointments = 0;
  let grossRevenue = 0;
  let netRevenue = 0;
  let totalDiscounts = 0;
  let totalCollected = 0;
  let totalUnpaid = 0;

  const methodMap = new Map<string, { count: number; amount: number }>();

  for (const a of appts) {
    const net = Math.max(0, (a.total_price || 0) - (a.discount_amount || 0));
    if (a.status === "cancelled" || a.status === "no_show") {
      cancelledAppointments++;
      continue;
    }
    totalDiscounts += a.discount_amount || 0;
    if (a.status === "completed") {
      completedAppointments++;
      grossRevenue += a.total_price || 0;
      netRevenue += net;
    }
    // Payment collection calculation
    let collected = 0;
    if (a.payment_status === "paid" || (a.status === "completed" && a.payment_status !== "unpaid" && a.payment_status !== "deposit")) {
      collected = net;
    } else if (a.payment_status === "deposit") {
      collected = Math.min(net, a.deposit_amount || 0);
    }
    totalCollected += collected;
    totalUnpaid += Math.max(0, net - collected);

    if (collected > 0) {
      const mKey = a.payment_method || "card";
      const cur = methodMap.get(mKey) || { count: 0, amount: 0 };
      cur.count += 1;
      cur.amount += collected;
      methodMap.set(mKey, cur);
    }
  }

  let totalCommissions = 0;
  const staffPerformance = staffRows.map((s) => {
    const memberAppts = appts.filter((a) => a.staff_id === s.id && a.status !== "cancelled");
    const memberCompleted = memberAppts.filter((a) => a.status === "completed");
    const memberRevenue = memberCompleted.reduce(
      (sum, a) => sum + Math.max(0, (a.total_price || 0) - (a.discount_amount || 0)),
      0,
    );
    const rate = s.commission_rate ?? 40;
    const commissionAmount = Math.round((memberRevenue * rate) / 100);
    const salonShare = Math.max(0, memberRevenue - commissionAmount);
    totalCommissions += commissionAmount;
    return {
      id: s.id,
      name: s.name,
      title: s.title || "",
      color: s.color,
      commission_rate: rate,
      total_appointments: memberAppts.length,
      completed_appointments: memberCompleted.length,
      total_revenue: memberRevenue,
      commission_amount: commissionAmount,
      salon_share: salonShare,
    };
  });

  const topServices = await query<{
    id: number;
    name: string;
    category: string;
    color: string;
    booking_count: number;
    revenue: number;
  }>(
    `SELECT sv.id, sv.name, sv.category, sv.color,
            COUNT(aps.id) as booking_count,
            COALESCE(SUM(aps.price), 0) as revenue
     FROM services sv
     LEFT JOIN appointment_services aps ON aps.service_id = sv.id
     LEFT JOIN appointments a ON a.id = aps.appointment_id
       AND a.status != 'cancelled'
       ${start ? "AND a.scheduled_date >= ?" : ""}
       ${end ? "AND a.scheduled_date <= ?" : ""}
     GROUP BY sv.id
     ORDER BY booking_count DESC, revenue DESC`,
    dateParams,
  );

  const inv = await get<{ value: number; cost: number }>(
    "SELECT COALESCE(SUM(stock * price), 0) as value, COALESCE(SUM(stock * cost), 0) as cost FROM products",
  );

  const paymentBreakdown = Array.from(methodMap.entries()).map(([method, data]) => ({
    method,
    count: data.count,
    amount: data.amount,
  }));

  return c.json({
    summary: {
      total_appointments: totalAppointments,
      completed_appointments: completedAppointments,
      cancelled_appointments: cancelledAppointments,
      gross_revenue: grossRevenue,
      net_revenue: netRevenue,
      total_discounts: totalDiscounts,
      total_collected: totalCollected,
      total_unpaid: totalUnpaid,
      total_commissions: totalCommissions,
      salon_net_profit: Math.max(0, netRevenue - totalCommissions),
      inventory_value: inv?.value || 0,
      inventory_cost: inv?.cost || 0,
    },
    staff_performance: staffPerformance,
    top_services: topServices,
    payment_breakdown: paymentBreakdown,
  }, 200);
});

// ── Availability Slots (for Online Booking Portal) ────────────────

const getAvailability = createRoute({
  method: "get",
  path: "/api/availability",
  request: {
    query: z.object({
      date: z.string(),
      staff_id: z.string().optional(),
      duration: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "Available start times for booking",
      content: { "application/json": { schema: z.object({
        slots: z.array(z.object({
          time: z.string(),
          available: z.boolean(),
        })),
      }) } },
    },
  },
});

app.openapi(getAvailability, async (c) => {
  const { date, staff_id, duration } = c.req.valid("query");
  const dur = Math.max(15, parseInt(duration || "60", 10) || 60);
  const staffId = staff_id ? parseInt(staff_id, 10) : null;
  const busy = staffId ? await busyFor(staffId, date) : [];

  const slots: { time: string; available: boolean }[] = [];
  // Salon hours: 09:00 to 20:00 in 30-min steps
  for (let mins = 9 * 60; mins + dur <= 20 * 60; mins += 30) {
    const hh = String(Math.floor(mins / 60)).padStart(2, "0");
    const mm = String(mins % 60).padStart(2, "0");
    const startTime = `${hh}:${mm}`;
    const endTime = addMinutes(startTime, dur);
    const conflicts = staffId ? findConflicts(startTime, endTime, busy) : [];
    slots.push({ time: startTime, available: conflicts.length === 0 });
  }
  return c.json({ slots }, 200);
});

// ── Demo Sample Appointments Seeder ───────────────────────────────

const seedDemoAppointments = createRoute({
  method: "post",
  path: "/api/demo-appointments",
  responses: {
    201: { description: "Seeded demo appointments", content: { "application/json": { schema: z.object({ created: z.number().int() }) } } },
  },
});

app.openapi(seedDemoAppointments, async (c) => {
  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrowDate = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const existingToday = await get<{ count: number }>(
    "SELECT COUNT(*) as count FROM appointments WHERE scheduled_date = ?",
    [todayStr],
  );
  if ((existingToday?.count ?? 0) > 0) {
    return c.json({ created: 0 }, 201);
  }

  const samples = [
    { client_id: 1, staff_id: 1, date: todayStr, start: "09:30", end: "10:30", status: "completed", price: 450000, discount: 0, deposit: 450000, payStatus: "paid", payMethod: "card", notes: "کوتاهی لایه‌ای و براشینگ", svcs: [{ id: 1, price: 450000, dur: 60 }] },
    { client_id: 2, staff_id: 2, date: todayStr, start: "10:00", end: "11:30", status: "completed", price: 1800000, discount: 100000, deposit: 1700000, payStatus: "paid", payMethod: "transfer", notes: "لایت کاراملی پایه ۸", svcs: [{ id: 3, price: 1800000, dur: 90 }] },
    { client_id: 3, staff_id: 3, date: todayStr, start: "11:00", end: "11:45", status: "in_progress", price: 550000, discount: 0, deposit: 200000, payStatus: "deposit", payMethod: "online", notes: "طراحی فرنچ سفید صدفی", svcs: [{ id: 2, price: 300000, dur: 30 }, { id: 4, price: 250000, dur: 15 }] },
    { client_id: 4, staff_id: 4, date: todayStr, start: "14:00", end: "16:00", status: "confirmed", price: 2500000, discount: 0, deposit: 500000, payStatus: "deposit", payMethod: "card", notes: "میکاپ و شینیون مراسم شب", svcs: [{ id: 6, price: 2500000, dur: 120 }] },
    { client_id: 1, staff_id: 1, date: tomorrowDate, start: "11:00", end: "11:30", status: "booked", price: 300000, discount: 0, deposit: 0, payStatus: "unpaid", payMethod: "", notes: "براشینگ مجلسی", svcs: [{ id: 2, price: 300000, dur: 30 }] },
  ];

  let createdCount = 0;
  for (const s of samples) {
    const identifier = await nextIdentifier();
    const res = await run(
      `INSERT INTO appointments (identifier, client_id, staff_id, status, scheduled_date, start_time, end_time, total_price, discount_amount, deposit_amount, payment_status, payment_method, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [identifier, s.client_id, s.staff_id, s.status, s.date, s.start, s.end, s.price, s.discount, s.deposit, s.payStatus, s.payMethod, s.notes],
    );
    const aptId = res.lastInsertRowid;
    for (const sv of s.svcs) {
      await run(
        "INSERT INTO appointment_services (appointment_id, service_id, price, duration) VALUES (?, ?, ?, ?)",
        [aptId, sv.id, sv.price, sv.dur],
      );
    }
    createdCount++;
  }

  await run(
    "INSERT INTO blocked_slots (staff_id, blocked_date, start_time, end_time, reason) VALUES (1, ?, '13:00', '14:00', 'استراحت و ناهار')",
    [todayStr],
  );
  await run(
    "INSERT INTO blocked_slots (staff_id, blocked_date, start_time, end_time, reason) VALUES (2, ?, '13:00', '14:00', 'استراحت و ناهار')",
    [todayStr],
  );

  return c.json({ created: createdCount }, 201);
});

// ── Appointments ───────────────────────────────────────────────────

const listAppointments = createRoute({
  method: "get",
  path: "/api/appointments",
  request: {
    query: z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
      search: z.string().optional(),
      status: z.string().optional(),
      date: z.string().optional(),
      staff_id: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "Paginated appointment list",
      content: { "application/json": { schema: z.object({ appointments: z.array(AppointmentSchema), total: z.number().int() }) } },
    },
  },
});

app.openapi(listAppointments, async (c) => {
  const q = c.req.valid("query");
  const page = parseInt(q.page || "1", 10);
  const limit = parseInt(q.limit || "50", 10);
  const offset = (page - 1) * limit;

  let where = "WHERE 1=1";
  const params: unknown[] = [];

  if (q.search) {
    where += " AND (a.identifier LIKE ? OR cl.name LIKE ? OR cl.phone LIKE ?)";
    const s = `%${q.search}%`;
    params.push(s, s, s);
  }
  if (q.status) { where += " AND a.status = ?"; params.push(q.status); }
  if (q.date) { where += " AND a.scheduled_date = ?"; params.push(q.date); }
  if (q.staff_id) { where += " AND a.staff_id = ?"; params.push(q.staff_id); }

  const total = await get<{ count: number }>(
    `SELECT COUNT(*) as count FROM appointments a LEFT JOIN clients cl ON cl.id = a.client_id ${where}`,
    params,
  );

  const appointments = await query<Record<string, unknown>>(
    `SELECT a.*, cl.name as client_name, cl.phone as client_phone,
            s.name as staff_name, s.color as staff_color
     FROM appointments a
     LEFT JOIN clients cl ON cl.id = a.client_id
     LEFT JOIN staff s ON s.id = a.staff_id
     ${where}
     ORDER BY a.scheduled_date DESC, a.start_time ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return c.json({ appointments, total: total?.count || 0 }, 200);
});

// Calendar view - appointments for a date range
const getCalendar = createRoute({
  method: "get",
  path: "/api/calendar",
  request: {
    query: z.object({ start: z.string(), end: z.string() }),
  },
  responses: {
    200: {
      description: "Calendar appointments and blocked slots",
      content: { "application/json": { schema: z.object({
        appointments: z.array(AppointmentSchema),
        blocked_slots: z.array(BlockedSlotSchema),
      }) } },
    },
  },
});

app.openapi(getCalendar, async (c) => {
  const { start, end } = c.req.valid("query");
  const appointments = await query<Record<string, unknown>>(
    `SELECT a.*, cl.name as client_name, cl.phone as client_phone,
            s.name as staff_name, s.color as staff_color
     FROM appointments a
     LEFT JOIN clients cl ON cl.id = a.client_id
     LEFT JOIN staff s ON s.id = a.staff_id
     WHERE a.scheduled_date >= ? AND a.scheduled_date <= ? AND a.status != 'cancelled'
     ORDER BY a.start_time ASC`,
    [start, end],
  );

  for (const apt of appointments) {
    const svcs = await query<Record<string, unknown>>(
      `SELECT aps.*, sv.name as service_name FROM appointment_services aps
       LEFT JOIN services sv ON sv.id = aps.service_id
       WHERE aps.appointment_id = ?`,
      [apt.id],
    );
    (apt as Record<string, unknown>).appointment_services = svcs;
  }

  const blocked = await query<Record<string, unknown>>(
    `SELECT b.*, s.name as staff_name FROM blocked_slots b
     LEFT JOIN staff s ON s.id = b.staff_id
     WHERE b.blocked_date >= ? AND b.blocked_date <= ?
     ORDER BY b.start_time ASC`,
    [start, end],
  );

  return c.json({ appointments, blocked_slots: blocked }, 200);
});

// Get single appointment
const getAppointment = createRoute({
  method: "get",
  path: "/api/appointments/{id}",
  request: { params: IdParam },
  responses: {
    200: {
      description: "Appointment detail",
      content: { "application/json": { schema: z.object({ appointment: AppointmentSchema }) } },
    },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

app.openapi(getAppointment, async (c) => {
  const { id } = c.req.valid("param");
  const apt = await get<Record<string, unknown>>(
    `SELECT a.*, cl.name as client_name, cl.phone as client_phone,
            s.name as staff_name, s.color as staff_color
     FROM appointments a
     LEFT JOIN clients cl ON cl.id = a.client_id
     LEFT JOIN staff s ON s.id = a.staff_id
     WHERE a.id = ?`,
    [id],
  );
  if (!apt) return c.json({ error: "Not found" }, 404);

  const svcs = await query<Record<string, unknown>>(
    `SELECT aps.*, sv.name as service_name FROM appointment_services aps
     LEFT JOIN services sv ON sv.id = aps.service_id
     WHERE aps.appointment_id = ?`,
    [id],
  );
  apt.appointment_services = svcs;

  const notes = await query<Record<string, unknown>>(
    "SELECT * FROM appointment_notes WHERE appointment_id = ? ORDER BY created_at DESC",
    [id],
  );
  apt.appointment_notes = notes;

  return c.json({ appointment: apt }, 200);
});

// Create appointment
const createAppointment = createRoute({
  method: "post",
  path: "/api/appointments",
  request: {
    body: { content: { "application/json": { schema: z.object({
      client_id: z.number().int(),
      staff_id: z.number().int().nullable().optional(),
      scheduled_date: z.string(),
      start_time: z.string().optional(),
      discount_amount: z.number().min(0).optional(),
      deposit_amount: z.number().min(0).optional(),
      payment_status: z.string().optional(),
      payment_method: z.string().optional(),
      notes: z.string().optional(),
      is_recurring: z.number().int().optional(),
      recurrence_interval: z.string().optional(),
      service_ids: z.array(z.number().int()).optional(),
      allow_conflict: z.boolean().optional().openapi({
        description: "Book even though the staff member is already busy then.",
      }),
    }) } } },
  },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: z.object({ appointment: AppointmentSchema }) } } },
    400: { description: "Invalid times", content: { "application/json": { schema: ErrorSchema } } },
    409: { description: "Staff member is already busy", content: { "application/json": { schema: ConflictSchema } } },
  },
});

app.openapi(createAppointment, async (c) => {
  const body = c.req.valid("json");
  const identifier = await nextIdentifier();
  const startTime = body.start_time ?? "09:00";

  let totalDuration = 60;
  let totalPrice = 0;
  const serviceIds = body.service_ids || [];

  if (serviceIds.length > 0) {
    const svcs = await query<{ duration: number; price: number }>(
      `SELECT duration, price FROM services WHERE id IN (${serviceIds.map(() => "?").join(",")})`,
      serviceIds,
    );
    totalDuration = svcs.reduce((sum, s) => sum + s.duration, 0);
    totalPrice = svcs.reduce((sum, s) => sum + s.price, 0);
  }

  const start = toMinutes(startTime);
  if (start === null) return c.json({ error: "Times must be HH:MM" }, 400);
  if (totalDuration <= 0) return c.json({ error: "The appointment must have a positive duration" }, 400);
  if (start + totalDuration >= 24 * 60) {
    return c.json({ error: "Appointments must start and end on the same day" }, 400);
  }
  const endTime = addMinutes(startTime, totalDuration);

  if (body.staff_id && !body.allow_conflict) {
    const conflicts = findConflicts(startTime, endTime, await busyFor(body.staff_id, body.scheduled_date));
    if (conflicts.length > 0) {
      return c.json({ error: describeConflicts(await staffName(body.staff_id), conflicts), conflicts }, 409);
    }
  }

  const discountAmount = body.discount_amount ?? 0;
  const depositAmount = body.deposit_amount ?? 0;
  const paymentStatus = body.payment_status || (depositAmount > 0 ? "deposit" : "unpaid");
  const paymentMethod = body.payment_method || "";

  const result = await run(
    `INSERT INTO appointments (identifier, client_id, staff_id, scheduled_date, start_time, end_time, total_price, discount_amount, deposit_amount, payment_status, payment_method, notes, is_recurring, recurrence_interval)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      identifier, body.client_id, body.staff_id ?? null, body.scheduled_date,
      startTime, endTime, totalPrice, discountAmount, depositAmount, paymentStatus, paymentMethod,
      body.notes || "", body.is_recurring || 0, body.recurrence_interval || "",
    ],
  );

  const aptId = result.lastInsertRowid;

  for (const svcId of serviceIds) {
    const svc = await get<{ duration: number; price: number }>("SELECT duration, price FROM services WHERE id = ?", [svcId]);
    if (svc) {
      await run(
        "INSERT INTO appointment_services (appointment_id, service_id, price, duration) VALUES (?, ?, ?, ?)",
        [aptId, svcId, svc.price, svc.duration],
      );
    }
  }

  const apt = await get<Record<string, unknown>>(
    `SELECT a.*, cl.name as client_name, cl.phone as client_phone,
            s.name as staff_name, s.color as staff_color
     FROM appointments a
     LEFT JOIN clients cl ON cl.id = a.client_id
     LEFT JOIN staff s ON s.id = a.staff_id
     WHERE a.id = ?`,
    [aptId],
  );

  return c.json({ appointment: apt }, 201);
});

// Update appointment
const updateAppointment = createRoute({
  method: "put",
  path: "/api/appointments/{id}",
  request: {
    params: IdParam,
    body: { content: { "application/json": { schema: z.object({
      client_id: z.number().int().optional(),
      staff_id: z.number().int().nullable().optional(),
      status: z.string().optional(),
      scheduled_date: z.string().optional(),
      start_time: z.string().optional(),
      end_time: z.string().optional(),
      total_price: z.number().optional(),
      discount_amount: z.number().min(0).optional(),
      deposit_amount: z.number().min(0).optional(),
      payment_status: z.string().optional(),
      payment_method: z.string().optional(),
      notes: z.string().optional(),
      allow_conflict: z.boolean().optional().openapi({
        description: "Move the appointment even though the staff member is already busy then.",
      }),
    }) } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: OkSchema } } },
    400: { description: "Invalid times", content: { "application/json": { schema: ErrorSchema } } },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
    409: { description: "Staff member is already busy", content: { "application/json": { schema: ConflictSchema } } },
  },
});

app.openapi(updateAppointment, async (c) => {
  const { id } = c.req.valid("param");
  const { allow_conflict, ...body } = c.req.valid("json");

  const existing = await get<{
    staff_id: number | null; scheduled_date: string; start_time: string; end_time: string; status: string;
  }>("SELECT staff_id, scheduled_date, start_time, end_time, status FROM appointments WHERE id = ?", [id]);
  if (!existing) return c.json({ error: "Not found" }, 404);

  const staffId = body.staff_id !== undefined ? body.staff_id : existing.staff_id;
  const date = body.scheduled_date ?? existing.scheduled_date;
  const startTime = body.start_time ?? existing.start_time;

  let endTime = body.end_time ?? existing.end_time;
  if (body.start_time !== undefined && body.start_time !== existing.start_time && body.end_time === undefined) {
    const was = toMinutes(existing.start_time);
    const wasEnd = toMinutes(existing.end_time);
    const duration = was !== null && wasEnd !== null ? Math.max(wasEnd - was, 0) : 0;
    endTime = addMinutes(startTime, duration);
    body.end_time = endTime;
  }

  const moved = staffId !== existing.staff_id || date !== existing.scheduled_date
    || startTime !== existing.start_time || endTime !== existing.end_time;
  const status = body.status ?? existing.status;
  const restored = existing.status === "cancelled" && status !== "cancelled";

  if (moved || restored) {
    const start = toMinutes(startTime);
    const end = toMinutes(endTime);
    if (start === null || end === null) return c.json({ error: "Times must be HH:MM" }, 400);
    if (end <= start) return c.json({ error: "The appointment must end after it starts on the same day" }, 400);

    if (status !== "cancelled" && staffId && !allow_conflict) {
      const conflicts = findConflicts(startTime, endTime, await busyFor(staffId, date, Number(id)));
      if (conflicts.length > 0) {
        return c.json({ error: describeConflicts(await staffName(staffId), conflicts), conflicts }, 409);
      }
    }
  }

  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [key, val] of Object.entries(body)) {
    if (val !== undefined) { sets.push(`${key} = ?`); params.push(val); }
  }
  sets.push("updated_at = datetime('now')");
  await run(`UPDATE appointments SET ${sets.join(", ")} WHERE id = ?`, [...params, id]);
  return c.json({ ok: true }, 200);
});

// Delete appointment
const deleteAppointment = createRoute({
  method: "delete",
  path: "/api/appointments/{id}",
  request: { params: IdParam },
  responses: { 200: { description: "Deleted", content: { "application/json": { schema: OkSchema } } } },
});

app.openapi(deleteAppointment, async (c) => {
  const { id } = c.req.valid("param");
  await run("DELETE FROM appointments WHERE id = ?", [id]);
  return c.json({ ok: true }, 200);
});

// Appointment notes
const addAppointmentNote = createRoute({
  method: "post",
  path: "/api/appointments/{id}/notes",
  request: {
    params: IdParam,
    body: { content: { "application/json": { schema: z.object({ content: z.string() }) } } },
  },
  responses: { 201: { description: "Note added", content: { "application/json": { schema: OkSchema } } } },
});

app.openapi(addAppointmentNote, async (c) => {
  const { id } = c.req.valid("param");
  const { content } = c.req.valid("json");
  await run("INSERT INTO appointment_notes (appointment_id, content) VALUES (?, ?)", [id, content]);
  return c.json({ ok: true }, 201);
});

const deleteNote = createRoute({
  method: "delete",
  path: "/api/notes/{id}",
  request: { params: IdParam },
  responses: { 200: { description: "Deleted", content: { "application/json": { schema: OkSchema } } } },
});

app.openapi(deleteNote, async (c) => {
  const { id } = c.req.valid("param");
  await run("DELETE FROM appointment_notes WHERE id = ?", [id]);
  return c.json({ ok: true }, 200);
});

// ── Clients ───────────────────────────────────────────────────────

const listClients = createRoute({
  method: "get",
  path: "/api/clients",
  request: {
    query: z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
      search: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "Paginated client list",
      content: { "application/json": { schema: z.object({ clients: z.array(ClientSchema), total: z.number().int() }) } },
    },
  },
});

app.openapi(listClients, async (c) => {
  const q = c.req.valid("query");
  const page = parseInt(q.page || "1", 10);
  const limit = parseInt(q.limit || "50", 10);
  const offset = (page - 1) * limit;

  let where = "WHERE 1=1";
  const params: unknown[] = [];
  if (q.search) {
    where += " AND (c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)";
    const s = `%${q.search}%`;
    params.push(s, s, s);
  }

  const total = await get<{ count: number }>(`SELECT COUNT(*) as count FROM clients c ${where}`, params);
  const clients = await query<Record<string, unknown>>(
    `SELECT c.*, (SELECT COUNT(*) FROM appointments WHERE client_id = c.id) as appointment_count
     FROM clients c ${where} ORDER BY c.name ASC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return c.json({ clients, total: total?.count || 0 }, 200);
});

const getAllClients = createRoute({
  method: "get",
  path: "/api/clients/all",
  responses: {
    200: {
      description: "All clients for lookup",
      content: { "application/json": { schema: z.object({ clients: z.array(z.object({ id: z.number().int(), name: z.string(), phone: z.string().optional() })) }) } },
    },
  },
});

app.openapi(getAllClients, async (c) => {
  const clients = await query<{ id: number; name: string; phone: string }>("SELECT id, name, phone FROM clients ORDER BY name ASC");
  return c.json({ clients }, 200);
});

const getClient = createRoute({
  method: "get",
  path: "/api/clients/{id}",
  request: { params: IdParam },
  responses: {
    200: {
      description: "Client detail with appointments",
      content: { "application/json": { schema: z.object({ client: ClientSchema, appointments: z.array(AppointmentSchema) }) } },
    },
    404: { description: "Not found", content: { "application/json": { schema: ErrorSchema } } },
  },
});

app.openapi(getClient, async (c) => {
  const { id } = c.req.valid("param");
  const client = await get<Record<string, unknown>>("SELECT * FROM clients WHERE id = ?", [id]);
  if (!client) return c.json({ error: "Not found" }, 404);
  const appointments = await query<Record<string, unknown>>(
    `SELECT a.*, s.name as staff_name, s.color as staff_color,
            (SELECT GROUP_CONCAT(name, ', ')
             FROM (
               SELECT sv.name
               FROM appointment_services aps
               JOIN services sv ON sv.id = aps.service_id
               WHERE aps.appointment_id = a.id
               ORDER BY aps.id
             )) as service_names,
            (SELECT an.content
             FROM appointment_notes an
             WHERE an.appointment_id = a.id
             ORDER BY an.created_at DESC, an.id DESC
             LIMIT 1) as latest_note
     FROM appointments a LEFT JOIN staff s ON s.id = a.staff_id
     WHERE a.client_id = ? ORDER BY a.scheduled_date DESC LIMIT 50`,
    [id],
  );
  return c.json({ client, appointments }, 200);
});

const createClient = createRoute({
  method: "post",
  path: "/api/clients",
  request: {
    body: { content: { "application/json": { schema: z.object({
      name: z.string(),
      email: z.string().optional(),
      phone: z.string().optional(),
      notes: z.string().optional(),
    }) } } },
  },
  responses: { 201: { description: "Created", content: { "application/json": { schema: z.object({ client: ClientSchema }) } } } },
});

app.openapi(createClient, async (c) => {
  const body = c.req.valid("json");
  const result = await run(
    "INSERT INTO clients (name, email, phone, notes) VALUES (?, ?, ?, ?)",
    [body.name, body.email || "", body.phone || "", body.notes || ""],
  );
  const client = await get<Record<string, unknown>>("SELECT * FROM clients WHERE id = ?", [result.lastInsertRowid]);
  return c.json({ client }, 201);
});

const updateClient = createRoute({
  method: "put",
  path: "/api/clients/{id}",
  request: {
    params: IdParam,
    body: { content: { "application/json": { schema: z.object({
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      notes: z.string().optional(),
    }) } } },
  },
  responses: { 200: { description: "Updated", content: { "application/json": { schema: OkSchema } } } },
});

app.openapi(updateClient, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [key, val] of Object.entries(body)) {
    if (val !== undefined) { sets.push(`${key} = ?`); params.push(val); }
  }
  if (sets.length > 0) {
    sets.push("updated_at = datetime('now')");
    await run(`UPDATE clients SET ${sets.join(", ")} WHERE id = ?`, [...params, id]);
  }
  return c.json({ ok: true }, 200);
});

const deleteClient = createRoute({
  method: "delete",
  path: "/api/clients/{id}",
  request: { params: IdParam },
  responses: { 200: { description: "Deleted", content: { "application/json": { schema: OkSchema } } } },
});

app.openapi(deleteClient, async (c) => {
  const { id } = c.req.valid("param");
  await run("DELETE FROM clients WHERE id = ?", [id]);
  return c.json({ ok: true }, 200);
});

// ── Staff ─────────────────────────────────────────────────────────

const listStaff = createRoute({
  method: "get",
  path: "/api/staff",
  responses: {
    200: {
      description: "All staff members",
      content: { "application/json": { schema: z.object({ staff: z.array(StaffSchema) }) } },
    },
  },
});

app.openapi(listStaff, async (c) => {
  const staff = await query<Record<string, unknown>>(
    `SELECT s.*, (SELECT COUNT(*) FROM appointments WHERE staff_id = s.id) as appointment_count
     FROM staff s ORDER BY s.name ASC`,
  );
  return c.json({ staff }, 200);
});

const getAllStaff = createRoute({
  method: "get",
  path: "/api/staff/all",
  responses: {
    200: {
      description: "All staff for lookup",
      content: { "application/json": { schema: z.object({ staff: z.array(z.object({ id: z.number().int(), name: z.string(), color: z.string(), title: z.string().optional() })) }) } },
    },
  },
});

app.openapi(getAllStaff, async (c) => {
  const staff = await query<{ id: number; name: string; color: string; title: string }>("SELECT id, name, color, title FROM staff WHERE active = 1 ORDER BY name ASC");
  return c.json({ staff }, 200);
});

const createStaff = createRoute({
  method: "post",
  path: "/api/staff",
  request: {
    body: { content: { "application/json": { schema: z.object({
      name: z.string(),
      email: z.string().optional(),
      phone: z.string().optional(),
      title: z.string().optional(),
      color: z.string().optional(),
      commission_rate: z.number().min(0).max(100).optional(),
    }) } } },
  },
  responses: { 201: { description: "Created", content: { "application/json": { schema: z.object({ staff: StaffSchema }) } } } },
});

app.openapi(createStaff, async (c) => {
  const body = c.req.valid("json");
  const result = await run(
    "INSERT INTO staff (name, email, phone, title, color, commission_rate) VALUES (?, ?, ?, ?, ?, ?)",
    [body.name, body.email || "", body.phone || "", body.title || "", body.color || "#7c3aed", body.commission_rate ?? 40],
  );
  const staff = await get<Record<string, unknown>>("SELECT * FROM staff WHERE id = ?", [result.lastInsertRowid]);
  return c.json({ staff }, 201);
});

const updateStaff = createRoute({
  method: "put",
  path: "/api/staff/{id}",
  request: {
    params: IdParam,
    body: { content: { "application/json": { schema: z.object({
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      title: z.string().optional(),
      color: z.string().optional(),
      commission_rate: z.number().min(0).max(100).optional(),
      active: z.number().int().optional(),
    }) } } },
  },
  responses: { 200: { description: "Updated", content: { "application/json": { schema: OkSchema } } } },
});

app.openapi(updateStaff, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [key, val] of Object.entries(body)) {
    if (val !== undefined) { sets.push(`${key} = ?`); params.push(val); }
  }
  if (sets.length > 0) {
    await run(`UPDATE staff SET ${sets.join(", ")} WHERE id = ?`, [...params, id]);
  }
  return c.json({ ok: true }, 200);
});

const deleteStaff = createRoute({
  method: "delete",
  path: "/api/staff/{id}",
  request: { params: IdParam },
  responses: { 200: { description: "Deleted", content: { "application/json": { schema: OkSchema } } } },
});

app.openapi(deleteStaff, async (c) => {
  const { id } = c.req.valid("param");
  await run("DELETE FROM staff WHERE id = ?", [id]);
  return c.json({ ok: true }, 200);
});

// ── Services ──────────────────────────────────────────────────────

const listServices = createRoute({
  method: "get",
  path: "/api/services",
  responses: {
    200: {
      description: "All services",
      content: { "application/json": { schema: z.object({ services: z.array(ServiceSchema) }) } },
    },
  },
});

app.openapi(listServices, async (c) => {
  const services = await query<Record<string, unknown>>("SELECT * FROM services ORDER BY category ASC, name ASC");
  return c.json({ services }, 200);
});

const createService = createRoute({
  method: "post",
  path: "/api/services",
  request: {
    body: { content: { "application/json": { schema: z.object({
      name: z.string(),
      description: z.string().optional(),
      duration: z.number().int().optional(),
      price: z.number().optional(),
      color: z.string().optional(),
      category: z.string().optional(),
    }) } } },
  },
  responses: { 201: { description: "Created", content: { "application/json": { schema: z.object({ service: ServiceSchema }) } } } },
});

app.openapi(createService, async (c) => {
  const body = c.req.valid("json");
  const result = await run(
    "INSERT INTO services (name, description, duration, price, color, category) VALUES (?, ?, ?, ?, ?, ?)",
    [body.name, body.description || "", body.duration || 60, body.price || 0, body.color || "#6b7280", body.category || ""],
  );
  const service = await get<Record<string, unknown>>("SELECT * FROM services WHERE id = ?", [result.lastInsertRowid]);
  return c.json({ service }, 201);
});

const updateService = createRoute({
  method: "put",
  path: "/api/services/{id}",
  request: {
    params: IdParam,
    body: { content: { "application/json": { schema: z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      duration: z.number().int().optional(),
      price: z.number().optional(),
      color: z.string().optional(),
      category: z.string().optional(),
      active: z.number().int().optional(),
    }) } } },
  },
  responses: { 200: { description: "Updated", content: { "application/json": { schema: OkSchema } } } },
});

app.openapi(updateService, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [key, val] of Object.entries(body)) {
    if (val !== undefined) { sets.push(`${key} = ?`); params.push(val); }
  }
  if (sets.length > 0) {
    await run(`UPDATE services SET ${sets.join(", ")} WHERE id = ?`, [...params, id]);
  }
  return c.json({ ok: true }, 200);
});

const deleteService = createRoute({
  method: "delete",
  path: "/api/services/{id}",
  request: { params: IdParam },
  responses: { 200: { description: "Deleted", content: { "application/json": { schema: OkSchema } } } },
});

app.openapi(deleteService, async (c) => {
  const { id } = c.req.valid("param");
  await run("DELETE FROM services WHERE id = ?", [id]);
  return c.json({ ok: true }, 200);
});

// ── Blocked Slots ─────────────────────────────────────────────────

const createBlockedSlot = createRoute({
  method: "post",
  path: "/api/blocked-slots",
  request: {
    body: { content: { "application/json": { schema: z.object({
      staff_id: z.number().int(),
      blocked_date: z.string(),
      start_time: z.string(),
      end_time: z.string(),
      reason: z.string().optional(),
      allow_conflict: z.boolean().optional().openapi({
        description: "Block the time even though it overlaps an appointment or another blocked slot.",
      }),
    }) } } },
  },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: OkSchema } } },
    400: { description: "Invalid times", content: { "application/json": { schema: ErrorSchema } } },
    409: { description: "Staff member already has an appointment or blocked time", content: { "application/json": { schema: ConflictSchema } } },
  },
});

app.openapi(createBlockedSlot, async (c) => {
  const { allow_conflict, ...body } = c.req.valid("json");
  const start = toMinutes(body.start_time);
  const end = toMinutes(body.end_time);
  if (start === null || end === null) return c.json({ error: "Times must be HH:MM" }, 400);
  if (end <= start) return c.json({ error: "Blocked time must end after it starts on the same day" }, 400);

  if (!allow_conflict) {
    const conflicts = findConflicts(
      body.start_time,
      body.end_time,
      await busyFor(body.staff_id, body.blocked_date),
    );
    if (conflicts.length > 0) {
      return c.json({ error: describeConflicts(await staffName(body.staff_id), conflicts, "block"), conflicts }, 409);
    }
  }

  await run(
    "INSERT INTO blocked_slots (staff_id, blocked_date, start_time, end_time, reason) VALUES (?, ?, ?, ?, ?)",
    [body.staff_id, body.blocked_date, body.start_time, body.end_time, body.reason || ""],
  );
  return c.json({ ok: true }, 201);
});

const deleteBlockedSlot = createRoute({
  method: "delete",
  path: "/api/blocked-slots/{id}",
  request: { params: IdParam },
  responses: { 200: { description: "Deleted", content: { "application/json": { schema: OkSchema } } } },
});

app.openapi(deleteBlockedSlot, async (c) => {
  const { id } = c.req.valid("param");
  await run("DELETE FROM blocked_slots WHERE id = ?", [id]);
  return c.json({ ok: true }, 200);
});

// ── Products ──────────────────────────────────────────────────────

const listProducts = createRoute({
  method: "get",
  path: "/api/products",
  request: {
    query: z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
      search: z.string().optional(),
      category: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "Paginated product list",
      content: { "application/json": { schema: z.object({ products: z.array(ProductSchema), total: z.number().int() }) } },
    },
  },
});

app.openapi(listProducts, async (c) => {
  const q = c.req.valid("query");
  const page = parseInt(q.page || "1", 10);
  const limit = parseInt(q.limit || "50", 10);
  const offset = (page - 1) * limit;

  let where = "WHERE 1=1";
  const params: unknown[] = [];
  if (q.search) {
    where += " AND (p.name LIKE ? OR p.brand LIKE ? OR p.sku LIKE ?)";
    const s = `%${q.search}%`;
    params.push(s, s, s);
  }
  if (q.category) { where += " AND p.category = ?"; params.push(q.category); }

  const total = await get<{ count: number }>(`SELECT COUNT(*) as count FROM products p ${where}`, params);
  const products = await query<Record<string, unknown>>(
    `SELECT * FROM products p ${where} ORDER BY p.name ASC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return c.json({ products, total: total?.count || 0 }, 200);
});

const createProduct = createRoute({
  method: "post",
  path: "/api/products",
  request: {
    body: { content: { "application/json": { schema: z.object({
      name: z.string(),
      brand: z.string().optional(),
      category: z.string().optional(),
      sku: z.string().optional(),
      price: z.number().min(0).optional(),
      cost: z.number().min(0).optional(),
      stock: z.number().int().min(0).optional(),
      low_stock_alert: z.number().int().min(0).optional(),
    }) } } },
  },
  responses: { 201: { description: "Created", content: { "application/json": { schema: z.object({ product: ProductSchema }) } } } },
});

app.openapi(createProduct, async (c) => {
  const body = c.req.valid("json");
  const result = await run(
    "INSERT INTO products (name, brand, category, sku, price, cost, stock, low_stock_alert) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [body.name, body.brand || "", body.category || "", body.sku || "",
    body.price ?? 0, body.cost ?? 0, body.stock ?? 0, body.low_stock_alert ?? 5],
  );
  const product = await get<Record<string, unknown>>("SELECT * FROM products WHERE id = ?", [result.lastInsertRowid]);
  return c.json({ product }, 201);
});

const updateProduct = createRoute({
  method: "put",
  path: "/api/products/{id}",
  request: {
    params: IdParam,
    body: { content: { "application/json": { schema: z.object({
      name: z.string().optional(),
      brand: z.string().optional(),
      category: z.string().optional(),
      sku: z.string().optional(),
      price: z.number().min(0).optional(),
      cost: z.number().min(0).optional(),
      stock: z.number().int().min(0).optional(),
      low_stock_alert: z.number().int().min(0).optional(),
    }) } } },
  },
  responses: { 200: { description: "Updated", content: { "application/json": { schema: OkSchema } } } },
});

app.openapi(updateProduct, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [key, val] of Object.entries(body)) {
    if (val !== undefined) { sets.push(`${key} = ?`); params.push(val); }
  }
  if (sets.length > 0) {
    sets.push("updated_at = datetime('now')");
    await run(`UPDATE products SET ${sets.join(", ")} WHERE id = ?`, [...params, id]);
  }
  return c.json({ ok: true }, 200);
});

const deleteProduct = createRoute({
  method: "delete",
  path: "/api/products/{id}",
  request: { params: IdParam },
  responses: { 200: { description: "Deleted", content: { "application/json": { schema: OkSchema } } } },
});

app.openapi(deleteProduct, async (c) => {
  const { id } = c.req.valid("param");
  await run("DELETE FROM products WHERE id = ?", [id]);
  return c.json({ ok: true }, 200);
});

export default app;
