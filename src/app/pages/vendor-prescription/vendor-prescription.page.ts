import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { VendorService } from '../../store/vendor.service';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-vendor-prescription-page',
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, ButtonModule, CardModule],
  templateUrl: './vendor-prescription.page.html',
  styleUrl: './vendor-prescription.page.css'
})
export class VendorPrescriptionPage {
  private readonly fb = inject(FormBuilder);
  private readonly vendor = inject(VendorService);
  private readonly router = inject(Router);

  readonly loading = signal(false);

  readonly form = this.fb.group({
    prescriptionNo: ['', [Validators.required]],
    phone: [''],
    fullName: [''],
    address: ['']
  });

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    const payload = this.form.value as any;
    this.vendor.init(payload).subscribe({
      next: (res) => {
        this.loading.set(false);
        const orderId = res?.orderId ?? res?.data?.orderId;
        const prescriptionNo = payload.prescriptionNo;
        if (orderId && prescriptionNo) {
          this.vendor.vendorFlow.set({ orderId, prescriptionNo });
          this.router.navigateByUrl('/app/vendor/otp');
        }
      },
      error: () => {
        this.loading.set(false);
        alert('Failed to initialize. Try again.');
      }
    });
  }
}
