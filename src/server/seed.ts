import { get, run } from "./db.js";

/**
 * Sample Persian data + the appointment counter rows.
 */

type StaffSeed = [id: number, name: string, email: string, phone: string, title: string, color: string, commission_rate: number];
type ServiceSeed = [id: number, name: string, description: string, duration: number, price: number, color: string, category: string];
type ClientSeed = [id: number, name: string, email: string, phone: string, notes: string];
type ProductSeed = [id: number, name: string, brand: string, category: string, sku: string, price: number, cost: number, stock: number, low_stock_alert: number];

const STAFF: StaffSeed[] = [
  [1, "مریم رضایی", "maryam@salon.ir", "09121001001", "آرایشگر ارشد و هیرکات", "#3b82f6", 50],
  [2, "سارا محمدی", "sara@salon.ir", "09121001002", "متخصص رنگ و مش و کراتین", "#10b981", 45],
  [3, "نگین کریمی", "negin@salon.ir", "09121001003", "متخصص کاشت و طراحی ناخن", "#f59e0b", 40],
  [4, "الهام حسینی", "elham@salon.ir", "09121001004", "میکاپ آرتیست و فیشیال", "#8b5cf6", 50],
];

// Note: Service 1 duration=60 and Service 2 duration=30 preserve interval expectations in tests.
const SERVICES: ServiceSeed[] = [
  [1, "کوتاهی و استایل مو", "کوتاهی ژورنالی مو به همراه براشینگ و استایل", 60, 450000, "#3b82f6", "مو"],
  [2, "براشینگ و سشوار مجلسی", "شستشو و حالت‌دهی حرفه‌ای مو", 30, 300000, "#10b981", "مو"],
  [3, "رنگ و لایت تخصصی", "رنگ کامل، بالیاژ یا آمبره با مواد درجه یک", 90, 1800000, "#8b5cf6", "رنگ و لایت"],
  [4, "مانیکور و ژلیش سریع", "مرتب‌سازی ناخن و لاک ژل", 15, 250000, "#f59e0b", "ناخن"],
  [5, "مشاوره تخصصی زیبایی", "بررسی مو و پوست قبل از خدمات", 30, 0, "#6b7280", "عمومی"],
  [6, "پکیج ویژه میکاپ و شینیون VIP", "گریم تخصصی و شینیون مجلسی کامل", 120, 2500000, "#ec4899", "میکاپ و عروس"],
];

const CLIENTS: ClientSeed[] = [
  [1, "نازنین احمدی", "nazanin@example.com", "09121112233", "پوست حساس، ترجیحاً نوبت‌های صبح"],
  [2, "مهسا صادقی", "mahsa@example.com", "09123334455", "مشتری ثابت رنگ و لایت"],
  [3, "پریا نادری", "parya@example.com", "09125556677", "علاقه‌مند به طراحی ناخن مینیمال"],
  [4, "شیوا فرهادی", "shiva@example.com", "09127778899", "مشتری ویژه پکیج‌های میکاپ و فیشیال"],
];

const PRODUCTS: ProductSeed[] = [
  [1, "شامپو بدون سولفات کراتینه", "ProCare", "مراقبت مو", "SH-101", 480000, 320000, 25, 5],
  [2, "ماسک موی آرگان مراکشی", "ArganLux", "مراقبت مو", "MK-204", 650000, 420000, 18, 5],
  [3, "سرم آبرسان هیالورونیک اسید", "SkinLux", "مراقبت پوست", "SR-305", 890000, 580000, 12, 5],
  [4, "روغن تقویت کوتیکول ناخن", "NailPro", "ناخن", "NL-410", 290000, 160000, 3, 5],
];

let seeded = false;

async function ensureColumns(): Promise<void> {
  const migrations = [
    "ALTER TABLE staff ADD COLUMN commission_rate REAL NOT NULL DEFAULT 40",
    "ALTER TABLE appointments ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0",
    "ALTER TABLE appointments ADD COLUMN deposit_amount REAL NOT NULL DEFAULT 0",
    "ALTER TABLE appointments ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid'",
    "ALTER TABLE appointments ADD COLUMN payment_method TEXT DEFAULT ''",
  ];
  for (const sql of migrations) {
    try {
      await run(sql);
    } catch {
      // Column already exists
    }
  }
}

/** Insert `rows` into `table` only while it is still empty. */
async function seedIfEmpty(table: string, columns: string[], rows: readonly unknown[][]): Promise<void> {
  const existing = await get<{ count: number }>(`SELECT COUNT(*) as count FROM ${table}`);
  if ((existing?.count ?? 0) > 0) return;
  const placeholders = rows.map(() => `(${columns.map(() => "?").join(", ")})`).join(", ");
  await run(
    `INSERT OR IGNORE INTO ${table} (${columns.join(", ")}) VALUES ${placeholders}`,
    rows.flat(),
  );
}

/**
 * Idempotent. The demo tables are only seeded while still empty, so a redeploy
 * never resurrects a row the user deleted; the _meta rows are INSERT OR IGNORE
 * so an existing counter is never reset.
 */
export async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  try {
    await ensureColumns();
    await run("INSERT OR IGNORE INTO _meta (key, value) VALUES ('appointment_counter', '0')");
    await run("INSERT OR IGNORE INTO _meta (key, value) VALUES ('appointment_prefix', 'APT')");
    await seedIfEmpty("staff", ["id", "name", "email", "phone", "title", "color", "commission_rate"], STAFF);
    await seedIfEmpty("services", ["id", "name", "description", "duration", "price", "color", "category"], SERVICES);
    await seedIfEmpty("clients", ["id", "name", "email", "phone", "notes"], CLIENTS);
    await seedIfEmpty("products", ["id", "name", "brand", "category", "sku", "price", "cost", "stock", "low_stock_alert"], PRODUCTS);
    seeded = true;
  } catch {
    // Sample data must never fail a request; retry on the next one.
    seeded = false;
  }
}
