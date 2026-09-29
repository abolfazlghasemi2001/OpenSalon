import { useState } from "preact/hooks";
import { useApp } from "../context";
import { Plus, Search, Trash2 } from "lucide-preact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge, PaymentBadge } from "./status-badge";
import { Pagination } from "./pagination";
import { CreateAppointment } from "./create-appointment";
import { formatCurrency, formatJalaliDate, formatTimeFa } from "@/lib/format";

export function AppointmentList() {
  const {
    appointments, appointmentsPag, setAppointmentsPage,
    appointmentsSearch, setAppointmentsSearch,
    appointmentsStatusFilter, setAppointmentsStatusFilter,
    deleteAppointment, navigate,
  } = useApp();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">مدیریت نوبت‌ها</h1>
          <p className="text-xs text-muted-foreground">جستجو، فیلتر وضعیت و مدیریت تمامی رزروهای سالن</p>
        </div>
        <Button size="sm" className="min-h-10 gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> ثبت نوبت جدید
        </Button>
      </div>

      {showCreate && <CreateAppointment onClose={() => setShowCreate(false)} />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-10 pr-9"
            placeholder="جستجوی نام مشتری، شماره تماس یا کد نوبت (مثلاً APT-1)..."
            value={appointmentsSearch}
            onInput={(e) => setAppointmentsSearch((e.target as HTMLInputElement).value)}
          />
        </div>
        <select
          aria-label="فیلتر بر اساس وضعیت"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-48"
          value={appointmentsStatusFilter}
          onChange={(e) => setAppointmentsStatusFilter((e.target as HTMLSelectElement).value)}
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="booked">رزرو شده</option>
          <option value="confirmed">تایید شده</option>
          <option value="in_progress">در حال انجام</option>
          <option value="completed">تکمیل شده</option>
          <option value="cancelled">لغو شده</option>
          <option value="no_show">عدم حضور</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y lg:hidden">
            {appointments.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">هیچ نوبتی با این مشخصات یافت نشد</p>
            )}
            {appointments.map((apt) => {
              const netPrice = Math.max(0, (apt.total_price || 0) - (apt.discount_amount || 0));
              return (
                <div key={apt.id} className="flex items-stretch">
                  <button
                    type="button"
                    className="min-w-0 flex-1 p-4 text-right transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    onClick={() => navigate(`/appointments/${apt.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          {formatJalaliDate(apt.scheduled_date, "long")} ساعت {formatTimeFa(apt.start_time)}
                        </p>
                        <p className="break-words font-semibold">{apt.client_name || "—"}</p>
                        <span className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                          {apt.staff_name && <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: apt.staff_color || "#7c3aed" }} />}
                          <span className="truncate">{apt.staff_name || "بدون پرسنل"}</span>
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge status={apt.status} />
                        <PaymentBadge status={apt.payment_status} />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                      <span className="font-mono text-xs text-primary">{apt.identifier}</span>
                      <span className="font-semibold">{formatCurrency(netPrice)}</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    aria-label={`حذف نوبت ${apt.identifier}`}
                    className="flex w-12 shrink-0 items-center justify-center border-r text-muted-foreground transition-colors hover:bg-muted/50 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    onClick={() => deleteAppointment(apt.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">کد نوبت</TableHead>
                  <TableHead className="w-36">تاریخ (شمسی)</TableHead>
                  <TableHead className="w-28">ساعت</TableHead>
                  <TableHead>نام مشتری</TableHead>
                  <TableHead className="w-40">متخصص / پرسنل</TableHead>
                  <TableHead className="w-28">وضعیت نوبت</TableHead>
                  <TableHead className="w-32">وضعیت پرداخت</TableHead>
                  <TableHead className="w-36 text-left">مبلغ نهایی</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">هیچ نوبتی یافت نشد</TableCell>
                  </TableRow>
                )}
                {appointments.map((apt) => {
                  const netPrice = Math.max(0, (apt.total_price || 0) - (apt.discount_amount || 0));
                  return (
                    <TableRow key={apt.id} className="cursor-pointer" onClick={() => navigate(`/appointments/${apt.id}`)}>
                      <TableCell className="font-mono text-xs font-semibold text-primary">{apt.identifier}</TableCell>
                      <TableCell className="text-xs font-medium">{formatJalaliDate(apt.scheduled_date, "long")}</TableCell>
                      <TableCell className="text-xs">
                        {formatTimeFa(apt.start_time)} تا {formatTimeFa(apt.end_time)}
                      </TableCell>
                      <TableCell className="font-medium">{apt.client_name}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5">
                          {apt.staff_name && <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: apt.staff_color || "#7c3aed" }} />}
                          <span className="text-sm">{apt.staff_name || "تعیین نشده"}</span>
                        </span>
                      </TableCell>
                      <TableCell><StatusBadge status={apt.status} /></TableCell>
                      <TableCell><PaymentBadge status={apt.payment_status} /></TableCell>
                      <TableCell className="text-left font-semibold">{formatCurrency(netPrice)}</TableCell>
                      <TableCell>
                        <Button
                          aria-label={`حذف نوبت ${apt.identifier}`}
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); deleteAppointment(apt.id); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Pagination pag={appointmentsPag} setPage={setAppointmentsPage} />
    </div>
  );
}
