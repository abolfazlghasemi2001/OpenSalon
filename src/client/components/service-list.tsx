import { useState } from "preact/hooks";
import { useApp } from "../context";
import { Plus, Trash2, Pencil } from "lucide-preact";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreateService } from "./create-service";
import { formatCurrency, formatDuration } from "@/lib/format";
import type { Service } from "../types";

export function ServiceList() {
  const { services, deleteService, updateService } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");

  const categories = [...new Set(services.map((s) => s.category).filter(Boolean))];
  const filteredServices = selectedCategory
    ? services.filter((s) => s.category === selectedCategory)
    : services;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">کاتالوگ خدمات سالن</h1>
          <p className="text-xs text-muted-foreground">مدیریت تعرفه‌ها، مدت زمان انجام و دسته‌بندی خدمات زیبایی</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> افزودن خدمت جدید
        </Button>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={selectedCategory === "" ? "default" : "outline"}
            onClick={() => setSelectedCategory("")}
          >
            همه دسته‌ها
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={selectedCategory === cat ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      )}

      {showCreate && <CreateService onClose={() => setShowCreate(false)} />}
      {editingService && <CreateService service={editingService} onClose={() => setEditingService(null)} />}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>نام و شرح خدمت</TableHead>
                <TableHead className="w-32">دسته‌بندی</TableHead>
                <TableHead className="w-28 text-center">مدت زمان</TableHead>
                <TableHead className="w-40 text-left">تعرفه (تومان)</TableHead>
                <TableHead className="w-24 text-center">وضعیت</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">خدمتی ثبت نشده است</TableCell>
                </TableRow>
              )}
              {filteredServices.map((svc) => (
                <TableRow key={svc.id}>
                  <TableCell>
                    <span className="inline-block h-3.5 w-3.5 rounded-full" style={{ backgroundColor: svc.color }} />
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">{svc.name}</div>
                    {svc.description && <div className="text-xs text-muted-foreground">{svc.description}</div>}
                  </TableCell>
                  <TableCell>
                    {svc.category && <Badge variant="outline" className="text-xs">{svc.category}</Badge>}
                  </TableCell>
                  <TableCell className="text-center text-sm">{formatDuration(svc.duration)}</TableCell>
                  <TableCell className="text-left font-bold text-primary">
                    {svc.price === 0 ? "رایگان" : formatCurrency(svc.price)}
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      type="button"
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        svc.active ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"
                      }`}
                      onClick={() => updateService(svc.id, { active: svc.active ? 0 : 1 })}
                    >
                      {svc.active ? "فعال" : "غیرفعال"}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        title="ویرایش خدمت"
                        onClick={() => setEditingService(svc)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="حذف خدمت"
                        onClick={() => deleteService(svc.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
