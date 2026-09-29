import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatCurrency,
  formatJalaliDate,
  gregorianToJalali,
  jalaliToGregorian,
  jalaliToIsoDate,
  toEnglishDigits,
  toPersianDigits,
} from "./format.ts";

test("gregorianToJalali and jalaliToGregorian round-trip accurately", () => {
  // 2026-09-29 is 1405-07-07 (7 Mehr 1405)
  const j = gregorianToJalali(2026, 9, 29);
  assert.deepEqual(j, { jy: 1405, jm: 7, jd: 7 });

  const g = jalaliToGregorian(1405, 7, 7);
  assert.deepEqual(g, { gy: 2026, gm: 9, gd: 29 });

  // Nowruz 1405 -> 2026-03-21
  assert.equal(jalaliToIsoDate(1405, 1, 1), "2026-03-21");
});

test("formatJalaliDate renders short, long, and full Persian dates", () => {
  assert.equal(formatJalaliDate("2026-09-29", "short"), "۱۴۰۵/۰۷/۰۷");
  assert.equal(formatJalaliDate("2026-09-29", "long"), "۷ مهر ۱۴۰۵");
  assert.match(formatJalaliDate("2026-09-29", "full"), /سه‌شنبه، ۷ مهر ۱۴۰۵/);
});

test("toPersianDigits and toEnglishDigits convert digits cleanly", () => {
  assert.equal(toPersianDigits("09123456789"), "۰۹۱۲۳۴۵۶۷۸۹");
  assert.equal(toEnglishDigits("۰۹۱۲۳۴۵۶۷۸۹"), "09123456789");
});

test("formatCurrency formats Toman amounts with Persian digits", () => {
  assert.equal(formatCurrency(450000), "۴۵۰,۰۰۰ تومان");
  assert.equal(formatCurrency(0), "۰ تومان");
});
