import { useState } from "preact/hooks";
import { useApp } from "../context";
import type { Appointment } from "../types";
import { conflictsFrom, describeConflict, type Conflict } from "@/lib/conflicts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { formatJalaliDate, formatTimeFa } from "@/lib/format";

export function RescheduleAppointment({ appointment, onClose }: { appointment: Appointment; onClose: () => void }) {
  const { updateAppointment } = useApp();
  const [opener] = useState(() => document.activeElement as HTMLElement | null);
  const [date, setDate] = useState(appointment.scheduled_date);
  const [startTime, setStartTime] = useState(appointment.start_time);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null);
  const unchanged = date === appointment.scheduled_date && startTime === appointment.start_time;

  const clearFeedback = () => { setError(null); setConflicts(null); };
  const close = () => { if (!saving) onClose(); };
  const submit = async (allowConflict: boolean) => {
    if (saving || unchanged) return;
    setSaving(true);
    clearFeedback();
    try {
      await updateAppointment(appointment.id, {
        scheduled_date: date,
        start_time: startTime,
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
    <Dialog open onOpenChange={close}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto" onCloseAutoFocus={(event: Event) => {
        event.preventDefault();
        opener?.focus();
      }}>
        <DialogHeader>
          <DialogTitle>تغییر زمان نوبت (جابه‌جایی)</DialogTitle>
          <DialogDescription>
            {appointment.client_name} · کد {appointment.identifier}. تاریخ و ساعت جدید را انتخاب کنید؛ مدت زمان، خدمات و پرسنل حفظ می‌شوند.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => {
          event.preventDefault();
          submit(false);
        }}>
          <p className="rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground">
            زمان فعلی: <strong>{formatJalaliDate(appointment.scheduled_date, "full")}</strong>، ساعت{" "}
            <strong>{formatTimeFa(appointment.start_time)} تا {formatTimeFa(appointment.end_time)}</strong>
            {appointment.staff_name ? ` (با ${appointment.staff_name})` : " · بدون پرسنل"}
          </p>
          <fieldset disabled={saving} className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="reschedule-date">تاریخ جدید (شمسی)</Label>
              <JalaliDatePicker
                id="reschedule-date"
                value={date}
                onChange={(newDate) => {
                  setDate(newDate);
                  clearFeedback();
                }}
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="reschedule-time">ساعت شروع جدید</Label>
              <Input id="reschedule-time" type="time" className="h-10" required value={startTime} onChange={(e: Event) => {
                setStartTime((e.target as HTMLInputElement).value); clearFeedback();
              }} />
            </div>
          </fieldset>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {conflicts && (
            <div role="alert" className="space-y-1 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <p className="font-medium">{appointment.staff_name || "این پرسنل"} در این ساعت آزاد نیست:</p>
              <ul className="text-muted-foreground">
                {conflicts.map((conflict, index) => <li key={index}>{describeConflict(conflict)}</li>)}
              </ul>
              <p>ساعت دیگری را انتخاب کنید یا با تایید هم‌پوشانی، نوبت را منتقل نمایید.</p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={close}>انصراف</Button>
            {conflicts && <Button type="button" variant="outline" disabled={saving} onClick={(event: MouseEvent) => {
              if ((event.currentTarget as HTMLButtonElement).form?.reportValidity()) submit(true);
            }}>انتقال با وجود تداخل</Button>}
            <Button type="submit" disabled={saving || unchanged}>{saving ? "در حال ذخیره..." : "ذخیره تغییرات"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
