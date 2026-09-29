import { useState } from "preact/hooks";
import { useApp } from "../context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { Service } from "../types";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#ef4444", "#14b8a6", "#6b7280"];

export function CreateService({ onClose, service }: { onClose: () => void; service?: Service }) {
  const { addService, updateService, setError } = useApp();
  const [name, setName] = useState(service?.name || "");
  const [description, setDescription] = useState(service?.description || "");
  const [duration, setDuration] = useState(String(service?.duration ?? 60));
  const [price, setPrice] = useState(String(service?.price ?? 450000));
  const [category, setCategory] = useState(service?.category || "");
  const [color, setColor] = useState(service?.color || COLORS[0]);
  const [saving, setSaving] = useState(false);

  const isEditing = service !== undefined;

  const handleSubmit = async () => {
    if (!name.trim()) { setError("وارد کردن نام خدمت الزامی است"); return; }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description,
        duration: parseInt(duration) || 60,
        price: parseFloat(price) || 0,
        category,
        color,
      };
      if (service) {
        await updateService(service.id, payload);
      } else {
        await addService(payload);
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
          <DialogTitle>{isEditing ? "ویرایش خدمت" : "افزودن خدمت جدید به کاتالوگ"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>نام خدمت *</Label>
            <Input value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} placeholder="مثلاً کوتاهی و استایل مو" />
          </div>
          <div className="space-y-1.5">
            <Label>شرح و جزئیات خدمت</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription((e.target as HTMLTextAreaElement).value)} placeholder="توضیح مختصر درباره مراحل و مواد مصرفی..." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>مدت (دقیقه)</Label>
              <Input type="number" min="5" step="5" value={duration} onChange={(e) => setDuration((e.target as HTMLInputElement).value)} />
            </div>
            <div className="space-y-1.5">
              <Label>تعرفه (تومان)</Label>
              <Input type="number" min="0" step="10000" value={price} onChange={(e) => setPrice((e.target as HTMLInputElement).value)} />
            </div>
            <div className="space-y-1.5">
              <Label>دسته‌بندی</Label>
              <Input value={category} onChange={(e) => setCategory((e.target as HTMLInputElement).value)} placeholder="مثلاً مو، ناخن..." />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>رنگ نمایش</Label>
            <div className="flex gap-2 pt-1">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`h-7 w-7 rounded-full transition-transform ${color === c ? "scale-110 ring-2 ring-ring ring-offset-2" : "hover:scale-105"}`}
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
            {saving ? "در حال ذخیره..." : isEditing ? "ذخیره تغییرات" : "افزودن خدمت"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
