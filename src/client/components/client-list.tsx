import { useState } from "preact/hooks";
import { useApp } from "../context";
import { Plus, Search, Trash2 } from "lucide-preact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "./pagination";
import { CreateClient } from "./create-client";
import { toPersianDigits } from "@/lib/format";

export function ClientList() {
  const { clients, clientsPag, setClientsPage, clientsSearch, setClientsSearch, deleteClient, navigate } = useApp();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">پرونده مشتریان</h1>
          <p className="text-xs text-muted-foreground">مدیریت اطلاعات تماس، سوابق مراجعات و یادداشت‌های اختصاصی هر مشتری</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> افزودن مشتری جدید
        </Button>
      </div>

      {showCreate && <CreateClient onClose={() => setShowCreate(false)} />}

      <div className="relative">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pr-9"
          placeholder="جستجوی نام، شماره موبایل یا ایمیل مشتری..."
          value={clientsSearch}
          onInput={(e) => setClientsSearch((e.target as HTMLInputElement).value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام و نام خانوادگی</TableHead>
                <TableHead className="w-40">شماره موبایل</TableHead>
                <TableHead className="w-48">ایمیل</TableHead>
                <TableHead>یادداشت پرونده</TableHead>
                <TableHead className="w-28 text-center">تعداد مراجعات</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">مشتری با این مشخصات یافت نشد</TableCell>
                </TableRow>
              )}
              {clients.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/clients/${c.id}`)}>
                  <TableCell className="font-semibold">{c.name}</TableCell>
                  <TableCell className="text-sm font-medium" dir="ltr">{toPersianDigits(c.phone) || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.email || "—"}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{c.notes || "—"}</TableCell>
                  <TableCell className="text-center font-semibold">{toPersianDigits(c.appointment_count || 0)} بار</TableCell>
                  <TableCell>
                    <Button
                      aria-label={`حذف مشتری ${c.name}`}
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); deleteClient(c.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Pagination pag={clientsPag} setPage={setClientsPage} />
    </div>
  );
}
