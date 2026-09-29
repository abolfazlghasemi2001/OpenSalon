import { AppNav, embedded } from "@clawnify/app/client";
import { useEffect, useState } from "preact/hooks";
import { useApp } from "../context";
import {
  Scissors,
  Menu,
  LayoutDashboard,
  CalendarDays,
  Clock,
  Users,
  UserCog,
  Sparkles,
  Package,
  BarChart3,
  Globe,
} from "lucide-preact";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toPersianDigits } from "@/lib/format";
import type { View } from "../types";

const navItems: { view: View; path: string; label: string; icon: typeof LayoutDashboard }[] = [
  { view: "dashboard", path: "/", label: "داشبورد مدیریت", icon: LayoutDashboard },
  { view: "calendar", path: "/calendar", label: "تقویم روزانه", icon: CalendarDays },
  { view: "appointments", path: "/appointments", label: "مدیریت نوبت‌ها", icon: Clock },
  { view: "clients", path: "/clients", label: "پرونده مشتریان", icon: Users },
  { view: "staff", path: "/staff", label: "پرسنل و متخصصین", icon: UserCog },
  { view: "services", path: "/services", label: "کاتالوگ خدمات", icon: Sparkles },
  { view: "products", path: "/products", label: "انبار و محصولات", icon: Package },
  { view: "reports", path: "/reports", label: "گزارش مالی و پورسانت", icon: BarChart3 },
  { view: "booking", path: "/booking", label: "پرتال رزرو آنلاین", icon: Globe },
];

function SidebarContent({ currentView, onNavigate }: { currentView: View; onNavigate?: () => void }) {
  const { navigate, stats } = useApp();

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar">
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Scissors className="h-4 w-4" />
        </div>
        <div>
          <span className="block text-base font-bold text-sidebar-foreground">اپن‌سالن</span>
          <span className="block text-[11px] text-muted-foreground">مدیریت هوشمند سالن زیبایی</span>
        </div>
      </div>
      <Separator />
      <nav aria-label="منوی اصلی" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-3">
        <p className="mb-2 px-3 text-xs font-semibold text-muted-foreground">منوی دسترسی</p>
        {navItems.map((item) => (
          <button
            key={item.view}
            className={cn(
              "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-0",
              currentView === item.view
                ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
            aria-current={currentView === item.view ? "page" : undefined}
            onClick={() => { navigate(item.path); onNavigate?.(); }}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-right">{item.label}</span>
            {item.view === "appointments" && stats.appointments > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">{toPersianDigits(stats.appointments)}</Badge>
            )}
            {item.view === "clients" && stats.clients > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">{toPersianDigits(stats.clients)}</Badge>
            )}
            {item.view === "products" && stats.low_stock_products > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-xs">{toPersianDigits(stats.low_stock_products)}</Badge>
            )}
          </button>
        ))}
      </nav>
      <Separator />
      <div className="flex items-center justify-around bg-muted/30 px-4 py-3.5">
        <div className="text-center">
          <div className="text-lg font-bold text-sidebar-foreground">{toPersianDigits(stats.today_appointments)}</div>
          <div className="text-xs text-muted-foreground">نوبت امروز</div>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="text-center">
          <div className="text-lg font-bold text-sidebar-foreground">{toPersianDigits(stats.upcoming_appointments)}</div>
          <div className="text-xs text-muted-foreground">نوبت‌های پیش‌رو</div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ currentView }: { currentView: View }) {
  const [open, setOpen] = useState(false);
  const { navigate, stats } = useApp();

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    const closeOnHistory = () => setOpen(false);
    desktop.addEventListener("change", closeOnDesktop);
    window.addEventListener("popstate", closeOnHistory);
    return () => {
      desktop.removeEventListener("change", closeOnDesktop);
      window.removeEventListener("popstate", closeOnHistory);
    };
  }, []);

  if (embedded) {
    const icons = ["home", "calendar-days", "clock", "users", "users", "sparkles", "package", "chart-bar", "globe"];
    return <AppNav title="اپن‌سالن" icon="calendar-days" active={currentView}
      groups={[{ items: navItems.map((item, index) => ({
        id: item.view, label: item.label, href: item.path, icon: icons[index] || "circle",
        home: item.view === "dashboard",
        count: item.view === "appointments" ? stats.appointments || undefined
          : item.view === "clients" ? stats.clients || undefined
          : item.view === "products" ? stats.low_stock_products || undefined : undefined,
      })) }]}
      onNavigate={(item) => navigate(item.href || "/")} />;
  }

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-l md:block">
        <SidebarContent currentView={currentView} />
      </aside>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b bg-sidebar px-4 py-2.5 md:hidden">
        <span className="flex items-center gap-2 text-sm font-bold">
          <Scissors className="h-4 w-4 text-primary" />
          اپن‌سالن
        </span>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="min-h-10 gap-1.5" aria-label="باز کردن منو">
              <Menu className="h-4 w-4" />
              منو
            </Button>
          </DialogTrigger>
          <DialogContent aria-describedby={undefined} className="right-0 left-auto top-0 flex h-dvh w-80 max-w-[calc(100%-2rem)] translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:rounded-none [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center [&>button]:left-2 [&>button]:top-3">
            <DialogTitle className="sr-only">منوی ناوبری</DialogTitle>
            <SidebarContent currentView={currentView} onNavigate={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </header>
    </>
  );
}
