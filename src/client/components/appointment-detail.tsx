import { useState, useEffect } from "preact/hooks";
import { useApp } from "../context";
import {
  ArrowRight,
  Trash2,
  Send,
  Clock,
  User,
  Wallet,
  MessageSquare,
  Printer,
  Check,
  Copy,
  Save,
} from "lucide-preact";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { StatusBadge, PaymentBadge } from "./status-badge";
import { RescheduleAppointment } from "./reschedule-appointment";
import { conflictsFrom, conflictSentence } from "@/lib/conflicts";
import {
  formatCurrency,
  formatDuration,
  formatJalaliDate,
  formatJalaliDateTime,
  formatTimeFa,
} from "@/lib/format";

export function AppointmentDetail() {
  const {
    selectedAppointment: apt, navigate, updateAppointment, deleteAppointment,
    addAppointmentNote, deleteAppointmentNote, staffLookup, setError,
  } = useApp();
  const [noteText, setNoteText] = useState("");
  const [rescheduling, setRescheduling] = useState(false);

  // Financial state synced with selectedAppointment
  const [discountAmount, setDiscountAmount] = useState("0");
  const [depositAmount, setDepositAmount] = useState("0");
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [savingFinance, setSavingFinance] = useState(false);
  const [financeSaved, setFinanceSaved] = useState(false);

  // SMS Template state
  const [smsTemplate, setSmsTemplate] = useState<"confirm" | "reminder" | "thanks">("confirm");
  const [smsCopied, setSmsCopied] = useState(false);
  const [smsLogged, setSmsLogged] = useState(false);

  useEffect(() => {
    if (apt) {
      setDiscountAmount(String(apt.discount_amount ?? 0));
      setDepositAmount(String(apt.deposit_amount ?? 0));
      setPaymentStatus(apt.payment_status || "unpaid");
      setPaymentMethod(apt.payment_method || "");
    }
  }, [apt]);

  if (!apt) return null;

  const save = async (patch: Partial<typeof apt>) => {
    try {
      await updateAppointment(apt.id, patch);
    } catch (err) {
      const clashes = conflictsFrom(err);
      setError(clashes
        ? conflictSentence(staffLookup.find((s) => s.id === patch.staff_id)?.name ?? "", clashes)
        : (err as Error).message);
    }
  };

  const handleStatusChange = (status: string) => save({ status } as Partial<typeof apt>);
  const handleStaffChange = (staffId: string) => save({ staff_id: staffId ? parseInt(staffId) : null } as Partial<typeof apt>);

  const handleSaveFinance = async () => {
    setSavingFinance(true);
    try {
      await updateAppointment(apt.id, {
        discount_amount: Math.max(0, Number(discountAmount) || 0),
        deposit_amount: Math.max(0, Number(depositAmount) || 0),
        payment_status: paymentStatus,
        payment_method: paymentMethod,
      });
      setFinanceSaved(true);
      setTimeout(() => setFinanceSaved(false), 2000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingFinance(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    await addAppointmentNote(apt.id, noteText.trim());
    setNoteText("");
  };

  const discountNum = Math.max(0, Number(discountAmount) || 0);
  const depositNum = Math.max(0, Number(depositAmount) || 0);
  const netPayable = Math.max(0, (apt.total_price || 0) - discountNum);
  const remainingBalance =
    paymentStatus === "paid"
      ? 0
      : paymentStatus === "deposit"
        ? Math.max(0, netPayable - depositNum)
        : netPayable;

  const servicesListText = apt.appointment_services?.map((s) => s.service_name).filter(Boolean).join("، ") || "خدمات زیبایی";
  const jalaliDateText = formatJalaliDate(apt.scheduled_date, "full");
  const startFa = formatTimeFa(apt.start_time);

  const smsMessages: Record<"confirm" | "reminder" | "thanks", string> = {
    confirm: `${apt.client_name || "مشتری"} عزیز، نوبت شما در سالن زیبایی اپن‌سالن برای «${servicesListText}» در تاریخ ${jalaliDateText} ساعت ${startFa} با ${apt.staff_name || "متخصص سالن"} ثبت و تایید شد. کد پیگیری: ${apt.identifier}`,
    reminder: `یادآوری نوبت: ${apt.client_name || "مشتری"} عزیز، فردا (${jalaliDateText}) ساعت ${startFa} در سالن زیبایی اپن‌سالن منتظر دیدار شما هستیم. در صورت نیاز به تغییر ساعت لطفاً اطلاع دهید.`,
    thanks: `${apt.client_name || "مشتری"} عزیز، از همراهی و اعتماد شما به سالن زیبایی اپن‌سالن سپاسگزاریم. امیدواریم از خدمات «${servicesListText}» رضایت کامل داشته باشید.`,
  };

  const currentSms = smsMessages[smsTemplate];

  const handleCopySms = async () => {
    try {
      await navigator.clipboard.writeText(currentSms);
      setSmsCopied(true);
      setTimeout(() => setSmsCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleSendAndLogSms = async () => {
    await addAppointmentNote(apt.id, `📩 پیامک ارسال شد: «${currentSms}»`);
    setSmsLogged(true);
    setTimeout(() => setSmsLogged(false), 2500);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="no-print flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/appointments")}>
          <ArrowRight className="ml-1 h-4 w-4" /> بازگشت به لیست
        </Button>
        <h1 className="flex-1 text-2xl font-bold">نوبت {apt.identifier}</h1>
        <StatusBadge status={apt.status} />
        <PaymentBadge status={apt.payment_status} />
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="ml-1.5 h-3.5 w-3.5" /> چاپ فاکتور
        </Button>
        <Button variant="destructive" size="sm" onClick={() => deleteAppointment(apt.id)}>
          <Trash2 className="ml-1.5 h-3.5 w-3.5" /> حذف نوبت
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>اطلاعات و وضعیت نوبت</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> تاریخ و ساعت مراجعه
                  </Label>
                  <p className="text-sm font-semibold">{formatJalaliDate(apt.scheduled_date, "full")}</p>
                  <p className="text-xs text-muted-foreground">
                    ساعت {formatTimeFa(apt.start_time)} تا {formatTimeFa(apt.end_time)}
                  </p>
                  <Button variant="outline" size="sm" className="no-print mt-1 px-3" onClick={() => setRescheduling(true)}>
                    تغییر تاریخ یا ساعت
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <User className="h-3.5 w-3.5" /> مشخصات مشتری
                  </Label>
                  <button
                    className="block text-base font-bold text-primary hover:underline"
                    onClick={() => navigate(`/clients/${apt.client_id}`)}
                  >
                    {apt.client_name}
                  </button>
                  {apt.client_phone && (
                    <p className="text-xs text-muted-foreground" dir="ltr">
                      {apt.client_phone}
                    </p>
                  )}
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">متخصص / پرسنل مسئول</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={apt.staff_id || ""}
                    onChange={(e) => handleStaffChange((e.target as HTMLSelectElement).value)}
                  >
                    <option value="">بدون تعیین پرسنل</option>
                    {staffLookup.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">وضعیت اجرایی نوبت</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={apt.status}
                    onChange={(e) => handleStatusChange((e.target as HTMLSelectElement).value)}
                  >
                    <option value="booked">رزرو شده</option>
                    <option value="confirmed">تایید شده</option>
                    <option value="in_progress">در حال انجام</option>
                    <option value="completed">تکمیل شده</option>
                    <option value="cancelled">لغو شده</option>
                    <option value="no_show">عدم حضور</option>
                  </select>
                </div>
              </div>
              {apt.notes && (
                <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                  <Label className="text-xs text-muted-foreground">توضیحات ثبت‌شده هنگام رزرو</Label>
                  <p className="text-sm">{apt.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial & Payment Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4 text-primary" />
                صورتحساب، تخفیف و تسویه مالی
              </CardTitle>
              <Button
                size="sm"
                className="no-print gap-1.5"
                disabled={savingFinance}
                onClick={handleSaveFinance}
              >
                {financeSaved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                {financeSaved ? "ذخیره شد" : savingFinance ? "در حال ثبت..." : "ذخیره اطلاعات مالی"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">تخفیف (تومان)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="10000"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount((e.target as HTMLInputElement).value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">بیعانه دریافتی (تومان)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="50000"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount((e.target as HTMLInputElement).value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">وضعیت پرداخت</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus((e.target as HTMLSelectElement).value)}
                  >
                    <option value="unpaid">پرداخت نشده</option>
                    <option value="deposit">بیعانه دریافت شد</option>
                    <option value="paid">تسویه کامل</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">روش پرداخت</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod((e.target as HTMLSelectElement).value)}
                  >
                    <option value="">انتخاب...</option>
                    <option value="card">کارتخوان (POS)</option>
                    <option value="transfer">کارت به کارت</option>
                    <option value="cash">نقدی</option>
                    <option value="online">پرداخت آنلاین</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-xl border bg-muted/30 p-3.5 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">جمع کل خدمات</p>
                  <p className="text-sm font-semibold">{formatCurrency(apt.total_price)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">تخفیف</p>
                  <p className="text-sm font-semibold text-emerald-600">{formatCurrency(discountNum)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">مبلغ نهایی فاکتور</p>
                  <p className="text-sm font-bold text-primary">{formatCurrency(netPayable)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">مانده قابل پرداخت</p>
                  <p className={`text-sm font-bold ${remainingBalance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {remainingBalance === 0 ? "تسویه شده (۰ تومان)" : formatCurrency(remainingBalance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SMS & Notification Center */}
          <Card className="no-print">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4 text-primary" />
                ارسال پیامک و اطلاع‌رسانی به مشتری
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={smsTemplate === "confirm" ? "default" : "outline"}
                  onClick={() => setSmsTemplate("confirm")}
                >
                  قالب تایید نوبت
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={smsTemplate === "reminder" ? "default" : "outline"}
                  onClick={() => setSmsTemplate("reminder")}
                >
                  قالب یادآوری فردا
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={smsTemplate === "thanks" ? "default" : "outline"}
                  onClick={() => setSmsTemplate("thanks")}
                >
                  قالب تشکر از مراجعه
                </Button>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3 text-xs leading-6 text-foreground">
                {currentSms}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleCopySms}>
                  {smsCopied ? <Check className="ml-1.5 h-3.5 w-3.5 text-emerald-600" /> : <Copy className="ml-1.5 h-3.5 w-3.5" />}
                  {smsCopied ? "کپی شد" : "کپی متن پیامک"}
                </Button>
                <Button type="button" size="sm" onClick={handleSendAndLogSms}>
                  <Send className="ml-1.5 h-3.5 w-3.5" />
                  {smsLogged ? "در پرونده ثبت شد!" : "ارسال پیامک و ثبت در پرونده"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">ریز خدمات نوبت</CardTitle>
            </CardHeader>
            <CardContent>
              {(!apt.appointment_services || apt.appointment_services.length === 0) ? (
                <p className="text-sm text-muted-foreground">خدمتی برای این نوبت ثبت نشده است</p>
              ) : (
                <div className="space-y-2.5">
                  {apt.appointment_services.map((svc) => (
                    <div key={svc.id} className="flex items-center justify-between border-b pb-2 last:border-b-0 last:pb-0 text-sm">
                      <span className="font-medium">{svc.service_name || `خدمت #${svc.service_id}`}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{formatDuration(svc.duration)}</span>
                        <span className="font-semibold">{formatCurrency(svc.price)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="no-print">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">یادداشت‌ها و سابقه فعالیت</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="ثبت یادداشت جدید (فرمول رنگ، توضیحات...)"
                  value={noteText}
                  onChange={(e) => setNoteText((e.target as HTMLInputElement).value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                />
                <Button variant="outline" size="icon" onClick={handleAddNote} title="ثبت یادداشت">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {(!apt.appointment_notes || apt.appointment_notes.length === 0) ? (
                <p className="text-sm text-muted-foreground">هنوز یادداشتی ثبت نشده است</p>
              ) : (
                <div className="space-y-2">
                  {apt.appointment_notes.map((note) => (
                    <div key={note.id} className="rounded-md border bg-muted/30 p-2.5">
                      <p className="text-sm leading-6">{note.content}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">
                          {formatJalaliDateTime(note.created_at)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteAppointmentNote(note.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      {rescheduling && <RescheduleAppointment key={apt.id} appointment={apt} onClose={() => setRescheduling(false)} />}
    </div>
  );
}
