import { useState } from "preact/hooks";
import { useApp } from "../context";
import { TriangleAlert, UserPlus } from "lucide-preact";
import { conflictsFrom, describeConflict, type Conflict } from "@/lib/conflicts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { cn } from "@/lib/utils";
import { today } from "@/lib/dates";
import { formatCurrency, formatDuration } from "@/lib/format";

interface Props {
  onClose: () => void;
  defaultDate?: string;
  defaultClientId?: number;
  defaultStaffId?: number | null;
  defaultStartTime?: string;
}

export function CreateAppointment({ onClose, defaultDate, defaultClientId, defaultStaffId, defaultStartTime }: Props) {
  const { addAppointment, addClient, clientLookup, staffLookup, services, setError } = useApp();
  const [clientId, setClientId] = useState(defaultClientId ? String(defaultClientId) : "");
  const [staffId, setStaffId] = useState(defaultStaffId ? String(defaultStaffId) : "");
  const [date, setDate] = useState(defaultDate || today());
  const [startTime, setStartTime] = useState(defaultStartTime || "10:00");
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [discountAmount, setDiscountAmount] = useState("0");
  const [depositAmount, setDepositAmount] = useState("0");
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null);

  // Quick inline client creation
  const [showQuickClient, setShowQuickClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");

  const toggleService = (id: number) => {
    setConflicts(null);
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const totalPrice = services
    .filter((s) => selectedServices.includes(s.id))
    .reduce((sum, s) => sum + s.price, 0);

  const totalDuration = services
    .filter((s) => selectedServices.includes(s.id))
    .reduce((sum, s) => sum + s.duration, 0);

  const discountNum = Math.max(0, Number(discountAmount) || 0);
  const depositNum = Math.max(0, Number(depositAmount) || 0);
  const netPayable = Math.max(0, totalPrice - discountNum);

  const handleCreateQuickClient = async () => {
    if (!newClientName.trim()) {
      setError("نام مشتری را وارد کنید");
      return;
    }
    try {
      const created = await addClient({ name: newClientName.trim(), phone: newClientPhone.trim() });
      if (created && created.id) {
        setClientId(String(created.id));
      }
      setShowQuickClient(false);
      setNewClientName("");
      setNewClientPhone("");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSubmit = async (allowConflict = false) => {
    if (!clientId) { setError("لطفاً مشتری را انتخاب کنید"); return; }
    setSaving(true);
    setConflicts(null);
    try {
      await addAppointment({
        client_id: parseInt(clientId),
        staff_id: staffId ? parseInt(staffId) : null,
        scheduled_date: date,
        start_time: startTime,
        discount_amount: discountNum,
        deposit_amount: depositNum,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        notes,
        service_ids: selectedServices,
        ...(allowConflict ? { allow_conflict: true } : {}),
      });
      onClose();
    } catch (err) {
      const clashes = conflictsFrom(err);
      if (clashes) setConflicts(clashes);
      else setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ثبت نوبت جدید</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>مشتری *</Label>
                <button
                  type="button"
                  onClick={() => setShowQuickClient(!showQuickClient)}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <UserPlus className="h-3 w-3" />
                  مشتری جدید
                </button>
              </div>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={clientId}
                onChange={(e) => setClientId((e.target as HTMLSelectElement).value)}
              >
                <option value="">انتخاب مشتری...</option>
                {clientLookup.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>متخصص / پرسنل</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={staffId}
                onChange={(e) => { setStaffId((e.target as HTMLSelectElement).value); setConflicts(null); }}
              >
                <option value="">بدون تعیین پرسنل</option>
                {staffLookup.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {showQuickClient && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <p className="text-xs font-semibold text-primary">تعریف سریع مشتری جدید</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input
                  placeholder="نام و نام خانوادگی *"
                  value={newClientName}
                  onChange={(e) => setNewClientName((e.target as HTMLInputElement).value)}
                />
                <Input
                  placeholder="شماره موبایل (مثلاً 0912...)"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone((e.target as HTMLInputElement).value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowQuickClient(false)}>انصراف</Button>
                <Button type="button" size="sm" onClick={handleCreateQuickClient}>ثبت و انتخاب مشتری</Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>تاریخ نوبت (شمسی)</Label>
              <JalaliDatePicker value={date} onChange={(newDate) => { setDate(newDate); setConflicts(null); }} />
            </div>
            <div className="space-y-1.5">
              <Label>ساعت شروع</Label>
              <Input
                type="time"
                className="h-10"
                value={startTime}
                onChange={(e) => { setStartTime((e.target as HTMLInputElement).value); setConflicts(null); }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>انتخاب خدمات سالن</Label>
            <div className="flex flex-wrap gap-2">
              {services.filter((s) => s.active).map((svc) => (
                <button
                  type="button"
                  key={svc.id}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    selectedServices.includes(svc.id)
                      ? "border-primary bg-primary/10 text-primary shadow-xs"
                      : "border-border bg-background text-muted-foreground hover:border-primary/50"
                  )}
                  onClick={() => toggleService(svc.id)}
                >
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: svc.color }} />
                  <span>{svc.name}</span>
                  <span className="text-[10px] opacity-75">
                    ({formatDuration(svc.duration)} · {formatCurrency(svc.price)})
                  </span>
                </button>
              ))}
            </div>
            {selectedServices.length > 0 && (
              <div className="flex flex-wrap items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs">
                <span>مجموع زمان: <strong>{formatDuration(totalDuration)}</strong></span>
                <span>مبلغ پایه: <strong>{formatCurrency(totalPrice)}</strong></span>
                <span className="text-primary font-bold">قابل پرداخت: {formatCurrency(netPayable)}</span>
              </div>
            )}
          </div>

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
                onChange={(e) => {
                  const val = (e.target as HTMLInputElement).value;
                  setDepositAmount(val);
                  if (Number(val) > 0 && paymentStatus === "unpaid") setPaymentStatus("deposit");
                }}
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

          <div className="space-y-1.5">
            <Label>توضیحات و دستورالعمل نوبت</Label>
            <Textarea
              rows={2}
              placeholder="ترجیحات مشتری، فرمول رنگ، نکات ضروری..."
              value={notes}
              onChange={(e) => setNotes((e.target as HTMLTextAreaElement).value)}
            />
          </div>
        </div>

        {conflicts && (
          <div className="flex gap-2.5 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <TriangleAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-medium">
                {staffLookup.find((s) => String(s.id) === staffId)?.name ?? "این پرسنل"} در این ساعت نوبت دیگری دارد:
              </p>
              <ul className="text-muted-foreground">
                {conflicts.map((c) => (
                  <li key={`${c.start_time}-${c.label}`}>{describeConflict(c)}</li>
                ))}
              </ul>
              <p className="text-muted-foreground">ساعت یا پرسنل دیگری انتخاب کنید، یا نوبت را به صورت هم‌زمان ثبت نمایید.</p>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>انصراف</Button>
          {conflicts && (
            <Button variant="outline" disabled={saving} onClick={() => handleSubmit(true)}>
              ثبت با وجود تداخل زمانی
            </Button>
          )}
          <Button disabled={saving} onClick={() => handleSubmit()}>
            {saving ? "در حال ثبت..." : "ثبت نهایی نوبت"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
