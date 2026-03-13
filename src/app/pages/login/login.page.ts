import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, Validators, NonNullableFormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIf } from '@angular/common';
import { AuthService } from '../../auth/auth.service';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, NgIf, ToastModule],
  templateUrl: './login.page.html',
  styleUrl: './login.page.css',
  providers: [MessageService]
})
export class LoginPage {
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private subscriptions: Subscription[] = [];

  isRegister = signal(false);
  isForgot = signal(false);
  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  showPassword = signal(false);
  showConfirm = signal(false);

  readonly form = this.fb.group({
    email: this.fb.control('', { validators: [Validators.required, Validators.email] }),
    password: this.fb.control('', { validators: [Validators.required, Validators.minLength(6)] }),
    // Registration only fields
    confirmPassword: this.fb.control(''),
    name: this.fb.control(''),
    mobile: this.fb.control(''),
    location: this.fb.control('')
  });

  get email() { return this.form.controls.email; }
  get password() { return this.form.controls.password; }
  get confirmPassword() { return this.form.controls.confirmPassword; }
  get name() { return this.form.controls.name; }
  get mobile() { return this.form.controls.mobile; }
  get location() { return this.form.controls.location; }

  toggleMode() {
    this.isRegister.update(v => !v);
    this.isForgot.set(false);
    this.resetFormState();
  }

  toggleForgot() {
    this.isForgot.update(v => !v);
    this.isRegister.set(false);
    this.resetFormState();
  }

  resetFormState() {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.form.reset();
    this.showPassword.set(false);
    this.showConfirm.set(false);
    this.subscriptions.forEach(s => s.unsubscribe());
    this.subscriptions = [];
    
    // Update validators based on mode
    if (this.isRegister()) {
      this.confirmPassword.setValidators([Validators.required]);
      this.name.setValidators([Validators.required]);
      this.mobile.setValidators([Validators.required, Validators.pattern(/^\d{10}$/)]);
      this.location.setValidators([Validators.required]);
      this.password.setValidators([Validators.required, Validators.minLength(6)]);
      const sub1 = this.password.valueChanges.subscribe(() => this.checkPasswords());
      const sub2 = this.confirmPassword.valueChanges.subscribe(() => this.checkPasswords());
      this.subscriptions.push(sub1, sub2);
      this.checkPasswords();
    } else if (this.isForgot()) {
      this.confirmPassword.clearValidators();
      this.name.clearValidators();
      this.mobile.clearValidators();
      this.location.clearValidators();
      this.password.clearValidators();
    } else {
      // Login
      this.confirmPassword.clearValidators();
      this.name.clearValidators();
      this.mobile.clearValidators();
      this.location.clearValidators();
      this.password.setValidators([Validators.required]);
    }
    
    this.confirmPassword.updateValueAndValidity();
    this.name.updateValueAndValidity();
    this.mobile.updateValueAndValidity();
    this.location.updateValueAndValidity();
    this.password.updateValueAndValidity();
  }

  checkPasswords() {
    const pwd = this.password.value || '';
    const c = this.confirmPassword.value || '';
    if (!this.isRegister()) {
      this.confirmPassword.setErrors(null);
      return;
    }
    if (c.length === 0) {
      const errs = this.confirmPassword.errors || {};
      errs['mismatch'] = undefined;
      this.confirmPassword.setErrors(Object.keys(errs).filter(k => errs[k] !== undefined).length ? errs : null);
      return;
    }
    if (pwd !== c) {
      const errs = this.confirmPassword.errors || {};
      errs['mismatch'] = true;
      this.confirmPassword.setErrors(errs);
    } else {
      const errs = this.confirmPassword.errors || {};
      delete errs['mismatch'];
      this.confirmPassword.setErrors(Object.keys(errs).length ? errs : null);
    }
  }

  toggleShowPassword() { this.showPassword.update(v => !v); }
  toggleShowConfirm() { this.showConfirm.update(v => !v); }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password, confirmPassword, name, mobile, location } = this.form.getRawValue();
    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.form.disable();

    const finalize = () => {
      this.loading.set(false);
      this.form.enable();
    };

    if (this.isForgot()) {
      this.auth.forgotPassword(email).subscribe({
        next: (res) => {
          if (res.success) {
            this.isForgot.set(false);
            this.resetFormState();
            this.successMessage.set(res.message || 'Reset token sent to email. Please login.');
          } else {
            this.errorMessage.set(res.message || 'Failed to send reset token');
          }
          finalize();
        },
        error: (err) => {
          this.errorMessage.set(err.error?.message || 'Error sending reset token');
          finalize();
        }
      });
      return;
    }

    if (this.isRegister()) {
      if (password !== confirmPassword) {
        this.errorMessage.set("Passwords do not match");
        finalize();
        return;
      }

      this.auth.register({ email, password, confirmPassword, name, mobile, location }).subscribe({
        next: (res) => {
          if (res.success) {
            this.isRegister.set(false);
            this.resetFormState();
            this.messageService.add({ severity: 'contrast', summary: 'Registered', life: 2200 });
            setTimeout(() => {
              this.router.navigateByUrl('/login');
            }, 800);
          } else {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: res.message || 'Registration failed', life: 2500 });
          }
          finalize();
        },
        error: (err) => {
           this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'An error occurred during registration', life: 2500 });
           finalize();
        }
      });
    } else {
      this.auth.login({ email, password }).subscribe({
        next: (res) => {
          if (res.success) {
            const role = this.auth.role();
            if (role === 'admin') {
              this.router.navigateByUrl('/admin/dashboard', { replaceUrl: true });
            } else {
              this.router.navigateByUrl('/app/home', { replaceUrl: true });
            }
          } else {
            this.errorMessage.set(res.message || 'Login failed');
          }
          finalize();
        },
        error: (err) => {
          this.errorMessage.set(err.error?.message || 'Invalid email or password');
          finalize();
        }
      });
    }
  }
}
