import { NgIf, DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OrdersService } from '../../store/orders.service';

@Component({
  selector: 'app-payment-success-page',
  imports: [NgIf, DatePipe],
  templateUrl: './payment-success.page.html',
  styleUrl: './payment-success.page.css'
})
export class PaymentSuccessPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orders = inject(OrdersService);

  readonly orderId = computed(() => this.route.snapshot.queryParamMap.get('orderId') ?? '');
  readonly order = computed(() => {
    const id = this.orderId();
    if (!id) return undefined;
    return this.orders.getById(id);
  });

  async goHome() {
    await this.router.navigateByUrl('/app/home');
  }

  async goOrders() {
    await this.router.navigateByUrl('/app/orders');
  }
}
