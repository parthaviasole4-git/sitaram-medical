import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../environments/environment';

export type UserRole = 'customer' | 'admin';

export type User = {
  id: string;
  role: UserRole;
  phone: string;
  fullName: string;
  email: string;
  address: string;
};

const API_BASE_URL = environment.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly users = signal<User[]>([]);
  readonly totalUsers = signal(0);

  readonly list = this.users.asReadonly();
  // For backward compatibility, aliasing customers to list
  // If filtering is needed, we can re-add it, but typically the API should handle it or we display all
  readonly customers = computed(() => this.users());
  readonly customerCount = this.totalUsers.asReadonly();

  loadUsers(page: number, size: number) {
    return this.http.get<any>(`${API_BASE_URL}/api/User/list`, {
        params: { page: page.toString(), size: size.toString() }
    }).pipe(
        map(res => {
            let items: User[] = [];
            let total = 0;
            
            // Handle various response structures
            const data = res.data || res;
            
            if (Array.isArray(data)) {
                items = data;
                total = res.total || res.totalCount || data.length;
            } else if (data && (Array.isArray(data.items) || Array.isArray(data.users))) {
                 items = data.items || data.users;
                 total = data.total || data.totalCount || items.length;
            }
            
            return { items, total };
        }),
        catchError(err => {
            console.error('Failed to load users', err);
            return of({ items: [], total: 0 });
        })
    ).subscribe(({ items, total }) => {
        this.users.set(items);
        this.totalUsers.set(total);
    });
  }

  upsertCustomer(input: { id: string; phone: string; fullName: string; email: string; address: string }) {
     console.warn('upsertCustomer is deprecated. User management is now handled via API.');
  }
}
