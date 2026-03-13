import { NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../store/users.service';

@Component({
  selector: 'app-admin-users-page',
  imports: [NgIf, NgFor, FormsModule],
  templateUrl: './admin-users.page.html',
  styleUrl: './admin-users.page.css'
})
export class AdminUsersPage {
  private readonly usersService = inject(UsersService);

  readonly searchQuery = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = 10;

  // API returns only current page items
  readonly paginatedCustomers = computed(() => this.usersService.customers());
  
  readonly totalPages = computed(() => Math.ceil(this.usersService.totalUsers() / this.pageSize));

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

  readonly hasAny = computed(() => this.usersService.totalUsers() > 0);
  readonly total = computed(() => this.usersService.totalUsers());

  constructor() {
    effect(() => {
      this.usersService.loadUsers(this.currentPage(), this.pageSize);
    });
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
    // Server-side search not yet implemented in API
  }
}
