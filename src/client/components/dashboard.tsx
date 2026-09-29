import { useState } from "preact/hooks";
import { useApp } from "../context";
import {
  CalendarDays,
  Users,
  Clock,
  Wallet,
  Package,
  AlertTriangle,
  Plus,
  Sparkles,
  BarChart3,
  Globe,
} from "lucide-preact";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { today } from "@/lib/dates";
import { formatCurrency, formatJalaliDate, formatTimeFa, toPersianDigits } from "@/lib/format";
import { StatusBadge, PaymentBadge } from "./status-badge";
import { CreateAppointment } from "./create-appointment";

export function Dashboard() {
  const { stats, navigate, calendarAppointments, seedDemoAppointments } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const todayStr = today();
  const todayAppointments = calendarAppointments
    .filter((a) => a.scheduled_date === todayStr)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      await seedDemoAppointments();
    } finally {
      setSeeding(false);
    }
  };

  const statCards = [
    {
      label: "نوبت‌های امروز",
      value: toPersianDigits(stats.today_appointments),
      icon: CalendarDays,
      color: "text-violet-600 bg-violet-50",
      onClick: () => navigate("/calendar"),
    },
    {
      label: "نوبت‌های پیش‌رو",
      value: toPersianDigits(stats.upcoming_appointments),
      icon: Clock,
      color: "text-blue-600 bg-blue-50",
      onClick: () => navigate("/appointments"),
    },
    {
      label: "پرونده مشتریان",
      value: toPersianDigits(stats.clients),
      icon: Users,
      color: "text-emerald-600 bg-emerald-50",
      onClick: () => navigate("/clients"),
    },
    {
      label: "درآمد تکمیل‌شده",
      value: formatCurrency(stats.revenue),
      icon: Wallet,
      color: "text-amber-600 bg-amber-50",
      onClick: () => navigate("/reports"),
    },
    {
      label: "محصولات انبار",
      value: toPersianDigits(stats.products),
      icon: Package,
      color: "text-rose-600 bg-rose-50",
      onClick: () => navigate("/products"),
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">داشبورد مدیریت سالن</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            امروز: <span className="font-semibold text-foreground">{formatJalaliDate(todayStr, "full")}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/booking")}>
            <Globe className="ml-1.5 h-4 w-4 text-primary" />
            پرتال رزرو مشتری
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/reports")}>
            <BarChart3 className="ml-1.5 h-4 w-4 text-emerald-600" />
            گزارش مالی و پورسانت
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="ml-1.5 h-4 w-4" />
            ثبت نوبت جدید
          </Button>
        </div>
      </div>

      {showCreate && <CreateAppointment onClose={() => setShowCreate(false)} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat) => (
          <Card
            key={stat.label}
            className={stat.onClick ? "cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md" : ""}
            onClick={stat.onClick}
          >
            <CardContent className="flex items-center gap-3.5 p-4">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-lg font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
        {stats.low_stock_products > 0 && (
          <Card
            className="cursor-pointer border-amber-200 bg-amber-50/30 transition-shadow hover:shadow-md"
            onClick={() => navigate("/products")}
          >
            <CardContent className="flex items-center gap-3.5 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-bold text-amber-800">{toPersianDigits(stats.low_stock_products)} کالا</div>
                <div className="text-xs text-amber-700">هشدار اتمام موجودی انبار</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
          <div>
            <CardTitle className="text-lg">برنامه نوبت‌های امروز ({formatJalaliDate(todayStr, "monthDay")})</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {todayAppointments.length === 0 && (
              <Button variant="secondary" size="sm" disabled={seeding} onClick={handleSeedDemo}>
                <Sparkles className="ml-1.5 h-3.5 w-3.5 text-primary" />
                {seeding ? "در حال ایجاد..." : "افزودن نوبت‌های نمونه امروز"}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate("/calendar")}>
              مشاهده تقویم ستونی
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {todayAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">هنوز نوبتی برای امروز ثبت نشده است.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" onClick={() => setShowCreate(true)}>
                  <Plus className="ml-1.5 h-4 w-4" /> ثبت اولین نوبت امروز
                </Button>
                <Button variant="outline" size="sm" disabled={seeding} onClick={handleSeedDemo}>
                  <Sparkles className="ml-1.5 h-4 w-4 text-primary" /> بارگذاری برنامه نمونه امروز
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">ساعت</TableHead>
                  <TableHead>مشتری</TableHead>
                  <TableHead>خدمات</TableHead>
                  <TableHead className="w-40">متخصص / پرسنل</TableHead>
                  <TableHead className="w-28">وضعیت نوبت</TableHead>
                  <TableHead className="w-32">وضعیت پرداخت</TableHead>
                  <TableHead className="w-36 text-left">مبلغ قابل پرداخت</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayAppointments.map((apt) => {
                  const services = apt.appointment_services?.map((s) => s.service_name).filter(Boolean).join("، ");
                  const netPrice = Math.max(0, (apt.total_price || 0) - (apt.discount_amount || 0));
                  return (
                    <TableRow key={apt.id} className="cursor-pointer" onClick={() => navigate(`/appointments/${apt.id}`)}>
                      <TableCell className="font-semibold">
                        {formatTimeFa(apt.start_time)} تا {formatTimeFa(apt.end_time)}
                      </TableCell>
                      <TableCell className="font-medium">{apt.client_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{services || "—"}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          {apt.staff_name && (
                            <span
                              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: apt.staff_color || "#7c3aed" }}
                            />
                          )}
                          <span>{apt.staff_name || "تعیین نشده"}</span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={apt.status} />
                      </TableCell>
                      <TableCell>
                        <PaymentBadge status={apt.payment_status} />
                      </TableCell>
                      <TableCell className="text-left font-semibold">
                        {formatCurrency(netPrice)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
