import { Component, computed, inject, signal, effect, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CartService } from '../../store/cart.service';
import { CatalogService, Product } from '../../store/catalog.service';

@Component({
  selector: 'app-products-page',
  imports: [NgFor, NgIf, FormsModule],
  templateUrl: './products.page.html',
  styleUrl: './products.page.css'
})
export class ProductsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly catalog = inject(CatalogService);
  private readonly cart = inject(CartService);

  readonly searchQuery = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = 10;

  private readonly queryParams = toSignal(this.route.queryParamMap);
  readonly categoryParam = computed(() => this.queryParams()?.get('category'));
  readonly searchParam = computed(() => this.queryParams()?.get('q'));

  // API returns only current page items
  readonly products = computed(() => this.catalog.products());
  readonly total = computed(() => this.catalog.totalProducts());
  readonly loading = computed(() => this.catalog.loading());
  readonly totalPages = computed(() => Math.ceil(this.total() / this.pageSize));

  constructor() {
    effect(() => {
        const category = this.categoryParam();
        const search = this.searchQuery();
        const page = this.currentPage();
        
        this.catalog.loadProducts(page, this.pageSize, search || undefined, category || undefined);
    });
  }

  ngOnInit() {
    const q = this.route.snapshot.queryParamMap.get('q');
    if (q) {
      this.searchQuery.set(q);
    }
  }


  readonly pages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    let start = Math.max(current - 2, 1);
    let end = Math.min(start + 4, total);

    if (end === total) {
        start = Math.max(end - 4, 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  addToCart(product: Product) {
    this.cart.add(product);
  }

  setPage(p: number) {
    if (p >= 1 && p <= this.totalPages()) {
      this.currentPage.set(p);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onSearch(q: string) {
    this.searchQuery.set(q);
    this.currentPage.set(1);
  }
}
