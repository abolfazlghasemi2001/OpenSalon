import { useState } from "preact/hooks";
import { useApp } from "../context";
import { Plus, Trash2, Pencil, Percent, Power } from "lucide-preact";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateStaff } from "./create-staff";
import { toPersianDigits } from "@/lib/format";
import type { Staff } from "../types";

export function StaffList() {
  const { staffMembers, deleteStaff, updateStaff } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">پرسنل و متخصصین سالن</h1>
          <p className="text-xs text-muted-foreground">مدیریت آرایشگران، درصد پورسانت، رنگ تقویم و وضعیت فعالیت</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> افزودن پرسنل جدید
        </Button>
      </div>

      {showCreate && <CreateStaff onClose={() => setShowCreate(false)} />}
      {editingStaff && <CreateStaff staff={editingStaff} onClose={() => setEditingStaff(null)} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {staffMembers.map((s) => (
          <Card key={s.id} className={!s.active ? "opacity-70" : ""}>
            <CardContent className="flex items-start gap-4 p-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white shadow-xs"
                style={{ backgroundColor: s.color }}
              >
                {s.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold">{s.name}</h3>
                  {!s.active ? (
                    <Badge variant="secondary">غیرفعال</Badge>
                  ) : (
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px]">
                      فعال
                    </Badge>
                  )}
                </div>
                {s.title && <p className="text-sm text-muted-foreground">{s.title}</p>}
                {s.phone && <p className="text-xs text-muted-foreground" dir="ltr">{toPersianDigits(s.phone)}</p>}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    <Percent className="h-3 w-3" />
                    پورسانت: {toPersianDigits(s.commission_rate ?? 40)}٪
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {toPersianDigits(s.appointment_count || 0)} نوبت ثبت‌شده
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  title="ویرایش مشخصات و پورسانت"
                  onClick={() => setEditingStaff(s)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  title={s.active ? "غیرفعال کردن" : "فعال کردن"}
                  onClick={() => updateStaff(s.id, { active: s.active ? 0 : 1 })}
                >
                  <Power className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  title="حذف پرسنل"
                  onClick={() => deleteStaff(s.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {staffMembers.length === 0 && (
          <p className="col-span-full py-12 text-center text-muted-foreground">هنوز هیچ پرسنلی ثبت نشده است</p>
        )}
      </div>
    </div>
  );
}
