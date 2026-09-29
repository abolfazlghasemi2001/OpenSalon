/**
 * Persian (Farsi) formatting, Jalali (Shamsi) calendar conversion, and currency utilities.
 */

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

export const JALALI_WEEKDAYS = [
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
  "شنبه",
] as const;

export const JALALI_WEEKDAYS_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"] as const;

/** Convert ASCII digits 0-9 to Persian digits ۰-۹. */
export function toPersianDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/** Convert Persian/Arabic digits to ASCII 0-9. */
export function toEnglishDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

/** Format a number with thousands separators and Persian digits. */
export function formatNumber(value: number | null | undefined): string {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return "۰";
  const formatted = Math.round(num).toLocaleString("en-US");
  return toPersianDigits(formatted);
}

/** Format a price in Tomans with Persian digits (e.g., "۴۵۰,۰۰۰ تومان"). */
export function formatCurrency(amount: number | null | undefined, withUnit = true): string {
  const num = Number(amount ?? 0);
  if (!Number.isFinite(num) || num === 0) {
    return withUnit ? "۰ تومان" : "۰";
  }
  const formatted = toPersianDigits(Math.round(num).toLocaleString("en-US"));
  return withUnit ? `${formatted} تومان` : formatted;
}

/** Format duration in minutes into Persian text. */
export function formatDuration(minutes: number | null | undefined): string {
  const m = Number(minutes ?? 0);
  if (m <= 0) return "۰ دقیقه";
  return `${toPersianDigits(m)} دقیقه`;
}

/** Format 24-hour time string ("09:30") with Persian digits ("۰۹:۳۰"). */
export function formatTimeFa(time: string | null | undefined): string {
  if (!time) return "";
  return toPersianDigits(time);
}

// ── Jalali (Solar Hijri) Calendar Math ────────────────────────────

export interface JalaliDate {
  jy: number;
  jm: number; // 1..12
  jd: number; // 1..31
}

/** Convert Gregorian (gy, gm 1..12, gd 1..31) to Jalali (jy, jm 1..12, jd 1..31). */
export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDate {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    g_d_m[gm - 1];
  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { jy, jm, jd };
}

/** Convert Jalali (jy, jm 1..12, jd 1..31) to Gregorian (gy, gm 1..12, gd 1..31). */
export function jalaliToGregorian(jy: number, jm: number, jd: number): { gy: number; gm: number; gd: number } {
  let jy1 = jy + 1595;
  let days =
    -355668 +
    365 * jy1 +
    Math.floor(jy1 / 33) * 8 +
    Math.floor(((jy1 % 33) + 3) / 4) +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [
    0,
    31,
    (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  let gm = 0;
  for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) {
    gd -= sal_a[gm];
  }
  return { gy, gm, gd };
}

/** Check if a Jalali year is a leap year. */
export function isLeapJalaliYear(jy: number): boolean {
  const a = jalaliToGregorian(jy, 12, 30);
  const b = gregorianToJalali(a.gy, a.gm, a.gd);
  return b.jy === jy && b.jm === 12 && b.jd === 30;
}

/** Number of days in a Jalali month (1..12). */
export function getJalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalaliYear(jy) ? 30 : 29;
}

/** Convert a Gregorian `YYYY-MM-DD` string to JalaliDate. */
export function parseToJalali(dateStr: string): JalaliDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr ?? "");
  if (!m) return null;
  return gregorianToJalali(Number(m[1]), Number(m[2]), Number(m[3]));
}

/** Convert Jalali (jy, jm, jd) to Gregorian `YYYY-MM-DD`. */
export function jalaliToIsoDate(jy: number, jm: number, jd: number): string {
  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
  return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
}

/**
 * Format a `YYYY-MM-DD` Gregorian date string into Persian Jalali text.
 * - `short`: `۱۴۰۵/۰۷/۰۷`
 * - `long`: `۷ مهر ۱۴۰۵`
 * - `full`: `سه‌شنبه ۷ مهر ۱۴۰۵`
 * - `monthDay`: `۷ مهر`
 */
export function formatJalaliDate(
  dateStr: string | null | undefined,
  style: "short" | "long" | "full" | "monthDay" = "long",
): string {
  if (!dateStr) return "—";
  const j = parseToJalali(dateStr);
  if (!j) return toPersianDigits(dateStr);

  const monthName = JALALI_MONTHS[j.jm - 1] || "";
  if (style === "short") {
    return toPersianDigits(
      `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}`,
    );
  }
  if (style === "monthDay") {
    return `${toPersianDigits(j.jd)} ${monthName}`;
  }
  if (style === "full") {
    const [y, m, d] = dateStr.split("-").map(Number);
    const jsDate = new Date(y, m - 1, d, 12);
    const weekday = JALALI_WEEKDAYS[jsDate.getDay()];
    return `${weekday}، ${toPersianDigits(j.jd)} ${monthName} ${toPersianDigits(j.jy)}`;
  }
  return `${toPersianDigits(j.jd)} ${monthName} ${toPersianDigits(j.jy)}`;
}

/** Format an ISO or SQLite timestamp (`YYYY-MM-DD HH:MM:SS`) into Jalali date + time. */
export function formatJalaliDateTime(timestamp: string | null | undefined): string {
  if (!timestamp) return "—";
  const datePart = timestamp.slice(0, 10);
  const timeMatch = /(\d{2}:\d{2})/.exec(timestamp.slice(10));
  const jalali = formatJalaliDate(datePart, "long");
  if (timeMatch) {
    return `${jalali} ساعت ${toPersianDigits(timeMatch[1])}`;
  }
  return jalali;
}

export const STATUS_LABELS: Record<string, string> = {
  booked: "رزرو شده",
  confirmed: "تایید شده",
  in_progress: "در حال انجام",
  checked_in: "پذیرش شده",
  completed: "تکمیل شده",
  cancelled: "لغو شده",
  no_show: "عدم حضور",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "پرداخت نشده",
  deposit: "بیعانه دریافت شد",
  paid: "تسویه کامل",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  "": "نامشخص",
  card: "کارتخوان (POS)",
  cash: "نقدی",
  transfer: "کارت به کارت",
  online: "پرداخت آنلاین",
};
