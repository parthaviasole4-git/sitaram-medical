import { NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';
import { CartService } from '../../store/cart.service';
import { OrdersService } from '../../store/orders.service';
import { firstValueFrom } from 'rxjs';
import { VendorService } from '../../store/vendor.service';

@Component({
  selector: 'app-checkout-page',
  imports: [NgFor, NgIf, ReactiveFormsModule],
  templateUrl: './checkout.page.html',
  styleUrl: './checkout.page.css'
})
export class CheckoutPage {
  private readonly cart = inject(CartService);
  private readonly orders = inject(OrdersService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly vendor = inject(VendorService);

  readonly items = this.cart.lineItems;
  readonly total = this.cart.total;
  readonly totalText = this.cart.totalText;

  readonly step = signal<'payment'>('payment');

  readonly prescriptionNo = new FormControl('', { validators: [Validators.required], nonNullable: true });
  readonly showError = signal(false);
  readonly paymentMethod = signal<'COD' | 'Card' | 'UPI'>('COD');
  readonly hasItems = computed(() => this.items().length > 0);
  readonly loading = signal(false);

  async back() { await this.router.navigateByUrl('/app/cart'); }

  constructor() {}

  proceedToPayment() { this.step.set('payment'); }
  select(method: 'COD' | 'Card' | 'UPI') { this.paymentMethod.set(method); }

  async pay() {
    if (this.prescriptionNo.invalid) {
      this.showError.set(true);
      return;
    }
    this.showError.set(false);

    if (!this.hasItems()) {
      await this.router.navigateByUrl('/app/cart');
      return;
    }

    const customerId = this.auth.userId();
    if (!customerId) {
      await this.router.navigateByUrl('/login');
      return;
    }

    this.loading.set(true);

    const payload = { prescriptionNo: this.prescriptionNo.value };

    this.vendor.init(payload).subscribe({
      next: async (res) => {
        this.loading.set(false);
        const data: any = res?.data ?? res;
        let orderId: any =
          data?.orderId ?? data?.OrderId ?? data?.orderID ?? data?.OrderID ?? data?.id ?? data?.order?.id;
        if (typeof orderId === 'string') {
          const parsed = parseInt(orderId, 10);
          orderId = isNaN(parsed) ? null : parsed;
        }
        const prescriptionNo = this.prescriptionNo.value;
        if (prescriptionNo) {
          if (typeof orderId === 'number' && orderId > 0) {
            this.vendor.vendorFlow.set({ orderId, prescriptionNo });
          } else {
            this.vendor.vendorFlow.set({ orderId: -1, prescriptionNo });
          }
          
          // Success: Clear the cart
          this.cart.clear();
          
          await this.router.navigateByUrl('/app/vendor/otp');
        } else {
          alert('Failed to start prescription flow.');
        }
      },
      error: (err) => {
        this.loading.set(false);
        const msg = (err?.error && (err.error.message || err.error.error)) || err?.message || 'Initialization failed';
        alert(msg);
      }
    });
  }
}
