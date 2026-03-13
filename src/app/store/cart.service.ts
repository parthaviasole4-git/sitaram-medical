import { Injectable, computed, inject, signal, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CatalogService, type Product } from './catalog.service';
import { AuthService } from '../auth/auth.service';
import { tap, catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../environments/environment';

const API_BASE_URL = environment.apiBaseUrl;

type CartItem = {
  productId: string;
  qty: number;
  title?: string;
  unitPrice?: number;
  lineTotal?: number;
};

type ApiCartItem = {
  productId: number;
  title: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

export type OcrMatchItem = {
  productId: number;
  title: string;
  matchedName: string;
  confidence: number;
  requestedQty: number;
  availableQty: number;
  unitPrice: number;
};

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly catalog = inject(CatalogService);

  private readonly items = signal<CartItem[]>([]);
  readonly loading = signal(false);

  readonly count = computed(() => this.items().reduce((sum, i) => sum + i.qty, 0));

  readonly lineItems = computed(() => {
    const products = this.catalog.products();
    const byId = new Map(products.map(p => [p.id, p]));
    
    return this.items()
      .map(i => {
        // Try to find product in catalog first (for images etc)
        const product = byId.get(i.productId);
        
        // If product is not in loaded catalog, use API data if available
        if (!product) {
          if (i.title && i.unitPrice !== undefined) {
             // Create a placeholder product structure from cart data
             const placeholderProduct: Product = {
                id: i.productId,
                title: i.title,
                price: formatInr(i.unitPrice),
                tag: '',
                category: 'Uncategorized',
                imageDataUrl: '', // No image available if not in catalog
                quantity: 999 // Assume available
             };
             
             return {
                product: placeholderProduct,
                qty: i.qty,
                unitPrice: i.unitPrice,
                unitPriceText: formatInr(i.unitPrice),
                lineTotal: i.lineTotal || (i.unitPrice * i.qty),
                lineTotalText: formatInr(i.lineTotal || (i.unitPrice * i.qty))
             };
          }
          return null;
        }

        const unitPrice = parsePriceInr(product.price);
        const lineTotal = unitPrice * i.qty;
        
        return {
          product,
          qty: i.qty,
          unitPrice,
          unitPriceText: formatInr(unitPrice),
          lineTotal,
          lineTotalText: formatInr(lineTotal)
        };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
  });

  readonly total = computed(() => this.lineItems().reduce((sum, i) => sum + i.lineTotal, 0));
  readonly totalText = computed(() => formatInr(this.total()));

  constructor() {
    // Reload cart when user logs in
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.loadCart();
      } else {
        this.items.set([]);
      }
    });
  }

  ocrMatch(file: File) {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<{ items: OcrMatchItem[] }>(`${API_BASE_URL}/cart/ocr-match`, form);
  }

  loadCart() {
    this.loading.set(true);
    this.http.get<any>(`${API_BASE_URL}/cart`).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (res) => {
        // Response: { id: 1, items: [{ productId: 1, title: '...', qty: 2, ... }], total: 100 }
        if (res && res.items) {
          const mapped: CartItem[] = res.items.map((i: ApiCartItem) => ({
            productId: i.productId.toString(),
            qty: i.qty,
            title: i.title,
            unitPrice: i.unitPrice,
            lineTotal: i.lineTotal
          }));
          this.items.set(mapped);
        }
      },
      error: (err) => console.error('Failed to load cart', err)
    });
  }

  add(product: Product) {
    // Optimistic update
    this.updateLocal(product.id, 1);

    // API Call
    this.http.post(`${API_BASE_URL}/cart/add`, { 
      productId: parseInt(product.id), 
      qty: 1 
    }).subscribe({
      error: () => {
        // Revert on error (simplified: just reload)
        this.loadCart();
      }
    });
  }

  increase(productId: string) {
    this.add({ id: productId } as Product);
  }

  decrease(productId: string) {
    // Optimistic update
    this.updateLocal(productId, -1);

    this.http.post(`${API_BASE_URL}/cart/decrease/${productId}`, {}).subscribe({
      error: () => this.loadCart()
    });
  }

  remove(productId: string) {
    // Optimistic
    this.items.set(this.items().filter(i => i.productId !== productId));

    this.http.delete(`${API_BASE_URL}/cart/remove/${productId}`).subscribe({
      error: () => this.loadCart()
    });
  }

  clear() {
    this.items.set([]);
    this.http.delete(`${API_BASE_URL}/cart/clear`).subscribe({
      error: () => this.loadCart()
    });
  }

  addById(productId: number, qty: number) {
    const id = productId.toString();
    this.updateLocal(id, qty);
    this.http.post(`${API_BASE_URL}/cart/add`, { productId: productId, qty }).subscribe({
      next: () => this.loadCart(),
      error: () => this.loadCart()
    });
  }

  private updateLocal(productId: string, delta: number) {
    const current = this.items();
    const idx = current.findIndex(i => i.productId === productId);
    
    if (idx === -1) {
      if (delta > 0) {
        this.items.set([...current, { productId, qty: delta }]);
      }
    } else {
      const next = [...current];
      const newQty = next[idx].qty + delta;
      if (newQty <= 0) {
        next.splice(idx, 1);
      } else {
        next[idx] = { ...next[idx], qty: newQty };
      }
      this.items.set(next);
    }
  }
}

function parsePriceInr(value: string): number {
  const numeric = value.replace(/[^\d.]/g, '');
  const parsed = Number(numeric);
  if (Number.isFinite(parsed)) return parsed;
  return 0;
}

function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    amount
  );
}
