import { useState } from "preact/hooks";
import { useApp } from "../context";
import { Plus, Search, Trash2, AlertTriangle, Pencil } from "lucide-preact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "./pagination";
import { CreateProduct } from "./create-product";
import { formatCurrency, toPersianDigits } from "@/lib/format";
import type { Product } from "../types";

export function ProductList() {
  const { products, productsPag, setProductsPage, productsSearch, setProductsSearch, deleteProduct } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">انبار و محصولات فروشگاهی</h1>
          <p className="text-xs text-muted-foreground">مدیریت موجودی مواد مصرفی، محصولات فروشگاهی، قیمت خرید و هشدار کسری</p>
        </div>
        <Button size="sm" className="min-h-10 gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> افزودن محصول جدید
        </Button>
      </div>

      {showCreate && <CreateProduct onClose={() => setShowCreate(false)} />}
      {editingProduct && <CreateProduct product={editingProduct} onClose={() => setEditingProduct(null)} />}

      <div className="relative">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-10 pr-9"
          placeholder="جستجوی نام محصول، برند یا کد کالا (SKU)..."
          value={productsSearch}
          onInput={(e) => setProductsSearch((e.target as HTMLInputElement).value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y lg:hidden">
            {products.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">محصولی یافت نشد</p>
            )}
            {products.map((p) => (
              <div key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[p.brand, p.category, p.sku && `کد: ${p.sku}`].filter(Boolean).join(" · ") || "بدون مشخصات تکمیلی"}
                    </p>
                  </div>
                  {p.stock <= p.low_stock_alert && (
                    <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                      کسری موجودی
                    </span>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">قیمت فروش</p><p className="font-semibold">{formatCurrency(p.price)}</p></div>
                  <div><p className="text-xs text-muted-foreground">قیمت خرید</p><p>{formatCurrency(p.cost)}</p></div>
                  <div>
                    <p className="text-xs text-muted-foreground">موجودی</p>
                    <p className="flex items-center gap-1 font-bold">
                      {p.stock <= p.low_stock_alert && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                      {toPersianDigits(p.stock)} عدد
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button variant="outline" className="min-h-10 gap-1.5" onClick={() => setEditingProduct(p)}>
                    <Pencil className="h-3.5 w-3.5" /> ویرایش
                  </Button>
                  <Button variant="outline" className="min-h-10 gap-1.5 text-destructive hover:text-destructive" onClick={() => deleteProduct(p.id)}>
                    <Trash2 className="h-3.5 w-3.5" /> حذف
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نام محصول</TableHead>
                  <TableHead className="w-28">برند</TableHead>
                  <TableHead className="w-28">دسته‌بندی</TableHead>
                  <TableHead className="w-36 text-left">قیمت فروش</TableHead>
                  <TableHead className="w-36 text-left">قیمت خرید</TableHead>
                  <TableHead className="w-28 text-center">موجودی انبار</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">محصولی یافت نشد</TableCell></TableRow>
                )}
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-semibold">{p.name}</div>
                      {p.sku && <div className="text-xs text-muted-foreground">کد کالا: {p.sku}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{p.brand || "—"}</TableCell>
                    <TableCell>
                      {p.category && <Badge variant="outline" className="text-xs">{p.category}</Badge>}
                    </TableCell>
                    <TableCell className="text-left font-bold text-primary">{formatCurrency(p.price)}</TableCell>
                    <TableCell className="text-left text-sm text-muted-foreground">{formatCurrency(p.cost)}</TableCell>
                    <TableCell className="text-center">
                      <span className="flex items-center justify-center gap-1">
                        {p.stock <= p.low_stock_alert && (
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        )}
                        <span className={p.stock <= p.low_stock_alert ? "font-bold text-amber-600" : "font-medium"}>
                          {toPersianDigits(p.stock)} عدد
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button aria-label={`ویرایش ${p.name}`} variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setEditingProduct(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button aria-label={`حذف ${p.name}`} variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteProduct(p.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Pagination pag={productsPag} setPage={setProductsPage} />
    </div>
  );
}
