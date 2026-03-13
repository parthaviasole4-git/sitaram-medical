import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CartService } from '../../store/cart.service';

@Component({
  selector: 'app-shell-page',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-shell.page.html',
  styleUrl: './app-shell.page.css'
})
export class AppShellPage {
  private readonly cart = inject(CartService);

  readonly cartCount = this.cart.count;
}
