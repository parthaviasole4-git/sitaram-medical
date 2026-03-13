import { Component, ElementRef, QueryList, ViewChildren, inject } from '@angular/core';
import { ReactiveFormsModule, Validators, NonNullableFormBuilder, FormArray } from '@angular/forms';
import { NgFor } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { UsersService } from '../../store/users.service';

@Component({
  selector: 'app-otp-page',
  imports: [ReactiveFormsModule, NgFor, RouterLink],
  templateUrl: './otp.page.html',
  styleUrl: './otp.page.css'
})
export class OtpPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly users = inject(UsersService);

  @ViewChildren('otpInput') private readonly otpInputs?: QueryList<ElementRef<HTMLInputElement>>;

  readonly digits = this.fb.array(
    Array.from({ length: 4 }, () =>
      this.fb.control('', { validators: [Validators.required, Validators.pattern(/^\d$/)] })
    )
  );

  readonly form = this.fb.group({
    digits: this.digits as FormArray
  });

  get value(): string {
    return this.digits.controls.map(c => c.value).join('');
  }

  focus(index: number) {
    const el = this.otpInputs?.get(index)?.nativeElement;
    if (!el) return;
    el.focus();
    el.select();
  }

  onInput(index: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const raw = input.value ?? '';
    const digits = raw.replace(/\D/g, '');

    if (digits.length <= 1) {
      this.digits.at(index).setValue(digits);
      if (digits.length === 1 && index < 3) this.focus(index + 1);
      return;
    }

    const chars = digits.slice(0, 4 - index).split('');
    chars.forEach((ch, offset) => this.digits.at(index + offset).setValue(ch));
    this.focus(Math.min(3, index + chars.length));
  }

  onKeydown(index: number, event: KeyboardEvent) {
    if (event.key !== 'Backspace') return;

    const current = this.digits.at(index).value;
    if (current) {
      this.digits.at(index).setValue('');
      return;
    }

    if (index > 0) {
      this.digits.at(index - 1).setValue('');
      queueMicrotask(() => this.focus(index - 1));
    }
  }

  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    const digits = text.replace(/\D/g, '').slice(0, 4).split('');
    digits.forEach((d, i) => this.digits.at(i).setValue(d));
    this.focus(Math.min(3, digits.length));
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const firstEmpty = this.digits.controls.findIndex(c => !c.value);
      this.focus(firstEmpty >= 0 ? firstEmpty : 0);
      return;
    }

    this.auth.verifyOtp();
    if (this.auth.role() === 'customer') {
      const id = this.auth.userId();
      const phone = this.auth.phone();
      const profile = this.auth.profile();
      if (id && phone) {
        this.users.upsertCustomer({
          id,
          phone,
          fullName: profile.fullName || 'Customer',
          email: profile.email,
          address: profile.address
        });
      }
    }
    await this.router.navigateByUrl(this.auth.role() === 'admin' ? '/admin/dashboard' : '/app/home');
  }

  resend(event: Event) {
    event.preventDefault();
    this.digits.controls.forEach(c => c.setValue(''));
    this.focus(0);
  }
}
