import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, Validators, NonNullableFormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIf } from '@angular/common';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-reset-password-page',
  imports: [ReactiveFormsModule, NgIf],
  templateUrl: './reset-password.page.html',
  styleUrl: './reset-password.page.css'
})
export class ResetPasswordPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly email = signal(this.route.snapshot.queryParamMap.get('email') || '');
  readonly token = signal(this.route.snapshot.queryParamMap.get('token') || '');

  readonly form = this.fb.group({
    password: this.fb.control('', { validators: [Validators.required, Validators.minLength(6)] }),
    confirmPassword: this.fb.control('', { validators: [Validators.required, Validators.minLength(6)] })
  });

  get password() {
    return this.form.controls.password;
  }

  get confirmPassword() {
    return this.form.controls.confirmPassword;
  }

  get isLinkInvalid() {
    return !this.email() || !this.token();
  }

  submit() {
    if (this.isLinkInvalid) {
      this.errorMessage.set('Invalid or expired reset link');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { password, confirmPassword } = this.form.getRawValue();
    if (password !== confirmPassword) {
      this.errorMessage.set('Passwords do not match');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.form.disable();

    const finalize = () => {
      this.loading.set(false);
      this.form.enable();
    };

    const payload = {
      email: this.email(),
      token: this.token(),
      newPassword: password
    };

    this.auth.resetPassword(payload).subscribe({
      next: res => {
        if (res.success) {
          this.successMessage.set(res.message || 'Password reset successfully. You can now log in.');
          setTimeout(() => {
            this.router.navigateByUrl('/login');
          }, 1500);
        } else {
          this.errorMessage.set(res.message || 'Failed to reset password');
        }
        finalize();
      },
      error: err => {
        this.errorMessage.set(err.error?.message || 'Error resetting password');
        finalize();
      }
    });
  }
}
