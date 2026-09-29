import { useState } from "preact/hooks";
import { useApp } from "../context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { Staff } from "../types";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#ef4444", "#14b8a6", "#f97316"];

export function CreateStaff({ onClose, staff }: { onClose: () => void; staff?: Staff }) {
  const { addStaff, updateStaff, setError } = useApp();
  const [name, setName] = useState(staff?.name || "");
  const [email, setEmail] = useState(staff?.email || "");
  const [phone, setPhone] = useState(staff?.phone || "");
  const [title, setTitle] = useState(staff?.title || "");
  const [commissionRate, setCommissionRate] = useState(String(staff?.commission_rate ?? 45));
  const [color, setColor] = useState(staff?.color || COLORS[0]);
  const [saving, setSaving] = useState(false);

  const isEditing = staff !== undefined;

  const handleSubmit = async () => {
    if (!name.trim()) { setError("وارد کردن نام پرسنل الزامی است"); return; }
    setSaving(true);
    try {
      const rate = Math.min(100, Math.max(0, Number(commissionRate) || 0));
      if (staff) {
        await updateStaff(staff.id, { name: name.trim(), email, phone, title, color, commission_rate: rate });
      } else {
        await addStaff({ name: name.trim(), email, phone, title, color, commission_rate: rate });
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "ویرایش مشخصات پرسنل" : "افزودن پرسنل / متخصص جدید"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>نام و نام خانوادگی *</Label>
            <Input value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} placeholder="مثلاً مریم رضایی" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>عنوان تخصصی / سمت</Label>
              <Input value={title} onChange={(e) => setTitle((e.target as HTMLInputElement).value)} placeholder="مثلاً متخصص رنگ و لایت" />
            </div>
            <div className="space-y-1.5">
              <Label>درصد پورسانت (۰ تا ۱۰۰)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={commissionRate}
                onChange={(e) => setCommissionRate((e.target as HTMLInputElement).value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>شماره موبایل</Label>
              <Input value={phone} onChange={(e) => setPhone((e.target as HTMLInputElement).value)} placeholder="0912..." />
            </div>
            <div className="space-y-1.5">
              <Label>ایمیل (اختیاری)</Label>
              <Input type="email" value={email} onChange={(e) => setEmail((e.target as HTMLInputElement).value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>رنگ اختصاصی در تقویم</Label>
            <div className="flex gap-2 pt-1">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`h-8 w-8 rounded-full transition-transform ${color === c ? "scale-110 ring-2 ring-ring ring-offset-2" : "hover:scale-105"}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>انصراف</Button>
          <Button disabled={saving} onClick={handleSubmit}>
            {saving ? "در حال ذخیره..." : isEditing ? "ذخیره تغییرات" : "افزودن پرسنل"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
