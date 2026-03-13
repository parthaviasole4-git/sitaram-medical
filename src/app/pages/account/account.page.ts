import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { inject } from '@angular/core';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-account-page',
  imports: [NgFor, NgIf],
  templateUrl: './account.page.html',
  styleUrl: './account.page.css'
})
export class AccountPage {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly items = [
    { title: 'Products', subtitle: 'Add and edit products', route: '/app/admin-products', icon: 'box' },
    { title: 'Profile', subtitle: 'Manage your details', route: '/app/profile', icon: 'user' }
  ];

  go(route: string) {
    this.router.navigateByUrl(route);
  }
}
