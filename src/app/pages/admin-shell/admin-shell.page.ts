import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-admin-shell-page',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-shell.page.html',
  styleUrl: './admin-shell.page.css'
})
export class AdminShellPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  async logout() {
    this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
