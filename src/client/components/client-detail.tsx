import { useState, useEffect } from "preact/hooks";
import { useApp } from "../context";
import { ArrowRight, Trash2, Save, Mail, Phone, Plus } from "lucide-preact";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge, PaymentBadge } from "./status-badge";
import { CreateAppointment } from "./create-appointment";
import { formatCurrency, formatJalaliDate, formatTimeFa, toPersianDigits } from "@/lib/format";

export function ClientDetail() {
  const { selectedClient: client, selectedClientAppointments: appointments, navigate, updateClient, deleteClient } = useApp();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(client?.name || "");
  const [email, setEmail] = useState(client?.email || "");
  const [phone, setPhone] = useState(client?.phone || "");
  const [notes, setNotes] = useState(client?.notes || "");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (client) {
      setName(client.name || "");
      setEmail(client.email || "");
      setPhone(client.phone || "");
      setNotes(client.notes || "");
    }
  }, [client]);

  if (!client) return null;

  const handleSave = async () => {
    await updateClient(client.id, { name, email, phone, notes });
    setEditing(false);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/clients")}>
          <ArrowRight className="ml-1 h-4 w-4" /> بازگشت به مشتریان
        </Button>
        <h1 className="min-w-0 flex-1 text-2xl font-bold">{client.name}</h1>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button size="sm" className="flex-1 gap-1.5 sm:flex-none" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5" /> ثبت نوبت برای مشتری
          </Button>
          <Button variant="destructive" size="sm" className="flex-1 gap-1.5 sm:flex-none" onClick={() => deleteClient(client.id)}>
            <Trash2 className="h-3.5 w-3.5" /> حذف پرونده
          </Button>
        </div>
      </div>

      {showCreate && (
        <CreateAppointment
          defaultClientId={client.id}
          onClose={() => setShowCreate(false)}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>مشخصات پرونده</CardTitle>
            {!editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>ویرایش</Button>
            ) : (
              <Button size="sm" onClick={handleSave}><Save className="ml-1 h-3.5 w-3.5" /> ذخیره</Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {editing ? (
              <>
                <div className="space-y-1.5"><Label>نام و نام خانوادگی</Label><Input value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} /></div>
                <div className="space-y-1.5"><Label>شماره موبایل</Label><Input value={phone} onChange={(e) => setPhone((e.target as HTMLInputElement).value)} /></div>
                <div className="space-y-1.5"><Label>ایمیل</Label><Input value={email} onChange={(e) => setEmail((e.target as HTMLInputElement).value)} /></div>
                <div className="space-y-1.5"><Label>یادداشت پرونده (حساسیت، رنگ مو، ترجیحات...)</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes((e.target as HTMLTextAreaElement).value)} /></div>
              </>
            ) : (
              <>
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span dir="ltr">{toPersianDigits(client.phone)}</span>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    {client.email}
                  </div>
                )}
                {client.notes && (
                  <div className="rounded-lg bg-muted/40 p-3 text-sm text-foreground">
                    {client.notes}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  تاریخ عضویت: {formatJalaliDate(client.created_at?.slice(0, 10), "long")}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>تاریخچه مراجعات و نوبت‌ها ({toPersianDigits(appointments.length)})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y lg:hidden">
              {appointments.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">هنوز نوبتی برای این مشتری ثبت نشده است</p>}
              {appointments.map((apt) => {
                const netPrice = Math.max(0, (apt.total_price || 0) - (apt.discount_amount || 0));
                return (
                  <button
                    key={apt.id}
                    type="button"
                    className="w-full p-4 text-right transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    onClick={() => navigate(`/appointments/${apt.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          {formatJalaliDate(apt.scheduled_date, "long")} ساعت {formatTimeFa(apt.start_time)}
                        </p>
                        <p className="font-semibold">{apt.service_names || "—"}</p>
                        {apt.latest_note && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{apt.latest_note}</p>}
                      </div>
                      <StatusBadge status={apt.status} />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        {apt.staff_name && <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: apt.staff_color || "#7c3aed" }} />}
                        <span>{apt.staff_name || "—"}</span>
                      </span>
                      <span className="font-semibold">{formatCurrency(netPrice)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>جزئیات مراجعه و خدمات</TableHead>
                    <TableHead>متخصص</TableHead>
                    <TableHead className="w-28">وضعیت نوبت</TableHead>
                    <TableHead className="w-28">پرداخت</TableHead>
                    <TableHead className="w-36 text-left">مبلغ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">هنوز نوبتی ثبت نشده است</TableCell>
                    </TableRow>
                  )}
                  {appointments.map((apt) => {
                    const netPrice = Math.max(0, (apt.total_price || 0) - (apt.discount_amount || 0));
                    return (
                      <TableRow key={apt.id} className="cursor-pointer" onClick={() => navigate(`/appointments/${apt.id}`)}>
                        <TableCell className="min-w-52">
                          <p className="text-xs text-muted-foreground">
                            {formatJalaliDate(apt.scheduled_date, "long")} ساعت {formatTimeFa(apt.start_time)}
                          </p>
                          <p className="font-semibold">{apt.service_names || "—"}</p>
                          {apt.latest_note && <p className="mt-1 line-clamp-2 max-w-md text-xs text-muted-foreground">{apt.latest_note}</p>}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1.5">
                            {apt.staff_name && <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: apt.staff_color || "#7c3aed" }} />}
                            <span className="text-sm">{apt.staff_name || "—"}</span>
                          </span>
                        </TableCell>
                        <TableCell><StatusBadge status={apt.status} /></TableCell>
                        <TableCell><PaymentBadge status={apt.payment_status} /></TableCell>
                        <TableCell className="text-left font-semibold">{formatCurrency(netPrice)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
