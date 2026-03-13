import { NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrdersService, type Order, type OrderStatus } from '../../store/orders.service';

@Component({
  selector: 'app-admin-orders-page',
  imports: [NgIf, NgFor, FormsModule],
  templateUrl: './admin-orders.page.html',
  styleUrl: './admin-orders.page.css'
})
export class AdminOrdersPage {
  private readonly ordersService = inject(OrdersService);

  readonly searchQuery = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = 10;

  // The service now holds only the current page's orders
  readonly paginatedOrders = computed(() => this.ordersService.list());
  readonly totalOrders = computed(() => this.ordersService.totalOrders());
  
  // Total count comes from the service
  readonly totalPages = computed(() => Math.ceil(this.ordersService.totalOrders() / this.pageSize));

  readonly pages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    
    if (total <= 0) return [];

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

  readonly pendingOrder = signal<Order | null>(null);
  readonly otpModalOpen = signal(false);
  readonly otpInput = signal('');
  readonly otpError = signal<string | null>(null);
  readonly isSubmitting = signal(false);
  readonly updatingOrderId = signal<string | null>(null);

  constructor() {
    effect(() => {
      // Trigger load whenever page changes
      // Note: If we add search later, include searchQuery() here
      this.ordersService.loadAdminOrders(this.currentPage(), this.pageSize);
    });
  }

  setPage(p: number) {
    if (p >= 1 && p <= this.totalPages()) {
      this.currentPage.set(p);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onSearch(q: string) {
    this.searchQuery.set(q);
    this.currentPage.set(1);
    // TODO: Implement server-side search
  }

  nextStatus(o: Order): OrderStatus {
    if (o.status === 'Placed') return 'OutForDelivery';
    if (o.status === 'OutForDelivery') return 'Delivered';
    return 'Delivered';
  }

  canAdvance(o: Order): boolean {
    return o.status !== 'Completed' && o.status !== 'Delivered';
  }

  advance(o: Order) {
    if (!this.canAdvance(o) || this.isSubmitting()) return;
    
    const next = this.nextStatus(o);
    if (next === 'Delivered') {
      this.isSubmitting.set(true);
      this.ordersService.generateOtp(o.id).subscribe(success => {
          this.isSubmitting.set(false);
          if (success) {
            this.pendingOrder.set(o);
            this.otpInput.set('');
            this.otpError.set(null);
            this.otpModalOpen.set(true);
          } else {
            // Optional: show error toast or alert
            console.error('Could not generate OTP');
          }
      });
      return;
    }

    this.isSubmitting.set(true);
    this.updatingOrderId.set(o.id);
    this.ordersService.updateStatus(o.id, next).subscribe(() => {
        this.isSubmitting.set(false);
        this.updatingOrderId.set(null);
    });
  }

  confirmOtp() {
    const o = this.pendingOrder();
    const otp = this.otpInput();
    if (!o || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.ordersService.verifyOtp(o.id, otp).subscribe(verified => {
      if (verified) {
        this.ordersService.deliverOrder(o.id).subscribe(delivered => {
          this.isSubmitting.set(false);
          if (delivered) {
            this.closeOtpModal();
          } else {
            this.otpError.set('OTP verified but failed to complete order.');
          }
        });
      } else {
        this.isSubmitting.set(false);
        this.otpError.set('Invalid OTP. Please check with the customer.');
      }
    });
  }

  closeOtpModal() {
    this.otpModalOpen.set(false);
    this.pendingOrder.set(null);
    this.otpInput.set('');
    this.otpError.set(null);
  }

  formatTime(ts: number): string {
    return new Date(ts).toLocaleString();
  }
}
