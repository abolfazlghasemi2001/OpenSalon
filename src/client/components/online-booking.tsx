import { useState, useEffect } from "preact/hooks";
import { api } from "../api";
import { useApp } from "../context";
import type { Appointment } from "../types";
import {
  Sparkles,
  CalendarDays,
  Clock,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from "lucide-preact";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { today } from "@/lib/dates";
import {
  formatCurrency,
  formatDuration,
  formatJalaliDate,
  formatTimeFa,
  toPersianDigits,
} from "@/lib/format";
import { cn } from "@/lib/utils";

interface SlotItem {
  time: string;
  available: boolean;
}

export function OnlineBooking() {
  const { services, staffLookup, clientLookup, addClient, addAppointment, navigate, setError } = useApp();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [staffId, setStaffId] = useState<string>(staffLookup[0]?.id ? String(staffLookup[0].id) : "");
  const [date, setDate] = useState(today());
  const [startTime, setStartTime] = useState("10:00");
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Customer info
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmedApt, setConfirmedApt] = useState<Appointment | null>(null);

  const activeServices = services.filter((s) => s.active);
  const totalDuration = activeServices
    .filter((s) => selectedServices.includes(s.id))
    .reduce((sum, s) => sum + s.duration, 0) || 60;
  const totalPrice = activeServices
    .filter((s) => selectedServices.includes(s.id))
    .reduce((sum, s) => sum + s.price, 0);

  useEffect(() => {
    if (!staffId && staffLookup.length > 0) {
      setStaffId(String(staffLookup[0].id));
    }
  }, [staffLookup, staffId]);

  useEffect(() => {
    if (step !== 2) return;
    let cancelled = false;
    (async () => {
      setLoadingSlots(true);
      try {
        const params = new URLSearchParams({
          date,
          duration: String(totalDuration),
        });
        if (staffId) params.set("staff_id", staffId);
        const res = await api<{ slots: SlotItem[] }>("GET", `/api/availability?${params}`);
        if (!cancelled) {
          setSlots(res.slots);
          const firstFree = res.slots.find((s) => s.available);
          if (firstFree && !res.slots.some((s) => s.time === startTime && s.available)) {
            setStartTime(firstFree.time);
          }
        }
      } catch {
        // Ignore slot errors
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    })();
    return () => { cancelled = true; };
  }, [step, date, staffId, totalDuration]);

  const toggleService = (id: number) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleConfirmBooking = async () => {
    if (!clientName.trim() || !clientPhone.trim()) {
      setError("لطفاً نام و شماره موبایل خود را وارد کنید");
      return;
    }
    setSubmitting(true);
    try {
      // Check if client exists by phone or name
      let existing = clientLookup.find(
        (c) =>
          (c.phone && c.phone === clientPhone.trim()) ||
          c.name.trim() === clientName.trim(),
      );
      let clientId = existing?.id;
      if (!clientId) {
        const created = await addClient({
          name: clientName.trim(),
          phone: clientPhone.trim(),
          notes: "ثبت‌شده از طریق پرتال رزرو آنلاین",
        });
        clientId = created?.id;
      }
      if (!clientId) throw new Error("خطا در ثبت اطلاعات مشتری");

      const apt = await addAppointment({
        client_id: clientId,
        staff_id: staffId ? parseInt(staffId, 10) : null,
        scheduled_date: date,
        start_time: startTime,
        service_ids: selectedServices,
        notes: notes ? `[رزرو آنلاین] ${notes}` : "رزرو آنلاین مشتری",
      });
      if (apt) setConfirmedApt(apt);
      setStep(4);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="rounded-2xl bg-gradient-to-l from-primary/15 via-primary/5 to-transparent p-6 border border-primary/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              سامانه نوبت‌دهی آنلاین سالن زیبایی اپن‌سالن
            </span>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight">رزرو آنلاین وقت خدمات زیبایی</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              خدمات دلخواه خود را انتخاب کنید، ساعت‌های آزاد آرایشگر را ببینید و آنی نوبت خود را ثبت نمایید.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border",
                  step === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : step > s
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-border bg-background text-muted-foreground",
                )}
              >
                {toPersianDigits(s)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              مرحله ۱: خدمات مورد نظر خود را انتخاب کنید
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {activeServices.map((svc) => {
                const isSelected = selectedServices.includes(svc.id);
                return (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => toggleService(svc.id)}
                    className={cn(
                      "flex flex-col justify-between rounded-xl border p-4 text-right transition-all",
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                        : "hover:border-primary/40 hover:bg-muted/30",
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold">{svc.name}</span>
                        <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: svc.color }} />
                      </div>
                      {svc.description && (
                        <p className="mt-1 text-xs text-muted-foreground">{svc.description}</p>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t pt-2 text-xs">
                      <span className="text-muted-foreground">مدت: {formatDuration(svc.duration)}</span>
                      <span className="font-bold text-primary">
                        {svc.price === 0 ? "رایگان" : formatCurrency(svc.price)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedServices.length > 0 && (
              <div className="flex flex-wrap items-center justify-between rounded-xl bg-muted/60 p-4 text-sm">
                <div>
                  <span>تعداد خدمات انتخابی: <strong>{toPersianDigits(selectedServices.length)} مورد</strong></span>
                  <span className="mx-2">·</span>
                  <span>مدت زمان کل: <strong>{formatDuration(totalDuration)}</strong></span>
                </div>
                <div className="font-extrabold text-primary">
                  مبلغ کل: {formatCurrency(totalPrice)}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                disabled={selectedServices.length === 0}
                onClick={() => setStep(2)}
                className="gap-1.5"
              >
                مرحله بعد: انتخاب متخصص و ساعت
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5 text-primary" />
              مرحله ۲: انتخاب متخصص، تاریخ شمسی و ساعت آزاد
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>انتخاب آرایشگر / متخصص</Label>
                <div className="grid grid-cols-2 gap-2">
                  {staffLookup.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStaffId(String(s.id))}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-2.5 text-right text-xs font-semibold transition-all",
                        staffId === String(s.id)
                          ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                          : "hover:bg-muted/50",
                      )}
                    >
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="truncate">{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>انتخاب تاریخ مراجعه (شمسی)</Label>
                <JalaliDatePicker value={date} onChange={setDate} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary" />
                ساعت‌های قابل رزرو در {formatJalaliDate(date, "full")}
              </Label>
              {loadingSlots ? (
                <p className="py-6 text-center text-xs text-muted-foreground">در حال بررسی ساعت‌های آزاد...</p>
              ) : (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {slots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setStartTime(slot.time)}
                      className={cn(
                        "rounded-lg border py-2 text-center text-xs font-semibold transition-colors",
                        !slot.available
                          ? "cursor-not-allowed border-border/50 bg-muted/40 text-muted-foreground/40 line-through"
                          : startTime === slot.time
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-emerald-200 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100",
                      )}
                    >
                      {formatTimeFa(slot.time)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-1.5">
                <ArrowRight className="h-4 w-4" /> مرحله قبل
              </Button>
              <Button onClick={() => setStep(3)} className="gap-1.5">
                مرحله بعد: مشخصات تماس
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCheck className="h-5 w-5 text-primary" />
              مرحله ۳: تکمیل اطلاعات تماس و تایید نهایی
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-muted/30 p-4 text-xs leading-6">
              <p>
                <strong>تاریخ و ساعت:</strong> {formatJalaliDate(date, "full")} — ساعت {formatTimeFa(startTime)}
              </p>
              <p>
                <strong>متخصص:</strong> {staffLookup.find((s) => String(s.id) === staffId)?.name || "تعیین توسط سالن"}
              </p>
              <p>
                <strong>خدمات انتخابی:</strong>{" "}
                {activeServices.filter((s) => selectedServices.includes(s.id)).map((s) => s.name).join("، ")}
              </p>
              <p className="mt-1 text-sm font-bold text-primary">
                مبلغ کل خدمات: {formatCurrency(totalPrice)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>نام و نام خانوادگی شما *</Label>
                <Input
                  placeholder="مثلاً سارا احمدی"
                  value={clientName}
                  onChange={(e) => setClientName((e.target as HTMLInputElement).value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>شماره موبایل جهت ارسال پیامک تایید *</Label>
                <Input
                  placeholder="0912..."
                  value={clientPhone}
                  onChange={(e) => setClientPhone((e.target as HTMLInputElement).value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>توضیحات تکمیلی (اختیاری)</Label>
              <Textarea
                rows={2}
                placeholder="اگر نکته خاصی مد نظر دارید بنویسید..."
                value={notes}
                onChange={(e) => setNotes((e.target as HTMLTextAreaElement).value)}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-1.5">
                <ArrowRight className="h-4 w-4" /> مرحله قبل
              </Button>
              <Button disabled={submitting} onClick={handleConfirmBooking}>
                {submitting ? "در حال ثبت نوبت..." : "ثبت قطعی نوبت"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && confirmedApt && (
        <Card className="border-emerald-300 bg-emerald-50/30">
          <CardContent className="flex flex-col items-center space-y-4 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-extrabold text-emerald-800">نوبت شما با موفقیت ثبت شد!</h2>
            <p className="text-sm text-muted-foreground">
              کد پیگیری نوبت شما: <strong className="font-mono text-base text-primary">{confirmedApt.identifier}</strong>
            </p>
            <div className="w-full max-w-md rounded-xl border bg-background p-4 text-right text-sm space-y-2 shadow-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">نام مشتری:</span>
                <span className="font-bold">{clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">تاریخ مراجعه:</span>
                <span className="font-bold">{formatJalaliDate(confirmedApt.scheduled_date, "full")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ساعت:</span>
                <span className="font-bold">
                  {formatTimeFa(confirmedApt.start_time)} تا {formatTimeFa(confirmedApt.end_time)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">مبلغ قابل پرداخت:</span>
                <span className="font-bold text-primary">{formatCurrency(confirmedApt.total_price)}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button variant="outline" onClick={() => navigate(`/appointments/${confirmedApt.id}`)}>
                مشاهده جزئیات نوبت در پنل
              </Button>
              <Button
                onClick={() => {
                  setSelectedServices([]);
                  setConfirmedApt(null);
                  setStep(1);
                }}
              >
                ثبت نوبت جدید دیگر
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
