import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/format";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  booked: { label: STATUS_LABELS.booked, variant: "default" },
  confirmed: { label: STATUS_LABELS.confirmed, variant: "secondary", className: "bg-blue-50 text-blue-700 border-blue-200" },
  in_progress: { label: STATUS_LABELS.in_progress, variant: "outline", className: "bg-amber-50 text-amber-700 border-amber-200" },
  checked_in: { label: STATUS_LABELS.checked_in, variant: "outline", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  completed: { label: STATUS_LABELS.completed, variant: "secondary", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: STATUS_LABELS.cancelled, variant: "destructive" },
  no_show: { label: STATUS_LABELS.no_show, variant: "destructive" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { label: status, variant: "outline" as const };
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}

const PAYMENT_CONFIG: Record<string, { label: string; className: string }> = {
  unpaid: { label: PAYMENT_STATUS_LABELS.unpaid, className: "bg-rose-50 text-rose-700 border-rose-200" },
  deposit: { label: PAYMENT_STATUS_LABELS.deposit, className: "bg-amber-50 text-amber-700 border-amber-200" },
  paid: { label: PAYMENT_STATUS_LABELS.paid, className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export function PaymentBadge({ status }: { status?: string }) {
  const key = status || "unpaid";
  const config = PAYMENT_CONFIG[key] || PAYMENT_CONFIG.unpaid;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
