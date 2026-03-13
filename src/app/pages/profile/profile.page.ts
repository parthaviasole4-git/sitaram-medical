import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { ReactiveFormsModule, Validators, NonNullableFormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

import { NgIf } from '@angular/common';

@Component({
  selector: 'app-profile-page',
  imports: [ReactiveFormsModule, NgIf],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.css'
})
export class ProfilePage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly loading = signal(false);
  readonly errorMessage = signal('');

  readonly form = this.fb.group({
    name: this.fb.control('', { validators: [Validators.required] }),
    email: this.fb.control({ value: '', disabled: true }), // Email is usually immutable
    mobile: this.fb.control('', { validators: [Validators.required] }),
    location: this.fb.control('')
  });

  constructor() {
    // Reactively update form when auth user changes
    effect(() => {
      const user = this.auth.user();
      if (user) {
        this.form.patchValue({
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          location: user.location
        });
      }
    });
  }

  ngOnInit() {
    this.loading.set(true);
    this.auth.getProfile().subscribe({
      next: (res) => {
        this.loading.set(false);
        if (!res.success) {
          this.errorMessage.set(res.message || 'Failed to load profile');
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set('Error loading profile');
        // If unauthorized, redirect to login
        if (err.status === 401) {
          this.router.navigateByUrl('/login');
        }
      }
    });
  }

  save() {
    // No update API provided yet
    alert('Update profile functionality is not yet available via API.');
  }

  async logout() {
    this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
