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
      this.router.navigateByUrl('/app/cart');
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
    const otp = this.form.value.otp as string;
    
    // Step 1: External Verification (from Postman screenshot)
    this.vendor.externalVerify({ PrescriptionNo: flow.prescriptionNo, otp }).subscribe({
      next: (res) => {
        if (res && res.success === true) {
          // Success: Call original backend to mark as delivered
          this.vendor.verify({ orderId: flow.orderId, otp }).subscribe({
            next: (res) => {
              this.loading.set(false);
              this.delivered.set(true);
              this.cart.clear();
              const msg = res?.message || 'Order marked as delivered.';
              this.messages.add({ severity: 'success', summary: 'Delivered', detail: msg });
              setTimeout(() => this.router.navigateByUrl('/app/orders'), 800);
            },
            error: (err) => {
              this.loading.set(false);
              const msg = (err?.error && (err.error.message || err.error.error)) || err?.message || 'Internal verification failed. Try again.';
              this.messages.add({ severity: 'error', summary: 'Error', detail: msg });
            }
          });
        } else {
          // Failure: Show message from response and reset OTP
          this.loading.set(false);
          const msg = res?.message || 'Verification failed. Please check your OTP.';
          this.messages.add({ severity: 'error', summary: 'Verification Failed', detail: msg });
          this.form.reset();
        }
      },
      error: (err) => {
        this.loading.set(false);
        const errorMsg = (err?.error && (err.error.message || err.error.error)) || 'External verification service error';
        this.messages.add({ severity: 'error', summary: 'Error', detail: errorMsg });
        this.form.reset();
      }
    });
  }

  resend() {
    const flow = this.vendor.vendorFlow();
    if (!flow) return;
    this.vendor.resend({ PrescriptionNo: flow.prescriptionNo }).subscribe({
      next: (res) => {
        if (res && res.success === true) {
          this.messages.add({ severity: 'info', summary: 'Resent', detail: 'OTP resent' });
        } else {
          this.messages.add({ severity: 'error', summary: 'Error', detail: 'invalid prescription No' });
        }
      },
      error: () => this.messages.add({ severity: 'error', summary: 'Error', detail: 'Failed to resend' })
    });
  }
}
