import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { VendorService } from '../../store/vendor.service';
import { CartService } from '../../store/cart.service';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-vendor-otp-page',
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, ButtonModule, CardModule, ToastModule],
  providers: [MessageService],
  templateUrl: './vendor-otp.page.html',
  styleUrl: './vendor-otp.page.css'
})
export class VendorOtpPage {
  private readonly fb = inject(FormBuilder);
  private readonly vendor = inject(VendorService);
  private readonly router = inject(Router);
  private readonly cart = inject(CartService);
  private readonly messages = inject(MessageService);

  readonly loading = signal(false);
  readonly delivered = signal(false);

  readonly form = this.fb.group({
    otp: ['', [Validators.required]]
  });

  ngOnInit() {
    const flow = this.vendor.vendorFlow();
    if (!flow || !(typeof flow.orderId === 'number') || flow.orderId <= 0) {
      this.router.navigateByUrl('/app/vendor/prescription');
    }
  }

  submit() {
    const flow = this.vendor.vendorFlow();
    if (!flow) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.vendor.verify({ orderId: flow.orderId, otp: this.form.value.otp as string }).subscribe({
      next: () => {
        this.loading.set(false);
        this.delivered.set(true);
        this.cart.clear();
        this.messages.add({ severity: 'success', summary: 'Delivered', detail: 'Order marked as delivered.' });
        setTimeout(() => this.router.navigateByUrl('/app/orders'), 800);
      },
      error: () => {
        this.loading.set(false);
        this.messages.add({ severity: 'error', summary: 'Error', detail: 'Invalid OTP. Try again.' });
      }
    });
  }

  resend() {
    const flow = this.vendor.vendorFlow();
    if (!flow) return;
    this.vendor.resend({ prescriptionNo: flow.prescriptionNo }).subscribe({
      next: (res) => {
        const msg = res?.message || 'OTP resent';
        this.messages.add({ severity: 'info', summary: 'Resent', detail: msg });
      },
      error: () => this.messages.add({ severity: 'error', summary: 'Error', detail: 'Failed to resend' })
    });
  }
}
