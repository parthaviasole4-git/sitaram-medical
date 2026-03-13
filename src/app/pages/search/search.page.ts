import { NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from '../../store/cart.service';
import { CatalogService, type Product } from '../../store/catalog.service';

@Component({
  selector: 'app-search-page',
  imports: [NgIf, NgFor],
  templateUrl: './search.page.html',
  styleUrl: './search.page.css'
})
export class SearchPage {
  private readonly catalog = inject(CatalogService);
  private readonly cart = inject(CartService);
  private readonly router = inject(Router);

  readonly query = signal('');

  readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    const all = this.catalog.availableProducts();
    if (!q) return [];
    return all.filter(p => matches(p, q));
  });

  updateQuery(value: string) {
    this.query.set(value);
  }

  addToCart(product: Product) {
    this.cart.add(product);
  }

  async back() {
    await this.router.navigateByUrl('/app/home');
  }
}

function matches(p: Product, q: string): boolean {
  const title = p.title.toLowerCase();
  const category = p.category.toLowerCase();
  const tag = p.tag.toLowerCase();
  return title.includes(q) || category.includes(q) || tag.includes(q);
}
