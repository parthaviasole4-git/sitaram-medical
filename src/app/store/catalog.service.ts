import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, tap, catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../environments/environment';

export type Category = {
  id: string;
  title: string;
  subtitle: string;
};

export type Product = {
  id: string;
  title: string;
  price: string;
  tag: string;
  category: string;
  imageDataUrl: string;
  quantity: number;
};

const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:5221'
  : environment.apiBaseUrl;

function svgDataUrl(label: string, bg = '#f5f5f7'): string {
  const safe = label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120">
  <rect width="160" height="120" rx="18" fill="${bg}"/>
  <rect x="14" y="14" width="132" height="92" rx="14" fill="#ffffff" stroke="#d2d2d7"/>
  <text x="80" y="68" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    font-size="16" font-weight="700" fill="#1d1d1f">${safe}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);
  
  private readonly _products = signal<Product[]>([]);
  readonly products = this._products.asReadonly();
  
  private readonly _apiCategories = signal<string[]>([]);

  readonly totalProducts = signal(0);
  readonly loading = signal(false);
  
  readonly categories = computed(() => {
    return this._apiCategories().sort().map(title => ({
      id: title.toLowerCase().replace(/\s+/g, '-'),
      title,
      subtitle: 'Browse Products' // Generic subtitle since we removed static metadata
    }));
  });

  constructor() {
    this.loadCategories();
  }

  loadCategories() {
    this.http.get<string[]>(`${API_BASE_URL}/products/categories`).pipe(
      catchError(err => {
        console.error('Failed to load categories', err);
        return of([] as string[]);
      })
    ).subscribe(categories => {
      this._apiCategories.set(categories);
    });
  }

  // Products available for customers (quantity > 0)
  readonly availableProducts = computed(() => this.products().filter(p => p.quantity > 0));

  loadProducts(page: number, size: number, search?: string, category?: string) {
    this.loading.set(true);
    const params: any = { page: page.toString(), size: size.toString() };
    if (search) params.search = search;
    if (category) params.category = category;

    return this.http.get<any>(`${API_BASE_URL}/products`, { params }).pipe(
      map(res => {
        let items: any[] = [];
        let total = 0;
        
        const data = res.data || res;
        if (Array.isArray(data)) {
            items = data;
            total = res.total || items.length;
        } else if (data && (Array.isArray(data.items) || Array.isArray(data.products))) {
             items = data.items || data.products;
             total = data.total || data.totalCount || items.length;
        }
        
        return {
          items: items.map(this.mapToFrontend),
          total
        };
      }),
      catchError(err => {
        console.error('Failed to load products', err);
        return of({ items: [], total: 0 });
      }),
      finalize(() => this.loading.set(false))
    ).subscribe(({ items, total }) => {
      this._products.set(items);
      this.totalProducts.set(total);
    });
  }

  private mapToFrontend(p: any): Product {
    return {
      id: p.id.toString(),
      title: p.title,
      price: typeof p.price === 'number' ? `₹${p.price}` : p.price,
      tag: p.tag || '',
      category: p.category || 'Uncategorized',
      imageDataUrl: p.imageDataUrl || svgDataUrl(p.category || 'Part'),
      quantity: p.quantity
    };
  }

  deleteProduct(id: string) {
    this.http.delete(`${API_BASE_URL}/products/${id}`).subscribe({
      next: () => {
        this._products.update(products => products.filter(p => p.id !== id));
        this.totalProducts.update(n => n - 1);
      },
      error: (err) => console.error('Failed to delete product', err)
    });
  }

  deleteProducts(ids: string[]) {
    const intIds = ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    
    this.http.post(`${API_BASE_URL}/products/delete-bulk`, intIds).subscribe({
      next: () => {
        const idsSet = new Set(ids);
        this._products.update(products => products.filter(p => !idsSet.has(p.id)));
        this.totalProducts.update(n => Math.max(0, n - ids.length));
      },
      error: (err) => console.error('Failed to delete products', err)
    });
  }

  addProducts(newProducts: Product[]) {
    const backendProducts = newProducts.map(p => ({
       Title: p.title,
       Price: parseFloat(p.price.replace(/[^\d.]/g, '')),
       Tag: p.tag,
       Category: p.category,
       ImageDataUrl: p.imageDataUrl,
       Quantity: p.quantity
    }));

    this.http.post(`${API_BASE_URL}/products/import`, backendProducts).subscribe({
      next: () => {
        this.loadProducts(1, 10); 
      },
      error: (err) => console.error('Failed to import products', err)
    });
  }

  importProducts(newProducts: any[]) {
    const backendProducts = newProducts.map(p => ({
       Title: p.title,
       Price: typeof p.price === 'string' ? parseFloat(p.price.replace(/[^\d.]/g, '')) : p.price,
       Tag: p.tag,
       Category: p.category,
       ImageDataUrl: p.imageDataUrl,
       Quantity: typeof p.quantity === 'string' ? parseInt(p.quantity, 10) : p.quantity
    }));

    return this.http.post(`${API_BASE_URL}/products/import`, backendProducts).pipe(
      tap(() => {
        this.loadProducts(1, 10);
      }),
      catchError(err => {
        console.error('Failed to import products', err);
        throw err;
      })
    );
  }

  updateProductQuantity(id: string, quantity: number) {
    this.http.put(`${API_BASE_URL}/products/${id}`, { quantity }).subscribe({
      next: () => {
        this._products.update(products => 
          products.map(p => p.id === id ? { ...p, quantity } : p)
        );
      },
      error: (err) => console.error('Failed to update quantity', err)
    });
  }

  updateProductImage(id: string, imageDataUrl: string) {
    this.http.put(`${API_BASE_URL}/products/${id}`, { imageDataUrl }).subscribe({
      next: () => {
        this._products.update(products => 
          products.map(p => p.id === id ? { ...p, imageDataUrl } : p)
        );
      },
      error: (err) => console.error('Failed to update image', err)
    });
  }
}
