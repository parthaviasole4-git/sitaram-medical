import { Component, computed, inject, signal, effect } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';
import { OrdersService } from '../../store/orders.service';
import { VendorService } from '../../store/vendor.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-orders-page',
  imports: [NgFor, NgIf, FormsModule],
  templateUrl: './orders.page.html',
  styleUrl: './orders.page.css'
})
export class OrdersPage {
  private readonly ordersService = inject(OrdersService);
  private readonly auth = inject(AuthService);
  private readonly vendor = inject(VendorService);
  private readonly router = inject(Router);

  readonly searchQuery = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = 10;

  readonly allOrders = this.ordersService.myOrdersList;

  constructor() {
    effect(() => {
        if (this.auth.isAuthenticated()) {
            this.ordersService.loadMyOrders(this.currentPage(), this.pageSize);
        }
    });
  }

  readonly filteredOrders = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.allOrders();

    return this.allOrders().filter(o => 
      o.id.toLowerCase().includes(q) || 
      o.items.some(i => i.title.toLowerCase().includes(q))
    );
  });

  readonly totalPages = computed(() => Math.ceil(this.filteredOrders().length / this.pageSize));

  readonly paginatedOrders = computed(() => {
    // If backend pagination is used, we might not need to slice here if we load per page.
    // However, the current loadMyOrders implementation loads a page but sets the whole list.
    // Wait, loadMyOrders sets `this.myOrders.set(items)`.
    // If we want client-side search/pagination on the loaded set, we can keep slice.
    // But typically we should rely on backend pagination.
    // For now, let's assume we load a large chunk or the user wants client-side filtering on the loaded page.
    // The API `GetMyOrders` accepts page/size.
    
    // If we want true server-side pagination, `setPage` should trigger `loadMyOrders`.
    // But `filteredOrders` logic above implies client-side filtering.
    // Let's keep it simple: Load once (or reload on page change) and display.
    
    // Since `loadMyOrders` replaces the list, `allOrders` contains only the current page's items if backend paginates.
    // If backend paginates, `slice` here is redundant or wrong (slicing 0-10 of 10 items).
    
    // Let's assume for now we want to support client-side filtering on whatever we fetched.
    // If we fetched 10 items, slice(0, 10) returns them all.
    
    return this.filteredOrders();
  });

  readonly pages = computed(() => {
    const total = this.ordersService.myOrdersTotal() > 0 
        ? Math.ceil(this.ordersService.myOrdersTotal() / this.pageSize) 
        : 1;
        
    const current = this.currentPage();
    
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    let start = Math.max(current - 2, 1);
    let end = Math.min(start + 4, total);

    if (end === total) {
        start = Math.max(end - 4, 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  formatTime(ts: number): string {
    return new Date(ts).toLocaleString();
  }

  copyOtp(otp: string) {
    navigator.clipboard.writeText(otp);
    // Optional: could add a toast notification here
  }

  setPage(p: number) {
    // Server-side pagination trigger
    if (p >= 1) {
      this.currentPage.set(p);
      this.ordersService.loadMyOrders(p, this.pageSize);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onSearch(q: string) {
    this.searchQuery.set(q);
    this.currentPage.set(1);
    // Note: Search currently only filters client-side on the loaded page.
    // Ideally, we should pass search query to backend.
  }

  goToVendor(o: any) {
    if (o.status !== 'Pending') return;
    const prescriptionNo = o.prescriptionNo || '';
    if (!prescriptionNo) return;
    const orderIdNum = parseInt(o.id, 10);
    if (!isNaN(orderIdNum)) {
      this.vendor.vendorFlow.set({ orderId: orderIdNum, prescriptionNo });
    }
    this.vendor.resend({ PrescriptionNo: prescriptionNo }).subscribe({
      complete: () => {
        this.router.navigateByUrl('/app/vendor/otp');
      }
    });
  }
}
