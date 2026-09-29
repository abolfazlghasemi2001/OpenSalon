import { useState } from "preact/hooks";
import { useApp } from "../context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export function CreateClient({ onClose }: { onClose: () => void }) {
  const { addClient, setError } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) { setError("وارد کردن نام مشتری الزامی است"); return; }
    setSaving(true);
    try {
      await addClient({ name: name.trim(), email, phone, notes });
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
          <DialogTitle>افزودن پرونده مشتری جدید</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>نام و نام خانوادگی *</Label>
            <Input value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} placeholder="مثلاً نازنین احمدی" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>شماره موبایل</Label>
              <Input value={phone} onChange={(e) => setPhone((e.target as HTMLInputElement).value)} placeholder="09121234567" />
            </div>
            <div className="space-y-1.5">
              <Label>ایمیل (اختیاری)</Label>
              <Input type="email" value={email} onChange={(e) => setEmail((e.target as HTMLInputElement).value)} placeholder="email@example.com" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>یادداشت پرونده (حساسیت‌ها، ترجیحات، پایه رنگ مو...)</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes((e.target as HTMLTextAreaElement).value)} placeholder="توضیحات اختصاصی مشتری..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>انصراف</Button>
          <Button disabled={saving} onClick={handleSubmit}>{saving ? "در حال ثبت..." : "ثبت مشتری"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
