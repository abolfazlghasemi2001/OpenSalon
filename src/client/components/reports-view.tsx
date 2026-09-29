import { useState, useEffect, useCallback } from "preact/hooks";
import { api } from "../api";
import { useApp } from "../context";
import type { ReportsData } from "../types";
import {
  Wallet,
  TrendingUp,
  Users,
  Percent,
  Package,
  CreditCard,
  Printer,
  Sparkles,
  AlertCircle,
} from "lucide-preact";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { shiftDate, today } from "@/lib/dates";
import {
  PAYMENT_METHOD_LABELS,
  formatCurrency,
  formatJalaliDate,
  toPersianDigits,
} from "@/lib/format";

type RangePreset = "all" | "today" | "week" | "month" | "custom";

export function ReportsView() {
  const { setError } = useApp();
  const todayStr = today();
  const [preset, setPreset] = useState<RangePreset>("all");
  const [startDate, setStartDate] = useState(shiftDate(todayStr, -30));
  const [endDate, setEndDate] = useState(todayStr);
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (preset === "today") {
        params.set("start", todayStr);
        params.set("end", todayStr);
      } else if (preset === "week") {
        params.set("start", shiftDate(todayStr, -7));
        params.set("end", todayStr);
      } else if (preset === "month") {
        params.set("start", shiftDate(todayStr, -30));
        params.set("end", todayStr);
      } else if (preset === "custom") {
        if (startDate) params.set("start", startDate);
        if (endDate) params.set("end", endDate);
      }
      const res = await api<ReportsData>("GET", `/api/reports?${params}`);
      setData(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [preset, startDate, endDate, todayStr, setError]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  if (loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        در حال محاسبه گزارش‌های مالی و پورسانت...
      </div>
    );
  }

  if (!data) return null;

  const { summary, staff_performance, top_services, payment_breakdown } = data;
  const inventoryProfit = Math.max(0, summary.inventory_value - summary.inventory_cost);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">گزارش مالی، حسابداری و پورسانت پرسنل</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            محاسبه دقیق درآمد خدمات، سهم پورسانت هر آرایشگر، سود خالص سالن و وضعیت صندوق
          </p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={preset === "all" ? "default" : "outline"}
            onClick={() => setPreset("all")}
          >
            همه زمان‌ها
          </Button>
          <Button
            size="sm"
            variant={preset === "today" ? "default" : "outline"}
            onClick={() => setPreset("today")}
          >
            امروز ({formatJalaliDate(todayStr, "monthDay")})
          </Button>
          <Button
            size="sm"
            variant={preset === "week" ? "default" : "outline"}
            onClick={() => setPreset("week")}
          >
            ۷ روز اخیر
          </Button>
          <Button
            size="sm"
            variant={preset === "month" ? "default" : "outline"}
            onClick={() => setPreset("month")}
          >
            ۳۰ روز اخیر
          </Button>
          <Button
            size="sm"
            variant={preset === "custom" ? "default" : "outline"}
            onClick={() => setPreset("custom")}
          >
            بازه دلخواه
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="ml-1.5 h-3.5 w-3.5" /> چاپ گزارش
          </Button>
        </div>
      </div>

      {preset === "custom" && (
        <Card className="no-print">
          <CardContent className="flex flex-wrap items-end gap-4 p-4">
            <div className="w-60 space-y-1">
              <span className="text-xs font-medium">از تاریخ (شمسی)</span>
              <JalaliDatePicker value={startDate} onChange={setStartDate} />
            </div>
            <div className="w-60 space-y-1">
              <span className="text-xs font-medium">تا تاریخ (شمسی)</span>
              <JalaliDatePicker value={endDate} onChange={setEndDate} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Financial KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">درآمد خالص خدمات تکمیل‌شده</p>
              <p className="text-xl font-extrabold text-primary">{formatCurrency(summary.net_revenue)}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                از {toPersianDigits(summary.completed_appointments)} نوبت تکمیل‌شده (تخفیف‌ها: {formatCurrency(summary.total_discounts)})
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
              <Percent className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">مجموع سهم پورسانت پرسنل</p>
              <p className="text-xl font-extrabold text-amber-700">{formatCurrency(summary.total_commissions)}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                محاسبه‌شده بر اساس درصد پورسانت هر متخصص
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">سود خالص سالن (پس از کسر پورسانت)</p>
              <p className="text-xl font-extrabold text-emerald-700">{formatCurrency(summary.salon_net_profit)}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                دریافتی صندوق: {formatCurrency(summary.total_collected)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Financial Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">مجموع وجوه دریافت‌شده (تسویه + بیعانه)</p>
              <p className="mt-1 text-lg font-bold text-emerald-600">{formatCurrency(summary.total_collected)}</p>
            </div>
            <CreditCard className="h-8 w-8 text-emerald-500/60" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">مانده مطالبات نوبت‌های تسویه‌نشده</p>
              <p className="mt-1 text-lg font-bold text-rose-600">{formatCurrency(summary.total_unpaid)}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-rose-500/60" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-xs text-muted-foreground">ارزش فروش موجودی انبار (سود انبار: {formatCurrency(inventoryProfit)})</p>
              <p className="mt-1 text-lg font-bold text-blue-600">{formatCurrency(summary.inventory_value)}</p>
            </div>
            <Package className="h-8 w-8 text-blue-500/60" />
          </CardContent>
        </Card>
      </div>

      {/* Staff Commission Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            جدول کارکرد و پورسانت پرسنل
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام متخصص / پرسنل</TableHead>
                <TableHead>سمت تخصصی</TableHead>
                <TableHead className="text-center">کل نوبت‌ها</TableHead>
                <TableHead className="text-center">نوبت تکمیل‌شده</TableHead>
                <TableHead className="text-center">نرخ پورسانت</TableHead>
                <TableHead className="text-left">کل کارکرد (تومان)</TableHead>
                <TableHead className="text-left">سهم پرسنل (پورسانت)</TableHead>
                <TableHead className="text-left">سهم خالص سالن</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff_performance.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-bold">
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.title || "—"}</TableCell>
                  <TableCell className="text-center">{toPersianDigits(s.total_appointments)}</TableCell>
                  <TableCell className="text-center font-semibold text-emerald-700">
                    {toPersianDigits(s.completed_appointments)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="font-semibold">
                      {toPersianDigits(s.commission_rate)}٪
                    </Badge>
                  </TableCell>
                  <TableCell className="text-left font-semibold">{formatCurrency(s.total_revenue)}</TableCell>
                  <TableCell className="text-left font-bold text-amber-700">
                    {formatCurrency(s.commission_amount)}
                  </TableCell>
                  <TableCell className="text-left font-bold text-emerald-700">
                    {formatCurrency(s.salon_share)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top Services & Payment Methods */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              محبوب‌ترین خدمات سالن
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نام خدمت</TableHead>
                  <TableHead>دسته</TableHead>
                  <TableHead className="text-center">تعداد رزرو</TableHead>
                  <TableHead className="text-left">مجموع ارزش</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top_services.map((svc) => (
                  <TableRow key={svc.id}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: svc.color }} />
                        {svc.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{svc.category || "—"}</TableCell>
                    <TableCell className="text-center font-semibold">{toPersianDigits(svc.booking_count)}</TableCell>
                    <TableCell className="text-left font-semibold">{formatCurrency(svc.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4 text-primary" />
              تفکیک دریافتی‌ها بر اساس روش پرداخت
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payment_breakdown.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                هنوز پرداخت ثبت‌شده‌ای در این بازه زمانی وجود ندارد
              </p>
            ) : (
              <div className="space-y-3">
                {payment_breakdown.map((item) => (
                  <div key={item.method} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-semibold">{PAYMENT_METHOD_LABELS[item.method] || item.method}</p>
                      <p className="text-xs text-muted-foreground">{toPersianDigits(item.count)} تراکنش</p>
                    </div>
                    <div className="text-left font-bold text-primary">
                      {formatCurrency(item.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
