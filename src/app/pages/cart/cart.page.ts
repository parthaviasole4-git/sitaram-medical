import { NgFor, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CartService, type OcrMatchItem } from '../../store/cart.service';

@Component({
  selector: 'app-cart-page',
  imports: [NgFor, NgIf],
  templateUrl: './cart.page.html',
  styleUrl: './cart.page.css'
})
export class CartPage {
  private readonly cart = inject(CartService);
  private readonly router = inject(Router);

  readonly items = this.cart.lineItems;
  readonly totalText = this.cart.totalText;
  readonly hasItems = computed(() => this.items().length > 0);
  readonly ocrLoading = signal(false);
  readonly ocrItems = signal<OcrMatchItem[]>([]);
  readonly fileName = signal<string>('');
  readonly previewUrl = signal<string | null>(null);

  inc(productId: string) {
    this.cart.increase(productId);
  }

  dec(productId: string) {
    this.cart.decrease(productId);
  }

  remove(productId: string) {
    this.cart.remove(productId);
  }

  async checkout() {
    if (!this.hasItems()) return;
    await this.router.navigateByUrl('/app/checkout');
  }

  async selectFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const type = file.type.toLowerCase();
    const isValid = type.includes('pdf') || type.includes('image/');
    if (!isValid) {
      alert('Please upload a PDF or image file.');
      return;
    }
    this.fileName.set(file.name);
    if (type.includes('image/')) {
      const url = URL.createObjectURL(file);
      this.previewUrl.set(url);
    } else {
      this.previewUrl.set(null);
    }
    this.ocrLoading.set(true);
    this.cart.ocrMatch(file).subscribe({
      next: (res) => {
        const items = Array.isArray(res.items) ? res.items : [];
        this.ocrItems.set(items);
        this.ocrLoading.set(false);
      },
      error: () => {
        this.ocrLoading.set(false);
        alert('Failed to process prescription. Please try again.');
      }
    });
  }

  addMatched(item: OcrMatchItem) {
    const qty = Math.max(0, Math.min(item.requestedQty || 1, item.availableQty || 0));
    if (qty <= 0) return;
    this.cart.addById(item.productId, qty);
    const next = this.ocrItems().filter(i => i.productId !== item.productId);
    this.ocrItems.set(next);
  }
}
