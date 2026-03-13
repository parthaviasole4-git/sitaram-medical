import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, map, catchError } from 'rxjs/operators';
import { of, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CatalogService, type Product } from './catalog.service';

export type OrderPaymentMethod = 'COD' | 'Card' | 'UPI' | 'UPI_INTENT' | 'RAZORPAY_UPI';
export type OrderStatus = 'Pending' | 'Placed' | 'OutForDelivery' | 'Completed' | 'Delivered' | 'Cancelled';

export type OrderItem = {
  productId: string;
  title: string;
  qty: number;
  unitPrice: number;
  unitPriceText: string;
  lineTotal: number;
  lineTotalText: string;
  imageDataUrl: string;
};

export type Order = {
  id: string;
  createdAt: number;
  customerId: string;
  customerName: string;
  customerPhone: string;
  address?: string;
  paymentMethod: OrderPaymentMethod;
  paymentStatus: 'Success' | 'COD' | 'Pending';
  status: OrderStatus;
  prescriptionNo?: string;
  deliveryOtp?: string;
  items: OrderItem[];
  total: number;
  totalText: string;
};

const API_BASE_URL = environment.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly catalog = inject(CatalogService);
  
  // Admin orders
  private readonly orders = signal<Order[]>([]);
  readonly totalOrders = signal(0);
  readonly list = this.orders.asReadonly();
  
  // My orders (Customer)
  private readonly myOrders = signal<Order[]>([]);
  readonly myOrdersList = this.myOrders.asReadonly();
  readonly myOrdersTotal = signal(0);

  readonly count = computed(() => this.orders().length);
  readonly pendingCount = computed(() => this.orders().filter(o => o.status === 'Placed').length);

  constructor() {}

  loadAdminOrders(page: number, size: number) {
    this.http.get<any>(`${API_BASE_URL}/admin/orders`, { 
        params: { page: page.toString(), size: size.toString() } 
    }).pipe(
      map(res => this.normalizeResponse(res)),
      catchError(err => {
        console.error('Failed to load admin orders', err);
        return of({ items: [], total: 0 });
      })
    ).subscribe(({ items, total }) => {
      this.orders.set(items);
      this.totalOrders.set(total);
    });
  }

  loadMyOrders(page: number, size: number) {
    this.http.get<any>(`${API_BASE_URL}/orders/my`, {
        params: { page: page.toString(), size: size.toString() }
    }).pipe(
        map(res => this.normalizeResponse(res)),
        catchError(err => {
            console.error('Failed to load my orders', err);
            return of({ items: [], total: 0 });
        })
    ).subscribe(({ items, total }) => {
        this.myOrders.set(items);
        this.myOrdersTotal.set(total);
    });
  }

  private normalizeResponse(res: any): { items: Order[], total: number } {
    let items: any[] = [];
    let total = 0;

    const data = res.data || res;
    
    if (Array.isArray(data)) {
        items = data;
        total = data.length;
    } else if (data && Array.isArray(data.items)) {
        items = data.items;
        total = data.total || data.totalCount || items.length;
    } else if (data && Array.isArray(data.orders)) {
         items = data.orders;
         total = data.total || data.totalCount || items.length;
    }

    // Map backend order to frontend Order model
    const mapStatus = (s: any): OrderStatus => {
      const v = String(s || '').toLowerCase();
      if (v === 'pending') return 'Pending';
      if (v === 'placed') return 'Placed';
      if (v === 'outfordelivery' || v === 'out_for_delivery') return 'OutForDelivery';
      if (v === 'delivered') return 'Delivered';
      if (v === 'cancelled') return 'Cancelled';
      return 'Completed';
    };

    const mappedItems = items.map(o => ({
        ...o,
        id: o.id.toString(),
        customerId: o.userId?.toString(),
        address: o.address || o.deliveryAddress || o.shippingAddress || o.location || '',
        totalText: formatInr(o.total),
        status: mapStatus(o.status),
        prescriptionNo: o.prescriptionNo || o.prescriptionNo1 || o.prescriptionNo2,
        items: (o.items || []).map((i: any) => ({
            productId: i.productId?.toString(),
            title: i.product?.title || i.title || 'Product',
            qty: i.qty,
            unitPrice: i.price || i.unitPrice,
            unitPriceText: formatInr(i.price || i.unitPrice),
            lineTotal: (i.price || i.unitPrice) * i.qty,
            lineTotalText: formatInr((i.price || i.unitPrice) * i.qty),
            imageDataUrl: '' // Populate if needed
        }))
    }));

    return { items: mappedItems, total };
  }

  getById(id: string): Order | undefined {
    return this.orders().find(o => o.id === id) || this.myOrders().find(o => o.id === id);
  }

  // Deprecated: use loadMyOrders and myOrdersList
  forCustomer(customerId: string) {
    return this.myOrders();
  }

  updateStatus(orderId: string, status: OrderStatus, otp?: string): Observable<boolean> {
    const payload: any = { status };
    if (otp) payload.otp = otp;

    return this.http.put<any>(`${API_BASE_URL}/api/order/${orderId}/status`, payload).pipe(
      map(res => {
        if (res.success) {
           this.orders.update(current => {
             const idx = current.findIndex(o => o.id === orderId);
             if (idx === -1) return current;
             const next = [...current];
             next[idx] = { ...next[idx], status, deliveryOtp: res.data?.deliveryOtp || next[idx].deliveryOtp };
             return next;
           });
           return true;
        }
        return false;
      }),
      catchError(err => {
        console.error('Failed to update status', err);
        return of(false);
      })
    );
  }

  generateOtp(orderId: string): Observable<boolean> {
    return this.http.post<any>(`${API_BASE_URL}/admin/orders/${orderId}/generate-otp`, {}).pipe(
      map(res => {
          // Assume success if no error, or check res.success if available
          return true; 
      }),
      catchError(err => {
        console.error('Failed to generate OTP', err);
        return of(false);
      })
    );
  }

  verifyOtp(orderId: string, otp: string): Observable<boolean> {
    return this.http.post<any>(`${API_BASE_URL}/admin/orders/${orderId}/verify-otp?otp=${otp}`, {}).pipe(
      map(res => {
           // Just return true if successful, don't update state yet
           return true;
      }),
      catchError(err => {
        console.error('Failed to verify OTP', err);
        return of(false);
      })
    );
  }

  deliverOrder(orderId: string): Observable<boolean> {
    return this.http.post<any>(`${API_BASE_URL}/admin/orders/${orderId}/deliver`, {}).pipe(
      map(res => {
         this.orders.update(current => {
            const idx = current.findIndex(o => o.id === orderId);
            if (idx === -1) return current;
            const next = [...current];
            next[idx] = { ...next[idx], status: 'Delivered' };
            return next;
          });
          return true;
      }),
      catchError(err => {
        console.error('Failed to deliver order', err);
        return of(false);
      })
    );
  }

  placeOrder(input: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    address?: string;
    paymentMethod: string;
    total: number;
    items: Array<{
      productId: string;
      qty: number;
      unitPrice: number;
    }>;
  }): Observable<string | null> {
    const payload = input;

    return this.http.post<any>(`${API_BASE_URL}/order/place`, payload).pipe(
      map(res => {
        if (res.success && res.data) {
           return res.data.id?.toString() || 'success';
        }
        return null;
      }),
      catchError(err => {
        console.error('Failed to place order', err);
        return of(null);
      })
    );
  }
}

function formatInr(amount: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}
