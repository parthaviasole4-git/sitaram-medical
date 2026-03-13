import { Component, inject } from '@angular/core';
import { NgFor } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CatalogService } from '../../store/catalog.service';

@Component({
  selector: 'app-home-page',
  imports: [NgFor, RouterLink],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css'
})
export class HomePage {
  private readonly catalog = inject(CatalogService);
  private readonly router = inject(Router);

  readonly categories = this.catalog.categories;

  onSearch(q: string) {
    if (q.trim()) {
      this.router.navigate(['/app/products'], { queryParams: { q } });
    }
  }
}
