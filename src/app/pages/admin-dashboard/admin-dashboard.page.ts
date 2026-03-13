import { Component, computed, inject } from '@angular/core';
import { CatalogService } from '../../store/catalog.service';
import { OrdersService } from '../../store/orders.service';
import { UsersService } from '../../store/users.service';

@Component({
  selector: 'app-admin-dashboard-page',
  imports: [],
  templateUrl: './admin-dashboard.page.html',
  styleUrl: './admin-dashboard.page.css'
})
export class AdminDashboardPage {
  private readonly users = inject(UsersService);
  private readonly catalog = inject(CatalogService);
  private readonly ordersService = inject(OrdersService);

  readonly totalUsers = this.users.customerCount;
  readonly totalProducts = this.catalog.totalProducts;
  readonly pendingOrders = this.ordersService.pendingCount;

  constructor() {
    // Load initial data to get counts
    this.users.loadUsers(1, 1);
    this.catalog.loadProducts(1, 1);
    this.ordersService.loadAdminOrders(1, 1);
  }
}
